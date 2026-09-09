import type { Hackathon, Submission } from "./types";

export const problemStatements = [
  {
    id: "ps-1",
    title: "Automating Repetitive Tasks",
    description:
      "Tools that remove manual busywork from knowledge workers' daily routines.",
  },
  {
    id: "ps-2",
    title: "Accessible Public Data",
    description:
      "Making open government or civic datasets usable by non-technical people.",
  },
  {
    id: "ps-3",
    title: "Developer Productivity",
    description: "Reducing friction in the everyday software development loop.",
  },
];

export const hackathons: Hackathon[] = [
  {
    id: "hk-autumn-2026",
    name: "Autumn Build Sprint 2026",
    submissionStart: "2026-08-28T09:00:00Z",
    submissionEnd: "2026-08-30T18:00:00Z",
    problemStatements,
    status: "complete",
    stats: { totalSubmissions: 8, analyzed: 7, needsReview: 3, failed: 1 },
  },
  {
    id: "hk-civic-jam",
    name: "Civic Data Jam",
    submissionStart: "2026-09-04T09:00:00Z",
    submissionEnd: "2026-09-06T18:00:00Z",
    problemStatements: problemStatements.slice(1),
    status: "analyzing",
    stats: { totalSubmissions: 24, analyzed: 9, needsReview: 2, failed: 0 },
  },
  {
    id: "hk-winter-draft",
    name: "Winter Internal Hack",
    submissionStart: "2026-12-11T09:00:00Z",
    submissionEnd: "2026-12-13T18:00:00Z",
    problemStatements: problemStatements.slice(2),
    status: "draft",
    stats: { totalSubmissions: 0, analyzed: 0, needsReview: 0, failed: 0 },
  },
];

