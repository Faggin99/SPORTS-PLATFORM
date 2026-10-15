// Nomes de exibição e regras de equipe dos planos.
// A fonte é shared/planos.json (a mesma que o front usa). Os ids internos
// (pro/pro_annual/clube/clube_annual) nunca mudam: MP, RevenueCat e webhooks dependem deles.
const path = require('path');

const PADRAO = {
  entrada: { ids: ['pro', 'pro_annual'], nome: 'Comissão', max_convidados: 1 },
  clube: { ids: ['clube', 'clube_annual'], nome: 'Clube', max_convidados: 5 },
  site_planos_url: 'https://tactiplan.faggin.com.br/#planos',
};

let cfg = PADRAO;
try {
  cfg = { ...PADRAO, ...require(path.join(__dirname, '../../../shared/planos.json')) };
} catch (_) {
  // Sem o arquivo (deploy parcial): usa os padrões acima.
}

const NOME_ENTRADA = cfg.entrada.nome;
const NOME_CLUBE = cfg.clube.nome;

// Nome de exibição de um plano a partir do id ("Comissão Mensal", "Clube Anual"...).
// Planos fora do mapa (lifetime, free, admin) mantêm o nome do banco.
function nomePlano(planId, nomeDoBanco = null) {
  const id = String(planId || '');
  const anual = id.endsWith('_annual');
  if (cfg.entrada.ids.includes(id)) return `${NOME_ENTRADA} ${anual ? 'Anual' : 'Mensal'}`;
  if (cfg.clube.ids.includes(id)) return `${NOME_CLUBE} ${anual ? 'Anual' : 'Mensal'}`;
  return nomeDoBanco || id;
}

function isPlanoEntrada(planId) {
  return cfg.entrada.ids.includes(String(planId || ''));
}

module.exports = {
  NOME_ENTRADA,
  NOME_CLUBE,
  SITE_PLANOS_URL: cfg.site_planos_url,
  nomePlano,
  isPlanoEntrada,
  config: cfg,
};
