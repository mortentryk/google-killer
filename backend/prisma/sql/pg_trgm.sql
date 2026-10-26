-- Run once per database (e.g. psql or prisma db execute):
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "SearchTopic_normalizedQuery_trgm_idx"
  ON "SearchTopic" USING gin ("normalizedQuery" gin_trgm_ops);
