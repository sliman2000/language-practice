import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { AppShell } from "@/client/components/AppShell";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Progress } from "@/client/components/ui/progress";
import { useAction } from "@/client/hooks/useAction";
import { percent, plural } from "@/client/lib/format";
import { enrol, getCourse, leaveCourse } from "@/serverFunctions/courses";

export const Route = createFileRoute("/courses/$courseId")({
  loader: ({ params }) => getCourse({ data: { id: params.courseId } }),
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.course.title }] : [],
  }),
  component: CoursePage,
});

function CoursePage() {
  const outline = Route.useLoaderData();
  const { run, pending } = useAction();
  if (!outline) {
    return (
      <AppShell>
        <PageHeader title="Course" backLink={<BackLink to="/courses">Courses</BackLink>} />
        <EmptyState testId="not-found" title="Course not found" />
      </AppShell>
    );
  }
  const { course, units, enrolled, total, completed } = outline;
  return (
    <AppShell>
      <PageHeader
        backLink={<BackLink to="/courses">Courses</BackLink>}
        title={course.title}
        description={
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="soft">{course.level}</Badge>
              <Badge variant="outline">{course.language}</Badge>
              {!course.published ? <Badge variant="warning">Draft</Badge> : null}
            </div>
            {course.description ? <p>{course.description}</p> : null}
          </div>
        }
        actions={
          enrolled ? (
            <>
              <Badge variant="success" data-testid="enrolled">
                Enrolled
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => run(() => leaveCourse({ data: { id: course.id } }))}
              >
                Leave
              </Button>
            </>
          ) : (
            <Button
              disabled={pending || !course.published}
              onClick={() => run(() => enrol({ data: { id: course.id } }))}
            >
              Enrol
            </Button>
          )
        }
      />
      <div className="space-y-2" data-testid="course-progress">
        <Progress value={percent(completed, total)} />
        <p className="text-sm text-muted-foreground">
          {completed} of {plural(total, "lesson")} complete · {percent(completed, total)}%
        </p>
      </div>
      {units.length === 0 ? (
        <EmptyState title="No lessons yet" />
      ) : (
        units.map((unit, index) => (
          <Card key={unit.id}>
            <CardHeader>
              <CardTitle>
                Unit {index + 1}: {unit.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unit.lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lessons yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {unit.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      data-testid="lesson-row"
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {lesson.completed ? (
                          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <Link
                          to="/lessons/$lessonId"
                          params={{ lessonId: lesson.id }}
                          className="truncate hover:underline"
                        >
                          {lesson.title}
                        </Link>
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {lesson.completed ? "Completed" : "Not started"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </AppShell>
  );
}
