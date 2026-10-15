// Validação de CPF/CNPJ com dígitos verificadores (DV).
// Mesma lógica em frontend/src/lib/documento.js — manter as duas iguais.

function soDigitos(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[t])) return false;
  }
  return true;
}

function cnpjValido(v) {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split('').reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const dv1 = calc(d.slice(0, 12));
  const dv2 = calc(d.slice(0, 12) + dv1);
  return dv1 === Number(d[12]) && dv2 === Number(d[13]);
}

// → { ok, tipo: 'cpf'|'cnpj'|null, digitos }
function validarDocumento(v) {
  const digitos = soDigitos(v);
  if (digitos.length === 11) return { ok: cpfValido(digitos), tipo: 'cpf', digitos };
  if (digitos.length === 14) return { ok: cnpjValido(digitos), tipo: 'cnpj', digitos };
  return { ok: false, tipo: null, digitos };
}

module.exports = { soDigitos, cpfValido, cnpjValido, validarDocumento };
