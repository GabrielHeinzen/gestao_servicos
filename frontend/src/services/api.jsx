const API_URL = "http://localhost:3000";

export async function listarClientes() {
    const response = await fetch(`${API_URL}/cliente`);
    return response.json();
}

export async function buscarClientePorId(id) {
    const response = await fetch(`${API_URL}/cliente/${id}`);
    return response.json();
}


export async function cadastrarCliente(cliente) {
    const response = await fetch(`${API_URL}/cliente`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(cliente)
    });
    return response.json();
}

export async function atualizarCliente(id, cliente) {
    const response = await fetch(`${API_URL}/cliente/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(cliente)
    });
    return response.json();
}

export async function excluirCliente(id) {
    const response = await fetch(`${API_URL}/cliente/${id}`, {
        method: "DELETE"
    });
    return response.json();
}

export async function listarProducao() {
    const response = await fetch(`${API_URL}/producao`);
    return response.json();
}

export async function cadastrarProducao(item) {
    const response = await fetch(`${API_URL}/producao`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
    });
    return response.json();
}

export async function atualizarProducao(id, item) {
    const response = await fetch(`${API_URL}/producao/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
    });
    return response.json();
}

export async function atualizarStatusProducao(id, status) {
    const response = await fetch(`${API_URL}/producao/${id}/status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    });
    return response.json();
}

export async function excluirProducao(id) {
    const response = await fetch(`${API_URL}/producao/${id}`, {
        method: "DELETE"
    });
    return response.json();
}

async function solicitarFinanceiro(caminho, opcoes) {
    const response = await fetch(`${API_URL}/financeiro${caminho}`, opcoes);
    const dados = await response.json();
    if (!response.ok) throw new Error(dados.erro || 'Nao foi possivel concluir a operacao.');
    return dados;
}

export function listarLancamentos(tipo) {
    return solicitarFinanceiro(`/lancamentos?tipo=${encodeURIComponent(tipo)}`);
}

export function criarLancamento(item) {
    return solicitarFinanceiro('/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
}

export function atualizarLancamento(id, item) {
    return solicitarFinanceiro(`/lancamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
}

export function excluirLancamento(id) {
    return solicitarFinanceiro(`/lancamentos/${id}`, { method: 'DELETE' });
}

export function buscarRelatorio(ano) {
    return solicitarFinanceiro(`/relatorios?ano=${ano}`);
}

