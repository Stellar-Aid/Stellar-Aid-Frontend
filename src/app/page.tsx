"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Layers,
  Rocket,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
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
import { DepositPanel } from "@/components/DepositPanel";
import { api, type Vault } from "@/lib/api";
import { fromStroops } from "@/lib/stellar";

/* ------------------------------------------------------------------ */
/* Animated counter — ticks up from 0 to `target` on mount            */
/* ------------------------------------------------------------------ */

function AnimatedStat({
  label,
  target,
  prefix = "",
  suffix = "",
  icon,
}: {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  icon: React.ReactNode;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5" />
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">
          {prefix}
          {value.toLocaleString()}
          {suffix}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* How-it-works step card                                              */
/* ------------------------------------------------------------------ */

function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
        {icon}
      </div>
      <Badge variant="outline" className="font-mono text-xs">
        Step {step}
      </Badge>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Featured vault card                                                 */
/* ------------------------------------------------------------------ */

function VaultCard({ vault }: { vault: Vault }) {
  const deposited = Number(fromStroops(vault.totalDeposited || "0"));
  const released = Number(fromStroops(vault.totalReleased || "0"));
  const pct = deposited > 0 ? Math.min(100, Math.round((released / deposited) * 100)) : 0;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{vault.name || vault.contractId}</CardTitle>
        <CardDescription className="font-mono text-xs">
          {vault.contractId.slice(0, 8)}…{vault.contractId.slice(-6)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Released / Deposited</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fromStroops(vault.totalReleased || "0")} XLM</span>
          <span>{fromStroops(vault.totalDeposited || "0")} XLM</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [vaults, setVaults] = useState<Vault[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    api.listVaults(ctrl.signal).then(setVaults).catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Aggregate stats across all vaults (falls back to demo values if no backend)
  const totalDeposited = vaults.reduce(
    (sum, v) => sum + Number(fromStroops(v.totalDeposited || "0")),
    0,
  );
  const totalReleased = vaults.reduce(
    (sum, v) => sum + Number(fromStroops(v.totalReleased || "0")),
    0,
  );

  return (
    <div className="space-y-20">
      {/* ─── HERO ─── */}
      <section className="flex flex-col items-center gap-6 pt-12 text-center">
        <Badge variant="secondary" className="gap-1.5 px-4 py-1.5">
          <Rocket className="h-3.5 w-3.5" />
          Built on Stellar &amp; Soroban
        </Badge>

        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Transparent Funding,{" "}
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Powered by Stellar
          </span>
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground">
          StellarAid brings milestone-gated, on-chain grant flows to global
          philanthropy. Every dollar is tracked, every release is auditable,
          every refund is guaranteed.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild size="lg" className="gap-2">
            <Link href="/create">
              Create a Project <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/dashboard">
              <BarChart3 className="h-4 w-4" /> Explore Dashboard
            </Link>
          </Button>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <AnimatedStat
          label="Total Funded"
          target={totalDeposited || 128450}
          prefix=""
          suffix=" XLM"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <AnimatedStat
          label="Active Vaults"
          target={vaults.length || 12}
          icon={<Layers className="h-5 w-5" />}
        />
        <AnimatedStat
          label="Milestones Released"
          target={Math.round(totalReleased) || 47}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </section>

      {/* ─── DEPOSIT PANEL ─── */}
      <section className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold">Fund a Project</h2>
        <p className="max-w-lg text-center text-muted-foreground">
          Deposit XLM into the StellarAid vault. Your contribution is protected
          by on-chain milestone gates and multi-signature release controls.
        </p>
        <DepositPanel />
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <p className="mt-2 text-muted-foreground">
            Three simple steps to transparent, accountable funding.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          <StepCard
            step={1}
            title="Deposit"
            description="Donors lock funds in an on-chain Soroban vault. Contributions are held securely until milestones are met."
            icon={<ShieldCheck className="h-6 w-6" />}
          />
          <StepCard
            step={2}
            title="Track"
            description="Project owners propose milestones. Multi-sig signers review and approve each target before funds unlock."
            icon={<Search className="h-6 w-6" />}
          />
          <StepCard
            step={3}
            title="Verify"
            description="Every release, refund, and approval is on-chain. The Transparency Dashboard gives real-time accountability."
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
        </div>
      </section>

      {/* ─── FEATURED VAULTS ─── */}
      {vaults.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Active Projects</h2>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/dashboard">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vaults.slice(0, 6).map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className="rounded-xl border bg-card p-8 text-center">
        <Target className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h2 className="text-2xl font-bold">Ready to launch your project?</h2>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          Define milestones, set funding goals, and let StellarAid handle
          transparent disbursement — all on-chain.
        </p>
        <Button asChild size="lg" className="mt-6 gap-2">
          <Link href="/create">
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
