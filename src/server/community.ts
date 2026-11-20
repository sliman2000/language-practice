import { and, count, desc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { corrections, courses, exercises, lessons, submissions, users } from "@/db/schema";
import { refuse } from "@/server/errors";
import { languagesOf } from "@/server/users";

const id = z.string().min(1).max(64);
export const writingInput = z
  .object({ exerciseId: id, text: z.string().trim().min(1, "Write something first").max(4000) })
  .strict();
export const submissionIdInput = z.object({ id }).strict();
export const correctionInput = z
  .object({
    submissionId: id,
    correctedText: z.string().trim().min(1, "Write the corrected version").max(4000),
    comment: z.string().trim().max(2000),
  })
  .strict();
export const ratingInput = z
  .object({ correctionId: id, rating: z.number().int().min(1).max(5) })
  .strict();

export const MAX_RECORDING_BYTES = 5 * 1024 * 1024;

/** A prompt of the given kind in a course the member may open. */
async function promptFor(exerciseId: string, kind: "writing" | "speaking", admin: boolean) {
  const [row] = await db
    .select({ prompt: exercises.prompt, type: exercises.type, language: courses.language, published: courses.published })
    .from(exercises)
    .innerJoin(lessons, eq(lessons.id, exercises.lessonId))
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(eq(exercises.id, exerciseId));
  if (!row || (!row.published && !admin)) return { status: "missing" as const };
  if (row.type !== kind) return { status: "wrongKind" as const };
  return { status: "ok" as const, prompt: row.prompt, language: row.language };
}

export async function submitWriting(userId: string, input: z.infer<typeof writingInput>, admin: boolean) {
  const found = await promptFor(input.exerciseId, "writing", admin);
  if (found.status !== "ok") refuse("No such writing prompt");
  const submissionId = crypto.randomUUID();
  await db.insert(submissions).values({
    id: submissionId,
    userId,
    exerciseId: input.exerciseId,
    language: found.language,
    kind: "writing",
    prompt: found.prompt,
    text: input.text,
  });
  return { id: submissionId };
}

/** Stores a recorded answer to a speaking prompt; status codes for the route. */
export async function submitRecording(
  bucket: R2Bucket,
  userId: string,
  exerciseId: string,
  audio: ArrayBuffer,
  contentType: string,
  admin: boolean,
): Promise<{ status: 201; id: string } | { status: 400 | 404 | 413; error: string }> {
  const found = await promptFor(exerciseId, "speaking", admin);
  if (found.status === "missing") return { status: 404, error: "No such exercise" };
  if (found.status === "wrongKind") return { status: 400, error: "Not a speaking prompt" };
  if (audio.byteLength === 0) return { status: 400, error: "Empty recording" };
  if (audio.byteLength > MAX_RECORDING_BYTES) return { status: 413, error: "Recording too long" };
  const submissionId = crypto.randomUUID();
  const key = `recordings/${submissionId}`;
  await bucket.put(key, audio, { httpMetadata: { contentType } });
  await db.insert(submissions).values({
    id: submissionId,
    userId,
    exerciseId,
    language: found.language,
    kind: "speaking",
    prompt: found.prompt,
    audioKey: key,
  });
  return { status: 201, id: submissionId };
}

const listed = {
  id: submissions.id,
  kind: submissions.kind,
  language: submissions.language,
  prompt: submissions.prompt,
  text: submissions.text,
  createdAt: submissions.createdAt,
  author: users.email,
};

interface Listed {
  id: string;
  kind: string;
  language: string;
  prompt: string;
  text: string;
  createdAt: string;
  author: string | null;
}

async function correctionCounts(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await db
    .select({ id: corrections.submissionId, n: count() })
    .from(corrections)
    .where(inArray(corrections.submissionId, ids))
    .groupBy(corrections.submissionId);
  return new Map(rows.map((r) => [r.id, r.n]));
}

export async function communityOverview(userId: string) {
  const languages = await languagesOf(userId);
  const [toCorrect, mine, [given], [received]] = await Promise.all([
    languages.length
      ? db
          .select(listed)
          .from(submissions)
          .leftJoin(users, eq(users.id, submissions.userId))
          .where(and(inArray(submissions.language, languages), ne(submissions.userId, userId)))
          .orderBy(desc(submissions.createdAt))
          .limit(100)
      : Promise.resolve([] as Listed[]),
    db
      .select(listed)
      .from(submissions)
      .leftJoin(users, eq(users.id, submissions.userId))
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt)),
    db.select({ n: count() }).from(corrections).where(eq(corrections.userId, userId)),
    db
      .select({ n: count() })
      .from(corrections)
      .innerJoin(submissions, eq(submissions.id, corrections.submissionId))
      .where(eq(submissions.userId, userId)),
  ]);
  const counts = await correctionCounts([...toCorrect, ...mine].map((s) => s.id));
  const withCount = <T extends { id: string }>(s: T) => ({ ...s, corrections: counts.get(s.id) ?? 0 });
  return {
    languages,
    toCorrect: toCorrect.map(withCount),
    mine: mine.map(withCount),
    given: given?.n ?? 0,
    received: received?.n ?? 0,
  };
}

