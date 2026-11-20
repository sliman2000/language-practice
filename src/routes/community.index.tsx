import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/client/components/AppShell";
import { PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { formatDay, plural } from "@/client/lib/format";
import { getCommunity } from "@/serverFunctions/learning";

export const Route = createFileRoute("/community/")({
  loader: () => getCommunity(),
  component: CommunityPage,
});

type Item = Awaited<ReturnType<typeof getCommunity>>["mine"][number];

function CommunityPage() {
  const { languages, toCorrect, mine, given, received } = Route.useLoaderData();
  return (
    <AppShell>
      <PageHeader title="Community" />
      <div className="grid grid-cols-2 gap-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Feedback given</CardDescription>
            <CardTitle className="text-2xl" data-testid="given-count">
              {given}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Feedback received</CardDescription>
            <CardTitle className="text-2xl" data-testid="received-count">
              {received}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Tabs defaultValue="correct">
        <TabsList>
          <TabsTrigger value="correct">To correct</TabsTrigger>
          <TabsTrigger value="mine">My submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="correct" className="space-y-3 pt-4">
          {languages.length === 0 ? (
            <EmptyState
              title="Add the languages you know"
              description="Answers in those languages will appear here for you to correct."
              action={<Button render={<Link to="/profile" />}>Edit profile</Button>}
            />
          ) : toCorrect.length === 0 ? (
            <EmptyState
              title="Nothing to correct"
              description={`New answers in ${languages.join(", ")} will appear here.`}
            />
          ) : (
            toCorrect.map((item) => <Row key={item.id} item={item} testId="to-correct-item" showAuthor />)
          )}
        </TabsContent>
        <TabsContent value="mine" className="space-y-3 pt-4">
          {mine.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              description="Send a writing or speaking answer from a lesson and it will appear here."
            />
          ) : (
            mine.map((item) => <Row key={item.id} item={item} testId="my-submission" />)
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Row({ item, testId, showAuthor }: { item: Item; testId: string; showAuthor?: boolean }) {
  return (
    <Card size="sm" data-testid={testId}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{item.language}</Badge>
          <Badge variant="secondary">{item.kind === "speaking" ? "Speaking" : "Writing"}</Badge>
          <span className="text-xs text-muted-foreground">
            {showAuthor && item.author ? `${item.author} · ` : ""}
            {formatDay(item.createdAt)} · {plural(item.corrections, "correction")}
          </span>
        </div>
        <CardTitle>
          <Link
            to="/community/$submissionId"
            params={{ submissionId: item.id }}
            className="hover:underline"
          >
            {item.prompt}
          </Link>
        </CardTitle>
        {item.text ? <CardDescription className="line-clamp-2">{item.text}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}
