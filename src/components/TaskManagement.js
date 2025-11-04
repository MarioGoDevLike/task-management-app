import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { tasksAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Container = styled.div`
  min-height: 100vh;
  background: white;
  padding: 24px 16px;
`;

const ContentWrapper = styled.div`
  max-width: 100%;
  margin: 0;
`;

const Header = styled.header`
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 20px 32px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e8ecf0;
`;

const WelcomeSection = styled.div`
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 4px 0;
    letter-spacing: -0.3px;
  }
  
  p {
    color: #64748b;
    font-size: 13px;
    margin: 0;
    font-weight: 400;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserInfo = styled.div`
  text-align: right;
  
  .name {
    font-weight: 600;
    color: #0f172a;
    font-size: 14px;
    margin: 0 0 2px 0;
  }
  
  .email {
    color: #94a3b8;
    font-size: 12px;
    margin: 0;
  }
`;

const LogoutButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e8ecf0;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.highlight || '#64748b'};
  }
  
  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
  
  .label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  .value {
    font-size: 36px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    line-height: 1;
    letter-spacing: -1px;
  }
  
  .trend {
    font-size: 12px;
    color: #64748b;
    margin-top: 8px;
    font-weight: 500;
  }
`;

const MainContent = styled.div`
  background: white;
`;

const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 0;
  height: calc(100vh - 350px);
  overflow-x: auto;
  overflow-y: hidden;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const KanbanColumn = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border: 1px solid #e8ecf0;
`;

const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid ${props => props.color};
`;

const ColumnTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.color};
  }
`;

const ColumnCount = styled.span`
  background: ${props => props.color}20;
  color: ${props => props.color};
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

const ColumnTasks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    
    &:hover {
      background: #94a3b8;
    }
  }
`;

const KanbanTask = styled.div`
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e8ecf0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${props => {
      if (props.priority === 'urgent') return '#ef4444';
      if (props.priority === 'high') return '#f59e0b';
      if (props.priority === 'medium') return '#3b82f6';
      return '#94a3b8';
    }};
    border-radius: 3px 0 0 3px;
  }
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const KanbanTaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
`;

const KanbanTaskTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  flex: 1;
`;

const KanbanTaskPriority = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    if (props.priority === 'urgent') return '#ef4444';
    if (props.priority === 'high') return '#f59e0b';
    if (props.priority === 'medium') return '#3b82f6';
    return '#94a3b8';
  }};
  flex-shrink: 0;
  margin-left: 8px;
`;

const KanbanTaskFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
`;

const KanbanTaskActions = styled.div`
  display: flex;
  gap: 4px;
`;

const KanbanIconButton = styled.button`
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #64748b;
  font-size: 12px;
  
  &:hover {
    background: ${props => props.danger ? '#fee2e2' : props.edit ? '#eff6ff' : '#f1f5f9'};
    color: ${props => props.danger ? '#ef4444' : props.edit ? '#3b82f6' : '#64748b'};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PageTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`;

const AddTaskButton = styled.button`
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &::before {
    content: '+';
    font-size: 20px;
    font-weight: 300;
  }
`;

const Filters = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 2px solid #f1f5f9;
`;

const FilterButton = styled.button`
  padding: 10px 16px;
  border: 2px solid ${props => props.active ? '#3b82f6' : '#e2e8f0'};
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#64748b'};

  &:hover {
    border-color: #3b82f6;
    background: ${props => props.active ? '#2563eb' : '#f8fafc'};
    color: ${props => props.active ? 'white' : '#3b82f6'};
  }
