import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { tasksAPI, adminAPI, projectsAPI, DEFAULT_KANBAN_COLUMNS, normalizeKanbanColumns } from '../services/api';
import { toast } from 'react-hot-toast';
import { getDb } from '../firebase/app';
import { SectionLoader } from './AppLoader';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  CheckCircle2, 
  Edit, 
  Trash2, 
  PlayCircle, 
  RotateCcw,
  AlertTriangle,
  X,
  UserPlus,
  Users,
  Search,
  Columns3,
  List,
  FolderKanban,
  FolderPlus,
  ChevronDown,
  Check,
  Plus,
} from 'lucide-react';

/** Plain-text description from the create-task form → safe HTML for Firestore. */
function plainTextToSafeDescriptionHtml(text) {
  if (!text || !String(text).trim()) return '';
  const lines = String(text).split(/\n/);
  const escaped = lines.map((line) =>
    line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  );
  return `<p>${escaped.join('<br>')}</p>`;
}

function isYmdDateString(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function toDateInputValue(value) {
  if (!value) return '';
  if (isYmdDateString(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDueDayBounds(dueDate) {
  if (!dueDate) return null;
  if (isYmdDateString(dueDate)) {
    const start = new Date(`${dueDate}T00:00:00`);
    const end = new Date(`${dueDate}T23:59:59`);
    return { start, end };
  }
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return { start, end };
}

function getDueVariant(dueDate) {
  const bounds = getDueDayBounds(dueDate);
  if (!bounds) return null;
  const now = new Date();
  if (bounds.end.getTime() < now.getTime()) return 'overdue';
  if (bounds.start.getTime() <= now.getTime() && bounds.end.getTime() >= now.getTime()) return 'today';
  return 'upcoming';
}

function formatDueLabel(dueDate) {
  const bounds = getDueDayBounds(dueDate);
  if (!bounds) return '';
  const due = bounds.start;
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const Container = styled.div`
  min-height: 100vh;
  background: white;
  padding: 24px 16px;

  @media (max-width: 768px) {
    padding: 12px 10px;
  }
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 18px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
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

  @media (max-width: 768px) {
    padding: 14px 12px;
    border-radius: 12px;

    .label {
      font-size: 10px;
      margin-bottom: 8px;
    }

    .value {
      font-size: 24px;
      letter-spacing: -0.4px;
    }

    .trend {
      font-size: 10px;
      margin-top: 6px;
    }
  }
`;

const MainContent = styled.div`
  background: white;
  border: 1px solid #e8ecf0;
  border-radius: 14px;
  padding: 14px;

  @media (max-width: 768px) {
    border-radius: 10px;
    padding: 10px;
  }
`;

const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  padding: 0;
  height: calc(100vh - 320px);
  overflow-x: auto;
  overflow-y: hidden;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    height: auto;
  }

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const KanbanColumn = styled.div`
  background: #f8fafc;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border: 1px solid #e2e8f0;

  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${props => props.color}66;
`;

const ColumnTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.color};
  }
`;

const ColumnCount = styled.span`
  background: ${props => props.color}20;
  color: ${props => props.color};
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
`;

const ColumnTasks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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

const ListViewShell = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow-x: auto;
  overflow-y: auto;
  background: #fff;
  max-height: calc(100vh - 320px);
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    max-height: none;
  }
`;

const ListHeaderRow = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 2fr) 120px 140px 180px 180px;
  min-width: 900px;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const ListRow = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 2fr) 120px 140px 180px 180px;
  min-width: 900px;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;

  &:hover {
    background: #f8fafc;
  }
`;

const ListTaskTitle = styled.button`
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  width: fit-content;
`;

const ListTaskSub = styled.div`
  color: #64748b;
  font-size: 11px;
  margin-top: 2px;
`;

const StatusChip = styled.span`
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  color: #0f172a;
`;

const KanbanTask = styled.div`
  background: white;
  padding: 8px 9px;
  border-radius: 9px;
  border: 1px solid #e8ecf0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${props => {
      if (props.priority === 'urgent') return '#ef4444';
      if (props.priority === 'high') return '#f59e0b';
      if (props.priority === 'medium') return '#3b82f6';
      return '#94a3b8';
    }};
    border-radius: 12px 0 0 12px;
  }
  
  &:hover {
    box-shadow: 0 3px 9px rgba(15, 23, 42, 0.09);
    transform: translateY(-1px);
    border-color: #cbd5e1;
  }
`;

const KanbanTaskHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const KanbanTaskTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.5;
  flex: 1;
  word-break: break-word;
  ${props => props.completed && `
    text-decoration: line-through;
    opacity: 0.6;
  `}
`;

const KanbanTaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const KanbanTaskPriorityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: ${props => {
    if (props.priority === 'urgent') return '#fee2e2';
    if (props.priority === 'high') return '#fef3c7';
    if (props.priority === 'medium') return '#dbeafe';
    return '#f1f5f9';
  }};
  color: ${props => {
    if (props.priority === 'urgent') return '#991b1b';
    if (props.priority === 'high') return '#92400e';
    if (props.priority === 'medium') return '#1e40af';
    return '#475569';
  }};
`;

const DueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  white-space: nowrap;
  background: ${(p) => {
    if (p.$variant === 'overdue') return '#fee2e2';
    if (p.$variant === 'today') return '#dbeafe';
    return '#fef3c7';
  }};
  color: ${(p) => {
    if (p.$variant === 'overdue') return '#991b1b';
    if (p.$variant === 'today') return '#1d4ed8';
    return '#92400e';
  }};
  border: ${(p) => {
    if (p.$variant === 'overdue') return '1px solid #fecaca';
    if (p.$variant === 'today') return '1px solid #bfdbfe';
    return '1px solid #fde68a';
  }};
`;

const KanbanTaskAssignee = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #64748b;
  flex-wrap: wrap;
  
  .avatar {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 8px;
    flex-shrink: 0;
    border: 1.5px solid white;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
  }
  
  .assignee-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .more-count {
    font-weight: 600;
    color: #475569;
  }
`;

const KanbanTaskDescription = styled.div`
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
  
  * {
    font-size: 11px !important;
    color: #64748b !important;
  }
`;

const KanbanTaskFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
  padding-top: 7px;
  border-top: 1px solid #f1f5f9;
  gap: 8px;
`;

const KanbanTaskActions = styled.div`
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  margin-left: auto;
  align-items: center;
`;

