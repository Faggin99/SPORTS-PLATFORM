#!/usr/bin/env node
// Virada da F1 (fim do plano Free) — DRY-RUN por padrão.
//
//   node scripts/virada-f1.js                 # só mostra o que faria (não grava nada)
//   node scripts/virada-f1.js --apply         # aplica numa transação
//   node scripts/virada-f1.js --revisao=a@x,b@y   # contas de revisão das lojas que ganham cortesia
//                                                 (padrão: review@tactiplan.faggin.com.br; --revisao= vazio = nenhuma)
//
// O que faz (com --apply):
//   1. Exige a migration 048 (coluna users.cortesia_permanente).
//   2. Lauro (prof.lauromartins@gmail.com): cortesia_permanente = TRUE e garante a assinatura
//      'lifetime' (100 anos) na workspace dele. Três camadas: flag + LIFETIME_EMAILS + lifetime.
//   3. Contas de revisão (--revisao): cortesia_permanente = TRUE, motivo "revisão das lojas".
//   4. Assinaturas do plano 'free' ainda ativas → status 'expired' (metadata.encerrado_por = 'virada-f1').
//   5. Plano 'free' → is_active = FALSE (some da lista de planos).
//   Todas as outras contas sem assinatura paga ficam em SÓ LEITURA automaticamente (é regra do
//   código, não precisa de UPDATE). Nada é apagado; assinaturas pagas, trials vigentes, vitalícias,
//   Apple/RevenueCat e Mercado Pago não são tocados.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const LAURO = 'prof.lauromartins@gmail.com';
const MOTIVO_LAURO = 'Gratuidade permanente (pai do dono) — virada F1 15/10/2026';
const MOTIVO_REVISAO = 'Conta de revisão das lojas — remover quando não precisar (virada F1)';
const REVISAO_PADRAO = ['review@tactiplan.faggin.com.br'];
const ATIVOS = ['trialing', 'active', 'past_due', 'paused'];

function argumentos(argv) {
  const apply = argv.includes('--apply');
  const rev = argv.find((a) => a.startsWith('--revisao='));
  const revisao = rev === undefined
    ? REVISAO_PADRAO
    : rev.slice('--revisao='.length).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return { apply, revisao };
}

function usavel(s, agora = Date.now()) {
  if (!s) return false;
  if (s.plan_id === 'lifetime') return true;
  if (s.plan_id === 'free') return false;
  if (s.status === 'trialing') return !s.trial_ends_at || new Date(s.trial_ends_at).getTime() >= agora;
  if (s.status === 'active') return !s.current_period_end || new Date(s.current_period_end).getTime() >= agora;
  if (['past_due'].includes(s.status)) return true;
  return !!(s.cancel_at_period_end && s.current_period_end && new Date(s.current_period_end).getTime() > agora);
}

