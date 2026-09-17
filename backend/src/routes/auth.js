const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { conferirSenha, hashSenha } = require('../utils/password');

const router = express.Router();

function cpfDigits(v) { return (v || '').replace(/\D/g, ''); }

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ erro: 'Informe usuário e senha.' });

  const { rows } = await db.query('SELECT * FROM admins WHERE usuario = $1', [usuario]);
  const admin = rows[0];
  if (!admin || !(await conferirSenha(senha, admin.senha_hash))) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }

  const token = jwt.sign({ role: 'admin', id: admin.id, usuario: admin.usuario }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// POST /api/auth/cliente/login
router.post('/cliente/login', async (req, res) => {
  const { cpf, senha } = req.body;
  if (!cpf || !senha) return res.status(400).json({ erro: 'Informe CPF e senha.' });

  const { rows } = await db.query(
    "SELECT * FROM pagadores WHERE regexp_replace(cpf, '\\D', '', 'g') = $1",
    [cpfDigits(cpf)]
  );
  const pagador = rows[0];

  if (!pagador) return res.status(401).json({ erro: 'CPF não encontrado. Verifique com a academia.' });
  if (!pagador.senha_hash) {
    return res.status(401).json({ erro: 'Seu acesso ainda não foi liberado. Aguarde a aprovação da matrícula.' });
  }
  if (!(await conferirSenha(senha, pagador.senha_hash))) {
    return res.status(401).json({ erro: 'CPF ou senha inválidos.' });
  }

  const token = jwt.sign({ role: 'cliente', pagadorId: pagador.id, nome: pagador.nome }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, nome: pagador.nome });
});

// POST /api/auth/cliente/trocar-senha  (cliente já logado troca a senha temporária)
router.post('/cliente/trocar-senha', async (req, res) => {
  const { pagadorId, senhaAtual, novaSenha } = req.body;
  if (!pagadorId || !senhaAtual || !novaSenha) return res.status(400).json({ erro: 'Dados incompletos.' });

  const { rows } = await db.query('SELECT * FROM pagadores WHERE id = $1', [pagadorId]);
  const pagador = rows[0];
  if (!pagador || !(await conferirSenha(senhaAtual, pagador.senha_hash))) {
    return res.status(401).json({ erro: 'Senha atual incorreta.' });
  }
  const novoHash = await hashSenha(novaSenha);
  await db.query('UPDATE pagadores SET senha_hash = $1 WHERE id = $2', [novoHash, pagadorId]);
  res.json({ ok: true });
});

module.exports = router;
