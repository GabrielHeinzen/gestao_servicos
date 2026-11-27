const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const path = require('node:path');
const express = require('express');
const { iniciarPostgres } = require('./postgres.cjs');

async function iniciarServidor(pastaDados, binarios) {
    const banco = await iniciarPostgres(pastaDados, binarios);
    const config = banco.configuracao;
    process.env.DB_HOST = config.host;
    process.env.DB_PORT = String(config.port);
    process.env.DB_USER = config.user;
    process.env.DB_PASSWORD = config.password;
    process.env.DB_NAME = config.database;

    let db;
    let servidor;
    async function encerrar() {
        try {
            if (servidor?.listening) {
                await new Promise((resolve) => servidor.close(resolve));
            }
            if (db) await db.end();
        } finally {
            await banco.encerrar();
        }
    }

    try {
        const api = require('./runtime/backend/app');
        db = require('./runtime/backend/config/database');
        await db.query('SELECT 1');

        const chave = randomBytes(32).toString('hex');
        const aplicacao = express();
        aplicacao.disable('x-powered-by');
        aplicacao.use((_req, res, next) => {
            res.setHeader('Content-Security-Policy',
                "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
            next();
        });
        aplicacao.use('/api', (req, res, next) => {
            if (req.get('X-Gestao-Desktop') !== chave) {
                return res.status(403).json({ erro: 'Acesso disponível pelo aplicativo.' });
            }
            next();
        }, api, (_req, res) => res.sendStatus(404));
        aplicacao.use(express.static(path.join(__dirname, 'runtime', 'frontend')));
        servidor = aplicacao.listen(0, '127.0.0.1');
        await once(servidor, 'listening');
        return { origem: `http://127.0.0.1:${servidor.address().port}`, chave, encerrar };
    } catch (erro) {
        await encerrar().catch(() => {});
        throw erro;
    }
}

module.exports = { iniciarServidor };
