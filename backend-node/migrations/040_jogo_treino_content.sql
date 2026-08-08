-- Migration 040: adiciona "Jogo Treino" como conteúdo tático integrado.
--
-- Motivação: treinos coletivos (11x11, jogos reduzidos) trabalham vários
-- momentos do jogo ao mesmo tempo. Forçar o treinador a marcar um momento
-- único (OO, OD, TO, TD, BPO, BPD) é mentir; distribuir o tempo entre os 6
-- igualmente é inventar dado. Solução: conteúdo próprio que conta no pilar
-- Tático mas NÃO se vincula a nenhum momento específico (sem stages).
--
-- No dashboard:
--   - Pizza de Pilares: aparece dentro do pedaço "Tático" normalmente.
--   - Pizza de Momentos: NÃO aparece (por design — não há submomento).
--   - Lista de Conteúdos: aparece como qualquer outro conteúdo tático.
--
-- A proporção trabalho específico vs trabalho integrado vira métrica útil.

BEGIN;

INSERT INTO contents (name, dimension, abbreviation, description)
VALUES (
  'Jogo Treino',
  'tatico',
  'JT',
  'Atividade integrada que trabalha vários momentos do jogo ao mesmo tempo (ex.: jogo treino 11x11, jogo coletivo, jogo reduzido). Conta no pilar Tático mas não em nenhum momento específico — use os conteúdos específicos (Organização Ofensiva/Defensiva, Transição Ofensiva/Defensiva, Bola Parada) quando o trabalho for direcionado a um momento.'
)
ON CONFLICT DO NOTHING;

COMMIT;
