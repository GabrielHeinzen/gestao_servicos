const clienteModel = require('../models/clienteModel');

function idValido(id) {
    return /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
}

function validarNome(body) {
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
    if (!nome || nome.length > 120) return { erro: 'Informe o nome da empresa com ate 120 caracteres.' };
    return { nome };
}

async function cadastrar(req, res) {
    const { nome, erro } = validarNome(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        return res.status(201).json(await clienteModel.criar({ nome }));
    } catch (falha) {
        if (falha.code === '23505') return res.status(409).json({ erro: 'Este cliente ja esta cadastrado.' });
        return res.status(500).json({ erro: 'Nao foi possivel cadastrar o cliente.' });
    }
}

async function listar(_req, res) {
    try {
        return res.json(await clienteModel.listar());
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel carregar os clientes.' });
    }
}

async function buscarPorId(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' });
    try {
        const cliente = await clienteModel.buscarPorId(req.params.id);
        return cliente ? res.json(cliente) : res.status(404).json({ erro: 'Cliente nao encontrado.' });
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel carregar o cliente.' });
    }
}

async function atualizar(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' });
    const { nome, erro } = validarNome(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const cliente = await clienteModel.atualizar(req.params.id, { nome });
        return cliente ? res.json(cliente) : res.status(404).json({ erro: 'Cliente nao encontrado.' });
    } catch (falha) {
        if (falha.code === '23505') return res.status(409).json({ erro: 'Este cliente ja esta cadastrado.' });
        return res.status(500).json({ erro: 'Nao foi possivel atualizar o cliente.' });
    }
}

async function excluir(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' });
    try {
        const cliente = await clienteModel.excluir(req.params.id);
        return cliente ? res.json(cliente) : res.status(404).json({ erro: 'Cliente nao encontrado.' });
    } catch (falha) {
        if (falha.code === '23503') {
            return res.status(409).json({ erro: 'Este cliente possui lancamentos ou itens de producao e nao pode ser excluido.' });
        }
        return res.status(500).json({ erro: 'Nao foi possivel excluir o cliente.' });
    }
}

module.exports = { cadastrar, listar, buscarPorId, atualizar, excluir };
