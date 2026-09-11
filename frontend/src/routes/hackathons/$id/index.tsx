import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { ClaimsBar, IssueCount, RelevanceBar, StatusBadge } from "@/components/verifier/pills";
import { getHackathon, getSubmissions, problemStatementTitle } from "@/lib/mock-data";
import type { Submission } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hackathons/$id/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Projectpluse" },
      {
        name: "description",
        content:
          "Scan every submission with relevance, verified claims and open issues in one dense table.",
      },
      { property: "og:title", content: "Dashboard — Projectpluse" },
      {
        property: "og:description",
        content:
          "Scan every submission with relevance, verified claims and open issues in one dense table.",
      },
    ],
  }),
  component: Dashboard,
});

type SortKey = "relevanceScore" | "claimsVerifiedCount" | "issuesCount";

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="font-mono text-2xl tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  const hackathon = getHackathon(id);
  const rows = getSubmissions(id);

  const [ps, setPs] = useState("all");
  const [status, setStatus] = useState("all");
  const [minRelevance, setMinRelevance] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevanceScore");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const list = rows.filter(
      (s) =>
        (ps === "all" || s.problemStatementId === ps) &&
        (status === "all" || s.status === status) &&
        s.relevanceScore >= minRelevance,
    );
    return [...list].sort((a, b) => {
      const d = a[sort] - b[sort];
      return dir === "asc" ? d : -d;
    });
  }, [rows, ps, status, minRelevance, sort, dir]);

  function toggleSort(key: SortKey) {
    if (key === sort) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("desc");
    }
  }

  if (!hackathon) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Hackathon not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Crumbs items={[{ label: "Hackathons", to: "/hackathons" }, { label: hackathon.name }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{hackathon.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {hackathon.submissionStart.slice(0, 10)} → {hackathon.submissionEnd.slice(0, 10)}
          </p>
        </div>
        {hackathon.status === "analyzing" && (
          <Button asChild variant="outline" size="sm">
            <Link to="/hackathons/$id/analyzing" params={{ id }}>
              View analysis progress
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={hackathon.stats.totalSubmissions} label="Submissions" />
        <StatCard value={hackathon.stats.analyzed} label="Analyzed" />
        <StatCard value={hackathon.stats.needsReview} label="Need review" />
        <StatCard value={hackathon.stats.failed} label="Failed" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
        <Select value={ps} onValueChange={setPs}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Problem statement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All problem statements</SelectItem>
            {hackathon.problemStatements.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex min-w-52 items-center gap-3">
          <span className="text-xs text-muted-foreground">Relevance ≥</span>
          <Slider
            value={[minRelevance]}
            onValueChange={(v) => setMinRelevance(v[0] ?? 0)}
            max={100}
            step={5}
            className="w-32"
          />
          <span className="w-7 font-mono text-xs tabular-nums">{minRelevance}</span>
        </div>

        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length}/{rows.length} shown
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-12 px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Team</th>
              <th className="px-3 py-2 font-medium">Problem statement</th>
              <SortHeader
                label="Relevance"
                active={sort === "relevanceScore"}
                onClick={() => toggleSort("relevanceScore")}
              />
              <SortHeader
                label="Claims verified"
                active={sort === "claimsVerifiedCount"}
                onClick={() => toggleSort("claimsVerifiedCount")}
              />
              <SortHeader
                label="Issues"
                active={sort === "issuesCount"}
                onClick={() => toggleSort("issuesCount")}
              />
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="w-8 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <Row
                key={s.id}
                rank={i + 1}
                submission={s}
                hackathonId={id}
                onOpen={() =>
                  navigate({
                    to: "/hackathons/$id/submissions/$submissionId",
                    params: { id, submissionId: s.id },
                  })
                }
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-14 text-center text-sm text-muted-foreground">
                  {rows.length === 0
                    ? "No submissions have been uploaded for this hackathon yet."
                    : "No submissions match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2 font-medium">
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}

function Row({
  rank,
  submission,
  hackathonId,
  onOpen,
}: {
  rank: number;
  submission: Submission;
  hackathonId: string;
  onOpen: () => void;
}) {
  const s = submission;
  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-accent/50"
    >
      <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">{rank}</td>
      <td className="px-3 py-2">
        <div className="font-medium leading-tight">{s.teamName}</div>
        <div className="text-xs text-muted-foreground">{s.projectName}</div>
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {problemStatementTitle(s.problemStatementId)}
      </td>
      <td className="px-3 py-2">
        {s.status === "failed" ? (
          <span className="font-mono text-xs text-muted-foreground">—</span>
        ) : (
          <RelevanceBar score={s.relevanceScore} />
        )}
      </td>
      <td className="px-3 py-2">
        <ClaimsBar verified={s.claimsVerifiedCount} total={s.claimsTotalCount} />
      </td>
      <td className="px-3 py-2">
        <IssueCount count={s.issuesCount} />
      </td>
      <td className="px-3 py-2">
        {s.status === "failed" && s.failureReason ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <StatusBadge status={s.status} />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{s.failureReason}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <StatusBadge status={s.status} />
        )}
      </td>
      <td className="px-3 py-2">
        <Link
          to="/hackathons/$id/submissions/$submissionId"
          params={{ id: hackathonId, submissionId: s.id }}
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Open ${s.teamName}`}
        >
          <ChevronRight className="size-4" />
        </Link>
      </td>
    </tr>
  );
}
