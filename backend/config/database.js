const { Pool } = require("pg");

const db = new Pool({
    user: "postgres",
    host: "localhost",
    database: "gestao_servicos",
    password: "b4t4tinh4123",
    port: 5432
});

module.exports = db;