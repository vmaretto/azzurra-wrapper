-- Migration: aggiunge colonne portata + ingredienti_json alla tabella ricette
-- Da eseguire UNA VOLTA su Supabase (SQL Editor).

ALTER TABLE ricette
  ADD COLUMN IF NOT EXISTS portata TEXT;

ALTER TABLE ricette
  ADD COLUMN IF NOT EXISTS ingredienti_json JSONB;

-- (opzionale) indice per query future
CREATE INDEX IF NOT EXISTS ricette_portata_idx ON ricette (portata);
