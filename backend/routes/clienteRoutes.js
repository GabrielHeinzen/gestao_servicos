const express = require("express");
const router = express.Router();

const clienteController = require("../controllers/clienteControllers");



router.get("/", clienteController.listar);
router.get("/:id", clienteController.buscarPorId);
router.post("/", clienteController.cadastrar);
router.put("/:id", clienteController.atualizar);
router.delete("/:id", clienteController.excluir);

module.exports = router;