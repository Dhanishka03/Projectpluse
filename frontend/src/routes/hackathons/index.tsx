import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/verifier/shell";
import { listHackathons } from "@/lib/api";
import type { Hackathon } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hackathons/")({
  head: () => ({
    meta: [
      { title: "Hackathons — Projectpluse" },
      {
        name: "description",
        content:
          "Review GitHub hackathon submissions by comparing what teams claimed with the evidence found in their code.",
      },
      {
        property: "og:title",
        content: "Hackathons — Projectpluse",
      },
      {
        property: "og:description",
        content:
          "Review GitHub hackathon submissions by comparing what teams claimed with the evidence found in their code.",
      },
    ],
  }),
  component: HackathonList,
});

const statusTone = {
  draft: "bg-muted text-muted-foreground",
  analyzing: "bg-warn-soft text-warn",
  complete: "bg-ok-soft text-ok",
} as const;

/** Skeleton placeholder cards shown while loading */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
      <div className="mt-3 h-3 w-24 rounded bg-muted" />
      <div className="mt-1 h-3 w-36 rounded bg-muted" />
    </div>
  );
}

function HackathonList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    listHackathons()
      .then(setHackathons)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load hackathons"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Hackathons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Claims on the left, evidence on the right — across every submission.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/hackathons/new">New hackathon</Link>
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-md border border-border bg-card px-4 py-3 text-sm text-bad">
          {error}
        </div>
      ) : hackathons.length === 0 ? (
        <div className="mt-16 text-center">
          <h2 className="text-base font-medium">No hackathons yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Create one, upload the submission sheet, and the analysis starts from there.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link to="/hackathons/new">Create hackathon</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hackathons.map((h) => (
            <Link
              key={h.id}
              to="/hackathons/$id"
              params={{ id: h.id }}
              className="rounded-md border border-border bg-card p-4 transition-colors hover:border-ring/50"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-medium leading-snug">{h.name}</h2>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize",
                    statusTone[h.status],
                  )}
                >
                  {h.status}
                </span>
              </div>
              <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">
                {h.stats.totalSubmissions} submissions
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {h.submissionStart.slice(0, 10)} → {h.submissionEnd.slice(0, 10)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
