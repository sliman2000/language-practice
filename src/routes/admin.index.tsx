import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { NotAdmin } from "@/client/components/AdminOnly";
import { AppShell } from "@/client/components/AppShell";
import { CourseFields, courseData, courseReady, type CourseDraft } from "@/client/components/CourseFields";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { FieldGroup } from "@/client/components/ui/field";
import { useAction } from "@/client/hooks/useAction";
import { plural } from "@/client/lib/format";
import { createCourse, getAdminCourses } from "@/serverFunctions/courses";

export const Route = createFileRoute("/admin/")({
  loader: () => getAdminCourses(),
  component: AdminPage,
});

const EMPTY: CourseDraft = { title: "", description: "", language: null, level: null };

function AdminPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const { run, pending } = useAction();
  const [draft, setDraft] = useState(EMPTY);
  if (data.forbidden) return <NotAdmin />;

  return (
    <AppShell>
      <PageHeader title="Admin" />
      <Card>
        <CardHeader>
          <CardTitle>New course</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!courseReady(draft)) return;
              const created = await run(() => createCourse({ data: courseData(draft) }));
              if (created) {
                setDraft(EMPTY);
                await navigate({ to: "/admin/courses/$courseId", params: { courseId: created.id } });
              }
            }}
          >
            <FieldGroup>
              <CourseFields value={draft} onChange={setDraft} />
              <div>
                <Button type="submit" disabled={pending || !courseReady(draft)}>
                  Create course
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      {data.courses.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {data.courses.map((course) => (
            <li key={course.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link
                  to="/admin/courses/$courseId"
                  params={{ courseId: course.id }}
                  className="font-medium hover:underline"
                >
                  {course.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {course.language} · {course.level} · {plural(course.lessonCount, "lesson")}
                </p>
              </div>
              <Badge variant={course.published ? "success" : "warning"}>
                {course.published ? "Published" : "Draft"}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
