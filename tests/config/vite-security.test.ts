import {describe, expect, it} from "vitest";
import type {UserConfig} from "vite";
import config from "../../vite.config";

describe("Vite security headers", () => {
  it("prevents framing in development and preview responses", () => {
    const resolved = config as UserConfig;
    const expected = {
      "Content-Security-Policy": "frame-ancestors 'none'",
      "X-Frame-Options": "DENY",
    };

    expect(resolved.server?.headers).toMatchObject(expected);
    expect(resolved.preview?.headers).toMatchObject(expected);
  });
});
