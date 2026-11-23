const express = require('express');
const app = express();
app.use(express.json());

// Parte 1: armazenamento em memória. Os dados são perdidos ao reiniciar.
const usuarios = [];
const produtos = [];
const pedidos = [];
const proximoId = { usuario: 1, produto: 1, pedido: 1 };
const valorDinheiro = (numero) => Math.round((numero + Number.EPSILON) * 100) / 100;

app.post('/usuarios', (req, res) => {
  const { nome, tipo } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim() || !['vendedor', 'comprador'].includes(tipo)) {
    return res.status(400).json({ erro: 'Informe nome e tipo válido (vendedor/comprador).' });
  }
  const usuario = { id: proximoId.usuario++, nome: nome.trim(), tipo };
  usuarios.push(usuario);
  return res.status(201).json(usuario);
});

app.get('/usuarios', (_req, res) => res.json(usuarios));

app.post('/produtos', (req, res) => {
  const { vendedorId, nome, preco, estoque } = req.body || {};
  const vendedor = usuarios.find(u => u.id === Number(vendedorId) && u.tipo === 'vendedor');
  if (!vendedor) return res.status(403).json({ erro: 'Vendedor não encontrado ou sem permissão.' });
  if (typeof nome !== 'string' || !nome.trim() || typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0 || !Number.isInteger(estoque) || estoque < 0) {
    return res.status(400).json({ erro: 'Informe nome, preço positivo e estoque inteiro não negativo.' });
  }
  const produto = { id: proximoId.produto++, vendedorId: vendedor.id, nome: nome.trim(), preco, estoque };
  produtos.push(produto);
  return res.status(201).json(produto);
});

app.get('/produtos', (_req, res) => res.json(produtos.filter(p => p.estoque > 0)));

app.post('/pedidos', (req, res) => {
  const { compradorId, produtoId, quantidade } = req.body || {};
  const comprador = usuarios.find(u => u.id === Number(compradorId) && u.tipo === 'comprador');
  if (!comprador) return res.status(403).json({ erro: 'Comprador inválido.' });
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return res.status(400).json({ erro: 'Quantidade deve ser um número inteiro maior que zero.' });
  }
  const produto = produtos.find(p => p.id === Number(produtoId));
  if (!produto || produto.estoque < quantidade) {
    return res.status(400).json({ erro: 'Produto indisponível ou estoque insuficiente.' });
  }
  produto.estoque -= quantidade;
  const pedido = {
    id: proximoId.pedido++, compradorId: comprador.id, produtoId: produto.id,
    quantidade, valorTotal: valorDinheiro(produto.preco * quantidade), data: new Date().toISOString()
  };
  pedidos.push(pedido);
  return res.status(201).json(pedido);
});

app.get('/pedidos', (_req, res) => res.json(pedidos));
app.get('/resumo', (_req, res) => res.json({
  usuarios: usuarios.length, produtos: produtos.length, pedidos: pedidos.length,
  totalVendido: valorDinheiro(pedidos.reduce((soma, p) => soma + p.valorTotal, 0))
}));

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  return next(error);
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Marketplace (memória) em http://localhost:${PORT}`));
