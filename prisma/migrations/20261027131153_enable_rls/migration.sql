-- Close Supabase's Data API (PostgREST) on every public table: RLS on, no policies.
-- The app and pg_cron connect as the table owner, which bypasses RLS.
-- New tables need the same line in their migration.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
