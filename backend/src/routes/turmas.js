const express = require('express');
const db = require('../db');
const { autenticar, exigirPapel } = require('../middleware/auth');

const router = express.Router();

// GET /api/turmas  (admin) — lista com contagem de matriculados
router.get('/turmas', autenticar, exigirPapel('admin'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT t.*, COUNT(a.id) AS matriculados
    FROM turmas t
    LEFT JOIN alunos a ON a.turma_id = t.id
    GROUP BY t.id
    ORDER BY t.modalidade, t.unidade, t.nome
  `);
  res.json(rows);
});

// POST /api/turmas  (admin) — body: { nome, modalidade, unidade, horario, capacidade }
router.post('/turmas', autenticar, exigirPapel('admin'), async (req, res) => {
  const { nome, modalidade, unidade, horario, capacidade } = req.body;
  if (!nome || !modalidade || !unidade || !horario) return res.status(400).json({ erro: 'Preencha nome, modalidade, unidade e horário.' });

  const { rows } = await db.query(
    'INSERT INTO turmas (nome, modalidade, unidade, horario, capacidade) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [nome, modalidade, unidade, horario, capacidade || null]
  );
  res.json(rows[0]);
});

// GET /api/turmas/:id/alunos  (admin)
router.get('/turmas/:id/alunos', autenticar, exigirPapel('admin'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, p.nome AS pagador_nome
    FROM alunos a JOIN pagadores p ON p.id = a.pagador_id
    WHERE a.turma_id = $1
    ORDER BY a.nome
  `, [req.params.id]);
  res.json(rows);
});

module.exports = router;
