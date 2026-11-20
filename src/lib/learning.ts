// Pure rules shared by the server and its unit tests.

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];

export const LANGUAGES = [
  "Arabic",
  "Chinese",
  "Dutch",
  "English",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Polish",
  "Portuguese",
  "Russian",
  "Spanish",
  "Turkish",
] as const;

export const EXERCISE_TYPES = ["mc", "type", "gap", "writing", "speaking"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  mc: "Multiple choice",
  type: "Type the answer",
  gap: "Fill the gap",
  writing: "Writing",
  speaking: "Speaking",
};

export function isGraded(type: string): boolean {
  return type === "mc" || type === "type" || type === "gap";
}

/** Case and surrounding or repeated space don't count against an answer. */
export function normalize(answer: string): string {
  return answer.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function isCorrect(given: string, expected: string): boolean {
  return normalize(given) === normalize(expected);
}

/** Days until the next review, by strength after a correct answer. */
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;

export function nextReview(
  strength: number,
  correct: boolean,
  now: Date,
): { strength: number; dueAt: string } {
  if (!correct) return { strength: 0, dueAt: now.toISOString() };
  const next = Math.min(5, strength + 1);
  return {
    strength: next,
    dueAt: new Date(now.getTime() + INTERVAL_DAYS[next]! * DAY).toISOString(),
  };
}

export type StrengthGroup = "weak" | "medium" | "strong";

export function strengthGroup(strength: number): StrengthGroup {
  if (strength <= 0) return "weak";
  if (strength <= 3) return "medium";
  return "strong";
}

/** "2026-11-20" for a moment, in UTC. */
export function dayOf(moment: string | Date): string {
  return new Date(moment).toISOString().slice(0, 10);
}

/** Consecutive study days ending today, or yesterday when today has none yet. */
export function currentStreak(days: Iterable<string>, today: Date): number {
  const set = new Set(days);
  let cursor = new Date(dayOf(today) + "T00:00:00Z");
  if (!set.has(dayOf(cursor))) cursor = new Date(cursor.getTime() - DAY);
  let streak = 0;
  while (set.has(dayOf(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return streak;
}

/** Monday of the week holding `today`, in UTC. */
export function weekStart(today: Date): string {
  const start = new Date(dayOf(today) + "T00:00:00Z");
  const weekday = (start.getUTCDay() + 6) % 7;
  return dayOf(new Date(start.getTime() - weekday * DAY));
}

/** Minutes one lesson is planned to take. */
export const LESSON_MINUTES = 10;

/** The day the remaining lessons are done at the plan's weekly pace. */
export function estimatedFinish(
  remaining: number,
  daysPerWeek: number,
  minutesPerDay: number,
  today: Date,
): string {
  const perDay = Math.max(1, Math.floor(minutesPerDay / LESSON_MINUTES));
  const studyDays = Math.ceil(remaining / perDay);
  const calendarDays = Math.ceil((studyDays / daysPerWeek) * 7);
  return dayOf(new Date(today.getTime() + calendarDays * DAY));
}
