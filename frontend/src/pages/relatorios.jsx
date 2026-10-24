import { useEffect, useState } from 'react';
import { BarChart3, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { buscarRelatorio } from '../services/api';
import { formatarMoeda } from '../utils/formatacao';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ANOS = Array.from({ length: new Date().getFullYear() - 1998 }, (_, indice) => new Date().getFullYear() + 1 - indice);

function eixoMoeda(valor) {
    if (Math.abs(valor) >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)} mi`;
    if (Math.abs(valor) >= 1000) return `R$ ${(valor / 1000).toFixed(0)} mil`;
    return `R$ ${Math.round(valor)}`;
}

function GraficoMensal({ meses, tipo }) {
    const largura = 960;
    const altura = 280;
    const topo = 18;
    const base = 226;
    const esquerda = 75;
    const direita = 18;
    const plot = largura - esquerda - direita;
    const passo = plot / 12;
    const meio = (indice) => esquerda + passo * (indice + 0.5);
    const lucro = tipo === 'lucro';
    const semDados = meses.every((mes) => lucro ? mes.lucro === 0 : mes.faturamento === 0);
    const maxPositivo = Math.max(1, ...meses.map((mes) => lucro ? mes.lucro : mes.faturamento));
    const maxNegativo = lucro ? Math.max(0, ...meses.map((mes) => -mes.lucro)) : 0;
    const escala = (base - topo) / (maxPositivo + maxNegativo);
    const zero = topo + maxPositivo * escala;
    const marcas = semDados
        ? [{ valor: 0, y: base }]
        : Array.from({ length: 5 }, (_, indice) => ({
            valor: maxPositivo - indice * (maxPositivo + maxNegativo) / 4,
            y: topo + indice * (base - topo) / 4
        }));

    return <div className="chart-scroll">
        <svg className="monthly-chart" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={lucro ? 'Gráfico de lucro mensal' : 'Gráfico de faturamento mensal'}>
            {marcas.map((marca, indice) => {
                return <g key={indice}>
                    <line x1={esquerda} y1={marca.y} x2={largura - direita} y2={marca.y} className="chart-grid" />
                    <text x={esquerda - 12} y={marca.y + 4} className="chart-axis" textAnchor="end">{eixoMoeda(marca.valor)}</text>
                </g>;
            })}
            {lucro && <line x1={esquerda} y1={zero} x2={largura - direita} y2={zero} className="chart-zero" />}
            {meses.map((mes, indice) => {
                const x = meio(indice);
                const larguraBarra = 37;
                const romaneioAltura = mes.romaneio * escala;
                const nfAltura = mes.nf * escala;
                const lucroY = topo + (maxPositivo - mes.lucro) * escala;
                return <g key={mes.mes}>
                    {lucro ? mes.lucro !== 0 && <rect x={x - larguraBarra / 2} y={Math.min(lucroY, zero)} width={larguraBarra} height={Math.max(1, Math.abs(lucroY - zero))} rx="4" className={mes.lucro >= 0 ? 'chart-profit' : 'chart-loss'} /> : <>
                        {mes.romaneio > 0 && <rect x={x - larguraBarra / 2} y={base - romaneioAltura} width={larguraBarra} height={romaneioAltura} rx="3" className="chart-romaneio" />}
                        {mes.nf > 0 && <rect x={x - larguraBarra / 2} y={base - romaneioAltura - nfAltura} width={larguraBarra} height={nfAltura} rx="3" className="chart-nf" />}
                    </>}
                    <text x={x} y={258} className="chart-month" textAnchor="middle">{MESES[indice]}</text>
                    <title>{lucro
                        ? `${MESES[indice]}: lucro ${formatarMoeda(mes.lucro)}`
                        : `${MESES[indice]}: Romaneios ${formatarMoeda(mes.romaneio)}, NF ${formatarMoeda(mes.nf)}, total ${formatarMoeda(mes.faturamento)}`}</title>
                </g>;
            })}
        </svg>
    </div>;
}

function Relatorios() {
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        let ativo = true;
        buscarRelatorio(ano)
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
    }, [ano]);

    const temDados = dados?.meses.some((mes) => mes.faturamento || mes.despesas);
    const resumoMensal = dados?.meses[mes - 1];

    return <section className="report-page">
        <header className="screen-header">
            <div><span className="screen-eyebrow">Gestão financeira</span><h1>Relatórios</h1></div>
            <div className="report-period-filters" aria-label="Período do relatório">
                <label className="period-select">Mês
                    <select value={mes} onChange={(event) => setMes(Number(event.target.value))}>
                        {MESES_COMPLETOS.map((nome, indice) => <option key={nome} value={indice + 1}>{nome}</option>)}
                    </select>
                </label>
                <label className="period-select">Ano
                    <select value={ano} onChange={(event) => { setAno(Number(event.target.value)); setCarregando(true); }}>
                        {ANOS.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
                    </select>
                </label>
            </div>
        </header>

        {carregando && <p className="report-state">Carregando relatórios...</p>}
        {erro && <p className="production-error" role="alert">{erro}</p>}
        {!carregando && dados && <>
            <div className="report-metrics">
                <div className="metric"><span className="metric-icon revenue"><BarChart3 size={20} /></span><span>Faturamento mensal</span><strong>{formatarMoeda(resumoMensal.faturamento)}</strong></div>
                <div className="metric"><span className="metric-icon expense"><Wallet size={20} /></span><span>Despesas mensais</span><strong>{formatarMoeda(resumoMensal.despesas)}</strong></div>
                <div className="metric"><span className="metric-icon profit">{resumoMensal.lucro < 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}</span><span>Lucro mensal</span><strong>{formatarMoeda(resumoMensal.lucro)}</strong></div>
            </div>
            <div className="report-metrics report-metrics-annual">
                <div className="metric"><span className="metric-icon revenue"><BarChart3 size={20} /></span><span>Faturamento anual</span><strong>{formatarMoeda(dados.totais.faturamento)}</strong></div>
                <div className="metric"><span className="metric-icon expense"><Wallet size={20} /></span><span>Despesas anuais</span><strong>{formatarMoeda(dados.totais.despesas)}</strong></div>
                <div className="metric"><span className="metric-icon profit">{dados.totais.lucro < 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}</span><span>Lucro anual</span><strong>{formatarMoeda(dados.totais.lucro)}</strong></div>
            </div>
            {!temDados && <p className="report-state">Nenhum lançamento encontrado para {ano}. Os gráficos serão preenchidos conforme novos registros forem cadastrados.</p>}

            <section className="report-chart-section">
                <div className="chart-header"><div><h2>Faturamento mensal</h2><p>Romaneios e notas fiscais</p></div><div className="chart-legend"><span><i className="legend-romaneio" />Romaneios</span><span><i className="legend-nf" />NF</span></div></div>
                <GraficoMensal meses={dados.meses} tipo="faturamento" />
            </section>
            <section className="report-chart-section">
                <div className="chart-header"><div><h2>Lucro mensal</h2><p>Faturamento menos despesas</p></div><div className="chart-legend"><span><i className="legend-profit" />Positivo</span><span><i className="legend-loss" />Negativo</span></div></div>
                <GraficoMensal meses={dados.meses} tipo="lucro" />
            </section>
        </>}
    </section>;
}

export default Relatorios;
