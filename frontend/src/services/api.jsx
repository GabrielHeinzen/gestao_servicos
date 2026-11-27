const API_URL = '/api';
let token;

async function solicitar(caminho, { metodo = 'GET', corpo, fallback = 'Não foi possível concluir a operação.' } = {}) {
    const credencial = token;
    const headers = new Headers();
    if (credencial) headers.set('Authorization', `Bearer ${credencial}`);
    if (corpo !== undefined) headers.set('Content-Type', 'application/json');

    const resposta = await fetch(`${API_URL}${caminho}`, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        cache: 'no-store'
    });
    const dados = resposta.headers.get('Content-Type')?.includes('application/json') ? await resposta.json() : null;
    if (!resposta.ok || (dados === null && resposta.status !== 204)) {
        if (dados?.codigo === 'SESSAO_EXPIRADA' && credencial && token === credencial) {
            token = undefined;
            window.dispatchEvent(new Event('gestao:sessao-expirada'));
        }
        throw new Error(dados?.erro || fallback);
    }
    return dados;
}

function usarSessao(dados) {
    token = dados.token;
    return { usuario: dados.usuario, expiraEm: dados.expiraEm };
}

export async function entrar(usuario, senha) {
    return usarSessao(await solicitar('/auth/login', { metodo: 'POST', corpo: { usuario, senha } }));
}

export async function sair() {
    try {
        await solicitar('/auth/sair', { metodo: 'POST' });
    } finally {
        token = undefined;
    }
}

export function descartarSessao() {
    token = undefined;
}

export function listarClientes() {
    return solicitar('/cliente', { fallback: 'Não foi possível carregar os clientes.' });
}

export function buscarClientePorId(id) {
    return solicitar(`/cliente/${id}`);
}

export function cadastrarCliente(cliente) {
    return solicitar('/cliente', { metodo: 'POST', corpo: cliente });
}

export function atualizarCliente(id, cliente) {
    return solicitar(`/cliente/${id}`, { metodo: 'PUT', corpo: cliente });
}

export function excluirCliente(id) {
    return solicitar(`/cliente/${id}`, { metodo: 'DELETE' });
}

export function listarProducao() {
    return solicitar('/producao');
}

export function cadastrarProducao(item) {
    return solicitar('/producao', { metodo: 'POST', corpo: item });
}

export function atualizarProducao(id, item) {
    return solicitar(`/producao/${id}`, { metodo: 'PUT', corpo: item });
}

export function atualizarStatusProducao(id, status, valorFinal) {
    return solicitar(`/producao/${id}/status`, { metodo: 'PATCH', corpo: { status, valor_final: valorFinal } });
}

export function excluirProducao(id) {
    return solicitar(`/producao/${id}`, { metodo: 'DELETE' });
}

export function listarLancamentos(tipo) {
    return solicitar(`/financeiro/lancamentos?tipo=${encodeURIComponent(tipo)}`);
}

export function criarLancamento(item) {
    return solicitar('/financeiro/lancamentos', { metodo: 'POST', corpo: item });
}

export function atualizarLancamento(id, item) {
    return solicitar(`/financeiro/lancamentos/${id}`, { metodo: 'PUT', corpo: item });
}

export function excluirLancamento(id) {
    return solicitar(`/financeiro/lancamentos/${id}`, { metodo: 'DELETE' });
}

export function buscarRelatorio(ano, mes) {
    return solicitar(`/financeiro/relatorios?ano=${ano}&mes=${mes}`);
}

