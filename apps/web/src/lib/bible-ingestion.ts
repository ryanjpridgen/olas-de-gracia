import { unzipSync } from "fflate";
import { BibleVerse, parseUsfm, type NewBibleVerse } from "./bible";
import { env } from "cloudflare:workers"

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_USFM_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2_000;
const INSERT_BATCH_SIZE = 100;

// USFM book identifiers are stable across archives; their ordinal matches
// bible_books.id in the canonical 66-book schema.
const BOOK_IDS = [
  "GEN",
  "EXO",
  "LEV",
  "NUM",
  "DEU",
  "JOS",
  "JDG",
  "RUT",
  "1SA",
  "2SA",
  "1KI",
  "2KI",
  "1CH",
  "2CH",
  "EZR",
  "NEH",
  "EST",
  "JOB",
  "PSA",
  "PRO",
  "ECC",
  "SNG",
  "ISA",
  "JER",
  "LAM",
  "EZK",
  "DAN",
  "HOS",
  "JOL",
  "AMO",
  "OBA",
  "JON",
  "MIC",
  "NAM",
  "HAB",
  "ZEP",
  "HAG",
  "ZEC",
  "MAL",
  "MAT",
  "MRK",
  "LUK",
  "JHN",
  "ACT",
  "ROM",
  "1CO",
  "2CO",
  "GAL",
  "EPH",
  "PHP",
  "COL",
  "1TH",
  "2TH",
  "1TI",
  "2TI",
  "TIT",
  "PHM",
  "HEB",
  "JAS",
  "1PE",
  "2PE",
  "1JN",
  "2JN",
  "3JN",
  "JUD",
  "REV",
];

type TranslationSource = { id: string; source_url: string };

function getBookNumber(content: string, filename: string): number | null {
  const parsed = parseUsfm(content);
  const headerId = parsed.headers
    .find(({ tag }) => tag === "id")
    ?.content.trim()
    .split(/\s+/)[0]
    ?.toUpperCase();
  const filenameId = filename
    .split("/")
    .pop()
    ?.replace(/\.usfm$/i, "")
    .toUpperCase();
  const bookId = headerId || filenameId;
  // FRT is a USFM front-matter file, not one of the canonical Bible books.
  // Archives commonly include it alongside the 66 books, so ignore it.
  if (bookId === "FRT") return null;
  const bookNumber = BOOK_IDS.indexOf(bookId ?? "") + 1;
  if (bookNumber === 0)
    throw new Error(`Unknown USFM book identifier: ${bookId ?? filename}`);
  return bookNumber;
}

function extractVerses(
  buffer: ArrayBuffer,
  translationId: string,
): NewBibleVerse[] {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error("Source archive is empty or exceeds the 100 MB limit");
  }

  const entries = unzipSync(new Uint8Array(buffer));
  const files: Array<[string, Uint8Array]> = [];
  let totalUncompressedBytes = 0;
  const allEntries = Object.entries(entries);
  if (allEntries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("ZIP archive contains too many entries");
  }

  for (const [filename, content] of allEntries) {
    totalUncompressedBytes += content.byteLength;
    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("ZIP archive exceeds the uncompressed size limit");
    }
    if (filename.endsWith("/") || !filename.toLowerCase().endsWith(".usfm"))
      continue;
    if (content.byteLength > MAX_USFM_FILE_BYTES) {
      throw new Error(`USFM file is too large: ${filename}`);
    }
    files.push([filename, content]);
  }
  if (files.length === 0)
    throw new Error("No .usfm files found in the source ZIP");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const verses: NewBibleVerse[] = [];
  for (const [filename, bytes] of files) {
    let content: string;
    try {
      content = decoder.decode(bytes);
    } catch {
      throw new Error(`Invalid UTF-8 encoding in file: ${filename}`);
    }

    const bookNumber = getBookNumber(content, filename);
    if (bookNumber === null) continue;
    const parsed = parseUsfm(content);
    for (const [chapterKey, chapter] of Object.entries(parsed.chapters)) {
      const chapterNumber = Number.parseInt(chapterKey, 10);
      if (!Number.isInteger(chapterNumber) || chapterNumber < 1) continue;
      for (const [verseKey, text] of Object.entries(chapter)) {
        const verseNumber = Number.parseInt(verseKey, 10);
        if (!Number.isInteger(verseNumber) || verseNumber < 1 || !text.trim())
          continue;
        verses.push({
          translation_id: translationId,
          book_number: bookNumber,
          chapter: chapterNumber,
          verse: verseNumber,
          text: text.trim(),
        });
      }
    }
  }
  if (verses.length === 0)
    throw new Error("No verses were found in the source archive");
  return verses;
}

