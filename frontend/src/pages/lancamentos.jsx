import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
    atualizarLancamento,
    criarLancamento,
    excluirLancamento,
    listarClientes,
    listarLancamentos
} from '../services/api';
import { formatarData, formatarMoeda } from '../utils/formatacao';

const TIPOS = {
    romaneio: { titulo: 'Romaneios', singular: 'Romaneio' },
    nf: { titulo: 'Notas fiscais', singular: 'NF' },
    despesa: { titulo: 'Gastos / Despesas', singular: 'Despesa' }
};

const REGRA_ANTERIOR = 'legado';
const DATA_FINANCEIRA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

function formularioVazio() {
    return {
        cliente_id: '', empresa: '', data: new Date().toLocaleDateString('en-CA'),
        valor: '', numero_nf: '', descricao: '', documento: '', romaneio_id: ''
    };
}

function Lancamentos({ tipo, onTipoChange, onAbrirClientes }) {
    const [itens, setItens] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [romaneios, setRomaneios] = useState([]);
    const [erroRomaneios, setErroRomaneios] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [versao, setVersao] = useState(0);
    const [busca, setBusca] = useState('');
    const [erro, setErro] = useState('');
    const [erroModal, setErroModal] = useState('');
    const [formulario, setFormulario] = useState(formularioVazio);
    const [editando, setEditando] = useState(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [excluindo, setExcluindo] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        listarLancamentos(tipo)
            .then((dados) => {
                if (ativo) {
                    setItens(dados);
                    setErro('');
                    setCarregando(false);
                }
            })
            .catch((falha) => {
                if (ativo) {
                    setItens([]);
                    setErro(falha.message);
                    setCarregando(false);
                }
            });
        return () => { ativo = false; };
    }, [tipo, versao]);

    useEffect(() => {
        if (tipo !== 'nf' || !modalAberto) return;

        let ativo = true;
        setRomaneios([]);
        setErroRomaneios('');
        listarLancamentos('romaneio')
            .then((dados) => { if (ativo) setRomaneios(dados); })
            .catch((falha) => { if (ativo) setErroRomaneios(falha.message); });
        return () => { ativo = false; };
    }, [tipo, modalAberto]);

    useEffect(() => {
        if (tipo === 'despesa') return undefined;
        let ativo = true;
        listarClientes()
            .then((dados) => { if (ativo) setClientes(dados); })
            .catch((falha) => { if (ativo) setErro(falha.message); });
        return () => { ativo = false; };
    }, [tipo, versao]);

    function recarregar() {
        setCarregando(true);
        setVersao((valor) => valor + 1);
    }

    function trocarTipo(novoTipo) {
        if (novoTipo === tipo) return;
        setBusca('');
        setCarregando(true);
        onTipoChange(novoTipo);
    }

    function abrirNovo() {
        setFormulario(formularioVazio());
        setEditando(null);
        setErroModal('');
        setModalAberto(true);
    }

    function abrirEdicao(item) {
        const clienteId = item.cliente_id ?? clientes.find((cliente) =>
            cliente.nome.toLocaleLowerCase('pt-BR') === item.empresa.toLocaleLowerCase('pt-BR')
        )?.id;
        setFormulario({
            cliente_id: clienteId ? String(clienteId) : '',
            empresa: item.empresa,
            data: item.data,
            valor: item.valor,
            numero_nf: item.numero_nf || '',
            descricao: item.descricao || '',
            romaneio_id: item.romaneio_id ? String(item.romaneio_id) : item.conciliacao_legada ? REGRA_ANTERIOR : '',
            documento: item.documento || ''
        });
        setEditando(item);
        setErroModal('');
        setModalAberto(true);
    }

    async function salvar(event) {
        event.preventDefault();
        setSalvando(true);
        setErroModal('');
        const { romaneio_id, descricao, ...dados } = formulario;
        const item = {
            ...dados,
            cliente_id: tipo === 'despesa' ? null : Number(formulario.cliente_id),
            tipo,
            valor: Number(formulario.valor)
        };
        if (tipo === 'nf') item.descricao = descricao;
        if (tipo === 'nf' && romaneio_id !== REGRA_ANTERIOR) {
            item.romaneio_id = romaneio_id ? Number(romaneio_id) : null;
        }
        try {
            if (editando) await atualizarLancamento(editando.id, item);
            else await criarLancamento(item);
            setModalAberto(false);
            recarregar();
        } catch (falha) {
            setErroModal(falha.message);
        } finally {
            setSalvando(false);
        }
    }

    async function remover() {
        if (!excluindo) return;
        setSalvando(true);
        setErroModal('');
        try {
            await excluirLancamento(excluindo.id);
            setExcluindo(null);
            recarregar();
        } catch (falha) {
            setErroModal(falha.message);
        } finally {
            setSalvando(false);
        }
    }

    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const visiveis = itens.filter((item) =>
        [item.empresa, item.numero_nf, item.documento, item.descricao].some((valor) =>
            valor?.toLocaleLowerCase('pt-BR').includes(termo)
        )
    );
    const receita = tipo !== 'despesa';
    const mesAtual = DATA_FINANCEIRA.format().slice(0, 7);
    const total = itens.reduce((soma, item) => {
        if (receita && !item.data.startsWith(`${mesAtual}-`)) return soma;
        return soma + Number(item.valor);
    }, 0);
    const titulo = receita ? 'Financeiro' : 'Gastos / Despesas';
    const rotuloLancamento = tipo === 'nf' ? 'NF' : TIPOS[tipo].singular.toLowerCase();
    const idClienteSelecionado = Number(formulario.cliente_id);
    const nomeClienteSelecionado = clientes.find((cliente) => cliente.id === idClienteSelecionado)?.nome;
    const romaneiosDisponiveis = romaneios.filter((romaneio) => {
        const mesmoCliente = romaneio.cliente_id === idClienteSelecionado || (
            romaneio.cliente_id == null && nomeClienteSelecionado
            && romaneio.empresa.trim().toLocaleLowerCase('pt-BR') === nomeClienteSelecionado.trim().toLocaleLowerCase('pt-BR')
        );
        return mesmoCliente && Number(romaneio.valor) === Number(formulario.valor)
            && (!romaneio.nf_vinculada_id || romaneio.nf_vinculada_id === editando?.id);
    });
    const vinculoAtual = Number(formulario.romaneio_id);

    return (
        <section className="finance-page">
            <header className="screen-header">
                <div>
                    <span className="screen-eyebrow">Gestão financeira</span>
                    <h1>{titulo}</h1>
                </div>
                <button className="add-item-button" type="button" onClick={abrirNovo}>
                    <Plus size={18} /> Adicionar {rotuloLancamento}
                </button>
            </header>

            {onTipoChange && (
                <div className="finance-tabs" data-active={tipo} role="group" aria-label="Tipo de receita">
                    <button type="button" aria-pressed={tipo === 'romaneio'} className={tipo === 'romaneio' ? 'active' : ''} onClick={() => trocarTipo('romaneio')}>Romaneios</button>
                    <button type="button" aria-pressed={tipo === 'nf'} className={tipo === 'nf' ? 'active' : ''} onClick={() => trocarTipo('nf')}>Notas fiscais</button>
                </div>
            )}

            <div key={tipo} className={`finance-tab-content finance-tab-content--${tipo}`}>
                <div className="finance-summary">
                    <div>
                        <span>{receita ? 'Total mensal' : 'Total'} em {TIPOS[tipo].titulo.toLowerCase()}</span>
                        <strong>{carregando ? '-' : formatarMoeda(total)}</strong>
                    </div>
                    <div>
                        <span>{receita ? 'Lançamentos no histórico' : 'Lançamentos'}</span>
                        <strong>{carregando ? '-' : itens.length}</strong>
                    </div>
                </div>

                <div className="list-heading">
                    <h2>{TIPOS[tipo].titulo}</h2>
                    <label className="search-box">
                        <Search size={17} aria-hidden="true" />
                        <span className="sr-only">Buscar lançamento</span>
                        <input type="search" placeholder={tipo === 'nf' ? 'Buscar empresa, número ou descrição' : 'Buscar empresa ou documento'}
                            value={busca} onChange={(event) => setBusca(event.target.value)} />
                    </label>
                </div>

                <div className="production-table-wrap finance-table-wrap">
                    <table className="production-table finance-table">
                        <thead><tr>
                            {tipo === 'nf' && <th>Número NF</th>}
                            {tipo === 'despesa' && <th>Documento</th>}
                            <th>Empresa</th>
                            <th>{tipo === 'despesa' ? 'Data de compra' : 'Data'}</th>
                            <th>Valor</th>
                            <th>Ações</th>
                        </tr></thead>
                        <tbody>
                            {carregando ? <tr><td className="empty-row" colSpan={tipo === 'romaneio' ? 4 : 5}>Carregando lançamentos...</td></tr> :
                                visiveis.length === 0 ? <tr><td className="empty-row" colSpan={tipo === 'romaneio' ? 4 : 5}>{termo ? 'Nenhum resultado encontrado.' : 'Nenhum lançamento cadastrado.'}</td></tr> :
                                    visiveis.map((item) => <tr key={item.id}>
                                        {tipo === 'nf' && <td>
                                            {item.numero_nf}
                                            {item.descricao && <span className="finance-description">{item.descricao}</span>}
                                            {item.romaneio_id && <><br /><small className="finance-origin">Romaneio #{item.romaneio_id}</small></>}
                                        </td>}
                                        {tipo === 'despesa' && <td>{item.documento}</td>}
                                        <td className="company-cell">{item.empresa}</td>
                                        <td>{formatarData(item.data)}</td>
                                        <td className="money-cell">{formatarMoeda(item.valor)}</td>
                                        <td><div className="row-actions">
                                            <button className="table-icon-button" type="button" title="Editar" aria-label={`Editar lançamento de ${item.empresa}`} onClick={() => abrirEdicao(item)}><Pencil size={17} /></button>
                                            {item.producao_id ? (
                                                <span className="finance-origin" title="Romaneio vinculado a um serviço da Produção">Produção</span>
                                            ) : (
                                                <button className="delete-item-button" type="button" title="Excluir" aria-label={`Excluir lançamento de ${item.empresa}`} onClick={() => { setErroModal(''); setExcluindo(item); }}><Trash2 size={17} /></button>
                                            )}
                                        </div></td>
                                    </tr>)}
                        </tbody>
                    </table>
                </div>
                {erro && <p className="production-error" role="alert">{erro}</p>}
            </div>

            {modalAberto && <div className="modal-backdrop">
                <form className="item-modal finance-modal" onSubmit={salvar} role="dialog" aria-modal="true" aria-labelledby="finance-modal-title">
                    <header><h2 id="finance-modal-title">{editando ? 'Editar' : 'Adicionar'} {rotuloLancamento}</h2><button type="button" onClick={() => setModalAberto(false)} aria-label="Fechar"><X size={18} /></button></header>
                    {tipo === 'nf' && <label htmlFor="numero_nf">Número NF<input id="numero_nf" name="numero_nf" value={formulario.numero_nf} maxLength={80} onChange={(event) => setFormulario({ ...formulario, numero_nf: event.target.value })} required /></label>}
                    {tipo === 'despesa' && <label htmlFor="documento">Documento<input id="documento" name="documento" value={formulario.documento} maxLength={120} onChange={(event) => setFormulario({ ...formulario, documento: event.target.value })} required /></label>}
                    {tipo === 'despesa' ?
                        <label htmlFor="empresa">Empresa<input id="empresa" name="empresa" value={formulario.empresa} maxLength={120} onChange={(event) => setFormulario({ ...formulario, empresa: event.target.value })} required /></label> :
                        <label htmlFor="cliente-financeiro">{editando?.producao_id ? 'Cliente do serviço' : 'Cliente'}
                            <select id="cliente-financeiro" name="cliente_id" value={formulario.cliente_id} onChange={(event) => setFormulario({ ...formulario, cliente_id: event.target.value })} required>
                                <option value="">Selecione um cliente</option>
                                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                            </select>
                            {clientes.length === 0 && <button className="inline-client-button" type="button" onClick={() => { setModalAberto(false); onAbrirClientes?.(); }}>Cadastrar primeiro cliente</button>}
                        </label>}
                    <label htmlFor="data-financeira">{tipo === 'despesa' ? 'Data de compra' : 'Data'}<input id="data-financeira" name="data" type="date" value={formulario.data} onChange={(event) => setFormulario({ ...formulario, data: event.target.value })} required /></label>
                    <label htmlFor="valor">Valor<input id="valor" name="valor" type="number" inputMode="decimal" step="0.01" min="0.01" value={formulario.valor} onChange={(event) => setFormulario({ ...formulario, valor: event.target.value })} required /></label>
                    {tipo === 'nf' && <label htmlFor="romaneio-vinculado">
                        Romaneio vinculado (opcional)
                        <select id="romaneio-vinculado" value={formulario.romaneio_id}
                            onChange={(event) => setFormulario({ ...formulario, romaneio_id: event.target.value })}>
                            <option value="">Sem romaneio (NF avulsa)</option>
                            {editando?.conciliacao_legada && <option value={REGRA_ANTERIOR}>Manter regra anterior (mesma data)</option>}
                            {vinculoAtual > 0 && !romaneiosDisponiveis.some((romaneio) => romaneio.id === vinculoAtual) && (
                                <option value={vinculoAtual}>Romaneio #{vinculoAtual}</option>
                            )}
                            {romaneiosDisponiveis.map((romaneio) => (
                                <option key={romaneio.id} value={romaneio.id}>
                                    #{romaneio.id} · {formatarData(romaneio.data)} · {formatarMoeda(romaneio.valor)}
                                </option>
                            ))}
                        </select>
                    </label>}
                    {tipo === 'nf' && <label htmlFor="descricao-nf">
                        Descrição (opcional)
                        <input id="descricao-nf" name="descricao" type="text" maxLength={200}
                            value={formulario.descricao} onChange={(event) => setFormulario({ ...formulario, descricao: event.target.value })} />
                    </label>}
                    {tipo === 'nf' && erroRomaneios && <p className="production-error" role="alert">{erroRomaneios}</p>}
                    {erroModal && <p className="production-error" role="alert">{erroModal}</p>}
                    <footer><button className="secondary-button" type="button" onClick={() => setModalAberto(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button></footer>
                </form>
            </div>}

            {excluindo && <div className="modal-backdrop">
                <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-finance-title">
                    <h2 id="delete-finance-title">Remover lançamento?</h2>
                    <p>O lançamento de {excluindo.empresa} será removido dos relatórios.</p>
                    {erroModal && <p className="production-error" role="alert">{erroModal}</p>}
                    <footer><button className="secondary-button" type="button" onClick={() => setExcluindo(null)} disabled={salvando}>Cancelar</button><button className="danger-button" type="button" onClick={remover} disabled={salvando}>{salvando ? 'Removendo...' : 'Remover'}</button></footer>
                </section>
            </div>}
        </section>
    );
}

export default Lancamentos;