`;

const SearchInput = styled.input`
  padding: 10px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  width: 240px;
  background: #fafbfc;
  color: #0f172a;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    background: white;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TaskItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  background: ${props => props.completed ? '#f0fdf4' : 'white'};
  padding: 20px 24px;
  border-radius: 12px;
  border: 2px solid ${props => props.completed ? '#d1fae5' : '#e8ecf0'};
  border-left: 5px solid ${props => {
    if (props.completed) return '#10b981';
    if (props.priority === 'urgent') return '#ef4444';
    if (props.priority === 'high') return '#f59e0b';
    if (props.priority === 'medium') return '#3b82f6';
    return '#94a3b8';
  }};
  transition: all 0.2s ease;
  gap: 20px;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: ${props => props.completed ? '#d1fae5' : '#cbd5e1'};
    transform: translateY(-2px);
  }

  ${props => props.completed && `
    background: #f0fdf4;
  `}
`;

const TaskContent = styled.div`
  display: flex;
  align-items: start;
  gap: 16px;
  flex: 1;
  min-width: 0;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #10b981;
  margin-top: 2px;
`;

const TaskText = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskTitle = styled.div`
  font-size: 17px;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 8px;
  line-height: 1.4;
  word-break: break-word;
  text-decoration: ${props => props.completed ? 'line-through' : 'none'};
  opacity: ${props => props.completed ? 0.5 : 1};
  letter-spacing: -0.2px;
`;

const TaskDescription = styled.div`
  font-size: 14px;
  color: #475569;
  margin-bottom: 12px;
  line-height: 1.6;
  word-break: break-word;
  padding-left: 12px;
  border-left: 3px solid #e2e8f0;
  
  * {
    max-width: 100%;
    color: inherit;
  }
  
  p {
    margin: 4px 0;
  }
  
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 8px 0;
  }
  
  ul, ol {
    padding-left: 20px;
    margin: 4px 0;
  }
`;

const TaskMeta = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #e8ecf0;
`;

