"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/WalletProvider";
import { buildAddMilestoneTx, submitSigned, toStroops, shortenAddress } from "@/lib/stellar";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MilestoneEntry {
  title: string;
  description: string;
  amount: string;
  recipient: string;
}

interface ProjectData {
  // Step 1 — Project details
  projectTitle: string;
  projectDescription: string;
  category: string;
  // Step 2 — Milestones
  milestones: MilestoneEntry[];
  // Step 3 — Funding
  fundingGoal: string;
  token: "XLM" | "USDC";
}

const CATEGORIES = [
  "Education",
  "Healthcare",
  "Environment",
  "Infrastructure",
  "Technology",
  "Community",
  "Other",
] as const;

const STEPS = [
  "Project Details",
  "Milestones",
  "Funding Goal",
  "Review & Submit",
] as const;

const EMPTY_MILESTONE: MilestoneEntry = {
  title: "",
  description: "",
  amount: "",
  recipient: "",
};

const INITIAL_DATA: ProjectData = {
  projectTitle: "",
  projectDescription: "",
  category: CATEGORIES[0],
  milestones: [{ ...EMPTY_MILESTONE }],
  fundingGoal: "",
  token: "XLM",
};

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(addr.trim()) || /^C[A-Z2-7]{55}$/.test(addr.trim());
}

