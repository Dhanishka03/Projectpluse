import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import {
  ClaimStatusMark,
  claimStatusLabel,
  RelevancePill,
} from "@/components/verifier/pills";
import { getHackathon, getSubmission, problemStatementTitle } from "@/lib/mock-data";
import type { Claim, Submission } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/hackathons/$id/submissions/$submissionId",
)({
  head: () => ({
    meta: [
      { title: "Submission Evidence — Projectpluse" },
      {
        name: "description",
        content:
          "Every claim in a submission's README next to the code evidence found for it.",
      },
      { property: "og:title", content: "Submission Evidence — Projectpluse" },
      {
        property: "og:description",
        content:
          "Every claim in a submission's README next to the code evidence found for it.",
      },
    ],
  }),
  component: Detail,
});

function fileUrl(repo: string, file: string, line?: number) {
  return `${repo}/blob/main/${file}${line ? `#L${line}` : ""}`;
}

function Detail() {
  const { id, submissionId } = Route.useParams();
  const hackathon = getHackathon(id);
  const submission = getSubmission(submissionId);
  const [open, setOpen] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);

  if (!submission) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Submission not found.</p>
      </AppShell>
    );
  }

  const toggle = (cid: string) =>
    setOpen((o) => (o.includes(cid) ? o.filter((x) => x !== cid) : [...o, cid]));

  const jumpTo = (cid: string) => {
    if (!open.includes(cid)) setOpen((o) => [...o, cid]);
    document
      .getElementById(`claim-${cid}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const verifiedRatio = `${submission.claimsVerifiedCount}/${submission.claimsTotalCount}`;
  const confidence =
    submission.claimsTotalCount === 0
      ? "—"
      : submission.claimsVerifiedCount / submission.claimsTotalCount >= 0.8
        ? "HIGH"
        : submission.claimsVerifiedCount / submission.claimsTotalCount >= 0.5
          ? "MEDIUM"
          : "LOW";

  return (
    <AppShell>
      <Crumbs
        items={[
          { label: "Hackathons", to: "/" },
          {
            label: hackathon?.name ?? "Hackathon",
            to: "/hackathons/$id",
            params: { id },
          },
          { label: submission.teamName },
        ]}
      />

      <header className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {submission.teamName}
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {submission.projectName}
            </h1>
            <a
              href={submission.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
            >
              {submission.githubUrl.replace("https://", "")}
              <ExternalLink className="size-3" />
            </a>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={reviewed}
              onCheckedChange={(v) => setReviewed(v === true)}
            />
            Mark as reviewed
          </label>
        </div>

        <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Problem statement</dt>
            <dd className="mt-1 text-sm">
              {problemStatementTitle(submission.problemStatementId)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Relevance</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm">
              <RelevancePill score={submission.relevanceScore} />
              <span className="font-mono text-xs text-muted-foreground">
                /100
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Overall verification
            </dt>
            <dd className="mt-1 font-mono text-sm tabular-nums">
              {verifiedRatio}{" "}
              <span className="text-xs text-muted-foreground">
                ({confidence})
              </span>
            </dd>
          </div>
        </dl>
      </header>

      {submission.status === "failed" && (
        <div className="mt-4 rounded-md border border-border bg-bad-soft px-4 py-3 text-sm text-bad">
          Analysis failed — {submission.failureReason}
        </div>
      )}

      {submission.issues.length > 0 && (
        <section className="mt-6 rounded-md border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">
            {submission.issues.length} issue
            {submission.issues.length > 1 ? "s" : ""} found
          </h2>
          <ul className="mt-3 space-y-3">
            {submission.issues.map((issue) => (
              <li key={issue.id}>
                <button
                  onClick={() => jumpTo(issue.claimId)}
                  className="w-full rounded border border-border bg-warn-soft/40 px-3 py-2 text-left transition-colors hover:bg-warn-soft"
                >
                  <span className="font-mono text-xs font-medium text-warn">
                    ⚠ {issue.title}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {issue.description}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Claims</h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {submission.claims.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No claims could be extracted from this README.
            </p>
          )}
          {submission.claims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              repo={submission.githubUrl}
              open={open.includes(claim.id)}
              onToggle={() => toggle(claim.id)}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function ClaimRow({
  claim,
  repo,
  open,
  onToggle,
}: {
  claim: Claim;
  repo: Submission["githubUrl"];
  open: boolean;
  onToggle: () => void;
}) {
  const found = claim.evidence.filter((e) => e.found);
  const missing = claim.evidence.filter((e) => !e.found);
  const labelTone =
    claim.status === "verified"
      ? "text-ok"
      : claim.status === "partially_verified"
        ? "text-warn"
        : "text-muted-foreground";

  return (
    <div id={`claim-${claim.id}`} className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50"
      >
        <ClaimStatusMark status={claim.status} />
        <span className="flex-1 text-sm">{claim.text}</span>
        <span className={cn("font-mono text-[11px] tracking-wide", labelTone)}>
          {claimStatusLabel(claim.status)}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border bg-muted/40 px-4 py-4">
          {found.length > 0 && (
            <EvidenceList title="FOUND" tone="text-ok">
              {found.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ok">✓</span>
                  <span>
                    <a
                      href={fileUrl(repo, e.file, e.line)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {e.file}
                      {e.line ? `:${e.line}` : ""}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      — {e.description}
                    </span>
                  </span>
                </li>
              ))}
            </EvidenceList>
          )}

          {missing.length > 0 && (
            <EvidenceList title="NOT FOUND" tone="text-muted-foreground">
              {missing.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-bad">✗</span>
                  <span className="text-xs text-muted-foreground">
                    {e.description}
                  </span>
                </li>
              ))}
            </EvidenceList>
          )}

          <div>
            <div className="font-mono text-[11px] tracking-widest text-muted-foreground">
              FINDING
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed">
              {claim.finding}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceList({
  title,
  tone,
  children,
}: {
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn("font-mono text-[11px] tracking-widest", tone)}
      >
        {title}
      </div>
      <ul className="mt-1.5 space-y-1">{children}</ul>
    </div>
  );
}
