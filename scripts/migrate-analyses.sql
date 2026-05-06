-- Migration: tabella analyses per salvare le analisi/foresight custom
-- generati dall'AI nel pannello admin.

CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'analysis', -- 'analysis' | 'foresight'
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS analyses_type_idx ON analyses (type);
