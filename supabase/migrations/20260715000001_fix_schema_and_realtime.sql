-- ============================================================
-- Migration: Fix missing columns, realtime, and queue_no
-- ============================================================

-- 1. Add missing columns to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS shift      text DEFAULT '-',
  ADD COLUMN IF NOT EXISTS queue_no   integer DEFAULT 0;

-- 2. Add queue_no to active_sessions so other terminals see it
ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS queue_no   integer DEFAULT 0;

-- 3. Set defaults on nullable numeric columns to prevent nulls
ALTER TABLE public.transactions
  ALTER COLUMN no          SET DEFAULT 0,
  ALTER COLUMN total_base  SET DEFAULT 0,
  ALTER COLUMN total_ot    SET DEFAULT 0,
  ALTER COLUMN total_tol   SET DEFAULT 0,
  ALTER COLUMN grand_total SET DEFAULT 0,
  ALTER COLUMN total_all   SET DEFAULT 0,
  ALTER COLUMN cash        SET DEFAULT 0,
  ALTER COLUMN qris        SET DEFAULT 0;

-- 4. Enable Realtime on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
