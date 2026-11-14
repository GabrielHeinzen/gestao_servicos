const db = require('../config/database');
const clienteModel = require('./clienteModel');

const TIPOS = ['romaneio', 'nf', 'despesa'];
let tabelaPromise;

async function prepararTabela() {
    await clienteModel.garantirTabela();
    await db.query(`
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
        );
        ALTER TABLE lancamentos_financeiros
            ADD COLUMN IF NOT EXISTS cliente_id INTEGER;
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'lancamentos_cliente_fk'
            ) THEN
                ALTER TABLE lancamentos_financeiros
                    ADD CONSTRAINT lancamentos_cliente_fk
                    FOREIGN KEY (cliente_id) REFERENCES clientes_empresas(id) ON DELETE RESTRICT;
            END IF;
        END $$;
    `);
}

function garantirTabela() {
    if (!tabelaPromise) {
        tabelaPromise = prepararTabela().catch((erro) => {
            tabelaPromise = null;
            throw erro;
        });
    }

    return tabelaPromise;
}

const COLUNAS = `id, tipo, cliente_id, numero_nf, documento, empresa,
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
            (tipo, cliente_id, numero_nf, documento, empresa, data, valor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${COLUNAS}`,
        [item.tipo, item.cliente_id, item.numero_nf, item.documento, item.empresa, item.data, item.valor]
    );
    return resultado.rows[0];
}

async function atualizar(id, item) {
    await garantirTabela();
    const resultado = await db.query(
        `UPDATE lancamentos_financeiros
         SET cliente_id = $1, numero_nf = $2, documento = $3, empresa = $4, data = $5, valor = $6
         WHERE id = $7 AND tipo = $8
         RETURNING ${COLUNAS}`,
        [item.cliente_id, item.numero_nf, item.documento, item.empresa, item.data, item.valor, id, item.tipo]
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
        `SELECT tipo, cliente_id, empresa, TO_CHAR(data, 'YYYY-MM-DD') AS data, valor
         FROM lancamentos_financeiros
         WHERE data >= MAKE_DATE($1, 1, 1) AND data < MAKE_DATE($1 + 1, 1, 1)
         ORDER BY data, id`,
        [ano]
    );
    return resultado.rows;
}

module.exports = { TIPOS, listar, criar, atualizar, excluir, relatorio };
