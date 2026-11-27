const db = require('../config/database');

async function criar(cliente) {
    const resultado = await db.query(
        'INSERT INTO clientes_empresas (nome) VALUES ($1) RETURNING id, nome, criado_em',
        [cliente.nome]
    );
    return resultado.rows[0];
}

async function listar() {
    const resultado = await db.query(
        'SELECT id, nome, criado_em FROM clientes_empresas ORDER BY LOWER(nome), id'
    );
    return resultado.rows;
}

async function buscarPorId(id) {
    const resultado = await db.query(
        'SELECT id, nome, criado_em FROM clientes_empresas WHERE id = $1',
        [id]
    );
    return resultado.rows[0];
}

async function atualizar(id, cliente) {
    return db.emTransacao(async (conexao) => {
        const { rows: [atualizado] } = await conexao.query(
            'UPDATE clientes_empresas SET nome = $1 WHERE id = $2 RETURNING id, nome, criado_em',
            [cliente.nome, id]
        );
        if (atualizado) {
            await conexao.query('UPDATE producao SET cliente = $1 WHERE cliente_id = $2', [cliente.nome, id]);
            await conexao.query('UPDATE lancamentos_financeiros SET empresa = $1 WHERE cliente_id = $2', [cliente.nome, id]);
        }
        return atualizado;
    });
}

async function excluir(id) {
    const resultado = await db.query(
        'DELETE FROM clientes_empresas WHERE id = $1 RETURNING id, nome, criado_em',
        [id]
    );
    return resultado.rows[0];
}

module.exports = { criar, listar, buscarPorId, atualizar, excluir };
