const producaoModel = require("../models/producaoModel");

async function cadastrar(req, res) {
    try {
        const { cliente, tipo_lamina, data } = req.body;

        if (!cliente || !tipo_lamina || !data) {
            return res.status(400).json({ erro: "Cliente, tipo lamina e data sao obrigatorios." });
        }

        const resultado = await producaoModel.criar({ cliente, tipo_lamina, data });

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
        const { cliente, tipo_lamina, data } = req.body;

        if (!cliente || !tipo_lamina || !data) {
            return res.status(400).json({ erro: "Cliente, tipo lamina e data sao obrigatorios." });
        }

        const resultado = await producaoModel.atualizar(id, { cliente, tipo_lamina, data });

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
