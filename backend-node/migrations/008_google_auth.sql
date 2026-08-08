-- Login via Google (OAuth)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) NOT NULL DEFAULT 'email';

-- Index para lookup rápido por google_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Permite senha NULL (usuários que entraram só pelo Google)
ALTER TABLE users ALTER COLUMN encrypted_password DROP NOT NULL;
