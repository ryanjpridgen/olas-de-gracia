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
  headers: Record<string, {}>;
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

interface VerseObject {
  text: string;
  type: "word" | "footnote";
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

export function parseUsfm(content: string) {
  const parsed = toJSON(content) as ParsedUSFM;
  // const books = parsed.filter((book) => Object.keys(book).length)
  return {
    ...parsed,
    chapters: Object.keys(parsed.chapters).reduce(
      (obj, key) =>
        isNaN(parseInt(key))
          ? obj
          : {
              ...obj,
              [key]: Object.entries(parsed.chapters[key]).reduce(
                (verses, [verse, { verseObjects }]) =>
                  isNaN(parseInt(verse))
                    ? verses
                    : { ...verses, [verse]: joinVerse(verseObjects) },
                {},
              ),
            },
      {},
    ),
  };
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
      text
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (translation_id, book_number, chapter, verse)
    DO UPDATE SET
      text = excluded.text
  `);

  return env.DB.batch(
    verses.map((verse) => {
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
      );
    }),
  );
}
