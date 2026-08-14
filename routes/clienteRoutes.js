router.get("/", clienteController.listar);
router.post("/", clienteController.cadastrar);
router.put("/", clienteController.atualizar);
router.delete("/", clienteController.excluir);