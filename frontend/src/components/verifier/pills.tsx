import { cn } from "@/lib/utils";
import type { Claim, Submission } from "@/lib/types";

/* ---------- Relevance score (bar + percentage) ---------- */

function relevanceTone(score: number) {
  if (score >= 80) return { fill: "bg-ok", text: "text-ok" };
  if (score >= 50) return { fill: "bg-warn", text: "text-warn" };
  return { fill: "bg-bad", text: "text-bad" };
}

/** Compact relevance bar for table rows. */
export function RelevanceBar({ score }: { score: number }) {
  const { fill, text } = relevanceTone(score);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-border">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", fill)}
          style={{ width: `${score}%` }}
        />
      </span>
      <span className={cn("font-mono text-xs tabular-nums", text)}>{score}%</span>
    </span>
  );
}

/** Larger relevance bar for the submission detail header. */
export function RelevanceBarLarge({ score }: { score: number }) {
  const { fill, text } = relevanceTone(score);
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative h-2 w-32 overflow-hidden rounded-full bg-border">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", fill)}
          style={{ width: `${score}%` }}
        />
      </span>
      <span className={cn("font-mono text-sm tabular-nums font-medium", text)}>{score}%</span>
    </span>
  );
}

/* ---------- Claims verified (bar + fraction) ---------- */

/** Compact claims bar for table rows. */
export function ClaimsBar({ verified, total }: { verified: number; total: number }) {
  if (total === 0) return <span className="font-mono text-xs text-muted-foreground">—</span>;
  const pct = Math.round((verified / total) * 100);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-border">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-ok transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {verified}/{total}
      </span>
    </span>
  );
}

/** Larger claims bar for the submission detail header. */
export function ClaimsBarLarge({ verified, total }: { verified: number; total: number }) {
  if (total === 0) return <span className="font-mono text-xs text-muted-foreground">—</span>;
  const pct = Math.round((verified / total) * 100);
  return (
    <div className="space-y-1">
      <span className="font-mono text-sm tabular-nums">
        {verified}/{total}{" "}
        <span className="text-xs text-muted-foreground">({pct}%)</span>
      </span>
      <span className="relative block h-2 w-32 overflow-hidden rounded-full bg-border">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-ok transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

/* ---------- Status badge ---------- */

export function StatusBadge({ status }: { status: Submission["status"] }) {
  const map = {
    verified: ["Verified", "bg-ok-soft text-ok"],
    review: ["Review", "bg-warn-soft text-warn"],
    failed: ["Failed", "bg-bad-soft text-bad"],
  } as const;
  const [label, tone] = map[status];
  return (
    <span className={cn("inline-flex rounded px-1.5 py-0.5 text-xs font-medium", tone)}>
      {label}
    </span>
  );
}

/* ---------- Issue count ---------- */

export function IssueCount({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 font-mono text-xs tabular-nums",
        count === 0
          ? "bg-muted text-muted-foreground"
          : count > 1
            ? "bg-bad-soft text-bad"
            : "bg-warn-soft text-warn",
      )}
    >
      {count}
    </span>
  );
}

/* ---------- Claim status mark ---------- */

export function ClaimStatusMark({ status }: { status: Claim["status"] }) {
  const map = {
    verified: ["✓", "text-ok"],
    partially_verified: ["⚠", "text-warn"],
    not_found: ["✗", "text-muted-foreground"],
  } as const;
  const [glyph, tone] = map[status];
  return <span className={cn("font-mono text-sm leading-none", tone)}>{glyph}</span>;
}

export function claimStatusLabel(status: Claim["status"]) {
  return status === "verified"
    ? "VERIFIED"
    : status === "partially_verified"
      ? "PARTIALLY VERIFIED"
      : "NOT FOUND";
}
