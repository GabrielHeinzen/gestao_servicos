const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, readFile, realpath, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, scryptSync } = require('node:crypto');
const test = require('node:test');
const { Client, Pool } = require('pg');

const USUARIO = 'Gustavo Dums';
const SENHA = '#12345';
const SENHA_ANTERIOR = 'senha-personalizada-de-teste';
const novaSchema = () => 'gestao_teste_' + randomBytes(8).toString('hex');

async function prepararPostgres(t) {
    if (process.env.GESTAO_TEST_DB_URL) {
        const url = new URL(process.env.GESTAO_TEST_DB_URL);
        if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || !url.pathname.slice(1)) {
            throw new Error('Use uma URL PostgreSQL local de teste com o nome da base e sem parâmetros.');
        }
        return {
            host: url.hostname.replace(/^\[|\]$/g, ''),
            port: Number(url.port || 5432),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: decodeURIComponent(url.pathname.slice(1))
        };
    }
    if (process.platform !== 'win32') {
        throw new Error('Defina GESTAO_TEST_DB_URL para um PostgreSQL de teste.');
    }
    const { iniciarPostgres } = require('../../desktop/postgres.cjs');
    const binarios = path.resolve(__dirname, '../../desktop/node_modules/@embedded-postgres/windows-x64/native');
    const raiz = await realpath(os.tmpdir());
    const pasta = await mkdtemp(path.join(raiz, 'gestao-integracao-'));
    let banco;
    t.after(async () => {
        if (banco) await banco.encerrar();
        const destino = await realpath(pasta);
        assert.equal(path.dirname(destino), raiz);
        assert.match(path.basename(destino), /^gestao-integracao-/);
        await rm(destino, { recursive: true, force: true });
    });
    banco = await iniciarPostgres(pasta, binarios);
    return banco.configuracao;
}

