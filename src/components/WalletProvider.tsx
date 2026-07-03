"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStellarWallet, type WalletState } from "@/hooks/useStellarWallet";

const WalletContext = createContext<WalletState | null>(null);

/**
 * Provides a single shared wallet connection to the whole tree.
 * Wrap the app in <WalletProvider> (done in the root layout).
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useStellarWallet();
  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
}

/** Consumer hook — read the shared wallet state anywhere under the provider. */
export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a <WalletProvider>.");
  }
  return ctx;
}
