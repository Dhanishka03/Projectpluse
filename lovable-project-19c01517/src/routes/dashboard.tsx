import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProjectPulse" },
      { name: "description", content: "Review verified hackathon submissions and their supporting code evidence." },
      { property: "og:title", content: "Dashboard — ProjectPulse" },
      { property: "og:description", content: "Review verified hackathon submissions and their supporting code evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <span className="text-sm font-semibold tracking-tight">ProjectPulse</span>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
            className="rounded-md border border-border px-3 py-1.5 text-[13px] text-foreground transition-colors hover:bg-secondary"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl animate-fade-in px-5 py-10">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {user.email}. Submission verification workspace goes here.
        </p>
      </main>
    </div>
  );
}
