import { useEffect, useState } from 'react';
import { BarChart3, FileText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { buscarRelatorio } from '../services/api';
import { formatarMoeda } from '../utils/formatacao';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ANOS = Array.from({ length: new Date().getFullYear() - 1998 }, (_, indice) => new Date().getFullYear() + 1 - indice);
const TIPOS_RELATORIO = {
    geral: { titulo: 'Geral', campo: 'geral', classe: 'chart-general' },
    nf: { titulo: 'NF', campo: 'nf', classe: 'chart-nf' },
    romaneio: { titulo: 'Romaneio', campo: 'romaneio', classe: 'chart-romaneio' }
};

function eixoMoeda(valor) {
    if (Math.abs(valor) >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)} mi`;
    if (Math.abs(valor) >= 1000) return `R$ ${(valor / 1000).toFixed(0)} mil`;
    return `R$ ${Math.round(valor)}`;
}

function GraficoBarras({ dados, campo, rotulos, ariaLabel, classe }) {
    const largura = Math.max(960, dados.length * 36 + 100);
    const altura = 280;
    const topo = 18;
    const base = 226;
    const esquerda = 75;
    const direita = 18;
    const valores = dados.map((item) => Number(item[campo] || 0));
    const maior = Math.max(1, ...valores, 0);
    const menor = Math.min(0, ...valores);
    const intervalo = maior - menor || 1;
    const escala = (base - topo) / intervalo;
    const zero = topo + maior * escala;
    const plot = largura - esquerda - direita;
    const passo = plot / dados.length;
    const larguraBarra = Math.min(38, Math.max(12, passo * 0.56));
    const marcas = Array.from({ length: 5 }, (_, indice) => ({
        valor: maior - indice * intervalo / 4,
        y: topo + indice * (base - topo) / 4
    }));

    return <div className="chart-scroll">
        <svg className="monthly-chart" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={ariaLabel}>
            {marcas.map((marca, indice) => <g key={indice}>
                <line x1={esquerda} y1={marca.y} x2={largura - direita} y2={marca.y} className="chart-grid" />
                <text x={esquerda - 12} y={marca.y + 4} className="chart-axis" textAnchor="end">{eixoMoeda(marca.valor)}</text>
            </g>)}
            {menor < 0 && <line x1={esquerda} y1={zero} x2={largura - direita} y2={zero} className="chart-zero" />}
            {dados.map((item, indice) => {
                const valor = valores[indice];
                const x = esquerda + passo * (indice + 0.5);
                const yValor = topo + (maior - valor) * escala;
                return <g key={item.mes || item.dia}>
                    {valor !== 0 && <rect
                        x={x - larguraBarra / 2}
                        y={Math.min(yValor, zero)}
                        width={larguraBarra}
                        height={Math.max(1, Math.abs(yValor - zero))}
                        rx="3"
                        className={valor < 0 ? 'chart-loss' : classe}
                    />}
                    <text x={x} y={258} className="chart-month" textAnchor="middle">{rotulos[indice]}</text>
                    <title>{`${rotulos[indice]}: ${formatarMoeda(valor)}`}</title>
                </g>;
            })}
        </svg>
    </div>;
}

function CartaoMetrica({ icone, classeIcone = '', rotulo, valor }) {
    return <div className="metric">
        <span className={`metric-icon ${classeIcone}`}>{icone}</span>
        <span>{rotulo}</span>
        <strong>{formatarMoeda(valor)}</strong>
    </div>;
}

function Relatorios() {
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [tipo, setTipo] = useState('geral');
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        buscarRelatorio(ano, mes)
            .then((resultado) => {
                if (ativo) {
                    setDados(resultado);
                    setErro('');
                    setCarregando(false);
                }
            })
            .catch((falha) => {
                if (ativo) {
                    setDados(null);
                    setErro(falha.message);
                    setCarregando(false);
                }
            });
        return () => { ativo = false; };
    }, [ano, mes]);

    const configuracao = TIPOS_RELATORIO[tipo];
    const resumoMensal = dados?.meses[mes - 1];
    const temDados = dados?.meses.some((item) => item[configuracao.campo] || (tipo === 'geral' && item.despesas));
    const rotulosDias = dados?.dias.map((item) => String(item.dia)) || [];

    return <section className="report-page">
        <header className="screen-header">
            <div><span className="screen-eyebrow">Gestao financeira</span><h1>Relatorios</h1></div>
            <div className="report-period-filters" aria-label="Periodo do relatorio">
                <label className="period-select">Mes
                    <select value={mes} onChange={(event) => setMes(Number(event.target.value))}>
                        {MESES_COMPLETOS.map((nome, indice) => <option key={nome} value={indice + 1}>{nome}</option>)}
                    </select>
                </label>
                <label className="period-select">Ano
                    <select value={ano} onChange={(event) => setAno(Number(event.target.value))}>
                        {ANOS.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
                    </select>
                </label>
            </div>
        </header>

        <div className="report-type-tabs" data-active={tipo} role="group" aria-label="Tipo de relatorio">
            {Object.entries(TIPOS_RELATORIO).map(([id, opcao]) => <button key={id} type="button" className={tipo === id ? 'active' : ''} aria-pressed={tipo === id} onClick={() => setTipo(id)}>{opcao.titulo}</button>)}
        </div>

        {carregando && <p className="report-state">Carregando relatorios...</p>}
        {erro && <p className="production-error" role="alert">{erro}</p>}
        {!carregando && dados && <div key={tipo} className="report-content">
            {tipo === 'geral' ? <>
                <div className="report-period-title"><h2>Resumo mensal</h2><span>{MESES_COMPLETOS[mes - 1]} de {ano}</span></div>
                <div className="report-metrics">
                    <CartaoMetrica icone={<BarChart3 size={20} />} rotulo="Faturamento geral mensal" valor={resumoMensal.geral} />
                    <CartaoMetrica icone={<Wallet size={20} />} classeIcone="expense" rotulo="Despesas mensais" valor={resumoMensal.despesas} />
                    <CartaoMetrica icone={resumoMensal.lucro < 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />} classeIcone="profit" rotulo="Lucro mensal" valor={resumoMensal.lucro} />
                </div>
                <div className="report-period-title"><h2>Resumo anual</h2><span>{ano}</span></div>
                <div className="report-metrics">
                    <CartaoMetrica icone={<BarChart3 size={20} />} rotulo="Faturamento geral anual" valor={dados.totais.geral} />
                    <CartaoMetrica icone={<Wallet size={20} />} classeIcone="expense" rotulo="Despesas anuais" valor={dados.totais.despesas} />
                    <CartaoMetrica icone={dados.totais.lucro < 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />} classeIcone="profit" rotulo="Lucro anual" valor={dados.totais.lucro} />
                </div>
            </> : <>
                <div className="report-period-title"><h2>Resumo de {configuracao.titulo}</h2><span>{ano}</span></div>
                <div className="report-metrics report-metrics-revenue">
                    <CartaoMetrica icone={<FileText size={20} />} rotulo={`${configuracao.titulo} no mes`} valor={resumoMensal[configuracao.campo]} />
                    <CartaoMetrica icone={<BarChart3 size={20} />} rotulo={`${configuracao.titulo} no ano`} valor={dados.totais[configuracao.campo]} />
                </div>
            </>}

            {!temDados && <p className="report-state">Nenhum lancamento encontrado para este periodo.</p>}

            <section className="report-chart-section">
                <div className="chart-header"><div><h2>{configuracao.titulo} por dia</h2><p>{MESES_COMPLETOS[mes - 1]} de {ano}</p></div><div className="chart-legend"><span><i className={configuracao.classe} />{configuracao.titulo}</span></div></div>
                <GraficoBarras dados={dados.dias} campo={configuracao.campo} rotulos={rotulosDias} ariaLabel={`Grafico mensal de ${configuracao.titulo}`} classe={configuracao.classe} />
            </section>
            <section className="report-chart-section">
                <div className="chart-header"><div><h2>{configuracao.titulo} por mes</h2><p>Janeiro a dezembro de {ano}</p></div><div className="chart-legend"><span><i className={configuracao.classe} />{configuracao.titulo}</span></div></div>
                <GraficoBarras dados={dados.meses} campo={configuracao.campo} rotulos={MESES} ariaLabel={`Grafico anual de ${configuracao.titulo}`} classe={configuracao.classe} />
            </section>
            {tipo === 'geral' && <>
                <section className="report-chart-section">
                    <div className="chart-header"><div><h2>Lucro por dia</h2><p>Faturamento geral menos despesas</p></div><div className="chart-legend"><span><i className="legend-profit" />Positivo</span><span><i className="legend-loss" />Negativo</span></div></div>
                    <GraficoBarras dados={dados.dias} campo="lucro" rotulos={rotulosDias} ariaLabel="Grafico mensal de lucro" classe="chart-profit" />
                </section>
                <section className="report-chart-section">
                    <div className="chart-header"><div><h2>Lucro por mes</h2><p>Janeiro a dezembro de {ano}</p></div><div className="chart-legend"><span><i className="legend-profit" />Positivo</span><span><i className="legend-loss" />Negativo</span></div></div>
                    <GraficoBarras dados={dados.meses} campo="lucro" rotulos={MESES} ariaLabel="Grafico anual de lucro" classe="chart-profit" />
                </section>
            </>}
        </div>}
    </section>;
}

export default Relatorios;
