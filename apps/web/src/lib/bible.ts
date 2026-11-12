import { env } from "cloudflare:workers";
// @ts-ignore
import { toJSON } from "usfm-js";

export interface Translation {
  id: string;
  language: string;
  name: string;
  abbreviation: string;
  source_url: string | null;
  license: string;
  version: number;
  active: number;
  created_at: string;
}

export interface BibleBook {
  id: number;
  name_en: string;
  name_es: string;
  abbreviation_en: string;
  abbreviation_es: string;
}

export interface BibleVerse {
  id: string;
  translation_id: string;
  book_number: number;
  chapter: number;
  verse: number;
  text: string;
}

export type NewBibleVerse = Omit<BibleVerse, "id">;

export interface ParsedUSFM {
  headers: Array<{ tag: string; content: string }>;
  chapters: Record<
    string,
    Record<
      string,
      {
        verseObjects: VerseObject[];
      }
    >
  >;
}

export interface ParsedUsfmText {
  headers: Array<{ tag: string; content: string }>;
  chapters: Record<string, Record<string, string>>;
}

interface VerseObject {
  text: string;
  type: string;
}

function joinVerse(verseObjects: VerseObject[]) {
  return verseObjects
    .filter(
      ({ text, type }) =>
        typeof text === "string" && text.length && type !== "footnote",
    )
    .map(({ text }) => normalizeBibleText(text))
    .join("");
}

function normalizeBibleText(text: string): string {
  return text;
}

export function parseUsfm(content: string): ParsedUsfmText {
  const parsed = toJSON(content) as ParsedUSFM;
  const chapters: ParsedUsfmText["chapters"] = {};

  for (const [chapter, rawVerses] of Object.entries(parsed.chapters ?? {})) {
    if (!/^\d+$/.test(chapter)) continue;
    const verses: Record<string, string> = {};
    for (const [verse, { verseObjects }] of Object.entries(rawVerses ?? {})) {
      if (!/^\d+$/.test(verse)) continue;
      verses[verse] = joinVerse(verseObjects);
    }
    chapters[chapter] = verses;
  }

  return { headers: parsed.headers ?? [], chapters };
}

export function chunk(size: number) {
  return function chunkFn<T>(arr: T[], chunks: T[][] = []) {
    if (arr.length - 1 < size) {
      return function* () {
        for (const chunk of [...chunks, arr]) {
          yield chunk;
        }
      }
    }
    return chunkFn(arr.slice(size, arr.length - 1), [...chunks, arr.slice(0, size)])
  }
}

export async function writeVerses(verses: NewBibleVerse[]) {
  if (verses.length === 0) return [];

  const statement = env.DB.prepare(`
    INSERT INTO bible_verses (
      id,
      translation_id,
      book_number,
      chapter,
      verse,
      text,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (translation_id, book_number, chapter, verse)
    DO UPDATE SET
      text = excluded.text
  `);

  const results = [];
  for (let offset = 0; offset < verses.length; offset += 100) {
    results.push(
      ...(await env.DB.batch(
        verses.slice(offset, offset + 100).map((verse) => {
          const id = [
            verse.translation_id,
            verse.book_number,
            verse.chapter,
            verse.verse,
          ].join("-");

          return statement.bind(
            id,
            verse.translation_id,
            verse.book_number,
            verse.chapter,
            verse.verse,
            verse.text,
            new Date().toISOString(),
          );
        }),
      )),
    );
  }
  return results;
}
