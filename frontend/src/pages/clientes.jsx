import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { atualizarCliente, cadastrarCliente, excluirCliente, listarClientes } from '../services/api';

function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [erroModal, setErroModal] = useState('');
    const [nome, setNome] = useState('');
    const [editando, setEditando] = useState(null);
    const [excluindo, setExcluindo] = useState(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        carregarClientes();
    }, []);

    async function carregarClientes() {
        setCarregando(true);
        try {
            setClientes(await listarClientes());
            setErro('');
        } catch (falha) {
            setErro(falha.message);
        } finally {
            setCarregando(false);
        }
    }

    function abrirNovo() {
        setNome('');
        setEditando(null);
        setErroModal('');
        setModalAberto(true);
    }

    function abrirEdicao(cliente) {
        setNome(cliente.nome);
        setEditando(cliente);
        setErroModal('');
        setModalAberto(true);
    }

    async function salvar(event) {
        event.preventDefault();
        setSalvando(true);
        setErroModal('');
        try {
            if (editando) await atualizarCliente(editando.id, { nome });
            else await cadastrarCliente({ nome });
            setModalAberto(false);
            await carregarClientes();
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
            await excluirCliente(excluindo.id);
            setExcluindo(null);
            await carregarClientes();
        } catch (falha) {
            setErroModal(falha.message);
        } finally {
            setSalvando(false);
        }
    }

    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const visiveis = clientes.filter((cliente) => cliente.nome.toLocaleLowerCase('pt-BR').includes(termo));

    return (
        <section className="clients-page">
            <header className="screen-header">
                <div><span className="screen-eyebrow">Cadastros</span><h1>Clientes</h1></div>
                <button className="add-item-button" type="button" onClick={abrirNovo}><Plus size={18} /> Adicionar cliente</button>
            </header>

            <div className="clients-summary content-enter">
                <span className="metric-icon revenue"><Building2 size={20} /></span>
                <div><span>Clientes cadastrados</span><strong>{clientes.length}</strong></div>
            </div>

            <div className="list-heading content-enter">
                <h2>Empresas</h2>
                <label className="search-box">
                    <Search size={17} aria-hidden="true" />
                    <span className="sr-only">Buscar cliente</span>
                    <input type="search" placeholder="Buscar empresa" value={busca} onChange={(event) => setBusca(event.target.value)} />
                </label>
            </div>

            <div className="production-table-wrap clients-table-wrap content-enter">
                <table className="production-table clients-table">
                    <thead><tr><th>Nome da empresa</th><th>Ações</th></tr></thead>
                    <tbody>
                        {carregando ? <tr><td className="empty-row" colSpan="2">Carregando clientes...</td></tr> :
                            visiveis.length === 0 ? <tr><td className="empty-row" colSpan="2">{termo ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</td></tr> :
                                visiveis.map((cliente) => <tr key={cliente.id}>
                                    <td className="company-cell">{cliente.nome}</td>
                                    <td><div className="row-actions">
                                        <button className="table-icon-button" type="button" title="Editar" aria-label={`Editar ${cliente.nome}`} onClick={() => abrirEdicao(cliente)}><Pencil size={17} /></button>
                                        <button className="delete-item-button" type="button" title="Excluir" aria-label={`Excluir ${cliente.nome}`} onClick={() => { setErroModal(''); setExcluindo(cliente); }}><Trash2 size={17} /></button>
                                    </div></td>
                                </tr>)}
                    </tbody>
                </table>
            </div>
            {erro && <p className="production-error" role="alert">{erro}</p>}

            {modalAberto && <div className="modal-backdrop">
                <form className="item-modal" onSubmit={salvar} role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
                    <header><h2 id="client-modal-title">{editando ? 'Editar cliente' : 'Adicionar cliente'}</h2><button type="button" onClick={() => setModalAberto(false)} aria-label="Fechar"><X size={18} /></button></header>
                    <label htmlFor="nome-cliente">Nome da empresa<input id="nome-cliente" value={nome} maxLength={120} onChange={(event) => setNome(event.target.value)} autoFocus required /></label>
                    {erroModal && <p className="production-error" role="alert">{erroModal}</p>}
                    <footer><button className="secondary-button" type="button" onClick={() => setModalAberto(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button></footer>
                </form>
            </div>}

            {excluindo && <div className="modal-backdrop">
                <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-client-title">
                    <h2 id="delete-client-title">Remover cliente?</h2>
                    <p>Tem certeza que deseja remover {excluindo.nome}? Clientes com lançamentos vinculados não podem ser excluídos.</p>
                    {erroModal && <p className="production-error" role="alert">{erroModal}</p>}
                    <footer><button className="secondary-button" type="button" onClick={() => { setExcluindo(null); setErroModal(''); }} disabled={salvando}>Cancelar</button><button className="danger-button" type="button" onClick={remover} disabled={salvando}>{salvando ? 'Removendo...' : 'Remover'}</button></footer>
                </section>
            </div>}
        </section>
    );
}

export default Clientes;
