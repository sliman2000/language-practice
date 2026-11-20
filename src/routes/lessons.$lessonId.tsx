import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { AppShell } from "@/client/components/AppShell";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Alert, AlertDescription, AlertTitle } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Progress } from "@/client/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/client/components/ui/radio-group";
import { Textarea } from "@/client/components/ui/textarea";
import { errorMessage } from "@/client/hooks/useAction";
import { EXERCISE_LABELS, type ExerciseType } from "@/lib/learning";
import { checkAnswer, finishLesson, getLesson, submitWriting } from "@/serverFunctions/learning";

export const Route = createFileRoute("/lessons/$lessonId")({
  loader: ({ params }) => getLesson({ data: { id: params.lessonId } }),
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.lesson.title }] : [],
  }),
  component: LessonPage,
});

type Feedback =
  | { kind: "graded"; correct: boolean; answer: string }
  | { kind: "sent" }
  | null;

function LessonPage() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <AppShell>
        <PageHeader title="Lesson" backLink={<BackLink to="/courses">Courses</BackLink>} />
        <EmptyState testId="not-found" title="Lesson not found" />
      </AppShell>
    );
  }
  return <Player key={data.lesson.id} data={data} />;
}

type LessonData = NonNullable<Awaited<ReturnType<typeof getLesson>>>;

