// Cliente do Conta Faggin (login único do ecossistema). O TactiPlan mantém a SUA tela de login;
// a senha passa a ser conferida no Conta (serviço interno em 127.0.0.1), que é a mesma para
// todos os produtos. Liga com CONTA_LOGIN=on (+ CONTA_CHAVE). Desligado ou fora do ar, o login
// volta a conferir a senha local, como antes. Detalhes: /var/www/conta/CLAUDE.md.
const URL_CONTA = process.env.CONTA_URL || 'http://127.0.0.1:3060';
const PRODUTO = 'tactiplan';

const ativo = () => process.env.CONTA_LOGIN === 'on' && !!process.env.CONTA_CHAVE;

async function chamar(metodo, caminho, corpo) {
  const r = await fetch(URL_CONTA + caminho, {
    method: metodo,
    headers: { 'content-type': 'application/json', 'x-produto': PRODUTO, 'x-chave': process.env.CONTA_CHAVE || '' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(4000),
  });
  let dados = null;
  try { dados = await r.json(); } catch { /* corpo vazio */ }
  return { status: r.status, dados };
}

// { ok: true, conta, usuario_id } | { ok: false, status } | { indisponivel: true }
async function autenticar(email, senha, ip) {
  try {
    const { status, dados } = await chamar('POST', '/v1/autenticar', { email, senha, ip });
    if (status === 200) return { ok: true, conta: dados.conta, usuario_id: dados.usuario_id };
    if (status === 401 || status === 429) return { ok: false, status };
    return { indisponivel: true };
  } catch {
    return { indisponivel: true };
  }
}

// Cria a conta. { criada: true, conta } | { existe: true, conta_id } | { indisponivel: true }
async function criar({ email, nome, senha }) {
  try {
    const { status, dados } = await chamar('POST', '/v1/contas', { email, nome, senha });
    if (status === 201) return { criada: true, conta: dados.conta };
    if (status === 409) return { existe: true, conta_id: dados.conta_id };
    return { indisponivel: true };
  } catch {
    return { indisponivel: true };
  }
}

// Registra que o usuário local `usuarioId` é a conta `contaId`. Melhor esforço.
async function vincular(contaId, usuarioId) {
  try { await chamar('POST', '/v1/vinculos', { conta_id: contaId, usuario_id: String(usuarioId) }); } catch (e) {
    console.error('conta.vincular:', e.message);
  }
}

// Senha trocada/definida no TactiPlan vale para a conta (e para todos os produtos). Melhor esforço:
// a senha local também é gravada, então o login continua funcionando se o Conta estiver fora.
async function definirSenha(email, senha) {
  if (!ativo()) return;
  try {
    const { status, dados } = await chamar('GET', `/v1/contas/por-email?email=${encodeURIComponent(email)}`);
    if (status === 200) {
      await chamar('POST', `/v1/contas/${dados.conta.id}/senha`, { senha });
    } else if (status === 404) {
      await chamar('POST', '/v1/contas', { email, senha });
    }
  } catch (e) {
    console.error('conta.definirSenha:', e.message);
  }
}

// --- Seletor de produtos (F3) ---------------------------------------------------------------
// Regra: NUNCA levar a sessão do navegador para outro domínio. A origem pede uma URL com código de
// uso único; o destino resgata servidor a servidor e emite a PRÓPRIA sessão.

async function contaIdPorEmail(email) {
  const { status, dados } = await chamar('GET', `/v1/contas/por-email?email=${encodeURIComponent(email)}`);
  return status === 200 && dados && dados.conta ? dados.conta.id : null;
}

// Produtos da conta deste e-mail → [{ produto, nome, atual }]. [] quando desligado/indisponível.
async function produtos(email) {
  if (!ativo() || !email) return [];
  try {
    const id = await contaIdPorEmail(email);
    if (!id) return [];
    const { status, dados } = await chamar('GET', `/v1/contas/${id}/produtos`);
    return status === 200 && Array.isArray(dados?.produtos) ? dados.produtos : [];
  } catch (e) {
    console.error('conta.produtos:', e.message);
    return [];
  }
}

// URL de entrada do produto `destino` com código de uso único, ou null.
async function trocar(email, destino) {
  if (!ativo() || !email || !destino) return null;
  try {
    const id = await contaIdPorEmail(email);
    if (!id) return null;
    const { status, dados } = await chamar('POST', '/v1/troca/codigo', { conta_id: id, destino: String(destino) });
    return status === 200 && dados?.url ? dados.url : null;
  } catch (e) {
    console.error('conta.trocar:', e.message);
    return null;
  }
}

// Resgata o código recebido de outro produto → { usuario_id, conta } | null.
async function resgatar(codigo) {
  if (!ativo() || !codigo) return null;
  try {
    const { status, dados } = await chamar('POST', '/v1/troca/resgatar', { codigo: String(codigo) });
    return status === 200 && dados ? { usuario_id: dados.usuario_id, conta: dados.conta } : null;
  } catch (e) {
    console.error('conta.resgatar:', e.message);
    return null;
  }
}

module.exports = { ativo, autenticar, criar, vincular, definirSenha, produtos, trocar, resgatar };
