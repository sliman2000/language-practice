import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { ConfigurationError, gatewayUrl, isAdmin } from "@every-app/sdk/server";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";

/** The way back to the Gateway, and whether to show the admin link. */
export const getShell = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => {
    let url: string | null = null;
    try {
      url = new URL(gatewayUrl(env)).origin;
    } catch (error) {
      if (!(error instanceof ConfigurationError)) throw error;
    }
    return { gatewayUrl: url, isAdmin: isAdmin(context.user) };
  });
