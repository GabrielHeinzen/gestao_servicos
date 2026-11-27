const router = require('express').Router();
const auth = require('../services/autenticacao');

router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
router.post('/login', auth.limitarTentativas(auth.entrar));
router.post('/sair', auth.exigirAcesso, auth.sair);

module.exports = router;
