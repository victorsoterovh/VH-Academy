const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Token ausente. Faça login novamente.' });

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

function exigirPapel(papel) {
  return (req, res, next) => {
    if (!req.usuario || req.usuario.role !== papel) {
      return res.status(403).json({ erro: 'Você não tem permissão para acessar isso.' });
    }
    next();
  };
}

module.exports = { autenticar, exigirPapel };
