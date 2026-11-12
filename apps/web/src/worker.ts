import app from "vinext/server/fetch-handler";
import { fetchSource, ingestTranslation, markIngestionFailed } from "./lib/bible-ingestion";
import {
  type WorkflowEvent,
  WorkflowEntrypoint,
  WorkflowStep,
  env
} from "cloudflare:workers";

type IngestionParams = { translationId: string };

export class BibleIngestionWorkflow extends WorkflowEntrypoint<
  { DB: D1Database },
  IngestionParams
> {
  async run(event: WorkflowEvent<IngestionParams>, step: WorkflowStep) {
    try {
      const documents = await step.do("process source url", () => {
        return fetchSource(event.payload.translationId)
      })

      /**const ingest = await step.do(
        "ingest translation",
        () => ingestTranslation(env.DB, event.payload.translationId, documents),
      );*/

      return ingest
    } catch (error) {
      await markIngestionFailed(
        this.env.DB,
        event.payload.translationId,
        error,
      );
      throw error;
    }
  }
}

export default {
  fetch: app.fetch,
};
