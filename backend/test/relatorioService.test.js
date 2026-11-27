const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularRelatorio } = require('../services/relatorioService');

function registrosLegados(registros) {
    return registros.map((registro) => ({ ...registro, conciliacao_legada: true }));
}

test('geral ignora romaneio quando NF tem cliente, data e valor iguais', () => {
    const registros = [
        { tipo: 'romaneio', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '100.00' },
        { tipo: 'nf', cliente_id: 1, empresa: 'Cliente A', data: '2026-04-10', valor: '100.00' }
    ];
    const relatorio = calcularRelatorio(registrosLegados(registros), 2026, 4);

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
    const relatorio = calcularRelatorio(registrosLegados(registros), 2026, 4);

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
    const relatorio = calcularRelatorio(registrosLegados(registros), 2026, 4);

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
    const relatorio = calcularRelatorio(registrosLegados(registros), 2026, 4);

    assert.equal(relatorio.totais.geral, 90);
});

test('vinculo confirmado conta na data da NF, inclusive em outro mes', () => {
    const registros = [
        { tipo: 'romaneio', vinculado_a_nf: true, data: '2026-04-30', valor: '120.00' },
        { tipo: 'nf', data: '2026-05-02', valor: '120.00' }
    ];
    const relatorio = calcularRelatorio(registros, 2026, 5);

    assert.equal(relatorio.meses[3].romaneio, 120);
    assert.equal(relatorio.meses[3].geral, 0);
    assert.equal(relatorio.dias[1].nf, 120);
    assert.equal(relatorio.dias[1].geral, 120);
    assert.equal(relatorio.totais.geral, 120);
});

test('romaneio vinculado a NF de outro ano aparece apenas no total de romaneios daquele ano', () => {
    const registros = [{ tipo: 'romaneio', vinculado_a_nf: true, data: '2026-12-29', valor: '120.00' }];
    const relatorio = calcularRelatorio(registros, 2026, 12);

    assert.equal(relatorio.totais.romaneio, 120);
    assert.equal(relatorio.totais.geral, 0);
});

test('NF avulsa nao anula romaneio de mesmo cliente, data e valor', () => {
    const dados = { empresa: 'Cliente A', data: '2026-04-30', valor: '120.00' };
    const registros = [
        { ...dados, tipo: 'romaneio', conciliacao_legada: true },
        { ...dados, tipo: 'nf', conciliacao_legada: false }
    ];
    const relatorio = calcularRelatorio(registros, 2026, 4);

    assert.equal(relatorio.totais.geral, 240);
});
