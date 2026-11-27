const dataLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

function hojeEmSaoPaulo() {
    return dataLocal.format(new Date());
}

function statusProducao(status, data, hoje) {
    if (status !== 'Em produção' || data >= hoje) return status;

    const dia = new Date(`${data}T00:00:00Z`);
    if (!Number.isFinite(dia.getTime())) return status;
    let diasUteis = 0;
    while (diasUteis < 8) {
        dia.setUTCDate(dia.getUTCDate() + 1);
        const diaDaSemana = dia.getUTCDay();
        if (diaDaSemana >= 1 && diaDaSemana <= 5) diasUteis += 1;
    }

    return dia.toISOString().slice(0, 10) <= hoje ? 'Atrasado' : status;
}

module.exports = { hojeEmSaoPaulo, statusProducao };
