const test = require('node:test');
const assert = require('node:assert/strict');
const { statusProducao } = require('../services/prazoProducao');

test('o atraso começa no oitavo dia útil após a data do serviço', () => {
    assert.equal(statusProducao('Em produção', '2026-11-16', '2026-11-25'), 'Em produção');
    assert.equal(statusProducao('Em produção', '2026-11-16', '2026-11-26'), 'Atrasado');
});

test('sábado e domingo não avançam a contagem', () => {
    assert.equal(statusProducao('Em produção', '2026-11-11', '2026-11-22'), 'Em produção');
    assert.equal(statusProducao('Em produção', '2026-11-11', '2026-11-23'), 'Atrasado');
});

test('serviços prontos, coletados ou cancelados mantêm o status depois do prazo', () => {
    for (const status of ['Pronto', 'Coletado', 'Cancelado']) {
        assert.equal(statusProducao(status, '2026-11-16', '2026-12-01'), status);
    }
});
