/**
 * api.ts — typed API client for the FastAPI backend.
 *
 * All fetch calls go through this module. The base URL is read from the
 * VITE_API_URL environment variable (defaults to http://localhost:8000).
 *
 * Response shapes match the TypeScript interfaces in types.ts exactly because
 * the backend serialises in camelCase via alias_generator=to_camel.
 */

import type { Hackathon, Submission } from "./types";

const BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Hackathons
// ---------------------------------------------------------------------------

export function listHackathons(): Promise<Hackathon[]> {
  return request<Hackathon[]>("/hackathons");
}

export function getHackathon(id: string): Promise<Hackathon> {
  return request<Hackathon>(`/hackathons/${id}`);
}

export interface CreateHackathonPayload {
  name: string;
  submissionStart: string;
  submissionEnd: string;
  problemStatements: { title: string; description: string }[];
  csvData?: string | undefined;
}

export function createHackathon(payload: CreateHackathonPayload): Promise<Hackathon> {
  return request<Hackathon>("/hackathons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// CSV validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  rowsParsed: number;
  validUrls: number;
  skipped: { row: number; reason: string }[];
}

export function validateCsv(csvData: string): Promise<ValidationResult> {
  return request<ValidationResult>("/hackathons/validate", {
    method: "POST",
    body: JSON.stringify({ csv_data: csvData }),
  });
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export function triggerAnalysis(hackathonId: string): Promise<Hackathon> {
  return request<Hackathon>(`/hackathons/${hackathonId}/analyze`, { method: "POST" });
}

export interface AnalysisProgress {
  total: number;
  completed: number;
  current: { teamName: string; status: "done" | "analyzing" | "queued" }[];
}

export function getProgress(hackathonId: string): Promise<AnalysisProgress> {
  return request<AnalysisProgress>(`/hackathons/${hackathonId}/progress`);
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export function listSubmissions(hackathonId: string): Promise<Submission[]> {
  return request<Submission[]>(`/hackathons/${hackathonId}/submissions`);
}

export function getSubmission(hackathonId: string, submissionId: string): Promise<Submission> {
  return request<Submission>(`/hackathons/${hackathonId}/submissions/${submissionId}`);
}
