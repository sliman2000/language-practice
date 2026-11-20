import { isAdmin } from "@every-app/sdk/server";

/** A refusal whose message the page may show. */
export class Refusal extends Error {}

export function refuse(message: string): never {
  throw new Refusal(message);
}

export function adminOnly(user: Parameters<typeof isAdmin>[0]): void {
  if (!isAdmin(user)) refuse("Only admins can edit courses");
}
