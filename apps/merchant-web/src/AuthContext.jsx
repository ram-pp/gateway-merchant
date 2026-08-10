import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/merchant/auth/me');
      setSession(data);
    } catch {
      setSession(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const data = await api.post('/api/merchant/auth/login', { email, password });
    setToken(data.token);
    await refresh();
    return data;
  };

  const logout = () => {
    setToken(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, refresh }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
