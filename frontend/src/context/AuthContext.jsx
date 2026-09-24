import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('stocksense_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      localStorage.removeItem('stocksense_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function doLogin(email, password) {
    setAuthError('');
    try {
      const { access_token } = await api.login({ email, password });
      localStorage.setItem('stocksense_token', access_token);
      const me = await api.getMe();
      setUser(me);
      return true;
    } catch (err) {
      setAuthError(err?.response?.data?.detail || 'Login failed. Please check your credentials.');
      return false;
    }
  }

  async function doSignup(payload) {
    setAuthError('');
    try {
      const { access_token } = await api.signup(payload);
      localStorage.setItem('stocksense_token', access_token);
      const me = await api.getMe();
      setUser(me);
      return true;
    } catch (err) {
      setAuthError(err?.response?.data?.detail || 'Could not create your account.');
      return false;
    }
  }

  function logout() {
    localStorage.removeItem('stocksense_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, doLogin, doSignup, logout, refreshUser: loadUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
