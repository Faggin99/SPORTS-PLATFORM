-- Migration 038: numeração de camisa POR JOGO.
-- O atleta tem um número permanente em athletes.jersey_number (o "do plantel"),
-- mas em jogos pontuais ele pode usar outro (ex.: convocado pra um amistoso e
-- a camisa habitual está ocupada). Este campo é override por match_player; se
-- estiver NULL o frontend deve cair pro número do plantel.

BEGIN;

ALTER TABLE match_players
  ADD COLUMN IF NOT EXISTS jersey_number INTEGER;

COMMENT ON COLUMN match_players.jersey_number IS
  'Camisa específica deste jogo. NULL = usa o número permanente em athletes.jersey_number.';

COMMIT;
