const express = require('express');
const controller = require('../controllers/financeiroControllers');

const router = express.Router();

router.get('/lancamentos', controller.listar);
router.post('/lancamentos', controller.criar);
router.put('/lancamentos/:id', controller.atualizar);
router.delete('/lancamentos/:id', controller.excluir);
router.get('/relatorios', controller.relatorio);

module.exports = router;
