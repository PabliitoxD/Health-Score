// Basic Auth pras rotas internas do time de CS (customers/stats/cancellations
// e o disparo de pesquisa) — antes desse middleware, o login era validado só
// no frontend (credenciais fixas em AuthContext.jsx, visíveis no bundle JS) e
// nenhuma rota /api/* exigia nada, então qualquer pessoa com a URL do
// servidor lia todos os dados de clientes/cancelamentos sem passar pelo
// login. Rotas usadas por clientes externos respondendo pesquisa por link
// (sem login, autenticadas pelo token da própria URL) continuam públicas —
// ver server/routes/surveys.js.

let warnedMissingEnv = false;

// Sem fallback hardcoded de propósito — mesmo padrão de EXTERNAL_API_URL
// (ver server/services/syncEngine.js): a credencial obrigatoriamente vem de
// AUTH_USERNAME/AUTH_PASSWORD (ver .env.example), nunca de um valor fixo no
// código-fonte. Lida dentro da função (não no topo do módulo) porque módulos
// importados são avaliados antes do loadEnvFile() rodar em server.js.
function getAuthCredentials() {
  const username = process.env.AUTH_USERNAME || null;
  const password = process.env.AUTH_PASSWORD || null;

  if ((!username || !password) && !warnedMissingEnv) {
    warnedMissingEnv = true;
    console.error(
      '[auth] AUTH_USERNAME/AUTH_PASSWORD não configuradas — login bloqueado até configurar as duas ' +
      '(ver .env.example).'
    );
  }

  return { username, password };
}

export function checkCredentials(username, password) {
  const expected = getAuthCredentials();
  if (!expected.username || !expected.password) return false;
  return username === expected.username && password === expected.password;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }

  let decoded;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const separatorIndex = decoded.indexOf(':');
  const username = separatorIndex === -1 ? decoded : decoded.slice(0, separatorIndex);
  const password = separatorIndex === -1 ? '' : decoded.slice(separatorIndex + 1);

  if (!checkCredentials(username, password)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  next();
}
