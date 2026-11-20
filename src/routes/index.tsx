import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/client/components/AppShell";
import { PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Progress } from "@/client/components/ui/progress";
import { percent, plural } from "@/client/lib/format";
import { getMyCourses } from "@/serverFunctions/courses";
import { getReview } from "@/serverFunctions/learning";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [courses, review] = await Promise.all([getMyCourses(), getReview()]);
    return { courses, due: review.due };
  },
  component: Home,
});

function Home() {
  const { courses, due } = Route.useLoaderData();
  return (
    <AppShell>
      <PageHeader
        title="Learn"
        actions={
          due > 0 ? (
            <Button render={<Link to="/review/session" />}>
              Review {plural(due, "word")}
            </Button>
          ) : null
        }
      />
      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Enrol in a course and it will appear here."
          action={<Button render={<Link to="/courses" />}>Browse courses</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} data-testid="my-course">
              <CardHeader>
                <div className="flex gap-2">
                  <Badge variant="soft">{course.level}</Badge>
                  <Badge variant="outline">{course.language}</Badge>
                </div>
                <CardTitle>
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: course.id }}
                    className="hover:underline"
                  >
                    {course.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={percent(course.completed, course.lessonCount)} />
                <p className="text-sm text-muted-foreground">
                  {course.completed} of {plural(course.lessonCount, "lesson")} ·{" "}
                  {percent(course.completed, course.lessonCount)}%
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
