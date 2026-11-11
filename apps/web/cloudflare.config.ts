import { bindings, defineConfig, defineWorker, exports } from "cf/config";

const bibleIngestionWorkflow = `bible-ingestion-${process.env.ENVIRONMENT ?? "development"}`;

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
      BIBLE_INGESTION_WORKFLOW: bindings.workflow({
        name: bibleIngestionWorkflow,
        worker: "olas-de-gracia",
        exportName: "BibleIngestionWorkflow",
      }),
    },
    exports: {
      BibleIngestionWorkflow: exports.workflow({
        name: bibleIngestionWorkflow,
        concurrency: { limit: 2 },
      }),
    },
    previewUrls: true,
  }),
});
