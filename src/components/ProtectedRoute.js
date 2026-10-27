import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppBootSkeleton } from './AppLoader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppBootSkeleton />;
  }

  if (!isAuthenticated) {
    return null; // Will be handled by App.js to show auth pages
  }

  return children;
};

export default ProtectedRoute;
