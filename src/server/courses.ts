import { and, asc, count, countDistinct, desc, eq, inArray, max } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { db } from "@/db";
import {
  courses,
  enrollments,
  exercises,
  lessonAttempts,
  lessons,
  units,
  vocabItems,
} from "@/db/schema";
import { EXERCISE_TYPES, LANGUAGES, LEVELS, isGraded } from "@/lib/learning";
import { refuse } from "@/server/errors";

const id = z.string().min(1).max(64);
const title = z.string().trim().min(1, "Title is required").max(120);

export const courseInput = z
  .object({
    title,
    description: z.string().trim().max(1000),
    language: z.enum(LANGUAGES),
    level: z.enum(LEVELS),
  })
  .strict();
export const courseUpdateInput = courseInput.extend({ id }).strict();
export const publishInput = z.object({ id, published: z.boolean() }).strict();
export const idInput = z.object({ id }).strict();
export const moveInput = z
  .object({ id, direction: z.enum(["up", "down"]) })
  .strict();
export const unitInput = z.object({ courseId: id, title }).strict();
export const lessonInput = z.object({ unitId: id, title }).strict();
export const exerciseInput = z
  .object({
    lessonId: id,
    type: z.enum(EXERCISE_TYPES),
    prompt: z.string().trim().min(1, "Prompt is required").max(1000),
    options: z.array(z.string().trim().min(1).max(200)).max(8),
    answer: z.string().trim().max(200),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === "mc") {
      if (value.options.length < 2)
        ctx.addIssue({ code: "custom", message: "Give at least two choices" });
      else if (!value.options.includes(value.answer))
        ctx.addIssue({
          code: "custom",
          message: "The answer must be one of the choices",
        });
    } else if (isGraded(value.type) && !value.answer) {
      ctx.addIssue({ code: "custom", message: "Answer is required" });
    }
  });
export const vocabInput = z
  .object({
    lessonId: id,
    term: z.string().trim().min(1, "Term is required").max(120),
    translation: z.string().trim().min(1, "Translation is required").max(120),
    example: z.string().trim().max(300),
  })
  .strict();
export const catalogInput = z
  .object({
    language: z.enum(LANGUAGES).optional(),
    level: z.enum(LEVELS).optional(),
  })
  .strict();

export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  published: boolean;
  lessonCount: number;
}

const summary = {
  id: courses.id,
  title: courses.title,
  description: courses.description,
  language: courses.language,
  level: courses.level,
  published: courses.published,
};

async function lessonCounts(courseIds: string[]): Promise<Map<string, number>> {
  if (courseIds.length === 0) return new Map();
  const rows = await db
    .select({ courseId: lessons.courseId, n: count() })
    .from(lessons)
    .where(inArray(lessons.courseId, courseIds))
    .groupBy(lessons.courseId);
  return new Map(rows.map((r) => [r.courseId, r.n]));
}

async function completedCounts(
  userId: string,
  courseIds: string[],
): Promise<Map<string, number>> {
  if (courseIds.length === 0) return new Map();
  const rows = await db
    .select({ courseId: lessonAttempts.courseId, n: countDistinct(lessonAttempts.lessonId) })
    .from(lessonAttempts)
    .where(and(eq(lessonAttempts.userId, userId), inArray(lessonAttempts.courseId, courseIds)))
    .groupBy(lessonAttempts.courseId);
  return new Map(rows.map((r) => [r.courseId, r.n]));
}

/** Published courses, filtered, with whether the member is enrolled. */
export async function listCatalog(
  userId: string,
  filter: z.infer<typeof catalogInput>,
) {
  const conditions = [eq(courses.published, true)];
  if (filter.language) conditions.push(eq(courses.language, filter.language));
  if (filter.level) conditions.push(eq(courses.level, filter.level));
  const rows = await db
    .select(summary)
    .from(courses)
    .where(and(...conditions))
    .orderBy(asc(courses.language), asc(courses.level), asc(courses.title));
  const ids = rows.map((r) => r.id);
  const [countsByCourse, mine] = await Promise.all([
    lessonCounts(ids),
    ids.length
      ? db
          .select({ courseId: enrollments.courseId })
          .from(enrollments)
          .where(and(eq(enrollments.userId, userId), inArray(enrollments.courseId, ids)))
      : Promise.resolve([]),
  ]);
  const enrolled = new Set(mine.map((m) => m.courseId));
  return rows.map((r) => ({
    ...r,
    lessonCount: countsByCourse.get(r.id) ?? 0,
    enrolled: enrolled.has(r.id),
  }));
}

