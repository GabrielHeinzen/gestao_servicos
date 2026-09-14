const db = require("../config/database");

const STATUS_VALIDOS = ["Em produção", "Pronto", "Coletado"];

async function garantirTabela() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS producao (
            id SERIAL PRIMARY KEY,
            cliente VARCHAR(120) NOT NULL,
            tipo_lamina VARCHAR(120) NOT NULL,
            data DATE NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Em produção',
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function criar(item) {
    await garantirTabela();

    const resultado = await db.query(
        `INSERT INTO producao (cliente, tipo_lamina, data)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [item.cliente, item.tipo_lamina, item.data]
    );

    return resultado.rows[0];
}

async function listar() {
    await garantirTabela();

    const resultado = await db.query(
        `SELECT id, cliente, tipo_lamina, data, status, criado_em
         FROM producao
         ORDER BY data ASC, criado_em ASC, id ASC`
    );

    return resultado.rows;
}

async function atualizar(id, item) {
    await garantirTabela();

    const resultado = await db.query(
        `UPDATE producao
         SET cliente = $1, tipo_lamina = $2, data = $3
         WHERE id = $4
         RETURNING *`,
        [item.cliente, item.tipo_lamina, item.data, id]
    );

    return resultado.rows[0];
}

async function atualizarStatus(id, status) {
    await garantirTabela();

    if (!STATUS_VALIDOS.includes(status)) {
        return null;
    }

    const resultado = await db.query(
        `UPDATE producao
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
    );

    return resultado.rows[0];
}

async function excluir(id) {
    await garantirTabela();

    const resultado = await db.query(
        `DELETE FROM producao
         WHERE id = $1
         RETURNING *`,
        [id]
    );

    return resultado.rows[0];
}

module.exports = {
    STATUS_VALIDOS,
    criar,
    listar,
    atualizar,
    atualizarStatus,
    excluir
};
