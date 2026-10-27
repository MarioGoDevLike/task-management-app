import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TasksProvider } from './contexts/TasksContext';
import { ThemeProvider } from './contexts/ThemeContext';
import GlobalStyles from './design-system/GlobalStyles';
import LoginPage from './components/LoginPage';
import ForceChangePasswordPage from './components/ForceChangePasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import { AppBootSkeleton } from './components/AppLoader';

// Pages are split into their own chunks; DashboardLayout provides the Suspense boundary.
const MyWorkPage = lazy(() => import('./components/MyWorkPage'));
const TaskManagement = lazy(() => import('./components/TaskManagement'));
const ProjectsPage = lazy(() => import('./components/ProjectsPage'));
const CalendarPage = lazy(() => import('./components/CalendarPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const AppContent = () => {
  const { isAuthenticated, isLoading, login, user } = useAuth();

  if (isLoading) {
    return <AppBootSkeleton />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  if (user?.mustChangePassword) {
    return (
      <ForceChangePasswordPage
        onComplete={(updatedUser) => {
          login(updatedUser);
        }}
      />
    );
  }

  return (
    <ProtectedRoute>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<MyWorkPage />} />
          <Route path="/tasks" element={<TaskManagement />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <ThemeProvider>
      <GlobalStyles />
      <AuthProvider>
        <TasksProvider>
          <Router>
            <AppContent />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--wp-surface)',
                  color: 'var(--wp-text)',
                  borderRadius: '6px',
                  boxShadow: 'var(--wp-shadow-lg)',
                  border: '1px solid var(--wp-border)',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '8px 12px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: 'var(--wp-success)',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: 'var(--wp-error)',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </Router>
        </TasksProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
