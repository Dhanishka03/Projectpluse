import { cn } from "@/lib/utils";
import type { Claim, Submission } from "@/lib/types";

export function RelevancePill({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-ok-soft text-ok"
      : score >= 50
        ? "bg-warn-soft text-warn"
        : "bg-bad-soft text-bad";
  return (
    <span
      className={cn(
        "inline-flex min-w-11 justify-center rounded px-1.5 py-0.5 font-mono text-xs tabular-nums",
        tone,
      )}
    >
      {score}
    </span>
  );
}

export function StatusBadge({ status }: { status: Submission["status"] }) {
  const map = {
    verified: ["Verified", "bg-ok-soft text-ok"],
    review: ["Review", "bg-warn-soft text-warn"],
    failed: ["Failed", "bg-bad-soft text-bad"],
  } as const;
  const [label, tone] = map[status];
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}

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

export function ClaimsMeter({
  verified,
  total,
}: {
  verified: number;
  total: number;
}) {
  if (total === 0)
    return <span className="font-mono text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-xs tabular-nums">
        {verified}/{total}
      </span>
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full",
              i < verified ? "bg-ok" : "bg-border",
            )}
          />
        ))}
      </span>
    </span>
  );
}

export function ClaimStatusMark({ status }: { status: Claim["status"] }) {
  const map = {
    verified: ["✓", "text-ok"],
    partially_verified: ["⚠", "text-warn"],
    not_found: ["✗", "text-muted-foreground"],
  } as const;
  const [glyph, tone] = map[status];
  return (
    <span className={cn("font-mono text-sm leading-none", tone)}>{glyph}</span>
  );
}

export function claimStatusLabel(status: Claim["status"]) {
  return status === "verified"
    ? "VERIFIED"
    : status === "partially_verified"
      ? "PARTIALLY VERIFIED"
      : "NOT FOUND";
}
