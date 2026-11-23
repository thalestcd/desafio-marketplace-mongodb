# Parte 3 — Persistência em MongoDB

**Aluno:** Thales Cambraia Dias

A API mantém as rotas da Parte 1 e grava em `usuarios`, `produtos` e `pedidos` usando os schemas de `modelos.js`. Os campos de referência usam `ObjectId`. O JSON da API continua expondo `id`, agora como string hexadecimal de 24 caracteres.

O pedido executa duas escritas na mesma transação. A primeira usa `$inc` para subtrair a quantidade somente se o estoque atual for suficiente. A segunda registra o pedido. Uma falha na gravação reverte a baixa. Use um replica set MongoDB (um membro basta para desenvolvimento) ou um cluster fragmentado. [Transações no Mongoose](https://mongoosejs.com/docs/transactions.html) · [Atomicidade no MongoDB](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)

## Configuração

1. Execute `npm install`.
2. Copie `.env.example` para `.env` e configure `MONGODB_URI` com o banco da API. Para usar o exemplo local, inicie o `mongod` com `--replSet marketplace-rs` e execute `rs.initiate()` pelo `mongosh` uma vez.
3. Execute `npm start`.

## Testes em MongoDB local

Use um banco de validação vazio na variável `MONGODB_URI`. O teste inicia e encerra duas instâncias da API em portas efêmeras.

```bash
node scripts/testar-persistencia.js
```

O [registro da execução](evidencia-persistencia.json) inclui as requisições e as consultas diretas ao MongoDB 8.3.8 em um replica set isolado. O fluxo criou Loja Tech, Thales Cambraia Dias, o Teclado Mecânico e um pedido de R$ 500. Após reiniciar a API, os cadastros e o pedido continuaram acessíveis, com estoque 3.

Os testes também enviaram JSON malformado, tipo de usuário inválido, preço como string, perfis sem permissão, ID de produto inválido e quantidade zero. Em duas compras simultâneas da última unidade de outro produto, uma recebeu HTTP 201 e a outra HTTP 400. A consulta direta confirmou estoque zero e um único pedido desse produto.
