const producaoModel = require("../models/producaoModel");
const clienteModel = require('../models/clienteModel');
const ERRO_ROMANEIO_VINCULADO = 'Desvincule a NF do romaneio antes de alterar o cliente ou o valor final.';

async function validarItem(body) {
    const clienteId = Number(body.cliente_id);
    const tipoLamina = typeof body.tipo_lamina === 'string' ? body.tipo_lamina.trim() : '';
    const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : null;
    if (!Number.isSafeInteger(clienteId) || clienteId <= 0) return { erro: 'Selecione um cliente cadastrado.' };
    if (!tipoLamina || !body.data) return { erro: 'Tipo lamina e data sao obrigatorios.' };
    if (observacao?.length > 2000) return { erro: 'A observação pode ter até 2.000 caracteres.' };
    const cliente = await clienteModel.buscarPorId(clienteId);
    if (!cliente) return { erro: 'O cliente selecionado nao foi encontrado.' };
    return { item: { cliente_id: clienteId, cliente: cliente.nome, tipo_lamina: tipoLamina, data: body.data, observacao } };
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
        if (error.constraint === 'lancamentos_romaneio_fk') {
            return res.status(409).json({ erro: ERRO_ROMANEIO_VINCULADO });
        }
        return res.status(500).json({ erro: "Erro ao atualizar item de producao.", detalhe: error.message });
    }
}

async function atualizarStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, valor_final } = req.body || {};

        if (!producaoModel.STATUS_VALIDOS.includes(status)) {
            return res.status(400).json({ erro: 'Status inválido.' });
        }
        let valorFinal;
        if (status === 'Pronto') {
            valorFinal = typeof valor_final === 'number' || typeof valor_final === 'string'
                ? Number(valor_final)
                : NaN;
            if (!(valorFinal > 0 && valorFinal <= 999999999999.99) || Math.round(valorFinal * 100) / 100 !== valorFinal) {
                return res.status(400).json({ erro: 'Informe um valor final positivo com até duas casas decimais.' });
            }
        }

        const { item, semCliente } = await producaoModel.atualizarStatus(id, status, valorFinal);
        if (semCliente) {
            return res.status(409).json({ erro: 'Edite o serviço e selecione um cliente cadastrado antes de marcar como pronto.' });
        }
        if (!item) return res.status(404).json({ erro: 'Item de produção não encontrado.' });
        return res.json(item);
    } catch (error) {
        if (error.constraint === 'lancamentos_romaneio_fk') {
            return res.status(409).json({ erro: ERRO_ROMANEIO_VINCULADO });
        }
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
