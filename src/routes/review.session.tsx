import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/client/components/AppShell";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Alert, AlertDescription, AlertTitle } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Progress } from "@/client/components/ui/progress";
import { errorMessage } from "@/client/hooks/useAction";
import { finishReview, getDueItems, gradeReview } from "@/serverFunctions/learning";

export const Route = createFileRoute("/review/session")({
  loader: () => getDueItems(),
  component: Session,
});

function Session() {
  const items = Route.useLoaderData();
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [outcome, setOutcome] = useState<{ correct: boolean; translation: string } | null>(null);
  const [tally, setTally] = useState({ correct: 0, incorrect: 0 });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const item = items[index];
  const last = index === items.length - 1;
  const back = <BackLink to="/review">Review</BackLink>;

  async function check() {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      const result = await gradeReview({ data: { vocabItemId: item.id, answer: value } });
      setOutcome(result);
      setTally((t) =>
        result.correct ? { ...t, correct: t.correct + 1 } : { ...t, incorrect: t.incorrect + 1 },
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    if (!last) {
      setIndex(index + 1);
      setValue("");
      setOutcome(null);
      return;
    }
    setBusy(true);
    try {
      await finishReview({ data: tally });
      setDone(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Review session" backLink={back} />
        <EmptyState title="Nothing due" />
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell>
        <PageHeader title="Review session" backLink={back} />
        <Card data-testid="review-summary">
          <CardHeader>
            <CardTitle>Session complete</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-8">
            <div>
              <p className="text-3xl font-semibold text-success">{tally.correct}</p>
              <p className="text-sm text-muted-foreground">{tally.correct} correct</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-destructive">{tally.incorrect}</p>
              <p className="text-sm text-muted-foreground">{tally.incorrect} incorrect</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button render={<Link to="/review" />}>Done</Button>
          </CardFooter>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Review session" backLink={back} />
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {index + 1} of {items.length}
        </p>
        <Progress value={Math.round((index / items.length) * 100)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle data-testid="review-term" className="text-2xl">
            {item!.term}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            data-testid="review-answer"
            aria-label="Translation"
            placeholder="Translation"
            autoComplete="off"
            value={value}
            disabled={outcome !== null}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && value.trim() && !outcome) void check();
            }}
          />
          {outcome ? (
            <Alert data-testid="feedback" variant={outcome.correct ? "default" : "destructive"}>
              <AlertTitle>{outcome.correct ? "Correct" : "Incorrect"}</AlertTitle>
              <AlertDescription>Answer: {outcome.translation}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          {outcome ? (
            <Button disabled={busy} onClick={next}>
              {last ? "Finish" : "Next"}
            </Button>
          ) : (
            <Button disabled={busy || !value.trim()} onClick={check}>
              Check
            </Button>
          )}
        </CardFooter>
      </Card>
    </AppShell>
  );
}
