import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { getHackathon, getSubmissions } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hackathons/$id/analyzing")({
  head: () => ({
    meta: [
      { title: "Analyzing submissions — Submission Verifier" },
      {
        name: "description",
        content:
          "Live progress while each submission's repository is analyzed against its claims.",
      },
      { property: "og:title", content: "Analyzing submissions" },
      {
        property: "og:description",
        content:
          "Live progress while each submission's repository is analyzed against its claims.",
      },
    ],
  }),
  component: Analyzing,
});

function Analyzing() {
  const { id } = Route.useParams();
  const hackathon = getHackathon(id);
  const queue = getSubmissions(id);
  const total = queue.length;
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= total) return;
    const t = setTimeout(() => setDone((d) => d + 1), 1400);
    return () => clearTimeout(t);
  }, [done, total]);

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
          { label: "Analyzing" },
        ]}
      />

      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="text-lg font-semibold tracking-tight">
          Analyzing {Math.min(done + 1, total)} of {total} submissions
        </h1>
        <Progress
          value={total ? (done / total) * 100 : 0}
          className="mt-5 h-1.5"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          This may take a few minutes.
        </p>

        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-md border border-border bg-card text-left">
          {queue.map((s, i) => {
            const state =
              i < done ? "done" : i === done ? "analyzing" : "queued";
            return (
              <li
                key={s.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>{s.teamName}</span>
                <span
                  className={cn(
                    "font-mono text-xs",
                    state === "done"
                      ? "text-ok"
                      : state === "analyzing"
                        ? "text-warn"
                        : "text-muted-foreground",
                  )}
                >
                  {state === "done"
                    ? "done ✓"
                    : state === "analyzing"
                      ? "analyzing…"
                      : "queued"}
                </span>
              </li>
            );
          })}
        </ul>

        {done >= total && total > 0 && (
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
