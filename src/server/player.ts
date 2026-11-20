import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  courses,
  exercises,
  lessonAttempts,
  lessons,
  reviewItems,
  units,
  vocabItems,
} from "@/db/schema";
import { isCorrect, isGraded } from "@/lib/learning";
import { refuse } from "@/server/errors";

const id = z.string().min(1).max(64);
export const lessonIdInput = z.object({ id }).strict();
export const checkInput = z
  .object({ exerciseId: id, answer: z.string().max(500) })
  .strict();
export const finishInput = z
  .object({ lessonId: id, answers: z.record(z.string(), z.string().max(500)) })
  .strict();

/** The lesson and its course, when the member may open it. */
async function openLesson(lessonId: string, admin: boolean) {
  const [row] = await db
    .select({
      lesson: lessons,
      course: { id: courses.id, title: courses.title, language: courses.language, published: courses.published },
    })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(eq(lessons.id, lessonId));
  if (!row || (!row.course.published && !admin)) return null;
  return row;
}

/** A lesson to play: exercises without their answers. */
export async function getLessonForPlayer(lessonId: string, admin: boolean) {
  const opened = await openLesson(lessonId, admin);
  if (!opened) return null;
  const [rows, vocab, unitRow] = await Promise.all([
    db.select().from(exercises).where(eq(exercises.lessonId, lessonId)).orderBy(asc(exercises.position)),
    db
      .select({ term: vocabItems.term, translation: vocabItems.translation, example: vocabItems.example })
      .from(vocabItems)
      .where(eq(vocabItems.lessonId, lessonId))
      .orderBy(asc(vocabItems.position)),
    db.select({ title: units.title }).from(units).where(eq(units.id, opened.lesson.unitId)),
  ]);
  return {
    lesson: { id: opened.lesson.id, title: opened.lesson.title, unit: unitRow[0]?.title ?? "" },
    course: { id: opened.course.id, title: opened.course.title, language: opened.course.language },
    exercises: rows.map((e) => ({
      id: e.id,
      type: e.type,
      prompt: e.prompt,
      options: e.type === "mc" ? (JSON.parse(e.options) as string[]) : [],
    })),
    vocab,
  };
}

async function openExercise(exerciseId: string, admin: boolean) {
  const [row] = await db.select().from(exercises).where(eq(exercises.id, exerciseId));
  if (!row) return null;
  const opened = await openLesson(row.lessonId, admin);
  return opened ? { exercise: row, ...opened } : null;
}

export async function checkAnswer(
  { exerciseId, answer }: z.infer<typeof checkInput>,
  admin: boolean,
) {
  const opened = await openExercise(exerciseId, admin);
  if (!opened || !isGraded(opened.exercise.type)) refuse("No such exercise");
  return {
    correct: isCorrect(answer, opened.exercise.answer),
    answer: opened.exercise.answer,
  };
}

/** Grades the whole lesson, records the attempt and adds its words to review. */
export async function finishLesson(
  userId: string,
  { lessonId, answers }: z.infer<typeof finishInput>,
  admin: boolean,
) {
  const opened = await openLesson(lessonId, admin);
  if (!opened) refuse("No such lesson");
  const [rows, vocab] = await Promise.all([
    db.select().from(exercises).where(eq(exercises.lessonId, lessonId)),
    db.select({ id: vocabItems.id }).from(vocabItems).where(eq(vocabItems.lessonId, lessonId)),
  ]);
  const graded = rows.filter((e) => isGraded(e.type));
  const correct = graded.filter((e) => isCorrect(answers[e.id] ?? "", e.answer)).length;
  const attempt = db.insert(lessonAttempts).values({
    id: crypto.randomUUID(),
    userId,
    lessonId,
    courseId: opened.course.id,
    correct,
    graded: graded.length,
  });
  const now = new Date().toISOString();
  if (vocab.length) {
    await db.batch([
      attempt,
      db
        .insert(reviewItems)
        .values(vocab.map((v) => ({ userId, vocabItemId: v.id, strength: 0, dueAt: now })))
        .onConflictDoNothing(),
    ]);
  } else {
    await attempt;
  }
  return { correct, graded: graded.length };
}

/** The lesson after this one in the course, if any. */
export async function nextLessonId(lessonId: string): Promise<string | null> {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) return null;
  const unitRows = await db.select().from(units).where(eq(units.courseId, lesson.courseId)).orderBy(asc(units.position));
  const lessonRows = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.courseId, lesson.courseId), inArray(lessons.unitId, unitRows.map((u) => u.id))))
    .orderBy(asc(lessons.position));
  const ordered = unitRows.flatMap((u) => lessonRows.filter((l) => l.unitId === u.id));
  const index = ordered.findIndex((l) => l.id === lessonId);
  return ordered[index + 1]?.id ?? null;
}


