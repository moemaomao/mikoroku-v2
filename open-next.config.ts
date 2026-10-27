import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// KV incremental cache dimatikan sementara karena menyebabkan 500 massal
// (s.get / fromJSON / resolveAll crash di custom-worker).
// Nyalakan lagi nanti setelah site stabil.
export default defineCloudflareConfig({
  // incrementalCache: kvIncrementalCache,
  queue: memoryQueue,
});
