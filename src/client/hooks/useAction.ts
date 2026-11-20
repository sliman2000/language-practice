import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

/** A readable message from a server function's error. */
export function errorMessage(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  try {
    const issues: unknown = JSON.parse(message);
    if (Array.isArray(issues) && issues[0]?.message) return String(issues[0].message);
  } catch {
    // Not a validation error.
  }
  return message || "Something went wrong";
}

/** Runs a change, then reloads the page's data; a failure becomes a toast. */
export function useAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
    setPending(true);
    try {
      const result = await work();
      await router.invalidate();
      return result;
    } catch (cause) {
      toast.error(errorMessage(cause));
      return undefined;
    } finally {
      setPending(false);
    }
  }
  return { run, pending };
}
