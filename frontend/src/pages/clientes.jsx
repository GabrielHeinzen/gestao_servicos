import { useState, useEffect } from 'react';
import { listarClientes, cadastrarCliente } from '../services/api';

function Clientes() {
    const [clientes, setClientes] = useState([]);

    useEffect(() => {
        carregarClientes();
    }, []);

    async function carregarClientes() {
        const dados = await listarClientes();
        setClientes(dados);
    }

    return (
        <div>
            <h1>Lista de Clientes</h1>

            <CadastroCliente aoCadastrar={carregarClientes} />

            <ul>
                {clientes.map(cliente => (
                    <li key={cliente.id}>{cliente.nome}</li>
                ))}
            </ul>
        </div>
    );
}

function CadastroCliente({ aoCadastrar }) {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        const novoCliente = { nome, email };
        await cadastrarCliente(novoCliente);
        setNome('');
        setEmail('');
        if (aoCadastrar) {
            aoCadastrar();
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome"
                required
            />
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
            />
            <button type="submit">Cadastrar</button>
        </form>
    );
}

export default Clientes;