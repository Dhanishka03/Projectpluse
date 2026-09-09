import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Crumbs } from "@/components/verifier/shell";
import { getHackathon } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/hackathons/$id/settings")({
  head: () => ({
    meta: [
      { title: "Hackathon Settings — Projectpluse" },
      {
        name: "description",
        content:
          "Edit problem statements and re-run the analysis for this hackathon.",
      },
      { property: "og:title", content: "Hackathon Settings — Projectpluse" },
      {
        property: "og:description",
        content:
          "Edit problem statements and re-run the analysis for this hackathon.",
      },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { id } = Route.useParams();
  const hackathon = getHackathon(id);

  return (
    <AppShell>
      <Crumbs
        items={[
          { label: "Hackathons", to: "/" },
          {
            label: hackathon?.name ?? "Hackathon",
            to: "/hackathons/$id",
            params: { id },
          },
          { label: "Settings" },
        ]}
      />
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-6 max-w-2xl space-y-5">
        {hackathon?.problemStatements.map((p) => (
          <div
            key={p.id}
            className="space-y-2 rounded-md border border-border bg-card p-4"
          >
            <Label className="text-xs">Title</Label>
            <Input defaultValue={p.title} />
            <Label className="text-xs">Description</Label>
            <Textarea defaultValue={p.description} rows={2} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm">Save changes</Button>
          <Button size="sm" variant="outline">
            Re-run analysis
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
