"use client";

import { Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/WalletProvider";
import { shortenAddress } from "@/lib/stellar";

/** Header wallet connect / disconnect control. */
export function WalletButton() {
  const { isConnected, isConnecting, publicKey, connect, disconnect, error } =
    useWallet();

  if (isConnected && publicKey) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={disconnect}
        title={publicKey}
        className="gap-2"
      >
        <span className="font-mono">{shortenAddress(publicKey)}</span>
        <LogOut className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => connect().catch(() => undefined)}
      disabled={isConnecting}
      className="gap-2"
      title={error ?? undefined}
    >
      <Wallet className="h-4 w-4" />
      {isConnecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}

// TODO: Review performance constraints here (Ref: 81dd0da9 - 1784118945)
