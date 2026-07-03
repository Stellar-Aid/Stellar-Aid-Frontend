"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/WalletProvider";
import { buildAddMilestoneTx, submitSigned, toStroops } from "@/lib/stellar";
import { api } from "@/lib/api";

interface FormData {
  title: string;
  description: string;
  amount: string;
  recipient: string;
  vaultId: string;
}

const STEPS = ["Details", "Funding", "Review"] as const;

const EMPTY: FormData = {
  title: "",
  description: "",
  amount: "",
  recipient: "",
  vaultId: "",
};

/** Multi-step milestone builder. Builds + signs add_milestone, then records it with the tx_hash. */
export function MilestoneForm() {
  const { isConnected, isInstalled, publicKey, connect, signTransaction } =
    useWallet();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const stepValid = (() => {
    if (step === 0) return data.title.trim().length > 0 && data.description.trim().length > 0;
    if (step === 1) {
      return (
        Number(data.amount) > 0 &&
        data.recipient.trim().length > 0 &&
        data.vaultId.trim().length > 0
      );
    }
    return true;
  })();

  async function handleSubmit() {
    if (!publicKey) return;
    // Bearer token for the backend (admin session). Sourced from an auth flow;
    // for local dev it can be seeded into localStorage under this key.
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("stellaraid:token") ?? ""
        : "";
    if (!token) {
      toast.error("Admin session required", {
        description: "No auth token found (localStorage 'stellaraid:token').",
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1) Build + sign + submit the on-chain add_milestone transaction.
      const unsignedXdr = await buildAddMilestoneTx({
        admin: publicKey,
        title: data.title,
        description: data.description,
        amountDisplay: data.amount,
        recipient: data.recipient,
      });
      const signedXdr = await signTransaction(unsignedXdr);
      const { hash } = await submitSigned(signedXdr);

      // 2) Record the milestone in the backend WITH the resulting tx_hash.
      const milestone = await api.createMilestone(
        {
          title: data.title,
          description: data.description,
          amount: toStroops(data.amount).toString(),
          recipient: data.recipient,
          vaultId: data.vaultId,
          tx_hash: hash,
        },
        token,
      );

      toast.success("Milestone proposed", {
        description: `#${milestone.id} · tx ${hash.slice(0, 8)}…`,
      });
      setData(EMPTY);
      setStep(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed.";
      toast.error("Could not propose milestone", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Propose a milestone</CardTitle>
        <CardDescription>
          Multisig signers approve proposals; once quorum is met the milestone
          becomes Active and funds can be released to the recipient.
        </CardDescription>
        <ol className="mt-4 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold " +
                  (i <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground")
                }
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={
                  i === step ? "text-sm font-medium" : "text-sm text-muted-foreground"
                }
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mx-1 h-px w-6 bg-border" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 0 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={data.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Deliver 500 water filters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={data.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What must be accomplished for this milestone to be released?"
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (XLM)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={data.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="2500.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient address</Label>
              <Input
                id="recipient"
                value={data.recipient}
                onChange={(e) => update("recipient", e.target.value)}
                placeholder="G… or C…"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaultId">Vault id</Label>
              <Input
                id="vaultId"
                value={data.vaultId}
                onChange={(e) => update("vaultId", e.target.value)}
                placeholder="vault-1"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <dl className="space-y-3 text-sm">
            <Row label="Title" value={data.title} />
            <Row label="Description" value={data.description} />
            <Row label="Amount" value={`${data.amount} XLM`} />
            <Row label="Recipient" value={data.recipient} mono />
            <Row label="Vault" value={data.vaultId} />
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="secondary">Proposed</Badge>
              <span className="text-muted-foreground">
                Status on creation — awaiting signer approvals.
              </span>
            </div>
          </dl>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : !isConnected ? (
          <Button
            onClick={() => connect().catch(() => undefined)}
            disabled={!isInstalled}
          >
            {isInstalled ? "Connect wallet to submit" : "Install Freighter"}
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Sign & propose"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b pb-2 last:border-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? "break-all font-mono" : "break-words"}>
        {value || "—"}
      </dd>
    </div>
  );
}
