const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const db = require('./database');

async function migrarBanco(banco = db) {
    const pasta = path.join(__dirname, '..', 'migrations');
    const arquivos = (await readdir(pasta)).filter((nome) => /^\d{3}-[a-z0-9-]+\.sql$/.test(nome)).sort();
    if (!arquivos.length) throw new Error('Nenhuma migração de banco encontrada.');
    const migracoes = new Map(arquivos.map((nome) => [Number(nome.slice(0, 3)), nome]));
    if (migracoes.size !== arquivos.length) throw new Error('Há versões repetidas nas migrações.');

    await db.emTransacao(async (conexao) => {
        // Impede que dois processos migrem a mesma base ao mesmo tempo.
        await conexao.query('SELECT pg_advisory_xact_lock(182701310)');
        await conexao.query(`
            CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
                versao INTEGER PRIMARY KEY,
                arquivo TEXT NOT NULL,
                aplicada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const { rows } = await conexao.query('SELECT versao, arquivo FROM migracoes_aplicadas');
        const aplicadas = new Set();
        for (const { versao, arquivo } of rows) {
            if (migracoes.get(versao) !== arquivo) {
                throw new Error(`Migração ${arquivo} não reconhecida. Verifique a versão do aplicativo.`);
            }
            aplicadas.add(versao);
        }
        for (const [versao, arquivo] of migracoes) {
            if (aplicadas.has(versao)) continue;
            try {
                await conexao.query(await readFile(path.join(pasta, arquivo), 'utf8'));
                await conexao.query('INSERT INTO migracoes_aplicadas (versao, arquivo) VALUES ($1, $2)', [versao, arquivo]);
            } catch (erro) {
                throw new Error(`Falha na migração ${arquivo}: ${erro.message}`, { cause: erro });
            }
        }
    }, banco);
}

module.exports = { migrarBanco };
