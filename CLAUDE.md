# Sports Platform - Contexto Completo do Projeto

## O que e este projeto
Plataforma web para treinadores de futebol/futsal. Funcionalidades:
- Gestao de treinos semanais (microciclos com 7 sessoes, cada uma com 6 blocos de atividades)
- Gestao de jogos (escalacao, eventos ao vivo, estatisticas)
- Plantel de atletas (agrupados em G1/G2/G3/Transicao/DM)
- Multi-clube (cada usuario pode ter varios clubes)
- Quadro tatico interativo (campo 2D com jogadores, animacao, exportacao de video)
- Estatisticas e relatorios com graficos

## Stack
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Konva.js (canvas tatico)
- **Backend**: Node.js + Express + PostgreSQL self-hosted
- **Auth**: JWT (7d), bcrypt
- **Storage**: Local filesystem + Nginx
- **Email transacional**: Brevo SMTP (dominio faggin.com.br autenticado)
- **Pagamentos**: Mercado Pago (Assinaturas)
- **Monitoramento**: Sentry
- **Desktop**: Electron (empacota frontend)

## Dominio e Infraestrutura
- **Landing**: tactiplan.faggin.com.br (servida por nginx em /var/www/sports-platform/landing/)
- **App**: app.tactiplan.faggin.com.br (SPA Vite build em /var/www/sports-platform/frontend/dist/)
- **VPS IP**: 207.246.114.192
- **Stack VPS**: Node.js 20 + PostgreSQL 16 + Nginx + PM2 + Certbot

## Arquitetura Multi-Tenant
Cada usuario e um "tenant". Todas as tabelas tem `tenant_id` que referencia `users.id`.
Isolamento feito na camada da API (WHERE tenant_id = usuario_logado).

## Banco de Dados - 16 Tabelas
O schema completo esta em MIGRATION_VPS.md secao 2.2.
Tabelas principais: users, clubs, athletes, training_microcycles, training_sessions,
training_activity_blocks, training_activities, contents, stages, activity_titles,
training_activity_contents, training_activity_stages, training_activity_files,
match_players, match_events, tactical_plays.

## Endpoints da API
Todos os endpoints estao documentados em MIGRATION_VPS.md secao "FASE 3".
Resumo: /api/auth/*, /api/clubs/*, /api/athletes/*, /api/microcycles/*,
/api/sessions/*, /api/contents, /api/stages, /api/titles/*, /api/games/*,
/api/stats/*, /api/plays/*, /api/files/*, /api/competitions/*, /api/external/*

## Multi-clube
- Pro / Pro Anual: `max_clubs = 1`
- Clube / Clube Anual: `max_clubs = 3` (subido na migration 037)
- Lifetime / admin: ilimitado
- Add-on avulso: coluna `subscriptions.extra_club_slots` (INT, default 0). Soma ao
  `features.max_clubs` do plano. Sem UI de compra ainda — pra liberar slot extra
  manualmente: `UPDATE subscriptions SET extra_club_slots = 1 WHERE id = ...`

## Integração externa de dados (api-football)
- Status: estrutura pronta, **NÃO ATIVADA**. Sem `API_FOOTBALL_KEY` no .env os
  endpoints respondem 503 e o botão "Importar jogos" não aparece no frontend.
- Pra ativar: assinar plano em https://dashboard.api-football.com (US$ 19/mês Pro),
  setar `API_FOOTBALL_KEY=<chave>` no .env do backend-node e `pm2 reload sports-api`.
- IDs úteis (Brasil): Série A=71, B=72, C=75, **D=80**, Copa do Brasil=73.
- Endpoints backend (todos exigem auth):
  - GET  /api/external/status — lista providers e flag enabled
  - GET  /api/external/api-football/teams?search=Uberlandia
  - GET  /api/external/api-football/leagues?country=Brazil&season=2026
  - GET  /api/external/api-football/preview?league_id=80&season=2026&team_id=...
  - POST /api/external/api-football/import (body: competition_id, team_id, league_id, season, event_ids[])
- Frontend: CompetitionsConfigPage detecta enabled via `externalApiService.isApiFootballEnabled()`
  e renderiza um ícone Download em cada linha de campeonato → abre `ImportFixturesModal`
  (modal de 3 passos: buscar time → liga+temporada → preview com checkbox).
- Dedup: jogos importados ficam com `external_event_id` + `external_provider`. Reimportar
  o mesmo fixture faz UPDATE no lugar de INSERT.
- `external_locked_at`: se um coach editar manualmente um jogo importado, marcar essa coluna
  via UPDATE faz o futuro sync incremental ignorar. (Hoje só dedup; sync cron diário não
  implementado — sai num sprint futuro se a feature decolar.)

## Billing (Assinaturas)
- Planos seedados em migrations 006/007: `free`, `pro` (R$ 49/mes), `team` (R$ 99/mes), `lifetime`
- Usuarios admin (role='admin') tem acesso ilimitado sem assinatura
- Lista de emails admin/vitalicio em backend-node/src/config/specialUsers.js
- Novos cadastros recebem trial automatico de 14 dias no Pro
- Integracao Mercado Pago (Preapproval / Assinaturas recorrentes)
- Webhook em POST /api/billing/webhook valida assinatura HMAC SHA-256

## Status atual da migracao
Frontend totalmente migrado para a API Node.js. Sem referencias ativas ao Supabase.

## Convencoes
- Datas sempre em UTC no banco, formatadas em pt-BR no frontend
- Semanas identificadas como "YYYY-WW" (ISO week)
- UUIDs para todas as PKs (gen_random_uuid())
- Senhas com bcrypt
- JWT para auth (exp 7 dias)
- Upload de arquivos: max 50MB, tipos permitidos: imagens, video, PDF
