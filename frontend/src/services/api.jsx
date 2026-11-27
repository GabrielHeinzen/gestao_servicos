const API_URL = "/api";

export async function listarClientes() {
    const response = await fetch(`${API_URL}/cliente`);
    const dados = await response.json();
    if (!response.ok) throw new Error(dados.erro || 'Nao foi possivel carregar os clientes.');
    return dados;
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
    const dados = await response.json();
    if (!response.ok) throw new Error(dados.erro || 'Nao foi possivel cadastrar o cliente.');
    return dados;
}

export async function atualizarCliente(id, cliente) {
    const response = await fetch(`${API_URL}/cliente/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(cliente)
    });
    const dados = await response.json();
    if (!response.ok) throw new Error(dados.erro || 'Nao foi possivel atualizar o cliente.');
    return dados;
}

export async function excluirCliente(id) {
    const response = await fetch(`${API_URL}/cliente/${id}`, {
        method: "DELETE"
    });
    const dados = await response.json();
    if (!response.ok) throw new Error(dados.erro || 'Nao foi possivel excluir o cliente.');
    return dados;
}

async function solicitarProducao(caminho = '', opcoes) {
    const response = await fetch(`${API_URL}/producao${caminho}`, opcoes);
    const dados = await response.json();
    if (!response.ok) throw new Error(dados.erro || 'Nao foi possivel concluir a operacao.');
    return dados;
}

export function listarProducao() {
    return solicitarProducao();
}

export function cadastrarProducao(item) {
    return solicitarProducao('', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
    });
}

export function atualizarProducao(id, item) {
    return solicitarProducao(`/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
    });
}

export function atualizarStatusProducao(id, status, valorFinal) {
    return solicitarProducao(`/${id}/status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status, valor_final: valorFinal })
    });
}

export function excluirProducao(id) {
    return solicitarProducao(`/${id}`, {
        method: "DELETE"
    });
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

export function buscarRelatorio(ano, mes) {
    return solicitarFinanceiro(`/relatorios?ano=${ano}&mes=${mes}`);
}