// Função pura (testada): classifica cada usuário e lista as ações.
//   users: [{id,email,role,deleted_at,cortesia_permanente,cortesia_motivo}]
//   subs:  [{id,user_id,workspace_id,plan_id,status,provider,trial_ends_at,current_period_end,cancel_at_period_end,metadata}]
//   members: [{user_id, owner_id}]  (membros aceitos → dono da workspace)
function planejar({ users, subs, members = [], adminEmails = [], lifetimeEmails = [LAURO], revisao = REVISAO_PADRAO, agora = Date.now() }) {
  const low = (e) => String(e || '').toLowerCase();
  const acoes = [];
  const contas = [];
  const vivos = users.filter((u) => !u.deleted_at);

  const lauro = vivos.find((u) => low(u.email) === LAURO);
  if (!lauro) {
    acoes.push({ tipo: 'aviso', texto: `Conta ${LAURO} não encontrada — nada a marcar.` });
  } else {
    if (!lauro.cortesia_permanente) acoes.push({ tipo: 'cortesia', user_id: lauro.id, email: lauro.email, motivo: MOTIVO_LAURO });
    const temLifetime = subs.some((s) => s.user_id === lauro.id && s.plan_id === 'lifetime' && ATIVOS.includes(s.status));
    if (!temLifetime) acoes.push({ tipo: 'lifetime', user_id: lauro.id, email: lauro.email });
  }
  for (const email of revisao) {
    const u = vivos.find((x) => low(x.email) === email);
    if (!u) acoes.push({ tipo: 'aviso', texto: `Conta de revisão ${email} não encontrada.` });
    else if (!u.cortesia_permanente) acoes.push({ tipo: 'cortesia', user_id: u.id, email: u.email, motivo: MOTIVO_REVISAO });
  }
  for (const s of subs.filter((x) => x.plan_id === 'free' && ATIVOS.includes(x.status))) {
    acoes.push({ tipo: 'encerrar_free', sub_id: s.id, user_id: s.user_id });
  }

  const cortesiaIds = new Set(acoes.filter((a) => a.tipo === 'cortesia').map((a) => a.user_id));
  const acessoDe = (u) => {
    if (u.role === 'admin' || adminEmails.includes(low(u.email))) return 'admin';
    if (u.cortesia_permanente || cortesiaIds.has(u.id) || lifetimeEmails.includes(low(u.email))) return 'cortesia';
    const minhas = subs.filter((s) => s.user_id === u.id && usavel(s, agora));
    if (minhas.length) return 'paga';
    return 'so_leitura';
  };
  const porId = Object.fromEntries(vivos.map((u) => [u.id, u]));
  for (const u of vivos) {
    const acesso = acessoDe(u);
    const subsDele = subs.filter((s) => s.user_id === u.id && (ATIVOS.includes(s.status) || s.plan_id === 'lifetime'));
    const meta = subsDele.map((s) => s.metadata || {}).find((m) => m.demo || m.grantedBy || m.changedBy) || null;
    const equipes = members.filter((m) => m.user_id === u.id)
      .map((m) => porId[m.owner_id]).filter(Boolean)
      .filter((dono) => acessoDe(dono) !== 'so_leitura')
      .map((dono) => dono.email);
    contas.push({
      email: u.email,
      acesso,
      planos: subsDele.map((s) => `${s.plan_id}/${s.status}${s.provider && s.provider !== 'mercadopago' ? '/' + s.provider : ''}${s.trial_ends_at ? ' até ' + String(s.trial_ends_at).slice(0, 10) : (s.current_period_end && s.plan_id !== 'lifetime' ? ' até ' + String(s.current_period_end).slice(0, 10) : '')}`).join(', ') || '—',
      especial: meta ? JSON.stringify(meta) : (u.cortesia_motivo || ''),
      membro_de: equipes.join(', '),
    });
  }
  const ordem = { admin: 0, cortesia: 1, paga: 2, so_leitura: 3 };
  contas.sort((a, b) => ordem[a.acesso] - ordem[b.acesso] || a.email.localeCompare(b.email));
  return { acoes, contas };
}

