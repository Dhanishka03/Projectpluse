import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Github,
  Menu,
  X,
  ArrowRight,
  FileCode2,
  Search,
  ShieldCheck,
  BarChart2,
  AlertTriangle,
  LayoutDashboard,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projectpulse — Verify Hackathon Claims with Evidence" },
      {
        name: "description",
        content:
          "Projectpulse helps hackathon organizers verify whether project claims are supported by real GitHub implementation evidence.",
      },
      {
        property: "og:title",
        content: "Projectpulse — Verify Hackathon Claims with Evidence",
      },
      {
        property: "og:description",
        content:
          "Projectpulse helps hackathon organizers verify whether project claims are supported by real GitHub implementation evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

/* ─── tiny helpers ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-warn">
      {children}
    </span>
  );
}

/* ─── Navbar ─── */
function Navbar() {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "For Organizers", href: "#for-organizers" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-5">
        {/* Logo */}
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
          aria-label="Projectpulse home"
        >
          PROJECTPULSE
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="size-4" />
          </a>
          <Link
            to="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Start Verifying
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          id="mobile-menu-toggle"
          className="ml-auto text-muted-foreground transition-colors hover:text-foreground md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="border-t border-border bg-background px-5 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2" aria-label="Mobile navigation">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Github className="size-4" /> GitHub
              </a>
              <Link
                to="/login"
                className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => setOpen(false)}
              >
                Start Verifying <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ─── Hero Dashboard Mockup ─── */
function HeroDashboard() {
  const claims = [
    { status: "verified", text: "RAG Pipeline", file: "src/rag/retriever.ts" },
    { status: "verified", text: "Vector Database", file: "package.json" },
    { status: "verified", text: "FastAPI Backend", file: "src/api/server.py" },
    { status: "verified", text: "OpenAI Integration", file: "src/llm/client.py" },
    { status: "partial", text: "Multi-Agent Architecture", file: "—" },
    { status: "not_found", text: "Voice Processing", file: "—" },
  ] as const;

  return (
    <div className="relative mx-auto w-full max-w-md select-none">
      {/* Floating evidence card (behind) */}
      <div
        className="absolute -right-3 -top-3 z-0 hidden w-44 rounded-lg border border-border bg-card p-3 shadow-md sm:block"
        aria-hidden="true"
      >
        <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Evidence
        </div>
        <div className="space-y-1">
          {["src/rag/retriever.ts", "package.json", "src/api/server.py"].map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <FileCode2 className="size-2.5 shrink-0 text-primary" />
              <span className="truncate font-mono text-[10px] text-primary">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main card */}
      <div className="relative z-10 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground">
              Projectpulse
            </span>
            <span className="rounded bg-ok-soft px-1.5 py-0.5 font-mono text-[9px] text-ok">
              Complete
            </span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary"
            aria-label="View repository"
          >
            github.com/team/ai-agent
            <ExternalLink className="size-2.5" />
          </a>
        </div>

        {/* Score row */}
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div className="px-4 py-4">
            <div className="font-mono text-3xl font-semibold tabular-nums text-ok">87%</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Verification Score</div>
          </div>
          <div className="px-4 py-4">
            <div className="font-mono text-3xl font-semibold tabular-nums">
              8<span className="text-lg text-muted-foreground">/10</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">Claims Verified</div>
          </div>
        </div>

        {/* Claims list */}
        <div className="px-4 py-3">
          <div className="mb-2.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Evidence Found
          </div>
          <div className="space-y-1.5">
            {claims.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "w-3 shrink-0 font-mono leading-none",
                    item.status === "verified"
                      ? "text-ok"
                      : item.status === "partial"
                        ? "text-warn"
                        : "text-muted-foreground",
                  )}
                >
                  {item.status === "verified" ? "✓" : item.status === "partial" ? "⚠" : "✕"}
                </span>
                <span className="flex-1 text-foreground">{item.text}</span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {item.file}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-4 py-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            2 issues detected · Last analyzed just now
          </span>
        </div>
      </div>

      {/* Floating reasoning chip */}
      <div
        className="absolute -bottom-3 -left-3 z-20 hidden rounded-lg border border-border bg-card p-2.5 shadow-md sm:block"
        aria-hidden="true"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-ok" />
          <span className="text-xs font-medium">Claim verified</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          src/rag/retriever.ts:42
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Very subtle background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, currentColor, currentColor 1px, transparent 1px, transparent 40px)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <div>
            <div className="mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 shadow-sm">
                <span className="size-1.5 rounded-full bg-ok" aria-hidden="true" />
                <SectionLabel>AI-powered hackathon verification</SectionLabel>
              </span>
            </div>

            <h1 className="text-4xl font-semibold uppercase tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
              PROJECT PULSE
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Projectpulse analyzes hackathon submissions, reads the README, inspects the GitHub
              repository, and connects project claims to real implementation evidence.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                id="hero-cta-primary"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Analyze a Repository
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                id="hero-cta-secondary"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Built for hackathon judges, organizers, and technical reviewers.
            </p>
          </div>

          {/* Right: dashboard mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md px-4 sm:px-0">
              <HeroDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Problem ─── */
const problemCards = [
  {
    icon: AlertTriangle,
    iconColor: "text-warn",
    title: "Claims can be overstated",
    body: "A README may describe features that aren't actually implemented in the submitted code.",
  },
  {
    icon: Search,
    iconColor: "text-muted-foreground",
    title: "Judges don't have enough time",
    body: "Manually reviewing every repository is slow, inconsistent, and hard to do at scale.",
  },
  {
    icon: FileCode2,
    iconColor: "text-bad",
    title: "AI-generated projects are harder to evaluate",
    body: "A polished demo or README can hide significant gaps between what is claimed and what actually exists in the code.",
  },
];

function ProblemSection() {
  return (
    <section className="border-b border-border bg-card py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="max-w-2xl">
          <SectionLabel>The problem</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            A polished README doesn&apos;t prove a project works.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Hackathon submissions often make impressive technical claims. But judges shouldn&apos;t
            have to spend 30 minutes digging through repositories to find out whether those claims
            are actually implemented.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {problemCards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-border bg-background p-5 transition-shadow hover:shadow-sm"
            >
              <card.icon className={cn("size-5", card.iconColor)} aria-hidden="true" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Solution ─── */
const solutionSteps = [
  "GitHub Repository",
  "README & Project Claims",
  "Repository Analysis",
  "Evidence Detection",
  "Claim Verification",
  "Reviewer-Ready Report",
];

function SolutionSection() {
  return (
    <section className="border-b border-border py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          {/* Copy */}
          <div>
            <SectionLabel>The solution</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              From project claims to implementation evidence.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Projectpulse connects what teams say they built with what their repository actually
              contains. Every claim is matched against real files, dependencies, and code paths.
            </p>

            <div className="mt-6">
              <div className="font-mono text-xs text-muted-foreground">Core principle</div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-sm">
                {["Claim", "Evidence", "Reasoning", "Result"].map((step, i, arr) => (
                  <span key={step} className="flex items-center gap-1.5">
                    <span className="rounded border border-border bg-card px-2.5 py-1 text-foreground">
                      {step}
                    </span>
                    {i < arr.length - 1 && (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow diagram */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col items-center gap-0">
              {solutionSteps.map((step, i) => (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-52 rounded-md border px-4 py-2.5 text-center text-sm font-medium transition-colors",
                      i === 0
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : i === solutionSteps.length - 1
                          ? "border-ok/40 bg-ok-soft text-ok"
                          : "border-border bg-card text-foreground",
                    )}
                  >
                    {step}
                  </div>
                  {i < solutionSteps.length - 1 && (
                    <div className="h-6 w-px bg-border" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
const features = [
  {
    num: "01",
    icon: FileCode2,
    title: "Claim Extraction",
    tagline: "Turn README descriptions into verifiable technical claims.",
    body: "Identify technical claims about frameworks, architectures, AI models, APIs, features, and implementations.",
  },
  {
    num: "02",
    icon: Search,
    title: "GitHub Repository Analysis",
    tagline: "Look beyond the README.",
    body: "Analyze source files, dependencies, configuration files, and project structure for implementation signals.",
  },
  {
    num: "03",
    icon: ShieldCheck,
    title: "Evidence-Based Verification",
    tagline: "Every verdict needs evidence.",
    body: "Connect claims to actual files, dependencies, code paths, and repository evidence — not assumptions.",
  },
  {
    num: "04",
    icon: CheckCircle2,
    title: "Claim Status",
    tagline: "Know what's real, what's partial, and what's missing.",
    body: "Clear, consistent status labels: Verified, Partially Verified, or Not Found — applied uniformly across all submissions.",
  },
  {
    num: "05",
    icon: AlertTriangle,
    title: "Issue Detection",
    tagline: "Surface unsupported or overstated claims.",
    body: 'Flag discrepancies like "Fully autonomous multi-agent system" where only a single agent implementation was found.',
  },
  {
    num: "06",
    icon: LayoutDashboard,
    title: "Reviewer Dashboard",
    tagline: "Give judges the answer without making them read the entire repository.",
    body: "Verification score, relevance score, claims verified, issues detected, evidence, repository links, and submission status — all in one view.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="border-b border-border bg-card py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="max-w-xl">
          <SectionLabel>Features</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Everything judges need in one place.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.num}
              className="group rounded-lg border border-border bg-background p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <f.icon
                  className="size-4.5 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
                <span className="font-mono text-[11px] text-muted-foreground">{f.num}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{f.tagline}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Evidence Showcase ─── */
function EvidenceSection() {
  const evidenceItems = [
    {
      icon: "📄",
      file: "package.json",
      desc: "PostgreSQL dependency detected",
    },
    {
      icon: "📄",
      file: "src/db/database.ts",
      desc: "PostgreSQL connection configured",
    },
    {
      icon: "📄",
      file: "src/models/user.ts",
      desc: "Database model implementation found",
    },
  ];

  return (
    <section className="border-b border-border py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Copy */}
          <div>
            <SectionLabel>Evidence layer</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Don&apos;t trust the score. Follow the evidence.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Projectpulse doesn&apos;t just tell reviewers that a claim is verified. It shows
              exactly why — with file paths, line numbers, and dependency matches that any reviewer
              can independently confirm.
            </p>

            {/* Mini flow */}
            <div className="mt-8 flex flex-wrap items-center gap-2">
              {["Claim", "Evidence", "Reasoning", "Result"].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                    {s}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-muted-foreground" aria-hidden="true">
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Transparent by design — every finding is traceable.
            </p>
          </div>

          {/* Evidence card */}
          <div>
            <div className="rounded-xl border border-border bg-card shadow-sm">
              {/* Claim header */}
              <div className="border-b border-border px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Claim
                </div>
                <div className="mt-1.5 text-sm font-medium text-foreground">
                  &ldquo;Uses PostgreSQL for persistent storage&rdquo;
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 border-b border-border bg-ok-soft/50 px-5 py-3">
                <span className="font-mono text-sm text-ok">✓</span>
                <span className="font-mono text-xs font-medium uppercase tracking-widest text-ok">
                  Verified
                </span>
              </div>

              {/* Evidence list */}
              <div className="px-5 py-4">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Evidence
                </div>
                <div className="space-y-3">
                  {evidenceItems.map((e) => (
                    <div key={e.file} className="flex gap-3">
                      <span className="shrink-0 text-sm" aria-hidden="true">
                        {e.icon}
                      </span>
                      <div>
                        <div className="font-mono text-xs text-primary">{e.file}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{e.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="rounded-b-xl border-t border-border px-5 py-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View Evidence <ExternalLink className="size-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Submit",
      body: "Paste a GitHub repository URL and select the hackathon problem statement.",
    },
    {
      num: "02",
      title: "Analyze",
      body: "Projectpulse reads the README and analyzes the repository for implementation evidence across source files, dependencies, and configuration.",
    },
    {
      num: "03",
      title: "Verify",
      body: "Review claims, evidence, issues, and verification results from one dashboard. Every finding links directly to the repository.",
    },
  ];

  return (
    <section id="how-it-works" className="border-b border-border bg-card py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="text-center">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Verification in three simple steps.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-lg border border-border bg-background p-6 transition-shadow hover:shadow-sm"
            >
              <div className="font-mono text-2xl font-semibold text-muted-foreground/40">
                {step.num}
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/hackathons/new"
            id="how-it-works-cta"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Verify Your First Submission
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Organizers ─── */
function OrganizersSection() {
  const cards = [
    {
      icon: BarChart2,
      title: "Save Review Time",
      body: "Quickly identify which submissions deserve deeper technical review, and which can be evaluated from the verification summary alone.",
    },
    {
      icon: ShieldCheck,
      title: "Make Evaluation Evidence-Based",
      body: "Replace subjective assumptions with repository-backed evidence. Every claim status is traceable to a real file or dependency.",
    },
    {
      icon: CheckCircle2,
      title: "Review Every Team Consistently",
      body: "Apply the same verification workflow across all submissions — regardless of how well-written the README is.",
    },
  ];

  return (
    <section id="for-organizers" className="border-b border-border py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="max-w-xl">
          <SectionLabel>For organizers</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Built for faster, fairer judging.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <card.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Comparison ─── */
function ComparisonSection() {
  const traditional = [
    "Read the README",
    "Manual code inspection",
    "Subjective judgment",
    "Slow evaluation",
    "Inconsistent review",
  ];

  const projectpulse = [
    "README + repository analysis",
    "Automated evidence discovery",
    "Evidence-backed findings",
    "Faster technical review",
    "Consistent verification",
  ];

  return (
    <section className="border-b border-border bg-card py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="text-center">
          <SectionLabel>The difference</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            A README is a story. The repository is the evidence.
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {/* Traditional */}
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="mb-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Traditional Review
            </div>
            <ul className="space-y-3" role="list">
              {traditional.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 font-mono text-xs text-muted-foreground"
                    aria-hidden="true"
                  >
                    ✕
                  </span>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Projectpulse */}
          <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-6">
            <div className="mb-5 font-mono text-[11px] uppercase tracking-widest text-primary">
              Projectpulse
            </div>
            <ul className="space-y-3" role="list">
              {projectpulse.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 font-mono text-xs text-ok" aria-hidden="true">
                    ✓
                  </span>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function FinalCTASection() {
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-[1200px] px-5 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Verify what was actually built.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Stop judging projects by their README alone. Give your hackathon review process an
          evidence layer.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            id="final-cta-primary"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Start Verifying
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/login"
            id="final-cta-secondary"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Explore Projectpulse
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="bg-card py-12">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="sm:col-span-1">
            <Link
              to="/"
              className="text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
            >
              PROJECTPULSE
            </Link>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              AI-powered hackathon submission verification. Verify claims. Find evidence. Judge with
              confidence.
            </p>
          </div>

          {/* Product links */}
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Product
            </div>
            <ul className="space-y-2" role="list">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Features", href: "#features" },
                { label: "Dashboard", to: "/hackathons" },
              ].map((link) =>
                "to" in link ? (
                  <li key={link.label}>
                    <Link
                      to={link.to as "/hackathons"}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Resources
            </div>
            <ul className="space-y-2" role="list">
              {[
                { label: "Documentation", href: "#" },
                { label: "GitHub", href: "https://github.com" },
                { label: "About", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            © 2026 Projectpulse. Built for hackathon organizers.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Landing Page ─── */
function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/hackathons" });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <EvidenceSection />
        <HowItWorksSection />
        <OrganizersSection />
        <ComparisonSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
