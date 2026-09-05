import {afterEach, describe, expect, it, vi} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {queueRender, resetApiSession, uploadAsset} from "../../src/app/api";

afterEach(() => {
  resetApiSession();
  vi.unstubAllGlobals();
});

describe("local API client", () => {
  it("fetches an ephemeral session and authenticates uploads without exposing keys", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({sessionToken: "a".repeat(43)}))
      .mockResolvedValueOnce(Response.json({asset: {id: `asset_${"b".repeat(32)}`, name: "background.mp4", kind: "video"}}, {status: 201}));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["video"], "background.mp4", {type: "video/mp4"});
    await uploadAsset("video", file);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/session");
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(request.headers).get("X-Radial-Session")).toBe("a".repeat(43));
    expect(String(request.body)).not.toContain("a".repeat(43));
  });

  it("sends the versioned project to the render queue", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({sessionToken: "c".repeat(43)}))
      .mockResolvedValueOnce(Response.json({id: "d".repeat(32), status: "queued", progress: 0, stage: "queued"}, {status: 202}));
    vi.stubGlobal("fetch", fetchMock);
    await queueRender(createDefaultProject());
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({project: {version: 1, root: {text: "mate"}}});
  });
});
