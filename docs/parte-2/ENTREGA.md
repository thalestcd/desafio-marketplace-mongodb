# Parte 2 — Testes da API em memória

**Aluno:** Thales Cambraia Dias

A [evidência HTTP](evidencia-http.json) foi gerada em 22/11/2026, no horário de Brasília, com Node.js 22.18.0 e npm 10.9.3. O arquivo registra os corpos enviados, os status e as respostas recebidas da API após a instalação com `npm install`.

| Teste | Rota | Resultado observado |
| --- | --- | --- |
| 1 | `POST /usuarios` | HTTP 201. Loja Tech, vendedor de ID 1. |
| 2 | `POST /usuarios` | HTTP 201. Thales Cambraia Dias, comprador de ID 2. |
| 3 | `POST /produtos` | HTTP 201. Teclado Mecânico, ID 1, preço R$ 250, estoque 5. |
| 4 | `GET /produtos` | HTTP 200. Teclado Mecânico listado com estoque 5. |
| 5 | `POST /pedidos` | HTTP 201. Pedido de duas unidades, com total de R$ 500. |
| Conferência | `GET /produtos` | HTTP 200. Estoque final de 3 unidades. |

## Reprodução

Em um terminal, execute:

```bash
npm install
npm start
```

Em outro terminal:

```bash
node scripts/testar-fluxo.js
```

O script usa `http://127.0.0.1:3000` por padrão e aceita a variável `BASE_URL`. Um caminho passado como argumento salva uma cópia em JSON.

Importe a [coleção Postman](Marketplace.postman_collection.json) e execute os itens em ordem pelo Collection Runner. A variável `baseUrl` aponta para a API e as requisições de criação capturam os IDs para as etapas seguintes. A coleção também foi executada pelo Newman em uma instância recém-iniciada da API e passou nas 6 requisições e nas 6 asserções.