const MoveStatusSelect = styled.select`
  font-size: 10px;
  font-weight: 600;
  padding: 4px 24px 4px 8px;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  color: #475569;
  max-width: 118px;
  cursor: pointer;
  appearance: none;
  transition: all 0.18s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%2364748b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 7px center;

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 2px 6px rgba(30, 64, 175, 0.1);
  }

  &:focus {
    outline: none;
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
  }
`;

const KanbanIconButton = styled.button`
  background: transparent;
  border: none;
  padding: 5px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: ${props => {
    if (props.completed) return '#10b981';
    if (props.danger) return '#ef4444';
    if (props.edit) return '#3b82f6';
    if (props.assign) return '#7c3aed';
    return '#64748b';
  }};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  &:hover {
    background: ${props => {
      if (props.completed) return '#d1fae5';
      if (props.danger) return '#fee2e2';
      if (props.edit) return '#eff6ff';
      if (props.assign) return '#f3e8ff';
      return '#f1f5f9';
    }};
    color: ${props => {
      if (props.completed) return '#059669';
      if (props.danger) return '#dc2626';
      if (props.edit) return '#2563eb';
      if (props.assign) return '#6d28d9';
      return '#475569';
    }};
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  &[title] {
    position: relative;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
`;

const ProjectBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);

  @media (max-width: 768px) {
    padding: 10px;
    gap: 10px;
  }
`;

const ProjectActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 768px) {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
`;

const ProjectSelectorWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
`;

const ProjectLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProjectSelectShell = styled.div`
  position: relative;
  min-width: 260px;

  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
  }
`;

const ProjectSelectTrigger = styled.button`
  width: 100%;
  border: 1px solid ${(props) => (props.$open ? '#60a5fa' : '#bfdbfe')};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  background: #fff;
  cursor: pointer;
  box-shadow: ${(props) =>
    props.$open ? '0 0 0 4px rgba(59, 130, 246, 0.14)' : '0 1px 2px rgba(15, 23, 42, 0.06)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: all 0.18s ease;

  .value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon {
    color: #64748b;
    transform: ${(props) => (props.$open ? 'rotate(180deg)' : 'rotate(0deg)')};
    transition: transform 0.16s ease;
    flex-shrink: 0;
  }

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 2px 6px rgba(30, 64, 175, 0.1);
  }

  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

const ProjectDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 25;
  background: #fff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  padding: 6px;
  max-height: 260px;
  overflow-y: auto;
`;

const ProjectDropdownItem = styled.button`
  width: 100%;
  border: none;
  background: ${(props) => (props.$active ? '#dbeafe' : 'transparent')};
  color: ${(props) => (props.$active ? '#1d4ed8' : '#0f172a')};
  border-radius: 8px;
  padding: 10px 10px;
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 700 : 600)};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  &:hover {
    background: ${(props) => (props.$active ? '#dbeafe' : '#f1f5f9')};
  }
`;

const CreateProjectButton = styled.button`
  border: 1px solid #93c5fd;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  color: #1e3a8a;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);

  &:hover {
    border-color: #60a5fa;
    color: #1d4ed8;
    background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const ViewSwitch = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ViewSwitchButton = styled.button`
  border: none;
  background: ${(props) => (props.active ? '#ffffff' : 'transparent')};
  color: ${(props) => (props.active ? '#1e40af' : '#64748b')};
  font-weight: 600;
  font-size: 12px;
  border-radius: 8px;
  padding: 8px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: ${(props) => (props.active ? '0 1px 4px rgba(15,23,42,0.08)' : 'none')};

  @media (max-width: 768px) {
    flex: 1;
    justify-content: center;
  }
`;

const CalendarShell = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  padding: 12px;
`;

const CalendarToolbarHint = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 10px;
  color: #64748b;
  font-size: 12px;
`;

const PageTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const AddTaskButton = styled.button`
  border: 1px solid #bfdbfe;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  color: #1e40af;
  padding: 9px 12px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);

  &:hover {
    transform: translateY(-1px);
    border-color: #60a5fa;
    color: #1d4ed8;
    background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%);
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ColumnQuickAddWrap = styled.div`
  margin-top: 8px;
`;

const ColumnQuickAddTrigger = styled.button`
  width: 100%;
  border: 1px dashed #cbd5e1;
  background: #fff;
  color: #475569;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    border-color: #93c5fd;
    color: #1d4ed8;
    background: #eff6ff;
  }
`;

const ColumnQuickAddForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border: 1px solid #dbeafe;
  border-radius: 9px;
  padding: 9px;
`;

const ColumnQuickAddInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  padding: 8px 9px;
  font-size: 12px;
  color: #0f172a;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
`;

const ColumnQuickAddActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
`;

const ColumnQuickAddAction = styled.button`
  border: none;
  border-radius: 7px;
  padding: 6px 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: ${(p) => (p.$primary ? '#2563eb' : '#f1f5f9')};
  color: ${(p) => (p.$primary ? '#fff' : '#334155')};

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Filters = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
`;

const FilterButton = styled.button`
  padding: 8px 12px;
  border: 2px solid ${props => props.active ? '#3b82f6' : '#e2e8f0'};
  border-radius: 8px;
  font-size: 12px;
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

  @media (max-width: 768px) {
    padding: 10px;
  }
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
  position: relative;

  @media (max-width: 768px) {
    border-radius: 14px;
    padding: 16px;
    max-height: 92vh;
  }
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

  @media (max-width: 768px) {
    margin-bottom: 16px;

    h2 {
      font-size: 20px;
      letter-spacing: -0.2px;
    }
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

  @media (max-width: 768px) {
    gap: 14px;
  }
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

  textarea {
    padding: 14px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    transition: all 0.2s ease;
    background: #fafbfc;
    color: #0f172a;
    font-family: inherit;
    resize: vertical;
    min-height: 96px;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
  }
`;

const RichTextContainer = styled.div`
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  overflow: visible;
  transition: all 0.2s ease;
  background: white;
  position: relative;
  z-index: 1;
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  
  .ql-toolbar {
    border: none;
    border-bottom: 2px solid #e2e8f0;
    background: #fafbfc;
    padding: 12px 16px;
    border-radius: 12px 12px 0 0;
  }
  
  .ql-container {
    border: none;
    font-size: 14px;
    border-radius: 0 0 12px 12px;
  }
  
  .ql-editor {
    min-height: 150px;
    max-height: min(320px, 40vh);
    overflow-y: auto;
    padding: 16px;
    
    &.ql-blank::before {
      color: #94a3b8;
      font-style: normal;
    }
  }

  .ql-snow .ql-picker.ql-expanded .ql-picker-options {
    z-index: 10050;
  }
`;

const AddDescriptionTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.55;
  min-height: 140px;
  resize: vertical;
  font-family: inherit;
  background: #fafbfc;
  color: #0f172a;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
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

const ModalLoaderOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
`;

const InlineSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 3px solid rgba(255, 255, 255, 0.6);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
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

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }
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

  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
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

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }
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

  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
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

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    box-shadow: none;
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

const DeleteModal = styled.div`
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
  z-index: 2000;
  padding: 20px;
`;

const DeleteModalContent = styled.div`
  background: white;
  border-radius: 20px;
  padding: 32px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideIn 0.2s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const DeleteModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  
  .icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: #fef2f2;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      color: #ef4444;
      width: 28px;
      height: 28px;
    }
  }
  
  h3 {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    flex: 1;
  }
`;

const DeleteModalBody = styled.div`
  margin-bottom: 24px;
  
  p {
    font-size: 15px;
    color: #475569;
    line-height: 1.6;
    margin: 0 0 12px 0;
  }
  
  .task-title {
    background: #f8fafc;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    font-weight: 600;
    color: #0f172a;
    font-size: 14px;
    margin-top: 12px;
  }
`;

const DeleteModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const DeleteModalButton = styled.button`
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &.cancel {
    background: #f1f5f9;
    color: #475569;
    
    &:hover {
      background: #e2e8f0;
      color: #334155;
    }
  }
  
  &.confirm {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const AssignModal = styled.div`
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
  z-index: 2000;
  padding: 20px;
`;

const AssignModalContent = styled.div`
  background: white;
  border-radius: 20px;
  padding: 32px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideIn 0.2s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const AssignModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  
  .icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: #f3e8ff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      color: #7c3aed;
      width: 28px;
      height: 28px;
    }
  }
  
  h3 {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    flex: 1;
  }
`;

const AssignModalBody = styled.div`
  margin-bottom: 24px;
  
  .task-info {
    background: #f8fafc;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    margin-bottom: 20px;
    
    .task-title {
      font-weight: 600;
      color: #0f172a;
      font-size: 15px;
      margin-bottom: 4px;
    }
    
    .current-assignee {
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
    }
  }
  
  .search-wrapper {
    position: relative;
    margin-bottom: 16px;
    
    svg {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      pointer-events: none;
    }
    
    input {
      width: 100%;
      padding: 12px 16px 12px 44px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
      color: #0f172a;
      transition: all 0.2s ease;
      background: white;
      
      &:focus {
        outline: none;
        border-color: #7c3aed;
        box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
      }
      
      &::placeholder {
        color: #94a3b8;
      }
    }
  }
  
  .users-list {
    max-height: 300px;
    overflow-y: auto;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 8px;
    
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
  }
`;

const UserOption = styled.button`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${props => props.selected ? '#7c3aed' : '#e2e8f0'};
  border-radius: 10px;
  background: ${props => props.selected ? '#f3e8ff' : 'white'};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &:hover {
    border-color: ${props => props.selected ? '#7c3aed' : '#a78bfa'};
    background: ${props => props.selected ? '#f3e8ff' : '#faf5ff'};
    transform: translateX(2px);
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
  }
  
  .info {
    flex: 1;
    min-width: 0;
    
    .name {
      font-weight: 600;
      color: #0f172a;
      font-size: 14px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .email {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  
  .check {
    color: #7c3aed;
    flex-shrink: 0;
  }
`;

const AssignModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const AssignModalButton = styled.button`
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &.cancel {
    background: #f1f5f9;
    color: #475569;
    
    &:hover {
      background: #e2e8f0;
      color: #334155;
    }
  }
  
  &.confirm {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: white;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const TaskManagement = () => {
  const { user } = useAuth();
  const ownerId = user?._id || user?.id;
  const { tasks, setTasks, isLoading: tasksLoading } = useTasks();
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('kanban');
  const [kanbanColumns, setKanbanColumns] = useState(() =>
    normalizeKanbanColumns(DEFAULT_KANBAN_COLUMNS)
  );
  const [meetings, setMeetings] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [inlineAddByColumn, setInlineAddByColumn] = useState({});
  const [inlineAddingColumn, setInlineAddingColumn] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    start: '',
    end: '',
    location: '',
    notes: '',
    allDay: false,
  });

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  // Permission checking helper
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    
    // Admin role always has access
    if (user.roles && user.roles.includes('admin')) {
      return true;
    }
    
    // Check if user has the permission
    return user.permissions.includes(permission) || user.permissions.includes('admin.access');
  };

  const canCreate = hasPermission('tasks.create');
  const canUpdate = hasPermission('tasks.update');
  const canDelete = hasPermission('tasks.delete');
  const canAssign = hasPermission('tasks.assign');

  const editQuillRef = useRef(null);
  const projectDropdownRef = useRef(null);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background',
    'link', 'image'
  ];

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

  // Tasks are now loaded and updated in real-time via TasksContext
  // No need to fetch on mount - context handles it

  useEffect(() => {
    const db = getDb();
    const ref = doc(db, 'appConfig', 'kanban');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setKanbanColumns(normalizeKanbanColumns(DEFAULT_KANBAN_COLUMNS));
          return;
        }
        setKanbanColumns(normalizeKanbanColumns(snap.data().columns));
      },
      () => {
        setKanbanColumns(normalizeKanbanColumns(DEFAULT_KANBAN_COLUMNS));
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!ownerId) return undefined;
    const db = getDb();
    const meetingsQuery = query(collection(db, 'meetings'), where('ownerId', '==', ownerId));
    const unsub = onSnapshot(
      meetingsQuery,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.title || '',
            start: data.start,
            end: data.end,
            allDay: !!data.allDay,
            extendedProps: {
              location: data.location || '',
              notes: data.notes || '',
            },
          });
        });
        setMeetings(list);
      },
      () => {
        toast.error('Failed to load meetings');
      }
    );
    return () => unsub();
  }, [ownerId]);

  useEffect(() => {
    if (showAssignModal && canAssign) {
      fetchUsers();
    }
  }, [showAssignModal, canAssign]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectsAPI.listProjects();
      const list = response.data.projects || [];
      setProjects(list);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId('');
      return;
    }
    if (selectedProjectId && projects.some((p) => p.id === selectedProjectId)) return;
    const remembered = window.localStorage.getItem('selectedProjectId');
    const rememberedExists = remembered && projects.some((p) => p.id === remembered);
    setSelectedProjectId(rememberedExists ? remembered : projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    window.localStorage.setItem('selectedProjectId', selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!projectDropdownRef.current) return;
      if (!projectDropdownRef.current.contains(event.target)) {
        setIsProjectDropdownOpen(false);
      }
    };
    const onEscape = (event) => {
      if (event.key === 'Escape') setIsProjectDropdownOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.listUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (isCreatingProject) return;
    const name = projectForm.name.trim();
    if (!name) return;
    try {
      setIsCreatingProject(true);
      const response = await projectsAPI.createProject({
        name,
        description: projectForm.description.trim(),
      });
      const created = response.data.project;
      setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedProjectId(created.id);
      setShowProjectModal(false);
      setProjectForm({ name: '', description: '' });
      toast.success('Project created');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
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

  const columnConfigs = useMemo(() => {
    const base = kanbanColumns.map((c) => ({
      status: c.id,
      title: c.label,
      color: c.color,
      emptyText: `No tasks in ${c.label}`,
      isDone: c.isDone,
    }));
    const ids = new Set(base.map((c) => c.status));
    const orphanStatuses = [...new Set(tasks.map((t) => t.status))].filter((s) => !ids.has(s));
    const orphans = orphanStatuses.map((s) => ({
      status: s,
      title: `Other (${s})`,
      color: '#94a3b8',
      emptyText: 'No tasks',
      isDone: false,
    }));
    return [...base, ...orphans];
  }, [kanbanColumns, tasks]);

  const getStats = (taskList) => {
    const total = taskList.length;
    const byColumn = {};
    columnConfigs.forEach((c) => {
      byColumn[c.status] = taskList.filter((t) => t.status === c.status).length;
    });
    return { total, byColumn };
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (isCreatingTask) return;
    if (newTask.trim() === '') return;
    if (!selectedProjectId) {
      toast.error('Create/select a project first');
      return;
    }

    try {
      setIsCreatingTask(true);
      const response = await tasksAPI.createTask({
        title: newTask.trim(),
        description: plainTextToSafeDescriptionHtml(newDescription),
        priority: newPriority,
        dueDate: newDueDate || null,
        projectId: selectedProjectId,
      });
      
      setTasks([...tasks, response.data]);
      setNewTask('');
      setNewDescription('');
      setNewPriority('medium');
      setNewDueDate('');
      setShowAddModal(false);
      toast.success('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error(error.response?.data?.message || 'Failed to add task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const openInlineAdd = (columnStatus) => {
    setInlineAddByColumn((prev) => ({ ...prev, [columnStatus]: '' }));
  };

  const cancelInlineAdd = (columnStatus) => {
    if (inlineAddingColumn === columnStatus) return;
    setInlineAddByColumn((prev) => {
      const next = { ...prev };
      delete next[columnStatus];
      return next;
    });
  };

  const updateInlineAddValue = (columnStatus, value) => {
    setInlineAddByColumn((prev) => ({ ...prev, [columnStatus]: value }));
  };

  const submitInlineAdd = async (event, columnStatus) => {
    event.preventDefault();
    if (inlineAddingColumn || isCreatingTask) return;
    const title = (inlineAddByColumn[columnStatus] || '').trim();
    if (!title) return;
    if (!selectedProjectId) {
      toast.error('Create/select a project first');
      return;
    }
    try {
      setInlineAddingColumn(columnStatus);
      const response = await tasksAPI.createTask({
        title,
        description: '',
        priority: 'medium',
        status: columnStatus,
        projectId: selectedProjectId,
      });
      setTasks([...tasks, response.data]);
      setInlineAddByColumn((prev) => {
        const next = { ...prev };
        delete next[columnStatus];
        return next;
      });
      toast.success('Task added');
    } catch (error) {
      console.error('Error adding quick task:', error);
      toast.error(error.response?.data?.message || 'Failed to add task');
    } finally {
      setInlineAddingColumn('');
    }
  };

  const toggleTask = async (taskId) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      const doneCol = columnConfigs.find((c) => c.isDone);
      const doneId = doneCol?.status || 'completed';
      const firstNonDone = columnConfigs.find((c) => !c.isDone);
      const reopenId = firstNonDone?.status || columnConfigs[0]?.status || 'pending';
      const newStatus = task.status === doneId ? reopenId : doneId;
      
      const response = await tasksAPI.updateTask(taskId, { status: newStatus });
      
      setTasks(tasks.map(t => 
        t._id === taskId ? response.data : t
      ));
      
      toast.success(
        newStatus === doneId ? 'Task marked complete' : 'Task reopened'
      );
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    let previousTasks = [];

    // Optimistic update: move card immediately between columns
    setTasks(prevTasks => {
      previousTasks = prevTasks;
      return prevTasks.map(t =>
        t._id === taskId ? { ...t, status } : t
      );
    });

    try {
      const response = await tasksAPI.updateTask(taskId, { status });
      const updatedTask = response.data;

      setTasks(prevTasks =>
        prevTasks.map(t => (t._id === taskId ? updatedTask : t))
      );

      setSelectedTask(prev => (prev?._id === taskId ? updatedTask : prev));
      setEditingTask(prev => (prev?._id === taskId ? updatedTask : prev));

      const label = columnConfigs.find((c) => c.status === status)?.title;
      toast.success(label ? `Moved to ${label}` : 'Task status updated');
    } catch (error) {
      // Revert optimistic update on failure
      setTasks(previousTasks);
      toast.error(error.response?.data?.message || 'Failed to update task status');
    }
  };

  const handleStatusChange = (event, task, status) => {
    event.stopPropagation();
    if (task.status === status) return;
    updateTaskStatus(task._id, status);
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    updateTaskStatus(draggableId, destination.droppableId);
  };

  const renderTaskActions = (columnStatus, task) => {
    const doneCol = columnConfigs.find((c) => c.isDone);
    const doneId = doneCol?.status;
    const firstNonDone = columnConfigs.find((c) => !c.isDone);
    const idx = columnConfigs.findIndex((c) => c.status === columnStatus);
    const nextCol = idx >= 0 ? columnConfigs[idx + 1] : null;
    return (
    <KanbanTaskActions>
      {canUpdate && (
        <>
          <MoveStatusSelect
            value=""
            aria-label="Move task"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              const v = e.target.value;
              if (v) updateTaskStatus(task._id, v);
              e.target.value = '';
            }}
          >
            <option value="">Move to…</option>
            {columnConfigs
              .filter((c) => c.status !== task.status)
              .map((c) => (
                <option key={c.status} value={c.status}>
                  {c.title}
                </option>
              ))}
          </MoveStatusSelect>
          {nextCol && (
            <KanbanIconButton
              onClick={(e) => handleStatusChange(e, task, nextCol.status)}
              title={`Move to ${nextCol.title}`}
              aria-label={`Move to ${nextCol.title}`}
            >
              <PlayCircle />
            </KanbanIconButton>
          )}
          {doneId && task.status !== doneId && (
            <KanbanIconButton
              completed
              onClick={(e) => handleStatusChange(e, task, doneId)}
              title="Mark complete"
              aria-label="Mark complete"
            >
              <CheckCircle2 />
            </KanbanIconButton>
          )}
          {doneId && task.status === doneId && firstNonDone && (
            <KanbanIconButton
              onClick={(e) => handleStatusChange(e, task, firstNonDone.status)}
              title="Reopen task"
              aria-label="Reopen task"
            >
              <RotateCcw />
            </KanbanIconButton>
          )}
          <KanbanIconButton 
            edit 
            onClick={(e) => { 
              e.stopPropagation(); 
              openEditModal(task); 
            }}
            title="Edit task"
            aria-label="Edit task"
          >
            <Edit />
          </KanbanIconButton>
        </>
      )}
      {canAssign && (
        <KanbanIconButton 
          assign
          onClick={(e) => { 
            e.stopPropagation(); 
            handleAssignTask(task); 
          }}
          title="Assign task"
          aria-label="Assign task"
        >
          <UserPlus />
        </KanbanIconButton>
      )}
      {canDelete && (
        <KanbanIconButton 
          danger 
          onClick={(e) => { 
            e.stopPropagation(); 
            setTaskToDelete(task);
            setShowDeleteModal(true);
          }}
          title="Delete task"
          aria-label="Delete task"
        >
          <Trash2 />
        </KanbanIconButton>
      )}
    </KanbanTaskActions>
    );
  };

  const deleteTask = async () => {
    if (!taskToDelete || isDeleting) return;
    
    try {
      setIsDeleting(true);
      await tasksAPI.deleteTask(taskToDelete._id);
      setTasks(tasks.filter(t => t._id !== taskToDelete._id));
      setShowDeleteModal(false);
      setTaskToDelete(null);
      toast.success('Task deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setTaskToDelete(null);
  };

  const handleAssignTask = (task) => {
    setTaskToAssign(task);
    // Get current assignees - prefer assignees array, fallback to user
    const currentAssignees = task.assignees && task.assignees.length > 0 
      ? task.assignees.map(a => a._id || a).filter(Boolean)
      : (task.user ? [task.user._id || task.user].filter(Boolean) : []);
    // Pre-select all current assignees
    setSelectedAssignees(currentAssignees);
    setUserSearchQuery('');
    setShowAssignModal(true);
  };

  const cancelAssign = () => {
    if (isAssigning) return;
    setShowAssignModal(false);
    setTaskToAssign(null);
    setSelectedAssignees([]);
    setUserSearchQuery('');
  };

  const toggleAssignee = (userId) => {
    setSelectedAssignees(prev => {
      const userIdStr = userId.toString();
      if (prev.some(id => id.toString() === userIdStr)) {
        // Remove assignee
        return prev.filter(id => id.toString() !== userIdStr);
      } else {
        // Add assignee
        return [...prev, userId];
      }
    });
  };

  const confirmAssign = async () => {
    if (!taskToAssign || isAssigning) return;

    try {
      setIsAssigning(true);
      const response = await tasksAPI.assignTask(taskToAssign._id, selectedAssignees);
      
      // Update the task in the tasks list
      setTasks(tasks.map(t => 
        t._id === taskToAssign._id ? response.data.task : t
      ));
      
      setShowAssignModal(false);
      setTaskToAssign(null);
      setSelectedAssignees([]);
      setUserSearchQuery('');
      toast.success(selectedAssignees.length > 0 
        ? `Task assigned to ${selectedAssignees.length} user(s) successfully!`
        : 'All assignees removed from task');
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast.error(error.response?.data?.message || 'Failed to update task assignees');
    } finally {
      setIsAssigning(false);
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return (user.email || '?')[0].toUpperCase();
  };

  const getUserDisplayName = (user) => {
    if (!user) return 'Unassigned';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'Unknown';
  };

  const getFilteredUsers = () => {
    if (!userSearchQuery) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(u => 
      (u.firstName && u.firstName.toLowerCase().includes(query)) ||
      (u.lastName && u.lastName.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      getUserDisplayName(u).toLowerCase().includes(query)
    );
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: toDateInputValue(task.dueDate),
    });
  };

  const closeEditModal = () => {
    setEditingTask(null);
    setEditForm({ title: '', description: '', priority: 'medium', status: 'pending', dueDate: '' });
  };

  const closeAddModal = () => {
    if (isCreatingTask) return;
    setShowAddModal(false);
    setNewTask('');
    setNewDescription('');
    setNewPriority('medium');
    setNewDueDate('');
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
      const payload = {
        ...editForm,
        dueDate: editForm.dueDate || null,
      };
      const response = await tasksAPI.updateTask(editingTask._id, payload);
      setTasks(tasks.map(t => 
        t._id === editingTask._id ? response.data : t
      ));
      closeEditModal();
      toast.success('Task updated successfully!');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const openMeetingModalForRange = (start, end, allDay = false) => {
    setEditingMeetingId(null);
    setMeetingForm({
      title: '',
      start,
      end,
      location: '',
      notes: '',
      allDay,
    });
    setShowMeetingModal(true);
  };

  const openMeetingModalForEvent = (event) => {
    setEditingMeetingId(event.id);
    setMeetingForm({
      title: event.title || '',
      start: event.start ? new Date(event.start).toISOString().slice(0, 16) : '',
      end: event.end ? new Date(event.end).toISOString().slice(0, 16) : '',
      location: event.extendedProps?.location || '',
      notes: event.extendedProps?.notes || '',
      allDay: !!event.allDay,
    });
    setShowMeetingModal(true);
  };

  const closeMeetingModal = () => {
    setShowMeetingModal(false);
    setEditingMeetingId(null);
    setMeetingForm({
      title: '',
      start: '',
      end: '',
      location: '',
      notes: '',
      allDay: false,
    });
  };

  const saveMeeting = async (e) => {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.start || !meetingForm.end) {
      toast.error('Please provide title, start and end time');
      return;
    }

    if (new Date(meetingForm.end) < new Date(meetingForm.start)) {
      toast.error('Meeting end time must be after start time');
      return;
    }

    const payload = {
      title: meetingForm.title.trim(),
      start: meetingForm.start,
      end: meetingForm.end,
      allDay: !!meetingForm.allDay,
      location: meetingForm.location.trim(),
      notes: meetingForm.notes.trim(),
      ownerId,
      updatedAt: serverTimestamp(),
    };

    try {
      const db = getDb();
      if (editingMeetingId) {
        await updateDoc(doc(db, 'meetings', editingMeetingId), payload);
        toast.success('Meeting updated');
      } else {
        await addDoc(collection(db, 'meetings'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success('Meeting created');
      }
      closeMeetingModal();
    } catch {
      toast.error('Failed to save meeting');
    }
  };

  const deleteMeeting = async () => {
    if (!editingMeetingId) return;
    try {
      const db = getDb();
      await deleteDoc(doc(db, 'meetings', editingMeetingId));
      toast.success('Meeting deleted');
      closeMeetingModal();
    } catch {
      toast.error('Failed to delete meeting');
    }
  };

  const handleCalendarDropResize = async (changeInfo) => {
    const db = getDb();
    try {
      await updateDoc(doc(db, 'meetings', changeInfo.event.id), {
        start: changeInfo.event.start?.toISOString(),
        end: changeInfo.event.end?.toISOString(),
        allDay: changeInfo.event.allDay,
        updatedAt: serverTimestamp(),
      });
    } catch {
      changeInfo.revert();
      toast.error('Failed to update meeting time');
    }
  };

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === selectedProjectId),
    [tasks, selectedProjectId]
  );
  const stats = getStats(projectTasks);
  const priorityColors = {
    urgent: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
    high: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    medium: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    low: { bg: '#f9fafb', border: '#e5e7eb', text: '#4b5563' }
  };
  const visibleTasks = projectTasks.filter(task =>
    !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container>
      <ContentWrapper>
        <MainContent>
          <ProjectBar>
            <ProjectSelectorWrap>
              <ProjectLabel>
                <FolderKanban size={13} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Project
              </ProjectLabel>
              <ProjectSelectShell ref={projectDropdownRef}>
                <ProjectSelectTrigger
                  type="button"
                  $open={isProjectDropdownOpen}
                  onClick={() => {
                    if (projects.length === 0) return;
                    setIsProjectDropdownOpen((prev) => !prev);
                  }}
                  disabled={projects.length === 0}
                >
                  <span className="value">
                    {selectedProject ? selectedProject.name : 'No projects yet'}
                  </span>
                  <ChevronDown className="icon" size={16} />
                </ProjectSelectTrigger>
                {isProjectDropdownOpen && projects.length > 0 && (
                  <ProjectDropdownMenu>
                    {projects.map((project) => (
                      <ProjectDropdownItem
                        key={project.id}
                        type="button"
                        $active={selectedProjectId === project.id}
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setIsProjectDropdownOpen(false);
                        }}
                      >
                        <span>{project.name}</span>
                        {selectedProjectId === project.id ? <Check size={14} /> : null}
                      </ProjectDropdownItem>
                    ))}
                  </ProjectDropdownMenu>
                )}
              </ProjectSelectShell>
            </ProjectSelectorWrap>
            <ProjectActions>
              <CreateProjectButton type="button" onClick={() => setShowProjectModal(true)}>
                <FolderPlus size={14} />
                New Project
              </CreateProjectButton>
              {canCreate && (
                <AddTaskButton
                  onClick={() => {
                    if (!selectedProjectId) {
                      toast.error('Create/select a project first');
                      return;
                    }
                    setShowAddModal(true);
                  }}
                  disabled={!selectedProjectId}
                  title={selectedProjectId ? 'Add task in this project' : 'Create/select a project first'}
                >
                  <Plus size={14} />
                  {selectedProject ? `Add Task` : 'Add Task'}
                </AddTaskButton>
              )}
            </ProjectActions>
          </ProjectBar>
          <HeaderActions>
            <HeaderLeft>
              <PageTitle>My Tasks</PageTitle>
              <ViewSwitch>
                <ViewSwitchButton
                  type="button"
                  active={activeView === 'kanban'}
                  onClick={() => setActiveView('kanban')}
                >
                  <Columns3 size={14} />
                  Board
                </ViewSwitchButton>
                <ViewSwitchButton
                  type="button"
                  active={activeView === 'list'}
                  onClick={() => setActiveView('list')}
                >
                  <List size={14} />
                  List
                </ViewSwitchButton>
              </ViewSwitch>
            </HeaderLeft>
          </HeaderActions>

          {!selectedProjectId && (
            <EmptyState style={{ marginBottom: 12, padding: '24px 16px' }}>
              <h3>Create your first project</h3>
              <p>Projects organize your Kanban boards and tasks. Start by creating one.</p>
            </EmptyState>
          )}

          {tasksLoading ? (
            <SectionLoader message="Loading project tasks" minHeight="360px" />
          ) : selectedProjectId ? (activeView === 'kanban' ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <KanbanBoard>
                {columnConfigs.map((column) => {
                  const columnTasks = projectTasks.filter(task =>
                    task.status === column.status &&
                    (!searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  );
                  const totalInColumn = projectTasks.filter(task => task.status === column.status).length;
                  return (
                    <KanbanColumn key={column.status}>
                      <ColumnHeader color={column.color}>
                        <ColumnTitle color={column.color}>{column.title}</ColumnTitle>
                        <ColumnCount color={column.color}>{totalInColumn}</ColumnCount>
                      </ColumnHeader>
                      <Droppable droppableId={column.status}>
                        {(provided, snapshot) => (
                          <ColumnTasks
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={snapshot.isDraggingOver ? { background: '#eef2ff50' } : undefined}
                          >
                            {columnTasks.map((task, index) => {
                              const isCompletedColumn = column.isDone;
                              const descriptionHtml = task.description
                                ? (isCompletedColumn ? task.description : stripImagesFromHTML(task.description))
                                : null;
                              return (
                                <Draggable key={task._id} draggableId={task._id} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <KanbanTask
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      priority={task.priority}
                                      onClick={() => handleTaskClick(task)}
                                      style={dragProvided.draggableProps.style}
                                      data-dragging={dragSnapshot.isDragging}
                                    >
                                      <KanbanTaskHeader>
                                        <KanbanTaskTitle completed={isCompletedColumn}>{task.title}</KanbanTaskTitle>
                                        <KanbanTaskMeta>
                                          <KanbanTaskPriorityBadge priority={task.priority}>
                                            {task.priority}
                                          </KanbanTaskPriorityBadge>
                                        {task.dueDate ? (
                                          (() => {
                                            const variant = getDueVariant(task.dueDate) || 'upcoming';
                                            const text =
                                              variant === 'overdue'
                                                ? 'Overdue'
                                                : variant === 'today'
                                                  ? 'Due today'
                                                  : `Due ${formatDueLabel(task.dueDate)}`;
                                            return <DueBadge $variant={variant}>{text}</DueBadge>;
                                          })()
                                        ) : null}
                                          {(task.assignees && task.assignees.length > 0) || task.user ? (
                                            <KanbanTaskAssignee>
                                              {(() => {
                                                const assignees = task.assignees && task.assignees.length > 0
                                                  ? task.assignees
                                                  : (task.user ? [task.user] : []);
                                                const visibleAssignees = assignees.slice(0, 2);
                                                const remainingCount = assignees.length - 2;
                                                return (
                                                  <>
                                                    {visibleAssignees.map((assignee, idx) => (
                                                      <div key={idx} className="assignee-item" title={getUserDisplayName(assignee)}>
                                                        <div className="avatar">
                                                          {getUserInitials(assignee)}
                                                        </div>
                                                        {idx === 0 && assignees.length === 1 && (
                                                          <span>{getUserDisplayName(assignee)}</span>
                                                        )}
                                                      </div>
                                                    ))}
                                                    {remainingCount > 0 && (
                                                      <span className="more-count">+{remainingCount}</span>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </KanbanTaskAssignee>
                                          ) : null}
                                        </KanbanTaskMeta>
                                      </KanbanTaskHeader>
                                      {descriptionHtml && (
                                        <KanbanTaskDescription
                                          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                                          style={isCompletedColumn ? { opacity: 0.7 } : {}}
                                        />
                                      )}
                                      <KanbanTaskFooter>
                                        {renderTaskActions(column.status, task)}
                                      </KanbanTaskFooter>
                                    </KanbanTask>
                                  )}
                                </Draggable>
                              );
                            })}
                            {totalInColumn === 0 && (
                              <EmptyState>
                                <p style={{ fontSize: '13px' }}>{column.emptyText}</p>
                              </EmptyState>
                            )}
                            {provided.placeholder}
                          </ColumnTasks>
                        )}
                      </Droppable>
                      {canCreate && (
                        <ColumnQuickAddWrap>
                          {Object.prototype.hasOwnProperty.call(inlineAddByColumn, column.status) ? (
                            <ColumnQuickAddForm onSubmit={(e) => submitInlineAdd(e, column.status)}>
                              <ColumnQuickAddInput
                                type="text"
                                value={inlineAddByColumn[column.status]}
                                onChange={(e) => updateInlineAddValue(column.status, e.target.value)}
                                placeholder={`Add task in ${column.title}...`}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') cancelInlineAdd(column.status);
                                }}
                              />
                              <ColumnQuickAddActions>
                                <ColumnQuickAddAction
                                  type="button"
                                  onClick={() => cancelInlineAdd(column.status)}
                                  disabled={inlineAddingColumn === column.status}
                                >
                                  Cancel
                                </ColumnQuickAddAction>
                                <ColumnQuickAddAction
                                  type="submit"
                                  $primary
                                  disabled={
                                    inlineAddingColumn === column.status ||
                                    !String(inlineAddByColumn[column.status] || '').trim()
                                  }
                                >
                                  {inlineAddingColumn === column.status ? 'Adding...' : 'Add'}
                                </ColumnQuickAddAction>
                              </ColumnQuickAddActions>
                            </ColumnQuickAddForm>
                          ) : (
                            <ColumnQuickAddTrigger
                              type="button"
                              onClick={() => openInlineAdd(column.status)}
                            >
                              + Add task
                            </ColumnQuickAddTrigger>
                          )}
                        </ColumnQuickAddWrap>
                      )}
                    </KanbanColumn>
                  );
                })}
              </KanbanBoard>
            </DragDropContext>
          ) : (
            <ListViewShell>
              <ListHeaderRow>
                <div>Task</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Assignees</div>
                <div>Actions</div>
              </ListHeaderRow>
              {visibleTasks.map((task) => {
                const assignees = task.assignees && task.assignees.length > 0
                  ? task.assignees
                  : (task.user ? [task.user] : []);
                const plainDescription = task.description
                  ? stripImagesFromHTML(task.description).replace(/<[^>]*>/g, '').trim()
                  : '';
                return (
                  <ListRow key={task._id}>
                    <div>
                      <ListTaskTitle type="button" onClick={() => handleTaskClick(task)}>
                        {task.title}
                      </ListTaskTitle>
                      {plainDescription ? (
                        <ListTaskSub>
                          {plainDescription.length > 120
                            ? `${plainDescription.slice(0, 120)}...`
                            : plainDescription}
                        </ListTaskSub>
                      ) : null}
                      {task.dueDate ? (
                        (() => {
                          const variant = getDueVariant(task.dueDate) || 'upcoming';
                          const text =
                            variant === 'overdue'
                              ? 'Overdue'
                              : variant === 'today'
                                ? 'Due today'
                                : `Due ${formatDueLabel(task.dueDate)}`;
                          return <DueBadge $variant={variant}>{text}</DueBadge>;
                        })()
                      ) : null}
                    </div>
                    <div>
                      <StatusChip
                        style={{
                          background: `${columnConfigs.find((c) => c.status === task.status)?.color || '#e2e8f0'}28`,
                        }}
                      >
                        {columnConfigs.find((c) => c.status === task.status)?.title ||
                          task.status.replace('-', ' ')}
                      </StatusChip>
                    </div>
                    <div>
                      <KanbanTaskPriorityBadge priority={task.priority}>{task.priority}</KanbanTaskPriorityBadge>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      {assignees.length > 0
                        ? assignees.slice(0, 2).map((a) => getUserDisplayName(a)).join(', ')
                        : 'Unassigned'}
                    </div>
                    <div>{renderTaskActions(task.status, task)}</div>
                  </ListRow>
                );
              })}
              {visibleTasks.length === 0 && (
                <EmptyState style={{ margin: 16 }}>
                  <p style={{ fontSize: '13px' }}>No tasks match your current filters.</p>
                </EmptyState>
              )}
            </ListViewShell>
          )) : null}
        </MainContent>
      </ContentWrapper>

      {showProjectModal && (
        <Modal onClick={() => !isCreatingProject && setShowProjectModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <ModalHeader>
              <h2>Create Project</h2>
              <CloseButton
                onClick={() => {
                  if (isCreatingProject) return;
                  setShowProjectModal(false);
                  setProjectForm({ name: '', description: '' });
                }}
              >
                ×
              </CloseButton>
            </ModalHeader>
            <ModalForm onSubmit={createProject}>
              <FormGroup>
                <label>Project name</label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Website Redesign"
                  required
                  autoFocus
                />
              </FormGroup>
              <FormGroup>
                <label>Description (optional)</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="What is this project about?"
                />
              </FormGroup>
              <ModalActions>
                <ModalButton
                  type="button"
                  className="secondary"
                  onClick={() => {
                    if (isCreatingProject) return;
                    setShowProjectModal(false);
                    setProjectForm({ name: '', description: '' });
                  }}
                >
                  Cancel
                </ModalButton>
                <ModalButton type="submit" className="primary" disabled={isCreatingProject}>
                  {isCreatingProject ? 'Creating...' : 'Create Project'}
                </ModalButton>
              </ModalActions>
            </ModalForm>
          </ModalContent>
        </Modal>
      )}

      {showAddModal && (
        <Modal onClick={closeAddModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            {isCreatingTask && (
              <ModalLoaderOverlay>
                <LoadingContent>
                  <LoaderSpinner />
                  <LoaderText>
                    <span>⏳</span>
                    Creating task, please wait...
                  </LoaderText>
                </LoadingContent>
              </ModalLoaderOverlay>
            )}
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
                <AddDescriptionTextarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add details (plain text). You can use full formatting when you edit the task after it is created."
                  rows={5}
                />
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
              <FormGroup>
                <label>Due date (optional)</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </FormGroup>
              <ModalActions>
                <ModalButton
                  type="button"
                  className="secondary"
                  onClick={closeAddModal}
                  disabled={isCreatingTask}
                >
                  Cancel
                </ModalButton>
                <ModalButton type="submit" className="primary" disabled={isCreatingTask}>
                  {isCreatingTask && <InlineSpinner />}
                  {isCreatingTask ? 'Creating...' : 'Create Task'}
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
                  {kanbanColumns.map((c) => (
                    <StatusButton
                      key={c.id}
                      type="button"
                      value={c.id}
                      active={editForm.status === c.id}
                      onClick={() => setEditForm({ ...editForm, status: c.id })}
                    >
                      {c.label}
                    </StatusButton>
                  ))}
                  {editForm.status &&
                    !kanbanColumns.some((c) => c.id === editForm.status) && (
                      <StatusButton type="button" active>
                        {editForm.status} (legacy)
                      </StatusButton>
                    )}
                </StatusButtons>
              </StatusSection>
              <FormGroup>
                <label>Due date (optional)</label>
                <input
                  type="date"
                  value={editForm.dueDate ? editForm.dueDate : ''}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                />
              </FormGroup>
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

      {showDeleteModal && taskToDelete && (
        <DeleteModal onClick={cancelDelete}>
          <DeleteModalContent onClick={(e) => e.stopPropagation()}>
            <DeleteModalHeader>
              <div className="icon-wrapper">
                <AlertTriangle />
              </div>
              <h3>Delete Task</h3>
            </DeleteModalHeader>
            <DeleteModalBody>
              <p>Are you sure you want to delete this task? This action cannot be undone.</p>
              <div className="task-title">
                {taskToDelete.title}
              </div>
            </DeleteModalBody>
            <DeleteModalActions>
              <DeleteModalButton
                className="cancel"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                <X />
                Cancel
              </DeleteModalButton>
              <DeleteModalButton
                className="confirm"
                onClick={deleteTask}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid rgba(255,255,255,0.3)', 
                      borderTopColor: 'white', 
                      borderRadius: '50%', 
                      animation: 'spin 0.8s linear infinite' 
                    }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 />
                    Delete Task
                  </>
                )}
              </DeleteModalButton>
            </DeleteModalActions>
          </DeleteModalContent>
        </DeleteModal>
      )}

      {showAssignModal && taskToAssign && (
        <AssignModal onClick={cancelAssign}>
          <AssignModalContent onClick={(e) => e.stopPropagation()}>
            <AssignModalHeader>
              <div className="icon-wrapper">
                <UserPlus />
              </div>
              <h3>Assign Task</h3>
            </AssignModalHeader>
            <AssignModalBody>
              <div className="task-info">
                <div className="task-title">{taskToAssign.title}</div>
                {selectedAssignees.length > 0 && (
                  <div className="current-assignee" style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Selected Assignees ({selectedAssignees.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedAssignees.map((assigneeId, idx) => {
                        const assignee = users.find(u => u._id.toString() === assigneeId.toString());
                        if (!assignee) return null;
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              background: 'white',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '9px'
                            }}>
                              {getUserInitials(assignee)}
                            </div>
                            <span style={{ color: '#0f172a', fontWeight: 500 }}>
                              {getUserDisplayName(assignee)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAssignee(assigneeId);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '4px'
                              }}
                              title="Remove assignee"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="search-wrapper">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
              </div>

              <div className="users-list">
                {getFilteredUsers().length === 0 ? (
                  <div style={{ 
                    padding: '40px 20px', 
                    textAlign: 'center', 
                    color: '#94a3b8',
                    fontSize: '14px'
                  }}>
                    {userSearchQuery ? 'No users found' : 'No users available'}
                  </div>
                ) : (
                  getFilteredUsers().map(u => {
                    const isSelected = selectedAssignees.some(id => id.toString() === u._id.toString());
                    return (
                      <UserOption
                        key={u._id}
                        selected={isSelected}
                        onClick={() => toggleAssignee(u._id)}
                      >
                        <div className="avatar">
                          {getUserInitials(u)}
                        </div>
                        <div className="info">
                          <div className="name">{getUserDisplayName(u)}</div>
                          <div className="email">{u.email}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="check" size={20} />
                        )}
                      </UserOption>
                    );
                  })
                )}
              </div>
            </AssignModalBody>
            <AssignModalActions>
              <AssignModalButton
                className="cancel"
                onClick={cancelAssign}
                disabled={isAssigning}
              >
                <X />
                Cancel
              </AssignModalButton>
              <AssignModalButton
                className="confirm"
                onClick={confirmAssign}
                disabled={isAssigning}
              >
                {isAssigning ? (
                  <>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid rgba(255,255,255,0.3)', 
                      borderTopColor: 'white', 
                      borderRadius: '50%', 
                      animation: 'spin 0.8s linear infinite' 
                    }} />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus />
                    {selectedAssignees.length > 0 ? 'Update Assignees' : 'Remove All Assignees'}
                  </>
                )}
              </AssignModalButton>
            </AssignModalActions>
          </AssignModalContent>
        </AssignModal>
      )}
    </Container>
  );
};

export default TaskManagement;
