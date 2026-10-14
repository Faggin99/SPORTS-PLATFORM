# TactiPlan — F0 (arrumar a casa para o app nativo) — 14/10/2026

## 1. Produção salva no Git

- Repositório: `/var/www/sports-platform` (remoto `git@github.com:Faggin99/SPORTS-PLATFORM.git`).
- Branch nova **`producao-2026-10-14`**, criada a partir de `master@98ad8bd` com o working tree de produção.
  - `5a3a31e` — snapshot da produção (124 entradas: 109 alterações + arquivos novos expandidos + `.gitignore`).
  - `167aae2` — correção do webhook RevenueCat (item 3a), aplicada em produção.
- `.gitignore` ganhou as regras do staging (keystore/builds nativos, `ota/`, `frontend/mobile-artifacts/`).
  Conferido antes do commit: nenhum `.env`, `.env.production.local`, keystore, `uploads/`, `node_modules`,
  `dist` ou `ota/` entrou; varredura de segredos no diff sem achados.
- **A produção ficou na branch `producao-2026-10-14`** (conteúdo em disco idêntico ao de antes; nada de reset/checkout).
  As próximas edições diretas do Arthur caem nessa branch. `master` no GitHub continua sendo o do staging.

## 2. Worktree do app nativo

- `/var/www/tactiplan-app`, branch **`app-nativo`** (`git worktree` do repositório da produção).
- Base `producao-2026-10-14` + merge de `origin/master@64d99b5` (staging) → `c3adeeb`.

### Conflitos e resolução

Antes de resolver, comparei arquivo a arquivo: para **todos** os arquivos alterados dos dois lados, a diferença
staging→produção só tinha linhas a mais na produção (a produção era cópia do staging + mudanças de outubro).
Por isso todos os conflitos ficaram com a versão da produção:

| Arquivo | Conflito | Resolução |
|---|---|---|
| `.gitignore` | comentário do bloco `ota/` | versão do staging (mesmas regras) |
| `backend-node/ecosystem.config.js` | `cwd`/logs; o auto-merge ainda tinha trazido nome `sports-api-staging`, porta 3002, `NODE_ENV=staging`, 256M | **produção inteira** (`sports-api`, 3001, production, 512M) |
| `backend-node/server.js` | `require('./src/routes/conta')` | produção (login único Faggin) |
| `backend-node/src/routes/auth.js` | login via Conta Faggin, `conta.vincular/definirSenha`; o auto-merge duplicou o bloco do cadastro | produção |
| `frontend/.env.production` | API de produção × staging (+ chave pública RC) | produção (a chave `appl_` de prod fica no `.env.production.local`, fora do Git) |
| `frontend/src/App.jsx`, `main.jsx` | rota `/entrar-conta` e redirecionamento `?codigo=` | produção |
| `frontend/src/components/layout/Layout.jsx` | AppShell (menu lateral) × Header | produção |
| `frontend/src/index.css` | Poppins | produção |
| `landing/favicon.png` | binário | produção |

Do staging vieram só **adições** (142 arquivos): projetos nativos Capacitor `frontend/android` e `frontend/ios`,
`codemagic.yaml`, `backend-node/scripts/db-backup.sh`, `migrations/039_club_colors.sql` (já aplicada no banco de
produção — as colunas `clubs.primary_color/secondary_color` existem; só o arquivo faltava), `frontend/scripts/screenshots.js`,
recursos de loja, `mobile-artifacts/` (AAB/APK antigos já versionados no staging) e docs.
Verificado depois do merge: em relação à produção, nenhum arquivo existente mudou além do `.gitignore` e nada foi apagado.

### Verificação
- `npm ci` + `npm test` no backend (13 testes, ver item 3) — ok.
- Boot do backend do worktree por 20 s na porta 3097 contra o banco de **staging**, uploads em diretório temporário
  (antes dos jobs agendados, que só começam após 45 s): `/api/health` 200; webhook RC 200.
