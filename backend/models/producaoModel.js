const db = require("../config/database");
const clienteModel = require('./clienteModel');

const STATUS_VALIDOS = ["Em produção", "Pronto", "Coletado"];

async function garantirTabela() {
    await clienteModel.garantirTabela();
    await db.query(`
        CREATE TABLE IF NOT EXISTS producao (
            id SERIAL PRIMARY KEY,
            cliente VARCHAR(120) NOT NULL,
            tipo_lamina VARCHAR(120) NOT NULL,
            data DATE NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Em produção',
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE producao ADD COLUMN IF NOT EXISTS cliente_id INTEGER;
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'producao_cliente_fk'
            ) THEN
                ALTER TABLE producao
                    ADD CONSTRAINT producao_cliente_fk
                    FOREIGN KEY (cliente_id) REFERENCES clientes_empresas(id) ON DELETE RESTRICT;
            END IF;
        END $$;
    `);
}

async function criar(item) {
    await garantirTabela();

    const resultado = await db.query(
        `INSERT INTO producao (cliente_id, cliente, tipo_lamina, data)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [item.cliente_id, item.cliente, item.tipo_lamina, item.data]
    );

    return resultado.rows[0];
}

async function listar() {
    await garantirTabela();

    const resultado = await db.query(
        `SELECT id, cliente_id, cliente, tipo_lamina, data, status, criado_em
         FROM producao
         ORDER BY data ASC, criado_em ASC, id ASC`
    );

    return resultado.rows;
}

async function atualizar(id, item) {
    await garantirTabela();

    const resultado = await db.query(
        `UPDATE producao
         SET cliente_id = $1, cliente = $2, tipo_lamina = $3, data = $4
         WHERE id = $5
         RETURNING *`,
        [item.cliente_id, item.cliente, item.tipo_lamina, item.data, id]
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
