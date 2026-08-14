async function cadastrar(req, res) {
    const cliente = req.body;

    const resultado = await clienteModel.criar(cliente);

    res.status(201).json(resultado);
    
}