- `npm ci` + `vite build` do frontend (saída em diretório temporário, não no `dist` de ninguém) — ok.

## 3. Furos de segurança

### 3a. RevenueCat aceitava SANDBOX em produção — CORRIGIDO E APLICADO

`backend-node/src/services/billing.js` → `applyRevenueCatEvent`:
- `environment=SANDBOX` → evento registrado em `billing_events` (`raw.ignored = 'sandbox'`), resposta
  `{handled:false, reason:'sandbox_ignored'}`, **nenhuma** escrita em `subscriptions` (nem compra, nem cancelamento/expiração).
- Exceções, desligadas por padrão:
  - `REVENUECAT_ACEITAR_SANDBOX=1` — aceita qualquer sandbox (para staging/testes).
  - `REVENUECAT_SANDBOX_EMAILS=a@x,b@y` — aceita sandbox só dessas contas.
- Sem migration.
- Testes: `backend-node/tests/revenuecat-sandbox.test.js` (6 casos, `query` simulada, sem banco).
- Produção: commit `167aae2` em `producao-2026-10-14`, `pm2 restart sports-api`. Verificado:
  `/api/health` 200; webhook sem auth 401; webhook com auth + evento SANDBOX de usuário inexistente 200
  (`user_not_found`, nada gravado); smoke `tests/smoke.test.js` 9/9; log de erro sem nada novo além do esperado.
  O caminho SANDBOX com usuário real não foi disparado em produção para não gravar no banco (fica coberto pelos testes).

⚠️ **Revisão da Apple:** o revisor compra em SANDBOX contra o backend de produção. Antes de submeter um build,
coloque no `.env` de produção `REVENUECAT_SANDBOX_EMAILS=review@tactiplan.faggin.com.br` e rode `pm2 restart sports-api`
(ou `REVENUECAT_ACEITAR_SANDBOX=1` durante a revisão). Sem isso a compra do revisor não libera o plano.
Não há atividade da RevenueCat desde 08/09.
No staging, se o código novo for para lá, use `REVENUECAT_ACEITAR_SANDBOX=1` no `.env` do staging.

### 3b. Uploads públicos — PRONTO NO `app-nativo`, NÃO aplicado em produção

**Mapa dos uploads** (`backend-node/src/middleware/upload.js`, servidos em `/uploads/<pasta>/<uuid>.<ext>`):

| Pasta | O que é | Sensível? | Como o front monta a URL |
|---|---|---|---|
| `athlete-photos` | foto do atleta (muitos menores) | **sim** | `athletes.photo_url` vindo da API (plantel, jogos, lesões, home, PDF) |
| `session-files` | anexos de treino (imagem, vídeo, PDF até 50 MB) | **sim** | `training_activity_files.url/file_path` vindo da API |
| `profile-photos` | foto de perfil do treinador (adulto, dono da conta) | moderado | o **front monta** `/uploads/profile-photos/<arquivo>` a partir do nome |
| `club-logos` | escudo do clube | não (público) | `clubs.logo_path` |

Hoje a única proteção é o nome UUID (não adivinhável), mas os links não expiram e o nginx manda `Cache-Control: public, max-age=30d`.

**Implementação (branch `app-nativo`, commit `e57d1f0`)** — mesmo padrão do Gestsport (`escola-app/backend/src/utils/signedUpload.js`):
- `backend-node/src/utils/signedUpload.js`: HMAC (`UPLOAD_SIGNING_SECRET` ou `JWT_SECRET`) sobre `path:exp`, link `?t=<exp>.<sig>`,
  validade de 6 a 7 h com expiração arredondada à hora cheia (a URL fica estável por 1 h e o navegador aproveita o cache).
- `server.js`: `signJsonResponses` assina os paths sensíveis em qualquer JSON da API (em qualquer profundidade);
  `uploadsGate` antes do `express.static` confere a assinatura e bloqueia path traversal; arquivos sensíveis saem com
  `Cache-Control: private, max-age=3600`.
