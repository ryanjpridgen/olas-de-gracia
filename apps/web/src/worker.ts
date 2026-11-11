import app from "vinext/server/fetch-handler";
import { ingestTranslation, markIngestionFailed } from "./lib/bible-ingestion";

type IngestionMessage = { translationId: string };

export async function consumeBibleIngestion(
  batch: MessageBatch<IngestionMessage>,
  env: { DB: D1Database },
) {
  for (const message of batch.messages) {
    try {
      await ingestTranslation(env.DB, message.body.translationId);
      message.ack();
    } catch (error) {
      await markIngestionFailed(env.DB, message.body.translationId, error);
      message.retry();
    }
  }
}

export default {
  fetch: app.fetch,
  queue: consumeBibleIngestion,
};
