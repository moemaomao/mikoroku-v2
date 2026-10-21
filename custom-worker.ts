// @ts-nocheck
import { default as handler } from "./.open-next/worker.js";

interface ScheduledController {
  readonly cron: string;
  readonly type: string;
  readonly scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface KVNamespace {
  get(
    key: string,
    options?:
      | { type?: "text" | "json" | "arrayBuffer" | "stream" }
      | "text"
      | "json"
      | "arrayBuffer"
      | "stream"
  ): Promise<any>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { expirationTtl?: number; expiration?: number; metadata?: any }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

interface CloudflareEnv {
  MIKOROKU_CACHE?: KVNamespace;
  NEXT_INC_CACHE_KV?: KVNamespace;
  WARM_BASE_URL?: string;
  [key: string]: unknown;
}

export default {
  fetch: handler.fetch,

  async scheduled(
    controller: ScheduledController,
    env: CloudflareEnv,
    _ctx: ExecutionContext
  ) {
    const started = Date.now();
    console.log(
      `[cron] triggered ${controller.cron} at ${new Date(controller.scheduledTime).toISOString()}`
    );

    const base =
      (typeof env.WARM_BASE_URL === "string" && env.WARM_BASE_URL) ||
      "https://mikoroku-v2.moemaomao.workers.dev";

    const pagesToWarm = [
      "/",
      "/manga-list",
      "/hentai-list",
      "/genre-list",
      "/bookmark",
      "/catalog",
    ];

    const results = await Promise.allSettled(
      pagesToWarm.map(async (path) => {
        const url = `${base}${path}`;
        const res = await fetch(url, {
          headers: {
            "x-cron-warm": "1",
            "user-agent": "mikoroku-cron-warmer/1.0",
          },
        } as RequestInit);
        return { path, status: res.status };
      })
    );

    const summary = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { path: pagesToWarm[i], error: String(r.reason) };
    });

    console.log("[cron] warm result:", JSON.stringify(summary));
    console.log(`[cron] finished in ${Date.now() - started}ms`);

    try {
      const kv = env.MIKOROKU_CACHE as KVNamespace | undefined;
      if (kv) {
        await kv.put("cron:last-run", new Date().toISOString(), {
          expirationTtl: 86400 * 7,
        });
      }
    } catch (e) {
      console.error("[cron] failed to write last-run", e);
    }
  },
};

