import { describe, expect, it } from "vitest";
import {
  currentStreak,
  estimatedFinish,
  isCorrect,
  nextReview,
  strengthGroup,
  weekStart,
} from "./learning";

const now = new Date("2026-11-20T10:00:00Z");

describe("answers", () => {
  it("ignores case and surrounding space", () => {
    expect(isCorrect("  GRACIAS ", "gracias")).toBe(true);
    expect(isCorrect("café  con leche", "Café con leche")).toBe(true);
    expect(isCorrect("graciass", "gracias")).toBe(false);
  });
});

describe("spaced repetition", () => {
  it("raises strength and schedules further out when correct", () => {
    expect(nextReview(0, true, now)).toEqual({
      strength: 1,
      dueAt: "2026-11-21T10:00:00.000Z",
    });
    expect(nextReview(5, true, now).strength).toBe(5);
  });
  it("resets to weakest and due now when wrong", () => {
    expect(nextReview(4, false, now)).toEqual({
      strength: 0,
      dueAt: now.toISOString(),
    });
  });
  it("groups strengths", () => {
    expect([0, 1, 3, 4, 5].map(strengthGroup)).toEqual([
      "weak",
      "medium",
      "medium",
      "strong",
      "strong",
    ]);
  });
});

describe("study plan", () => {
  it("counts a streak ending today or yesterday", () => {
    expect(currentStreak(["2026-11-18", "2026-11-19", "2026-11-20"], now)).toBe(3);
    expect(currentStreak(["2026-11-18", "2026-11-19"], now)).toBe(2);
    expect(currentStreak(["2026-11-17"], now)).toBe(0);
  });
  it("starts weeks on Monday", () => {
    expect(weekStart(now)).toBe("2026-11-16");
  });
  it("estimates a finish date from the weekly pace", () => {
    // 6 lessons, 2 a day, 3 days a week: 3 study days, 7 calendar days.
    expect(estimatedFinish(6, 3, 20, now)).toBe("2026-11-27");
    expect(estimatedFinish(0, 3, 20, now)).toBe("2026-11-20");
  });
});
