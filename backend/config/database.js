const { Pool } = require("pg");

const db = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "gestao_servicos",
    password: process.env.DB_PASSWORD || "gestao_local",
    port: Number(process.env.DB_PORT || 5432)
});

module.exports = db;

module.exports.emTransacao = async function emTransacao(operacao, banco = db) {
    const conexao = await banco.connect();
    try {
        await conexao.query('BEGIN');
        const resultado = await operacao(conexao);
        await conexao.query('COMMIT');
        return resultado;
    } catch (erro) {
        await conexao.query('ROLLBACK');
        throw erro;
    } finally {
        conexao.release();
    }
};
