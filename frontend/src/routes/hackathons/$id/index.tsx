import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, ChevronRight, FileSpreadsheet, Loader2, Upload, Zap } from "lucide-react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { ClaimsBar, IssueCount, RelevanceBar, StatusBadge } from "@/components/verifier/pills";
import { getHackathon, listSubmissions, uploadCsv, triggerAnalysis } from "@/lib/api";
import type { Hackathon, Submission } from "@/lib/types";
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
      { title: "Dashboard — Projectpulse" },
      {
        name: "description",
        content:
          "Scan every submission with relevance, verified claims and open issues in one dense table.",
      },
      { property: "og:title", content: "Dashboard — Projectpulse" },
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

function SkeletonRow() {
  return (
    <tr className="border-b border-border/70 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div className="h-3 rounded bg-muted" style={{ width: i === 1 ? "80%" : "60%" }} />
        </td>
      ))}
    </tr>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([getHackathon(id), listSubmissions(id)])
      .then(([h, subs]) => {
        setHackathon(h);
        setRows(subs);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  }, [user, id]);

  const [ps, setPs] = useState("all");
  const [status, setStatus] = useState("all");
  const [minRelevance, setMinRelevance] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevanceScore");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  // --- CSV Upload state ---
  const [showUpload, setShowUpload] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCsvFile(file: File) {
    setCsvFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setUploadError(null);
  }

  // Quick preview — first 4 data rows, first 4 columns
  const csvPreviewRows = useMemo(() => {
    if (!csvText.trim()) return [];
    return csvText
      .trim()
      .split(/\r?\n/)
      .slice(0, 5)
      .map((line) => line.split(",").slice(0, 4).map((c) => c.replace(/^"|"$/g, "").trim()));
  }, [csvText]);

  async function handleUploadAndAnalyze() {
    if (!csvText.trim()) return;
    setUploading(true);
    setUploadError(null);
    try {
      const updated = await uploadCsv(id, csvText);
      setHackathon(updated);
      setRows([]);
      setCsvText("");
      setCsvFileName(null);
      setShowUpload(false);
      // Kick off analysis in background
      void navigate({ to: "/hackathons/$id/analyzing", params: { id } });
      triggerAnalysis(id).catch(() => {});
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

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

  if (!user) return null;

  if (error) {
    return (
      <AppShell>
        <p className="text-sm text-bad">{error}</p>
      </AppShell>
    );
  }

  if (!loading && !hackathon) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Hackathon not found.</p>
      </AppShell>
    );
  }

  /** Helper to resolve problem statement title by id */
  const psTitle = (psId: string) =>
    hackathon?.problemStatements.find((p) => p.id === psId)?.title ?? psId;

  return (
    <AppShell>
      <Crumbs items={[{ label: "Hackathons", to: "/hackathons" }, { label: hackathon?.name ?? "…" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {hackathon?.name ?? <span className="animate-pulse text-muted-foreground">Loading…</span>}
          </h1>
          {hackathon && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {hackathon.submissionStart.slice(0, 10)} → {hackathon.submissionEnd.slice(0, 10)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hackathon?.status === "analyzing" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/hackathons/$id/analyzing" params={{ id }}>
                View analysis progress
              </Link>
            </Button>
          )}
          {hackathon && hackathon.status !== "analyzing" && (
            <Button
              size="sm"
              variant={showUpload ? "secondary" : "outline"}
              onClick={() => { setShowUpload((v) => !v); setUploadError(null); }}
              id="toggle-csv-upload"
            >
              <Upload className="mr-1.5 size-3.5" />
              {rows.length === 0 ? "Upload CSV" : "Upload more"}
            </Button>
          )}
          {hackathon && rows.length > 0 && hackathon.status !== "analyzing" && (
            <Button
              size="sm"
              onClick={() => {
                void navigate({ to: "/hackathons/$id/analyzing", params: { id } });
                triggerAnalysis(id).catch(() => {});
              }}
              id="re-analyze-btn"
            >
              <Zap className="mr-1.5 size-3.5" />
              Re-analyze
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={hackathon?.stats.totalSubmissions ?? 0} label="Submissions" />
        <StatCard value={hackathon?.stats.analyzed ?? 0} label="Analyzed" />
        <StatCard value={hackathon?.stats.needsReview ?? 0} label="Need review" />
        <StatCard value={hackathon?.stats.failed ?? 0} label="Failed" />
      </div>

      {/* ---------- CSV Upload Panel ---------- */}
      {(showUpload || rows.length === 0) && hackathon && hackathon.status !== "analyzing" && (
        <div className="mt-6 rounded-md border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {rows.length === 0 ? "Upload a submissions CSV to get started" : "Upload additional submissions"}
            </p>
            {rows.length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setShowUpload(false); setCsvText(""); setCsvFileName(null); }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Drop zone */}
          <label
            id="detail-csv-dropzone"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleCsvFile(f);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/10" : "border-border hover:border-ring/60"
            )}
          >
            {csvFileName ? (
              <>
                <FileSpreadsheet className="mb-2 size-5 text-primary" />
                <span className="text-sm font-medium">{csvFileName}</span>
                <span className="mt-1 text-xs text-muted-foreground">Click or drop another file to replace</span>
              </>
            ) : (
              <>
                <Upload className="mb-2 size-5 text-muted-foreground" />
                <span className="text-sm">Drop a CSV here or click to upload</span>
                <span className="mt-1 font-mono text-[11px] text-muted-foreground">id, teamname, problem statement, github link</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCsvFile(f);
              }}
            />
          </label>

          {/* Preview table */}
          {csvPreviewRows.length > 1 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-max text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    {csvPreviewRows[0]?.map((h, i) => (
                      <th key={i} className="px-3 py-1.5 font-medium whitespace-nowrap">{h || `Col ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewRows.slice(1).map((cols, ri) => (
                    <tr key={ri} className="border-b border-border/60 last:border-0">
                      {cols.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 max-w-40 truncate" title={cell}>{cell || <span className="text-muted-foreground">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {uploadError && (
            <p className="rounded-md border border-border bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
              {uploadError}
            </p>
          )}

          <Button
            size="sm"
            disabled={!csvText.trim() || uploading}
            onClick={() => { void handleUploadAndAnalyze(); }}
            id="upload-and-analyze-btn"
          >
            {uploading ? (
              <><Loader2 className="mr-1.5 size-3.5 animate-spin" />Uploading…</>
            ) : (
              <><Zap className="mr-1.5 size-3.5" />Upload &amp; Analyze</>
            )}
          </Button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
        <Select value={ps} onValueChange={setPs}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Problem statement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All problem statements</SelectItem>
            {hackathon?.problemStatements.map((p) => (
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
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              <>
                {filtered.map((s, i) => (
                  <Row
                    key={s.id}
                    rank={i + 1}
                    submission={s}
                    hackathonId={id}
                    psTitle={psTitle(s.problemStatementId)}
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
              </>
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
  psTitle,
  onOpen,
}: {
  rank: number;
  submission: Submission;
  hackathonId: string;
  psTitle: string;
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
      <td className="px-3 py-2 text-xs text-muted-foreground">{psTitle}</td>
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
