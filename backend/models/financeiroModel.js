const db = require('../config/database');

const TIPOS = ['romaneio', 'nf', 'despesa'];
const COLUNAS = `id, tipo, cliente_id, producao_id, romaneio_id, conciliacao_legada, numero_nf, descricao, documento, empresa,
    TO_CHAR(data, 'YYYY-MM-DD') AS data, valor, criado_em`;

async function listar(tipo) {
    const parametros = tipo ? [tipo] : [];
    const filtro = tipo ? 'WHERE tipo = $1' : '';
    const resultado = await db.query(
        `SELECT ${COLUNAS},
                (SELECT nf.id FROM lancamentos_financeiros nf WHERE nf.romaneio_id = l.id) AS nf_vinculada_id
         FROM lancamentos_financeiros l ${filtro}
         ORDER BY data DESC, id DESC`,
        parametros
    );
    return resultado.rows;
}

async function comVinculoRomaneio(item, operacao) {
    if (!item.romaneio_id) return operacao(db);

    return db.emTransacao(async (conexao) => {
        const { rows: [romaneio] } = await conexao.query(
            `SELECT id, cliente_id FROM lancamentos_financeiros
             WHERE id = $1 AND tipo = 'romaneio' AND valor = $3
               AND (cliente_id = $2 OR (cliente_id IS NULL AND LOWER(TRIM(empresa)) = LOWER(TRIM($4))))
             FOR UPDATE`,
            [item.romaneio_id, item.cliente_id, item.valor, item.empresa]
        );
        if (!romaneio) {
            const erro = new Error('Selecione um romaneio com o mesmo cliente e valor da NF.');
            erro.code = 'ROMANEIO_INCOMPATIVEL';
            throw erro;
        }

        return operacao(conexao, romaneio);
    });
}

async function criar(item) {
    return comVinculoRomaneio(item, async (conexao, romaneio) => {
        await identificarRomaneioLegado(conexao, romaneio, item.cliente_id);
        const resultado = await conexao.query(
            `INSERT INTO lancamentos_financeiros
                (tipo, cliente_id, numero_nf, documento, empresa, data, valor, romaneio_id, descricao)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING ${COLUNAS}`,
            [item.tipo, item.cliente_id, item.numero_nf, item.documento, item.empresa, item.data,
                item.valor, item.romaneio_id, item.descricao]
        );
        return resultado.rows[0];
    });
}

async function identificarRomaneioLegado(conexao, romaneio, clienteId) {
    if (romaneio && romaneio.cliente_id === null) {
        await conexao.query('UPDATE lancamentos_financeiros SET cliente_id = $1 WHERE id = $2', [clienteId, romaneio.id]);
    }
}

async function atualizarDados(conexao, id, item) {
    const resultado = await conexao.query(
        `UPDATE lancamentos_financeiros
         SET cliente_id = $1, numero_nf = $2, documento = $3, empresa = $4, data = $5, valor = $6,
             romaneio_id = CASE WHEN $9 THEN $10 ELSE romaneio_id END,
             conciliacao_legada = conciliacao_legada AND NOT $9,
             descricao = CASE WHEN $11 THEN $12 ELSE descricao END
         WHERE id = $7 AND tipo = $8
         RETURNING ${COLUNAS}`,
        [item.cliente_id, item.numero_nf, item.documento, item.empresa, item.data, item.valor,
            id, item.tipo, item.tipo === 'nf' && item.romaneio_id !== undefined, item.romaneio_id,
            item.tipo === 'nf' && item.descricao !== undefined, item.descricao]
    );
    return resultado.rows[0];
}

async function atualizar(id, item) {
    if (item.tipo !== 'romaneio') {
        return comVinculoRomaneio(item, async (conexao, romaneio) => {
            if (romaneio?.cliente_id === null) {
                const { rowCount } = await conexao.query(
                    "SELECT id FROM lancamentos_financeiros WHERE id = $1 AND tipo = 'nf' FOR UPDATE",
                    [id]
                );
                if (!rowCount) return;
                await identificarRomaneioLegado(conexao, romaneio, item.cliente_id);
            }
            return atualizarDados(conexao, id, item);
        });
    }

    const { rows: [romaneio] } = await db.query(
        "SELECT producao_id FROM lancamentos_financeiros WHERE id = $1 AND tipo = 'romaneio'",
        [id]
    );
    if (!romaneio) return;
    if (!romaneio.producao_id) return atualizarDados(db, id, item);

    return db.emTransacao(async (conexao) => {
        // A Produção bloqueia o serviço antes de alterar o romaneio vinculado.
        const { rowCount } = await conexao.query(
            'SELECT id FROM producao WHERE id = $1 FOR NO KEY UPDATE',
            [romaneio.producao_id]
        );
        if (!rowCount) return;

        const atualizado = await atualizarDados(conexao, id, item);
        if (atualizado) {
            await conexao.query(
                `UPDATE producao SET cliente_id = $1, cliente = $2
                 WHERE id = $3 AND (cliente_id IS DISTINCT FROM $1 OR cliente IS DISTINCT FROM $2)`,
                [atualizado.cliente_id, atualizado.empresa, atualizado.producao_id]
            );
        }
        return atualizado;
    });
}

async function excluir(id) {
    const resultado = await db.query(
        'DELETE FROM lancamentos_financeiros WHERE id = $1 AND producao_id IS NULL RETURNING id',
        [id]
    );
    return resultado.rows[0];
}

async function vinculadoAProducao(id) {
    const resultado = await db.query(
        'SELECT 1 FROM lancamentos_financeiros WHERE id = $1 AND producao_id IS NOT NULL',
        [id]
    );
    return resultado.rowCount > 0;
}

async function relatorio(ano) {
    const resultado = await db.query(
        `SELECT tipo, cliente_id, empresa, TO_CHAR(data, 'YYYY-MM-DD') AS data, valor, conciliacao_legada,
                EXISTS (SELECT 1 FROM lancamentos_financeiros nf WHERE nf.romaneio_id = l.id) AS vinculado_a_nf
         FROM lancamentos_financeiros l
         WHERE data >= MAKE_DATE($1, 1, 1) AND data < MAKE_DATE($1 + 1, 1, 1)
         ORDER BY data, id`,
        [ano]
    );
    return resultado.rows;
}

module.exports = { TIPOS, listar, criar, atualizar, excluir, vinculadoAProducao, relatorio };
