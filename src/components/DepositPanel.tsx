"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/components/WalletProvider";
import { buildDepositTx, submitSigned, VAULT_CONTRACT_ID } from "@/lib/stellar";

type TxState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success"; hash: string }
  | { kind: "error"; message: string };

/** Donor deposit UI: connect-gated amount entry that builds + signs a deposit tx. */
export function DepositPanel() {
  const { isConnected, isInstalled, publicKey, connect, signTransaction } =
    useWallet();
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<TxState>({ kind: "idle" });

  const amountValid = Number(amount) > 0;
  const configured = VAULT_CONTRACT_ID !== "";

  async function handleDeposit() {
    if (!publicKey || !amountValid) return;
    setState({ kind: "pending" });
    try {
      const unsignedXdr = await buildDepositTx({
        from: publicKey,
        amountDisplay: amount,
      });
      const signedXdr = await signTransaction(unsignedXdr);
      const { hash } = await submitSigned(signedXdr);
      setState({ kind: "success", hash });
      toast.success("Deposit submitted", { description: hash });
      setAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deposit failed.";
      setState({ kind: "error", message });
      toast.error("Deposit failed", { description: message });
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Fund the vault
        </CardTitle>
        <CardDescription>
          Deposit XLM into the StellarAid vault. Funds are only released against
          approved milestones — and you can refund unspent contributions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deposit-amount">Amount (XLM)</Label>
          <Input
            id="deposit-amount"
            inputMode="decimal"
            placeholder="100.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={state.kind === "pending"}
          />
        </div>

        {!configured && (
          <p className="text-sm text-warning-foreground">
            Vault contract id is not configured. Set
            <code className="mx-1">NEXT_PUBLIC_VAULT_CONTRACT_ID</code> to enable
            deposits.
          </p>
        )}

        {!isConnected ? (
          <Button
            className="w-full"
            onClick={() => connect().catch(() => undefined)}
            disabled={!isInstalled}
          >
            {isInstalled ? "Connect wallet to deposit" : "Install Freighter to deposit"}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleDeposit}
            disabled={!amountValid || !configured || state.kind === "pending"}
          >
            {state.kind === "pending" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Deposit"
            )}
          </Button>
        )}

        {state.kind === "success" && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${state.hash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View transaction <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
