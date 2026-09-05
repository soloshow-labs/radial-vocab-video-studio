import type {FastifyInstance} from "fastify";
import type {TtsProvider, TtsSynthesisRequest} from "../tts/types";

const TTS_REQUEST_BODY_MAX_BYTES = 16 * 1024;

export function registerTtsRoutes(app: FastifyInstance, provider: TtsProvider) {
  app.get("/api/tts/status", async () => ({configured: provider.configured, provider: "azure-speech" as const}));

  app.get("/api/tts/voices", async () => ({voices: await provider.listVoices()}));

  app.post("/api/tts/test", async () => {
    await provider.testConnection();
    return {ok: true};
  });

  app.post<{Body: TtsSynthesisRequest}>("/api/tts/preview", {bodyLimit: TTS_REQUEST_BODY_MAX_BYTES}, async (request, reply) => {
    const result = await provider.synthesize(request.body);
    return reply
      .header("Content-Type", result.mime)
      .header("X-Audio-Duration-Ms", String(Math.round(result.durationSec * 1000)))
      .send(result.audio);
  });
}
