# Parte 4 — Seed em banco de testes

**Aluno:** Thales Cambraia Dias

`npm run seed` carrega dados no banco `marketplace_seed_test`, no mesmo servidor indicado por `MONGODB_URI`. O script verifica o nome do banco da API, exige um banco de seed vazio e usa `insertMany` do driver MongoDB. Cada lote tem no máximo 10.000 documentos.

| Coleção | Documentos encontrados | Lotes inseridos | Índices |
| --- | ---: | --- | --- |
| `usuarios` | 5.000 | 1 × 5.000 | `_id_` |
| `produtos` | 1.000 | 1 × 1.000 | `_id_` |
| `pedidos` | 100.000 | 10 × 10.000 | `_id_` |

A [evidência de execução](evidencia-seed.json) registra os lotes confirmados pelo driver, as contagens e os índices lidos pelo `mongosh`, amostras com referências BSON e os dados do banco da API antes e depois da carga. A amostra contém Loja Tech, Thales Cambraia Dias, o Teclado Mecânico e um pedido de duas unidades no valor de R$ 500.

## Reprodução

1. Execute `npm install` e configure a conexão da API conforme a [Parte 3](../parte-3/ENTREGA.md).
2. Execute `npm run seed`. Para outra carga, configure `SEED_DB_NAME` com um nome novo, por exemplo `marketplace_seed_test_2`. Se uma carga for interrompida, use um novo banco vazio para tentar de novo.
3. Abra o `mongosh` conectado ao banco da API e execute `load('scripts/verificar-seed.mongodb.js')` a partir da raiz do repositório. Caso tenha configurado um nome alternativo, defina a mesma variável `SEED_DB_NAME` no ambiente do `mongosh`.

A validação usou MongoDB 8.3.8 em um replica set local, restrito a loopback e com diretório de dados temporário. Os testes HTTP e de persistência da Parte 3 foram executados novamente com o código desta entrega. O seed recusou uma segunda carga no mesmo banco e também recusou uma configuração em que o banco de destino era o mesmo da API.
