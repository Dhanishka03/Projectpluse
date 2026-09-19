import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createHackathon, triggerAnalysis } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hackathons/new")({
  head: () => ({
    meta: [
      { title: "New Hackathon — Projectpluse" },
      {
        name: "description",
        content:
          "Set the submission window, problem statements and the team sheet to start verifying.",
      },
      { property: "og:title", content: "New Hackathon — Projectpluse" },
      {
        property: "og:description",
        content:
          "Set the submission window, problem statements and the team sheet to start verifying.",
      },
    ],
  }),
  component: NewHackathon,
});

interface ParsedRow {
  id: string;
  team: string;
  problem: string;
  github: string;
}

interface ParsedResult {
  rows: ParsedRow[];
  total: number;
  validUrls: number;
  missing: number;
}

const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/;

function parseRows(raw: string): ParsedResult | null {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^id\s*,/i.test(l));
  if (lines.length === 0) return null;

  const rows: ParsedRow[] = [];
  let validUrls = 0;

  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim());
    const url = cols[3] ?? "";
    if (GITHUB_RE.test(url)) validUrls++;
    rows.push({
      id: cols[0] ?? "",
      team: cols[1] ?? "",
      problem: cols[2] ?? "",
      github: url,
    });
  }

  return {
    rows,
    total: lines.length,
    validUrls,
    missing: lines.length - validUrls,
  };
}

/** Generate mock CSV rows from a Google Sheet URL (simulated). */
function mockSheetImport(): string {
  return [
    "id, teamname, problem statement, github link",
    "1, Team Alpha, Automating Repetitive Tasks, https://github.com/team-alpha/task-manager",
    "2, Team Nova, Automating Repetitive Tasks, https://github.com/team-nova/inbox-triage",
    "3, Team Vertex, Accessible Public Data, https://github.com/team-vertex/permit-explorer",
    "4, Team Halcyon, Accessible Public Data, https://github.com/team-halcyon/budget-lens",
    "5, Team Quanta, Developer Productivity, https://github.com/team-quanta/pr-context",
    "6, Team Orbit, Developer Productivity, https://github.com/team-orbit/snippet-vault",
    "7, Team Pinecone, Automating Repetitive Tasks, https://github.com/team-pinecone/standup-recap",
    "8, Team Marrow, Developer Productivity, https://github.com/team-marrow/docs-drift",
  ].join("\n");
}

