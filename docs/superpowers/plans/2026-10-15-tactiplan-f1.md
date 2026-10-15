# TactiPlan — F1 (planos novos, fim do Free, só leitura) — 15/10/2026

Base: worktree `/var/www/tactiplan-app`, branch `app-nativo` (produção `producao-2026-10-14` + F0).
O deploy vai **direto para a produção** (`/var/www/sports-platform`), feito pelo coordenador com o OK do Arthur.
Staging desligado: não há compatibilidade a manter com `master`/`64d99b5`.

## Decisões do dono (15/10/2026)

1. Plano de entrada (id interno `pro`/`pro_annual`, mantido por causa de MP/RevenueCat/webhooks) = **dono + 1 convidado**.
   Nome de exibição **"Comissão"** (provisório), definido num lugar só: `shared/planos.json`.
2. Clube igual a hoje (comissão completa até 5 convidados, até 5 categorias, add-ons de clube). Preços mantidos:
   entrada R$39,90/mês ou R$399/ano; Clube R$89/mês ou R$890/ano.
3. **Fim do Free.** `prof.lauromartins@gmail.com` = cortesia permanente (flag `users.cortesia_permanente` + lista
   `LIFETIME_EMAILS` + assinatura `lifetime`, três camadas). Demais contas sem assinatura paga = **só leitura**,
   imposta no servidor (402 `READ_ONLY`). Web mostra "Assinar/Renovar" → página de planos do site.
4. Limite de membros no servidor: entrada = dono + 1; Clube = dono + 5 (como hoje). Recusa com 402 `MEMBER_LIMIT`.
5. Sem cadastro grátis: cadastro web → escolher plano → dados da assinatura (nome da conta + responsável com
   CPF/CNPJ validado por DV) → Mercado Pago. Textos para "comissões técnicas, clubes e escolinhas".
6. Landing `/var/www/sites/tactiplan-lp-nova` atualizada (sem Free, "Comissão", preços só no site). Não publicada.

## Tarefas

- [x] T1 `shared/planos.json` + `backend-node/src/config/planos.js` (nome de exibição, limites, URL do site).
- [x] T2 Migration 048 (só ADD/merge): `users.cortesia_permanente/cortesia_motivo`, `workspaces.responsavel_*`,
      features `equipe`/`max_convidados` nos planos.
- [x] T3 `billing.getEffectiveSubscription`: cortesia/admin/lifetime → ilimitado; assinatura paga usável → ela;
      senão objeto sintético `plan_id='inactive'`, `read_only=true`. Plano `free` não conta mais como acesso.
- [x] T4 Middleware: escrita (POST/PUT/PATCH/DELETE) em conta só leitura → 402 `READ_ONLY`. Exceções:
      auth, conta, billing, admin, invites (aceitar convite), workspaces, announcements dismiss,
      `microcycles/ensure` (get-or-create usado para abrir a semana).
- [x] T5 Limite de membros no convite e no aceite (`MEMBER_LIMIT`).
- [x] T6 Cadastro sem assinatura inicial (nada de Free); nova workspace sem trial; checkout exige
      nome da conta + responsável + CPF/CNPJ válido.
- [x] T7 Front: nome via `shared/planos.json`; banner/estado só leitura; cadastro → planos; formulário do
      checkout com DV; textos sem Free/"Pro"/"para você"; Staff liberado no plano de entrada (com limite).
- [x] T8 Script de virada `backend-node/scripts/virada-f1.js` (dry-run por padrão; `--apply`).
- [x] T9 Testes (`tests/f1-*.test.js`) + build do front.
- [x] T10 Landing.

## O que muda para cada tipo de conta

| Conta | Antes | Depois da F1 |
|---|---|---|
| Admin (`role=admin` / `ADMIN_EMAILS`) | ilimitado | igual |
| Lauro (`prof.lauromartins@gmail.com`) | vitalício (lista + assinatura `lifetime`) | **cortesia permanente** (flag + lista + `lifetime`), nunca expira; quem ele convidar também edita |
| Assinatura paga ativa (MP ou Apple) / trial vigente / cancelada dentro do período | plano dela | igual; `pro` aparece como "Comissão" e passa a poder convidar **1** pessoa |
| Clube | até 5 convidados | igual (limite agora também no aceite) |
| Free / sem assinatura / vencida | Free (planeja, sem tático/exportação) | **só leitura**: vê tudo, não cria nem edita (402 `READ_ONLY`); web mostra Assinar/Renovar |
| Membro convidado | acesso pela assinatura do dono | igual (agora decidido sempre pelo **dono** da workspace) |
| Cadastro novo | Free | sem assinatura → tela de planos → dados da assinatura → Mercado Pago |

