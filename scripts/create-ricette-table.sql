-- Abilita l'estensione vector se non già abilitata
CREATE EXTENSION IF NOT EXISTS vector;

-- Crea tabella ricette
CREATE TABLE IF NOT EXISTS ricette (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo TEXT NOT NULL,
  famiglia TEXT,
  ricettario TEXT,
  anno INTEGER,
  procedimento TEXT,
  ingredienti TEXT,
  scheda_antropologica TEXT,
  scheda_nutrizionale TEXT,
  calorie INTEGER,
  n_persone INTEGER,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crea indice per ricerca vettoriale
CREATE INDEX IF NOT EXISTS ricette_embedding_idx ON ricette 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Crea funzione per ricerca semantica
CREATE OR REPLACE FUNCTION search_ricette(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  titolo TEXT,
  famiglia TEXT,
  ricettario TEXT,
  procedimento TEXT,
  ingredienti TEXT,
  scheda_antropologica TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.titolo,
    r.famiglia,
    r.ricettario,
    r.procedimento,
    r.ingredienti,
    r.scheda_antropologica,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM ricette r
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Abilita RLS
ALTER TABLE ricette ENABLE ROW LEVEL SECURITY;

-- Policy per lettura pubblica
CREATE POLICY "Ricette are viewable by everyone" ON ricette
  FOR SELECT USING (true);