/** The member's enrolled courses with progress. */
export async function listMyCourses(userId: string) {
  const rows = await db
    .select(summary)
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(eq(enrollments.userId, userId), eq(courses.published, true)))
    .orderBy(desc(enrollments.createdAt));
  const ids = rows.map((r) => r.id);
  const [totals, done] = await Promise.all([lessonCounts(ids), completedCounts(userId, ids)]);
  return rows.map((r) => ({
    ...r,
    lessonCount: totals.get(r.id) ?? 0,
    completed: done.get(r.id) ?? 0,
  }));
}

/** Every course, drafts included: the admin's list. */
export async function listAllCourses(): Promise<CourseSummary[]> {
  const rows = await db.select(summary).from(courses).orderBy(desc(courses.createdAt));
  const totals = await lessonCounts(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, lessonCount: totals.get(r.id) ?? 0 }));
}

async function loadTree(courseId: string) {
  const [unitRows, lessonRows] = await Promise.all([
    db.select().from(units).where(eq(units.courseId, courseId)).orderBy(asc(units.position)),
    db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.position)),
  ]);
  return unitRows.map((u) => ({
    id: u.id,
    title: u.title,
    lessons: lessonRows
      .filter((l) => l.unitId === u.id)
      .map((l) => ({ id: l.id, title: l.title })),
  }));
}

/** A course's outline for a member, or null for a draft unless they're an admin. */
export async function getCourseOutline(userId: string, courseId: string, admin: boolean) {
  const [course] = await db.select(summary).from(courses).where(eq(courses.id, courseId));
  if (!course || (!course.published && !admin)) return null;
  const [tree, attempts, enrolled] = await Promise.all([
    loadTree(courseId),
    db
      .select({ lessonId: lessonAttempts.lessonId, best: max(lessonAttempts.correct) })
      .from(lessonAttempts)
      .where(and(eq(lessonAttempts.userId, userId), eq(lessonAttempts.courseId, courseId)))
      .groupBy(lessonAttempts.lessonId),
    db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))),
  ]);
  const done = new Set(attempts.map((a) => a.lessonId));
  const outline = tree.map((u) => ({
    ...u,
    lessons: u.lessons.map((l) => ({ ...l, completed: done.has(l.id) })),
  }));
  const total = outline.reduce((n, u) => n + u.lessons.length, 0);
  const completed = outline.reduce((n, u) => n + u.lessons.filter((l) => l.completed).length, 0);
  return { course, units: outline, enrolled: enrolled.length > 0, total, completed };
}

export async function enrol(userId: string, courseId: string): Promise<void> {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.published, true)));
  if (!course) refuse("No such course");
  await db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing();
}

export async function leave(userId: string, courseId: string): Promise<void> {
  await db
    .delete(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
}

// ----- Authoring (admins only; the server functions check) -----

export async function createCourse(userId: string, input: z.infer<typeof courseInput>) {
  const courseId = crypto.randomUUID();
  await db.insert(courses).values({ id: courseId, createdBy: userId, ...input });
  return { id: courseId };
}

export async function updateCourse({ id: courseId, ...input }: z.infer<typeof courseUpdateInput>) {
  await db.update(courses).set(input).where(eq(courses.id, courseId));
}

export async function setPublished({ id: courseId, published }: z.infer<typeof publishInput>) {
  await db.update(courses).set({ published }).where(eq(courses.id, courseId));
}

export async function deleteCourse(courseId: string) {
  await db.delete(courses).where(eq(courses.id, courseId));
}

export async function getCourseForEdit(courseId: string) {
  const [course] = await db.select(summary).from(courses).where(eq(courses.id, courseId));
  if (!course) return null;
  return { course, units: await loadTree(courseId) };
}

async function nextPosition(
  column: SQLiteColumn,
  parent: SQLiteColumn,
  parentId: string,
  table: SQLiteTable,
) {
  const [row] = await db.select({ top: max(column) }).from(table).where(eq(parent, parentId));
  return Number(row?.top ?? -1) + 1;
}

export async function addUnit({ courseId, title: unitTitle }: z.infer<typeof unitInput>) {
  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId));
  if (!course) refuse("No such course");
  const position = await nextPosition(units.position, units.courseId, courseId, units);
  await db.insert(units).values({ id: crypto.randomUUID(), courseId, position, title: unitTitle });
}

