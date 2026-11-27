import { useEffect, useRef, useState } from 'react';
import { FileText, Plus, Trash2, X } from 'lucide-react';
import {
    atualizarProducao,
    atualizarStatusProducao,
    cadastrarProducao,
    excluirProducao,
    listarClientes,
    listarProducao
} from '../services/api';
import { formatarData, formatarMoeda } from '../utils/formatacao';

const FORMULARIO_INICIAL = {
    cliente_id: '',
    tipo_lamina: '',
    data: '',
    observacao: ''
};

function Producao({ onAbrirClientes }) {
    const [itens, setItens] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
    const [modalAberto, setModalAberto] = useState(false);
    const [itemParaExcluir, setItemParaExcluir] = useState(null);
    const [itemEditando, setItemEditando] = useState(null);
    const [itemObservacao, setItemObservacao] = useState(null);
    const dialogoObservacao = useRef(null);
    const [alteracaoPendente, setAlteracaoPendente] = useState(null);
    const [valorFinal, setValorFinal] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');
    const [erroModal, setErroModal] = useState('');

    useEffect(() => {
        carregarItens();
    }, []);

    useEffect(() => {
        const dialogo = dialogoObservacao.current;
        if (itemObservacao && dialogo && !dialogo.open) dialogo.showModal();
    }, [itemObservacao]);

    useEffect(() => {
        if (carregando || salvando) return;
        let ativo = true;
        const intervalo = window.setInterval(async () => {
            try {
                const dados = await listarProducao();
                if (ativo) setItens(dados);
            } catch {
                // A atualizacao automatica mantem a ultima lista disponivel.
            }
        }, 60_000);
        return () => {
            ativo = false;
            window.clearInterval(intervalo);
        };
    }, [carregando, salvando]);

    async function carregarItens() {
        try {
            setCarregando(true);
            setErro('');
            const [dados, clientesCadastrados] = await Promise.all([listarProducao(), listarClientes()]);
            setItens(Array.isArray(dados) ? dados : []);
            setClientes(Array.isArray(clientesCadastrados) ? clientesCadastrados : []);
        } catch {
            setErro('Nao foi possivel carregar os itens de producao.');
        } finally {
            setCarregando(false);
        }
    }

    function abrirCadastro() {
        setFormulario(FORMULARIO_INICIAL);
        setItemEditando(null);
        setErroModal('');
        setModalAberto(true);
    }

    function abrirEdicao(item) {
        const clienteCorrespondente = clientes.find((cliente) => cliente.id === Number(item.cliente_id))
            || clientes.find((cliente) => cliente.nome.toLocaleLowerCase('pt-BR') === item.cliente.toLocaleLowerCase('pt-BR'));
        setFormulario({
            cliente_id: clienteCorrespondente?.id ? String(clienteCorrespondente.id) : '',
            tipo_lamina: item.tipo_lamina,
            data: item.data ? item.data.slice(0, 10) : '',
            observacao: item.observacao || ''
        });
        setItemEditando(item);
        setErroModal('');
        setModalAberto(true);
    }

    function fecharModal() {
        setModalAberto(false);
        setItemEditando(null);
        setFormulario(FORMULARIO_INICIAL);
    }

    function atualizarCampo(event) {
        const { name, value } = event.target;
        setFormulario((dadosAtuais) => ({
            ...dadosAtuais,
            [name]: value
        }));
    }

    async function salvarItem(event) {
        event.preventDefault();

        try {
            setSalvando(true);
            setErroModal('');

            if (itemEditando) {
                await atualizarProducao(itemEditando.id, formulario);
            } else {
                await cadastrarProducao(formulario);
            }

            fecharModal();
            await carregarItens();
        } catch (falha) {
            setErroModal(falha.message);
        } finally {
            setSalvando(false);
        }
    }

    function escolherStatus(item, status) {
        if (status === 'Pronto' || (item.valor_final && (status === 'Cancelado' || status === 'Em produção'))) {
            setValorFinal(item.valor_final || '');
            setErroModal('');
            setAlteracaoPendente({ item, status });
            return;
        }
        alterarStatus(item, status);
    }

    async function alterarStatus(item, status, valor) {
        setSalvando(true);
        setErro('');
        setErroModal('');
        try {
            await atualizarStatusProducao(item.id, status, valor);
            setAlteracaoPendente(null);
            await carregarItens();
        } catch (falha) {
            if (alteracaoPendente) setErroModal(falha.message);
            else setErro(falha.message);
        } finally {
            setSalvando(false);
        }
    }

    async function confirmarExclusao() {
        if (!itemParaExcluir) {
            return;
        }

        try {
            setSalvando(true);
            setErroModal('');
            await excluirProducao(itemParaExcluir.id);
            setItemParaExcluir(null);
            await carregarItens();
        } catch (falha) {
            setErroModal(falha.message);
        } finally {
            setSalvando(false);
        }
    }

    const marcandoPronto = alteracaoPendente?.status === 'Pronto';
    const cancelando = alteracaoPendente?.status === 'Cancelado';

    return (
        <section className="production-page">
            <header className="production-header">
                <div>
                    <p>Sistema local da empresa</p>
                    <h1>Produção</h1>
                </div>

                <button className="add-item-button" type="button" onClick={abrirCadastro}>
                    <Plus size={18} aria-hidden="true" />
                    Adicionar item
                </button>
            </header>

            <div className="production-table-wrap">
                <table className="production-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Tipo Lâmina</th>
                            <th>Data</th>
                            <th className="production-status-column">Status</th>
                            <th className="production-value-column">Valor final</th>
                            <th className="production-actions-column">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {carregando && (
                            <tr>
                                <td colSpan="6" className="empty-row">Carregando produção...</td>
                            </tr>
                        )}

                        {!carregando && itens.length === 0 && (
                            <tr>
                                <td colSpan="6" className="empty-row">Nenhum item cadastrado.</td>
                            </tr>
                        )}

                        {!carregando && itens.map((item) => (
                            <tr key={item.id}>
                                <td>{item.cliente}</td>
                                <td>
                                    {item.tipo_lamina}
                                    {item.observacao?.trim() && (
                                        <button
                                            className="observation-trigger"
                                            type="button"
                                            aria-label={`Ver observação do serviço de ${item.cliente}`}
                                            onClick={() => setItemObservacao(item)}
                                        >
                                            <FileText size={14} aria-hidden="true" />
                                            <span>Ver observação</span>
                                        </button>
                                    )}
                                </td>
                                <td>{formatarData(item.data)}</td>
                                <td>
                                    <span className={`status-pill status-${item.status.toLowerCase().replace(/\s/g, '-')}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="money-cell">
                                    {item.valor_final == null ? '-' : formatarMoeda(item.valor_final)}
                                </td>
                                <td>
                                    <div className="row-actions">
                                        <details className="actions-menu">
                                            <summary>Opções</summary>
                                            <div className="actions-list">
                                                <button type="button" disabled={salvando} onClick={() => abrirEdicao(item)}>Editar</button>
                                                <button type="button" disabled={salvando} onClick={() => escolherStatus(item, 'Em produção')}>Em produção</button>
                                                <button type="button" disabled={salvando} onClick={() => escolherStatus(item, 'Pronto')}>Pronto</button>
                                                <button type="button" disabled={salvando} onClick={() => escolherStatus(item, 'Coletado')}>Coletado</button>
                                                <button type="button" disabled={salvando} onClick={() => escolherStatus(item, 'Cancelado')}>Cancelado</button>
                                            </div>
                                        </details>

                                        <button
                                            className="delete-item-button"
                                            type="button"
                                            onClick={() => { setErroModal(''); setItemParaExcluir(item); }}
                                            disabled={salvando}
                                            aria-label={`Excluir item de ${item.cliente}`}
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} aria-hidden="true" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {erro && <p className="production-error" role="alert">{erro}</p>}

            {itemObservacao && (
                <dialog
                    ref={dialogoObservacao}
                    className="item-modal production-modal observation-dialog"
                    aria-labelledby="observation-title"
                    onClose={() => setItemObservacao(null)}
                >
                    <header>
                        <h2 id="observation-title">Descrição / Observação</h2>
                        <button type="button" onClick={() => dialogoObservacao.current.close()} aria-label="Fechar">
                            <X size={18} aria-hidden="true" />
                        </button>
                    </header>
                    <p>{itemObservacao.cliente} · {itemObservacao.tipo_lamina}</p>
                    <div className="observation-content" tabIndex={0}>{itemObservacao.observacao}</div>
                </dialog>
            )}

            {modalAberto && (
                <div className="modal-backdrop" role="presentation">
                    <form className="item-modal production-modal" onSubmit={salvarItem} role="dialog" aria-modal="true" aria-labelledby="production-modal-title">
                        <header>
                            <h2 id="production-modal-title">{itemEditando ? 'Editar item' : 'Adicionar item'}</h2>
                            <button type="button" onClick={fecharModal} disabled={salvando} aria-label="Fechar"><X size={18} /></button>
                        </header>

                        <label htmlFor="cliente-producao">
                            Cliente
                            <select
                                id="cliente-producao"
                                name="cliente_id"
                                value={formulario.cliente_id}
                                onChange={atualizarCampo}
                                required
                            >
                                <option value="">Selecione um cliente</option>
                                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                            </select>
                            {clientes.length === 0 && <button className="inline-client-button" type="button" onClick={() => { fecharModal(); onAbrirClientes?.(); }}>Cadastrar primeiro cliente</button>}
                        </label>

                        <label htmlFor="tipo_lamina">
                            Tipo Lâmina
                            <input
                                id="tipo_lamina"
                                name="tipo_lamina"
                                type="text"
                                value={formulario.tipo_lamina}
                                onChange={atualizarCampo}
                                required
                            />
                        </label>

                        <label htmlFor="data">
                            Data
                            <input
                                id="data"
                                name="data"
                                type="date"
                                value={formulario.data}
                                onChange={atualizarCampo}
                                required
                            />
                        </label>

                        <label htmlFor="observacao">
                            Descrição / Observação
                            <textarea id="observacao" name="observacao" rows={3} maxLength={2000}
                                value={formulario.observacao} onChange={atualizarCampo} />
                        </label>

                        {erroModal && <p className="production-error" role="alert">{erroModal}</p>}
                        <footer>
                            <button className="secondary-button" type="button" onClick={fecharModal} disabled={salvando}>Cancelar</button>
                            <button className="primary-button" type="submit" disabled={salvando}>
                                {salvando ? 'Salvando...' : 'Salvar'}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {alteracaoPendente && (
                <div className="modal-backdrop" role="presentation">
                    <form className="item-modal production-modal" role="dialog" aria-modal="true"
                        aria-labelledby="status-modal-title" onSubmit={(event) => {
                            event.preventDefault();
                            alterarStatus(alteracaoPendente.item, alteracaoPendente.status, marcandoPronto ? Number(valorFinal) : undefined);
                        }}>
                        <header>
                            <h2 id="status-modal-title">{marcandoPronto ? 'Marcar como pronto' : cancelando ? 'Cancelar serviço?' : 'Reabrir serviço?'}</h2>
                            <button type="button" aria-label="Fechar" disabled={salvando} onClick={() => setAlteracaoPendente(null)}><X size={18} /></button>
                        </header>
                        {marcandoPronto ? (
                            <label htmlFor="valor-final">
                                Valor final (R$)
                                <input id="valor-final" type="number" inputMode="decimal" step="0.01"
                                    min="0.01" max="999999999999.99" required autoFocus value={valorFinal}
                                    onChange={(event) => setValorFinal(event.target.value)} />
                            </label>
                        ) : (
                            <p>O romaneio automático de {alteracaoPendente.item.cliente} será retirado do faturamento.</p>
                        )}
                        {erroModal && <p className="production-error" role="alert">{erroModal}</p>}
                        <footer>
                            <button className="secondary-button" type="button" disabled={salvando} onClick={() => setAlteracaoPendente(null)}>Voltar</button>
                            <button className={cancelando ? 'danger-button' : 'primary-button'} type="submit" disabled={salvando}>
                                {salvando ? 'Salvando...' : 'Confirmar'}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {itemParaExcluir && (
                <div className="modal-backdrop" role="presentation">
                    <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                        <h2 id="confirm-title">Remover item?</h2>
                        <p>
                            Tem certeza que deseja remover o item de {itemParaExcluir.cliente}?
                            {itemParaExcluir.valor_final && ' O romaneio automático também será removido.'}
                        </p>
                        {erroModal && <p className="production-error" role="alert">{erroModal}</p>}
                        <footer>
                            <button className="secondary-button" type="button" disabled={salvando} onClick={() => setItemParaExcluir(null)}>
                                Cancelar
                            </button>
                            <button className="danger-button" type="button" disabled={salvando} onClick={confirmarExclusao}>
                                Remover
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </section>
    );
}

export default Producao;
