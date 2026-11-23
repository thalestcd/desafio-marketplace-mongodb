const express = require('express');
const mongoose = require('mongoose');
const { Usuario, Produto, Pedido } = require('./modelos');

require('dotenv').config({ quiet: true });

const app = express();
app.use(express.json());

const valorDinheiro = (numero) => Math.round((numero + Number.EPSILON) * 100) / 100;
const nomeValido = (nome) => typeof nome === 'string' && nome.trim().length > 0;
const idValido = (id) => typeof id === 'string' && mongoose.isObjectIdOrHexString(id);
const rota = (handler) => (req, res, next) => handler(req, res).catch(next);

app.post('/usuarios', rota(async (req, res) => {
  const { nome, tipo } = req.body || {};
  if (!nomeValido(nome) || !['vendedor', 'comprador'].includes(tipo)) {
    return res.status(400).json({ erro: 'Informe nome e tipo válido (vendedor/comprador).' });
  }
  const usuario = await Usuario.create({ nome, tipo });
  return res.status(201).json(usuario);
}));

app.get('/usuarios', rota(async (_req, res) => res.json(await Usuario.find())));

app.post('/produtos', rota(async (req, res) => {
  const { vendedorId, nome, preco, estoque } = req.body || {};
  const vendedor = idValido(vendedorId) && await Usuario.exists({ _id: vendedorId, tipo: 'vendedor' });
  if (!vendedor) return res.status(403).json({ erro: 'Vendedor não encontrado ou sem permissão.' });

  if (!nomeValido(nome) || !Number.isFinite(preco) || preco <= 0 || !Number.isSafeInteger(estoque) || estoque < 0) {
    return res.status(400).json({ erro: 'Informe nome, preço positivo e estoque inteiro não negativo.' });
  }
  const produto = await Produto.create({ vendedorId, nome, preco, estoque });
  return res.status(201).json(produto);
}));

app.get('/produtos', rota(async (_req, res) => res.json(await Produto.find({ estoque: { $gt: 0 } }))));

app.post('/pedidos', rota(async (req, res) => {
  const { compradorId, produtoId, quantidade } = req.body || {};
  const comprador = idValido(compradorId) && await Usuario.exists({ _id: compradorId, tipo: 'comprador' });
  if (!comprador) return res.status(403).json({ erro: 'Comprador inválido.' });

  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    return res.status(400).json({ erro: 'Quantidade deve ser um número inteiro maior que zero.' });
  }
  const indisponivel = { erro: 'Produto indisponível ou estoque insuficiente.' };
  if (!idValido(produtoId)) return res.status(400).json(indisponivel);

  const pedido = await mongoose.connection.transaction(async (session) => {
    const produto = await Produto.findOneAndUpdate(
      { _id: produtoId, estoque: { $gte: quantidade } },
      { $inc: { estoque: -quantidade } },
      { session }
    );
    if (!produto) return null;

    const [criado] = await Pedido.create([{
      compradorId, produtoId, quantidade, valorTotal: valorDinheiro(produto.preco * quantidade)
    }], { session });
    return criado;
  });

  if (!pedido) return res.status(400).json(indisponivel);
  return res.status(201).json(pedido);
}));

app.get('/pedidos', rota(async (_req, res) => res.json(await Pedido.find())));

app.get('/resumo', rota(async (_req, res) => {
  const [usuarios, produtos, totais] = await Promise.all([
    Usuario.countDocuments(),
    Produto.countDocuments(),
    Pedido.aggregate([{ $group: { _id: null, pedidos: { $sum: 1 }, totalVendido: { $sum: '$valorTotal' } } }])
  ]);
  const { pedidos, totalVendido } = totais[0] || { pedidos: 0, totalVendido: 0 };
  return res.json({ usuarios, produtos, pedidos, totalVendido: valorDinheiro(totalVendido) });
}));

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ erro: 'Dados inválidos.' });
  }
  console.error('Falha na API:', error.name, error.code || '');
  return res.status(500).json({ erro: 'Erro interno.' });
});

async function iniciar() {
  const { MONGODB_URI, PORT = '3000' } = process.env;
  if (!MONGODB_URI) throw new Error('MONGODB_URI ausente');
  const porta = Number(PORT);
  if (!Number.isInteger(porta) || porta < 0 || porta > 65535) throw new Error('PORT inválida');

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const topologia = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topologia.setName && topologia.msg !== 'isdbgrid') {
    throw new Error('Configure um replica set ou cluster fragmentado para transações.');
  }
  await Promise.all([Usuario.init(), Produto.init(), Pedido.init()]);

  const servidor = app.listen(porta, () => {
    console.log(`Marketplace (MongoDB) em http://localhost:${servidor.address().port}`);
  });
  servidor.on('error', falhaAoIniciar);
}

async function falhaAoIniciar(error) {
  const mensagem = error.constructor === Error ? error.message : error.name;
  console.error('Falha na inicialização:', mensagem, error.code || '');
  process.exitCode = 1;
  await mongoose.disconnect();
}

iniciar().catch(falhaAoIniciar);
