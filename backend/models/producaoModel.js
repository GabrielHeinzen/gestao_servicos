const db = require("../config/database");
const { hojeEmSaoPaulo, statusProducao } = require('../services/prazoProducao');

const STATUS_VALIDOS = ["Em produção", "Pronto", "Coletado", "Cancelado"];
async function criar(item) {
    const resultado = await db.query(
        `INSERT INTO producao (cliente_id, cliente, tipo_lamina, data, observacao)
         VALUES ($1, $2, $3, $4, COALESCE($5, ''))
         RETURNING *`,
        [item.cliente_id, item.cliente, item.tipo_lamina, item.data, item.observacao]
    );

    return resultado.rows[0];
}

async function listar() {
    const resultado = await db.query(
        `SELECT p.id, p.cliente_id, p.cliente, p.tipo_lamina, p.observacao,
                TO_CHAR(p.data, 'YYYY-MM-DD') AS data, p.status, p.criado_em,
                l.valor AS valor_final
         FROM producao p
         LEFT JOIN lancamentos_financeiros l ON l.producao_id = p.id
         ORDER BY p.data ASC, p.criado_em ASC, p.id ASC`
    );

    const hoje = hojeEmSaoPaulo();
    return resultado.rows.map((item) => ({
        ...item,
        status: statusProducao(item.status, item.data, hoje)
    }));
}

async function atualizar(id, item) {
    return db.emTransacao(async (conexao) => {
        const { rows: [atualizado] } = await conexao.query(
            `UPDATE producao
             SET cliente_id = $1, cliente = $2, tipo_lamina = $3, data = $4,
                 observacao = COALESCE($5, observacao)
             WHERE id = $6
             RETURNING *`,
            [item.cliente_id, item.cliente, item.tipo_lamina, item.data, item.observacao, id]
        );
        if (atualizado) {
            await conexao.query(
                'UPDATE lancamentos_financeiros SET cliente_id = $1, empresa = $2 WHERE producao_id = $3',
                [atualizado.cliente_id, atualizado.cliente, atualizado.id]
            );
        }
        return atualizado;
    });
}

async function atualizarStatus(id, status, valorFinal) {
    return db.emTransacao(async (conexao) => {
        const { rows: [servico] } = await conexao.query(
            'SELECT id, cliente_id, cliente FROM producao WHERE id = $1 FOR NO KEY UPDATE',
            [id]
        );
        if (!servico) return {};
        if (status === 'Pronto' && !servico.cliente_id) return { semCliente: true };

        if (status === 'Pronto') {
            await conexao.query(
                `INSERT INTO lancamentos_financeiros (tipo, producao_id, cliente_id, empresa, data, valor)
                 VALUES ('romaneio', $1, $2, $3, $4, $5)
                 ON CONFLICT (producao_id) DO UPDATE
                 SET valor = EXCLUDED.valor, cliente_id = EXCLUDED.cliente_id, empresa = EXCLUDED.empresa`,
                [servico.id, servico.cliente_id, servico.cliente, hojeEmSaoPaulo(), valorFinal]
            );
        } else if (status === 'Cancelado' || status === 'Em produção') {
            await conexao.query('DELETE FROM lancamentos_financeiros WHERE producao_id = $1', [servico.id]);
        }

        const { rows: [item] } = await conexao.query(
            'UPDATE producao SET status = $1 WHERE id = $2 RETURNING *',
            [status, servico.id]
        );
        return { item };
    });
}

async function excluir(id) {
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
