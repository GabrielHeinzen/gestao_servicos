const db = require('../config/database');

const TIPOS = ['romaneio', 'nf', 'despesa'];
let tabelaPromise;

function garantirTabela() {
    if (!tabelaPromise) {
        tabelaPromise = db.query(`
            CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
                id SERIAL PRIMARY KEY,
                tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('romaneio', 'nf', 'despesa')),
                numero_nf VARCHAR(80),
                documento VARCHAR(120),
                empresa VARCHAR(120) NOT NULL,
                data DATE NOT NULL,
                valor NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
                criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT campos_por_tipo CHECK (
                    (tipo = 'romaneio' AND numero_nf IS NULL AND documento IS NULL) OR
                    (tipo = 'nf' AND numero_nf IS NOT NULL AND documento IS NULL) OR
                    (tipo = 'despesa' AND numero_nf IS NULL AND documento IS NOT NULL)
                )
            )
        `).catch((erro) => {
            tabelaPromise = null;
            throw erro;
        });
    }

    return tabelaPromise;
}

const COLUNAS = `id, tipo, numero_nf, documento, empresa,
    TO_CHAR(data, 'YYYY-MM-DD') AS data, valor, criado_em`;

async function listar(tipo) {
    await garantirTabela();
    const parametros = tipo ? [tipo] : [];
    const filtro = tipo ? 'WHERE tipo = $1' : '';
    const resultado = await db.query(
        `SELECT ${COLUNAS} FROM lancamentos_financeiros ${filtro}
         ORDER BY data DESC, id DESC`,
        parametros
    );
    return resultado.rows;
}

async function criar(item) {
    await garantirTabela();
    const resultado = await db.query(
        `INSERT INTO lancamentos_financeiros
            (tipo, numero_nf, documento, empresa, data, valor)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUNAS}`,
        [item.tipo, item.numero_nf, item.documento, item.empresa, item.data, item.valor]
    );
    return resultado.rows[0];
}

async function atualizar(id, item) {
    await garantirTabela();
    const resultado = await db.query(
        `UPDATE lancamentos_financeiros
         SET numero_nf = $1, documento = $2, empresa = $3, data = $4, valor = $5
         WHERE id = $6 AND tipo = $7
         RETURNING ${COLUNAS}`,
        [item.numero_nf, item.documento, item.empresa, item.data, item.valor, id, item.tipo]
    );
    return resultado.rows[0];
}

async function excluir(id) {
    await garantirTabela();
    const resultado = await db.query(
        'DELETE FROM lancamentos_financeiros WHERE id = $1 RETURNING id',
        [id]
    );
    return resultado.rows[0];
}

async function relatorio(ano) {
    await garantirTabela();
    const resultado = await db.query(
        `SELECT EXTRACT(MONTH FROM data)::int AS mes, tipo, SUM(valor) AS total
         FROM lancamentos_financeiros
         WHERE data >= MAKE_DATE($1, 1, 1) AND data < MAKE_DATE($1 + 1, 1, 1)
         GROUP BY mes, tipo`,
        [ano]
    );
    return resultado.rows;
}

module.exports = { TIPOS, listar, criar, atualizar, excluir, relatorio };
