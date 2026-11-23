const mongoose = require('mongoose');

require('dotenv').config({ quiet: true });

const TAMANHO_LOTE = 10000;
const TOTAL_PRODUTOS = 1000;
const TOTAL_USUARIOS = 5000;
const TOTAL_PEDIDOS = 100000;

async function inserirEmLotes(colecao, total, gerar) {
  const lotes = [];
  for (let inicio = 0; inicio < total; inicio += TAMANHO_LOTE) {
    const tamanho = Math.min(TAMANHO_LOTE, total - inicio);
    const documentos = Array.from({ length: tamanho }, (_, indice) => gerar(inicio + indice));
    const resultado = await colecao.insertMany(documentos);
    lotes.push(resultado.insertedCount);
  }
  return lotes;
}

async function executar() {
  const { MONGODB_URI, SEED_DB_NAME = 'marketplace_seed_test' } = process.env;
  if (!MONGODB_URI) throw new Error('Configure MONGODB_URI.');
  if (!/^marketplace_seed_test(?:_[a-z0-9]+)*$/.test(SEED_DB_NAME) || SEED_DB_NAME.length > 63) {
    throw new Error('Use marketplace_seed_test ou acrescente sufixos alfanuméricos separados por _.');
  }

  const conexao = await mongoose.createConnection(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  }).asPromise();
  try {
    if (conexao.db.databaseName === SEED_DB_NAME) {
      throw new Error('O banco do seed precisa ser diferente do banco da API em MONGODB_URI.');
    }
    const banco = conexao.getClient().db(SEED_DB_NAME);
    if ((await banco.listCollections({}, { nameOnly: true }).toArray()).length > 0) {
      throw new Error('O banco do seed já contém coleções. Use um novo sufixo em SEED_DB_NAME.');
    }

    // A criação explícita também impede duas execuções de disputar o mesmo banco vazio.
    const usuarios = await banco.createCollection('usuarios');
    const produtos = banco.collection('produtos');
    const pedidos = banco.collection('pedidos');
    const idsUsuarios = Array.from({ length: TOTAL_USUARIOS }, () => new mongoose.Types.ObjectId());
    const dadosProdutos = Array.from({ length: TOTAL_PRODUTOS }, (_, indice) => ({
      _id: new mongoose.Types.ObjectId(),
      vendedorId: idsUsuarios[indice],
      nome: indice === 0 ? 'Teclado Mecânico' : `Produto ${indice + 1}`,
      preco: indice === 0 ? 250 : 10 + (indice % 291),
      estoque: 50 + (indice % 100)
    }));
    const data = new Date();
    const lotes = {};

    lotes.usuarios = await inserirEmLotes(usuarios, TOTAL_USUARIOS, (indice) => {
      const vendedor = indice < TOTAL_PRODUTOS;
      let nome = vendedor ? `Loja ${indice + 1}` : `Comprador ${indice - TOTAL_PRODUTOS + 1}`;
      if (indice === 0) nome = 'Loja Tech';
      if (indice === TOTAL_PRODUTOS) nome = 'Thales Cambraia Dias';
      return { _id: idsUsuarios[indice], nome, tipo: vendedor ? 'vendedor' : 'comprador' };
    });
    lotes.produtos = await inserirEmLotes(produtos, TOTAL_PRODUTOS, (indice) => dadosProdutos[indice]);
    lotes.pedidos = await inserirEmLotes(pedidos, TOTAL_PEDIDOS, (indice) => {
      const produto = dadosProdutos[indice % TOTAL_PRODUTOS];
      const comprador = TOTAL_PRODUTOS + (indice % (TOTAL_USUARIOS - TOTAL_PRODUTOS));
      const quantidade = 1 + ((Math.floor(indice / TOTAL_PRODUTOS) + 1) % 5);
      return { compradorId: idsUsuarios[comprador], produtoId: produto._id, quantidade, valorTotal: produto.preco * quantidade, data };
    });

    console.log(JSON.stringify({ data, bancoDaApi: conexao.db.databaseName, bancoDoSeed: banco.databaseName, tamanhoDoLote: TAMANHO_LOTE, lotes }, null, 2));
  } finally {
    await conexao.close();
  }
}

executar().catch(error => {
  const mensagem = error.constructor === Error ? error.message : error.name;
  console.error('Falha no seed:', mensagem, error.code || '');
  process.exitCode = 1;
});
