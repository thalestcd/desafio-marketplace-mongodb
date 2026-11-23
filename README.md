# Marketplace — Banco de Dados Não Relacional

**Disciplina:** Banco de Dados Não Relacional  
**Aluno:** Thales Cambraia Dias

## Parte 1 — API com dados em memória

Esta é a primeira entrega do desafio. A API foi criada com **Node.js e Express** e tem os endpoints pedidos pelo professor: `POST /usuarios`, `POST /produtos`, `GET /produtos` e `POST /pedidos`.

### Como executar

```bash
npm install
node index.js
```

Base: `http://localhost:3000`. O cadastro e os pedidos ficam apenas na memória, portanto desaparecem ao reiniciar o servidor.

### Fluxo esperado

1. `POST /usuarios` com `{"nome":"Loja Tech","tipo":"vendedor"}` cria o vendedor id 1.
2. `POST /usuarios` com `{"nome":"Thales Cambraia Dias","tipo":"comprador"}` cria o comprador id 2.
3. `POST /produtos` com `{"vendedorId":1,"nome":"Teclado Mecânico","preco":250,"estoque":5}` cria produto id 1.
4. `GET /produtos` lista o produto disponível.
5. `POST /pedidos` com `{"compradorId":2,"produtoId":1,"quantidade":2}` gera um pedido de R$ 500 e deixa estoque 3.

Rotas extras de consulta: `GET /usuarios`, `GET /pedidos` e `GET /resumo`.

### Histórico das entregas

- `parte-1` registra a implementação inicial.
- `parte-2` registra os [testes da API em memória](docs/parte-2/ENTREGA.md), com evidências HTTP e coleção Postman.
