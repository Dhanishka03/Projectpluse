import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { hackathons } from "@/lib/mock-data";

export const Route = createFileRoute("/hackathons/new")({
  head: () => ({
    meta: [
      { title: "New hackathon — Submission Verifier" },
      {
        name: "description",
        content:
          "Set the submission window, problem statements and the team sheet to start verifying.",
      },
      { property: "og:title", content: "New hackathon" },
      {
        property: "og:description",
        content:
          "Set the submission window, problem statements and the team sheet to start verifying.",
      },
    ],
  }),
  component: NewHackathon,
});

interface ParsedRows {
  total: number;
  validUrls: number;
  missing: number;
}

function parseRows(raw: string): ParsedRows | null {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^id\s*,/i.test(l));
  if (lines.length === 0) return null;
  let validUrls = 0;
  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim());
    const url = cols[3] ?? "";
    if (/^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/.test(url)) validUrls++;
  }
  return {
    total: lines.length,
    validUrls,
    missing: lines.length - validUrls,
  };
}

function NewHackathon() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [statements, setStatements] = useState([{ title: "", description: "" }]);
  const [rows, setRows] = useState("");

  const parsed = useMemo(() => parseRows(rows), [rows]);
  const canSubmit = name.trim() !== "" && (parsed?.validUrls ?? 0) > 0;

  function updateStatement(i: number, key: "title" | "description", v: string) {
    setStatements((s) =>
      s.map((item, idx) => (idx === i ? { ...item, [key]: v } : item)),
    );
  }

  async function handleFile(file: File) {
    setRows(await file.text());
  }

  return (
    <AppShell>
      <Crumbs items={[{ label: "Hackathons", to: "/" }, { label: "New" }]} />
      <h1 className="text-xl font-semibold tracking-tight">New hackathon</h1>

      <form
        className="mt-6 max-w-2xl space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({
            to: "/hackathons/$id/analyzing",
            params: { id: hackathons[1]?.id ?? "hk-civic-jam" },
          });
        }}
      >
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
            <div
              key={i}
              className="space-y-2 rounded-md border border-border bg-card p-3"
            >
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
                    onClick={() =>
                      setStatements((list) =>
                        list.filter((_, idx) => idx !== i),
                      )
                    }
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
                onChange={(e) =>
                  updateStatement(i, "description", e.target.value)
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setStatements((s) => [...s, { title: "", description: "" }])
            }
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="size-3.5" /> Add another problem statement
          </button>
        </div>

        <div className="space-y-3">
          <Label htmlFor="rows">Submissions</Label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-card px-4 py-8 text-center transition-colors hover:border-ring/60">
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
          <Textarea
            id="rows"
            rows={5}
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            placeholder="…or paste rows here"
            className="font-mono text-xs"
          />

          {parsed && (
            <div className="rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs">
              <div className="text-ok">✓ {parsed.total} rows parsed</div>
              <div className="text-ok">
                ✓ {parsed.validUrls} valid GitHub URLs
              </div>
              {parsed.missing > 0 && (
                <div className="text-warn">
                  ⚠ {parsed.missing} row{parsed.missing > 1 ? "s" : ""} missing a
                  GitHub link — will be skipped
                </div>
              )}
            </div>
          )}
        </div>

        <Button type="submit" size="sm" disabled={!canSubmit}>
          Validate &amp; continue
        </Button>
      </form>
    </AppShell>
  );
}
