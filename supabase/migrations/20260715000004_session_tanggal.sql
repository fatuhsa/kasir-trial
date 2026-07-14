-- Add tanggal column to active_sessions
-- Stores the date the rental STARTED (not finalized),
-- so midnight-spanning shifts have the correct date on the receipt.
ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS tanggal text DEFAULT '';
