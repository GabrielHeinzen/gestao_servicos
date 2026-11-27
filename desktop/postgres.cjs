const { execFile, spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { access, mkdir, mkdtemp, readFile, rename, rmdir, symlink, unlink, writeFile } = require('node:fs/promises');
const net = require('node:net');
const { once } = require('node:events');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { Client } = require('pg');

const executar = promisify(execFile);
const HOST = '127.0.0.1';
const USUARIO = 'gestao_local';
const BANCO = 'gestao_servicos';

async function existe(arquivo) {
    try {
        await access(arquivo);
        return true;
    } catch (erro) {
        if (erro.code !== 'ENOENT') throw erro;
        return false;
    }
}

async function portaLivre() {
    const reserva = net.createServer();
    reserva.listen(0, HOST);
    await once(reserva, 'listening');
    const { port } = reserva.address();
    await new Promise((resolve) => reserva.close(resolve));
    return port;
}

async function criarBanco(configuracao) {
    const cliente = new Client({ ...configuracao, database: 'postgres', connectionTimeoutMillis: 5000 });
    try {
        await cliente.connect();
        const existeBanco = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [BANCO]);
        if (!existeBanco.rowCount) await cliente.query('CREATE DATABASE gestao_servicos');
    } finally {
        await cliente.end();
    }
}

async function iniciarCluster(pastaDados, binarios) {
    await mkdir(pastaDados, { recursive: true });
    const cluster = path.join(pastaDados, 'postgresql-16');
    const arquivoSenha = path.join(pastaDados, 'postgresql-16.senha');
    const inicializado = await existe(path.join(cluster, 'PG_VERSION'));
    const log = path.join(pastaDados, 'postgresql.log');
    const executarPostgres = (programa, argumentos) => executar(
        path.join(binarios, 'bin', programa + '.exe'),
        argumentos,
        { windowsHide: true, timeout: 40_000 }
    );
    const pgCtl = (modo, ...argumentos) => executarPostgres('pg_ctl', [modo, '-D', cluster, ...argumentos]);

    if (!inicializado && !await existe(arquivoSenha)) {
        await writeFile(arquivoSenha, randomBytes(32).toString('hex') + '\n', { flag: 'wx', mode: 0o600 });
    }
    const senha = (await readFile(arquivoSenha, 'utf8')).trim();
    if (!/^[a-f0-9]{64}$/.test(senha)) throw new Error('A configuração do banco local está inválida.');

    if (!inicializado) {
        const temporario = await mkdtemp(path.join(pastaDados, 'postgresql-inicializando-'));
        try {
            await executarPostgres('initdb', [
                '-D', temporario, '--username=' + USUARIO, '--pwfile=' + arquivoSenha,
                '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C',
                '--locale-provider=icu', '--icu-locale=pt-BR'
            ]);
            await rename(temporario, cluster);
        } catch (erro) {
            await rmdir(temporario).catch(() => {});
            throw erro;
        }
    }

    async function encerrar() {
        try {
            await pgCtl('status');
        } catch (erro) {
            if (erro.code === 3) return;
            throw erro;
        }
        await pgCtl('stop', '-m', 'fast', '-w', '-t', '25');
    }

    // Recupera o mesmo cluster caso a sessão anterior tenha sido interrompida.
    await encerrar();
    const porta = await portaLivre();
    try {
        const processo = spawn(path.join(binarios, 'bin', 'pg_ctl.exe'), [
            'start', '-D', cluster, '-l', log, '-w', '-t', '25', '-o', `-h ${HOST} -p ${porta}`
        ], { windowsHide: true, stdio: 'ignore', timeout: 40_000 });
        const [codigo] = await once(processo, 'exit');
        if (codigo !== 0) throw new Error(`pg_ctl retornou ${codigo ?? 'um sinal'}.`);
        const configuracao = { host: HOST, port: porta, user: USUARIO, password: senha, database: BANCO };
        await criarBanco(configuracao);
        return { configuracao, encerrar };
    } catch (erro) {
        await encerrar().catch(() => {});
        throw new Error(`Falha ao iniciar o PostgreSQL local. Consulte ${log}. ${erro.message}`);
    }
}

async function iniciarPostgres(pastaDados, binarios) {
    const caminhoAscii = (pasta) => /^[\x20-\x7E]+$/.test(pasta);
    if (caminhoAscii(binarios)) return iniciarCluster(pastaDados, binarios);

    // O initdb embute o caminho dos binários em scripts SQL codificados em UTF-8.
    const pastaAscii = [os.tmpdir(), pastaDados].find(caminhoAscii);
    if (!pastaAscii) throw new Error('Configure uma pasta temporária do Windows sem acentos para iniciar o PostgreSQL.');

    await mkdir(pastaAscii, { recursive: true });
    const pastaPonte = await mkdtemp(path.join(pastaAscii, 'gestao-pg-'));
    const ponte = path.join(pastaPonte, 'native');
    async function removerPonte() {
        await unlink(ponte).catch(() => {});
        await rmdir(pastaPonte).catch(() => {});
    }

    try {
        await symlink(binarios, ponte, 'junction');
        const banco = await iniciarCluster(pastaDados, ponte);
        return {
            configuracao: banco.configuracao,
            async encerrar() {
                await banco.encerrar();
                await removerPonte();
            }
        };
    } catch (erro) {
        await removerPonte();
        throw erro;
    }
}

module.exports = { iniciarPostgres };
