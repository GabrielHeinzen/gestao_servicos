const producaoModel = require("../models/producaoModel");
const clienteModel = require('../models/clienteModel');

async function validarItem(body) {
    const clienteId = Number(body.cliente_id);
    const tipoLamina = typeof body.tipo_lamina === 'string' ? body.tipo_lamina.trim() : '';
    if (!Number.isSafeInteger(clienteId) || clienteId <= 0) return { erro: 'Selecione um cliente cadastrado.' };
    if (!tipoLamina || !body.data) return { erro: 'Tipo lamina e data sao obrigatorios.' };
    const cliente = await clienteModel.buscarPorId(clienteId);
    if (!cliente) return { erro: 'O cliente selecionado nao foi encontrado.' };
    return { item: { cliente_id: clienteId, cliente: cliente.nome, tipo_lamina: tipoLamina, data: body.data } };
}

async function cadastrar(req, res) {
    try {
        const { item, erro } = await validarItem(req.body || {});
        if (erro) return res.status(400).json({ erro });
        const resultado = await producaoModel.criar(item);

        return res.status(201).json(resultado);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao cadastrar item de producao.", detalhe: error.message });
    }
}

async function listar(req, res) {
    try {
        const resultado = await producaoModel.listar();

        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao listar itens de producao.", detalhe: error.message });
    }
}

async function atualizar(req, res) {
    try {
        const { id } = req.params;
        const { item, erro } = await validarItem(req.body || {});
        if (erro) return res.status(400).json({ erro });
        const resultado = await producaoModel.atualizar(id, item);

        if (!resultado) {
            return res.status(404).json({ erro: "Item de producao nao encontrado." });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao atualizar item de producao.", detalhe: error.message });
    }
}

async function atualizarStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const resultado = await producaoModel.atualizarStatus(id, status);

        if (!resultado) {
            return res.status(400).json({ erro: "Status invalido ou item nao encontrado." });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao atualizar status.", detalhe: error.message });
    }
}

async function excluir(req, res) {
    try {
        const { id } = req.params;

        const resultado = await producaoModel.excluir(id);

        if (!resultado) {
            return res.status(404).json({ erro: "Item de producao nao encontrado." });
        }

        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao excluir item de producao.", detalhe: error.message });
    }
}

module.exports = {
    cadastrar,
    listar,
    atualizar,
    atualizarStatus,
    excluir
};
