const express = require("express");
const router = express.Router();

const clienteController = require("../backend/controllers/clienteController");



router.get("/", clienteController.listar);
router.Router.get("/:_id", clienteController.buscarPorId);
router.post("/", clienteController.cadastrar);
router.put("/:_id", clienteController.atualizar);
router.delete("/:_id", clienteController.excluir);

module.exports = router;