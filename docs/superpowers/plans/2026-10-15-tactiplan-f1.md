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

## Deploy

Ver relatório final (passos exatos) — repetidos no fim deste arquivo depois da implementação.