export async function deleteUnit(unitId: string) {
  await db.delete(units).where(eq(units.id, unitId));
}

export async function addLesson({ unitId, title: lessonTitle }: z.infer<typeof lessonInput>) {
  const [unit] = await db.select().from(units).where(eq(units.id, unitId));
  if (!unit) refuse("No such unit");
  const position = await nextPosition(lessons.position, lessons.unitId, unitId, lessons);
  await db.insert(lessons).values({
    id: crypto.randomUUID(),
    unitId,
    courseId: unit.courseId,
    position,
    title: lessonTitle,
  });
}

export async function deleteLesson(lessonId: string) {
  await db.delete(lessons).where(eq(lessons.id, lessonId));
}

export async function getLessonForEdit(lessonId: string) {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) return null;
  const [[course], exerciseRows, vocabRows] = await Promise.all([
    db.select(summary).from(courses).where(eq(courses.id, lesson.courseId)),
    db.select().from(exercises).where(eq(exercises.lessonId, lessonId)).orderBy(asc(exercises.position)),
    db.select().from(vocabItems).where(eq(vocabItems.lessonId, lessonId)).orderBy(asc(vocabItems.position)),
  ]);
  return {
    lesson: { id: lesson.id, title: lesson.title },
    course: course!,
    exercises: exerciseRows.map((e) => ({
      id: e.id,
      type: e.type,
      prompt: e.prompt,
      options: JSON.parse(e.options) as string[],
      answer: e.answer,
    })),
    vocab: vocabRows.map((v) => ({
      id: v.id,
      term: v.term,
      translation: v.translation,
      example: v.example,
    })),
  };
}

export async function addExercise(input: z.infer<typeof exerciseInput>) {
  const [lesson] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, input.lessonId));
  if (!lesson) refuse("No such lesson");
  const position = await nextPosition(exercises.position, exercises.lessonId, input.lessonId, exercises);
  await db.insert(exercises).values({
    id: crypto.randomUUID(),
    lessonId: input.lessonId,
    position,
    type: input.type,
    prompt: input.prompt,
    options: JSON.stringify(input.type === "mc" ? input.options : []),
    answer: isGraded(input.type) ? input.answer : "",
  });
}

export async function deleteExercise(exerciseId: string) {
  await db.delete(exercises).where(eq(exercises.id, exerciseId));
}

export async function addVocab(input: z.infer<typeof vocabInput>) {
  const [lesson] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, input.lessonId));
  if (!lesson) refuse("No such lesson");
  const position = await nextPosition(vocabItems.position, vocabItems.lessonId, input.lessonId, vocabItems);
  await db.insert(vocabItems).values({ id: crypto.randomUUID(), position, ...input });
}

export async function deleteVocab(vocabId: string) {
  await db.delete(vocabItems).where(eq(vocabItems.id, vocabId));
}

const ORDERED = {
  unit: { table: units, parent: units.courseId, parentKey: "courseId" },
  lesson: { table: lessons, parent: lessons.unitId, parentKey: "unitId" },
  exercise: { table: exercises, parent: exercises.lessonId, parentKey: "lessonId" },
  vocab: { table: vocabItems, parent: vocabItems.lessonId, parentKey: "lessonId" },
} as const;

/** Swaps a row with its neighbour among its siblings. */
export async function move(kind: keyof typeof ORDERED, { id: rowId, direction }: z.infer<typeof moveInput>) {
  const { table, parent, parentKey } = ORDERED[kind];
  const t = table as typeof units;
  const [row] = (await db.select().from(table).where(eq(table.id, rowId))) as Record<string, unknown>[];
  if (!row) refuse("Not found");
  const siblings = await db
    .select({ id: t.id, position: t.position })
    .from(table)
    .where(eq(parent, row[parentKey] as string))
    .orderBy(asc(table.position));
  const index = siblings.findIndex((s) => s.id === rowId);
  const other = siblings[direction === "up" ? index - 1 : index + 1];
  if (!other) return;
  // Positions are renumbered as indices so a swap never collides.
  const order = siblings.map((s) => s.id);
  const j = direction === "up" ? index - 1 : index + 1;
  [order[index], order[j]] = [order[j]!, order[index]!];
  const [first, ...rest] = order.map((sid, position) =>
    db.update(table).set({ position }).where(eq(table.id, sid)),
  );
  await db.batch([first!, ...rest]);
}
