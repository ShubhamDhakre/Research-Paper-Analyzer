import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rpa_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('rpa_token') || null;
  });

  const [authError, setAuthError] = useState(null);

  // Verify token on mount if present
  useEffect(() => {
    if (token) {
      authAPI.getMe()
        .then((res) => {
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('rpa_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          // If token verification fails, session remains or can be refreshed
        });
    }
  }, [token]);

  const login = async (email, password) => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    try {
      const response = await authAPI.login({ email, password });
      if (response?.token && response?.user) {
        setUser(response.user);
        setToken(response.token);
        localStorage.setItem('rpa_user', JSON.stringify(response.user));
        localStorage.setItem('rpa_token', response.token);
        return response.user;
      }
    } catch (err) {
      // Fallback to local offline preview if backend database is offline
      if (err.status === 503 || err.message.includes('offline')) {
        console.warn('[Auth] Backend offline, initializing local academic preview session.');
        const mockUser = {
          id: 'usr_offline_demo',
          name: email.split('@')[0].replace('.', ' ').replace(/^./, (str) => str.toUpperCase()),
          email: email,
          role: 'Researcher',
          institution: 'Computer Science Department'
        };
        const mockToken = 'mock_jwt_' + Date.now();
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('rpa_user', JSON.stringify(mockUser));
        localStorage.setItem('rpa_token', mockToken);
        return mockUser;
      }
      throw err;
    }
  };

  const register = async (name, email, password, institution) => {
    if (!name || !email || !password) {
      throw new Error('Please fill in all required registration fields.');
    }

    try {
      const response = await authAPI.register({
        name,
        email,
        password,
        institution
      });

      if (response?.token && response?.user) {
        setUser(response.user);
        setToken(response.token);
        localStorage.setItem('rpa_user', JSON.stringify(response.user));
        localStorage.setItem('rpa_token', response.token);
        return response.user;
      }
    } catch (err) {
      if (err.status === 503 || err.message.includes('offline')) {
        console.warn('[Auth] Backend offline, initializing local registration preview.');
        const newUser = {
          id: 'usr_reg_' + Date.now(),
          name,
          email,
          role: 'Researcher',
          institution: institution || 'Academic Department'
        };
        const mockToken = 'mock_jwt_reg_' + Date.now();
        setUser(newUser);
        setToken(mockToken);
        localStorage.setItem('rpa_user', JSON.stringify(newUser));
        localStorage.setItem('rpa_token', mockToken);
        return newUser;
      }
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rpa_user');
    localStorage.removeItem('rpa_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        authError,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
