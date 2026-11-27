const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const db = require('../config/database');

const USUARIO = 'Gustavo Dums';
const SENHA = process.env.GESTAO_SENHA || process.env.GESTAO_SENHA_INICIAL || '#12345';
const DERIVACAO = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derivarSenha = promisify(scrypt);
const DURACAO_SESSAO = 8 * 60 * 60_000;
let sessao;
let tentativas = 0;
let fimDoLimite = 0;
let verificando = false;

function senhaValida(senha) {
    return typeof senha === 'string' && senha.length > 0 && senha.length <= 128;
}

async function gerarHash(senha) {
    const sal = randomBytes(16).toString('hex');
    const hash = await derivarSenha(senha, sal, 64, DERIVACAO);
    return `${sal}:${hash.toString('hex')}`;
}

async function compararSenha(senha, armazenada) {
    if (!/^[0-9a-f]{32}:[0-9a-f]{128}$/.test(armazenada)) return false;
    const [sal, hash] = armazenada.split(':');
    const calculado = await derivarSenha(senha, sal, 64, DERIVACAO);
    return timingSafeEqual(calculado, Buffer.from(hash, 'hex'));
}

async function buscarConta() {
    const { rows: [conta] } = await db.query('SELECT senha_hash FROM conta_local WHERE id = 1');
    return conta;
}

async function inicializarConta() {
    if (!senhaValida(SENHA)) throw new Error('A senha configurada deve ter de 1 a 128 caracteres.');
    const conta = await buscarConta();
    if (conta && await compararSenha(SENHA, conta.senha_hash)) return;
    // Substitui também a senha personalizada da versão que exigia a troca.
    await db.query(`INSERT INTO conta_local (senha_hash) VALUES ($1)
        ON CONFLICT (id) DO UPDATE SET senha_hash = EXCLUDED.senha_hash`, [await gerarHash(SENHA)]);
}

function abrirSessao() {
    const token = randomBytes(32).toString('hex');
    sessao = { token, expiraEm: Date.now() + DURACAO_SESSAO };
    return { ...sessao, usuario: USUARIO };
}

function exigirAcesso(req, res, next) {
    res.set('Cache-Control', 'no-store');
    const token = req.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!sessao || sessao.expiraEm <= Date.now() || !token ||
        !timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(sessao.token, 'hex'))) {
        return res.status(401).json({ erro: 'Entre novamente para continuar.', codigo: 'SESSAO_EXPIRADA' });
    }
    next();
}

function limitarTentativas(acao) {
    return async (req, res) => {
        if (verificando) {
            return res.status(429).set('Retry-After', '1').json({ erro: 'Aguarde e tente novamente.' });
        }
        const agora = Date.now();
        if (agora >= fimDoLimite) {
            tentativas = 0;
            fimDoLimite = agora + 60_000;
        }
        if (tentativas >= 5) {
            res.set('Retry-After', String(Math.ceil((fimDoLimite - agora) / 1000)));
            return res.status(429).json({ erro: 'Muitas tentativas. Aguarde um minuto e tente novamente.' });
        }
        tentativas++;
        verificando = true;
        try {
            return await acao(req, res);
        } finally {
            verificando = false;
        }
    };
}

async function entrar(req, res) {
    const { usuario, senha } = req.body || {};
    const conta = await buscarConta();
    if (!conta || typeof usuario !== 'string' || usuario.trim() !== USUARIO ||
        !senhaValida(senha) || !await compararSenha(senha, conta.senha_hash)) {
        return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    }
    tentativas = 0;
    res.json(abrirSessao());
}

function sair(_req, res) {
    sessao = undefined;
    res.sendStatus(204);
}

module.exports = { inicializarConta, exigirAcesso, limitarTentativas, entrar, sair };
