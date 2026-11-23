const alvo = process.env.SEED_DB_NAME || 'marketplace_seed_test';
if (db.getName() === alvo) throw new Error('Conecte o mongosh ao banco da API para verificar o isolamento.');

const seed = db.getSiblingDB(alvo);
const esperados = { usuarios: 5000, produtos: 1000, pedidos: 100000 };
const colecoes = {};

for (const [nome, esperado] of Object.entries(esperados)) {
  const colecao = seed.getCollection(nome);
  const total = colecao.countDocuments({});
  const indices = colecao.getIndexes();
  if (total !== esperado) throw new Error(`${nome}: esperado ${esperado}, recebido ${total}`);
  if (indices.length !== 1 || indices[0].name !== '_id_' || indices[0].key._id !== 1) {
    throw new Error(`${nome}: esperava apenas o índice padrão _id_`);
  }
  colecoes[nome] = { total, indices };
}

const produto = seed.produtos.findOne({ nome: 'Teclado Mecânico' });
if (!produto) throw new Error('Produto de exemplo ausente');
const vendedor = seed.usuarios.findOne({ _id: produto.vendedorId, tipo: 'vendedor' });
const comprador = seed.usuarios.findOne({ nome: 'Thales Cambraia Dias', tipo: 'comprador' });
if (!vendedor || !comprador) throw new Error('Usuários de exemplo ausentes');
const pedido = seed.pedidos.findOne({ produtoId: produto._id, compradorId: comprador._id, quantidade: 2 });
if (!pedido || pedido.valorTotal !== produto.preco * pedido.quantidade) throw new Error('Pedido de exemplo inválido');

print(EJSON.stringify({
  data: new Date(),
  versaoMongoDB: db.version(),
  bancoDoSeed: seed.getName(),
  colecoes,
  amostras: { vendedor, comprador, produto, pedido }
}, null, 2));
