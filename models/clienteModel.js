async function criar(cliente) {
    const resultado = await.db.query(
        "INSERT INTO clientes (nome, senha, email) VALUES ($1, $2, $3) RETURNING *",
        [cliente.nome, cliente.telefone, cliente.email]
    );
    
    return resultado.rows[0];
    
}