import { createFileRoute } from "@tanstack/react-router";
import { getEveryAppUser } from "@every-app/sdk/server";
import { env } from "cloudflare:workers";
import { recordingFor } from "@/server/community";

// A recording, for its author and members who know its language.
export const Route = createFileRoute("/api/recordings/$submissionId")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { submissionId: string } }) => {
        const user = await getEveryAppUser(request, env);
        if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });
        const object = await recordingFor(env.files, user.id, params.submissionId);
        if (!object) return Response.json({ error: "Not found" }, { status: 404 });
        return new Response(object.body, {
          headers: {
            "content-type": object.httpMetadata?.contentType ?? "audio/webm",
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
