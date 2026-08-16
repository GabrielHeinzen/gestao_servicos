const API_URL = "http://localhost:3000/api";

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

