import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import TaskManagement from './components/TaskManagement';
import './App.css';

const AppContent = () => {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return null; // Loading handled by ProtectedRoute
  }

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={login} 
      />
    );
  }

  return (
    <ProtectedRoute>
      <TaskManagement />
    </ProtectedRoute>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App;
