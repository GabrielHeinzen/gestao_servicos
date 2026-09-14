const express = require("express");
const cors = require("cors");

const clienteRoutes = require("./routes/clienteRoutes");
const producaoRoutes = require("./routes/producaoRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/cliente", clienteRoutes);
app.use("/producao", producaoRoutes);

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});

module.exports = app;
