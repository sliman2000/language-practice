import { createServerFn } from "@tanstack/react-start";
import { isAdmin } from "@every-app/sdk/server";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as courses from "@/server/courses";
import { adminOnly } from "@/server/errors";

export const getCatalog = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.catalogInput.parse(data))
  .handler(({ data, context }) => courses.listCatalog(context.user.id, data));

export const getMyCourses = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => courses.listMyCourses(context.user.id));

export const getCourse = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) =>
    courses.getCourseOutline(context.user.id, data.id, isAdmin(context.user)),
  );

export const enrol = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) => courses.enrol(context.user.id, data.id));

export const leaveCourse = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) => courses.leave(context.user.id, data.id));

// ----- Authoring: every function refuses a member who isn't an admin. -----


/** Pages read `{ forbidden: true }` instead of an error. */
export const getAdminCourses = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(async ({ context }) =>
    isAdmin(context.user)
      ? { forbidden: false as const, courses: await courses.listAllCourses() }
      : { forbidden: true as const },
  );

export const getCourseForEdit = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(async ({ data, context }) =>
    isAdmin(context.user)
      ? { forbidden: false as const, data: await courses.getCourseForEdit(data.id) }
      : { forbidden: true as const },
  );

export const getLessonForEdit = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(async ({ data, context }) =>
    isAdmin(context.user)
      ? { forbidden: false as const, data: await courses.getLessonForEdit(data.id) }
      : { forbidden: true as const },
  );

export const createCourse = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.courseInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.createCourse(context.user.id, data);
  });

export const updateCourse = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.courseUpdateInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.updateCourse(data);
  });

export const setPublished = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.publishInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.setPublished(data);
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.deleteCourse(data.id);
  });

export const addUnit = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.unitInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.addUnit(data);
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.deleteUnit(data.id);
  });

export const addLesson = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.lessonInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.addLesson(data);
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.deleteLesson(data.id);
  });

export const addExercise = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.exerciseInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.addExercise(data);
  });

export const deleteExercise = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.deleteExercise(data.id);
  });

export const addVocab = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.vocabInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.addVocab(data);
  });

export const deleteVocab = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.idInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.deleteVocab(data.id);
  });

export const moveUnit = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.moveInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.move("unit", data);
  });

export const moveLesson = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.moveInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.move("lesson", data);
  });

export const moveExercise = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.moveInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.move("exercise", data);
  });

export const moveVocab = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => courses.moveInput.parse(data))
  .handler(({ data, context }) => {
    adminOnly(context.user);
    return courses.move("vocab", data);
  });
