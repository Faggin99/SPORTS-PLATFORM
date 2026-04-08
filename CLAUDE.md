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
- **Backend ATUAL**: Supabase (PostgreSQL + Auth + Storage) - MIGRANDO para VPS
- **Backend NOVO**: Node.js + Express + PostgreSQL self-hosted
- **Desktop**: Electron (empacota frontend)

## Dominio e Infraestrutura
- **Dominio**: tactiplan.faggin.com.br
- **VPS IP**: 143.198.156.198
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
/api/stats/*, /api/plays/*, /api/files/*

## Frontend - Services que precisam ser refatorados
Todos em frontend/src/services/ e frontend/src/modules/*/services/ usam
supabase.from() diretamente. Precisam ser convertidos para chamadas HTTP
via axios para /api/*.

## Dados a importar
Pasta export-supabase/data/ contem os dados exportados do Supabase:
- `users.json` - Usuarios (do auth.users, com encrypted_password)
- `all_data.json` - Todas as tabelas em um unico JSON. Cada query do SQL retornou
  um array JSON. O arquivo contem os resultados na ordem: clubs, athletes, contents,
  stages, activity_titles, microcycles, sessions, blocks, activities,
  activity_contents, activity_stages, files, match_players, match_events, tactical_plays.
  O script de import deve parsear e inserir na mesma ordem respeitando foreign keys.

## Convencoes
- Datas sempre em UTC no banco, formatadas em pt-BR no frontend
- Semanas identificadas como "YYYY-WW" (ISO week)
- UUIDs para todas as PKs (gen_random_uuid())
- Senhas com bcrypt
- JWT para auth (exp 7 dias)
- Upload de arquivos: max 50MB, tipos permitidos: imagens, video, PDF
