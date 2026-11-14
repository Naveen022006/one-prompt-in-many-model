-- Multi-agent chat schema update.
-- Safe to run more than once. Run it in the Supabase SQL editor.

-- Columns for every agent plus the chat (session) id.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS session_id        UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS claude_response   TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS claude_error      TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deepseek_response TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deepseek_error    TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS grok_response     TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS grok_error        TEXT;

-- Faster chat loading and daily usage counts.
CREATE INDEX IF NOT EXISTS idx_conversations_session      ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at);

-- The original schema had UNIQUE(user_id) on api_keys, which allows only one
-- provider per user. Keys are unique per (user_id, provider).
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_key;
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_check;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_provider_check
  CHECK (provider IN ('openai', 'gemini', 'groq', 'claude', 'deepseek', 'grok'));
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_user_id_provider_key'
  ) THEN
    ALTER TABLE api_keys ADD CONSTRAINT api_keys_user_id_provider_key UNIQUE (user_id, provider);
  END IF;
END $$;
