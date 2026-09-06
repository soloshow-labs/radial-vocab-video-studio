import {describe, expect, it} from "vitest";
import {isPublicDemoMode} from "../../src/app/runtime";

describe("public demo mode", () => {
  it("is enabled by the demo build mode or an explicit deployment flag", () => {
    expect(isPublicDemoMode("demo")).toBe(true);
    expect(isPublicDemoMode("production", "true")).toBe(true);
    expect(isPublicDemoMode("production", "false")).toBe(false);
    expect(isPublicDemoMode("development")).toBe(false);
  });
});
