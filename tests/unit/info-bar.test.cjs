const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function service(fetch) {
  const context = vm.createContext({ fetch, console: { error() {} } });
  vm.runInContext(
    fs.readFileSync('assets/js/info-bar.js', 'utf8') + '\nthis.service = ExchangeRateService;',
    context
  );
  return context.service;
}

test('daily PHP rates use the no-key provider and invert valid currencies', async () => {
  const api = service(async (url) => {
    assert.equal(url, 'https://open.er-api.com/v6/latest/PHP');
    return {
      ok: true,
      json: async () => ({
        result: 'success',
        base_code: 'PHP',
        rates: { USD: 0.02, GBP: 0, JPY: '3', CAD: Infinity },
      }),
    };
  });
  const data = await api.fetchRates();
  assert.equal(data.rates.USD, 50);
  for (const currency of ['GBP', 'JPY', 'CAD', 'AUD']) assert.equal(data.rates[currency], null);
});

test('provider errors and wrong base currency leave rates unavailable', async () => {
  for (const response of [
    { ok: false, status: 429 },
    { ok: true, json: async () => ({ result: 'error' }) },
    { ok: true, json: async () => ({ result: 'success', base_code: 'USD', rates: { USD: 1 } }) },
    {
      ok: true,
      json: async () => {
        throw new Error('bad JSON');
      },
    },
  ]) {
    assert.equal(await service(async () => response).fetchRates(), null);
  }
});
