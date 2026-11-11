import app from "vinext/server/fetch-handler";
import { ingestTranslation, markIngestionFailed } from "./lib/bible-ingestion";
import { type WorkflowEvent, WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";

type IngestionParams = { translationId: string };

export class BibleIngestionWorkflow extends WorkflowEntrypoint<
  { DB: D1Database },
  IngestionParams
> {
  async run(event: WorkflowEvent<IngestionParams>, step: WorkflowStep) {
    try {
      await step.do(
        "ingest translation",
        { retries: { limit: 5, delay: "30 seconds", backoff: "exponential" } },
        async () => ingestTranslation(this.env.DB, event.payload.translationId),
      );
    } catch (error) {
      await markIngestionFailed(this.env.DB, event.payload.translationId, error);
      throw error;
    }
  }
}

export default {
  fetch: app.fetch,
};