/** The submission when the member wrote it or knows its language; else null. */
async function visibleSubmission(userId: string, submissionId: string) {
  const [row] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
  if (!row) return null;
  if (row.userId === userId) return row;
  const languages = await languagesOf(userId);
  return languages.includes(row.language) ? row : null;
}

export async function getSubmission(userId: string, submissionId: string) {
  const row = await visibleSubmission(userId, submissionId);
  if (!row) return null;
  const [author] = await db.select({ email: users.email }).from(users).where(eq(users.id, row.userId));
  const list = await db
    .select({
      id: corrections.id,
      correctedText: corrections.correctedText,
      comment: corrections.comment,
      rating: corrections.rating,
      createdAt: corrections.createdAt,
      userId: corrections.userId,
      corrector: users.email,
    })
    .from(corrections)
    .leftJoin(users, eq(users.id, corrections.userId))
    .where(eq(corrections.submissionId, submissionId))
    .orderBy(corrections.createdAt);
  const isAuthor = row.userId === userId;
  return {
    submission: {
      id: row.id,
      kind: row.kind,
      language: row.language,
      prompt: row.prompt,
      text: row.text,
      hasAudio: Boolean(row.audioKey),
      createdAt: row.createdAt,
      author: author?.email ?? "",
    },
    isAuthor,
    corrections: list.map(({ userId: by, ...c }) => ({ ...c, mine: by === userId })),
  };
}

export async function addCorrection(userId: string, input: z.infer<typeof correctionInput>) {
  const row = await visibleSubmission(userId, input.submissionId);
  if (!row) refuse("No such submission");
  if (row.userId === userId) refuse("You can't correct your own submission");
  await db.insert(corrections).values({ id: crypto.randomUUID(), userId, ...input });
}

export async function rateCorrection(userId: string, { correctionId, rating }: z.infer<typeof ratingInput>) {
  const [row] = await db
    .select({ author: submissions.userId })
    .from(corrections)
    .innerJoin(submissions, eq(submissions.id, corrections.submissionId))
    .where(eq(corrections.id, correctionId));
  if (!row || row.author !== userId) refuse("Only the author can rate corrections");
  await db.update(corrections).set({ rating }).where(eq(corrections.id, correctionId));
}

export async function deleteSubmission(bucket: R2Bucket, userId: string, submissionId: string) {
  const [row] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.userId, userId)));
  if (!row) refuse("No such submission");
  await db.batch([
    db.delete(corrections).where(eq(corrections.submissionId, submissionId)),
    db.delete(submissions).where(eq(submissions.id, submissionId)),
  ]);
  if (row.audioKey) await bucket.delete(row.audioKey);
}

/** The recording, when the member may see its submission. */
export async function recordingFor(bucket: R2Bucket, userId: string, submissionId: string) {
  const row = await visibleSubmission(userId, submissionId);
  if (!row?.audioKey) return null;
  return bucket.get(row.audioKey);
}
