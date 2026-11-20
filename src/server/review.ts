import { and, asc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reviewItems, reviewSessions, vocabItems } from "@/db/schema";
import { isCorrect, nextReview, strengthGroup } from "@/lib/learning";
import { refuse } from "@/server/errors";

export const gradeInput = z
  .object({ vocabItemId: z.string().min(1).max(64), answer: z.string().max(300) })
  .strict();
export const sessionInput = z
  .object({ correct: z.number().int().min(0).max(1000), incorrect: z.number().int().min(0).max(1000) })
  .strict();

const SESSION_SIZE = 20;

export async function reviewOverview(userId: string) {
  const rows = await db
    .select({
      id: vocabItems.id,
      term: vocabItems.term,
      translation: vocabItems.translation,
      strength: reviewItems.strength,
      dueAt: reviewItems.dueAt,
    })
    .from(reviewItems)
    .innerJoin(vocabItems, eq(vocabItems.id, reviewItems.vocabItemId))
    .where(eq(reviewItems.userId, userId))
    .orderBy(asc(vocabItems.term));
  const now = new Date().toISOString();
  return {
    due: rows.filter((r) => r.dueAt <= now).length,
    words: rows.map((r) => ({ ...r, group: strengthGroup(r.strength) })),
  };
}

/** Due words for a session: the term only, never the translation. */
export async function dueItems(userId: string) {
  return db
    .select({ id: vocabItems.id, term: vocabItems.term })
    .from(reviewItems)
    .innerJoin(vocabItems, eq(vocabItems.id, reviewItems.vocabItemId))
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.dueAt, new Date().toISOString())))
    .orderBy(asc(reviewItems.strength), asc(reviewItems.dueAt))
    .limit(SESSION_SIZE);
}

export async function gradeReview(userId: string, { vocabItemId, answer }: z.infer<typeof gradeInput>) {
  const [row] = await db
    .select({ strength: reviewItems.strength, translation: vocabItems.translation })
    .from(reviewItems)
    .innerJoin(vocabItems, eq(vocabItems.id, reviewItems.vocabItemId))
    .where(and(eq(reviewItems.userId, userId), eq(reviewItems.vocabItemId, vocabItemId)));
  if (!row) refuse("No such word");
  const correct = isCorrect(answer, row.translation);
  const now = new Date();
  const next = nextReview(row.strength, correct, now);
  await db
    .update(reviewItems)
    .set({ ...next, lastReviewedAt: now.toISOString() })
    .where(and(eq(reviewItems.userId, userId), eq(reviewItems.vocabItemId, vocabItemId)));
  return { correct, translation: row.translation, strength: next.strength };
}

export async function finishSession(userId: string, input: z.infer<typeof sessionInput>) {
  if (input.correct + input.incorrect === 0) return;
  await db.insert(reviewSessions).values({ id: crypto.randomUUID(), userId, ...input });
}
