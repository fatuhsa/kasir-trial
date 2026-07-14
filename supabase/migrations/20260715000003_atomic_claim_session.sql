-- ============================================================
-- Migration: Atomic session claim to prevent double-checkout
-- 
-- claim_and_delete_session(p_id) tries to DELETE the session
-- and returns TRUE if it succeeded (this terminal owns it),
-- or FALSE if another terminal already deleted it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_and_delete_session(p_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.active_sessions WHERE id = p_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_and_delete_session(text) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_and_delete_session(text) TO authenticated;
