CREATE TABLE translation_ingestions (
    translation_id  TEXT PRIMARY KEY,
    status          TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_verses    INTEGER NOT NULL DEFAULT 0 CHECK (total_verses >= 0),
    inserted_verses INTEGER NOT NULL DEFAULT 0 CHECK (inserted_verses >= 0),
    error_message   TEXT,
    started_at      TEXT,
    completed_at    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE
);

CREATE INDEX idx_translation_ingestions_status
    ON translation_ingestions(status, updated_at);
