import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Upload, Loader2, FileSpreadsheet, FileUp } from "lucide-react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createHackathon, triggerAnalysis } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hackathons/new")({
  head: () => ({
    meta: [
      { title: "New Hackathon — Projectpulse" },
      {
        name: "description",
        content:
          "Set the submission window, problem statements and the team sheet to start verifying.",
      },
      { property: "og:title", content: "New Hackathon — Projectpulse" },
      {
        property: "og:description",
        content:
          "Set the submission window, problem statements and the team sheet to start verifying.",
      },
    ],
  }),
  component: NewHackathon,
});

interface ParsedResult {
  headers: string[];      // actual column headers from CSV
  rawRows: string[][];    // raw cell values, parallel to headers
  total: number;
  validUrls: number;
  missing: number;
  githubColIdx: number;   // which column index contains the github link (-1 if none)
}

const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.\-]+)\/([A-Za-z0-9_.\-]+)/i;

function cleanGithubUrl(raw: string): string {
  if (!raw) return "";
  const match = raw.trim().match(GITHUB_RE);
  if (!match) return "";
  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith(".git")) repo = repo.slice(0, -4);
  return `https://github.com/${owner}/${repo}`;
}

function parseCsvTokens(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseRows(raw: string): ParsedResult | null {
  if (!raw || !raw.trim()) return null;
  const allRows = parseCsvTokens(raw);
  if (allRows.length === 0) return null;

  // Detect if first row is a header
  const firstRowLower = allRows[0].map((c) => c.toLowerCase());
  const isHeader = firstRowLower.some((c) =>
    c.includes("team") ||
    c.includes("github") ||
    c.includes("url") ||
    c.includes("problem") ||
    c.includes("repo") ||
    c.includes("link") ||
    c.includes("statement") ||
    c.includes("name") ||
    c.includes("email") ||
    c.includes("member") ||
    c.includes("size") ||
    c === "id" ||
    c === "s.no" ||
    c === "no"
  );

  const headers = isHeader ? allRows[0] : allRows[0].map((_, i) => `Column ${i + 1}`);
  const dataRows = isHeader ? allRows.slice(1) : allRows;
  if (dataRows.length === 0) return null;

  // Normalize all rows to the same column count
  const maxCols = Math.max(headers.length, ...dataRows.map((r) => r.length));
  const normalizedRows = dataRows.map((r) => {
    const padded = [...r];
    while (padded.length < maxCols) padded.push("");
    return padded;
  });

  // Find which column has GitHub URLs — check header first, then scan data
  let githubColIdx = -1;
  firstRowLower.forEach((col, idx) => {
    if (col.includes("github") || col.includes("repo") || col.includes("link")) {
      githubColIdx = idx;
    }
  });
  if (githubColIdx === -1) {
    for (let col = 0; col < maxCols; col++) {
      if (normalizedRows.some((r) => GITHUB_RE.test(r[col] ?? ""))) {
        githubColIdx = col;
        break;
      }
    }
  }

  // Count valid github URLs for submit-button gate
  let validUrls = 0;
  let missing = 0;
  normalizedRows.forEach((cols) => {
    let url = githubColIdx !== -1 ? cols[githubColIdx] ?? "" : "";
    if (!url) {
      url = cols.find((cell) => GITHUB_RE.test(cell)) ?? "";
    }
    const clean = cleanGithubUrl(url);
    if (clean) validUrls++;
    else missing++;
  });

  return {
    headers,
    rawRows: normalizedRows,
    total: normalizedRows.length,
    validUrls,
    missing,
    githubColIdx,
  };
}

// ---- Problem-statement CSV parser ----
interface ParsedProblemStatement {
  title: string;
  description: string;
}

function parseProblemStatementsCsv(raw: string): ParsedProblemStatement[] {
  if (!raw || !raw.trim()) return [];
  const allRows = parseCsvTokens(raw);
  if (allRows.length < 2) return [];

  const headerRow = allRows[0].map((h) => h.toLowerCase().trim());

  // Find title column
  let titleIdx = headerRow.findIndex((h) =>
    h.includes("title") || h.includes("name") || h.includes("problem") || h === "ps"
  );
  if (titleIdx === -1) titleIdx = 0;

  // Find description column
  let descIdx = headerRow.findIndex((h) =>
    h.includes("desc") || h.includes("statement") || h.includes("detail") || h.includes("about")
  );
  if (descIdx === -1) descIdx = titleIdx === 0 ? 1 : 0;

  return allRows.slice(1)
    .map((row) => ({
      title: (row[titleIdx] ?? "").trim(),
      description: (row[descIdx] ?? "").trim(),
    }))
    .filter((ps) => ps.title.length > 0);
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [psFileName, setPsFileName] = useState<string | null>(null);
  const [psImportCount, setPsImportCount] = useState<number | null>(null);
  const psFileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseRows(rows), [rows]);
  const canSubmit = !submitting && name.trim() !== "" && (parsed?.validUrls ?? 0) > 0;

  function updateStatement(i: number, key: "title" | "description", v: string) {
    setStatements((s) => s.map((item, idx) => (idx === i ? { ...item, [key]: v } : item)));
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    // If hackathon name is empty, auto-populate from file name
    if (!name.trim()) {
      const suggestedName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setName(suggestedName);
    }
    const content = await file.text();
    setRows(content);
  }


  async function handlePsFile(file: File) {
    const content = await file.text();
    const parsed = parseProblemStatementsCsv(content);
    if (parsed.length === 0) return;
    // Merge: if the only entry is a blank placeholder, replace it; otherwise append
    setStatements((prev) => {
      const isOnlyBlank = prev.length === 1 && !prev[0].title && !prev[0].description;
      return isOnlyBlank ? parsed : [...prev, ...parsed];
    });
    setPsFileName(file.name);
    setPsImportCount(parsed.length);
  }

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
          <div className="flex items-center justify-between">
            <Label>Problem statements</Label>
            <div className="flex items-center gap-2">
              {psImportCount !== null && psFileName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <FileSpreadsheet className="size-3" />
                  {psImportCount} imported from {psFileName}
                </span>
              )}
              <button
                type="button"
                onClick={() => psFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-ring/60 hover:text-foreground transition-colors"
              >
                <FileUp className="size-3.5" />
                Import from CSV
              </button>
              <input
                ref={psFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handlePsFile(f);
                }}
              />
            </div>
          </div>

          {/* CSV format hint shown when no statements have been filled yet */}
          {statements.length === 1 && !statements[0].title && !statements[0].description && (
            <p className="text-[11px] font-mono text-muted-foreground">
              CSV format: <span className="text-foreground">title, description</span> (one problem statement per row)
            </p>
          )}

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
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-8 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-ring/60"
            )}
          >
            {fileName ? (
              <>
                <FileSpreadsheet className="mb-2 size-6 text-primary" />
                <span className="text-sm font-medium text-foreground">{fileName}</span>
                <span className="mt-1 text-xs text-muted-foreground">Click or drop another file to replace</span>
              </>
            ) : (
              <>
                <Upload className="mb-2 size-5 text-muted-foreground" />
                <span className="text-sm">Drop a CSV here or click to upload</span>
                <span className="mt-1 font-mono text-[11px] text-muted-foreground">
                  id, teamname, problem statement, github link
                </span>
              </>
            )}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onClick={(e) => {
                (e.target as HTMLInputElement).value = "";
              }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>

          {/* Preview table — renders actual CSV columns as-is */}
          {parsed && parsed.rawRows.length > 0 && (
            <div className="overflow-x-auto overflow-hidden rounded-md border border-border bg-card">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    {parsed.headers.map((header, colIdx) => (
                      <th
                        key={colIdx}
                        className={cn(
                          "px-3 py-2 font-medium whitespace-nowrap",
                          colIdx === parsed.githubColIdx && "text-primary"
                        )}
                      >
                        {header || `Col ${colIdx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rawRows.slice(0, 5).map((cols, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-b border-border/70 last:border-0 text-xs"
                    >
                      {cols.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          className={cn(
                            "px-3 py-1.5 max-w-48 truncate",
                            colIdx === parsed.githubColIdx
                              ? "font-mono text-primary"
                              : "text-foreground"
                          )}
                          title={cell}
                        >
                          {cell || <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
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

        <div className="space-y-2">
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

          {!canSubmit && !submitting && (
            <p className="text-xs text-muted-foreground">
              {!name.trim() && !rows
                ? "Please enter a hackathon name and upload a CSV."
                : !name.trim()
                ? "Please enter a hackathon name above."
                : !rows
                ? "Please upload a CSV file with team submissions."
                : parsed && parsed.validUrls === 0
                ? "No valid GitHub repository links found in the CSV (e.g. https://github.com/owner/repo)."
                : null}
            </p>
          )}
        </div>
      </form>
    </AppShell>
  );
}
