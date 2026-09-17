require('dotenv').config();
const db = require('./db');
const { hashSenha } = require('./utils/password');

async function seed() {
  const usuario = process.env.ADMIN_USUARIO || 'admin';
  const senha = process.env.ADMIN_SENHA || 'admin123';

  const hash = await hashSenha(senha);
  await db.query(
    `INSERT INTO admins (usuario, senha_hash) VALUES ($1, $2)
     ON CONFLICT (usuario) DO UPDATE SET senha_hash = EXCLUDED.senha_hash`,
    [usuario, hash]
  );
  console.log(`Admin "${usuario}" criado/atualizado.`);

  const turmasIniciais = [
    ['Sub-7', 'futsal', 'Metrópole', 'Ter/Qui · 16h', 16],
    ['Sub-9', 'futsal', 'Metrópole', 'Seg/Qua · 17h', 16],
    ['Sub-11', 'futsal', 'Metrópole', 'Seg/Qua · 18h', 16],
    ['Avançado', 'beach', 'Quintas do Sol', 'Sáb · 11h', 8],
    ['Turma única', 'futv', 'Lourdes', 'Sex · 18h', 12],
    ['Adulto', 'nat', 'Lourdes', 'Seg/Qua · 19h', 10],
  ];
  for (const [nome, modalidade, unidade, horario, capacidade] of turmasIniciais) {
    const { rows } = await db.query('SELECT id FROM turmas WHERE nome = $1 AND modalidade = $2 AND unidade = $3', [nome, modalidade, unidade]);
    if (!rows[0]) {
      await db.query('INSERT INTO turmas (nome, modalidade, unidade, horario, capacidade) VALUES ($1,$2,$3,$4,$5)', [nome, modalidade, unidade, horario, capacidade]);
    }
  }
  console.log('Turmas iniciais garantidas.');

  await db.pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
