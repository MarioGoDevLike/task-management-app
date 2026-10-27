import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { tasksAPI, adminAPI, projectsAPI, DEFAULT_KANBAN_COLUMNS, normalizeKanbanColumns } from '../services/api';
import { toast } from 'react-hot-toast';
import { getDb } from '../firebase/app';
import { TasksPageSkeleton, TaskViewSkeleton } from './AppLoader';
import TaskFormModal from './TaskFormModal';
import TaskDetailDrawer from './TaskDetailDrawer';
import TaskImageAttachZone from './TaskImageAttachZone';
import {
  TaskCardBody,
  TaskRowActions,
  StatusTag,
  PriorityTag,
  DueTag,
  AssigneeStack,
  getTaskPreview,
  getTaskAssignees,
  getUserInitials,
  getUserDisplayName,
} from './TaskCard';
import { toDateInputValue, getDueVariant } from '../utils/taskDates';
import { hasPermission } from '../utils/permissions';
import {
  TASK_IMAGE_ACCEPT,
  TASK_IMAGE_MAX_COUNT,
  EMPTY_INLINE_ADD_DRAFT,
  imagesToDescriptionHtml,
  processTaskImageFiles,
  prepareImageDataUrlForTask,
  validateTaskImageFile,
  parseImagesFromDescription,
  removeImageFromDescription,
  buildTaskDescription,
  validateDescriptionForFirestore,
  ensureImageDataUrlsFitTaskStorage,
} from '../utils/taskImages';
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
  Trash2,
  AlertTriangle,
  X,
  UserPlus,
  Users,
  Search,
  Columns3,
  List,
  ChevronDown,
  Check,
  Plus,
  LayoutGrid,
} from 'lucide-react';

/** Map Firebase / API errors when saving tasks with large descriptions. */
function getTaskSaveErrorMessage(error, description) {
  const msg = String(error?.response?.data?.message || error?.message || '');
  if (msg.includes('longer than') || msg.includes('1048487')) {
    return 'Task content is too large. Remove some images or use smaller photos.';
  }
  const sizeErr = validateDescriptionForFirestore(description);
  if (sizeErr) return sizeErr;
  return msg || 'Failed to save task';
}

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

const MobileListView = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

const MobileTaskCard = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  background: var(--wp-surface);
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--wp-border-strong);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .title {
    font-size: 14px;
    font-weight: 600;
    color: var(--wp-text);
    margin: 0 0 8px 0;
    line-height: 1.4;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .sub {
    font-size: 12px;
    color: var(--wp-text-muted);
    margin: 0 0 8px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

/* ------------------------------------------------------------ page + toolbar */

const Container = styled.div`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 20px 16px;

  @media (max-width: 768px) {
    height: auto;
    padding: 10px 12px 16px;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  .spacer {
    flex: 1;
  }
`;

const Divider = styled.span`
  width: 1px;
  height: 20px;
  background: var(--wp-border);

  @media (max-width: 768px) {
    display: none;
  }
`;

const ToolbarButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-border);
  background: var(--wp-surface);
  color: var(--wp-text-muted);
  font-size: 13px;
  cursor: pointer;

  &:hover {
    color: var(--wp-text);
    border-color: var(--wp-border-strong);
    background: var(--wp-surface-2);
  }
`;

const ProjectSelectShell = styled.div`
  position: relative;
  min-width: 220px;
  max-width: 320px;

  @media (max-width: 768px) {
    flex: 1;
    min-width: 0;
    max-width: none;
  }
`;

const ProjectSelectTrigger = styled.button`
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: var(--wp-radius);
  border: 1px solid ${(p) => (p.$open ? 'var(--wp-primary)' : 'var(--wp-input-border)')};
  box-shadow: ${(p) => (p.$open ? '0 0 0 3px var(--wp-focus-ring)' : 'none')};
  background: var(--wp-surface);
  color: var(--wp-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  .lead {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .value {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon {
    color: var(--wp-text-subtle);
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    border-color: ${(p) => (p.$open ? 'var(--wp-primary)' : 'var(--wp-border-strong)')};
  }

  &:disabled {
    cursor: default;
    color: var(--wp-text-subtle);
  }
`;

const ProjectDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  max-height: 320px;
  overflow-y: auto;
  z-index: 50;
  padding: 4px;
  background: var(--wp-surface-elevated);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  box-shadow: var(--wp-shadow-lg);
`;

const ProjectDropdownItem = styled.button`
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: none;
  border-radius: var(--wp-radius-sm);
  background: ${(p) => (p.$active ? 'var(--wp-primary-muted)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--wp-primary)' : 'var(--wp-text)')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  text-align: left;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${(p) => (p.$active ? 'var(--wp-primary-muted)' : 'var(--wp-hover)')};
  }

  .name {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
`;

const SearchField = styled.div`
  position: relative;
  width: 240px;

  > svg {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--wp-text-subtle);
    pointer-events: none;
  }

  kbd {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    height: 18px;
    padding: 0 5px;
    display: inline-flex;
    align-items: center;
    border-radius: 4px;
    border: 1px solid var(--wp-border);
    background: var(--wp-surface-2);
    color: var(--wp-text-subtle);
    font-family: var(--wp-font-mono);
    font-size: 10px;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    width: 100%;
    order: 10;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 28px 0 30px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-input-border);
  background: var(--wp-input-bg);
  color: var(--wp-text);
  font-size: 13px;

  &::placeholder {
    color: var(--wp-input-placeholder);
  }

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }
`;

const Segmented = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  max-width: 100%;
  overflow-x: auto;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-border);
  background: var(--wp-surface-2);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const SegmentButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  border: none;
  border-radius: var(--wp-radius-sm);
  background: ${(p) => (p.$active ? 'var(--wp-surface)' : 'transparent')};
  box-shadow: ${(p) => (p.$active ? 'var(--wp-shadow-sm)' : 'none')};
  color: ${(p) => (p.$active ? 'var(--wp-text)' : 'var(--wp-text-muted)')};
  font-size: 12px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: var(--wp-text);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .n {
    font-family: var(--wp-font-mono);
    font-size: 11px;
    color: var(--wp-text-subtle);
  }
`;

const Summary = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--wp-text-muted);
  white-space: nowrap;

  .overdue {
    color: var(--wp-error);
    font-weight: 600;
  }

  .bar {
    width: 72px;
    height: 4px;
    border-radius: 2px;
    background: var(--wp-surface-3);
    overflow: hidden;

    span {
      display: block;
      height: 100%;
      background: var(--wp-success);
    }
  }

  @media (max-width: 1100px) {
    .bar {
      display: none;
    }
  }
`;

const ViewModeToggle = styled(Segmented)``;

const ViewModeButton = styled(SegmentButton)`
  width: 30px;
  padding: 0;
  justify-content: center;
`;

/* --------------------------------------------------------------- kanban */

const KanbanBoard = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;

  @media (max-width: 768px) {
    min-height: 72vh;
    scroll-snap-type: x mandatory;
  }
`;

const KanbanColumn = styled.section`
  flex: 1 0 280px;
  max-width: 380px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--wp-surface-2);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);

  @media (max-width: 768px) {
    flex: 0 0 86vw;
    max-width: none;
    scroll-snap-align: start;
  }
`;

const ColumnHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--wp-border);
  flex-shrink: 0;
`;

const ColumnTitle = styled.h3`
  flex: 1;
  min-width: 0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--wp-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

const ColumnCount = styled.span`
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--wp-radius-lg);
  background: var(--wp-surface-3);
  color: var(--wp-text-muted);
  font-family: var(--wp-font-mono);
  font-size: 11px;