test('API e migrações com PostgreSQL', { timeout: 120_000 }, async (t) => {
    // O cluster deve encerrar depois que as conexões dos testes forem fechadas.
    const limpezaPostgres = [];
    const teste = novaSchema();
    const legado = novaSchema();
    const historico = novaSchema();
    let admin;
    let adminConectado = false;
    let db;
    let dbLegado;
    let dbHistorico;
    let servidor;
    t.after(async () => {
        try {
            if (servidor?.listening) await new Promise((resolve) => servidor.close(resolve));
            if (db) await db.end();
            if (dbLegado) await dbLegado.end();
            if (dbHistorico) await dbHistorico.end();
            if (adminConectado) await admin.query(`DROP SCHEMA IF EXISTS ${teste}, ${legado}, ${historico} CASCADE`);
        } finally {
            try {
                if (admin) await admin.end();
            } finally {
                for (const limpar of limpezaPostgres) await limpar();
            }
        }
    });
    const configuracao = await prepararPostgres({ after: (fn) => limpezaPostgres.push(fn) });
    admin = new Client(configuracao);
    await admin.connect();
    adminConectado = true;
    await admin.query(`CREATE SCHEMA ${teste}; CREATE SCHEMA ${legado}; CREATE SCHEMA ${historico}`);
    Object.assign(process.env, {
        DB_HOST: configuracao.host, DB_PORT: String(configuracao.port), DB_USER: configuracao.user,
        DB_PASSWORD: configuracao.password, DB_NAME: configuracao.database,
        GESTAO_SENHA: '', GESTAO_SENHA_INICIAL: '',
        PGOPTIONS: '-c search_path=' + teste
    });
    const app = require('../app');
    db = require('../config/database');
    const { migrarBanco } = require('../config/migracoes');
    dbLegado = new Pool({ ...configuracao, options: '-c search_path=' + legado });
    dbHistorico = new Pool({ ...configuracao, options: '-c search_path=' + historico });

    await t.test('adota a base anterior sem perder clientes, valores ou vínculos', async () => {
        const ddl = await readFile(path.join(__dirname, '../migrations/001-esquema-base.sql'), 'utf8');
        await dbLegado.query(ddl);
        await dbLegado.query(`
            INSERT INTO clientes_empresas (nome) VALUES ('Cliente existente');
            INSERT INTO producao (cliente_id, cliente, tipo_lamina, data, status, observacao)
                VALUES (1, 'Cliente existente', 'Lâmina', '2026-10-15', 'Pronto', 'Manter observação');
            INSERT INTO lancamentos_financeiros (tipo, cliente_id, producao_id, empresa, data, valor)
                VALUES ('romaneio', 1, 1, 'Cliente existente', '2026-10-15', 1200);
            INSERT INTO lancamentos_financeiros (tipo, cliente_id, romaneio_id, numero_nf, empresa, data, valor, descricao)
                VALUES ('nf', 1, 1, 'N-1', 'Cliente existente', '2026-11-15', 1200, 'Descrição existente');
        `);
        await migrarBanco(dbLegado);
        const antes = await dbLegado.query('SELECT * FROM migracoes_aplicadas ORDER BY versao');
        await migrarBanco(dbLegado);
        assert.deepEqual((await dbLegado.query('SELECT * FROM migracoes_aplicadas ORDER BY versao')).rows, antes.rows);
        assert.deepEqual(antes.rows.map((item) => item.versao), [1, 2, 3]);
        const { rows } = await dbLegado.query(`
            SELECT c.nome, p.status, p.observacao, r.valor, nf.descricao, nf.romaneio_id, nf.conciliacao_legada
            FROM clientes_empresas c JOIN producao p ON p.cliente_id = c.id
            JOIN lancamentos_financeiros r ON r.producao_id = p.id
            JOIN lancamentos_financeiros nf ON nf.romaneio_id = r.id
        `);
        assert.deepEqual(rows, [{ nome: 'Cliente existente', status: 'Pronto', observacao: 'Manter observação',
            valor: '1200.00', descricao: 'Descrição existente', romaneio_id: 1, conciliacao_legada: false }]);
    });

    await t.test('completa uma instalação antiga e mantém a regra legada só nos dados históricos', async () => {
        await dbHistorico.query(`
            CREATE TABLE lancamentos_financeiros (
                id SERIAL PRIMARY KEY,
                tipo VARCHAR(12) NOT NULL,
                numero_nf VARCHAR(80),
                documento VARCHAR(120),
                empresa VARCHAR(120) NOT NULL,
                data DATE NOT NULL,
                valor NUMERIC(14, 2) NOT NULL,
                criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO lancamentos_financeiros (tipo, empresa, data, valor)
                VALUES ('romaneio', 'Empresa anterior', '2026-10-15', 100);
        `);
        await migrarBanco(dbHistorico);
        await dbHistorico.query(`
            INSERT INTO lancamentos_financeiros (tipo, empresa, data, valor)
                VALUES ('romaneio', 'Empresa atual', '2026-11-15', 200)
        `);
        const { rows } = await dbHistorico.query('SELECT empresa, conciliacao_legada FROM lancamentos_financeiros ORDER BY id');
        assert.deepEqual(rows, [
            { empresa: 'Empresa anterior', conciliacao_legada: true },
            { empresa: 'Empresa atual', conciliacao_legada: false }
        ]);
    });

    await t.test('atualiza uma conta 1.0.6 com senha personalizada para a senha predefinida', async () => {
        const anteriores = ['001-esquema-base.sql', '002-conta-local.sql'];
        const sal = randomBytes(16).toString('hex');
        const hashAnterior = sal + ':' + scryptSync(SENHA_ANTERIOR, sal, 64, {
            N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024
        }).toString('hex');
        await db.query(`CREATE TABLE migracoes_aplicadas (
            versao INTEGER PRIMARY KEY,
            arquivo TEXT NOT NULL,
            aplicada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        for (const [indice, arquivo] of anteriores.entries()) {
            await db.query(await readFile(path.join(__dirname, '../migrations', arquivo), 'utf8'));
            await db.query('INSERT INTO migracoes_aplicadas (versao, arquivo) VALUES ($1, $2)', [indice + 1, arquivo]);
        }
        await db.query('INSERT INTO conta_local (senha_hash, trocar_senha) VALUES ($1, FALSE)', [hashAnterior]);
        await app.prepararBanco();
        const { rows: [conta] } = await db.query('SELECT * FROM conta_local');
        assert.equal(conta.id, 1);
        assert.notEqual(conta.senha_hash, hashAnterior);
        assert.equal(Object.hasOwn(conta, 'trocar_senha'), false);
        await app.prepararBanco();
        assert.deepEqual((await db.query('SELECT * FROM conta_local')).rows, [conta]);
    });
    servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    let token;

    async function api(caminho, status, { metodo = 'GET', corpo, credencial = token } = {}) {
        const headers = {};
        if (credencial) headers.Authorization = 'Bearer ' + credencial;
        if (corpo !== undefined) headers['Content-Type'] = 'application/json';
        const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}${caminho}`, {
            method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo)
        });
        const texto = await resposta.text();
        assert.equal(resposta.status, status, `${metodo} ${caminho}: ${texto}`);
        return texto ? JSON.parse(texto) : undefined;
    }

    const login = (senha, status) => api('/auth/login', status, {
        metodo: 'POST', corpo: { usuario: USUARIO, senha }, credencial: null
    });

    await t.test('bloqueia dados sem sessão e aceita a senha predefinida sem exigir troca', async () => {
        for (const caminho of ['/cliente', '/producao', '/financeiro/lancamentos', '/financeiro/relatorios']) {
            await api(caminho, 401);
        }
        await login(SENHA_ANTERIOR, 401);
        const sessao = await login(SENHA, 200);
        assert.equal(Object.hasOwn(sessao, 'trocarSenha'), false);
        token = sessao.token;
        await api('/producao', 200);
    });

    await t.test('finaliza, coleta, reabre e cancela o serviço com o romaneio correto', async () => {
        const cliente = await api('/cliente', 201, { metodo: 'POST', corpo: { nome: 'Empresa de teste' } });
        const hoje = require('../services/prazoProducao').hojeEmSaoPaulo();
        const servico = await api('/producao', 201, {
            metodo: 'POST', corpo: { cliente_id: cliente.id, tipo_lamina: 'Lâmina', data: hoje, observacao: 'Integrar' }
        });
        const atualizar = (status, valor_final, resposta = 200) => api(`/producao/${servico.id}/status`, resposta, {
            metodo: 'PATCH', corpo: { status, valor_final }
        });
        const romaneios = () => api('/financeiro/lancamentos?tipo=romaneio', 200);
        const conferirProducao = async (status, valor) => {
            const [item] = await api('/producao', 200);
            assert.equal(item.id, servico.id);
            assert.equal(item.status, status);
            assert.equal(item.valor_final, valor);
        };
        await atualizar('Pronto', 0, 400);
        await conferirProducao('Em produção', null);
        await atualizar('Pronto', 1200);
        const [romaneio] = await romaneios();
        assert.equal(romaneio.producao_id, servico.id);
        await conferirProducao('Pronto', '1200.00');
        await atualizar('Pronto', 1500);
        assert.deepEqual((await romaneios()).map((item) => [item.id, item.valor]), [[romaneio.id, '1500.00']]);
        await atualizar('Coletado');
        await conferirProducao('Coletado', '1500.00');
        await atualizar('Em produção');
        await conferirProducao('Em produção', null);
        assert.deepEqual(await romaneios(), []);
        await atualizar('Pronto', 2400);
        await atualizar('Cancelado');
        await conferirProducao('Cancelado', null);
        assert.deepEqual(await romaneios(), []);

        await atualizar('Pronto', 2000);
        const [vinculado] = await romaneios();
        await api('/financeiro/lancamentos', 201, {
            metodo: 'POST', corpo: { tipo: 'nf', numero_nf: 'N-1', data: hoje, valor: 2000,
                cliente_id: cliente.id, romaneio_id: vinculado.id }
        });
        await atualizar('Pronto', 2500, 409);
        await conferirProducao('Pronto', '2000.00');
        const [ano, mes] = hoje.split('-').map(Number);
        const relatorio = await api(`/financeiro/relatorios?ano=${ano}&mes=${mes}`, 200);
        assert.equal(relatorio.totais.geral, 2000);
    });

    await t.test('invalida sessões ao sair e limita tentativas', async () => {
        const antiga = token;
        token = (await login(SENHA, 200)).token;
        await api('/cliente', 401, { credencial: antiga });
        await api('/auth/sair', 204, { metodo: 'POST' });
        await api('/cliente', 401);
        token = (await login(SENHA, 200)).token;
        await api('/cliente', 200);
        for (let i = 0; i < 5; i++) await login('senha-errada', 401);
        await login(SENHA, 429);
    });
});
