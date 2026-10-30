CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS threads_title_trgm_idx ON threads USING gin (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS threads_body_trgm_idx ON threads USING gin (lower(body) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS replies_body_trgm_idx ON replies USING gin (lower(body) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_username_trgm_idx ON users USING gin (lower(username) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_display_name_trgm_idx ON users USING gin (lower("displayName") gin_trgm_ops);
