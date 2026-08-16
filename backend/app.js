const express = require("express");
const clienteRoutes = require("./routes/clienteRoutes");

const app = express();

app.use(express.json());

app.use("/cliente",clienteRoutes)

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});

module.exports = app;