const { Pool } = require('pg');

// A maioria das hospedagens (Render, Railway, Supabase, etc.) exige SSL em produção.
// "rejectUnauthorized: false" evita erro com certificados autoassinados dessas plataformas.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do Postgres:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
