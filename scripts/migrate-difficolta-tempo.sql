-- Migration: aggiunge colonna difficolta_tempo per allineare al tracciato record ECI.
-- Da eseguire UNA VOLTA su Supabase (SQL Editor).

ALTER TABLE ricette
  ADD COLUMN IF NOT EXISTS difficolta_tempo TEXT;
