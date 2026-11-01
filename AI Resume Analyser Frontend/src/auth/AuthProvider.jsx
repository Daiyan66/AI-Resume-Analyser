import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ats_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('ats_token');
      const storedUser = localStorage.getItem('ats_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);

          // Verify session with /auth/me
          const res = await api.get('/auth/me');
          if (res.data) {
            let resolvedRole = parsedUser.role || 'ROLE_CANDIDATE';
            if (res.data.roles && res.data.roles.length > 0) {
              const rolesList = Array.from(res.data.roles);
              if (rolesList.includes('ROLE_ADMIN')) {
                resolvedRole = 'ROLE_ADMIN';
              } else if (rolesList.includes('ROLE_RECRUITER')) {
                resolvedRole = 'ROLE_RECRUITER';
              } else if (rolesList.includes('ROLE_CANDIDATE')) {
                resolvedRole = 'ROLE_CANDIDATE';
              }
            }

            const updatedUser = {
              username: res.data.username,
              firstName: res.data.firstName,
              lastName: res.data.lastName,
              email: res.data.email,
              role: resolvedRole
            };
            setUser(updatedUser);
            localStorage.setItem('ats_user', JSON.stringify(updatedUser));
          }
        } catch (err) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('ats_token');
          localStorage.removeItem('ats_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token: receivedToken, role, firstName, lastName, email } = response.data;

    const userData = {
      username: response.data.username,
      role: role || 'ROLE_CANDIDATE',
      firstName,
      lastName,
      email
    };

    localStorage.setItem('ats_token', receivedToken);
    localStorage.setItem('ats_user', JSON.stringify(userData));
    setToken(receivedToken);
    setUser(userData);
    return userData;
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    const { token: receivedToken, role, firstName, lastName, email } = response.data;

    const userData = {
      username: response.data.username,
      role: role || 'ROLE_CANDIDATE',
      firstName,
      lastName,
      email
    };

    localStorage.setItem('ats_token', receivedToken);
    localStorage.setItem('ats_user', JSON.stringify(userData));
    setToken(receivedToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('ats_token');
    localStorage.removeItem('ats_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
