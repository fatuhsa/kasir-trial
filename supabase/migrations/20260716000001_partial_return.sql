-- ============================================================
-- Migration: Atomic session claim and update for partial return
-- 
-- claim_and_update_session(p_id, p_expected_items, p_new_items)
-- tries to UPDATE the session's items to p_new_items,
-- or DELETE the session if p_new_items is empty.
-- It returns TRUE if it succeeded (meaning the terminal owns it
-- and the expected items matched), or FALSE if another terminal
-- already modified or deleted it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_and_update_session(
  p_id text, 
  p_expected_items jsonb, 
  p_new_items jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- If new items array is empty, delete the session completely
  IF jsonb_array_length(p_new_items) = 0 THEN
    DELETE FROM public.active_sessions 
    WHERE id = p_id AND (items = p_expected_items OR items IS NULL);
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    UPDATE public.active_sessions 
    SET items = p_new_items 
    WHERE id = p_id AND items = p_expected_items;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END IF;
  RETURN updated_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_and_update_session(text, jsonb, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_and_update_session(text, jsonb, jsonb) TO authenticated;
