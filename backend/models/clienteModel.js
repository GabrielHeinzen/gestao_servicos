const db = require("../config/database");

async function criar(cliente) {
    const resultado = await db.query(
        "INSERT INTO clientes (nome, senha, email) VALUES ($1, $2, $3) RETURNING *",
        [cliente.nome, cliente.senha, cliente.email]
    );

    return resultado.rows[0];

}

async function listar() {
    const resultado = await db.query("SELECT * FROM clientes");
    return resultado.rows;
}

async function buscarPorId(id) {
    const resultado = await db.query(
        "SELECT * FROM clientes WHERE id = $1",
        [id]
    );
    return resultado.rows[0];
}

async function atualizar(id, cliente) {
    const resultado = await db.query(
        "UPDATE clientes SET nome = $1, senha = $2, email = $3 WHERE id = $4 RETURNING *",
        [cliente.nome, cliente.senha, cliente.email, cliente.id]
    );
    return resultado.rows[0];
}

async function excluir(id) {
    const resultado = await db.query(
        "DELETE FROM clientes WHERE id = $1 RETURNING *",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    criar,
    listar,
    buscarPorId,
    atualizar,
    excluir
};