PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1. Shared reference data
-- ---------------------------------------------------------------------------

CREATE TABLE translations (
    id              TEXT PRIMARY KEY,
    language        TEXT NOT NULL CHECK (language IN ('en', 'es')),
    name            TEXT NOT NULL,
    abbreviation    TEXT NOT NULL,
    source_url      TEXT,
    license         TEXT NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE (language, abbreviation)
);

CREATE INDEX idx_translations_language_active
    ON translations(language, active);

CREATE TABLE bible_books (
    id              INTEGER PRIMARY KEY,
    name_en         TEXT NOT NULL,
    name_es         TEXT NOT NULL,
    abbreviation_en TEXT NOT NULL,
    abbreviation_es TEXT NOT NULL,
    testament       TEXT NOT NULL CHECK (testament IN ('old', 'new')),
    UNIQUE (name_en),
    UNIQUE (name_es)
);

-- Alternate spellings and localized abbreviations are normalized here so
-- explicit references can be resolved deterministically before vector search.
CREATE TABLE bible_book_aliases (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_number     INTEGER NOT NULL,
    language        TEXT NOT NULL CHECK (language IN ('en', 'es')),
    alias           TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    FOREIGN KEY (book_number) REFERENCES bible_books(id) ON DELETE CASCADE,
    UNIQUE (language, normalized_alias)
);

CREATE INDEX idx_bible_book_aliases_lookup
    ON bible_book_aliases(language, normalized_alias);

-- ---------------------------------------------------------------------------
-- 2. Canonical Bible text
-- ---------------------------------------------------------------------------

CREATE TABLE bible_verses (
    id              TEXT PRIMARY KEY,
    translation_id  TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL CHECK (chapter > 0),
    verse           INTEGER NOT NULL CHECK (verse > 0),
    text            TEXT NOT NULL CHECK (length(trim(text)) > 0),
    created_at      TEXT NOT NULL,
    FOREIGN KEY (translation_id) REFERENCES translations(id),
    FOREIGN KEY (book_number) REFERENCES bible_books(id),
    UNIQUE (translation_id, book_number, chapter, verse)
);

CREATE INDEX idx_bible_verses_reference
    ON bible_verses(translation_id, book_number, chapter, verse);

-- Derived/searchable passages. bible_verses remains the canonical source.
-- Passage construction must be deterministic and must not cross book
-- boundaries. Chapter crossings are allowed only for continuous literary units.
CREATE TABLE bible_passages (
    id              TEXT PRIMARY KEY,
    translation_id  TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL CHECK (chapter > 0),
    verse_start     INTEGER NOT NULL CHECK (verse_start > 0),
    verse_end       INTEGER NOT NULL CHECK (verse_end >= verse_start),
    text            TEXT NOT NULL CHECK (length(trim(text)) > 0),
    content_type    TEXT NOT NULL DEFAULT 'bible_passage'
                    CHECK (content_type = 'bible_passage'),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (translation_id) REFERENCES translations(id),
    FOREIGN KEY (book_number) REFERENCES bible_books(id),
    UNIQUE (translation_id, book_number, chapter, verse_start, verse_end)
);

CREATE INDEX idx_bible_passages_lookup
    ON bible_passages(translation_id, book_number, chapter, verse_start, verse_end);