import { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import authService from '../services/authService';

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = () => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('auth_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      api.defaults.headers.Authorization = `Bearer ${storedToken}`;
    }

    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);

      const { user, token } = response;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_token', token);
      localStorage.setItem('tenant_id', user.tenant_id);

      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao fazer login',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tenant_id');
      setUser(null);
    }
  };

  const register = async (data) => {
    try {
      const response = await authService.register(data);

      const { user, token } = response;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_token', token);
      localStorage.setItem('tenant_id', user.tenant_id);

      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao registrar',
      };
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        isAuthenticated,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
