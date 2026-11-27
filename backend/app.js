const express = require("express");
const db = require("./config/database");
const { migrarBanco } = require("./config/migracoes");
const { exigirAcesso, inicializarConta } = require("./services/autenticacao");

const authRoutes = require("./routes/authRoutes");
const clienteRoutes = require("./routes/clienteRoutes");
const producaoRoutes = require("./routes/producaoRoutes");
const financeiroRoutes = require("./routes/financeiroRoutes");

const app = express();

app.use(express.json());

app.get("/health", async (_req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ status: "ok" });
    } catch {
        res.status(503).json({ status: "database unavailable" });
    }
});

app.use("/auth", authRoutes);
app.use("/cliente", exigirAcesso, clienteRoutes);
app.use("/producao", exigirAcesso, producaoRoutes);
app.use("/financeiro", exigirAcesso, financeiroRoutes);

app.prepararBanco = async function prepararBanco() {
    await migrarBanco();
    await inicializarConta();
};

if (require.main === module) {
    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || "127.0.0.1";
    app.prepararBanco().then(() => {
        app.listen(port, host, () => {
            console.log(`Servidor rodando em ${host}:${port}`);
        });
    }).catch(async (erro) => {
        console.error(erro.message);
        await db.end();
        process.exitCode = 1;
    });
}

module.exports = app;
