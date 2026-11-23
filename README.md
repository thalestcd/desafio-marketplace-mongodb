# Marketplace — Banco de Dados Não Relacional

**Disciplina:** Banco de Dados Não Relacional  
**Aluno:** Thales Cambraia Dias

## Como executar a API

A API usa **Node.js, Express e MongoDB**. Configure `MONGODB_URI` em uma cópia de `.env.example` chamada `.env`, apontando para um replica set MongoDB ou cluster fragmentado.

```bash
npm install
npm start
```

Base padrão: `http://localhost:3000`.

### Fluxo esperado

1. `POST /usuarios` com `{"nome":"Loja Tech","tipo":"vendedor"}` retorna o ID do vendedor.
2. `POST /usuarios` com `{"nome":"Thales Cambraia Dias","tipo":"comprador"}` retorna o ID do comprador.
3. `POST /produtos` com `{"vendedorId":"<ID do vendedor>","nome":"Teclado Mecânico","preco":250,"estoque":5}` retorna o ID do produto.
4. `GET /produtos` lista o produto disponível.
5. `POST /pedidos` com `{"compradorId":"<ID do comprador>","produtoId":"<ID do produto>","quantidade":2}` gera um pedido de R$ 500 e deixa estoque 3.

Rotas extras de consulta: `GET /usuarios`, `GET /pedidos` e `GET /resumo`.

### Histórico das entregas

- `parte-1` registra a implementação inicial.
- `parte-2` registra os [testes da API em memória](docs/parte-2/ENTREGA.md), com evidências HTTP e coleção Postman.
- `parte-3` documenta a [persistência com MongoDB e os testes](docs/parte-3/ENTREGA.md).
