const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularRelatorio } = require('../services/relatorioService');

test('geral ignora romaneio quando NF tem cliente, data e valor iguais', () => {
    const registros = [
        { tipo: 'romaneio', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '100.00' },
        { tipo: 'nf', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '100.00' }
    ];
    const relatorio = calcularRelatorio(registros, 2026, 4);

    assert.equal(relatorio.totais.romaneio, 100);
    assert.equal(relatorio.totais.nf, 100);
    assert.equal(relatorio.totais.geral, 100);
    assert.equal(relatorio.dias[9].geral, 100);
});

test('geral soma lancamentos quando qualquer campo de correspondencia muda', () => {
    const registros = [
        { tipo: 'romaneio', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '100.00' },
        { tipo: 'nf', cliente_id: 2, empresa: 'Cliente B', data: '2026-04-10', valor: '100.00' },
        { tipo: 'nf', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-11', valor: '100.00' },
        { tipo: 'nf', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '120.00' }
    ];
    const relatorio = calcularRelatorio(registros, 2026, 4);

    assert.equal(relatorio.totais.romaneio, 100);
    assert.equal(relatorio.totais.nf, 320);
    assert.equal(relatorio.totais.geral, 420);
});

test('calcula despesas e lucro sobre o faturamento geral deduplicado', () => {
    const registros = [
        { tipo: 'romaneio', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '250.00' },
        { tipo: 'nf', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '250.00' },
        { tipo: 'despesa', cliente_id: null, empresa: 'Fornecedor', data: '2026-04-12', valor: '80.00' }
    ];
    const relatorio = calcularRelatorio(registros, 2026, 4);

    assert.equal(relatorio.totais.geral, 250);
    assert.equal(relatorio.totais.despesas, 80);
    assert.equal(relatorio.totais.lucro, 170);
    assert.equal(relatorio.meses[3].lucro, 170);
});

test('registros antigos sem ID usam o nome normalizado para correspondencia', () => {
    const registros = [
        { tipo: 'romaneio', cliente_id: null, empresa: '  Cliente Antigo ', data: '2026-04-10', valor: '90.00' },
        { tipo: 'nf', cliente_id: 7, empresa: 'cliente antigo', data: '2026-04-10', valor: '90.00' }
    ];
    const relatorio = calcularRelatorio(registros, 2026, 4);

    assert.equal(relatorio.totais.geral, 90);
});