async function main() {
  const { apply, revisao } = argumentos(process.argv.slice(2));
  const { pool } = require('../src/config/database');
  const { ADMIN_EMAILS, LIFETIME_EMAILS } = require('../src/config/specialUsers');
  const client = await pool.connect();
  try {
    const col = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cortesia_permanente'`
    );
    if (col.rows.length === 0) {
      console.error('ERRO: migration 048 não aplicada (users.cortesia_permanente não existe). Rode a migration antes.');
      process.exitCode = 1;
      return;
    }
    const users = (await client.query(
      'SELECT id, email, role, deleted_at, cortesia_permanente, cortesia_motivo FROM users ORDER BY created_at'
    )).rows;
    const subs = (await client.query(
      `SELECT id, user_id, workspace_id, plan_id, status, provider, trial_ends_at, current_period_end,
              cancel_at_period_end, metadata
         FROM subscriptions
        WHERE status IN ('trialing','active','past_due','paused')
           OR plan_id = 'lifetime'
           OR (cancel_at_period_end = TRUE AND current_period_end > NOW())`
    )).rows;
    const members = (await client.query(
      `SELECT m.user_id, w.owner_id FROM workspace_members m JOIN workspaces w ON w.id = m.workspace_id
        WHERE m.accepted_at IS NOT NULL AND m.user_id IS NOT NULL`
    )).rows;

    const { acoes, contas } = planejar({
      users, subs, members, revisao,
      adminEmails: ADMIN_EMAILS, lifetimeEmails: LIFETIME_EMAILS,
    });

    console.log(`\n=== Virada F1 — ${apply ? 'APLICANDO' : 'DRY-RUN (nada é gravado; use --apply)'} ===\n`);
    console.log('Contas e acesso depois da virada:');
    console.table(contas);
    const resumo = contas.reduce((acc, c) => ({ ...acc, [c.acesso]: (acc[c.acesso] || 0) + 1 }), {});
    console.log('Resumo:', resumo, '\n');
    console.log('Ações:');
    for (const a of acoes) console.log(' -', a.tipo, a.email || a.sub_id || '', a.motivo || a.texto || '');
    console.log(" - desativar plano 'free' (plans.is_active = false)");

    if (!apply) {
      console.log('\nDRY-RUN: nada foi alterado.');
      return;
    }

    await client.query('BEGIN');
    for (const a of acoes) {
      if (a.tipo === 'cortesia') {
        await client.query(
          'UPDATE users SET cortesia_permanente = TRUE, cortesia_motivo = $2 WHERE id = $1',
          [a.user_id, a.motivo]
        );
      } else if (a.tipo === 'lifetime') {
        // Só cabe 1 assinatura "ativa" por usuário (uq_subscriptions_active_per_user):
        // encerra as não-vitalícias que ainda ocupam a vaga (ex.: trial vencido) antes de dar o vitalício.
        await client.query(
          `UPDATE subscriptions
              SET status = 'expired', canceled_at = COALESCE(canceled_at, NOW()), updated_at = NOW(),
                  metadata = COALESCE(metadata, '{}'::jsonb) || '{"encerrado_por":"virada-f1","motivo":"substituida por lifetime"}'::jsonb
            WHERE user_id = $1 AND plan_id <> 'lifetime' AND status IN ('trialing','active','past_due')`,
          [a.user_id]
        );
        await client.query(
          `INSERT INTO subscriptions (user_id, workspace_id, plan_id, status, current_period_start, current_period_end, metadata)
           VALUES ($1, (SELECT id FROM workspaces WHERE owner_id = $1 ORDER BY created_at LIMIT 1),
                   'lifetime', 'active', NOW(), NOW() + INTERVAL '100 years',
                   '{"grantedBy":"virada-f1","motivo":"cortesia permanente"}'::jsonb)`,
          [a.user_id]
        );
      } else if (a.tipo === 'encerrar_free') {
        await client.query(
          `UPDATE subscriptions
              SET status = 'expired', canceled_at = COALESCE(canceled_at, NOW()), updated_at = NOW(),
                  metadata = COALESCE(metadata, '{}'::jsonb) || '{"encerrado_por":"virada-f1"}'::jsonb
            WHERE id = $1 AND plan_id = 'free'`,
          [a.sub_id]
        );
      }
    }
    await client.query(`UPDATE plans SET is_active = FALSE, updated_at = NOW() WHERE id = 'free'`);
    await client.query(
      `INSERT INTO billing_events (type, raw) VALUES ('virada_f1.aplicada', $1)`,
      [JSON.stringify({ acoes, resumo, em: new Date().toISOString() })]
    );
    await client.query('COMMIT');
    console.log('\nAPLICADO. Reinicie o sports-api se ainda não reiniciou (pm2 restart sports-api).');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* nada */ }
    console.error('Falhou (nada foi gravado):', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) main();

module.exports = { planejar, argumentos, usavel, LAURO };
