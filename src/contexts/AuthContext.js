import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        // Verify token with backend
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    try {
      setUser(userData);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${userData.firstName}!`);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setUser(userData);
      setIsAuthenticated(true);
      toast.success(`Welcome, ${userData.firstName}!`);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
