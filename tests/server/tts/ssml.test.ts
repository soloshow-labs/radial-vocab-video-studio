import {describe, expect, it} from "vitest";
import {buildSsml, parseRate} from "../../../src/server/tts/ssml";

describe("Azure SSML", () => {
  it("escapes text and emits a bounded pause", () => {
    const ssml = buildSsml({text: `<mate> & "friends" 'now'`, voice: "en-US-JennyNeural", rate: "+10%", breakMs: 450});
    expect(ssml).toContain("&lt;mate&gt; &amp; &quot;friends&quot; &apos;now&apos;");
    expect(ssml).toContain('rate="+10%"');
    expect(ssml).toContain('<break time="450ms"/>');
  });

  it("uses separate voices for English and Chinese", () => {
    const ssml = buildSsml({
      text: "mate",
      voice: "en-US-JennyNeural",
      secondaryText: "伙伴",
      secondaryVoice: "zh-CN-XiaoxiaoNeural",
      rate: "+0%",
    });

    expect(ssml).toContain('<voice name="en-US-JennyNeural">');
    expect(ssml).toContain('<voice name="zh-CN-XiaoxiaoNeural">');
    expect(ssml).toContain("伙伴");
  });

  it.each(["voice", "en-us-jennyneural", "en-US-Jenny", "../../secret"])("rejects invalid voice %s", (voice) => {
    expect(() => buildSsml({text: "hello", voice, rate: "+0%"})).toThrowError(expect.objectContaining({code: "invalid_tts_voice"}));
  });

  it("accepts current Azure HD voice identifiers without allowing markup", () => {
    expect(() => buildSsml({text: "hello", voice: "en-US-Jenny:DragonHDLatestNeural", rate: "+0%"})).not.toThrow();
    expect(() => buildSsml({text: "hello", voice: 'en-US-Jenny\"/><break', rate: "+0%"})).toThrowError(
      expect.objectContaining({code: "invalid_tts_voice"}),
    );
  });

  it.each(["-51%", "+101%", "fast", "10"])("rejects invalid rate %s", (rate) => {
    expect(() => parseRate(rate)).toThrowError(expect.objectContaining({code: "invalid_tts_rate"}));
  });

  it("rejects invalid breaks and control characters", () => {
    expect(() => buildSsml({text: "hello", voice: "en-US-JennyNeural", rate: "+0%", breakMs: 5001})).toThrowError(expect.objectContaining({code: "invalid_tts_break"}));
    expect(() => buildSsml({text: "bad\u0000text", voice: "en-US-JennyNeural", rate: "+0%"})).toThrowError(expect.objectContaining({code: "invalid_tts_text"}));
  });
});
