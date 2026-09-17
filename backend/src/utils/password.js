const bcrypt = require('bcryptjs');

async function hashSenha(senha) {
  return bcrypt.hash(senha, 10);
}

async function conferirSenha(senha, hash) {
  if (!hash) return false;
  return bcrypt.compare(senha, hash);
}

// Gera uma senha temporária simples para o primeiro acesso do responsável.
// Ele deve trocar depois via POST /api/auth/cliente/trocar-senha.
function gerarSenhaTemporaria() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos (0/O, 1/I)
  let senha = '';
  for (let i = 0; i < 8; i++) senha += chars[Math.floor(Math.random() * chars.length)];
  return senha;
}

module.exports = { hashSenha, conferirSenha, gerarSenhaTemporaria };
