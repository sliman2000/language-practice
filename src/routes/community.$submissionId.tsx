import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/client/components/AppShell";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/client/components/ui/alert-dialog";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/client/components/ui/field";
import { Textarea } from "@/client/components/ui/textarea";
import { useAction } from "@/client/hooks/useAction";
import { formatDay } from "@/client/lib/format";
import {
  addCorrection,
  deleteSubmission,
  getSubmission,
  rateCorrection,
} from "@/serverFunctions/learning";

export const Route = createFileRoute("/community/$submissionId")({
  loader: ({ params }) => getSubmission({ data: { id: params.submissionId } }),
  component: SubmissionPage,
});

function SubmissionPage() {
  const data = Route.useLoaderData();
  const { run, pending } = useAction();
  const navigate = useNavigate();
  const back = <BackLink to="/community">Community</BackLink>;
  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Submission" backLink={back} />
        <EmptyState testId="not-found" title="Submission not found" />
      </AppShell>
    );
  }
  const { submission, isAuthor, corrections } = data;
  const corrected = corrections.some((c) => c.mine);

  return (
    <AppShell>
      <PageHeader
        backLink={back}
        title={submission.prompt}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{submission.language}</Badge>
            <Badge variant="secondary">
              {submission.kind === "speaking" ? "Speaking" : "Writing"}
            </Badge>
            <span>
              {isAuthor ? "You" : submission.author} · {formatDay(submission.createdAt)}
            </span>
          </div>
        }
        actions={
          isAuthor ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="ghost">Delete submission</Button>}
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Its corrections are deleted with it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={pending}
                    onClick={async () => {
                      const done = await run(async () => {
                        await deleteSubmission({ data: { id: submission.id } });
                        return true;
                      });
                      if (done) await navigate({ to: "/community" });
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null
        }
      />
      <Card>
        <CardContent>
          {submission.hasAudio ? (
            <audio controls src={`/api/recordings/${submission.id}`} className="w-full" />
          ) : (
            <p className="whitespace-pre-wrap">{submission.text}</p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Corrections</h2>
        {corrections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No corrections yet.</p>
        ) : (
          corrections.map((c) => (
            <Card key={c.id} size="sm" data-testid="correction">
              <CardHeader>
                <CardDescription>
                  {c.mine ? "You" : c.corrector} · {formatDay(c.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="whitespace-pre-wrap">{c.correctedText}</p>
                {c.comment ? (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.comment}</p>
                ) : null}
                {isAuthor ? (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Button
                        key={n}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Rate ${n}`}
                        disabled={pending}
                        onClick={() => run(() => rateCorrection({ data: { correctionId: c.id, rating: n } }))}
                      >
                        <Star
                          className={c.rating && n <= c.rating ? "fill-primary text-primary" : "text-muted-foreground"}
                        />
                      </Button>
                    ))}
                    {c.rating ? (
                      <span className="ml-2 text-sm text-muted-foreground" data-testid="rating">
                        {c.rating}/5
                      </span>
                    ) : null}
                  </div>
                ) : c.rating ? (
                  <p className="text-sm text-muted-foreground" data-testid="rating">
                    {c.rating}/5
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {!isAuthor && !corrected ? (
        <CorrectionForm
          submissionId={submission.id}
          initial={submission.text}
          speaking={submission.kind === "speaking"}
        />
      ) : null}
    </AppShell>
  );
}

function CorrectionForm({
  submissionId,
  initial,
  speaking,
}: {
  submissionId: string;
  initial: string;
  speaking: boolean;
}) {
  const { run, pending } = useAction();
  const [text, setText] = useState(initial);
  const [comment, setComment] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your correction</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              addCorrection({ data: { submissionId, correctedText: text, comment } }),
            );
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="correction-text">
                {speaking ? "What they said, corrected" : "Corrected version"}
              </FieldLabel>
              <Textarea
                id="correction-text"
                data-testid="correction-text"
                rows={4}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="correction-comment">Comment</FieldLabel>
              <Textarea
                id="correction-comment"
                data-testid="correction-comment"
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </Field>
            <div>
              <Button type="submit" disabled={pending || !text.trim()}>
                Send correction
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
