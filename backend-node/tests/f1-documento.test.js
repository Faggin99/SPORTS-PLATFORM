// F1: CPF/CNPJ com dígito verificador (checkout pede o responsável).
const test = require('node:test');
const assert = require('node:assert');
const { validarDocumento } = require('../src/utils/documento');

test('CPF válido e inválido', () => {
  assert.deepStrictEqual(validarDocumento('529.982.247-25'), { ok: true, tipo: 'cpf', digitos: '52998224725' });
  assert.strictEqual(validarDocumento('529.982.247-24').ok, false);
  assert.strictEqual(validarDocumento('111.111.111-11').ok, false);
});

test('CNPJ válido e inválido', () => {
  assert.deepStrictEqual(validarDocumento('11.222.333/0001-81'), { ok: true, tipo: 'cnpj', digitos: '11222333000181' });
  assert.strictEqual(validarDocumento('11.222.333/0001-80').ok, false);
  assert.strictEqual(validarDocumento('00.000.000/0000-00').ok, false);
});

test('tamanho errado', () => {
  assert.deepStrictEqual(validarDocumento('123'), { ok: false, tipo: null, digitos: '123' });
  assert.strictEqual(validarDocumento(null).ok, false);
});
