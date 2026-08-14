const express = require("express");
const clienteRoutes = require("./routes/clienteRoutes");

const app = express();

app.use(express.JSON());

app.use("/cliente",clienteRoutes)

app.listen(3000);