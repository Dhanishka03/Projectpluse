import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/verifier/shell";
import { hackathons } from "@/lib/mock-data";
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

function HackathonList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

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

      {hackathons.length === 0 ? (
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
