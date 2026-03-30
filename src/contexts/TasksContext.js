import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { tasksAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { getSocketOrigin } from '../config/api';

const TasksContext = createContext();

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};

export const TasksProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem('token');
    const socketUrl = getSocketOrigin();

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for task events
    newSocket.on('task:created', (task) => {
      console.log('📥 Task created:', task._id);
      setTasks(prevTasks => {
        // Check if task already exists (avoid duplicates)
        if (prevTasks.some(t => t._id === task._id)) {
          return prevTasks.map(t => t._id === task._id ? task : t);
        }
        return [...prevTasks, task];
      });
    });

    newSocket.on('task:updated', (task) => {
      console.log('📥 Task updated:', task._id);
      setTasks(prevTasks => 
        prevTasks.map(t => t._id === task._id ? task : t)
      );
    });

    newSocket.on('task:deleted', ({ taskId }) => {
      console.log('📥 Task deleted:', taskId);
      setTasks(prevTasks => prevTasks.filter(t => t._id !== taskId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  // Fetch tasks only once on mount or when user changes
  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated || hasFetched) return;
    
    try {
      setIsLoading(true);
      const response = await tasksAPI.getTasks();
      setTasks(response.data.tasks || []);
      setHasFetched(true);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, hasFetched]);

  useEffect(() => {
    if (isAuthenticated && !hasFetched) {
      fetchTasks();
    }
  }, [isAuthenticated, hasFetched, fetchTasks]);

  // Reset when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setTasks([]);
      setHasFetched(false);
    }
  }, [isAuthenticated]);

  // Manual refresh function (for when needed)
  const refreshTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await tasksAPI.getTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
      toast.error('Failed to refresh tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    tasks,
    setTasks,
    isLoading,
    refreshTasks,
    socket
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};

