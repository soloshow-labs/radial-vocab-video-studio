import {randomBytes} from "node:crypto";
import {resolve} from "node:path";

export type ServerConfig = {
  host: "127.0.0.1";
  port: number;
  uiOrigin: string;
  sessionToken: string;
  storageDir: string;
  videoMaxBytes: number;
  audioMaxBytes: number;
};

export function loadServerConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): ServerConfig {
  return {
    host: "127.0.0.1",
    port: boundedPort(env.RADIAL_SERVER_PORT, 4317),
    uiOrigin: normalizeOrigin(env.RADIAL_UI_ORIGIN ?? "http://127.0.0.1:5173"),
    sessionToken: validSessionToken(env.RADIAL_SESSION_TOKEN) ?? randomBytes(32).toString("base64url"),
    storageDir: resolve(cwd, "storage"),
    videoMaxBytes: 500 * 1024 * 1024,
    audioMaxBytes: 30 * 1024 * 1024,
  };
}

function validSessionToken(value: string | undefined): string | undefined {
  const token = value?.trim();
  return token && /^[A-Za-z0-9_-]{40,128}$/.test(token) ? token : undefined;
}

function boundedPort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65_535 ? parsed : fallback;
}

function normalizeOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid_ui_origin");
  return url.origin;
}
