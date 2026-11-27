const financeiroModel = require('../models/financeiroModel');
const clienteModel = require('../models/clienteModel');
const { calcularRelatorio } = require('../services/relatorioService');

function dataValida(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

async function validar(body, tipoObrigatorio) {
    const tipo = tipoObrigatorio || body.tipo;
    let empresa = typeof body.empresa === 'string' ? body.empresa.trim() : '';
    const numero_nf = typeof body.numero_nf === 'string' ? body.numero_nf.trim() : '';
    const documento = typeof body.documento === 'string' ? body.documento.trim() : '';
    const valor = Number(body.valor);
    const clienteId = Number(body.cliente_id);
    let romaneioId;
    let descricao;

    if (!financeiroModel.TIPOS.includes(tipo)) return { erro: 'Tipo de lancamento invalido.' };
    if (!dataValida(body.data)) return { erro: 'Informe uma data valida.' };
    if (!Number.isFinite(valor) || valor <= 0 || valor > 999999999999.99 || Math.round(valor * 100) / 100 !== valor) {
        return { erro: 'Informe um valor positivo com ate duas casas decimais.' };
    }
    if (tipo === 'nf' && (!numero_nf || numero_nf.length > 80)) return { erro: 'Informe o numero da NF.' };
    if (tipo === 'nf' && Object.hasOwn(body, 'descricao')) {
        if (body.descricao !== null && typeof body.descricao !== 'string') {
            return { erro: 'Informe uma descrição em texto.' };
        }
        descricao = body.descricao?.trim() || null;
        if (descricao?.length > 200) return { erro: 'A descrição pode ter até 200 caracteres.' };
    }
    if (tipo === 'nf' && Object.hasOwn(body, 'romaneio_id')) {
        if (body.romaneio_id === null) romaneioId = null;
        else if (idValido(body.romaneio_id) && Number(body.romaneio_id) <= 2147483647) romaneioId = Number(body.romaneio_id);
        else return { erro: 'Selecione um romaneio válido.' };
    }
    if (tipo === 'despesa' && (!documento || documento.length > 120)) return { erro: 'Informe o documento.' };
    if (tipo === 'despesa') {
        if (!empresa || empresa.length > 120) return { erro: 'Informe uma empresa com ate 120 caracteres.' };
    } else {
        if (!Number.isSafeInteger(clienteId) || clienteId <= 0) return { erro: 'Selecione um cliente cadastrado.' };
        const cliente = await clienteModel.buscarPorId(clienteId);
        if (!cliente) return { erro: 'O cliente selecionado nao foi encontrado.' };
        empresa = cliente.nome;
    }

    return {
        item: {
            tipo,
            cliente_id: tipo === 'despesa' ? null : clienteId,
            numero_nf: tipo === 'nf' ? numero_nf : null,
            descricao,
            romaneio_id: romaneioId,
            documento: tipo === 'despesa' ? documento : null,
            empresa,
            data: body.data,
            valor
        }
    };
}

function idValido(id) {
    return /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
}

function responderErroAoSalvar(res, falha, mensagem) {
    if (falha.code === 'ROMANEIO_INCOMPATIVEL') return res.status(400).json({ erro: falha.message });
    if (falha.constraint === 'lancamentos_romaneio_unico') {
        return res.status(409).json({ erro: 'Este romaneio já está vinculado a outra NF.' });
    }
    if (falha.constraint === 'lancamentos_romaneio_fk') {
        return res.status(409).json({ erro: 'Desvincule a NF do romaneio antes de alterar o cliente ou o valor do vínculo.' });
    }
    return res.status(500).json({ erro: mensagem });
}

async function listar(req, res) {
    const { tipo } = req.query;
    if (tipo && !financeiroModel.TIPOS.includes(tipo)) return res.status(400).json({ erro: 'Tipo invalido.' });
    try {
        return res.json(await financeiroModel.listar(tipo));
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel carregar os lancamentos.' });
    }
}

async function criar(req, res) {
    try {
        const { item, erro } = await validar(req.body || {});
        if (erro) return res.status(400).json({ erro });
        return res.status(201).json(await financeiroModel.criar(item));
    } catch (falha) {
        return responderErroAoSalvar(res, falha, 'Nao foi possivel salvar o lancamento.');
    }
}

async function atualizar(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' });
    try {
        const { item, erro } = await validar(req.body || {});
        if (erro) return res.status(400).json({ erro });
        const resultado = await financeiroModel.atualizar(req.params.id, item);
        return resultado ? res.json(resultado) : res.status(404).json({ erro: 'Lancamento nao encontrado.' });
    } catch (falha) {
        return responderErroAoSalvar(res, falha, 'Nao foi possivel atualizar o lancamento.');
    }
}

async function excluir(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' });
    try {
        const resultado = await financeiroModel.excluir(req.params.id);
        if (resultado) return res.json(resultado);
        if (await financeiroModel.vinculadoAProducao(req.params.id)) {
            return res.status(409).json({ erro: 'O romaneio vinculado é removido ao cancelar, reabrir ou excluir o serviço na Produção.' });
        }
        return res.status(404).json({ erro: 'Lancamento nao encontrado.' });
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel excluir o lancamento.' });
    }
}

async function relatorio(req, res) {
    const ano = Number(req.query.ano);
    const mes = Number(req.query.mes);
    if (!/^\d{4}$/.test(String(req.query.ano)) || ano < 2000 || ano > 2100) {
        return res.status(400).json({ erro: 'Informe um ano entre 2000 e 2100.' });
    }
    if (!/^\d{1,2}$/.test(String(req.query.mes)) || mes < 1 || mes > 12) {
        return res.status(400).json({ erro: 'Informe um mes entre 1 e 12.' });
    }
    try {
        const registros = await financeiroModel.relatorio(ano);
        return res.json(calcularRelatorio(registros, ano, mes));
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel gerar o relatorio.' });
    }
}

module.exports = { listar, criar, atualizar, excluir, relatorio };
