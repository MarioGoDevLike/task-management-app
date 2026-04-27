import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FullPageLoader } from './AppLoader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader message="Authenticating session" />;
  }

  if (!isAuthenticated) {
    return null; // Will be handled by App.js to show auth pages
  }

  return children;
};

export default ProtectedRoute;
