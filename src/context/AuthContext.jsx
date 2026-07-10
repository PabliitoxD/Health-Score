import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthHeader, setAuthHeader, clearAuthHeader, setUnauthorizedHandler } from '../services/authFetch';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthHeader());

  // Qualquer chamada às rotas protegidas que voltar 401 (sessão inválida ou
  // credencial trocada no servidor) derruba a sessão local também, em vez de
  // deixar o painel preso mostrando dado vazio/desatualizado.
  useEffect(() => {
    setUnauthorizedHandler(() => setIsAuthenticated(false));
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return false;

    setAuthHeader(`Basic ${btoa(`${username}:${password}`)}`);
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    clearAuthHeader();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
