function arredondar(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function chaveCliente(registro) {
    return `nome:${String(registro.empresa || '').trim().toLocaleLowerCase('pt-BR')}`;
}

function chaveCorrespondencia(registro) {
    return `${chaveCliente(registro)}|${registro.data}|${Number(registro.valor).toFixed(2)}`;
}

function resumoVazio(indice) {
    return { [indice]: 0, romaneio: 0, nf: 0, geral: 0, faturamento: 0, despesas: 0, lucro: 0 };
}

function somar(resumo, campo, valor) {
    resumo[campo] = arredondar(resumo[campo] + Number(valor));
}

function finalizar(resumo) {
    resumo.faturamento = resumo.geral;
    resumo.lucro = arredondar(resumo.geral - resumo.despesas);
    return resumo;
}

function calcularRelatorio(registros, ano, mesSelecionado) {
    const quantidadeDias = new Date(Date.UTC(ano, mesSelecionado, 0)).getUTCDate();
    const meses = Array.from({ length: 12 }, (_, indice) => resumoVazio('mes'));
    meses.forEach((resumo, indice) => { resumo.mes = indice + 1; });
    const dias = Array.from({ length: quantidadeDias }, (_, indice) => resumoVazio('dia'));
    dias.forEach((resumo, indice) => { resumo.dia = indice + 1; });
    const notasLegadasPorChave = new Map();
    for (const registro of registros) {
        if (registro.tipo !== 'nf' || !registro.conciliacao_legada) continue;
        const chave = chaveCorrespondencia(registro);
        notasLegadasPorChave.set(chave, (notasLegadasPorChave.get(chave) || 0) + 1);
    }

    for (const registro of registros) {
        const [, mesTexto, diaTexto] = registro.data.split('-');
        const mes = Number(mesTexto);
        const dia = Number(diaTexto);
        const resumoMes = meses[mes - 1];
        const resumoDia = mes === mesSelecionado ? dias[dia - 1] : null;
        const valor = Number(registro.valor);

        if (registro.tipo === 'despesa') {
            somar(resumoMes, 'despesas', valor);
            if (resumoDia) somar(resumoDia, 'despesas', valor);
            continue;
        }

        somar(resumoMes, registro.tipo, valor);
        if (resumoDia) somar(resumoDia, registro.tipo, valor);

        if (registro.tipo === 'romaneio') {
            if (registro.vinculado_a_nf) continue;
            if (registro.conciliacao_legada) {
                const chave = chaveCorrespondencia(registro);
                const quantidade = notasLegadasPorChave.get(chave) || 0;
                if (quantidade > 0) {
                    notasLegadasPorChave.set(chave, quantidade - 1);
                    continue;
                }
            }
        }
        somar(resumoMes, 'geral', valor);
        if (resumoDia) somar(resumoDia, 'geral', valor);
    }

    meses.forEach(finalizar);
    dias.forEach(finalizar);
    const totais = finalizar(meses.reduce((acumulado, resumo) => {
        for (const campo of ['romaneio', 'nf', 'geral', 'despesas']) somar(acumulado, campo, resumo[campo]);
        return acumulado;
    }, resumoVazio('ano')));
    totais.ano = ano;

    return { ano, mes: mesSelecionado, meses, dias, totais };
}

module.exports = { calcularRelatorio };
