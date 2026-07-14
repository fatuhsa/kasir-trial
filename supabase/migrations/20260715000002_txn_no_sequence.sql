-- ============================================================
-- Migration: Atomic transaction number via PostgreSQL sequence
-- Replaces client-side transactions.length + 1 with a DB-side
-- atomic counter that is collision-proof across terminals.
-- ============================================================

-- Create a global sequence for transaction numbers
CREATE SEQUENCE IF NOT EXISTS txn_no_seq START 1;

-- Expose it as an RPC so the anon client can call it
CREATE OR REPLACE FUNCTION public.next_txn_no()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT nextval('txn_no_seq')::integer;
$$;

-- Grant execute to anon role (used by Supabase anon key)
GRANT EXECUTE ON FUNCTION public.next_txn_no() TO anon;
GRANT EXECUTE ON FUNCTION public.next_txn_no() TO authenticated;
