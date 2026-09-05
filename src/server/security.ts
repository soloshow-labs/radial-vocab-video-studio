import {timingSafeEqual} from "node:crypto";
import type {FastifyReply, FastifyRequest} from "fastify";
import type {ServerConfig} from "./config";
import {PublicError} from "./errors";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export const ANTI_FRAMING_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
} as const;

export function createSecurityHook(config: ServerConfig) {
  return async function securityHook(request: FastifyRequest, reply: FastifyReply) {
    for (const [name, value] of Object.entries(ANTI_FRAMING_HEADERS)) reply.header(name, value);
    if (!request.url.startsWith("/api/")) return;

    const origin = request.headers.origin;
    if (origin !== undefined && origin !== config.uiOrigin) throw new PublicError("origin_not_allowed", 403);
    if (origin === config.uiOrigin) {
      reply.header("Access-Control-Allow-Origin", config.uiOrigin);
      reply.header("Vary", "Origin");
    }

    if (!MUTATION_METHODS.has(request.method)) return;
    if (origin !== config.uiOrigin) throw new PublicError("origin_required", 403);
    const token = request.headers["x-radial-session"];
    if (typeof token !== "string" || !sameToken(token, config.sessionToken)) {
      throw new PublicError("session_required", 401);
    }
  };
}

function sameToken(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
