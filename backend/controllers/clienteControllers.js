const clienteModel = require("../models/clienteModel");

async function cadastrar(req, res) {
    const cliente = req.body;

    const resultado = await clienteModel.criar(cliente);

    res.status(201).json(resultado);
    
}

async function listar(req, res) {
    const resultado = await clienteModel.listar();

    res.status(200).json(resultado);
}

async function buscarPorId(req, res) {
    const { id } = req.params;

    const resultado = await clienteModel.buscarPorId(id);

    res.status(200).json(resultado);
}

async function atualizar(req, res) {
    const cliente = req.body;

    const resultado = await clienteModel.atualizar(cliente);

    res.status(200).json(resultado);
}

async function excluir(req, res) {
    const { id } = req.params;

    const resultado = await clienteModel.excluir(id);

    res.status(200).json(resultado);
}

module.exports = {
    cadastrar,
    listar,
    buscarPorId,
    atualizar,
    excluir
}; 