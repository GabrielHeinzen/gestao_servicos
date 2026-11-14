const db = require('../config/database');

let tabelaPromise;

function garantirTabela() {
    if (!tabelaPromise) {
        tabelaPromise = db.query(`
            CREATE TABLE IF NOT EXISTS clientes_empresas (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(120) NOT NULL,
                criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX IF NOT EXISTS clientes_empresas_nome_unico
                ON clientes_empresas (LOWER(TRIM(nome)));
        `).catch((erro) => {
            tabelaPromise = null;
            throw erro;
        });
    }
    return tabelaPromise;
}

async function criar(cliente) {
    await garantirTabela();
    const resultado = await db.query(
        'INSERT INTO clientes_empresas (nome) VALUES ($1) RETURNING id, nome, criado_em',
        [cliente.nome]
    );
    return resultado.rows[0];
}

async function listar() {
    await garantirTabela();
    const resultado = await db.query(
        'SELECT id, nome, criado_em FROM clientes_empresas ORDER BY LOWER(nome), id'
    );
    return resultado.rows;
}

async function buscarPorId(id) {
    await garantirTabela();
    const resultado = await db.query(
        'SELECT id, nome, criado_em FROM clientes_empresas WHERE id = $1',
        [id]
    );
    return resultado.rows[0];
}

async function atualizar(id, cliente) {
    await garantirTabela();
    const resultado = await db.query(
        'UPDATE clientes_empresas SET nome = $1 WHERE id = $2 RETURNING id, nome, criado_em',
        [cliente.nome, id]
    );
    if (resultado.rows[0]) {
        await db.query(
            'UPDATE lancamentos_financeiros SET empresa = $1 WHERE cliente_id = $2',
            [cliente.nome, id]
        ).catch((erro) => {
            if (erro.code !== '42P01' && erro.code !== '42703') throw erro;
        });
        await db.query(
            'UPDATE producao SET cliente = $1 WHERE cliente_id = $2',
            [cliente.nome, id]
        ).catch((erro) => {
            if (erro.code !== '42P01' && erro.code !== '42703') throw erro;
        });
    }
    return resultado.rows[0];
}

async function excluir(id) {
    await garantirTabela();
    const resultado = await db.query(
        'DELETE FROM clientes_empresas WHERE id = $1 RETURNING id, nome, criado_em',
        [id]
    );
    return resultado.rows[0];
}

module.exports = { garantirTabela, criar, listar, buscarPorId, atualizar, excluir };
