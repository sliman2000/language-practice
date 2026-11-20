import { and, asc, countDistinct, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, enrollments, lessonAttempts, lessons, reviewSessions, studyPlans } from "@/db/schema";
import { LEVELS, currentStreak, dayOf, estimatedFinish, weekStart } from "@/lib/learning";
import { refuse } from "@/server/errors";

export const planInput = z
  .object({
    courseId: z.string().min(1).max(64),
    goalLevel: z.enum(LEVELS),
    daysPerWeek: z.number().int().min(1).max(7),
    minutesPerDay: z.number().int().min(5).max(240),
  })
  .strict();

/** Days (UTC) with a finished lesson or review session, newest first. */
async function studyDays(userId: string): Promise<string[]> {
  const since = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();
  const [a, r] = await Promise.all([
    db
      .select({ at: lessonAttempts.completedAt })
      .from(lessonAttempts)
      .where(and(eq(lessonAttempts.userId, userId), gte(lessonAttempts.completedAt, since))),
    db
      .select({ at: reviewSessions.completedAt })
      .from(reviewSessions)
      .where(and(eq(reviewSessions.userId, userId), gte(reviewSessions.completedAt, since))),
  ]);
  return [...new Set([...a, ...r].map((x) => dayOf(x.at)))];
}

export async function getPlan(userId: string) {
  const today = new Date();
  const [options, [plan], days] = await Promise.all([
    db
      .select({ id: courses.id, title: courses.title, language: courses.language, level: courses.level })
      .from(courses)
      .where(eq(courses.published, true))
      .orderBy(asc(courses.title)),
    db
      .select({
        courseId: studyPlans.courseId,
        goalLevel: studyPlans.goalLevel,
        daysPerWeek: studyPlans.daysPerWeek,
        minutesPerDay: studyPlans.minutesPerDay,
        courseTitle: courses.title,
        courseLevel: courses.level,
      })
      .from(studyPlans)
      .innerJoin(courses, eq(courses.id, studyPlans.courseId))
      .where(eq(studyPlans.userId, userId)),
    studyDays(userId),
  ]);
  const streak = currentStreak(days, today);
  if (!plan) return { options, plan: null, streak };
  const [[total], [done]] = await Promise.all([
    db.select({ n: count() }).from(lessons).where(eq(lessons.courseId, plan.courseId)),
    db
      .select({ n: countDistinct(lessonAttempts.lessonId) })
      .from(lessonAttempts)
      .where(and(eq(lessonAttempts.userId, userId), eq(lessonAttempts.courseId, plan.courseId))),
  ]);
  const remaining = Math.max(0, (total?.n ?? 0) - (done?.n ?? 0));
  const start = weekStart(today);
  const studiedThisWeek = days.filter((d) => d >= start).sort();
  return {
    options,
    streak,
    plan: {
      ...plan,
      weekStart: start,
      studiedThisWeek,
      remaining,
      totalLessons: total?.n ?? 0,
      finish: estimatedFinish(remaining, plan.daysPerWeek, plan.minutesPerDay, today),
    },
  };
}

export async function savePlan(userId: string, input: z.infer<typeof planInput>) {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, input.courseId), eq(courses.published, true)));
  if (!course) refuse("No such course");
  const { courseId, ...rest } = input;
  await db.batch([
    db
      .insert(studyPlans)
      .values({ userId, ...input })
      .onConflictDoUpdate({ target: studyPlans.userId, set: { courseId, ...rest } }),
    db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing(),
  ]);
}

export async function deletePlan(userId: string) {
  await db.delete(studyPlans).where(eq(studyPlans.userId, userId));
}