function NewHackathon() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [statements, setStatements] = useState([{ title: "", description: "" }]);
  const [rows, setRows] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetImported, setSheetImported] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const parsed = useMemo(() => parseRows(rows), [rows]);
  const canSubmit = !submitting && name.trim() !== "" && (parsed?.validUrls ?? 0) > 0;

  function updateStatement(i: number, key: "title" | "description", v: string) {
    setStatements((s) => s.map((item, idx) => (idx === i ? { ...item, [key]: v } : item)));
  }

  async function handleFile(file: File) {
    setRows(await file.text());
    setSheetImported(false);
  }

  function handleSheetImport() {
    if (!sheetUrl.trim()) return;
    setRows(mockSheetImport());
    setSheetImported(true);
  }

  const previewRows = parsed?.rows.slice(0, 5) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create the hackathon in the DB
      const hackathon = await createHackathon({
        name: name.trim(),
        submissionStart: start ? new Date(start).toISOString() : new Date().toISOString(),
        submissionEnd: end ? new Date(end).toISOString() : new Date().toISOString(),
        problemStatements: statements
          .filter((s) => s.title.trim())
          .map((s) => ({ title: s.title.trim(), description: s.description.trim() })),
        csvData: rows.trim() || undefined,
      });

      // 2. Navigate to the analyzing page immediately
      void navigate({
        to: "/hackathons/$id/analyzing",
        params: { id: hackathon.id },
      });

      // 3. Kick off analysis in the background (non-blocking — the page polls progress)
      triggerAnalysis(hackathon.id).catch(() => {
        // analysis errors are surfaced on the analyzing page via the progress endpoint
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create hackathon");
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <Crumbs items={[{ label: "Hackathons", to: "/hackathons" }, { label: "New" }]} />
      <h1 className="text-xl font-semibold tracking-tight">New hackathon</h1>

      <form className="mt-6 max-w-2xl space-y-8" onSubmit={(e) => { void handleSubmit(e); }}>
        <div className="space-y-2">
          <Label htmlFor="name">Hackathon name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Autumn Build Sprint"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start">Submissions open</Label>
            <Input
              id="start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Submissions close</Label>
            <Input
              id="end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Problem statements</Label>
          {statements.map((s, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={s.title}
                  placeholder="Title"
                  onChange={(e) => updateStatement(i, "title", e.target.value)}
                />
                {statements.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setStatements((list) => list.filter((_, idx) => idx !== i))}
                    aria-label="Remove problem statement"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <Textarea
                value={s.description}
                rows={2}
                placeholder="Description"
                onChange={(e) => updateStatement(i, "description", e.target.value)}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setStatements((s) => [...s, { title: "", description: "" }])}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="size-3.5" /> Add another problem statement
          </button>
        </div>

        {/* ---------- Submissions upload ---------- */}
        <div className="space-y-3">
          <Label>Submissions</Label>

          {/* CSV file upload */}
          <label
            id="csv-dropzone"
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-card px-4 py-8 text-center transition-colors hover:border-ring/60"
          >
            <Upload className="mb-2 size-5 text-muted-foreground" />
            <span className="text-sm">Drop a CSV here or click to upload</span>
            <span className="mt-1 font-mono text-[11px] text-muted-foreground">
              id, teamname, problem statement, github link
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>

          {/* Separator */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Google Sheet URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LinkIcon className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Import from Google Sheet</span>
            </div>
            <div className="flex gap-2">
              <Input
                id="sheet-url"
                value={sheetUrl}
                onChange={(e) => {
                  setSheetUrl(e.target.value);
                  setSheetImported(false);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!sheetUrl.trim()}
                onClick={handleSheetImport}
              >
                Import
              </Button>
            </div>
            {sheetImported && (
              <p className="text-xs text-ok">✓ Sheet imported successfully</p>
            )}
          </div>

          {/* Raw paste area */}
          <Textarea
            id="rows"
            rows={5}
            value={rows}
            onChange={(e) => {
              setRows(e.target.value);
              setSheetImported(false);
            }}
            placeholder="…or paste rows here"
            className="font-mono text-xs"
          />

          {/* Preview table */}
          {parsed && previewRows.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Team Name</th>
                    <th className="px-3 py-2 font-medium">Problem Statement</th>
                    <th className="px-3 py-2 font-medium">GitHub Link</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/70 last:border-0 text-xs"
                    >
                      <td className="px-3 py-1.5 font-mono tabular-nums">{row.id}</td>
                      <td className="px-3 py-1.5">{row.team}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.problem}</td>
                      <td className="px-3 py-1.5 font-mono text-primary truncate max-w-48">
                        {row.github || <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.total > 5 && (
                <div className="border-t border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground">
                  Showing 5 of {parsed.total} rows
                </div>
              )}
            </div>
          )}

          {/* Validation summary */}
          {parsed && (
            <div className="rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs">
              <div className="text-ok">✓ {parsed.total} rows parsed</div>
              <div className="text-ok">✓ {parsed.validUrls} valid GitHub URLs</div>
              {parsed.missing > 0 && (
                <div className="text-warn">
                  ⚠ {parsed.missing} row{parsed.missing > 1 ? "s" : ""} missing a GitHub link — will
                  be skipped
                </div>
              )}
            </div>
          )}
        </div>

        {submitError && (
          <div className="rounded-md border border-border bg-bad-soft px-3 py-2 text-xs text-bad">
            {submitError}
          </div>
        )}

        <Button type="submit" size="sm" disabled={!canSubmit} id="create-hackathon-submit">
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            "Validate & continue"
          )}
        </Button>
      </form>
    </AppShell>
  );
}
