// CPF/CNPJ com dígito verificador. Mesma lógica de backend-node/src/utils/documento.js.
export function soDigitos(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

export function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}

export function cnpjValido(v) {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = base.split('').reduce((acc, n, i) => acc + Number(n) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const dv1 = calc(d.slice(0, 12));
  return dv1 === Number(d[12]) && calc(d.slice(0, 12) + dv1) === Number(d[13]);
}

export function validarDocumento(v) {
  const digitos = soDigitos(v);
  if (digitos.length === 11) return { ok: cpfValido(digitos), tipo: 'cpf', digitos };
  if (digitos.length === 14) return { ok: cnpjValido(digitos), tipo: 'cnpj', digitos };
  return { ok: false, tipo: null, digitos };
}

// Máscara enquanto digita: CPF até 11 dígitos, CNPJ depois disso.
export function mascararDocumento(v) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
