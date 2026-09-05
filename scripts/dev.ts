import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";

const sessionToken = randomBytes(32).toString("base64url");
const child = spawn(
  "pnpm",
  ["exec", "concurrently", "--kill-others", "--names", "server,ui", "pnpm dev:server", "pnpm dev:ui"],
  {
    stdio: "inherit",
    env: {...process.env, RADIAL_SESSION_TOKEN: sessionToken},
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