function stepIsValid(step: number, data: ProjectData): boolean {
  switch (step) {
    case 0:
      return (
        data.projectTitle.trim().length >= 3 &&
        data.projectDescription.trim().length >= 10
      );
    case 1:
      return (
        data.milestones.length >= 1 &&
        data.milestones.every(
          (m) =>
            m.title.trim().length > 0 &&
            Number(m.amount) > 0 &&
            isValidStellarAddress(m.recipient),
        )
      );
    case 2:
      return Number(data.fundingGoal) > 0;
    case 3:
      return true;
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */

export default function CreateProjectPage() {
  const { isConnected, isInstalled, publicKey, connect, signTransaction } =
    useWallet();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProjectData>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState(false);

  const valid = stepIsValid(step, data);
  const milestonesTotal = data.milestones.reduce(
    (sum, m) => sum + (Number(m.amount) || 0),
    0,
  );

  /* ── Milestone list helpers ── */

  function updateMilestone(idx: number, field: keyof MilestoneEntry, value: string) {
    setData((d) => ({
      ...d,
      milestones: d.milestones.map((m, i) =>
        i === idx ? { ...m, [field]: value } : m,
      ),
    }));
  }

  function addMilestone() {
    setData((d) => ({
      ...d,
      milestones: [...d.milestones, { ...EMPTY_MILESTONE }],
    }));
  }

  function removeMilestone(idx: number) {
    if (data.milestones.length <= 1) return;
    setData((d) => ({
      ...d,
      milestones: d.milestones.filter((_, i) => i !== idx),
    }));
  }

  /* ── Submit: builds on-chain tx per milestone, records via backend ── */

  async function handleSubmit() {
    if (!publicKey) return;

    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("stellaraid:token") ?? ""
        : "";

    setSubmitting(true);
    try {
      for (const ms of data.milestones) {
        // 1) Build + sign the on-chain add_milestone invocation
        const unsignedXdr = await buildAddMilestoneTx({
          admin: publicKey,
          title: ms.title,
          description: ms.description,
          amountDisplay: ms.amount,
          recipient: ms.recipient,
        });
        const signedXdr = await signTransaction(unsignedXdr);
        const { hash } = await submitSigned(signedXdr);

        // 2) Record in the backend WITH the tx_hash (mandatory)
        if (token) {
          await api.createMilestone(
            {
              title: ms.title,
              description: ms.description,
              amount: toStroops(ms.amount).toString(),
              recipient: ms.recipient,
              vaultId: data.projectTitle, // Using project title as vault reference
              tx_hash: hash,
            },
            token,
          );
        }
      }

      toast.success("Project milestones submitted!", {
        description: `${data.milestones.length} milestone(s) recorded on-chain.`,
      });
      setData(INITIAL_DATA);
      setStep(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed.";
      toast.error("Could not submit project", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ── */

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Create a Project</h1>
        <p className="mt-2 text-muted-foreground">
          Define milestones, set your funding goal, and launch transparent
          on-chain disbursement.
        </p>
      </div>

      {/* Step indicator */}
      <nav className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors " +
                (i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "border-2 border-primary text-primary"
                    : "bg-muted text-muted-foreground")
              }
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={
                "hidden text-sm sm:inline " +
                (i === step ? "font-medium" : "text-muted-foreground")
              }
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px w-4 bg-border sm:w-8" aria-hidden />
            )}
          </div>
        ))}
      </nav>

      {/* Form card */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "Describe your project and its impact."}
            {step === 1 && "Add milestones — each with a target amount and recipient."}
            {step === 2 && "Set the total funding goal and choose a token."}
            {step === 3 && "Review everything before on-chain submission."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ──── STEP 0: Project Details ──── */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="projectTitle">Project Title</Label>
                <Input
                  id="projectTitle"
                  value={data.projectTitle}
                  onChange={(e) =>
                    setData((d) => ({ ...d, projectTitle: e.target.value }))
                  }
                  placeholder="Clean Water Initiative — Phase II"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectDescription">Description</Label>
                <textarea
                  id="projectDescription"
                  value={data.projectDescription}
                  onChange={(e) =>
                    setData((d) => ({ ...d, projectDescription: e.target.value }))
                  }
                  placeholder="Describe the project's goals, target community, and expected impact…"
                  className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={data.category}
                  onChange={(e) =>
                    setData((d) => ({ ...d, category: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ──── STEP 1: Milestones ──── */}
          {step === 1 && (
            <>
              {data.milestones.map((ms, idx) => (
                <div
                  key={idx}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Milestone {idx + 1}
                    </span>
                    {data.milestones.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(idx)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input
                        value={ms.title}
                        onChange={(e) =>
                          updateMilestone(idx, "title", e.target.value)
                        }
                        placeholder="Deliver 200 water filters"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Amount ({data.token})</Label>
                      <Input
                        inputMode="decimal"
                        value={ms.amount}
                        onChange={(e) =>
                          updateMilestone(idx, "amount", e.target.value)
                        }
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input
                      value={ms.description}
                      onChange={(e) =>
                        updateMilestone(idx, "description", e.target.value)
                      }
                      placeholder="Criteria for verifying completion"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Recipient Address</Label>
                    <Input
                      value={ms.recipient}
                      onChange={(e) =>
                        updateMilestone(idx, "recipient", e.target.value)
                      }
                      placeholder="G… or C…"
                      className="font-mono"
                    />
                    {ms.recipient && !isValidStellarAddress(ms.recipient) && (
                      <p className="text-xs text-destructive">
                        Must be a valid Stellar public key (G…) or contract (C…)
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addMilestone}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" /> Add another milestone
              </Button>
            </>
          )}

          {/* ──── STEP 2: Funding Goal ──── */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fundingGoal">Total Funding Goal</Label>
                <Input
                  id="fundingGoal"
                  inputMode="decimal"
                  value={data.fundingGoal}
                  onChange={(e) =>
                    setData((d) => ({ ...d, fundingGoal: e.target.value }))
                  }
                  placeholder="25000"
                />
                {milestonesTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sum of milestones: {milestonesTotal.toLocaleString()} {data.token}
                    {Number(data.fundingGoal) > 0 &&
                      milestonesTotal > Number(data.fundingGoal) && (
                        <span className="ml-2 text-destructive">
                          ⚠ Milestones exceed the funding goal
                        </span>
                      )}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Token</Label>
                <div className="flex gap-2">
                  {(["XLM", "USDC"] as const).map((t) => (
                    <Button
                      key={t}
                      variant={data.token === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setData((d) => ({ ...d, token: t }))}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ──── STEP 3: Review & Submit ──── */}
          {step === 3 && (
            <div className="space-y-4">
              <ReviewRow label="Project" value={data.projectTitle} />
              <ReviewRow label="Category" value={data.category} />
              <ReviewRow label="Description" value={data.projectDescription} />
              <ReviewRow
                label="Funding Goal"
                value={`${Number(data.fundingGoal).toLocaleString()} ${data.token}`}
              />
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Milestones ({data.milestones.length})
                </h3>
                {data.milestones.map((ms, idx) => (
                  <div key={idx} className="mb-3 rounded-md border p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{ms.title}</span>
                      <Badge variant="outline">
                        {Number(ms.amount).toLocaleString()} {data.token}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{ms.description}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      → {ms.recipient}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!valid}
            >
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing & submitting…
                </>
              ) : (
                <>Sign & Submit ({data.milestones.length} milestone(s))</>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Review row                                                          */
/* ------------------------------------------------------------------ */

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b pb-2 last:border-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words">{value || "—"}</dd>
    </div>
  );
}

// TODO: Review performance constraints here (Ref: 0145230b - 1784118891)

// TODO: Review performance constraints here (Ref: cebd2ff1 - 1784118942)