## Deploy na produção (executar com o OK do Arthur)

Os commits da F1 foram reaplicados sobre `producao-2026-10-14` no branch **`f1-producao`** (origin),
com o conflito do `package.json` resolvido (sem o teste de uploads da F0, que não está na produção).
Testado nesse branch: `npm test` 39/39, build do front e boot do backend.

1. Backup: `sudo /usr/local/bin/tactiplan-db-backup.sh` (gera `/var/backups/postgres/sports_platform_*.dump`).
2. Código:
   ```bash
   cd /var/www/sports-platform
   git status --short            # tem que estar limpo (o Arthur edita direto aqui); se não, parar e avaliar
   ANTES=$(git rev-parse HEAD)   # para rollback
   git fetch origin
   git merge --ff-only origin/f1-producao
   ```
3. Migration 048 (só ADD/merge):
   ```bash
   cd /var/www/sports-platform/backend-node
   set -a; . ./.env; set +a
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/048_f1_fim_do_free.sql
   psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (filename) VALUES ('048_f1_fim_do_free.sql') ON CONFLICT DO NOTHING" || true
   ```
4. Testes: `npm test` (39 testes, banco simulado).
5. Virada em DRY-RUN e conferência da tabela de contas: `node scripts/virada-f1.js`
   (`--revisao=` vazio se não quiser cortesia para `review@tactiplan.faggin.com.br`).
6. Front: `cd ../frontend && npm run build` (usa o `.env.production.local` da produção; o nginx serve `frontend/dist`).
7. `pm2 restart sports-api` e `curl -s https://app.tactiplan.faggin.com.br/api/health`.
8. Virada: `cd ../backend-node && node scripts/virada-f1.js --apply`.
9. Conferir: `curl -s https://app.tactiplan.faggin.com.br/api/billing/plans` (sem `free`, nomes "Comissão Mensal/Anual");
   entrar com uma conta sem assinatura (ex. `free@`/`expired@`): banner só leitura e salvar atleta → 402 `READ_ONLY`;
   entrar como Lauro: cria/edita normalmente.
10. Landing (quando o Arthur aprovar): ver "Landing" abaixo.

Rollback: antes do passo 2 anote `ANTES=$(git rev-parse HEAD)`; para voltar, `git reset --hard $ANTES`
(só se nada mais foi commitado depois) + `npm run build` no front + `pm2 restart sports-api`. A migration 048 é aditiva e pode ficar.
Se a virada já rodou: `UPDATE plans SET is_active = TRUE WHERE id = 'free'` e
`UPDATE subscriptions SET status = 'active' WHERE metadata->>'encerrado_por' = 'virada-f1'`.

## Landing

- No ar: `/var/www/sites/tactiplan-lp` (versão escura de 01/10). Cópia pronta com a F1: **`/var/www/sites/tactiplan-lp-f1`**
  (sem Free, "Comissão", CTAs para os planos, links `register?plano=&ciclo=`, FAQ e JSON-LD novos).
  Publicar: `rsync -a /var/www/sites/tactiplan-lp-f1/ /var/www/sites/tactiplan-lp/` (sem reload de nginx).
- O rascunho `/var/www/sites/tactiplan-lp-nova` (redesenho claro, nunca publicado) também foi atualizado, mas **não**
  é o que está no ar; o `build.py` de lá regenera FAQ/JSON-LD a partir de `_antigo.html` (ainda com Free) — não rodar.

## Onde trocar o nome "Comissão"

- `shared/planos.json` (`entrada.nome`) → backend (nomes na API, e-mails, mensagens de limite) e web (rebuild do front + restart).
- Landing estática: `tactiplan-lp-f1/index.html` (e `-nova`): ocorrências de "plano Comissão", "Comissão mensal/anual",
  `<h3>Comissão`. "comissão técnica" em minúsculas é texto genérico, não o nome do plano.

## Pendências fora da F1

- Termos de uso/privacidade (servidos da landing antiga, `sports-platform/landing`) ainda não falam em "conta da equipe".
- App Capacitor instalado (bundle de 01/09): em conta só leitura, salvar mostra o erro e manda para Assinatura
  (texto neutro / IAP no iOS). Sem OTA nesta fase.
- O índice único `uq_subscriptions_active_per_user` impede duas assinaturas pagas do mesmo dono (2ª workspace).
  O botão "Iniciar nova assinatura separada" foi retirado da tela de Assinatura.
- CLAUDE.md: seção de Billing atualizada; seção "Multi-clube" continua antiga.
