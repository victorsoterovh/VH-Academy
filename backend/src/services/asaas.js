const axios = require('axios');

const BASE_URL = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    access_token: process.env.ASAAS_API_KEY,
  },
});

// Cria (ou você pode adaptar para reaproveitar) o cliente no Asaas a partir do pagador.
async function criarCliente(pagador) {
  const { data } = await api.post('/customers', {
    name: pagador.nome,
    cpfCnpj: pagador.cpf.replace(/\D/g, ''),
    email: pagador.email,
    mobilePhone: pagador.celular.replace(/\D/g, ''),
    postalCode: pagador.cep ? pagador.cep.replace(/\D/g, '') : undefined,
    address: pagador.logradouro,
    addressNumber: pagador.numero,
    complement: pagador.complemento || undefined,
    province: pagador.bairro,
  });
  return data; // data.id é o customer id do Asaas
}

// Cobrança avulsa (uma única vez)
async function criarCobrancaAvulsa({ customerId, valor, vencimento, descricao }) {
  const { data } = await api.post('/payments', {
    customer: customerId,
    billingType: 'UNDEFINED', // deixa o pagador escolher boleto/pix/cartão
    value: valor,
    dueDate: vencimento, // formato 'YYYY-MM-DD'
    description: descricao,
  });
  return data; // data.id, data.invoiceUrl
}

// Assinatura recorrente (mensal)
async function criarAssinatura({ customerId, valor, primeiroVencimento, descricao }) {
  const { data } = await api.post('/subscriptions', {
    customer: customerId,
    billingType: 'UNDEFINED',
    value: valor,
    nextDueDate: primeiroVencimento, // formato 'YYYY-MM-DD'
    cycle: 'MONTHLY',
    description: descricao,
  });
  return data; // data.id da assinatura
}

// Usado para buscar o link da 1ª cobrança já gerada por uma assinatura recém-criada
async function buscarCobrancasDaAssinatura(subscriptionId) {
  const { data } = await api.get(`/payments?subscription=${subscriptionId}`);
  return data.data || [];
}

module.exports = { criarCliente, criarCobrancaAvulsa, criarAssinatura, buscarCobrancasDaAssinatura };
