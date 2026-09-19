import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink } from "lucide-react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { ClaimStatusMark, claimStatusLabel, ClaimsBarLarge, RelevanceBarLarge } from "@/components/verifier/pills";
import { getHackathon, getSubmission } from "@/lib/api";
import type { Hackathon, Submission, Claim } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hackathons/$id/submissions/$submissionId")({
  head: () => ({
    meta: [
      { title: "Submission Evidence — Projectpluse" },
      {
        name: "description",
        content: "Every claim in a submission's README next to the code evidence found for it.",
      },
      { property: "og:title", content: "Submission Evidence — Projectpluse" },
      {
        property: "og:description",
        content: "Every claim in a submission's README next to the code evidence found for it.",
      },
    ],
  }),
  component: Detail,
});

function fileUrl(repo: string, file: string, line?: number) {
  return `${repo}/blob/main/${file}${line ? `#L${line}` : ""}`;
}

function Detail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id, submissionId } = Route.useParams();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([getHackathon(id), getSubmission(id, submissionId)])
      .then(([h, s]) => {
        setHackathon(h);
        setSubmission(s);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load submission"),
      )
      .finally(() => setLoading(false));
  }, [user, id, submissionId]);

  if (!user) return null;

  const toggle = (cid: string) =>
    setOpen((o) => (o.includes(cid) ? o.filter((x) => x !== cid) : [...o, cid]));

  const jumpTo = (cid: string) => {
    if (!open.includes(cid)) setOpen((o) => [...o, cid]);
    document
      .getElementById(`claim-${cid}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /** Resolve problem statement title from hackathon data */
  const psTitle = (psId: string) =>
    hackathon?.problemStatements.find((p) => p.id === psId)?.title ?? psId;

  if (loading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-32 rounded-md bg-muted" />
          <div className="h-64 rounded-md bg-muted" />
        </div>
      </AppShell>
    );
  }

  if (error || !submission) {
    return (
      <AppShell>
        <p className="text-sm text-bad">{error ?? "Submission not found."}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Crumbs
        items={[
          { label: "Hackathons", to: "/hackathons" },
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
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{submission.projectName}</h1>
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
        </div>

        <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Problem statement</dt>
            <dd className="mt-1 text-sm">{psTitle(submission.problemStatementId)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Relevance</dt>
            <dd className="mt-1">
              <RelevanceBarLarge score={submission.relevanceScore} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Overall verification</dt>
            <dd className="mt-1">
              <ClaimsBarLarge
                verified={submission.claimsVerifiedCount}
                total={submission.claimsTotalCount}
              />
            </dd>
          </div>
        </dl>
      </header>

      {/* Mark as Reviewed — primary organizer action */}
      <Button
        id="mark-reviewed-button"
        variant={reviewed ? "outline" : "default"}
        size="lg"
        className={cn(
          "mt-4 w-full text-sm font-medium",
          reviewed && "border-ok/30 text-ok hover:bg-ok-soft/50",
        )}
        onClick={() => setReviewed(!reviewed)}
      >
        <CheckCircle2 className="mr-2 size-4" />
        {reviewed ? "Reviewed ✓" : "Mark as Reviewed"}
      </Button>

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
                  <span className="font-mono text-xs font-medium text-warn">⚠ {issue.title}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{issue.description}</p>
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
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
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
                    <span className="text-xs text-muted-foreground"> — {e.description}</span>
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
                  <span className="text-xs text-muted-foreground">{e.description}</span>
                </li>
              ))}
            </EvidenceList>
          )}

          <div>
            <div className="font-mono text-[11px] tracking-widest text-muted-foreground">
              FINDING
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed">{claim.finding}</p>
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
      <div className={cn("font-mono text-[11px] tracking-widest", tone)}>{title}</div>
      <ul className="mt-1.5 space-y-1">{children}</ul>
    </div>
  );
}
