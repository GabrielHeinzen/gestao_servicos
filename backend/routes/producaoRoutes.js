const express = require("express");
const router = express.Router();

const producaoController = require("../controllers/producaoControllers");

router.get("/", producaoController.listar);
router.post("/", producaoController.cadastrar);
router.put("/:id", producaoController.atualizar);
router.patch("/:id/status", producaoController.atualizarStatus);
router.delete("/:id", producaoController.excluir);

module.exports = router;
