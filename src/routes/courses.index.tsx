import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/client/components/AppShell";
import { ChoiceSelect } from "@/client/components/ChoiceSelect";
import { PageHeader } from "@/client/components/PageHeader";
import { EmptyState } from "@/client/components/States";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { plural } from "@/client/lib/format";
import { LANGUAGES, LEVELS } from "@/lib/learning";
import { getCatalog } from "@/serverFunctions/courses";

const search = z.object({
  language: z.enum(LANGUAGES).optional().catch(undefined),
  level: z.enum(LEVELS).optional().catch(undefined),
});

const ALL = "all";

export const Route = createFileRoute("/courses/")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getCatalog({ data: deps }),
  component: Catalog,
});

function Catalog() {
  const courses = Route.useLoaderData();
  const { language, level } = Route.useSearch();
  const navigate = useNavigate({ from: "/courses/" });
  return (
    <AppShell>
      <PageHeader title="Courses" />
      <div className="flex flex-wrap gap-3">
        <ChoiceSelect
          testId="filter-language"
          className="w-48"
          value={language ?? ALL}
          options={[
            { value: ALL, label: "All languages" },
            ...LANGUAGES.map((l) => ({ value: l, label: l })),
          ]}
          onChange={(value) =>
            navigate({
              search: (prev) => ({
                ...prev,
                language: value === ALL ? undefined : (value as (typeof LANGUAGES)[number]),
              }),
            })
          }
        />
        <ChoiceSelect
          testId="filter-level"
          className="w-36"
          value={level ?? ALL}
          options={[
            { value: ALL, label: "All levels" },
            ...LEVELS.map((l) => ({ value: l, label: l })),
          ]}
          onChange={(value) =>
            navigate({
              search: (prev) => ({
                ...prev,
                level: value === ALL ? undefined : (value as (typeof LEVELS)[number]),
              }),
            })
          }
        />
      </div>
      {courses.length === 0 ? (
        <EmptyState
          title="No courses match"
          description={
            language || level
              ? "Try another language or level."
              : "Courses appear here once an admin publishes them."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} data-testid="course-card">
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="soft">{course.level}</Badge>
                  <Badge variant="outline">{course.language}</Badge>
                  {course.enrolled ? <Badge variant="success">Enrolled</Badge> : null}
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
                <CardDescription>
                  {course.description ? <>{course.description} · </> : null}
                  {plural(course.lessonCount, "lesson")}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
