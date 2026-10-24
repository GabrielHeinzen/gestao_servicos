const express = require("express");
const cors = require("cors");
const db = require("./config/database");

const clienteRoutes = require("./routes/clienteRoutes");
const producaoRoutes = require("./routes/producaoRoutes");
const financeiroRoutes = require("./routes/financeiroRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ status: "ok" });
    } catch {
        res.status(503).json({ status: "database unavailable" });
    }
});

app.use("/cliente", clienteRoutes);
app.use("/producao", producaoRoutes);
app.use("/financeiro", financeiroRoutes);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

module.exports = app;
