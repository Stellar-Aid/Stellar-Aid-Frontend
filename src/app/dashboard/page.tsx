"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TransparencyChart,
  type TransparencyChartProps,
} from "@/components/TransparencyChart";
import {
  api,
  type Deposit,
  type Milestone,
  type MilestoneStatus,
  type Vault,
} from "@/lib/api";
import { fromStroops, shortenAddress } from "@/lib/stellar";

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

const STATUS_ICON: Record<MilestoneStatus, React.ReactNode> = {
  Proposed: <Clock className="h-4 w-4 text-blue-500" />,
  Active: <RefreshCw className="h-4 w-4 text-amber-500" />,
  Completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  Rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

const STATUS_VARIANT: Record<MilestoneStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Proposed: "secondary",
  Active: "default",
  Completed: "outline",
  Rejected: "destructive",
};

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);

  /* Fetch data on mount and optionally auto-refresh every 30s */
  useEffect(() => {
    const ctrl = new AbortController();

    async function fetchAll() {
      try {
        const [v, m] = await Promise.all([
          api.listVaults(ctrl.signal),
          api.listMilestones(ctrl.signal),
        ]);
        setVaults(v);
        setMilestones(m);
        // Fetch deposits for the first vault if available
        if (v.length > 0) {
          const d = await api.listDeposits(v[0].id, ctrl.signal);
          setDeposits(d);
        }
      } catch {
        // API unavailable — use empty state
      } finally {
        setLoading(false);
      }
    }

    fetchAll();

    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(fetchAll, 30_000);
    }

    return () => {
      ctrl.abort();
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  /* Aggregate fund stats */
  const totalDeposited = vaults.reduce(
    (s, v) => s + Number(fromStroops(v.totalDeposited || "0")),
    0,
  );
  const totalReleased = vaults.reduce(
    (s, v) => s + Number(fromStroops(v.totalReleased || "0")),
    0,
  );
  const totalRefunded = vaults.reduce(
    (s, v) => s + Number(fromStroops(v.totalRefunded || "0")),
    0,
  );

  /* Milestone status counts */
  const statusCounts: Record<MilestoneStatus, number> = {
    Proposed: 0,
    Active: 0,
    Completed: 0,
    Rejected: 0,
  };
  for (const ms of milestones) {
    statusCounts[ms.status] = (statusCounts[ms.status] || 0) + 1;
  }

  const chartProps: TransparencyChartProps = {
    funds: {
      deposited: totalDeposited,
      released: totalReleased,
      refunded: totalRefunded,
    },
    statusCounts,
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transparency Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Real-time fund tracking for all StellarAid vaults.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refreshing" : "Auto-refresh off"}
          </Button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Deposited"
          value={`${totalDeposited.toLocaleString()} XLM`}
          icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          label="Total Released"
          value={`${totalReleased.toLocaleString()} XLM`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          label="Total Refunded"
          value={`${totalRefunded.toLocaleString()} XLM`}
          icon={<XCircle className="h-5 w-5 text-red-400" />}
        />
        <StatCard
          label="Milestones"
          value={milestones.length.toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Charts */}
      <TransparencyChart {...chartProps} />

      {/* Milestone timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Timeline</CardTitle>
          <CardDescription>All milestones across active vaults</CardDescription>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading milestones…" : "No milestones found. Create a project to get started."}
            </p>
          ) : (
            <div className="relative space-y-0">
              {milestones.map((ms, idx) => (
                <div key={ms.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {/* Vertical line */}
                  {idx < milestones.length - 1 && (
                    <div className="absolute left-[19px] top-8 h-full w-px bg-border" />
                  )}
                  {/* Status dot */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card">
                    {STATUS_ICON[ms.status]}
                  </div>
                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ms.title}</span>
                      <Badge variant={STATUS_VARIANT[ms.status]} className="text-xs">
                        {ms.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ms.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>
                        Amount:{" "}
                        <span className="font-medium text-foreground">
                          {fromStroops(ms.amount)} XLM
                        </span>
                      </span>
                      <span>
                        Recipient:{" "}
                        <span className="font-mono">{shortenAddress(ms.recipient)}</span>
                      </span>
                      {ms.approvals !== undefined && ms.quorum !== undefined && (
                        <span>
                          Approvals: {ms.approvals}/{ms.quorum}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent deposits / transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deposits</CardTitle>
          <CardDescription>Latest contributions tracked on-chain</CardDescription>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "No deposits recorded yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-4">Donor</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Tx Hash</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.slice(0, 20).map((dep) => (
                    <tr key={dep.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {shortenAddress(dep.donor)}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {fromStroops(dep.amount)} XLM
                      </td>
                      <td className="py-2 pr-4">
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${dep.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                        >
                          {dep.txHash.slice(0, 10)}…
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(dep.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donor leaderboard */}
      {deposits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Donor Leaderboard</CardTitle>
            <CardDescription>Top contributors by total deposit amount</CardDescription>
          </CardHeader>
          <CardContent>
            <DonorLeaderboard deposits={deposits} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Donor leaderboard                                                   */
/* ------------------------------------------------------------------ */

function DonorLeaderboard({ deposits }: { deposits: Deposit[] }) {
  const totals = new Map<string, number>();
  for (const d of deposits) {
    const current = totals.get(d.donor) ?? 0;
    totals.set(d.donor, current + Number(fromStroops(d.amount)));
  }
  const sorted = Array.from(totals.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <div className="space-y-2">
      {sorted.map(([donor, total], idx) => (
        <div
          key={donor}
          className="flex items-center justify-between rounded-md border px-4 py-2"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {idx + 1}
            </span>
            <span className="font-mono text-sm">{shortenAddress(donor, 6)}</span>
          </div>
          <span className="font-semibold">{total.toLocaleString()} XLM</span>
        </div>
      ))}
    </div>
  );
}

// TODO: Review performance constraints here (Ref: 51ebd629 - 1784118887)

// TODO: Review performance constraints here (Ref: bcb85bc9 - 1784118895)
