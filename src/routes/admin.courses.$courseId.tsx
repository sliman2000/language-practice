import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { NotAdmin } from "@/client/components/AdminOnly";
import { AppShell } from "@/client/components/AppShell";
import { CourseFields, courseData, courseReady } from "@/client/components/CourseFields";
import { OrderButtons } from "@/client/components/OrderButtons";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { FieldGroup } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { useAction } from "@/client/hooks/useAction";
import {
  addLesson,
  addUnit,
  deleteCourse,
  deleteLesson,
  deleteUnit,
  getCourseForEdit,
  moveLesson,
  moveUnit,
  setPublished,
  updateCourse,
} from "@/serverFunctions/courses";

export const Route = createFileRoute("/admin/courses/$courseId")({
  loader: ({ params }) => getCourseForEdit({ data: { id: params.courseId } }),
  component: CourseEditorPage,
});

function CourseEditorPage() {
  const result = Route.useLoaderData();
  if (result.forbidden) return <NotAdmin />;
  if (!result.data) {
    return (
      <AppShell>
        <PageHeader title="Course" backLink={<BackLink to="/admin">Admin</BackLink>} />
        <EmptyState testId="not-found" title="Course not found" />
      </AppShell>
    );
  }
  return <CourseEditor key={result.data.course.id} data={result.data} />;
}

type EditData = NonNullable<
  Extract<Awaited<ReturnType<typeof getCourseForEdit>>, { forbidden: false }>["data"]
>;

function CourseEditor({ data }: { data: EditData }) {
  const { course, units } = data;
  const { run, pending } = useAction();
  const navigate = useNavigate();
  const [details, setDetails] = useState({
    title: course.title,
    description: course.description,
    language: course.language as string | null,
    level: course.level as string | null,
  });
  const [unitTitle, setUnitTitle] = useState("");

  return (
    <AppShell>
      <PageHeader
        backLink={<BackLink to="/admin">Admin</BackLink>}
        title={course.title}
        description={
          <Badge data-testid="course-status" variant={course.published ? "success" : "warning"}>
            {course.published ? "Published" : "Draft"}
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              render={<Link to="/courses/$courseId" params={{ courseId: course.id }} />}
            >
              Preview
            </Button>
            <Button
              variant={course.published ? "outline" : "default"}
              disabled={pending}
              onClick={() => run(() => setPublished({ data: { id: course.id, published: !course.published } }))}
            >
              {course.published ? "Unpublish" : "Publish"}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!courseReady(details)) return;
              void run(() => updateCourse({ data: { id: course.id, ...courseData(details) } }));
            }}
          >
            <FieldGroup>
              <CourseFields value={details} onChange={setDetails} />
              <div>
                <Button type="submit" variant="outline" disabled={pending || !courseReady(details)}>
                  Save details
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Units</h2>
        {units.map((unit, index) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            index={index}
            count={units.length}
          />
        ))}
        <form
          className="flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!unitTitle.trim()) return;
            await run(() => addUnit({ data: { courseId: course.id, title: unitTitle } }));
            setUnitTitle("");
          }}
        >
          <Input
            data-testid="new-unit-title"
            aria-label="New unit title"
            placeholder="New unit title"
            value={unitTitle}
            onChange={(event) => setUnitTitle(event.target.value)}
          />
          <Button type="submit" disabled={pending || !unitTitle.trim()}>
            Add unit
          </Button>
        </form>
      </section>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" className="text-destructive">
              Delete course
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{course.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its units, lessons, members’ progress and review words are deleted too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                const done = await run(async () => {
                  await deleteCourse({ data: { id: course.id } });
                  return true;
                });
                if (done) await navigate({ to: "/admin" });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function UnitCard({
  unit,
  index,
  count,
}: {
  unit: EditData["units"][number];
  index: number;
  count: number;
}) {
  const { run, pending } = useAction();
  const [lessonTitle, setLessonTitle] = useState("");
  return (
    <Card data-testid="unit">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          Unit {index + 1}: {unit.title}
        </CardTitle>
        <OrderButtons
          label={`unit ${unit.title}`}
          first={index === 0}
          last={index === count - 1}
          disabled={pending}
          onMove={(direction) => run(() => moveUnit({ data: { id: unit.id, direction } }))}
          onDelete={() => run(() => deleteUnit({ data: { id: unit.id } }))}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {unit.lessons.length > 0 ? (
          <ul className="divide-y divide-border">
            {unit.lessons.map((lesson, i) => (
              <li key={lesson.id} className="flex items-center justify-between gap-2 py-1.5">
                <Link
                  to="/admin/lessons/$lessonId"
                  params={{ lessonId: lesson.id }}
                  className="min-w-0 truncate hover:underline"
                >
                  {lesson.title}
                </Link>
                <OrderButtons
                  label={`lesson ${lesson.title}`}
                  first={i === 0}
                  last={i === unit.lessons.length - 1}
                  disabled={pending}
                  onMove={(direction) => run(() => moveLesson({ data: { id: lesson.id, direction } }))}
                  onDelete={() => run(() => deleteLesson({ data: { id: lesson.id } }))}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!lessonTitle.trim()) return;
            await run(() => addLesson({ data: { unitId: unit.id, title: lessonTitle } }));
            setLessonTitle("");
          }}
        >
          <Input
            data-testid="new-lesson-title"
            aria-label="New lesson title"
            placeholder="New lesson title"
            value={lessonTitle}
            onChange={(event) => setLessonTitle(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={pending || !lessonTitle.trim()}>
            Add lesson
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
