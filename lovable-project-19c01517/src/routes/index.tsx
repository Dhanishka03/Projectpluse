import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProjectPulse — Verify hackathon submissions" },
      {
        name: "description",
        content:
          "ProjectPulse verifies hackathon submissions against real evidence in the code, not just README claims.",
      },
      { property: "og:title", content: "ProjectPulse — Verify hackathon submissions" },
      {
        property: "og:description",
        content:
          "ProjectPulse verifies hackathon submissions against real evidence in the code, not just README claims.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    title: "Evidence, not claims",
    body: "Every judgement traces back to files, commits, and functions in the repository.",
  },
  {
    title: "Verify at scale",
    body: "Run hundreds of submissions through the same checks in a single pass.",
  },
  {
    title: "Explainable results",
    body: "Each verdict shows what was found, what was missing, and where to look.",
  },
];

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <span className="text-sm font-semibold tracking-tight">ProjectPulse</span>
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl animate-fade-in px-5 pb-14 pt-20">
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[42px]">
            Verify hackathon submissions against real evidence in the code — not README claims.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
            ProjectPulse inspects each repository and reports what the project actually implements.
          </p>
          <Link
            to="/signup"
            className="mt-7 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Get started
          </Link>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto grid max-w-5xl gap-px bg-border px-0 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="bg-background px-5 py-8">
                <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{f.title}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-[12.5px] text-muted-foreground">
        <span>© {new Date().getFullYear()} ProjectPulse</span>
        <nav className="flex gap-4">
          <Link to="/login" className="hover:text-foreground">
            Log in
          </Link>
          <Link to="/signup" className="hover:text-foreground">
            Sign up
          </Link>
        </nav>
      </footer>
    </div>
  );
}
