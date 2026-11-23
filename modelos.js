const { model, Schema } = require('mongoose');

const opcoes = {
  versionKey: false,
  toJSON: {
    transform(_documento, dados) {
      dados.id = dados._id.toString();
      delete dados._id;
    }
  }
};

const nome = { type: String, required: true, trim: true };
const inteiro = (min) => ({ type: Number, required: true, min, validate: Number.isSafeInteger });
const referencia = (ref) => ({ type: Schema.Types.ObjectId, ref, required: true });

const Usuario = model('Usuario', new Schema({
  nome,
  tipo: { type: String, enum: ['vendedor', 'comprador'], required: true }
}, { ...opcoes, collection: 'usuarios' }));

const Produto = model('Produto', new Schema({
  vendedorId: referencia('Usuario'),
  nome,
  preco: { type: Number, required: true, validate: (valor) => Number.isFinite(valor) && valor > 0 },
  estoque: inteiro(0)
}, { ...opcoes, collection: 'produtos' }));

const Pedido = model('Pedido', new Schema({
  compradorId: referencia('Usuario'),
  produtoId: referencia('Produto'),
  quantidade: inteiro(1),
  valorTotal: { type: Number, required: true, min: 0, validate: Number.isFinite },
  data: { type: Date, required: true, default: Date.now }
}, { ...opcoes, collection: 'pedidos' }));

module.exports = { Usuario, Produto, Pedido };
