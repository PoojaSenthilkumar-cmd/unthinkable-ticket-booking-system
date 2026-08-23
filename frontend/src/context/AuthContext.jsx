import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const saveSession = (authToken, authUser) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  const login = async (formData) => {
    const response = await api.post('/auth/login', formData);
    const authToken = response.data.token;
    const authUser = response.data.user;

    if (authToken && authUser) {
      saveSession(authToken, authUser);
    }

    return response.data;
  };

  const register = async (formData) => {
    const response = await api.post('/auth/register', formData);
    const authToken = response.data.token;
    const authUser = response.data.user;

    if (authToken && authUser) {
      saveSession(authToken, authUser);
    }

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
