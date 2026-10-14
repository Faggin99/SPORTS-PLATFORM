# Workspace Refactor — Handoff (staging-only)

Refator completo do modelo multi-tenant: user_id → workspace_id. Pronto pra revisão em **staging**. **Não foi promovido pra prod**.

## Status

| Fase | O quê | Status |
|------|-------|--------|
| 1 | Schema `workspaces` + `workspace_id` em 17 tabelas | ✅ |
| 2 | Data migration (1 user = 1 workspace, dados antigos populados) | ✅ |
| 3 | Middleware auth carrega `accessibleWorkspaces`, `workspaceId` ativa via header `X-Workspace-Id` | ✅ |
| 4 | 20 arquivos de rotas refatorados pra workspace_id | ✅ |
| 5 | Billing por workspace + endpoints `/api/workspaces` | ✅ |
| 6 | Frontend: `WorkspaceContext`, `WorkspaceSwitcher`, `/select-workspace`, categorias no invite | ✅ |
| 7 | Smoke test em staging (isolamento por workspace verificado) | ✅ |
| 8 | Sistema de permissões granulares (6 roles + 16 permissões + escopo por categoria HARD) | ✅ |

## Backups antes da refator

- `/var/backups/sports-platform/staging_before_workspace_refactor_20260523_153805.sql` (banco staging completo, antes de qualquer migração workspace)
- Prod **não foi tocado** desde o último backup `prod_before_pro_one_club_20260523_*.sql`.

## Migrations aplicadas (apenas em staging)

```
024_workspaces_schema.sql     — cria workspaces, workspace_members, adiciona workspace_id em 17 tabelas
025_workspaces_data.sql       — migra dados: cada user vira 1 workspace, popula workspace_id em tudo
026_tenant_id_nullable.sql    — torna tenant_id NULLable (exceto user_content_state/user_stage_state)
027_workspace_unique_indexes.sql — unique (workspace_id, date, club_id) em training_sessions etc
028_member_permissions.sql    — adiciona permissions JSONB em workspace_members + remapeia roles antigos
```

Pra rodar em prod (DEPOIS de validar staging):
```bash
cd /var/www/sports-platform/backend-node
# Backup primeiro!
PGPASSWORD='...' pg_dump -U sports_admin -h localhost sports_platform > /var/backups/sports-platform/prod_before_workspace_$(date +%Y%m%d_%H%M%S).sql

for m in 024_workspaces_schema 025_workspaces_data 026_tenant_id_nullable 027_workspace_unique_indexes 028_member_permissions; do
  PGPASSWORD='...' psql -U sports_admin -h localhost sports_platform -f migrations/$m.sql
done

# Sync src/ + build
rsync -a --delete /var/www/sports-platform-staging/backend-node/src/ /var/www/sports-platform/backend-node/src/
rsync -a --delete /var/www/sports-platform-staging/frontend/src/ /var/www/sports-platform/frontend/src/
cd /var/www/sports-platform/frontend && npm run build
pm2 reload sports-api
```

## Modelo conceitual final

- **1 user (email) = identidade.** Pode ter N workspaces próprias + ser membro de outras.
- **1 workspace = 1 conta = 1 assinatura.** Tem 1 ou mais clubes dentro (o `max_clubs` do plano define).
- **Membros (workspace_members)** podem ter `category_ids` (array) limitando acesso a categorias específicas, ou `null` pra todas.
- **Header `X-Workspace-Id`** define a workspace ativa em cada request. Frontend injeta automaticamente do `localStorage.active_workspace_id`.
- **Trial:** todo user novo cria 1 workspace na hora do cadastro + trial Clube 14d ligado àquela workspace. Criar workspace adicional dispara trial novo.

## Sistema de permissões (Fase 8)

**6 papéis** (`workspace_members.role`):
- `owner` — dono da workspace, tudo
- `manager` — gerente, faz quase tudo (menos billing e members)
- `head_coach` — treinador principal (treinos, jogos, atletas, táticas)
- `assistant_coach` — auxiliar (edita treinos das categorias atribuídas)
- `specialist` — fisio/PF/analista (lesões, stats, biblioteca)
- `viewer` — somente leitura

**16 permissões granulares** (escopo do plano em `workspace_members.permissions` JSONB):
training:view/edit/delete, games:view/edit, athletes:view/edit, injuries:manage,
tactical:view/edit, stats:view, library:edit, categories:manage, members:manage,
club_settings:manage, billing:manage.

Quando `permissions` é NULL no banco → usa os defaults do role (ver `src/utils/permissions.js`).
Quando é array → é o conjunto efetivo (override do role).

**Escopo HARD por categoria** (`workspace_members.category_ids`): se preenchido,
o member SÓ vê/edita atletas/microciclos das categorias listadas. Aplicado em
listagens (`WHERE category_id = ANY($N)`) e validado em GETs individuais.

