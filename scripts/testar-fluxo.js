const assert = require('node:assert/strict');
const { writeFile } = require('node:fs/promises');

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const evidencia = { data: new Date().toISOString(), base, chamadas: [] };

async function chamar(metodo, rota, corpo) {
  const resposta = await fetch(base + rota, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(10000)
  });
  const dados = await resposta.json();
  evidencia.chamadas.push({ metodo, rota, corpo, status: resposta.status, resposta: dados });
  return { status: resposta.status, dados };
}

async function executar() {
  const vendedor = await chamar('POST', '/usuarios', { nome: 'Loja Tech', tipo: 'vendedor' });
  assert.equal(vendedor.status, 201);
  assert.equal(vendedor.dados.nome, 'Loja Tech');
  assert.equal(vendedor.dados.tipo, 'vendedor');

  const comprador = await chamar('POST', '/usuarios', { nome: 'Thales Cambraia Dias', tipo: 'comprador' });
  assert.equal(comprador.status, 201);
  assert.equal(comprador.dados.nome, 'Thales Cambraia Dias');
  assert.equal(comprador.dados.tipo, 'comprador');
  assert.ok(vendedor.dados.id && comprador.dados.id);
  assert.notEqual(vendedor.dados.id, comprador.dados.id);

  const entrada = { vendedorId: vendedor.dados.id, nome: 'Teclado Mecânico', preco: 250, estoque: 5 };
  const produto = await chamar('POST', '/produtos', entrada);
  assert.equal(produto.status, 201);
  assert.ok(produto.dados.id);
  assert.deepEqual(produto.dados, { id: produto.dados.id, ...entrada });

  const lista = await chamar('GET', '/produtos');
  assert.equal(lista.status, 200);
  assert.deepEqual(lista.dados.find(item => item.id === produto.dados.id), produto.dados);

  const dadosPedido = { compradorId: comprador.dados.id, produtoId: produto.dados.id, quantidade: 2 };
  const pedido = await chamar('POST', '/pedidos', dadosPedido);
  assert.equal(pedido.status, 201);
  assert.ok(pedido.dados.id);
  for (const [campo, valor] of Object.entries(dadosPedido)) assert.equal(pedido.dados[campo], valor);
  assert.equal(pedido.dados.valorTotal, 500);

  const saldo = await chamar('GET', '/produtos');
  assert.equal(saldo.status, 200);
  assert.equal(saldo.dados.find(item => item.id === produto.dados.id).estoque, 3);

  const json = JSON.stringify(evidencia, null, 2) + '\n';
  if (process.argv[2]) await writeFile(process.argv[2], json);
  console.log(json);
}

executar().catch(error => {
  console.error(evidencia);
  console.error(error);
  process.exitCode = 1;
});