const TaskBadge = styled.span`
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
  background: ${props => {
    if (props.type === 'priority') {
      if (props.value === 'urgent') return '#fee2e2';
      if (props.value === 'high') return '#fef3c7';
      if (props.value === 'medium') return '#dbeafe';
      return '#f1f5f9';
    }
    if (props.type === 'status') {
      if (props.value === 'completed') return '#d1fae5';
      if (props.value === 'in-progress') return '#bfdbfe';
      if (props.value === 'pending') return '#f3f4f6';
    }
    return '#f1f5f9';
  }};
  color: ${props => {
    if (props.type === 'priority') {
      if (props.value === 'urgent') return '#991b1b';
      if (props.value === 'high') return '#92400e';
      if (props.value === 'medium') return '#1e40af';
      return '#475569';
    }
    if (props.type === 'status') {
      if (props.value === 'completed') return '#065f46';
      if (props.value === 'in-progress') return '#1e40af';
      if (props.value === 'pending') return '#4b5563';
    }
    return '#475569';
  }};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const TaskActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const IconButton = styled.button`
  background: none;
  border: 1.5px solid #e2e8f0;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;

  &:hover {
    border-color: ${props => props.danger ? '#ef4444' : props.edit ? '#3b82f6' : '#94a3b8'};
    color: ${props => props.danger ? '#ef4444' : props.edit ? '#3b82f6' : '#64748b'};
    background: ${props => props.danger ? '#fee2e2' : props.edit ? '#eff6ff' : '#fafbfc'};
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 24px;
  padding: 40px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  
  h2 {
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.5px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
`;

const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  label {
    font-weight: 600;
    color: #334155;
    font-size: 15px;
  }
  
  input {
    padding: 16px 20px;
    border: 2px solid #e2e8f0;
    border-radius: 14px;
    font-size: 15px;
    transition: all 0.2s ease;
    background: #fafbfc;
    color: #0f172a;
    font-family: inherit;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
    
    &::placeholder {
      color: #94a3b8;
    }
  }
`;

const RichTextContainer = styled.div`
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s ease;
  background: white;
  position: relative;
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  
  .ql-toolbar {
    border: none;
    border-bottom: 2px solid #e2e8f0;
    background: #fafbfc;
    padding: 12px 16px;
  }
  
  .ql-container {
    border: none;
    font-size: 14px;
  }
  
  .ql-editor {
    min-height: 150px;
    padding: 16px;
    
    &.ql-blank::before {
      color: #94a3b8;
      font-style: normal;
    }
  }
`;

const ImageUploadOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 14px;
`;

const LoaderSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoaderText = styled.div`
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LoadingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const TaskPreviewContent = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 12px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const PrioritySection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fafbfc;
  border-radius: 14px;
  border: 2px solid #e8ecf0;
`;

const PriorityLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
`;

const PriorityButtons = styled.div`
  display: flex;
  gap: 12px;
  flex: 1;
`;

const PriorityButton = styled.button`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${props => props.active ? props.borderColor : '#e2e8f0'};
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.active ? props.bgColor : 'white'};
  color: ${props => props.active ? props.textColor : '#64748b'};
  position: relative;

  &:hover {
    border-color: ${props => props.borderColor};
    background: ${props => props.active ? props.bgColor : props.bgColor};
    opacity: ${props => props.active ? 1 : 0.7};
  }
  
  ${props => props.active && `
    box-shadow: 0 2px 8px ${props.bgColor}40;
  `}
`;

const StatusSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fafbfc;
  border-radius: 14px;
  border: 2px solid #e8ecf0;
`;

const StatusLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
`;

const StatusButtons = styled.div`
  display: flex;
  gap: 12px;
  flex: 1;
`;

const StatusButton = styled.button`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: capitalize;
  
  ${props => {
    const colors = {
      pending: { bg: '#f9fafb', border: '#e5e7eb', text: '#4b5563' },
      'in-progress': { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
      completed: { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46' }
    };
    const c = colors[props.value];
    
    return props.active ? `
      background: ${c.bg};
      color: ${c.text};
      border-color: ${c.border};
      box-shadow: 0 2px 8px ${c.bg}40;
    ` : `
      background: white;
      color: #94a3b8;
      
      &:hover {
        background: ${c.bg};
        color: ${c.text};
        border-color: ${c.border};
      }
    `;
  }}
`;

const ModalActions = styled.div`
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 2px solid #f1f5f9;
`;

const ModalButton = styled.button`
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  &.primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
    }
  }
  
  &.secondary {
    background: #f1f5f9;
    color: #334155;
    
    &:hover {
      background: #e2e8f0;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 24px;
  color: #64748b;
  
  h3 {
    font-size: 18px;
    margin: 0 0 8px 0;
    color: #475569;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #94a3b8;
  }
`;

const TaskManagement = () => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'medium', status: 'pending' });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const addQuillRef = useRef(null);
  const editQuillRef = useRef(null);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background',
    'link', 'image'
  ];

  const addImageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        setIsUploadingImage(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          const quill = addQuillRef.current?.getEditor();
          const range = quill?.getSelection();
          if (range) {
            quill.insertEmbed(range.index, 'image', e.target.result);
            quill.setSelection(range.index + 1);
          }
          setIsUploadingImage(false);
        };
        reader.onerror = () => {
          setIsUploadingImage(false);
          toast.error('Failed to load image');
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

  const editImageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        setIsUploadingImage(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          const quill = editQuillRef.current?.getEditor();
          const range = quill?.getSelection();
          if (range) {
            quill.insertEmbed(range.index, 'image', e.target.result);
            quill.setSelection(range.index + 1);
          }
          setIsUploadingImage(false);
        };
        reader.onerror = () => {
          setIsUploadingImage(false);
          toast.error('Failed to load image');
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

  const addModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: addImageHandler
      }
    }
  }), [addImageHandler]);

  const editModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: editImageHandler
      }
    }
  }), [editImageHandler]);

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

  const getFilteredTasks = () => {
    let filtered = tasks;
    
    if (filter !== 'all') {
      filtered = filtered.filter(task => task.status === filter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const getStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    return { total, completed, pending, inProgress };
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (newTask.trim() === '') return;

    try {
      const response = await tasksAPI.createTask({
        title: newTask.trim(),
        description: newDescription,
        status: 'pending',
        priority: newPriority
      });
      
      setTasks([...tasks, response.data]);
      setNewTask('');
      setNewDescription('');
      setNewPriority('medium');
      setShowAddModal(false);
      toast.success('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error(error.response?.data?.message || 'Failed to add task');
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
      
      toast.success(`Task ${newStatus === 'completed' ? 'completed' : 'reopened'}`);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksAPI.deleteTask(taskId);
      setTasks(tasks.filter(t => t._id !== taskId));
      toast.success('Task deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status
    });
  };

  const closeEditModal = () => {
    setEditingTask(null);
    setEditForm({ title: '', description: '', priority: 'medium', status: 'pending' });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewTask('');
    setNewDescription('');
    setNewPriority('medium');
  };

  const stripImagesFromHTML = (html) => {
    if (!html) return html;
    const div = document.createElement('div');
    div.innerHTML = html;
    const images = div.querySelectorAll('img');
    images.forEach(img => {
      const placeholder = document.createElement('span');
      placeholder.textContent = '📷 Image';
      placeholder.style.color = '#3b82f6';
      placeholder.style.fontSize = '11px';
      placeholder.style.fontStyle = 'italic';
      img.parentNode.replaceChild(placeholder, img);
    });
    return div.innerHTML;
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowImageModal(true);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;

    try {
      const response = await tasksAPI.updateTask(editingTask._id, editForm);
      setTasks(tasks.map(t => 
        t._id === editingTask._id ? response.data : t
      ));
      closeEditModal();
      toast.success('Task updated successfully!');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const stats = getStats();
  const filteredTasks = getFilteredTasks();
  const priorityColors = {
    urgent: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
    high: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    medium: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    low: { bg: '#f9fafb', border: '#e5e7eb', text: '#4b5563' }
  };

  return (
    <Container>
      <ContentWrapper>
        <Header>
          <WelcomeSection>
            <h1>Task Management</h1>
            <p>Stay organized, get things done</p>
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

        <StatsGrid>
          <StatCard onClick={() => setFilter('all')}>
            <div className="label">Total Tasks</div>
            <div className="value">{stats.total}</div>
          </StatCard>
          <StatCard highlight="#10b981" onClick={() => setFilter('completed')}>
            <div className="label">Completed</div>
            <div className="value">{stats.completed}</div>
            <div className="trend">{(tasks.length > 0 ? (stats.completed / tasks.length * 100).toFixed(0) : 0)}% done</div>
          </StatCard>
          <StatCard highlight="#3b82f6" onClick={() => setFilter('in-progress')}>
            <div className="label">In Progress</div>
            <div className="value">{stats.inProgress}</div>
          </StatCard>
          <StatCard highlight="#f59e0b" onClick={() => setFilter('pending')}>
            <div className="label">Pending</div>
            <div className="value">{stats.pending}</div>
          </StatCard>
        </StatsGrid>

        <MainContent>
          <HeaderActions>
            <PageTitle>My Tasks</PageTitle>
            <AddTaskButton onClick={() => setShowAddModal(true)}>
              Add New Task
            </AddTaskButton>
          </HeaderActions>

          <KanbanBoard>
            <KanbanColumn>
              <ColumnHeader color="#f59e0b">
                <ColumnTitle color="#f59e0b">Pending</ColumnTitle>
                <ColumnCount color="#f59e0b">{tasks.filter(t => t.status === 'pending').length}</ColumnCount>
              </ColumnHeader>
              <ColumnTasks>
                {tasks.filter(task => task.status === 'pending' && 
                  (!searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()))).map(task => (
                  <KanbanTask 
                    key={task._id}
                    priority={task.priority}
                    onClick={() => handleTaskClick(task)}
                  >
                    <KanbanTaskHeader>
                      <KanbanTaskTitle>{task.title}</KanbanTaskTitle>
                      <KanbanTaskPriority priority={task.priority} />
                    </KanbanTaskHeader>
                    {task.description && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }} 
                           dangerouslySetInnerHTML={{ __html: stripImagesFromHTML(task.description) }} />
                    )}
                    <KanbanTaskFooter>
                      <TaskBadge type="priority" value={task.priority}>
                        {task.priority}
                      </TaskBadge>
                      <KanbanTaskActions>
                        <KanbanIconButton edit onClick={(e) => { e.stopPropagation(); openEditModal(task); }}>
                          ✏️
                        </KanbanIconButton>
                        <KanbanIconButton danger onClick={(e) => { e.stopPropagation(); deleteTask(task._id); }}>
                          🗑️
                        </KanbanIconButton>
                      </KanbanTaskActions>
                    </KanbanTaskFooter>
                  </KanbanTask>
                ))}
                {tasks.filter(t => t.status === 'pending').length === 0 && (
                  <EmptyState>
                    <p style={{ fontSize: '13px' }}>No pending tasks</p>
                  </EmptyState>
                )}
              </ColumnTasks>
            </KanbanColumn>

            <KanbanColumn>
              <ColumnHeader color="#3b82f6">
                <ColumnTitle color="#3b82f6">In Progress</ColumnTitle>
                <ColumnCount color="#3b82f6">{tasks.filter(t => t.status === 'in-progress').length}</ColumnCount>
              </ColumnHeader>
              <ColumnTasks>
                {tasks.filter(task => task.status === 'in-progress' && 
                  (!searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()))).map(task => (
                  <KanbanTask 
                    key={task._id}
                    priority={task.priority}
                    onClick={() => handleTaskClick(task)}
                  >
                    <KanbanTaskHeader>
                      <KanbanTaskTitle>{task.title}</KanbanTaskTitle>
                      <KanbanTaskPriority priority={task.priority} />
                    </KanbanTaskHeader>
                    {task.description && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }} 
                           dangerouslySetInnerHTML={{ __html: stripImagesFromHTML(task.description) }} />
                    )}
                    <KanbanTaskFooter>
                      <TaskBadge type="priority" value={task.priority}>
                        {task.priority}
                      </TaskBadge>
                      <KanbanTaskActions>
                        <KanbanIconButton edit onClick={(e) => { e.stopPropagation(); openEditModal(task); }}>
                          ✏️
                        </KanbanIconButton>
                        <KanbanIconButton danger onClick={(e) => { e.stopPropagation(); deleteTask(task._id); }}>
                          🗑️
                        </KanbanIconButton>
                      </KanbanTaskActions>
                    </KanbanTaskFooter>
                  </KanbanTask>
                ))}
                {tasks.filter(t => t.status === 'in-progress').length === 0 && (
                  <EmptyState>
                    <p style={{ fontSize: '13px' }}>No in-progress tasks</p>
                  </EmptyState>
                )}
              </ColumnTasks>
            </KanbanColumn>

            <KanbanColumn>
              <ColumnHeader color="#10b981">
                <ColumnTitle color="#10b981">Completed</ColumnTitle>
                <ColumnCount color="#10b981">{tasks.filter(t => t.status === 'completed').length}</ColumnCount>
              </ColumnHeader>
              <ColumnTasks>
                {tasks.filter(task => task.status === 'completed' && 
                  (!searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()))).map(task => (
                  <KanbanTask 
                    key={task._id}
                    priority={task.priority}
                    onClick={() => handleTaskClick(task)}
                  >
                    <KanbanTaskHeader>
                      <KanbanTaskTitle style={{ textDecoration: 'line-through', opacity: 0.7 }}>{task.title}</KanbanTaskTitle>
                      <KanbanTaskPriority priority={task.priority} />
                    </KanbanTaskHeader>
                    {task.description && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', opacity: 0.7 }} 
                           dangerouslySetInnerHTML={{ __html: task.description }} />
                    )}
                    <KanbanTaskFooter>
                      <TaskBadge type="priority" value={task.priority}>
                        {task.priority}
                      </TaskBadge>
                      <KanbanTaskActions>
                        <KanbanIconButton edit onClick={(e) => { e.stopPropagation(); openEditModal(task); }}>
                          ✏️
                        </KanbanIconButton>
                        <KanbanIconButton danger onClick={(e) => { e.stopPropagation(); deleteTask(task._id); }}>
                          🗑️
                        </KanbanIconButton>
                      </KanbanTaskActions>
                    </KanbanTaskFooter>
                  </KanbanTask>
                ))}
                {tasks.filter(t => t.status === 'completed').length === 0 && (
                  <EmptyState>
                    <p style={{ fontSize: '13px' }}>No completed tasks</p>
                  </EmptyState>
                )}
              </ColumnTasks>
            </KanbanColumn>
          </KanbanBoard>
        </MainContent>
      </ContentWrapper>

      {showAddModal && (
        <Modal onClick={closeAddModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Create New Task</h2>
              <CloseButton onClick={closeAddModal}>×</CloseButton>
            </ModalHeader>
            <ModalForm onSubmit={addTask}>
              <FormGroup>
                <label>Task Title</label>
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Enter task title..."
                  required
                  autoFocus
                />
              </FormGroup>
              <FormGroup>
                <label>Description</label>
                <RichTextContainer>
                  <ReactQuill
                    ref={addQuillRef}
                    value={newDescription}
                    onChange={setNewDescription}
                    modules={addModules}
                    formats={formats}
                    placeholder="Add description with formatting, images, links..."
                  />
                  {isUploadingImage && (
                    <ImageUploadOverlay>
                      <LoadingContent>
                        <LoaderSpinner />
                        <LoaderText>
                          <span>📷</span>
                          Uploading image...
                        </LoaderText>
                      </LoadingContent>
                    </ImageUploadOverlay>
                  )}
                </RichTextContainer>
              </FormGroup>
              <PrioritySection>
                <PriorityLabel>Priority:</PriorityLabel>
                <PriorityButtons>
                  <PriorityButton
                    active={newPriority === 'low'}
                    onClick={(e) => { e.preventDefault(); setNewPriority('low'); }}
                    {...priorityColors.low}
                  >
                    Low
                  </PriorityButton>
                  <PriorityButton
                    active={newPriority === 'medium'}
                    onClick={(e) => { e.preventDefault(); setNewPriority('medium'); }}
                    {...priorityColors.medium}
                  >
                    Medium
                  </PriorityButton>
                  <PriorityButton
                    active={newPriority === 'high'}
                    onClick={(e) => { e.preventDefault(); setNewPriority('high'); }}
                    {...priorityColors.high}
                  >
                    High
                  </PriorityButton>
                  <PriorityButton
                    active={newPriority === 'urgent'}
                    onClick={(e) => { e.preventDefault(); setNewPriority('urgent'); }}
                    {...priorityColors.urgent}
                  >
                    Urgent
                  </PriorityButton>
                </PriorityButtons>
              </PrioritySection>
              <ModalActions>
                <ModalButton type="button" className="secondary" onClick={closeAddModal}>
                  Cancel
                </ModalButton>
                <ModalButton type="submit" className="primary">
                  Create Task
                </ModalButton>
              </ModalActions>
            </ModalForm>
          </ModalContent>
        </Modal>
      )}

      {editingTask && (
        <Modal onClick={closeEditModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Edit Task</h2>
              <CloseButton onClick={closeEditModal}>×</CloseButton>
            </ModalHeader>
            <ModalForm onSubmit={saveTask}>
              <FormGroup>
                <label>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <label>Description</label>
                <RichTextContainer>
                  <ReactQuill
                    ref={editQuillRef}
                    value={editForm.description}
                    onChange={(value) => setEditForm({ ...editForm, description: value })}
                    modules={editModules}
                    formats={formats}
                  />
                  {isUploadingImage && (
                    <ImageUploadOverlay>
                      <LoadingContent>
                        <LoaderSpinner />
                        <LoaderText>
                          <span>📷</span>
                          Uploading image...
                        </LoaderText>
                      </LoadingContent>
                    </ImageUploadOverlay>
                  )}
                </RichTextContainer>
              </FormGroup>
              <PrioritySection>
                <PriorityLabel>Priority:</PriorityLabel>
                <PriorityButtons>
                  <PriorityButton
                    type="button"
                    active={editForm.priority === 'low'}
                    onClick={() => setEditForm({ ...editForm, priority: 'low' })}
                    {...priorityColors.low}
                  >
                    Low
                  </PriorityButton>
                  <PriorityButton
                    type="button"
                    active={editForm.priority === 'medium'}
                    onClick={() => setEditForm({ ...editForm, priority: 'medium' })}
                    {...priorityColors.medium}
                  >
                    Medium
                  </PriorityButton>
                  <PriorityButton
                    type="button"
                    active={editForm.priority === 'high'}
                    onClick={() => setEditForm({ ...editForm, priority: 'high' })}
                    {...priorityColors.high}
                  >
                    High
                  </PriorityButton>
                  <PriorityButton
                    type="button"
                    active={editForm.priority === 'urgent'}
                    onClick={() => setEditForm({ ...editForm, priority: 'urgent' })}
                    {...priorityColors.urgent}
                  >
                    Urgent
                  </PriorityButton>
                </PriorityButtons>
              </PrioritySection>
              <StatusSection>
                <StatusLabel>Status:</StatusLabel>
                <StatusButtons>
                  <StatusButton
                    type="button"
                    value="pending"
                    active={editForm.status === 'pending'}
                    onClick={() => setEditForm({ ...editForm, status: 'pending' })}
                  >
                    Pending
                  </StatusButton>
                  <StatusButton
                    type="button"
                    value="in-progress"
                    active={editForm.status === 'in-progress'}
                    onClick={() => setEditForm({ ...editForm, status: 'in-progress' })}
                  >
                    In Progress
                  </StatusButton>
                  <StatusButton
                    type="button"
                    value="completed"
                    active={editForm.status === 'completed'}
                    onClick={() => setEditForm({ ...editForm, status: 'completed' })}
                  >
                    Completed
                  </StatusButton>
                </StatusButtons>
              </StatusSection>
              <ModalActions>
                <ModalButton type="button" className="secondary" onClick={closeEditModal}>
                  Cancel
                </ModalButton>
                <ModalButton type="submit" className="primary">
                  Save Changes
                </ModalButton>
              </ModalActions>
            </ModalForm>
          </ModalContent>
        </Modal>
      )}

      {showImageModal && selectedTask && (
        <Modal onClick={() => setShowImageModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <ModalHeader>
              <h2>{selectedTask.title}</h2>
              <CloseButton onClick={() => setShowImageModal(false)}>×</CloseButton>
            </ModalHeader>
            <div style={{ 
              padding: '0',
              maxHeight: '70vh',
              overflowY: 'auto'
            }}>
              {selectedTask.description && (
                <TaskPreviewContent 
                  dangerouslySetInnerHTML={{ __html: selectedTask.description }}
                />
              )}
              <div style={{ 
                marginTop: '24px', 
                paddingTop: '24px', 
                borderTop: '2px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <TaskBadge type="priority" value={selectedTask.priority}>
                    {selectedTask.priority}
                  </TaskBadge>
                  <TaskBadge type="status" value={selectedTask.status}>
                    {selectedTask.status}
                  </TaskBadge>
                </div>
                <ModalActions style={{ margin: 0, padding: 0, border: 'none' }}>
                  <ModalButton 
                    className="secondary" 
                    onClick={() => {
                      setShowImageModal(false);
                      openEditModal(selectedTask);
                    }}
                  >
                    Edit
                  </ModalButton>
                </ModalActions>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default TaskManagement;
