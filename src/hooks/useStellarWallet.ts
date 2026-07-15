"use client";

import { useCallback, useEffect, useState } from "react";
import { NETWORK_PASSPHRASE } from "@/lib/stellar";

/**
 * Reusable Freighter-style wallet hook.
 *
 * Dependency-light: it feature-detects `window.freighterApi` (injected by the
 * Freighter browser extension) rather than hard-importing `@stellar/freighter-api`.
 * If the extension is absent, `isInstalled` is false and connect() throws a
 * friendly error instead of crashing.
 */

/** Minimal shape of the Freighter API surface we rely on. */
interface FreighterApi {
  isConnected: () => Promise<boolean | { isConnected: boolean }>;
  getAddress?: () => Promise<{ address: string } | string>;
  getPublicKey?: () => Promise<string>;
  requestAccess?: () => Promise<{ address: string } | string>;
  getNetwork?: () => Promise<{ network: string } | string>;
  getNetworkDetails?: () => Promise<{ network: string; networkPassphrase: string }>;
  setAllowed?: () => Promise<unknown>;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) => Promise<{ signedTxXdr: string } | string>;
}

declare global {
  interface Window {
    freighterApi?: FreighterApi;
  }
}

export interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  isInstalled: boolean;
  isConnecting: boolean;
  network: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
}

function getFreighter(): FreighterApi | null {
  if (typeof window === "undefined") return null;
  return window.freighterApi ?? null;
}

/** Normalize the differing return shapes across Freighter API versions. */
function unwrapAddress(value: { address: string } | string | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.address;
}

function unwrapNetwork(value: { network: string } | string | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.network;
}

const STORAGE_KEY = "stellaraid:wallet-connected";

export function useStellarWallet(): WalletState {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect the extension and restore a prior session on mount.
  useEffect(() => {
    const freighter = getFreighter();
    setIsInstalled(!!freighter);
    if (!freighter) return;

    const shouldRestore =
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY) === "1";
    if (!shouldRestore) return;

    (async () => {
      try {
        const address = await readAddress(freighter);
        if (address) {
          setPublicKey(address);
          setNetwork(await readNetwork(freighter));
        }
      } catch {
        // Session could not be silently restored; user can reconnect manually.
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    const freighter = getFreighter();
    if (!freighter) {
      const message =
        "Freighter wallet not detected. Install it from freighter.app and reload.";
      setError(message);
      throw new Error(message);
    }

    setIsConnecting(true);
    setError(null);
    try {
      // Prompt the extension for access (grants the app permission).
      if (freighter.requestAccess) {
        await freighter.requestAccess();
      } else if (freighter.setAllowed) {
        await freighter.setAllowed();
      }

      const address = await readAddress(freighter);
      if (!address) throw new Error("Wallet did not return an address.");

      setPublicKey(address);
      setNetwork(await readNetwork(freighter));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setNetwork(null);
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      const freighter = getFreighter();
      if (!freighter) throw new Error("Freighter wallet not available.");
      if (!publicKey) throw new Error("Connect a wallet before signing.");

      const result = await freighter.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: publicKey,
      });
      // Older versions return the XDR string directly; newer return an object.
      return typeof result === "string" ? result : result.signedTxXdr;
    },
    [publicKey],
  );

  return {
    publicKey,
    isConnected: !!publicKey,
    isInstalled,
    isConnecting,
    network,
    error,
    connect,
    disconnect,
    signTransaction,
  };
}

async function readAddress(freighter: FreighterApi): Promise<string> {
  if (freighter.getAddress) return unwrapAddress(await freighter.getAddress());
  if (freighter.getPublicKey) return await freighter.getPublicKey();
  return "";
}

async function readNetwork(freighter: FreighterApi): Promise<string> {
  if (freighter.getNetworkDetails) {
    const details = await freighter.getNetworkDetails();
    return details.network;
  }
  if (freighter.getNetwork) return unwrapNetwork(await freighter.getNetwork());
  return process.env.NEXT_PUBLIC_NETWORK ?? "testnet";
}

// TODO: Review performance constraints here (Ref: d9d4342d - 1784118939)
