const express = require('express');
const db = require('../db');
const { autenticar, exigirPapel } = require('../middleware/auth');
const { gerarSenhaTemporaria, hashSenha } = require('../utils/password');
const asaas = require('../services/asaas');
const { enviarCredencialAcesso } = require('../services/notificacoes');

const router = express.Router();
function cpfDigits(v) { return (v || '').replace(/\D/g, ''); }

/* ---------------------------------------------------------------------
   POST /api/cadastros  (público — é o endpoint que a página de cadastro chama)
--------------------------------------------------------------------- */
router.post('/cadastros', async (req, res) => {
  const { atleta, pagador } = req.body;
  if (!atleta || !pagador) return res.status(400).json({ erro: 'Dados incompletos.' });

  try {
    // Reaproveita o pagador se o CPF já existir (ex: 2º filho do mesmo responsável)
    const cpf = cpfDigits(pagador.cpf);
    const { rows: existentes } = await db.query(
      "SELECT * FROM pagadores WHERE regexp_replace(cpf, '\\D', '', 'g') = $1",
      [cpf]
    );

    let pagadorId;
    if (existentes[0]) {
      pagadorId = existentes[0].id;
    } else {
      const { rows } = await db.query(
        `INSERT INTO pagadores (nome, cpf, email, celular, cep, logradouro, numero, complemento, bairro, cidade, uf)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [pagador.nome, pagador.cpf, pagador.email, pagador.celular,
         pagador.endereco?.cep, pagador.endereco?.logradouro, pagador.endereco?.numero,
         pagador.endereco?.complemento, pagador.endereco?.bairro, pagador.endereco?.cidade, pagador.endereco?.uf]
      );
      pagadorId = rows[0].id;
    }

    const { rows: alunoRows } = await db.query(
      `INSERT INTO alunos (nome, nascimento, condominio, unidade, modalidade, atleta_tipo, pagador_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [atleta.nome, atleta.nascimento, atleta.condominio, atleta.unidade, atleta.modalidade, atleta.tipo, pagadorId]
    );

    res.json({ protocolo: 'VH-' + alunoRows[0].id.toString().padStart(6, '0') });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Não foi possível salvar o cadastro. Tente novamente em instantes.' });
  }
});

/* ---------------------------------------------------------------------
   GET /api/alunos?status=pendente|ativo|inadimplente|todos   (admin)
--------------------------------------------------------------------- */
router.get('/alunos', autenticar, exigirPapel('admin'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, p.nome AS pagador_nome, p.cpf AS pagador_cpf, p.email AS pagador_email, p.celular AS pagador_celular,
           t.nome AS turma_nome, t.horario AS turma_horario,
           EXISTS (
             SELECT 1 FROM cobrancas c WHERE c.aluno_id = a.id AND c.status = 'atrasado'
           ) AS inadimplente
    FROM alunos a
    JOIN pagadores p ON p.id = a.pagador_id
    LEFT JOIN turmas t ON t.id = a.turma_id
    ORDER BY a.criado_em DESC
  `);
  res.json(rows);
});

/* ---------------------------------------------------------------------
   GET /api/alunos/:id  (admin) — detalhe completo + cobranças
--------------------------------------------------------------------- */
router.get('/alunos/:id', autenticar, exigirPapel('admin'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, row_to_json(p) AS pagador, row_to_json(t) AS turma
    FROM alunos a
    JOIN pagadores p ON p.id = a.pagador_id
    LEFT JOIN turmas t ON t.id = a.turma_id
    WHERE a.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ erro: 'Aluno não encontrado.' });

  const { rows: cobrancas } = await db.query('SELECT * FROM cobrancas WHERE aluno_id = $1 ORDER BY vencimento DESC', [req.params.id]);
  res.json({ ...rows[0], cobrancas });
});

/* ---------------------------------------------------------------------
   POST /api/alunos/:id/aprovar   (admin) — body: { turmaId }
   Cria o cliente no Asaas (se ainda não existir) e libera o acesso do responsável.
--------------------------------------------------------------------- */
router.post('/alunos/:id/aprovar', autenticar, exigirPapel('admin'), async (req, res) => {
  const { turmaId } = req.body;
  if (!turmaId) return res.status(400).json({ erro: 'Selecione uma turma.' });

  try {
    const { rows } = await db.query(`
      SELECT a.*, row_to_json(p) AS pagador FROM alunos a JOIN pagadores p ON p.id = a.pagador_id WHERE a.id = $1
    `, [req.params.id]);
    const aluno = rows[0];
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });

    let asaasCustomerId = aluno.pagador.asaas_customer_id;
    if (!asaasCustomerId) {
      const cliente = await asaas.criarCliente(aluno.pagador);
      asaasCustomerId = cliente.id;
      await db.query('UPDATE pagadores SET asaas_customer_id = $1 WHERE id = $2', [asaasCustomerId, aluno.pagador.id]);
    }

    let credencialGerada = false;
    if (!aluno.pagador.senha_hash) {
      const senhaTemp = gerarSenhaTemporaria();
      const hash = await hashSenha(senhaTemp);
      await db.query('UPDATE pagadores SET senha_hash = $1 WHERE id = $2', [hash, aluno.pagador.id]);
      await enviarCredencialAcesso({ pagador: aluno.pagador, senhaTemp });
      credencialGerada = true;
    }

    await db.query('UPDATE alunos SET status = $1, turma_id = $2 WHERE id = $3', ['ativo', turmaId, aluno.id]);

    res.json({ ok: true, asaasCustomerId, credencialEnviada: credencialGerada });
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ erro: 'Não foi possível concluir a aprovação. Verifique a chave do Asaas e tente de novo.' });
  }
});

/* ---------------------------------------------------------------------
   POST /api/alunos/:id/cobrancas   (admin) — body: { tipo, valor, vencimento, descricao }
--------------------------------------------------------------------- */
router.post('/alunos/:id/cobrancas', autenticar, exigirPapel('admin'), async (req, res) => {
  const { tipo, valor, vencimento, descricao } = req.body;
  if (!tipo || !valor || !vencimento || !descricao) return res.status(400).json({ erro: 'Preencha todos os campos da cobrança.' });

  try {
    const { rows } = await db.query(`
      SELECT a.*, p.asaas_customer_id, p.nome AS pagador_nome
      FROM alunos a JOIN pagadores p ON p.id = a.pagador_id WHERE a.id = $1
    `, [req.params.id]);
    const aluno = rows[0];
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    if (!aluno.asaas_customer_id) return res.status(400).json({ erro: 'Este aluno ainda não tem cliente criado no Asaas. Aprove o cadastro primeiro.' });

    let asaasId, link;
    if (tipo === 'avulsa') {
      const cobranca = await asaas.criarCobrancaAvulsa({ customerId: aluno.asaas_customer_id, valor, vencimento, descricao });
      asaasId = cobranca.id; link = cobranca.invoiceUrl;
    } else {
      const assinatura = await asaas.criarAssinatura({ customerId: aluno.asaas_customer_id, valor, primeiroVencimento: vencimento, descricao });
      asaasId = assinatura.id;
      const geradas = await asaas.buscarCobrancasDaAssinatura(assinatura.id);
      link = geradas[0]?.invoiceUrl;
    }

    const { rows: nova } = await db.query(
      `INSERT INTO cobrancas (aluno_id, asaas_payment_id, tipo, valor, vencimento, descricao, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [aluno.id, asaasId, tipo, valor, vencimento, descricao, link]
    );
    res.json(nova[0]);
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ erro: 'Não foi possível criar a cobrança no Asaas.' });
  }
});

module.exports = router;
