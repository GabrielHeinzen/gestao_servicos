import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
    atualizarProducao,
    atualizarStatusProducao,
    cadastrarProducao,
    excluirProducao,
    listarClientes,
    listarProducao
} from '../services/api';

const FORMULARIO_INICIAL = {
    cliente_id: '',
    tipo_lamina: '',
    data: ''
};

function formatarData(data) {
    if (!data) {
        return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(data));
}

function Producao({ onAbrirClientes }) {
    const [itens, setItens] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
    const [modalAberto, setModalAberto] = useState(false);
    const [itemParaExcluir, setItemParaExcluir] = useState(null);
    const [itemEditando, setItemEditando] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');

    useEffect(() => {
        carregarItens();
    }, []);

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
        setModalAberto(true);
    }

    function abrirEdicao(item) {
        const clienteCorrespondente = clientes.find((cliente) => cliente.id === Number(item.cliente_id))
            || clientes.find((cliente) => cliente.nome.toLocaleLowerCase('pt-BR') === item.cliente.toLocaleLowerCase('pt-BR'));
        setFormulario({
            cliente_id: clienteCorrespondente?.id ? String(clienteCorrespondente.id) : '',
            tipo_lamina: item.tipo_lamina,
            data: item.data ? item.data.slice(0, 10) : ''
        });
        setItemEditando(item);
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
            setErro('');

            if (itemEditando) {
                await atualizarProducao(itemEditando.id, formulario);
            } else {
                await cadastrarProducao(formulario);
            }

            fecharModal();
            await carregarItens();
        } catch {
            setErro('Nao foi possivel salvar o item.');
        } finally {
            setSalvando(false);
        }
    }

    async function alterarStatus(item, status) {
        try {
            setErro('');
            await atualizarStatusProducao(item.id, status);
            await carregarItens();
        } catch {
            setErro('Nao foi possivel atualizar o status.');
        }
    }

    async function confirmarExclusao() {
        if (!itemParaExcluir) {
            return;
        }

        try {
            setErro('');
            await excluirProducao(itemParaExcluir.id);
            setItemParaExcluir(null);
            await carregarItens();
        } catch {
            setErro('Nao foi possivel excluir o item.');
        }
    }

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
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {carregando && (
                            <tr>
                                <td colSpan="5" className="empty-row">Carregando produção...</td>
                            </tr>
                        )}

                        {!carregando && itens.length === 0 && (
                            <tr>
                                <td colSpan="5" className="empty-row">Nenhum item cadastrado.</td>
                            </tr>
                        )}

                        {!carregando && itens.map((item) => (
                            <tr key={item.id}>
                                <td>{item.cliente}</td>
                                <td>{item.tipo_lamina}</td>
                                <td>{formatarData(item.data)}</td>
                                <td>
                                    <span className={`status-pill status-${item.status.toLowerCase().replace(/\s/g, '-')}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="row-actions">
                                        <details className="actions-menu">
                                            <summary>Opções</summary>
                                            <div className="actions-list">
                                                <button type="button" onClick={() => abrirEdicao(item)}>Editar</button>
                                                <button type="button" onClick={() => alterarStatus(item, 'Em produção')}>Em produção</button>
                                                <button type="button" onClick={() => alterarStatus(item, 'Pronto')}>Pronto</button>
                                                <button type="button" onClick={() => alterarStatus(item, 'Coletado')}>Coletado</button>
                                            </div>
                                        </details>

                                        <button
                                            className="delete-item-button"
                                            type="button"
                                            onClick={() => setItemParaExcluir(item)}
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

            {erro && <p className="production-error">{erro}</p>}

            {modalAberto && (
                <div className="modal-backdrop" role="presentation">
                    <form className="item-modal" onSubmit={salvarItem}>
                        <header>
                            <h2>{itemEditando ? 'Editar item' : 'Adicionar item'}</h2>
                            <button type="button" onClick={fecharModal} aria-label="Fechar"><X size={18} /></button>
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

                        <footer>
                            <button className="secondary-button" type="button" onClick={fecharModal}>Cancelar</button>
                            <button className="primary-button" type="submit" disabled={salvando}>
                                {salvando ? 'Salvando...' : 'Salvar'}
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
                        </p>
                        <footer>
                            <button className="secondary-button" type="button" onClick={() => setItemParaExcluir(null)}>
                                Cancelar
                            </button>
                            <button className="danger-button" type="button" onClick={confirmarExclusao}>
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
