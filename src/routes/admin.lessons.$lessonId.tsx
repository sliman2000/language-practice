import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NotAdmin } from "@/client/components/AdminOnly";
import { AppShell } from "@/client/components/AppShell";
import { OrderButtons } from "@/client/components/OrderButtons";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/client/components/ui/radio-group";
import { Textarea } from "@/client/components/ui/textarea";
import { useAction } from "@/client/hooks/useAction";
import { EXERCISE_LABELS, EXERCISE_TYPES, isGraded, type ExerciseType } from "@/lib/learning";
import {
  addExercise,
  addVocab,
  deleteExercise,
  deleteVocab,
  getLessonForEdit,
  moveExercise,
  moveVocab,
} from "@/serverFunctions/courses";

export const Route = createFileRoute("/admin/lessons/$lessonId")({
  loader: ({ params }) => getLessonForEdit({ data: { id: params.lessonId } }),
  component: LessonEditorPage,
});

function LessonEditorPage() {
  const result = Route.useLoaderData();
  if (result.forbidden) return <NotAdmin />;
  if (!result.data) {
    return (
      <AppShell>
        <PageHeader title="Lesson" backLink={<BackLink to="/admin">Admin</BackLink>} />
        <EmptyState testId="not-found" title="Lesson not found" />
      </AppShell>
    );
  }
  return <LessonEditor key={result.data.lesson.id} data={result.data} />;
}

type EditData = NonNullable<
  Extract<Awaited<ReturnType<typeof getLessonForEdit>>, { forbidden: false }>["data"]
>;

function LessonEditor({ data }: { data: EditData }) {
  const { lesson, course, exercises, vocab } = data;
  const { run, pending } = useAction();
  return (
    <AppShell>
      <PageHeader
        backLink={
          <BackLink to="/admin/courses/$courseId" params={{ courseId: course.id }}>
            {course.title}
          </BackLink>
        }
        title={lesson.title}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Exercises</h2>
        {exercises.length > 0 ? (
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {exercises.map((exercise, i) => (
              <li key={exercise.id} data-testid="exercise-row" className="flex items-start justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0 space-y-1">
                  <Badge variant="secondary">{EXERCISE_LABELS[exercise.type as ExerciseType]}</Badge>
                  <p>{exercise.prompt}</p>
                  {exercise.options.length > 0 ? (
                    <p className="text-sm text-muted-foreground">{exercise.options.join(" · ")}</p>
                  ) : null}
                  {exercise.answer ? (
                    <p className="text-sm text-muted-foreground">Answer: {exercise.answer}</p>
                  ) : null}
                </div>
                <OrderButtons
                  label={`exercise ${i + 1}`}
                  first={i === 0}
                  last={i === exercises.length - 1}
                  disabled={pending}
                  onMove={(direction) => run(() => moveExercise({ data: { id: exercise.id, direction } }))}
                  onDelete={() => run(() => deleteExercise({ data: { id: exercise.id } }))}
                />
              </li>
            ))}
          </ol>
        ) : null}
        <ExerciseForm lessonId={lesson.id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Vocabulary</h2>
        {vocab.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {vocab.map((word, i) => (
              <li key={word.id} data-testid="vocab-row" className="flex items-start justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p>
                    <span className="font-medium">{word.term}</span>{" "}
                    <span className="text-muted-foreground">{word.translation}</span>
                  </p>
                  {word.example ? <p className="text-sm italic">{word.example}</p> : null}
                </div>
                <OrderButtons
                  label={word.term}
                  first={i === 0}
                  last={i === vocab.length - 1}
                  disabled={pending}
                  onMove={(direction) => run(() => moveVocab({ data: { id: word.id, direction } }))}
                  onDelete={() => run(() => deleteVocab({ data: { id: word.id } }))}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <VocabForm lessonId={lesson.id} />
      </section>
    </AppShell>
  );
}

function ExerciseForm({ lessonId }: { lessonId: string }) {
  const { run, pending } = useAction();
  const [type, setType] = useState<ExerciseType>("mc");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState("");
  const [answer, setAnswer] = useState("");
  const graded = isGraded(type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New exercise</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const added = await run(async () => {
              await addExercise({
                data: {
                  lessonId,
                  type,
                  prompt,
                  options: type === "mc" ? options.split("\n").map((o) => o.trim()).filter(Boolean) : [],
                  answer: graded ? answer : "",
                },
              });
              return true;
            });
            if (added) {
              setPrompt("");
              setOptions("");
              setAnswer("");
            }
          }}
        >
          <FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">Type</FieldLegend>
              <RadioGroup
                value={type}
                onValueChange={(next) => setType(next as ExerciseType)}
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                {EXERCISE_TYPES.map((t) => (
                  <Label key={t} data-testid="exercise-type" className="flex cursor-pointer items-center gap-2 font-normal">
                    <RadioGroupItem value={t} />
                    {EXERCISE_LABELS[t]}
                  </Label>
                ))}
              </RadioGroup>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="exercise-prompt">Prompt</FieldLabel>
              <Textarea
                id="exercise-prompt"
                data-testid="exercise-prompt"
                rows={2}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              {type === "gap" ? <FieldDescription>Mark the gap with ___</FieldDescription> : null}
            </Field>
            {type === "mc" ? (
              <Field>
                <FieldLabel htmlFor="exercise-options">Choices, one per line</FieldLabel>
                <Textarea
                  id="exercise-options"
                  data-testid="exercise-options"
                  rows={3}
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                />
              </Field>
            ) : null}
            {graded ? (
              <Field>
                <FieldLabel htmlFor="exercise-answer">
                  {type === "mc" ? "Correct choice" : "Answer"}
                </FieldLabel>
                <Input
                  id="exercise-answer"
                  data-testid="exercise-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                />
              </Field>
            ) : null}
            <div>
              <Button type="submit" disabled={pending || !prompt.trim()}>
                Add exercise
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function VocabForm({ lessonId }: { lessonId: string }) {
  const { run, pending } = useAction();
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>New word</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const added = await run(async () => {
              await addVocab({ data: { lessonId, term, translation, example } });
              return true;
            });
            if (added) {
              setTerm("");
              setTranslation("");
              setExample("");
            }
          }}
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="vocab-term">Term</FieldLabel>
                <Input id="vocab-term" data-testid="vocab-term" value={term} onChange={(e) => setTerm(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="vocab-translation">Translation</FieldLabel>
                <Input
                  id="vocab-translation"
                  data-testid="vocab-translation"
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="vocab-example">Example sentence</FieldLabel>
              <Input id="vocab-example" data-testid="vocab-example" value={example} onChange={(e) => setExample(e.target.value)} />
            </Field>
            <div>
              <Button type="submit" disabled={pending || !term.trim() || !translation.trim()}>
                Add word
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