**Helpers backend:** `req.user.can('athletes:edit')`, `req.user.assertCanAccessCategory(catId)`,
`req.user.allowedCategoryIds` (null = todas, array = restrito).
**Helpers frontend:** hook `useCan()` retorna `{ can, allowedCategoryIds, isOwner }`.

**UI:** `/settings/team` (Staff) tem painel lateral `MemberEditPanel` para owner
editar role + categorias + permissões granulares (toggle individual via "Personalizar permissões (avançado)").

## Endpoints novos

- `GET /api/workspaces` — lista workspaces acessíveis pelo user, com `active` apontando pra atual
- `POST /api/workspaces` — cria nova workspace + trial Clube 14d (no mesmo email)
- `PUT /api/workspaces/:id` — renomeia (só owner)

## Componentes frontend novos

- `src/contexts/WorkspaceContext.jsx` — provider, hook `useWorkspace()`
- `src/components/workspace/WorkspaceSwitcher.jsx` — dropdown no Header
- `src/pages/SelectWorkspacePage.jsx` — rota `/select-workspace`

## Smoke tests validados em staging

| Teste | Resultado |
|-------|-----------|
| `GET /api/health` | 200 ok |
| `GET /api/workspaces` autenticado | retorna lista correta + active |
| `POST /api/workspaces` cria nova | OK + listagem atualiza |
| `GET /api/clubs` sem header | retorna só clubes da workspace primária |
| `GET /api/clubs` com `X-Workspace-Id: ws2` | retorna só clubes da ws2 (isolamento ok) |
| `GET /api/athletes` com header diferente | retorna SÓ atletas da workspace ativa |
| `GET /api/billing/subscription` | retorna sub da workspace ativa (ou admin synthetic) |
| `GET /api/categories?clubId=...` | retorna "Categoria Principal" criada por migração 025 + seed manual |
| `GET /api/clubs/:id/members` | inclui `workspace_id` no payload |
| `GET /api/microcycles?week=2026-22&club_id=...` | retorna microciclo correto |

## Coisas que NÃO foram tocadas (pra manter risco baixo)

1. **`tenant_id` ainda existe nas tabelas** (apenas nullable). Pode ser dropado depois.
2. **`club_members`** continua no schema (não removida). Os dados foram **duplicados** em `workspace_members`. Próximo cleanup: dropar `club_members` após confirmar que tudo lê de `workspace_members`.
3. **Index único antigo** `training_sessions_tenant_id_date_club_id_key` ainda existe (não estorva, mas pode ser dropado).
4. **`auth.js`** ainda retorna `id as tenant_id` na resposta de login (compat com fronts antigos — campo redundante).
5. **`user_content_state` e `user_stage_state`** mantêm `tenant_id` (parte da PK composta) — toggles per-user de conteúdos globais.

## Riscos conhecidos / observações

1. **Cache do middleware (30s)** — quando muda membership, `authMiddleware.invalidateAccessibleCache(userId)` é chamado. Trocar workspace ativa via header é instantâneo (não usa cache).
2. **`req.user.workspaceIds`** mudou de "todas as acessíveis" pra "só a ativa". Tudo que fazia `WHERE workspace_id = ANY(workspaceIds)` agora filtra só pela ativa — comportamento desejado, mas qualquer endpoint legado que dependia do array completo precisa migrar pra `accessibleWorkspaces`.
3. **`/clubs` continua listando todos os clubes acessíveis** (próprios + member) — não restrito à workspace ativa. Se quiser restringir, mudar [clubs.js:36](src/routes/clubs.js#L36).
4. **Frontend `usePlanFeatures`** continua olhando `sub.features`. Como `/billing/subscription` agora retorna sub da workspace ativa, as features refletem o plano da workspace atual.
5. **Dispatch `workspace-changed`** — quando trocar workspace no switcher, `useSubscription` re-puxa. Cuide se outros hooks precisarem reagir também.

## Próximos passos sugeridos

1. **Testar manualmente em staging** abrindo `app.tactiplan.faggin.com.br` apontado pro backend staging:
   - Login com sua conta
   - Conferir que vê seus dados intactos
   - Criar nova workspace pelo switcher
   - Trocar entre workspaces — dados devem isolar
   - Criar atleta na ws2, voltar pra ws1 e confirmar que não vaza
2. **Decidir nome/UX:** estamos chamando "Conta" na SelectWorkspacePage e "Workspace" em alguns lugares. Padronizar.
3. **Promover pra prod** seguindo o bloco "Pra rodar em prod" acima — apenas depois do passo 1.
4. **Cleanup post-promoção (release separado):** dropar `club_members`, dropar `tenant_id` das tabelas migradas, remover helpers legados em `auth.js`.

## URLs

- Staging API: `http://localhost:3002` (porta interna; o front staging atual acessa via Vite dev/build local — não publicado em domínio próprio)
- Prod (NÃO foi promovido nada): `https://app.tactiplan.faggin.com.br`
- PM2 process names: `sports-api` (prod, :3001) | `sports-api-staging` (:3002)
