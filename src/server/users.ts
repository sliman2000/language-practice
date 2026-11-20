import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { LANGUAGES } from "@/lib/learning";

export interface Member {
  id: string;
  email: string;
}

/** The member's own row, made the first time the app sees them. */
export async function ensureUser(member: Member): Promise<void> {
  await db
    .insert(users)
    .values({ id: member.id, email: member.email })
    .onConflictDoUpdate({ target: users.id, set: { email: member.email } });
}

export const profileInput = z
  .object({
    nativeLanguage: z.enum(LANGUAGES).nullable(),
    knownLanguages: z.array(z.enum(LANGUAGES)).max(LANGUAGES.length),
  })
  .strict();

export interface Profile {
  email: string;
  nativeLanguage: string | null;
  knownLanguages: string[];
}

export async function getProfile(member: Member): Promise<Profile> {
  await ensureUser(member);
  const [row] = await db.select().from(users).where(eq(users.id, member.id));
  return {
    email: member.email,
    nativeLanguage: row?.nativeLanguage ?? null,
    knownLanguages: parseLanguages(row?.knownLanguages),
  };
}

export async function saveProfile(
  member: Member,
  input: z.infer<typeof profileInput>,
): Promise<Profile> {
  await ensureUser(member);
  await db
    .update(users)
    .set({
      nativeLanguage: input.nativeLanguage,
      knownLanguages: JSON.stringify([...new Set(input.knownLanguages)]),
    })
    .where(eq(users.id, member.id));
  return getProfile(member);
}

/** Native and known languages together: what the member can correct. */
export async function languagesOf(userId: string): Promise<string[]> {
  const [row] = await db
    .select({ native: users.nativeLanguage, known: users.knownLanguages })
    .from(users)
    .where(eq(users.id, userId));
  if (!row) return [];
  const all = parseLanguages(row.known);
  if (row.native) all.push(row.native);
  return [...new Set(all)];
}

function parseLanguages(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