`;

const ColumnAddButton = styled.button`
  width: 26px;
  height: 26px;
  display: inline-grid;
  place-items: center;
  border: none;
  border-radius: var(--wp-radius-sm);
  background: transparent;
  color: var(--wp-text-subtle);
  cursor: pointer;

  &:hover {
    background: var(--wp-hover);
    color: var(--wp-text);
  }
`;

const ColumnTasks = styled.div`
  flex: 1;
  min-height: 48px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  transition: background-color 0.12s ease;

  &[data-over='true'] {
    background: var(--wp-primary-muted);
  }
`;

const ColumnEmpty = styled.div`
  padding: 18px 8px;
  border: 1px dashed var(--wp-border-strong);
  border-radius: var(--wp-radius);
  text-align: center;
  font-size: 12px;
  color: var(--wp-text-subtle);
`;

const KanbanTask = styled.article`
  position: relative;
  padding: 10px 12px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius);
  box-shadow: var(--wp-shadow-sm);
  cursor: pointer;

  &:hover {
    border-color: var(--wp-border-strong);
  }

  &:hover .card-actions,
  &:focus-within .card-actions {
    opacity: 1;
    pointer-events: auto;
  }

  &:focus-visible {
    outline: 2px solid var(--wp-primary);
    outline-offset: 1px;
  }

  &[data-dragging='true'] {
    border-color: var(--wp-primary-border);
    box-shadow: var(--wp-shadow-lg);
  }
`;

const ColumnQuickAddWrap = styled.div`
  padding: 6px 8px 8px;
  flex-shrink: 0;
`;

const ColumnQuickAddTrigger = styled.button`
  width: 100%;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: none;
  border-radius: var(--wp-radius);
  background: transparent;
  color: var(--wp-text-subtle);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: var(--wp-hover);
    color: var(--wp-text);
  }
`;

const ColumnQuickAddForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-primary-border);
  border-radius: var(--wp-radius);
  box-shadow: var(--wp-shadow-sm);
`;

const ColumnQuickAddInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 9px;
  border: 1px solid var(--wp-input-border);
  border-radius: var(--wp-radius-sm);
  background: var(--wp-input-bg);
  color: var(--wp-text);
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const ColumnQuickAddToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const ColumnQuickAddImageHint = styled.span`
  font-size: 11px;
  color: var(--wp-text-subtle);
`;

const ColumnQuickAddActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;

  .hint {
    margin-right: auto;
    font-size: 11px;
    color: var(--wp-text-subtle);
  }
`;

const ColumnQuickAddAction = styled.button`
  height: 28px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--wp-radius-sm);
  border: 1px solid ${(p) => (p.$primary ? 'var(--wp-primary)' : 'var(--wp-border)')};
  background: ${(p) => (p.$primary ? 'var(--wp-primary)' : 'var(--wp-surface)')};
  color: ${(p) => (p.$primary ? 'var(--wp-on-primary)' : 'var(--wp-text-muted)')};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$primary ? 'var(--wp-primary-hover)' : 'var(--wp-surface-2)')};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/* ------------------------------------------------------------- list view */

const LIST_COLUMNS = 'minmax(280px, 1fr) 150px 100px 140px 110px 230px';

const ListViewShell = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);

  @media (max-width: 768px) {
    display: none;
  }
`;

const ListHeaderRow = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: ${LIST_COLUMNS};
  min-width: 1010px;
  gap: 12px;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  background: var(--wp-surface-2);
  border-bottom: 1px solid var(--wp-border);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--wp-text-subtle);
`;

const ListRow = styled.div`
  display: grid;
  grid-template-columns: ${LIST_COLUMNS};
  min-width: 1010px;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 6px 14px;
  border-bottom: 1px solid var(--wp-border-subtle);
  cursor: pointer;

  &:hover {
    background: var(--wp-surface-2);
  }

  &:focus-visible {
    outline: 2px solid var(--wp-primary);
    outline-offset: -2px;
  }

  > div {
    min-width: 0;
  }

  .muted {
    font-size: 12px;
    color: var(--wp-text-subtle);
  }
`;

const ListTaskTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--wp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListTaskSub = styled.div`
  margin-top: 2px;
  font-size: 12px;
  color: var(--wp-text-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/* ----------------------------------------------------------------- empty */

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  border: 1px dashed var(--wp-border-strong);
  border-radius: var(--wp-radius-lg);
  background: var(--wp-surface);
  color: var(--wp-text-muted);

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: var(--wp-text);
  }

  p {
    margin: 0 auto;
    max-width: 420px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--wp-text-subtle);
  }

  button {
    margin-top: 16px;
  }
`;

const EmptyAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-primary);
  background: var(--wp-primary);
  color: var(--wp-on-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--wp-primary-hover);
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
    color: var(--wp-text);
    font-size: 15px;
  }
  
  input {
    padding: 16px 20px;
    border: 2px solid var(--wp-border);
    border-radius: var(--wp-radius-lg);
    font-size: 15px;
    transition: all 0.2s ease;
    background: var(--wp-bg);
    color: var(--wp-text);
    font-family: inherit;
    
    &:focus {
      outline: none;
      border-color: var(--wp-primary);
      background: var(--wp-surface);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
    
    &::placeholder {
      color: var(--wp-text-subtle);
    }
  }

  textarea {
    padding: 14px 16px;
    border: 2px solid var(--wp-border);
    border-radius: var(--wp-radius-lg);
    font-size: 14px;
    transition: all 0.2s ease;
    background: var(--wp-bg);
    color: var(--wp-text);
    font-family: inherit;
    resize: vertical;
    min-height: 96px;

    &:focus {
      outline: none;
      border-color: var(--wp-primary);
      background: var(--wp-surface);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
  }
`;

const RichTextContainer = styled.div`
  border: 2px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  overflow: visible;
  transition: all 0.2s ease;
  background: var(--wp-surface);
  position: relative;
  z-index: 1;
  
  &:focus-within {
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  
  .ql-toolbar {
    border: none;
    border-bottom: 2px solid var(--wp-border);
    background: var(--wp-bg);
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
      color: var(--wp-text-subtle);
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
  border: 2px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  font-size: 14px;
  line-height: 1.55;
  min-height: 140px;
  resize: vertical;
  font-family: inherit;
  background: var(--wp-bg);
  color: var(--wp-text);
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    background: var(--wp-surface);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: var(--wp-text-subtle);
  }
`;

const ImageUploadOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: var(--wp-radius-lg);
`;

const LoaderSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid var(--wp-border);
  border-top-color: var(--wp-primary);
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
  color: var(--wp-text-muted);
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
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
`;

const InlineSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 3px solid rgba(255, 255, 255, 0.6);
  border-top-color: var(--wp-on-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const PrioritySection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--wp-bg);
  border-radius: var(--wp-radius-lg);
  border: 2px solid var(--wp-border);

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
  color: var(--wp-text-muted);
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
  border: 2px solid ${props => props.active ? props.borderColor : 'var(--wp-border)'};
  border-radius: var(--wp-radius-lg);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.active ? props.bgColor : 'var(--wp-surface)'};
  color: ${props => props.active ? props.textColor : 'var(--wp-text-muted)'};
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
  background: var(--wp-bg);
  border-radius: var(--wp-radius-lg);
  border: 2px solid var(--wp-border);

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
  color: var(--wp-text-muted);
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
  border: 2px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: capitalize;
  
  ${props => {
    const colors = {
      pending: { bg: 'var(--wp-surface-2)', border: 'var(--wp-border)', text: 'var(--wp-text-muted)' },
      'in-progress': { bg: 'var(--wp-info-bg)', border: 'var(--wp-info-border)', text: 'var(--wp-info)' },
      completed: { bg: 'var(--wp-success-bg)', border: 'var(--wp-success-border)', text: 'var(--wp-success)' }
    };
    const c = colors[props.value];
    
    return props.active ? `
      background: ${c.bg};
      color: ${c.text};
      border-color: ${c.border};
      box-shadow: 0 2px 8px ${c.bg}40;
    ` : `
      background: var(--wp-surface);
      color: var(--wp-text-subtle);
      
      &:hover {
        background: ${c.bg};
        color: ${c.text};
        border-color: ${c.border};
      }
    `;
  }}
`;

const DeleteModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--wp-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
`;

const DeleteModalContent = styled.div`
  background: var(--wp-surface);
  border-radius: var(--wp-radius-lg);
  padding: 32px;
  max-width: 480px;
  width: 100%;
  box-shadow: var(--wp-shadow-xl);
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
    border-radius: var(--wp-radius-lg);
    background: var(--wp-error-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      color: var(--wp-error);
      width: 28px;
      height: 28px;
    }
  }
  
  h3 {
    font-size: 22px;
    font-weight: 700;
    color: var(--wp-text);
    margin: 0;
    flex: 1;
  }
`;

const DeleteModalBody = styled.div`
  margin-bottom: 24px;
  
  p {
    font-size: 15px;
    color: var(--wp-text-muted);
    line-height: 1.6;
    margin: 0 0 12px 0;
  }
  
  .task-title {
    background: var(--wp-surface-2);
    padding: 12px 16px;
    border-radius: var(--wp-radius-lg);
    border: 1px solid var(--wp-border);
    font-weight: 600;
    color: var(--wp-text);
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
  border-radius: var(--wp-radius-lg);
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
    background: var(--wp-surface-2);
    color: var(--wp-text-muted);
    
    &:hover {
      background: var(--wp-border);
      color: var(--wp-text);
    }
  }
  
  &.confirm {
    background: var(--wp-error);
    color: var(--wp-on-primary);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    
    &:hover {
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
  background: var(--wp-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
`;

const AssignModalContent = styled.div`
  background: var(--wp-surface);
  border-radius: var(--wp-radius-lg);
  padding: 32px;
  max-width: 520px;
  width: 100%;
  box-shadow: var(--wp-shadow-xl);
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
    border-radius: var(--wp-radius-lg);
    background: var(--wp-primary-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      color: var(--wp-primary);
      width: 28px;
      height: 28px;
    }
  }
  
  h3 {
    font-size: 22px;
    font-weight: 700;
    color: var(--wp-text);
    margin: 0;
    flex: 1;
  }
`;

const AssignModalBody = styled.div`
  margin-bottom: 24px;
  
  .task-info {
    background: var(--wp-surface-2);
    padding: 16px;
    border-radius: var(--wp-radius-lg);
    border: 1px solid var(--wp-border);
    margin-bottom: 20px;
    
    .task-title {
      font-weight: 600;
      color: var(--wp-text);
      font-size: 15px;
      margin-bottom: 4px;
    }
    
    .current-assignee {
      font-size: 13px;
      color: var(--wp-text-muted);
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
      color: var(--wp-text-subtle);
      pointer-events: none;
    }
    
    input {
      width: 100%;
      padding: 12px 16px 12px 44px;
      border: 2px solid var(--wp-border);
      border-radius: var(--wp-radius-lg);
      font-size: 14px;
      color: var(--wp-text);
      transition: all 0.2s ease;
      background: var(--wp-surface);
      
      &:focus {
        outline: none;
        border-color: var(--wp-primary);
        box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
      }
      
      &::placeholder {
        color: var(--wp-text-subtle);
      }
    }
  }
  
  .users-list {
    max-height: 300px;
    overflow-y: auto;
    border: 2px solid var(--wp-border);
    border-radius: var(--wp-radius-lg);
    padding: 8px;
    
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--wp-border-strong);
      border-radius: 4px;
      
      &:hover {
        background: var(--wp-text-subtle);
      }
    }
  }
`;

const UserOption = styled.button`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${props => props.selected ? 'var(--wp-primary)' : 'var(--wp-border)'};
  border-radius: var(--wp-radius-lg);
  background: ${props => props.selected ? 'var(--wp-primary-muted)' : 'var(--wp-surface)'};
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
    border-color: ${props => props.selected ? 'var(--wp-primary)' : 'var(--wp-primary-border)'};
    background: ${props => props.selected ? 'var(--wp-primary-muted)' : 'var(--wp-primary-muted)'};
    transform: translateX(2px);
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--wp-radius-lg);
    background: var(--wp-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--wp-on-primary);
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
  }
  
  .info {
    flex: 1;
    min-width: 0;
    
    .name {
      font-weight: 600;
      color: var(--wp-text);
      font-size: 14px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .email {
      font-size: 12px;
      color: var(--wp-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  
  .check {
    color: var(--wp-primary);
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
  border-radius: var(--wp-radius-lg);
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
    background: var(--wp-surface-2);
    color: var(--wp-text-muted);
    
    &:hover {
      background: var(--wp-border);
      color: var(--wp-text);
    }
  }
  
  &.confirm {
    background: var(--wp-primary);
    color: var(--wp-on-primary);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    
    &:hover {
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
  const location = useLocation();
  const navigate = useNavigate();
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
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [newTaskImages, setNewTaskImages] = useState([]);
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
  const [inlineAttachColumn, setInlineAttachColumn] = useState(null);
  const [inlineReadingImages, setInlineReadingImages] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
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

  const canCreate = hasPermission(user, 'tasks.create');
  const canUpdate = hasPermission(user, 'tasks.update');
  const canDelete = hasPermission(user, 'tasks.delete');
  const canAssign = hasPermission(user, 'tasks.assign');
  const canManageProjects = hasPermission(user, 'projects.manage');

  const editQuillRef = useRef(null);
  const projectDropdownRef = useRef(null);

  const getInlineAddDraft = useCallback(
    (columnStatus) => inlineAddByColumn[columnStatus] || EMPTY_INLINE_ADD_DRAFT,
    [inlineAddByColumn]
  );

  // Arriving from the Projects page selects that project's board.
  useEffect(() => {
    const requested = location.state?.projectId;
    if (requested && projects.some((p) => p.id === requested)) {
      setSelectedProjectId(requested);
    }
  }, [location.state, projects]);

  useEffect(() => {
    if (location.state?.openCreateTask) {
      if (selectedProjectId) {
        setShowAddModal(true);
      } else {
        toast.error('Create or select a project first');
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, selectedProjectId]);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background',
    'link', 'image'
  ];

  const syncEditDescriptionFromQuill = useCallback(() => {
    const quill = editQuillRef.current?.getEditor();
    if (!quill) return;
    const html = quill.root.innerHTML;
    setEditForm((prev) => (prev.description === html ? prev : { ...prev, description: html }));
  }, []);

  const insertImageIntoQuill = useCallback(async (file) => {
    const validationError = validateTaskImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsUploadingImage(true);
    try {
      const dataUrl = await prepareImageDataUrlForTask(file);
      const quill = editQuillRef.current?.getEditor();
      const range = quill?.getSelection(true);
      const index = range?.index ?? quill?.getLength() ?? 0;
      if (quill) {
        quill.insertEmbed(index, 'image', dataUrl);
        quill.setSelection(index + 1);
        syncEditDescriptionFromQuill();
      } else {
        setEditForm((prev) => ({
          ...prev,
          description: `${prev.description || ''}${imagesToDescriptionHtml([dataUrl])}`,
        }));
      }
    } catch {
      toast.error('Failed to load image');
    } finally {
      setIsUploadingImage(false);
    }
  }, [syncEditDescriptionFromQuill]);

  const editImageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', TASK_IMAGE_ACCEPT);
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await insertImageIntoQuill(file);
    };
  }, [insertImageIntoQuill]);

  const handleCreateAttachFiles = async (files) => {
    const { items, errors } = await processTaskImageFiles(files, newTaskImages.length);
    errors.forEach((msg) => toast.error(msg));
    if (items.length) {
      setNewTaskImages((prev) => [...prev, ...items]);
    } else if (files?.length) {
      toast.error('Could not add file — use PNG, JPG, GIF, or WebP under 5MB');
    }
  };

  const handleEditAttachFiles = async (files) => {
    const existingCount = parseImagesFromDescription(editForm.description).length;
    setIsUploadingImage(true);
    try {
      const { items, errors } = await processTaskImageFiles(files, existingCount);
      errors.forEach((msg) => toast.error(msg));
      if (items.length) {
        const imageHtml = imagesToDescriptionHtml(items.map((i) => i.dataUrl));
        setEditForm((prev) => ({
          ...prev,
          description: `${prev.description || ''}${imageHtml}`,
        }));
      } else if (files?.length) {
        toast.error('Could not add file — use PNG, JPG, GIF, or WebP under 5MB');
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditAttachmentsChange = useCallback((nextList) => {
    setEditForm((prev) => {
      const current = parseImagesFromDescription(prev.description);
      const removed = current.filter((a) => !nextList.some((n) => n.id === a.id));
      let desc = prev.description;
      removed.forEach((r) => {
        desc = removeImageFromDescription(desc, r.dataUrl);
      });
      return { ...prev, description: desc };
    });
  }, []);

  const editAttachments = useMemo(
    () => parseImagesFromDescription(editForm.description),
    [editForm.description]
  );

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
    } finally {
      setProjectsLoading(false);
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
    if (activeView !== 'kanban' && activeView !== 'list') {
      setActiveView('kanban');
    }
  }, [activeView]);

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
      color: 'var(--wp-text-subtle)',
      emptyText: 'No tasks',
      isDone: false,
    }));
    return [...base, ...orphans];
  }, [kanbanColumns, tasks]);

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
      const optimizedUrls = await ensureImageDataUrlsFitTaskStorage(
        newTaskImages.map((img) => img.dataUrl)
      );
      const description = buildTaskDescription(newDescription, optimizedUrls);
      const sizeError = validateDescriptionForFirestore(description);
      if (sizeError) {
        toast.error(sizeError);
        return;
      }
      const response = await tasksAPI.createTask({
        title: newTask.trim(),
        description,
        priority: newPriority,
        dueDate: newDueDate || null,
        projectId: selectedProjectId,
      });
      
      setTasks([...tasks, response.data]);
      setNewTask('');
      setNewDescription('');
      setNewPriority('medium');
      setNewDueDate('');
      setNewTaskImages([]);
      setShowAddModal(false);
      toast.success('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error(getTaskSaveErrorMessage(error, buildTaskDescription(
        newDescription,
        newTaskImages.map((img) => img.dataUrl)
      )));
    } finally {
      setIsCreatingTask(false);
    }
  };

  const openInlineAdd = (columnStatus) => {
    setInlineAddByColumn((prev) => ({
      ...prev,
      [columnStatus]: { title: '', images: [] },
    }));
  };

  const cancelInlineAdd = (columnStatus) => {
    if (inlineAddingColumn === columnStatus) return;
    if (inlineReadingImages && inlineAttachColumn === columnStatus) return;
    setInlineAddByColumn((prev) => {
      const next = { ...prev };
      delete next[columnStatus];
      return next;
    });
  };

  const updateInlineAddTitle = (columnStatus, title) => {
    setInlineAddByColumn((prev) => ({
      ...prev,
      [columnStatus]: { ...getInlineAddDraft(columnStatus), title },
    }));
  };

  const handleInlineImageFiles = async (files, columnStatus) => {
    if (!columnStatus || !files?.length) return;

    const draft = getInlineAddDraft(columnStatus);
    if (draft.images.length >= TASK_IMAGE_MAX_COUNT) {
      toast.error(`Maximum ${TASK_IMAGE_MAX_COUNT} images per task`);
      return;
    }

    setInlineAttachColumn(columnStatus);
    setInlineReadingImages(true);

    try {
      const { items, errors } = await processTaskImageFiles(files, draft.images.length);
      errors.forEach((msg) => toast.error(msg));

      if (items.length > 0) {
        setInlineAddByColumn((prev) => {
          const current = prev[columnStatus] || EMPTY_INLINE_ADD_DRAFT;
          return {
            ...prev,
            [columnStatus]: {
              ...current,
              images: [...current.images, ...items],
            },
          };
        });
      } else if (files.length) {
        toast.error('Could not add file — use PNG, JPG, GIF, or WebP under 5MB');
      }
    } finally {
      setInlineReadingImages(false);
      setInlineAttachColumn(null);
    }
  };

  const removeInlineImage = (columnStatus, imageId) => {
    setInlineAddByColumn((prev) => {
      const draft = getInlineAddDraft(columnStatus);
      return {
        ...prev,
        [columnStatus]: {
          ...draft,
          images: draft.images.filter((img) => img.id !== imageId),
        },
      };
    });
  };

  const submitInlineAdd = async (event, columnStatus) => {
    event.preventDefault();
    if (inlineAddingColumn || isCreatingTask || inlineReadingImages) return;

    const draft = getInlineAddDraft(columnStatus);
    const title = (draft.title || '').trim();
    if (!title) return;

    if (!selectedProjectId) {
      toast.error('Create/select a project first');
      return;
    }

    let description = '';
    try {
      setInlineAddingColumn(columnStatus);
      const optimizedUrls = await ensureImageDataUrlsFitTaskStorage(
        draft.images.map((img) => img.dataUrl)
      );
      description = imagesToDescriptionHtml(optimizedUrls);
      const sizeError = validateDescriptionForFirestore(description);
      if (sizeError) {
        toast.error(sizeError);
        return;
      }
      const response = await tasksAPI.createTask({
        title,
        description,
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
      toast.success(draft.images.length ? 'Task added with images' : 'Task added');
    } catch (error) {
      console.error('Error adding quick task:', error);
      toast.error(getTaskSaveErrorMessage(error, description));
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
    if (!canUpdate) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    updateTaskStatus(draggableId, destination.droppableId);
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
    setNewTaskImages([]);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowImageModal(true);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    if (isSavingTask) return;
    if (!editForm.title.trim()) return;

    try {
      setIsSavingTask(true);
      const payload = {
        ...editForm,
        dueDate: editForm.dueDate || null,
      };
      const sizeError = validateDescriptionForFirestore(payload.description);
      if (sizeError) {
        toast.error(sizeError);
        return;
      }
      const response = await tasksAPI.updateTask(editingTask._id, payload);
      setTasks(tasks.map(t => 
        t._id === editingTask._id ? response.data : t
      ));
      closeEditModal();
      toast.success('Task updated successfully!');
    } catch (error) {
      toast.error(getTaskSaveErrorMessage(error, editForm.description));
    } finally {
      setIsSavingTask(false);
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

  // Typing stays instant: filtering runs against the deferred query. Search uses
  // the plain-text preview, never the raw HTML (which can hold base64 images).
  const deferredSearch = useDeferredValue(searchQuery);
  const visibleTasks = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return projectTasks.filter((task) => {
      if (filter !== 'all' && task.status !== filter) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        getTaskPreview(task.description).text.toLowerCase().includes(q)
      );
    });
  }, [projectTasks, filter, deferredSearch]);

  const tasksByStatus = useMemo(() => {
    const map = {};
    columnConfigs.forEach((c) => {
      map[c.status] = [];
    });
    visibleTasks.forEach((t) => {
      (map[t.status] || (map[t.status] = [])).push(t);
    });
    return map;
  }, [columnConfigs, visibleTasks]);

  const columnTotals = useMemo(() => {
    const totals = {};
    projectTasks.forEach((t) => {
      totals[t.status] = (totals[t.status] || 0) + 1;
    });
    return totals;
  }, [projectTasks]);

  const summary = useMemo(() => {
    const doneStatuses = new Set(columnConfigs.filter((c) => c.isDone).map((c) => c.status));
    let done = 0;
    let overdue = 0;
    projectTasks.forEach((t) => {
      if (doneStatuses.has(t.status)) done += 1;
      else if (getDueVariant(t.dueDate) === 'overdue') overdue += 1;
    });
    return { total: projectTasks.length, done, overdue };
  }, [projectTasks, columnConfigs]);

  const columnMeta = useMemo(() => {
    const doneStatus = columnConfigs.find((c) => c.isDone)?.status || null;
    const reopenStatus = columnConfigs.find((c) => !c.isDone)?.status || null;
    return columnConfigs.map((c, i) => ({
      ...c,
      next: columnConfigs[i + 1] || null,
      doneStatus,
      reopenStatus,
    }));
  }, [columnConfigs]);

  const columnByStatus = useMemo(() => {
    const map = {};
    columnConfigs.forEach((c) => {
      map[c.status] = c;
    });
    return map;
  }, [columnConfigs]);

  const can = useMemo(
    () => ({ update: canUpdate, assign: canAssign, remove: canDelete }),
    [canUpdate, canAssign, canDelete]
  );

  // Stable callbacks for memoized cards; each call reaches the latest handler.
  const handlersRef = useRef(null);
  handlersRef.current = {
    open: handleTaskClick,
    move: (task, status) => {
      if (task.status !== status) updateTaskStatus(task._id, status);
    },
    edit: openEditModal,
    assign: handleAssignTask,
    remove: (task) => {
      setTaskToDelete(task);
      setShowDeleteModal(true);
    },
  };
  const cardActions = useMemo(
    () => ({
      open: (t) => handlersRef.current.open(t),
      move: (t, s) => handlersRef.current.move(t, s),
      edit: (t) => handlersRef.current.edit(t),
      assign: (t) => handlersRef.current.assign(t),
      remove: (t) => handlersRef.current.remove(t),
    }),
    []
  );

  // The drawer follows the live task so status/comment changes show immediately.
  const liveSelectedTask = selectedTask
    ? tasks.find((t) => t._id === selectedTask._id) || selectedTask
    : null;

  // Deep links from My Work: { openTaskId } opens the drawer, { editTaskId } the editor.
  useEffect(() => {
    const { openTaskId, editTaskId } = location.state || {};
    const id = openTaskId || editTaskId;
    if (!id) return;
    const task = tasks.find((t) => t._id === id);
    if (!task) return;
    if (editTaskId) cardActions.edit(task);
    else cardActions.open(task);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, tasks, cardActions, navigate]);

  // "/" focuses task search from anywhere on the page.
  const searchInputRef = useRef(null);
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (!searchInputRef.current) return;
      e.preventDefault();
      searchInputRef.current.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openTaskOnEnter = (task) => (e) => {
    if (e.key === 'Enter' && e.target === e.currentTarget) cardActions.open(task);
  };

  const donePct = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;

  // Until projects load and one is selected we cannot know which board (or empty
  // state) to show, so the whole page body is a skeleton rather than a wrong state.
  const projectsPending = projectsLoading || (projects.length > 0 && !selectedProjectId);

  return (
    <Container>
      {projectsPending ? (
        <TasksPageSkeleton columns={columnConfigs.length} />
      ) : (
      <>
      <Toolbar>
        <ProjectSelectShell ref={projectDropdownRef}>
          <ProjectSelectTrigger
            type="button"
            $open={isProjectDropdownOpen}
            onClick={() => {
              if (projects.length === 0) return;
              setIsProjectDropdownOpen((prev) => !prev);
            }}
            disabled={projects.length === 0}
            aria-haspopup="listbox"
            aria-expanded={isProjectDropdownOpen}
            aria-label="Select project"
          >
            <span className="lead" style={{ background: selectedProject?.color || 'var(--wp-text-subtle)' }} aria-hidden />
            <span className="value">{selectedProject ? selectedProject.name : 'No projects yet'}</span>
            <ChevronDown className="icon" size={14} aria-hidden />
          </ProjectSelectTrigger>
          {isProjectDropdownOpen && projects.length > 0 && (
            <ProjectDropdownMenu role="listbox" aria-label="Projects">
              {projects.map((project) => (
                <ProjectDropdownItem
                  key={project.id}
                  type="button"
                  role="option"
                  aria-selected={selectedProjectId === project.id}
                  $active={selectedProjectId === project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setIsProjectDropdownOpen(false);
                  }}
                >
                  <span className="name">
                    <span className="swatch" style={{ background: project.color }} aria-hidden />
                    {project.name}
                  </span>
                  {selectedProjectId === project.id ? <Check size={14} /> : null}
                </ProjectDropdownItem>
              ))}
            </ProjectDropdownMenu>
          )}
        </ProjectSelectShell>
        <ToolbarButton type="button" onClick={() => navigate('/projects')} title="All projects (G P)">
          <LayoutGrid size={14} />
          All projects
        </ToolbarButton>

        {selectedProjectId && (
          <>
            <Divider />
            <SearchField>
              <Search size={14} aria-hidden />
              <SearchInput
                ref={searchInputRef}
                type="search"
                placeholder="Filter tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Filter tasks"
              />
              {!searchQuery && <kbd>/</kbd>}
            </SearchField>
            <Segmented role="group" aria-label="Filter by status">
              <SegmentButton type="button" $active={filter === 'all'} onClick={() => setFilter('all')}>
                All <span className="n">{summary.total}</span>
              </SegmentButton>
              {columnConfigs.map((col) => (
                <SegmentButton
                  key={col.status}
                  type="button"
                  $active={filter === col.status}
                  onClick={() => setFilter(filter === col.status ? 'all' : col.status)}
                >
                  <span className="dot" style={{ background: col.color }} aria-hidden />
                  {col.title}
                  <span className="n">{columnTotals[col.status] || 0}</span>
                </SegmentButton>
              ))}
            </Segmented>
            <span className="spacer" />
            <Summary aria-label="Project progress">
              {summary.overdue > 0 && <span className="overdue">{summary.overdue} overdue</span>}
              <span>
                {summary.done}/{summary.total} done
              </span>
              <span className="bar" aria-hidden>
                <span style={{ width: `${donePct}%` }} />
              </span>
            </Summary>
            <ViewModeToggle role="group" aria-label="View">
              <ViewModeButton
                type="button"
                $active={activeView === 'kanban'}
                onClick={() => setActiveView('kanban')}
                aria-label="Board view"
                aria-pressed={activeView === 'kanban'}
                title="Board view"
              >
                <Columns3 size={14} />
              </ViewModeButton>
              <ViewModeButton
                type="button"
                $active={activeView === 'list'}
                onClick={() => setActiveView('list')}
                aria-label="List view"
                aria-pressed={activeView === 'list'}
                title="List view"
              >
                <List size={14} />
              </ViewModeButton>
            </ViewModeToggle>
          </>
        )}
      </Toolbar>

      {!selectedProjectId && (
        <EmptyState>
          <h3>{projects.length === 0 ? 'Create your first project' : 'Select a project'}</h3>
          <p>Projects hold the board, the tasks and the team working on them.</p>
          {canManageProjects && (
            <EmptyAction type="button" onClick={() => navigate('/projects', { state: { create: true } })}>
              <Plus size={14} />
              New project
            </EmptyAction>
          )}
        </EmptyState>
      )}

      {tasksLoading && selectedProjectId ? (
        <TaskViewSkeleton view={activeView} columns={columnConfigs.length} />
      ) : selectedProjectId ? (
        activeView === 'kanban' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <KanbanBoard>
              {columnMeta.map((column) => {
                const columnTasks = tasksByStatus[column.status] || [];
                const total = columnTotals[column.status] || 0;
                const inlineDraft = getInlineAddDraft(column.status);
                const inlineIsOpen = Object.prototype.hasOwnProperty.call(inlineAddByColumn, column.status);
                const inlineIsSubmitting = inlineAddingColumn === column.status;
                const inlineIsBusy = inlineIsSubmitting || inlineReadingImages;
                return (
                  <KanbanColumn key={column.status} aria-label={column.title}>
                    <ColumnHeader>
                      <ColumnTitle>
                        <span className="dot" style={{ background: column.color }} aria-hidden />
                        {column.title}
                      </ColumnTitle>
                      <ColumnCount title={`${columnTasks.length} shown of ${total}`}>
                        {columnTasks.length === total ? total : `${columnTasks.length}/${total}`}
                      </ColumnCount>
                      {canCreate && (
                        <ColumnAddButton
                          type="button"
                          onClick={() => openInlineAdd(column.status)}
                          title={`Add task to ${column.title}`}
                          aria-label={`Add task to ${column.title}`}
                        >
                          <Plus size={15} />
                        </ColumnAddButton>
                      )}
                    </ColumnHeader>
                    <Droppable droppableId={column.status}>
                      {(provided, snapshot) => (
                        <ColumnTasks
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          data-over={snapshot.isDraggingOver}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable
                              key={task._id}
                              draggableId={task._id}
                              index={index}
                              isDragDisabled={!canUpdate}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <KanbanTask
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={dragProvided.draggableProps.style}
                                  data-dragging={dragSnapshot.isDragging}
                                  onClick={() => cardActions.open(task)}
                                  onKeyDown={openTaskOnEnter(task)}
                                >
                                  <TaskCardBody
                                    task={task}
                                    isDone={!!column.isDone}
                                    nextStatus={column.next?.status || null}
                                    nextTitle={column.next?.title || ''}
                                    doneStatus={column.doneStatus}
                                    reopenStatus={column.reopenStatus}
                                    can={can}
                                    actions={cardActions}
                                  />
                                </KanbanTask>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columnTasks.length === 0 && !inlineIsOpen && (
                            <ColumnEmpty>{total === 0 ? 'No tasks' : 'No tasks match the filter'}</ColumnEmpty>
                          )}
                        </ColumnTasks>
                      )}
                    </Droppable>
                    {canCreate && (
                      <ColumnQuickAddWrap>
                        {inlineIsOpen ? (
                          <ColumnQuickAddForm
                            onSubmit={(e) => submitInlineAdd(e, column.status)}
                            aria-label={`Quick add task in ${column.title}`}
                          >
                            <ColumnQuickAddInput
                              type="text"
                              value={inlineDraft.title}
                              onChange={(e) => updateInlineAddTitle(column.status, e.target.value)}
                              placeholder="Task title"
                              autoFocus
                              disabled={inlineIsBusy}
                              aria-label="Task title"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelInlineAdd(column.status);
                              }}
                            />
                            <ColumnQuickAddToolbar>
                              <TaskImageAttachZone
                                compact
                                showLabel={false}
                                attachments={inlineDraft.images}
                                onFilesSelected={(files) => handleInlineImageFiles(files, column.status)}
                                onRemove={(id) => removeInlineImage(column.status, id)}
                                disabled={inlineIsBusy}
                                busy={inlineReadingImages && inlineAttachColumn === column.status}
                              />
                              <ColumnQuickAddImageHint>
                                {inlineDraft.images.length}/{TASK_IMAGE_MAX_COUNT} images
                              </ColumnQuickAddImageHint>
                            </ColumnQuickAddToolbar>
                            <ColumnQuickAddActions>
                              <span className="hint">Enter to add · Esc to cancel</span>
                              <ColumnQuickAddAction
                                type="button"
                                onClick={() => cancelInlineAdd(column.status)}
                                disabled={inlineIsBusy}
                              >
                                Cancel
                              </ColumnQuickAddAction>
                              <ColumnQuickAddAction
                                type="submit"
                                $primary
                                disabled={inlineIsBusy || !String(inlineDraft.title || '').trim()}
                              >
                                {inlineIsSubmitting ? (
                                  <>
                                    <InlineSpinner />
                                    Adding
                                  </>
                                ) : (
                                  'Add'
                                )}
                              </ColumnQuickAddAction>
                            </ColumnQuickAddActions>
                          </ColumnQuickAddForm>
                        ) : (
                          <ColumnQuickAddTrigger type="button" onClick={() => openInlineAdd(column.status)}>
                            <Plus size={14} />
                            Add task
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
          <>
            <ListViewShell>
              <ListHeaderRow>
                <div>Task</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Due</div>
                <div>Assignees</div>
                <div />
              </ListHeaderRow>
              {visibleTasks.map((task) => {
                const statusCol = columnByStatus[task.status];
                const preview = getTaskPreview(task.description);
                const assignees = getTaskAssignees(task);
                return (
                  <ListRow
                    key={task._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => cardActions.open(task)}
                    onKeyDown={openTaskOnEnter(task)}
                  >
                    <div>
                      <ListTaskTitle>{task.title}</ListTaskTitle>
                      {preview.text ? <ListTaskSub>{preview.text}</ListTaskSub> : null}
                    </div>
                    <div>
                      <StatusTag $color={statusCol?.color}>
                        <span className="dot" aria-hidden />
                        {statusCol?.title || task.status}
                      </StatusTag>
                    </div>
                    <div>
                      <PriorityTag priority={task.priority} />
                    </div>
                    <div>
                      {task.dueDate ? <DueTag dueDate={task.dueDate} /> : <span className="muted">—</span>}
                    </div>
                    <div>
                      {assignees.length ? (
                        <AssigneeStack assignees={assignees} />
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </div>
                    <div>
                      <TaskRowActions task={task} columns={columnConfigs} can={can} actions={cardActions} />
                    </div>
                  </ListRow>
                );
              })}
              {visibleTasks.length === 0 && (
                <EmptyState style={{ margin: 16 }}>
                  <h3>No tasks found</h3>
                  <p>Change the filter or search, or create a task with N.</p>
                </EmptyState>
              )}
            </ListViewShell>
            <MobileListView>
              {visibleTasks.map((task) => {
                const statusCol = columnByStatus[task.status];
                const preview = getTaskPreview(task.description);
                return (
                  <MobileTaskCard key={task._id} type="button" onClick={() => cardActions.open(task)}>
                    <p className="title">{task.title}</p>
                    {preview.text ? <p className="sub">{preview.text}</p> : null}
                    <div className="meta">
                      <StatusTag $color={statusCol?.color}>
                        <span className="dot" aria-hidden />
                        {statusCol?.title || task.status}
                      </StatusTag>
                      <PriorityTag priority={task.priority} />
                      <DueTag dueDate={task.dueDate} />
                      <AssigneeStack assignees={getTaskAssignees(task)} />
                    </div>
                  </MobileTaskCard>
                );
              })}
              {visibleTasks.length === 0 && (
                <EmptyState>
                  <h3>No tasks found</h3>
                  <p>Change the filter or search.</p>
                </EmptyState>
              )}
            </MobileListView>
          </>
        )
      ) : null}
      </>
      )}

      <TaskFormModal
        mode="create"
        open={showAddModal}
        onClose={closeAddModal}
        onSubmit={addTask}
        title={newTask}
        onTitleChange={setNewTask}
        description={newDescription}
        onDescriptionChange={setNewDescription}
        priority={newPriority}
        onPriorityChange={setNewPriority}
        dueDate={newDueDate}
        onDueDateChange={setNewDueDate}
        isSubmitting={isCreatingTask}
        attachments={newTaskImages}
        onAttachmentsChange={setNewTaskImages}
        onAttachFiles={handleCreateAttachFiles}
        titleError={!newTask.trim() ? 'Task name is required' : undefined}
      />

      <TaskFormModal
        mode="edit"
        open={!!editingTask}
        onClose={closeEditModal}
        onSubmit={saveTask}
        title={editForm.title}
        onTitleChange={(value) => setEditForm((prev) => ({ ...prev, title: value }))}
        description={editForm.description}
        onDescriptionChange={(value) => setEditForm((prev) => ({ ...prev, description: value }))}
        priority={editForm.priority}
        onPriorityChange={(value) => setEditForm((prev) => ({ ...prev, priority: value }))}
        status={editForm.status}
        onStatusChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
        dueDate={editForm.dueDate}
        onDueDateChange={(value) => setEditForm((prev) => ({ ...prev, dueDate: value }))}
        kanbanColumns={kanbanColumns}
        isSubmitting={isSavingTask}
        isUploadingImage={isUploadingImage}
        quillRef={editQuillRef}
        quillModules={editModules}
        quillFormats={formats}
        attachments={editAttachments}
        onAttachmentsChange={handleEditAttachmentsChange}
        onAttachFiles={handleEditAttachFiles}
        titleError={!editForm.title.trim() ? 'Task name is required' : undefined}
      />

      {showImageModal && liveSelectedTask && (
        <TaskDetailDrawer
          task={liveSelectedTask}
          status={columnByStatus[liveSelectedTask.status]}
          project={projects.find((p) => p.id === liveSelectedTask.projectId)}
          currentUser={user}
          canEdit={canUpdate}
          onEdit={() => {
            setShowImageModal(false);
            openEditModal(liveSelectedTask);
          }}
          onClose={() => setShowImageModal(false)}
        />
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
                  <div className="current-assignee" style={{ marginTop: '12px', padding: '12px', background: 'var(--wp-surface-2)', borderRadius: '6px', border: '1px solid var(--wp-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--wp-text-muted)', marginBottom: '8px' }}>
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
                              background: 'var(--wp-surface)',
                              borderRadius: '6px',
                              border: '1px solid var(--wp-border)',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: 'var(--wp-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '9px'
                            }}>
                              {getUserInitials(assignee)}
                            </div>
                            <span style={{ color: 'var(--wp-text)', fontWeight: 500 }}>
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
                                color: 'var(--wp-error)',
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
                    color: 'var(--wp-text-subtle)',
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