export const submissions: Submission[] = [
  {
    id: "sub-1",
    teamName: "Team Alpha",
    projectName: "AI Task Manager",
    githubUrl: "https://github.com/team-alpha/task-manager",
    problemStatementId: "ps-1",
    relevanceScore: 94,
    claimsVerifiedCount: 3,
    claimsTotalCount: 5,
    issuesCount: 2,
    status: "review",
    claims: [
      {
        id: "c-1-1",
        text: "Gmail integration",
        status: "verified",
        finding:
          "A Gmail API client is wired up and used to read message threads.",
        evidence: [
          {
            file: "integrations/gmail_client.py",
            line: 18,
            type: "code",
            description: "Gmail API client initialisation",
            found: true,
          },
          {
            file: "requirements.txt",
            line: 8,
            type: "dependency",
            description: "google-api-python-client dependency",
            found: true,
          },
        ],
      },
      {
        id: "c-1-2",
        text: "Task extraction",
        status: "verified",
        finding:
          "An LLM prompt pipeline extracts action items from message bodies.",
        evidence: [
          {
            file: "core/extract.py",
            line: 61,
            type: "code",
            description: "Action-item extraction prompt and parser",
            found: true,
          },
        ],
      },
      {
        id: "c-1-3",
        text: "Calendar integration",
        status: "verified",
        finding: "Calendar events are read through the Google Calendar API.",
        evidence: [
          {
            file: "tools/calendar.py",
            line: 42,
            type: "code",
            description: "Calendar API client usage",
            found: true,
          },
        ],
      },
      {
        id: "c-1-4",
        text: "Automatic scheduling",
        status: "partially_verified",
        finding:
          "The repository supports calendar access, but sufficient evidence for automatic meeting scheduling was not found.",
        evidence: [
          {
            file: "tools/calendar.py",
            line: 42,
            type: "code",
            description: "Calendar API client usage",
            found: true,
          },
          {
            file: "requirements.txt",
            line: 8,
            type: "dependency",
            description: "Google API dependency",
            found: true,
          },
          {
            file: "tools/calendar.py",
            type: "code",
            description: "No event-creation / scheduling logic detected",
            found: false,
          },
        ],
      },
      {
        id: "c-1-5",
        text: "Voice interaction",
        status: "not_found",
        finding:
          "No speech-to-text, audio capture, or voice command handling was found anywhere in the repository.",
        evidence: [
          {
            file: "src/",
            type: "code",
            description: "No audio or speech processing module present",
            found: false,
          },
          {
            file: "requirements.txt",
            type: "dependency",
            description: "No speech recognition dependency declared",
            found: false,
          },
        ],
      },
    ],
    issues: [
      {
        id: "i-1-1",
        claimId: "c-1-4",
        type: "overstated",
        title: 'CLAIM OVERSTATED — "Automatic scheduling"',
        description:
          "Calendar integration exists, but event creation/scheduling logic was not found.",
      },
      {
        id: "i-1-2",
        claimId: "c-1-5",
        type: "not_verified",
        title: 'CLAIM NOT VERIFIED — "Voice interaction"',
        description: "No relevant voice-processing implementation was found.",
      },
    ],
  },
  {
    id: "sub-2",
    teamName: "Team Nova",
    projectName: "Inbox Triage Bot",
    githubUrl: "https://github.com/team-nova/inbox-triage",
    problemStatementId: "ps-1",
    relevanceScore: 88,
    claimsVerifiedCount: 6,
    claimsTotalCount: 6,
    issuesCount: 0,
    status: "verified",
    claims: [
      {
        id: "c-2-1",
        text: "Rule-based email classification",
        status: "verified",
        finding: "A rules engine classifies incoming mail into four buckets.",
        evidence: [
          {
            file: "triage/rules.ts",
            line: 24,
            type: "code",
            description: "Rule evaluation engine",
            found: true,
          },
        ],
      },
      {
        id: "c-2-2",
        text: "Slack digest delivery",
        status: "verified",
        finding: "A scheduled job posts digests to a Slack webhook.",
        evidence: [
          {
            file: "jobs/digest.ts",
            line: 71,
            type: "code",
            description: "Slack webhook POST",
            found: true,
          },
        ],
      },
      {
        id: "c-2-3",
        text: "Snooze and follow-up reminders",
        status: "verified",
        finding: "Snoozed threads are re-queued with a delay worker.",
        evidence: [
          {
            file: "jobs/snooze.ts",
            line: 33,
            type: "code",
            description: "Delayed re-queue implementation",
            found: true,
          },
        ],
      },
      {
        id: "c-2-4",
        text: "OAuth sign-in",
        status: "verified",
        finding: "Google OAuth flow is implemented end to end.",
        evidence: [
          {
            file: "auth/oauth.ts",
            line: 12,
            type: "code",
            description: "OAuth authorisation code exchange",
            found: true,
          },
        ],
      },
      {
        id: "c-2-5",
        text: "Per-user settings storage",
        status: "verified",
        finding: "Settings persist in a Postgres table per user.",
        evidence: [
          {
            file: "db/schema.sql",
            line: 40,
            type: "code",
            description: "user_settings table definition",
            found: true,
          },
        ],
      },
      {
        id: "c-2-6",
        text: "Test coverage for the rules engine",
        status: "verified",
        finding: "A test suite covers the rule matcher.",
        evidence: [
          {
            file: "triage/rules.test.ts",
            line: 1,
            type: "code",
            description: "Unit tests for rule evaluation",
            found: true,
          },
        ],
      },
    ],
    issues: [],
  },
  {
    id: "sub-3",
    teamName: "Team Vertex",
    projectName: "Permit Explorer",
    githubUrl: "https://github.com/team-vertex/permit-explorer",
    problemStatementId: "ps-2",
    relevanceScore: 81,
    claimsVerifiedCount: 4,
    claimsTotalCount: 5,
    issuesCount: 1,
    status: "review",
    claims: [
      {
        id: "c-3-1",
        text: "City permit dataset ingestion",
        status: "verified",
        finding: "A loader pulls the open permit CSV feed nightly.",
        evidence: [
          {
            file: "ingest/permits.py",
            line: 15,
            type: "code",
            description: "CSV feed download and parse",
            found: true,
          },
        ],
      },
      {
        id: "c-3-2",
        text: "Map view of permits",
        status: "verified",
        finding: "Permits render as markers on a Leaflet map.",
        evidence: [
          {
            file: "web/Map.tsx",
            line: 55,
            type: "code",
            description: "Leaflet marker layer",
            found: true,
          },
        ],
      },
      {
        id: "c-3-3",
        text: "Plain-language permit summaries",
        status: "verified",
        finding: "Permit records are summarised through an LLM call.",
        evidence: [
          {
            file: "web/summarize.ts",
            line: 22,
            type: "code",
            description: "Summarisation request",
            found: true,
          },
        ],
      },
      {
        id: "c-3-4",
        text: "Full-text search",
        status: "verified",
        finding: "Search runs against a Postgres tsvector index.",
        evidence: [
          {
            file: "db/search.sql",
            line: 9,
            type: "code",
            description: "tsvector index and query",
            found: true,
          },
        ],
      },
      {
        id: "c-3-5",
        text: "Email alerts for new permits nearby",
        status: "partially_verified",
        finding:
          "A subscription table exists, but no code sends the alert emails.",
        evidence: [
          {
            file: "db/schema.sql",
            line: 88,
            type: "code",
            description: "alert_subscriptions table",
            found: true,
          },
          {
            file: "jobs/",
            type: "code",
            description: "No email dispatch job found",
            found: false,
          },
        ],
      },
    ],
    issues: [
      {
        id: "i-3-1",
        claimId: "c-3-5",
        type: "overstated",
        title: 'CLAIM OVERSTATED — "Email alerts for new permits nearby"',
        description:
          "Subscriptions can be stored, but no delivery mechanism was found.",
      },
    ],
  },
  {
    id: "sub-4",
    teamName: "Team Halcyon",
    projectName: "Budget Lens",
    githubUrl: "https://github.com/team-halcyon/budget-lens",
    problemStatementId: "ps-2",
    relevanceScore: 76,
    claimsVerifiedCount: 3,
    claimsTotalCount: 4,
    issuesCount: 1,
    status: "review",
    claims: [
      {
        id: "c-4-1",
        text: "Municipal budget parser",
        status: "verified",
        finding: "PDF budget tables are parsed into structured rows.",
        evidence: [
          {
            file: "parse/budget_pdf.py",
            line: 30,
            type: "code",
            description: "Table extraction routine",
            found: true,
          },
        ],
      },
      {
        id: "c-4-2",
        text: "Year-over-year comparison view",
        status: "verified",
        finding: "A comparison chart renders two fiscal years side by side.",
        evidence: [
          {
            file: "web/Compare.tsx",
            line: 44,
            type: "code",
            description: "Comparison chart component",
            found: true,
          },
        ],
      },
      {
        id: "c-4-3",
        text: "CSV export",
        status: "verified",
        finding: "Filtered results can be exported as CSV.",
        evidence: [
          {
            file: "web/export.ts",
            line: 7,
            type: "code",
            description: "CSV serialisation",
            found: true,
          },
        ],
      },
      {
        id: "c-4-4",
        text: "Anomaly detection on spending",
        status: "not_found",
        finding:
          "No statistical or model-based anomaly detection code was found.",
        evidence: [
          {
            file: "analysis/",
            type: "code",
            description: "No anomaly detection module present",
            found: false,
          },
        ],
      },
    ],
    issues: [
      {
        id: "i-4-1",
        claimId: "c-4-4",
        type: "not_verified",
        title: 'CLAIM NOT VERIFIED — "Anomaly detection on spending"',
        description: "No anomaly detection implementation was found.",
      },
    ],
  },
  {
    id: "sub-5",
    teamName: "Team Quanta",
    projectName: "PR Context",
    githubUrl: "https://github.com/team-quanta/pr-context",
    problemStatementId: "ps-3",
    relevanceScore: 91,
    claimsVerifiedCount: 5,
    claimsTotalCount: 5,
    issuesCount: 0,
    status: "verified",
    claims: [
      {
        id: "c-5-1",
        text: "GitHub App webhook handler",
        status: "verified",
        finding: "Signed webhook payloads are verified and dispatched.",
        evidence: [
          {
            file: "server/webhook.ts",
            line: 19,
            type: "code",
            description: "HMAC signature verification",
            found: true,
          },
        ],
      },
      {
        id: "c-5-2",
        text: "Diff summarisation",
        status: "verified",
        finding: "Diffs are chunked and summarised per file.",
        evidence: [
          {
            file: "core/summarize_diff.ts",
            line: 48,
            type: "code",
            description: "Per-file diff summarisation",
            found: true,
          },
        ],
      },
      {
        id: "c-5-3",
        text: "Inline PR comments",
        status: "verified",
        finding: "Review comments are posted through the GitHub REST API.",
        evidence: [
          {
            file: "core/comment.ts",
            line: 26,
            type: "code",
            description: "Review comment creation",
            found: true,
          },
        ],
      },
      {
        id: "c-5-4",
        text: "Rate-limit backoff",
        status: "verified",
        finding: "Requests retry with exponential backoff on 429 responses.",
        evidence: [
          {
            file: "lib/http.ts",
            line: 63,
            type: "code",
            description: "Exponential backoff retry",
            found: true,
          },
        ],
      },
      {
        id: "c-5-5",
        text: "Configurable per-repo rules",
        status: "verified",
        finding: "A checked-in YAML config controls behaviour per repository.",
        evidence: [
          {
            file: "config/loader.ts",
            line: 11,
            type: "code",
            description: "YAML config loading",
            found: true,
          },
        ],
      },
    ],
    issues: [],
  },
  {
    id: "sub-6",
    teamName: "Team Orbit",
    projectName: "Snippet Vault",
    githubUrl: "https://github.com/team-orbit/snippet-vault",
    problemStatementId: "ps-3",
    relevanceScore: 64,
    claimsVerifiedCount: 2,
    claimsTotalCount: 4,
    issuesCount: 2,
    status: "review",
    claims: [
      {
        id: "c-6-1",
        text: "Snippet storage and tagging",
        status: "verified",
        finding: "Snippets and tags persist in SQLite.",
        evidence: [
          {
            file: "db/schema.sql",
            line: 3,
            type: "code",
            description: "snippets and tags tables",
            found: true,
          },
        ],
      },
      {
        id: "c-6-2",
        text: "CLI search",
        status: "verified",
        finding: "A CLI command performs substring search over snippets.",
        evidence: [
          {
            file: "cli/search.ts",
            line: 14,
            type: "code",
            description: "Search command implementation",
            found: true,
          },
        ],
      },
      {
        id: "c-6-3",
        text: "Semantic search with embeddings",
        status: "partially_verified",
        finding:
          "An embedding client exists, but no vector index or similarity query was found.",
        evidence: [
          {
            file: "lib/embed.ts",
            line: 9,
            type: "code",
            description: "Embedding request helper",
            found: true,
          },
          {
            file: "db/",
            type: "code",
            description: "No vector column or similarity query found",
            found: false,
          },
        ],
      },
      {
        id: "c-6-4",
        text: "VS Code extension",
        status: "not_found",
        finding:
          "The repository contains no extension manifest or editor integration.",
        evidence: [
          {
            file: "package.json",
            type: "dependency",
            description: "No VS Code extension manifest fields present",
            found: false,
          },
        ],
      },
    ],
    issues: [
      {
        id: "i-6-1",
        claimId: "c-6-3",
        type: "overstated",
        title: 'CLAIM OVERSTATED — "Semantic search with embeddings"',
        description:
          "Embeddings can be generated, but nothing stores or queries them.",
      },
      {
        id: "i-6-2",
        claimId: "c-6-4",
        type: "not_verified",
        title: 'CLAIM NOT VERIFIED — "VS Code extension"',
        description: "No editor extension code was found in the repository.",
      },
    ],
  },
  {
    id: "sub-7",
    teamName: "Team Pinecone",
    projectName: "Standup Recap",
    githubUrl: "https://github.com/team-pinecone/standup-recap",
    problemStatementId: "ps-1",
    relevanceScore: 47,
    claimsVerifiedCount: 1,
    claimsTotalCount: 3,
    issuesCount: 2,
    status: "review",
    claims: [
      {
        id: "c-7-1",
        text: "Meeting transcript upload",
        status: "verified",
        finding: "Transcripts can be uploaded and stored.",
        evidence: [
          {
            file: "app/upload.py",
            line: 21,
            type: "code",
            description: "File upload endpoint",
            found: true,
          },
        ],
      },
      {
        id: "c-7-2",
        text: "Automatic action-item assignment",
        status: "not_found",
        finding: "No assignment or owner-resolution logic was found.",
        evidence: [
          {
            file: "app/",
            type: "code",
            description: "No assignment logic present",
            found: false,
          },
        ],
      },
      {
        id: "c-7-3",
        text: "Jira sync",
        status: "not_found",
        finding: "No Jira client, credentials handling, or API usage found.",
        evidence: [
          {
            file: "requirements.txt",
            type: "dependency",
            description: "No Jira client dependency declared",
            found: false,
          },
        ],
      },
    ],
    issues: [
      {
        id: "i-7-1",
        claimId: "c-7-2",
        type: "not_verified",
        title: 'CLAIM NOT VERIFIED — "Automatic action-item assignment"',
        description: "No implementation of assignment logic was found.",
      },
      {
        id: "i-7-2",
        claimId: "c-7-3",
        type: "not_verified",
        title: 'CLAIM NOT VERIFIED — "Jira sync"',
        description: "No Jira integration code or dependency was found.",
      },
    ],
  },
  {
    id: "sub-8",
    teamName: "Team Marrow",
    projectName: "Docs Drift",
    githubUrl: "https://github.com/team-marrow/docs-drift",
    problemStatementId: "ps-3",
    relevanceScore: 0,
    claimsVerifiedCount: 0,
    claimsTotalCount: 0,
    issuesCount: 0,
    status: "failed",
    failureReason:
      "Repository is private or unavailable — the analyzer received a 404 from GitHub.",
    claims: [],
    issues: [],
  },
];

export function getHackathon(id: string) {
  return hackathons.find((h) => h.id === id);
}

export function getSubmissions(hackathonId: string) {
  return hackathonId === "hk-winter-draft" ? [] : submissions;
}

export function getSubmission(id: string) {
  return submissions.find((s) => s.id === id);
}

export function problemStatementTitle(id: string) {
  return problemStatements.find((p) => p.id === id)?.title ?? "—";
}
