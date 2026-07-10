// Helper central de fetch pras rotas internas do backend (protegidas por
// Basic Auth — ver server/middleware/requireAuth.js). Guarda o header já
// pronto (não a senha em texto puro) em sessionStorage e injeta em toda
// chamada; qualquer 401 (sessão inválida ou credencial trocada) força logout
// automático em vez de deixar a tela presa num estado de dado vazio.

const STORAGE_KEY = 'hs_auth_header';

export const getAuthHeader = () => sessionStorage.getItem(STORAGE_KEY);

export const setAuthHeader = (header) => sessionStorage.setItem(STORAGE_KEY, header);

export const clearAuthHeader = () => sessionStorage.removeItem(STORAGE_KEY);

let onUnauthorized = () => {};

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export const authFetch = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const authHeader = getAuthHeader();
  if (authHeader) headers.Authorization = authHeader;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAuthHeader();
    onUnauthorized();
  }
  return res;
};
