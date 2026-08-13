-- Sign in with Apple (obrigatório na App Store por termos login Google).
-- apple_id = claim `sub` do identityToken da Apple (estável por team).
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id TEXT UNIQUE;
