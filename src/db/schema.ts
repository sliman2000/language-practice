import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

/** One row per member, keyed by the Gateway's user id and made on first sight. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  nativeLanguage: text("native_language"),
  /** JSON array of language names. */
  knownLanguages: text("known_languages").notNull().default("[]"),
  createdAt: createdAt(),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  language: text("language").notNull(),
  level: text("level").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: createdAt(),
});

export const units = sqliteTable(
  "units",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
  },
  (t) => [index("units_course").on(t.courseId)],
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
  },
  (t) => [index("lessons_unit").on(t.unitId), index("lessons_course").on(t.courseId)],
);

export const exercises = sqliteTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** mc | type | gap | writing | speaking */
    type: text("type").notNull(),
    prompt: text("prompt").notNull(),
    /** JSON array of choices, for multiple choice. */
    options: text("options").notNull().default("[]"),
    answer: text("answer").notNull().default(""),
  },
  (t) => [index("exercises_lesson").on(t.lessonId)],
);

export const vocabItems = sqliteTable(
  "vocab_items",
  {
    id: text("id").primaryKey(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    term: text("term").notNull(),
    translation: text("translation").notNull(),
    example: text("example").notNull().default(""),
  },
  (t) => [index("vocab_lesson").on(t.lessonId)],
);

export const enrollments = sqliteTable(
  "enrollments",
  {
    userId: text("user_id").notNull(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

export const lessonAttempts = sqliteTable(
  "lesson_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    correct: integer("correct").notNull(),
    graded: integer("graded").notNull(),
    completedAt: createdAt(),
  },
  (t) => [index("attempts_user").on(t.userId, t.courseId)],
);

export const reviewItems = sqliteTable(
  "review_items",
  {
    userId: text("user_id").notNull(),
    vocabItemId: text("vocab_item_id")
      .notNull()
      .references(() => vocabItems.id, { onDelete: "cascade" }),
    strength: integer("strength").notNull().default(0),
    dueAt: text("due_at").notNull(),
    lastReviewedAt: text("last_reviewed_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.vocabItemId] })],
);

export const reviewSessions = sqliteTable(
  "review_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    correct: integer("correct").notNull(),
    incorrect: integer("incorrect").notNull(),
    completedAt: createdAt(),
  },
  (t) => [index("review_sessions_user").on(t.userId)],
);

export const studyPlans = sqliteTable("study_plans", {
  userId: text("user_id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  goalLevel: text("goal_level").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  minutesPerDay: integer("minutes_per_day").notNull(),
  createdAt: createdAt(),
});

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    /** writing | speaking */
    kind: text("kind").notNull(),
    prompt: text("prompt").notNull(),
    text: text("text").notNull().default(""),
    audioKey: text("audio_key"),
    createdAt: createdAt(),
  },
  (t) => [index("submissions_user").on(t.userId), index("submissions_language").on(t.language)],
);

export const corrections = sqliteTable(
  "corrections",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    correctedText: text("corrected_text").notNull(),
    comment: text("comment").notNull().default(""),
    rating: integer("rating"),
    createdAt: createdAt(),
  },
  (t) => [index("corrections_submission").on(t.submissionId), index("corrections_user").on(t.userId)],
);
