import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { getHackathon, getProgress } from "@/lib/api";
import type { Hackathon } from "@/lib/types";
import type { AnalysisProgress } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hackathons/$id/analyzing")({
  head: () => ({
    meta: [
      { title: "Analyzing Submissions — Projectpluse" },
      {
        name: "description",
        content: "Live progress while each submission's repository is analyzed against its claims.",
      },
      { property: "og:title", content: "Analyzing Submissions — Projectpluse" },
      {
        property: "og:description",
        content: "Live progress while each submission's repository is analyzed against its claims.",
      },
    ],
  }),
  component: Analyzing,
});

const POLL_MS = 2500;

function Analyzing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = Route.useParams();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  // Load hackathon name once
  useEffect(() => {
    if (!user) return;
    getHackathon(id)
      .then(setHackathon)
      .catch(() => {}); // non-critical — only used for breadcrumb
  }, [user, id]);

  // Poll progress every POLL_MS ms
  useEffect(() => {
    if (!user || doneRef.current) return;

    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await getProgress(id);
        setProgress(data);

        if (data.total > 0 && data.completed >= data.total && !doneRef.current) {
          doneRef.current = true;
          return; // stop polling — user will click "View results"
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch progress");
      }
      timer = setTimeout(() => { void poll(); }, POLL_MS);
    }

    void poll();
    return () => clearTimeout(timer);
  }, [user, id]);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const current = progress?.current ?? [];
  const isDone = total > 0 && completed >= total;

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
          { label: "Analyzing" },
        ]}
      />

      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="text-lg font-semibold tracking-tight">
          {total === 0
            ? "Starting analysis…"
            : `Analyzing ${Math.min(completed + 1, total)} of ${total} submissions`}
        </h1>
        <Progress value={total ? (completed / total) * 100 : 0} className="mt-5 h-1.5" />
        <p className="mt-3 text-xs text-muted-foreground">
          {error ? (
            <span className="text-bad">{error}</span>
          ) : isDone ? (
            "Analysis complete."
          ) : (
            "This may take a few minutes."
          )}
        </p>

        {current.length > 0 && (
          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-md border border-border bg-card text-left">
            {current.map((s) => (
              <li key={s.teamName} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{s.teamName}</span>
                <span
                  className={cn(
                    "font-mono text-xs",
                    s.status === "done"
                      ? "text-ok"
                      : s.status === "analyzing"
                        ? "text-warn"
                        : "text-muted-foreground",
                  )}
                >
                  {s.status === "done" ? "done ✓" : s.status === "analyzing" ? "analyzing…" : "queued"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {isDone && (
          <Button asChild className="mt-6" size="sm">
            <Link to="/hackathons/$id" params={{ id }}>
              View results
            </Link>
          </Button>
        )}
      </div>
    </AppShell>
  );
}
