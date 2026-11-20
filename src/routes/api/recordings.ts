import { createFileRoute } from "@tanstack/react-router";
import { getEveryAppUser, isAdmin } from "@every-app/sdk/server";
import { env } from "cloudflare:workers";
import { MAX_RECORDING_BYTES, submitRecording } from "@/server/community";
import { ensureUser } from "@/server/users";

// The lesson player posts a recorded answer to a speaking prompt here
// (?exerciseId=...), the clip as the body. Private like every route.
export const Route = createFileRoute("/api/recordings")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await getEveryAppUser(request, env);
        if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });
        const exerciseId = new URL(request.url).searchParams.get("exerciseId") ?? "";
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_RECORDING_BYTES)
          return Response.json({ error: "Recording too long" }, { status: 413 });
        const type = request.headers.get("content-type") ?? "";
        if (!type.startsWith("audio/"))
          return Response.json({ error: "Send an audio clip" }, { status: 400 });
        await ensureUser(user);
        const result = await submitRecording(
          env.files,
          user.id,
          exerciseId,
          await request.arrayBuffer(),
          type.split(";")[0]!,
          isAdmin(user),
        );
        return result.status === 201
          ? Response.json({ id: result.id }, { status: 201 })
          : Response.json({ error: result.error }, { status: result.status });
      },
    },
  },
});
