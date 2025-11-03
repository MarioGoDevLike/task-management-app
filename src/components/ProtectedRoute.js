import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoadingCard = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: #718096;
  font-size: 16px;
  margin: 0;
`;

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingCard>
          <LoadingSpinner />
          <LoadingText>Loading...</LoadingText>
        </LoadingCard>
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be handled by App.js to show auth pages
  }

  return children;
};

export default ProtectedRoute;
