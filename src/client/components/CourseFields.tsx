import { ChoiceSelect } from "@/client/components/ChoiceSelect";
import { Field, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { LANGUAGES, LEVELS } from "@/lib/learning";

export interface CourseDraft {
  title: string;
  description: string;
  language: string | null;
  level: string | null;
}

export function CourseFields({
  value,
  onChange,
}: {
  value: CourseDraft;
  onChange: (next: CourseDraft) => void;
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor="course-title">Title</FieldLabel>
        <Input
          id="course-title"
          data-testid="course-title"
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="course-description">Description</FieldLabel>
        <Textarea
          id="course-description"
          data-testid="course-description"
          rows={2}
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="course-language">Language</FieldLabel>
          <ChoiceSelect
            id="course-language"
            testId="course-language"
            value={value.language}
            placeholder="Choose a language"
            onChange={(language) => onChange({ ...value, language })}
            options={LANGUAGES.map((l) => ({ value: l, label: l }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="course-level">Level</FieldLabel>
          <ChoiceSelect
            id="course-level"
            testId="course-level"
            value={value.level}
            placeholder="Choose a level"
            onChange={(level) => onChange({ ...value, level })}
            options={LEVELS.map((l) => ({ value: l, label: l }))}
          />
        </Field>
      </div>
    </>
  );
}

export function courseReady(value: CourseDraft) {
  return Boolean(value.title.trim() && value.language && value.level);
}

export function courseData(value: CourseDraft) {
  return {
    title: value.title,
    description: value.description,
    language: value.language as (typeof LANGUAGES)[number],
    level: value.level as (typeof LEVELS)[number],
  };
}
