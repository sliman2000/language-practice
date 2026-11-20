import { defineEveryApp } from "@every-app/sdk";

export default defineEveryApp({
  id: "language-practice",
  name: "Language Practice",
  description:
    "Study levelled language courses, review vocabulary on a spaced schedule, keep a study plan and correct each other's writing and speaking.",
  resources: {
    d1: ["DB"],
    r2: ["files"],
  },
});
