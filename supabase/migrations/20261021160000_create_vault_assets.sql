-- ==============================================================================
-- Supabase Migration: Create vault_assets Table with Row Level Security (RLS)
-- Location: supabase/migrations/20261021160000_create_vault_assets.sql
-- ==============================================================================

-- 1. Create the vault_assets table
CREATE TABLE IF NOT EXISTS public.vault_assets (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  studio_source TEXT,
  duration TEXT,
  resolution TEXT,
  lyrics TEXT,
  bpm INTEGER,
  thumbnail_url TEXT,
  audio_url TEXT,
  code_snippet TEXT,
  text TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_assets_user_id ON public.vault_assets (user_id);
CREATE INDEX IF NOT EXISTS idx_vault_assets_created_at ON public.vault_assets (created_at DESC);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.vault_assets ENABLE ROW LEVEL SECURITY;

-- 3. Deliberate Table Grants: Deny anon access entirely; allow only authenticated and service_role
REVOKE ALL ON TABLE public.vault_assets FROM anon;
REVOKE ALL ON TABLE public.vault_assets FROM public;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vault_assets TO authenticated;
GRANT ALL ON TABLE public.vault_assets TO service_role;

-- 4. RLS Policy: SELECT (explicit TO authenticated)
DROP POLICY IF EXISTS "Users can view their own vault assets" ON public.vault_assets;
CREATE POLICY "Users can view their own vault assets"
  ON public.vault_assets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. RLS Policy: INSERT (explicit TO authenticated)
DROP POLICY IF EXISTS "Users can insert their own vault assets" ON public.vault_assets;
CREATE POLICY "Users can insert their own vault assets"
  ON public.vault_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. RLS Policy: UPDATE (explicit TO authenticated with explicit USING and WITH CHECK ownership conditions)
DROP POLICY IF EXISTS "Users can update their own vault assets" ON public.vault_assets;
CREATE POLICY "Users can update their own vault assets"
  ON public.vault_assets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. RLS Policy: DELETE (explicit TO authenticated)
DROP POLICY IF EXISTS "Users can delete their own vault assets" ON public.vault_assets;
CREATE POLICY "Users can delete their own vault assets"
  ON public.vault_assets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