async function readArchive(response: Response): Promise<ArrayBuffer> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_ARCHIVE_BYTES) {
    throw new Error("Source archive exceeds the 100 MB limit");
  }
  if (!response.body) return response.arrayBuffer();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ARCHIVE_BYTES) {
        await reader.cancel();
        throw new Error("Source archive exceeds the 100 MB limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer.buffer;
}

export async function fetchSource(translationId: string) {
  const translation = await env.DB
    .prepare("SELECT id, source_url FROM translations WHERE id = ?")
    .bind(translationId)
    .first<TranslationSource>();
  if (!translation?.source_url)
    throw new Error("Translation has no source URL");

  await env.DB
    .prepare(
      `UPDATE translation_ingestions
       SET status = 'processing', total_verses = 0, inserted_verses = 0,
           error_message = NULL, started_at = ?, completed_at = NULL, updated_at = ?
       WHERE translation_id = ?`,
    )
    .bind(new Date().toISOString(), new Date().toISOString(), translationId)
    .run();

  const response = await fetch(translation.source_url);
  if (!response.ok)
    throw new Error(`Source download failed with HTTP ${response.status}`);
  
  return extractVerses(await readArchive(response), translationId);
}

export async function ingestTranslation(db: D1Database, translationId: string, verses: NewBibleVerse[]) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE translation_ingestions SET total_verses = ?, inserted_verses = 0, updated_at = ?
       WHERE translation_id = ?`,
    )
    .bind(verses.length, now, translationId)
    .run();

  for (let offset = 0; offset < verses.length; offset += INSERT_BATCH_SIZE) {
    const batch = verses.slice(offset, offset + INSERT_BATCH_SIZE);
    const statements = batch.map((verse) =>
      db
        .prepare(
          `INSERT INTO bible_verses (id, translation_id, book_number, chapter, verse, text, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (translation_id, book_number, chapter, verse)
           DO UPDATE SET text = excluded.text`,
        )
        .bind(
          [
            verse.translation_id,
            verse.book_number,
            verse.chapter,
            verse.verse,
          ].join("-"),
          verse.translation_id,
          verse.book_number,
          verse.chapter,
          verse.verse,
          verse.text,
          new Date().toISOString(),
        ),
    );
    await db.batch(statements);
    await db
      .prepare(
        `UPDATE translation_ingestions SET inserted_verses = ?, updated_at = ?
         WHERE translation_id = ?`,
      )
      .bind(
        Math.min(offset + batch.length, verses.length),
        new Date().toISOString(),
        translationId,
      )
      .run();
  }

  await db
    .prepare(
      `UPDATE translation_ingestions
       SET status = 'completed', inserted_verses = total_verses, completed_at = ?, updated_at = ?
       WHERE translation_id = ?`,
    )
    .bind(new Date().toISOString(), new Date().toISOString(), translationId)
    .run();
}

export async function markIngestionFailed(
  db: D1Database,
  translationId: string,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Unable to ingest translation";
  await db
    .prepare(
      `UPDATE translation_ingestions SET status = 'failed', error_message = ?, updated_at = ?
       WHERE translation_id = ?`,
    )
    .bind(message.slice(0, 1000), new Date().toISOString(), translationId)
    .run();
}
