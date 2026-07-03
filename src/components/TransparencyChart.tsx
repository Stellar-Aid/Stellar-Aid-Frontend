"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MilestoneStatus } from "@/lib/api";

/**
 * Live transparency charts. Colors come from the validated data-viz palette:
 * fund flow is categorical (blue / good-green / critical-red); milestone status
 * uses the reserved status hues, each direct-labeled so identity is never
 * color-alone.
 */

export interface TransparencyChartProps {
  /** Fund totals in display units (XLM), not stroops. */
  funds: { deposited: number; released: number; refunded: number };
  /** Count of milestones per status. */
  statusCounts: Record<MilestoneStatus, number>;
}

// Fund-flow: categorical slots (blue / good / critical) — see palette.md.
const FUND_COLORS = {
  deposited: "#2a78d6",
  released: "#0ca30c",
  refunded: "#d03b3b",
} as const;

// Milestone status: reserved status palette hues.
const STATUS_COLORS: Record<MilestoneStatus, string> = {
  Proposed: "#2a78d6",
  Active: "#fab219",
  Completed: "#0ca30c",
  Rejected: "#d03b3b",
};

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function TransparencyChart({ funds, statusCounts }: TransparencyChartProps) {
  const fundData = [
    { name: "Deposited", key: "deposited" as const, value: funds.deposited },
    { name: "Released", key: "released" as const, value: funds.released },
    { name: "Refunded", key: "refunded" as const, value: funds.refunded },
  ];
  const fundsEmpty = fundData.every((d) => !d.value);

  const statusData = (Object.keys(statusCounts) as MilestoneStatus[])
    .map((status) => ({ name: status, value: statusCounts[status] }))
    .filter((d) => d.value > 0);
  const statusEmpty = statusData.length === 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Fund flow</CardTitle>
          <CardDescription>Deposited vs released vs refunded (XLM)</CardDescription>
        </CardHeader>
        <CardContent>
          {fundsEmpty ? (
            <EmptyState label="No fund activity yet" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={fundData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "#c3c2b7" }}
                  tick={{ fill: "#898781", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#898781", fontSize: 12 }}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "rgba(137,135,129,0.12)" }}
                  formatter={(value: number) => [`${value} XLM`, "Amount"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
                  {fundData.map((d) => (
                    <Cell key={d.key} fill={FUND_COLORS[d.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestone status</CardTitle>
          <CardDescription>Distribution across the lifecycle</CardDescription>
        </CardHeader>
        <CardContent>
          {statusEmpty ? (
            <EmptyState label="No milestones yet" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="var(--card, #fff)"
                  strokeWidth={2}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusData.map((d) => (
                    <Cell
                      key={d.name}
                      fill={STATUS_COLORS[d.name as MilestoneStatus]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
