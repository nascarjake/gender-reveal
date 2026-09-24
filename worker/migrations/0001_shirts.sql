CREATE TABLE IF NOT EXISTS shirts (
 id TEXT PRIMARY KEY,
 collection TEXT NOT NULL CHECK (collection IN ('demo','pink','blue')),
 name TEXT NOT NULL CHECK (length(name) <= 32),
 title TEXT NOT NULL CHECK (length(title) <= 48),
 image TEXT NOT NULL CHECK (length(image) < 350000),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS shirts_collection_created ON shirts(collection,created_at DESC);
CREATE TRIGGER IF NOT EXISTS cap_gallery BEFORE INSERT ON shirts
WHEN (SELECT count(*) FROM shirts) >= 1000
BEGIN SELECT RAISE(ABORT, 'CLOTHESLINE_FULL'); END;
