-- V1: Initial schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT    PRIMARY KEY NOT NULL,   -- UUID v4
    title           TEXT    NOT NULL DEFAULT 'New Chat',
    model           TEXT    NOT NULL DEFAULT '',
    system_prompt   TEXT    NOT NULL DEFAULT '',
    settings_json   TEXT    NOT NULL DEFAULT '{}', -- JSON blob (ChatOptions)
    pinned          INTEGER NOT NULL DEFAULT 0,    -- boolean
    tags            TEXT    NOT NULL DEFAULT '',   -- comma-separated list
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_pinned_updated
    ON conversations (pinned DESC, updated_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
    id                  TEXT    PRIMARY KEY NOT NULL,   -- UUID v4
    conversation_id     TEXT    NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,
    role                TEXT    NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content             TEXT    NOT NULL DEFAULT '',
    images_json         TEXT    NOT NULL DEFAULT '[]', -- JSON array of base64 strings
    files_json          TEXT    NOT NULL DEFAULT '[]', -- JSON array of file metadata
    tokens_used         INTEGER,
    generation_time_ms  INTEGER,
    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at ASC);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL DEFAULT ''  -- JSON-encoded value
);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hosts (
    id               TEXT    PRIMARY KEY NOT NULL,  -- UUID v4
    name             TEXT    NOT NULL,              -- user-friendly label
    url              TEXT    NOT NULL,              -- base URL, e.g. http://localhost:11434
    is_default       INTEGER NOT NULL DEFAULT 0,   -- boolean
    is_active        INTEGER NOT NULL DEFAULT 0,   -- boolean (session-level selection)
    last_ping_status TEXT    NOT NULL DEFAULT 'unknown'
        CHECK (last_ping_status IN ('online', 'offline', 'unknown')),
    last_ping_at     TEXT,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- NOTE: auth_token is intentionally absent — stored in system keyring, never in SQLite.

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS model_cache (
    name              TEXT    PRIMARY KEY NOT NULL,
    host_id           TEXT    NOT NULL
        REFERENCES hosts(id) ON DELETE CASCADE,
    size_bytes        INTEGER NOT NULL DEFAULT 0,
    family            TEXT    NOT NULL DEFAULT '',
    parameters        TEXT    NOT NULL DEFAULT '',
    quantization      TEXT    NOT NULL DEFAULT '',
    capabilities_json TEXT    NOT NULL DEFAULT '[]',  -- JSON array of strings
    last_synced_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_model_cache_host
    ON model_cache (host_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS folder_contexts (
    id                  TEXT    PRIMARY KEY NOT NULL,   -- UUID v4
    conversation_id     TEXT    NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,
    path                TEXT    NOT NULL,               -- absolute filesystem path
    included_files_json TEXT,                           -- JSON array of relative paths; NULL means all
    auto_refresh        INTEGER NOT NULL DEFAULT 0,     -- boolean
    estimated_tokens    INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_folder_contexts_conversation
    ON folder_contexts (conversation_id);
