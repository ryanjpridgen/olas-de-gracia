import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

const bibleIngestionQueue = `bible-ingestion-${process.env.ENVIRONMENT ?? "development"}`;

export default defineConfig({
  worker: defineWorker({
    name: "olas-de-gracia",
    entrypoint: "./src/worker.ts",
    compatibilityDate: "2026-11-09",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      DB: bindings.d1({
        id: process.env.D1_DATABASE_ID,
        name: `odg-${process.env.ENVIRONMENT}`,
        dev: {
          remote: true,
        },
      }),
      BIBLE_INGESTION_QUEUE: bindings.queue({ name: bibleIngestionQueue }),
    },
    triggers: [
      triggers.queue({
        name: bibleIngestionQueue,
        maxBatchSize: 1,
        maxConcurrency: 2,
        maxRetries: 5,
        retryDelay: 30,
      }),
    ],
    previewUrls: true,
  }),
});
