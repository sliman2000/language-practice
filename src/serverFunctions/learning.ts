import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { isAdmin } from "@every-app/sdk/server";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as community from "@/server/community";
import * as plan from "@/server/plan";
import * as player from "@/server/player";
import * as review from "@/server/review";
import * as users from "@/server/users";

export const getLesson = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => player.lessonIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const lesson = await player.getLessonForPlayer(data.id, isAdmin(context.user));
    return lesson ? { ...lesson, nextLessonId: await player.nextLessonId(data.id) } : null;
  });

export const checkAnswer = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => player.checkInput.parse(data))
  .handler(({ data, context }) => player.checkAnswer(data, isAdmin(context.user)));

export const finishLesson = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => player.finishInput.parse(data))
  .handler(({ data, context }) =>
    player.finishLesson(context.user.id, data, isAdmin(context.user)),
  );

export const getReview = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => review.reviewOverview(context.user.id));

export const getDueItems = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => review.dueItems(context.user.id));

export const gradeReview = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => review.gradeInput.parse(data))
  .handler(({ data, context }) => review.gradeReview(context.user.id, data));

export const finishReview = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => review.sessionInput.parse(data))
  .handler(({ data, context }) => review.finishSession(context.user.id, data));

export const getPlan = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => plan.getPlan(context.user.id));

export const savePlan = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => plan.planInput.parse(data))
  .handler(({ data, context }) => plan.savePlan(context.user.id, data));

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => plan.deletePlan(context.user.id));

export const getProfile = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => users.getProfile(context.user));

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => users.profileInput.parse(data))
  .handler(({ data, context }) => users.saveProfile(context.user, data));

export const submitWriting = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => community.writingInput.parse(data))
  .handler(async ({ data, context }) => {
    await users.ensureUser(context.user);
    return community.submitWriting(context.user.id, data, isAdmin(context.user));
  });

export const getCommunity = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(async ({ context }) => {
    await users.ensureUser(context.user);
    return community.communityOverview(context.user.id);
  });

export const getSubmission = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => community.submissionIdInput.parse(data))
  .handler(async ({ data, context }) => {
    await users.ensureUser(context.user);
    return community.getSubmission(context.user.id, data.id);
  });

export const addCorrection = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => community.correctionInput.parse(data))
  .handler(({ data, context }) => community.addCorrection(context.user.id, data));

export const rateCorrection = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => community.ratingInput.parse(data))
  .handler(({ data, context }) => community.rateCorrection(context.user.id, data));

export const deleteSubmission = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => community.submissionIdInput.parse(data))
  .handler(({ data, context }) =>
    community.deleteSubmission(env.files, context.user.id, data.id),
  );
