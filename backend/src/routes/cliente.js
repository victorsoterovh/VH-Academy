const express = require('express');
const db = require('../db');
const { autenticar, exigirPapel } = require('../middleware/auth');

const router = express.Router();

// GET /api/cliente/alunos  (cliente) — só os atletas vinculados ao CPF logado
router.get('/cliente/alunos', autenticar, exigirPapel('cliente'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, t.nome AS turma_nome, t.horario AS turma_horario
    FROM alunos a
    LEFT JOIN turmas t ON t.id = a.turma_id
    WHERE a.pagador_id = $1
    ORDER BY a.nome
  `, [req.usuario.pagadorId]);
  res.json(rows);
});

// GET /api/cliente/alunos/:id  (cliente) — detalhe + faturas, só se pertencer a esse CPF
router.get('/cliente/alunos/:id', autenticar, exigirPapel('cliente'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, t.nome AS turma_nome, t.horario AS turma_horario
    FROM alunos a
    LEFT JOIN turmas t ON t.id = a.turma_id
    WHERE a.id = $1 AND a.pagador_id = $2
  `, [req.params.id, req.usuario.pagadorId]);
  if (!rows[0]) return res.status(404).json({ erro: 'Atleta não encontrado.' });

  const { rows: cobrancas } = await db.query('SELECT * FROM cobrancas WHERE aluno_id = $1 ORDER BY vencimento DESC', [req.params.id]);
  res.json({ ...rows[0], cobrancas });
});

module.exports = router;
