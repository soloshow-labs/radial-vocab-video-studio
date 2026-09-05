import {PublicError} from "../errors";
import type {TtsAudio, TtsProvider, TtsSynthesisRequest} from "./types";

const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_MAX_PENDING = 4;

export function limitTtsConcurrency(
  provider: TtsProvider,
  maxConcurrent = DEFAULT_MAX_CONCURRENT,
  maxPending = DEFAULT_MAX_PENDING,
): TtsProvider {
  const limiter = new AsyncLimiter(maxConcurrent, maxPending);
  return {
    get configured() {
      return provider.configured;
    },
    testConnection: () => limiter.run(() => provider.testConnection()),
    listVoices: () => provider.listVoices(),
    synthesize: (request: TtsSynthesisRequest): Promise<TtsAudio> => limiter.run(() => provider.synthesize(request)),
  };
}

class AsyncLimiter {
  private active = 0;
  private readonly pending: Array<() => void> = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxPending: number,
  ) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      if (this.pending.length >= this.maxPending) throw new PublicError("tts_busy", 429);
      await new Promise<void>((resolve) => this.pending.push(resolve));
    }

    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
      this.pending.shift()?.();
    }
  }
}
