import { createContext, useState, useEffect } from 'react';
import { login as loginAPI, getMe } from '../api/auth';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('meridian_token');
    if (savedToken) {
      setToken(savedToken);
      validateToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (authToken) => {
    try {
      const userData = await getMe();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await loginAPI(email, password);
    const authToken = response.access_token;
    setToken(authToken);
    localStorage.setItem('meridian_token', authToken);

    const userData = await getMe();
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('meridian_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
