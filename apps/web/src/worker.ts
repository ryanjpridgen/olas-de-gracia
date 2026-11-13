import app from "vinext/server/fetch-handler";
import { fetchSource, ingestTranslation, markIngestionFailed } from "./lib/bible-ingestion";
import { writeVerses } from "@/lib/bible"
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

      const humanValidation = await step.waitForEvent("await human validation", { 
        type: "human-validation", 
        timeout: "1 hour" 
      })

      const batch = await step.do("batch insert verses", async () => {
        await writeVerses(documents)
      })

      /**const ingest = await step.do(
        "ingest translation",
        () => ingestTranslation(env.DB, event.payload.translationId, documents),
      );*/

      return batch
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