function Player({ data }: { data: LessonData }) {
  const { lesson, course, exercises, vocab, nextLessonId } = data;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: number; graded: number } | null>(null);

  const exercise = exercises[step];
  const last = step === exercises.length - 1;

  function restart() {
    setStep(0);
    setAnswers({});
    setValue("");
    setFeedback(null);
    setResult(null);
    setError(null);
  }

  async function attempt(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const finish = (all: Record<string, string>) =>
    attempt(async () => {
      setResult(await finishLesson({ data: { lessonId: lesson.id, answers: all } }));
    });

  function advance() {
    if (last) return finish(answers);
    setStep(step + 1);
    setValue("");
    setFeedback(null);
  }

  const check = () =>
    attempt(async () => {
      if (!exercise) return;
      const outcome = await checkAnswer({ data: { exerciseId: exercise.id, answer: value } });
      setAnswers((prev) => ({ ...prev, [exercise.id]: value }));
      setFeedback({ kind: "graded", ...outcome });
    });

  const sendWriting = () =>
    attempt(async () => {
      if (!exercise) return;
      await submitWriting({ data: { exerciseId: exercise.id, text: value } });
      setFeedback({ kind: "sent" });
    });

  const header = (
    <PageHeader
      backLink={
        <BackLink to="/courses/$courseId" params={{ courseId: course.id }}>
          {course.title}
        </BackLink>
      }
      title={lesson.title}
      description={lesson.unit}
    />
  );

  if (result) {
    return (
      <AppShell>
        {header}
        <Card data-testid="lesson-result">
          <CardHeader>
            <CardTitle>Lesson complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.graded > 0 ? (
              <p className="text-2xl font-semibold">
                {result.correct} of {result.graded} correct
              </p>
            ) : null}
            {vocab.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Added to your review list:</p>
                <ul className="flex flex-wrap gap-2">
                  {vocab.map((word) => (
                    <li key={word.term}>
                      <Badge variant="outline">
                        {word.term} · {word.translation}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={restart}>
              Retake
            </Button>
            {nextLessonId ? (
              <Button render={<Link to="/lessons/$lessonId" params={{ lessonId: nextLessonId }} />}>
                Next lesson
              </Button>
            ) : (
              <Button render={<Link to="/courses/$courseId" params={{ courseId: course.id }} />}>
                Back to course
              </Button>
            )}
          </CardFooter>
        </Card>
      </AppShell>
    );
  }

  if (!exercise) {
    return (
      <AppShell>
        {header}
        {vocab.length > 0 ? <VocabList vocab={vocab} /> : null}
        <Button disabled={busy} onClick={() => finish({})}>
          Mark as complete
        </Button>
      </AppShell>
    );
  }

  const type = exercise.type as ExerciseType;
  const graded = type === "mc" || type === "type" || type === "gap";

  return (
    <AppShell>
      {header}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span data-testid="step">
            {step + 1} of {exercises.length}
          </span>
          <span>{EXERCISE_LABELS[type]}</span>
        </div>
        <Progress value={Math.round((step / exercises.length) * 100)} />
      </div>
      {step === 0 && vocab.length > 0 ? <VocabList vocab={vocab} /> : null}
      <Card>
        <CardHeader>
          <CardTitle data-testid="exercise-prompt" className="text-lg">
            {exercise.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {type === "mc" ? (
            <RadioGroup
              value={value}
              onValueChange={(next) => setValue(String(next))}
              disabled={feedback !== null}
              className="gap-2"
            >
              {exercise.options.map((option) => (
                <Label
                  key={option}
                  data-testid="choice"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 font-normal has-data-checked:border-primary"
                >
                  <RadioGroupItem value={option} />
                  {option}
                </Label>
              ))}
            </RadioGroup>
          ) : null}
          {type === "type" || type === "gap" ? (
            <Input
              data-testid="answer-input"
              aria-label="Your answer"
              value={value}
              autoComplete="off"
              disabled={feedback !== null}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && value.trim() && !feedback) void check();
              }}
            />
          ) : null}
          {type === "writing" ? (
            <Textarea
              data-testid="submission-text"
              aria-label="Your answer"
              rows={5}
              value={value}
              disabled={feedback !== null}
              onChange={(event) => setValue(event.target.value)}
            />
          ) : null}
          {type === "speaking" && feedback === null ? (
            <Recorder
              exerciseId={exercise.id}
              onSent={() => setFeedback({ kind: "sent" })}
              onError={setError}
            />
          ) : null}
          {feedback?.kind === "graded" ? (
            <Alert
              data-testid="feedback"
              variant={feedback.correct ? "default" : "destructive"}
            >
              <AlertTitle>{feedback.correct ? "Correct" : "Incorrect"}</AlertTitle>
              <AlertDescription>Answer: {feedback.answer}</AlertDescription>
            </Alert>
          ) : null}
          {feedback?.kind === "sent" ? (
            <Alert data-testid="feedback">
              <AlertTitle>Sent for feedback</AlertTitle>
              <AlertDescription>
                Corrections will appear under{" "}
                <Link to="/community" className="underline">
                  Community
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2">
          {feedback !== null ? (
            <Button disabled={busy} onClick={advance}>
              {last ? "Finish" : "Next"}
            </Button>
          ) : graded ? (
            <Button disabled={busy || !value.trim()} onClick={check}>
              Check
            </Button>
          ) : (
            <>
              <Button variant="ghost" disabled={busy} onClick={advance}>
                Skip
              </Button>
              {type === "writing" ? (
                <Button disabled={busy || !value.trim()} onClick={sendWriting}>
                  Send for feedback
                </Button>
              ) : null}
            </>
          )}
        </CardFooter>
      </Card>
    </AppShell>
  );
}

function VocabList({ vocab }: { vocab: LessonData["vocab"] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Words in this lesson</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border text-sm">
          {vocab.map((word) => (
            <li key={word.term} className="flex flex-wrap gap-x-3 py-1.5">
              <span className="font-medium">{word.term}</span>
              <span className="text-muted-foreground">{word.translation}</span>
              {word.example ? <span className="w-full italic">{word.example}</span> : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Records a clip in the browser and posts it to the recordings route. */
function Recorder({
  exerciseId,
  onSent,
  onError,
}: {
  exerciseId: string;
  onSent: () => void;
  onError: (message: string | null) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  async function start() {
    onError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const next = new MediaRecorder(stream);
      next.ondataavailable = (event) => chunks.push(event.data);
      next.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: next.mimeType || "audio/webm" });
        setClip(blob);
        setUrl(URL.createObjectURL(blob));
      };
      next.start();
      recorder.current = next;
      setRecording(true);
    } catch {
      onError("The browser couldn't use a microphone.");
    }
  }

  function stop() {
    recorder.current?.stop();
    setRecording(false);
  }

  async function send() {
    if (!clip) return;
    setSending(true);
    onError(null);
    try {
      const response = await fetch(
        `/api/recordings?exerciseId=${encodeURIComponent(exerciseId)}`,
        { method: "POST", headers: { "content-type": clip.type }, body: clip },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Upload failed");
      }
      onSent();
    } catch (cause) {
      onError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {recording ? (
        <Button variant="destructive" onClick={stop}>
          <Square /> Stop
        </Button>
      ) : (
        <Button variant="outline" onClick={start}>
          <Mic /> {clip ? "Record again" : "Record"}
        </Button>
      )}
      {url ? <audio controls src={url} className="max-w-full" /> : null}
      {clip && !recording ? (
        <Button disabled={sending} onClick={send}>
          Send for feedback
        </Button>
      ) : null}
    </div>
  );
}
