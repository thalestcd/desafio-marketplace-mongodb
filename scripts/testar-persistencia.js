const assert = require('node:assert/strict');
const { execFile, spawn } = require('node:child_process');
const { once } = require('node:events');
const { writeFile } = require('node:fs/promises');
const { createInterface } = require('node:readline');
const { promisify } = require('node:util');
const mongoose = require('mongoose');

require('dotenv').config({ quiet: true });

const executarArquivo = promisify(execFile);
const evidencia = { data: new Date().toISOString(), inicializacoes: [], verificacoes: [] };

async function comApi(teste) {
  const processo = spawn(process.execPath, ['index.js'], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit']
  });
  const encerrou = once(processo, 'exit');
  const linhas = createInterface({ input: processo.stdout });
  const timeout = setTimeout(() => processo.kill(), 12000);
  try {
    for await (const linha of linhas) {
      const porta = linha.match(/^Marketplace \(MongoDB\) em http:\/\/localhost:(\d+)$/)?.[1];
      if (!porta) continue;
      clearTimeout(timeout);
      evidencia.inicializacoes.push({ pid: processo.pid, porta: Number(porta) });
      return await teste(`http://127.0.0.1:${porta}`);
    }
    throw new Error('A API encerrou ou não inicializou a tempo.');
  } finally {
    clearTimeout(timeout);
    linhas.close();
    processo.kill();
    await encerrou;
  }
}

async function chamar(base, metodo, rota, corpo, statusEsperado) {
  const resposta = await fetch(base + rota, {
    method: metodo,
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    signal: AbortSignal.timeout(10000)
  });
  const dados = await resposta.json();
  evidencia.verificacoes.push({ metodo, rota, corpo, status: resposta.status, resposta: dados });
  if (statusEsperado !== undefined) assert.equal(resposta.status, statusEsperado);
  return { status: resposta.status, dados };
}

async function executar() {
  assert.ok(process.env.MONGODB_URI, 'Configure MONGODB_URI com um banco vazio para a validação.');
  const conexao = await mongoose.createConnection(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  }).asPromise();
  try {
    const banco = conexao.db;
    assert.deepEqual(await banco.listCollections().toArray(), [], 'A validação exige um banco vazio.');
    evidencia.banco = banco.databaseName;
    evidencia.versaoMongoDB = (await banco.admin().command({ buildInfo: 1 })).version;

    await comApi(async (base) => {
      const { stdout } = await executarArquivo(process.execPath, ['scripts/testar-fluxo.js'], {
        env: { ...process.env, BASE_URL: base }
      });
      evidencia.fluxo = JSON.parse(stdout);
    });

    const [vendedor, comprador, produto, , pedido] = evidencia.fluxo.chamadas.map(chamada => chamada.resposta);
    for (const documento of [vendedor, comprador, produto, pedido]) {
      assert.match(documento.id, /^[a-f0-9]{24}$/);
    }

    await comApi(async (base) => {
      const usuarios = (await chamar(base, 'GET', '/usuarios', undefined, 200)).dados;
      assert.equal(usuarios.length, 2);
      for (const usuario of [vendedor, comprador]) assert.deepEqual(usuarios.find(item => item.id === usuario.id), usuario);
      const produtos = (await chamar(base, 'GET', '/produtos', undefined, 200)).dados;
      assert.deepEqual(produtos, [{ ...produto, estoque: 3 }]);
      assert.deepEqual((await chamar(base, 'GET', '/pedidos', undefined, 200)).dados, [pedido]);
      assert.deepEqual((await chamar(base, 'GET', '/resumo', undefined, 200)).dados, {
        usuarios: 2, produtos: 1, pedidos: 1, totalVendido: 500
      });

      await chamar(base, 'POST', '/usuarios', '{', 400);
      await chamar(base, 'POST', '/usuarios', { nome: 'Teste', tipo: 'administrador' }, 400);
      const entrada = { vendedorId: vendedor.id, nome: 'Produto para concorrência', preco: 10, estoque: 1 };
      await chamar(base, 'POST', '/produtos', { ...entrada, vendedorId: comprador.id }, 403);
      await chamar(base, 'POST', '/produtos', { ...entrada, preco: '10' }, 400);
      const novo = (await chamar(base, 'POST', '/produtos', entrada, 201)).dados;
      const compra = { compradorId: comprador.id, produtoId: novo.id, quantidade: 1 };
      await chamar(base, 'POST', '/pedidos', { ...compra, compradorId: vendedor.id }, 403);
      await chamar(base, 'POST', '/pedidos', { ...compra, produtoId: 'invalido' }, 400);
      await chamar(base, 'POST', '/pedidos', { ...compra, quantidade: 0 }, 400);

      const compras = await Promise.all([
        chamar(base, 'POST', '/pedidos', compra),
        chamar(base, 'POST', '/pedidos', compra)
      ]);
      assert.deepEqual(compras.map(({ status }) => status).sort(), [201, 400]);
      assert.deepEqual((await chamar(base, 'GET', '/resumo', undefined, 200)).dados, {
        usuarios: 2, produtos: 2, pedidos: 2, totalVendido: 510
      });

      const documentos = {};
      for (const nome of ['usuarios', 'produtos', 'pedidos']) {
        documentos[nome] = await banco.collection(nome).find().sort({ _id: 1 }).toArray();
        assert.equal(documentos[nome].length, 2);
        for (const documento of documentos[nome]) assert.ok(documento._id instanceof mongoose.Types.ObjectId);
      }
      assert.equal(documentos.produtos.find(item => item._id.toString() === produto.id).estoque, 3);
      const produtoEsgotado = documentos.produtos.find(item => item._id.toString() === novo.id);
      assert.ok(produtoEsgotado.vendedorId instanceof mongoose.Types.ObjectId);
      assert.equal(produtoEsgotado.estoque, 0);
      const pedidosProduto = documentos.pedidos.filter(item => item.produtoId.equals(produtoEsgotado._id));
      assert.equal(pedidosProduto.length, 1);
      assert.ok(pedidosProduto[0].compradorId instanceof mongoose.Types.ObjectId);
      assert.deepEqual((await chamar(base, 'GET', '/produtos', undefined, 200)).dados, [{ ...produto, estoque: 3 }]);
      evidencia.documentosMongoDB = documentos;
    });

    const json = JSON.stringify(evidencia, null, 2) + '\n';
    if (process.argv[2]) await writeFile(process.argv[2], json);
    console.log(json);
  } finally {
    await conexao.close();
  }
}

executar().catch(error => {
  console.error(evidencia);
  console.error(error);
  process.exitCode = 1;
});
