require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const alunosRoutes = require('./routes/alunos');
const turmasRoutes = require('./routes/turmas');
const clienteRoutes = require('./routes/cliente');
const webhookRoutes = require('./routes/webhook');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api', alunosRoutes);
app.use('/api', turmasRoutes);
app.use('/api', clienteRoutes);
app.use('/api', webhookRoutes);

// Serve o frontend para qualquer rota que não seja /api/*
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ erro: 'Rota não encontrada.' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`VH Soccer backend rodando na porta ${PORT}`));
}

module.exports = app;
