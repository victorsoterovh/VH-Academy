const express = require('express');
const db = require('../db');

const router = express.Router();

// Mapeia os eventos do Asaas para o status que usamos no nosso banco
const MAPA_STATUS = {
  PAYMENT_RECEIVED: 'pago',
  PAYMENT_CONFIRMED: 'pago',
  PAYMENT_OVERDUE: 'atrasado',
  PAYMENT_DELETED: 'cancelado',
  PAYMENT_REFUNDED: 'cancelado',
};

// POST /api/webhooks/asaas
// Configure essa URL no painel do Asaas: Integrações > Webhooks
// Use o mesmo token que você colocou em ASAAS_WEBHOOK_TOKEN, enviado no header abaixo.
router.post('/webhooks/asaas', async (req, res) => {
  const tokenRecebido = req.headers['asaas-access-token'];
  if (process.env.ASAAS_WEBHOOK_TOKEN && tokenRecebido !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ erro: 'Token de webhook inválido.' });
  }

  const { event, payment } = req.body;
  const novoStatus = MAPA_STATUS[event];

  if (novoStatus && payment?.id) {
    try {
      await db.query('UPDATE cobrancas SET status = $1 WHERE asaas_payment_id = $2', [novoStatus, payment.id]);
    } catch (e) {
      console.error('Erro ao processar webhook do Asaas:', e);
    }
  }

  // Sempre responder 200 rápido — o Asaas reenvia o evento se não receber confirmação
  res.status(200).json({ recebido: true });
});

module.exports = router;
