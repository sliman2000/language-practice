import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/client/components/AppShell";
import { ChoiceSelect } from "@/client/components/ChoiceSelect";
import { PageHeader } from "@/client/components/PageHeader";
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
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Progress } from "@/client/components/ui/progress";
import { useAction } from "@/client/hooks/useAction";
import { formatDay, plural } from "@/client/lib/format";
import { LEVELS } from "@/lib/learning";
import { deletePlan, getPlan, savePlan } from "@/serverFunctions/learning";

export const Route = createFileRoute("/plan")({
  loader: () => getPlan(),
  component: PlanPage,
});

type PlanData = Awaited<ReturnType<typeof getPlan>>;

function PlanPage() {
  const data = Route.useLoaderData();
  const [editing, setEditing] = useState(false);
  const { run, pending } = useAction();
  const { plan } = data;

  if (!plan || editing) {
    return (
      <AppShell>
        <PageHeader title="Study plan" />
        {data.options.length === 0 ? (
          <EmptyState
            title="No courses to plan"
            description="Ask an admin to publish a course."
          />
        ) : (
          <PlanForm data={data} onDone={() => setEditing(false)} onCancel={plan ? () => setEditing(false) : undefined} />
        )}
      </AppShell>
    );
  }

  const studied = plan.studiedThisWeek.length;
  return (
    <AppShell>
      <PageHeader
        title="Study plan"
        description={
          <>
            <Link to="/courses/$courseId" params={{ courseId: plan.courseId }} className="underline">
              {plan.courseTitle}
            </Link>{" "}
            · goal {plan.goalLevel} · {plural(plan.daysPerWeek, "day")} a week,{" "}
            {plan.minutesPerDay} min a day
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit plan
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost">Delete</Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your study plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your lessons and progress stay.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={pending}
                    onClick={() => run(() => deletePlan())}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card data-testid="plan-week">
          <CardHeader>
            <CardDescription>This week</CardDescription>
            <CardTitle className="text-2xl">
              {studied} of {plan.daysPerWeek} days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(100, Math.round((studied / plan.daysPerWeek) * 100))} />
          </CardContent>
        </Card>
        <Card data-testid="plan-streak">
          <CardHeader>
            <CardDescription>Current streak</CardDescription>
            <CardTitle className="text-2xl">{plural(data.streak, "day")}</CardTitle>
          </CardHeader>
        </Card>
        <Card data-testid="plan-remaining">
          <CardHeader>
            <CardDescription>Lessons left</CardDescription>
            <CardTitle className="text-2xl">
              {plan.remaining}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                of {plan.totalLessons}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Estimated finish</CardDescription>
            <CardTitle className="text-2xl" data-testid="plan-finish">
              {plan.remaining === 0 ? "Done" : formatDay(plan.finish)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}

function PlanForm({
  data,
  onDone,
  onCancel,
}: {
  data: PlanData;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { run, pending } = useAction();
  const [courseId, setCourseId] = useState<string | null>(data.plan?.courseId ?? null);
  const [goalLevel, setGoalLevel] = useState<string | null>(data.plan?.goalLevel ?? null);
  const [days, setDays] = useState(String(data.plan?.daysPerWeek ?? 3));
  const [minutes, setMinutes] = useState(String(data.plan?.minutesPerDay ?? 15));
  const ready = courseId && goalLevel && Number(days) >= 1 && Number(minutes) >= 5;

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!ready) return;
            const saved = await run(async () => {
              await savePlan({
                data: {
                  courseId,
                  goalLevel: goalLevel as (typeof LEVELS)[number],
                  daysPerWeek: Number(days),
                  minutesPerDay: Number(minutes),
                },
              });
              return true;
            });
            if (saved) onDone();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="plan-course">Course</FieldLabel>
              <ChoiceSelect
                id="plan-course"
                testId="plan-course"
                value={courseId}
                onChange={setCourseId}
                placeholder="Choose a course"
                options={data.options.map((c) => ({
                  value: c.id,
                  label: c.title,
                }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-level">Goal level</FieldLabel>
              <ChoiceSelect
                id="plan-level"
                testId="plan-level"
                value={goalLevel}
                onChange={setGoalLevel}
                placeholder="Choose a level"
                options={LEVELS.map((l) => ({ value: l, label: l }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="plan-days">Days a week</FieldLabel>
                <Input
                  id="plan-days"
                  data-testid="plan-days"
                  type="number"
                  min={1}
                  max={7}
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="plan-minutes">Minutes a day</FieldLabel>
                <Input
                  id="plan-minutes"
                  data-testid="plan-minutes"
                  type="number"
                  min={5}
                  max={240}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending || !ready}>
                Save plan
              </Button>
              {onCancel ? (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
