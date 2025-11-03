import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { tasksAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const Header = styled.header`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 30px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const WelcomeSection = styled.div`
  h1 {
    font-size: 32px;
    font-weight: 700;
    color: #2d3748;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #718096;
    font-size: 16px;
    margin: 0;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const UserInfo = styled.div`
  text-align: right;
  
  .name {
    font-weight: 600;
    color: #2d3748;
    font-size: 16px;
    margin: 0;
  }
  
  .email {
    color: #718096;
    font-size: 14px;
    margin: 0;
  }
`;

const LogoutButton = styled.button`
  background: linear-gradient(135deg, #e53e3e, #c53030);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(229, 62, 62, 0.3);
  }
`;

const MainContent = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 30px;
`;

const TaskInput = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  
  input {
    flex: 1;
    padding: 15px 20px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: #f7fafc;

    &:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    &::placeholder {
      color: #a0aec0;
    }
  }
  
  button {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 15px 25px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }
  }
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const TaskItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f7fafc;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid ${props => props.completed ? '#4ade80' : '#e2e8f0'};
  transition: all 0.3s ease;

  &:hover {
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  ${props => props.completed && `
    opacity: 0.7;
    background: #f0fff4;
  `}
`;

const TaskContent = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const TaskText = styled.span`
  font-size: 16px;
  color: #2d3748;
  cursor: pointer;
  flex: 1;
  
  ${props => props.completed && `
    text-decoration: line-through;
    color: #718096;
  `}
`;

const DeleteButton = styled.button`
  background: #e53e3e;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #c53030;
    transform: translateY(-1px);
  }
`;

const NoTasks = styled.div`
  text-align: center;
  padding: 40px;
  color: #718096;
  
  h3 {
    font-size: 20px;
    margin: 0 0 8px 0;
  }
  
  p {
    margin: 0;
  }
`;

const TaskManagement = () => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const response = await tasksAPI.getTasks();
      setTasks(response.data.tasks);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async () => {
    if (newTask.trim() === '') return;

    try {
      const response = await tasksAPI.createTask({
        title: newTask.trim(),
        status: 'pending',
        priority: 'medium'
      });
      
      setTasks([...tasks, response.data]);
      setNewTask('');
      toast.success('Task added successfully!');
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const toggleTask = async (taskId) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      
      const response = await tasksAPI.updateTask(taskId, { status: newStatus });
      
      setTasks(tasks.map(t => 
        t._id === taskId ? response.data : t
      ));
      
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await tasksAPI.deleteTask(taskId);
      setTasks(tasks.filter(t => t._id !== taskId));
      toast.success('Task deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  return (
    <Container>
      <Header>
        <WelcomeSection>
          <h1>Task Management</h1>
          <p>Organize your tasks efficiently</p>
        </WelcomeSection>
        
        <UserSection>
          <UserInfo>
            <p className="name">{user?.fullName}</p>
            <p className="email">{user?.email}</p>
          </UserInfo>
          <LogoutButton onClick={logout}>
            Logout
          </LogoutButton>
        </UserSection>
      </Header>

      <MainContent>
        <TaskInput>
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a new task..."
            disabled={isLoading}
          />
          <button onClick={addTask} disabled={isLoading || !newTask.trim()}>
            Add Task
          </button>
        </TaskInput>

        <TaskList>
          {tasks.length === 0 ? (
            <NoTasks>
              <h3>No tasks yet</h3>
              <p>Add your first task above to get started!</p>
            </NoTasks>
          ) : (
            tasks.map(task => (
              <TaskItem key={task._id} completed={task.status === 'completed'}>
                <TaskContent>
                  <Checkbox
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => toggleTask(task._id)}
                  />
                  <TaskText 
                    completed={task.status === 'completed'}
                    onClick={() => toggleTask(task._id)}
                  >
                    {task.title}
                  </TaskText>
                </TaskContent>
                <DeleteButton onClick={() => deleteTask(task._id)}>
                  Delete
                </DeleteButton>
              </TaskItem>
            ))
          )}
        </TaskList>
      </MainContent>
    </Container>
  );
};

export default TaskManagement;
