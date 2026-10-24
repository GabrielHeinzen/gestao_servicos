const financeiroModel = require('../models/financeiroModel');

function dataValida(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function validar(body, tipoObrigatorio) {
    const tipo = tipoObrigatorio || body.tipo;
    const empresa = typeof body.empresa === 'string' ? body.empresa.trim() : '';
    const numero_nf = typeof body.numero_nf === 'string' ? body.numero_nf.trim() : '';
    const documento = typeof body.documento === 'string' ? body.documento.trim() : '';
    const valor = Number(body.valor);

    if (!financeiroModel.TIPOS.includes(tipo)) return { erro: 'Tipo de lancamento invalido.' };
    if (!empresa || empresa.length > 120) return { erro: 'Informe uma empresa com ate 120 caracteres.' };
    if (!dataValida(body.data)) return { erro: 'Informe uma data valida.' };
    if (!Number.isFinite(valor) || valor <= 0 || valor > 999999999999.99 || Math.round(valor * 100) / 100 !== valor) {
        return { erro: 'Informe um valor positivo com ate duas casas decimais.' };
    }
    if (tipo === 'nf' && (!numero_nf || numero_nf.length > 80)) return { erro: 'Informe o numero da NF.' };
    if (tipo === 'despesa' && (!documento || documento.length > 120)) return { erro: 'Informe o documento.' };

    return {
        item: {
            tipo,
            numero_nf: tipo === 'nf' ? numero_nf : null,
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
    const { item, erro } = validar(req.body || {});
    if (erro) return res.status(400).json({ erro });
    try {
        return res.status(201).json(await financeiroModel.criar(item));
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel salvar o lancamento.' });
    }
}

async function atualizar(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' });
    const { item, erro } = validar(req.body || {});
    if (erro) return res.status(400).json({ erro });
    try {
        const resultado = await financeiroModel.atualizar(req.params.id, item);
        return resultado ? res.json(resultado) : res.status(404).json({ erro: 'Lancamento nao encontrado.' });
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel atualizar o lancamento.' });
    }
}

async function excluir(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID invalido.' });
    try {
        const resultado = await financeiroModel.excluir(req.params.id);
        return resultado ? res.json(resultado) : res.status(404).json({ erro: 'Lancamento nao encontrado.' });
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel excluir o lancamento.' });
    }
}

async function relatorio(req, res) {
    const ano = Number(req.query.ano);
    if (!/^\d{4}$/.test(String(req.query.ano)) || ano < 2000 || ano > 2100) {
        return res.status(400).json({ erro: 'Informe um ano entre 2000 e 2100.' });
    }
    try {
        const registros = await financeiroModel.relatorio(ano);
        const meses = Array.from({ length: 12 }, (_, indice) => ({
            mes: indice + 1, romaneio: 0, nf: 0, despesas: 0, faturamento: 0, lucro: 0
        }));
        for (const registro of registros) {
            const mes = meses[registro.mes - 1];
            mes[registro.tipo === 'despesa' ? 'despesas' : registro.tipo] = Number(registro.total);
        }
        for (const mes of meses) {
            mes.faturamento = Math.round((mes.romaneio + mes.nf) * 100) / 100;
            mes.lucro = Math.round((mes.faturamento - mes.despesas) * 100) / 100;
        }
        const totais = meses.reduce((acumulado, mes) => ({
            faturamento: acumulado.faturamento + mes.faturamento,
            despesas: acumulado.despesas + mes.despesas,
            lucro: acumulado.lucro + mes.lucro
        }), { faturamento: 0, despesas: 0, lucro: 0 });
        return res.json({ ano, meses, totais });
    } catch {
        return res.status(500).json({ erro: 'Nao foi possivel gerar o relatorio.' });
    }
}

module.exports = { listar, criar, atualizar, excluir, relatorio };