- Modo por env `UPLOADS_ASSINATURA`: `off` | **`log` (padrão: aceita link antigo e registra `[uploads] acesso SEM assinatura`)** | `enforce` (403).
- `routes/athletes.js`: POST/PUT removem o `?t=` do `photo_url` antes de gravar (o `PlayerModal` devolve a URL que recebeu).
- Escudos e foto de perfil continuam públicos.
- Testes: `backend-node/tests/uploads-assinados.test.js` (7 casos: assinatura em JSON aninhado, estabilidade/TTL,
  200/403 no enforce, adulterada/expirada/de outro arquivo, públicos abertos, traversal, tolerância no `log`, strip).
  Boot real no staging DB: sem assinatura 403 (enforce), assinado 200, escudo 200.

**Por que não apliquei em produção:** o nginx serve `/uploads/` direto do disco (`alias /var/www/sports-platform/uploads/`
em `/etc/nginx/sites-available/tactiplan`), então o Node nunca vê esses pedidos. Só o backend não protege nada;
a proteção exige mudar o nginx, o que esta fase proíbe. Aplicar só a parte de assinar respostas seria risco sem ganho.

**Compatibilidade:**
- Web: as URLs vêm da API, o `<img src>` e o `fetch` do PDF mantêm a query; sem mudança de front e **sem OTA**.
- App Capacitor atual: idem (mesmo bundle). Observação: no app nativo, caminhos relativos `/uploads/...` resolvem para
  `https://localhost/...` e já não carregam hoje (bug pré-existente, independente desta mudança). O app nativo novo
  deve prefixar a origem da API; a assinatura vai junto na query.
- Links antigos (PDF já exportado, cache, app desatualizado): seguem funcionando no modo `log` até virar `enforce`.

**Plano de virada (para quando o Arthur autorizar):**
1. Levar para a produção `server.js`, `src/utils/signedUpload.js` e `src/routes/athletes.js` (do `app-nativo`), com
   `UPLOADS_ASSINATURA=log` (padrão). `pm2 restart sports-api`. Conferir no navegador que a foto do atleta vem com `?t=`.
2. nginx (`sites-available/tactiplan`), **antes** do `location /uploads/` existente:
   ```nginx
   location ~ ^/uploads/(athlete-photos|session-files)/ {
       include /etc/nginx/snippets/tactiplan-security.conf;
       add_header Content-Security-Policy "script-src 'none'; object-src 'none'" always;
       client_max_body_size 1m;
       proxy_pass http://127.0.0.1:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
   (regex vence o prefixo `/uploads/` porque este não usa `^~`). `nginx -t && systemctl reload nginx`.
   O mesmo no `tactiplan-staging` (porta 3002) para testar antes.
3. Acompanhar `pm2 logs sports-api | grep "acesso SEM assinatura"` por 1–2 semanas.
4. `UPLOADS_ASSINATURA=enforce` no `.env` + restart. Rollback = voltar para `log` ou remover o bloco do nginx.
5. Depois (precisa de front novo e OTA): a API devolver `avatar_url` assinado para a foto de perfil e o front usar esse campo
   em vez de montar a URL; aí `profile-photos` entra na regex.

**Pendência menor (não feita):** o PUT de atleta aceita qualquer `photo_url` do corpo. Quem souber o nome de um
arquivo de outra conta poderia gravá-lo e receber o link assinado. Sugestão: aceitar só `null` ou o valor atual.

## 4. Pendências fora do escopo da F0

- `CLAUDE.md` desatualizado (Multi-clube "Clube=3"). Não mexi.
- `origin/master` (staging) está atrás da produção. Quando o Arthur quiser, unificar: `app-nativo` → `master` e
  sincronizar o staging (que hoje roda `64d99b5`).
- O staging continua com o código antigo (aceita SANDBOX); não alterado.
- OTA não rodado; nginx não alterado; nenhuma migration.
