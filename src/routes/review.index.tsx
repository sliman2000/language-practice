import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/client/components/AppShell";
import { PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { formatDay } from "@/client/lib/format";
import type { StrengthGroup } from "@/lib/learning";
import { getReview } from "@/serverFunctions/learning";

export const Route = createFileRoute("/review/")({
  loader: () => getReview(),
  component: ReviewPage,
});

const GROUPS: { key: StrengthGroup; title: string }[] = [
  { key: "weak", title: "Weak" },
  { key: "medium", title: "Medium" },
  { key: "strong", title: "Strong" },
];

function ReviewPage() {
  const { due, words } = Route.useLoaderData();
  const now = new Date().toISOString();
  return (
    <AppShell>
      <PageHeader
        title="Review"
        description={
          <>
            <span data-testid="due-count" className="font-semibold text-foreground">
              {due}
            </span>{" "}
            {due === 1 ? "word" : "words"} due now
          </>
        }
        actions={
          due > 0 ? (
            <Button render={<Link to="/review/session" />}>Start review</Button>
          ) : null
        }
      />
      {words.length === 0 ? (
        <EmptyState
          title="No words to review"
          description="Finish a lesson and its words will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {GROUPS.map((group) => {
            const list = words.filter((w) => w.group === group.key);
            return (
              <Card key={group.key} data-testid={`group-${group.key}`} size="sm">
                <CardHeader>
                  <CardTitle>
                    {group.title}{" "}
                    <span className="font-normal text-muted-foreground">{list.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="divide-y divide-border text-sm">
                      {list.map((word) => (
                        <li key={word.id} className="py-1.5">
                          <p className="font-medium">{word.term}</p>
                          <p className="text-muted-foreground">
                            {word.translation} ·{" "}
                            {word.dueAt <= now ? "due" : formatDay(word.dueAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
