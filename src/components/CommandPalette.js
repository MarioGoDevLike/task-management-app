import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Search,
  ListTodo,
  Inbox,
  FolderKanban,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Plus,
  Moon,
  Sun,
  LogOut,
  Command,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: var(--wp-overlay);
  z-index: 9998;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
`;

const Palette = styled.div`
  width: 100%;
  max-width: 560px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  box-shadow: var(--wp-shadow-lg);
  overflow: hidden;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--wp-border);

  svg {
    color: var(--wp-text-subtle);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 15px;
    color: var(--wp-text);
    outline: none;

    &::placeholder {
      color: var(--wp-text-subtle);
    }
  }

  kbd {
    font-size: 11px;
    padding: 3px 6px;
    border-radius: 5px;
    border: 1px solid var(--wp-border);
    background: var(--wp-surface-2);
    color: var(--wp-text-muted);
    font-family: inherit;
  }
`;

const ResultsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px;
  max-height: 360px;
  overflow-y: auto;
`;

const ResultItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--wp-text);
  background: ${(p) => (p.$active ? 'var(--wp-primary-muted)' : 'transparent')};

  &:hover {
    background: var(--wp-surface-2);
  }

  .icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--wp-surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--wp-text-muted);
    flex-shrink: 0;
  }

  .meta {
    flex: 1;
    min-width: 0;
  }

  .label {
    font-weight: 600;
  }

  .hint {
    font-size: 12px;
    color: var(--wp-text-subtle);
    margin-top: 1px;
  }

  .shortcut {
    font-size: 11px;
    color: var(--wp-text-subtle);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--wp-border);
  }
`;

const EmptyHint = styled.p`
  margin: 0;
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--wp-text-subtle);
`;

const SectionLabel = styled.div`
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--wp-text-subtle);
`;

export function CommandPalette({ open, onClose, onCreateTask: onCreateTaskProp }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const isAdmin = user?.roles?.includes('admin');
  const canOpenSettings = isAdmin || user?.permissions?.includes('kanban.manage');

  const items = useMemo(() => {
    const nav = [
      { id: 'my-work', label: 'My work', hint: 'Your open tasks across projects', icon: Inbox, action: () => navigate('/') },
      { id: 'tasks', label: 'Tasks', hint: 'View kanban board', icon: ListTodo, action: () => navigate('/tasks') },
      { id: 'projects', label: 'Projects', hint: 'All projects and progress', icon: FolderKanban, action: () => navigate('/projects') },
      { id: 'calendar', label: 'Calendar', hint: 'View schedule', icon: CalendarDays, action: () => navigate('/calendar') },
    ];
    if (isAdmin) {
      nav.push({ id: 'admin', label: 'Dashboard', hint: 'Admin overview', icon: LayoutDashboard, action: () => navigate('/admin') });
    }
    if (canOpenSettings) {
      nav.push({ id: 'settings', label: 'Settings', hint: 'Workspace settings', icon: Settings, action: () => navigate('/settings') });
    }

    const createTask = () => {
      onClose();
      if (onCreateTaskProp) onCreateTaskProp();
      else navigate('/tasks', { state: { openCreateTask: true } });
    };

    const actions = [
      { id: 'new-task', label: 'Create task', hint: 'Add a new task', icon: Plus, action: createTask },
      { id: 'new-project', label: 'Create project', hint: 'Start a new project', icon: FolderKanban, action: () => { onClose(); navigate('/projects', { state: { create: true } }); } },
      { id: 'theme', label: theme === 'dark' ? 'Light mode' : 'Dark mode', hint: 'Toggle appearance', icon: theme === 'dark' ? Sun : Moon, action: () => toggleTheme() },
      { id: 'logout', label: 'Sign out', hint: user?.email || '', icon: LogOut, action: () => { onClose(); logout(); } },
    ];

    return [...nav, ...actions];
  }, [navigate, isAdmin, canOpenSettings, theme, toggleTheme, logout, user, onClose, onCreateTaskProp]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.hint && item.hint.toLowerCase().includes(q))
    );
  }, [items, query]);

  const runItem = useCallback(
    (item) => {
      item.action();
      if (item.id !== 'theme') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        runItem(filtered[activeIndex]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, activeIndex, onClose, runItem]);

  if (!open) return null;

  return (
    <Overlay
      role="presentation"
      onClick={onClose}
    >
      <Palette
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <SearchRow>
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
          />
          <kbd>esc</kbd>
        </SearchRow>
        {filtered.length === 0 ? (
          <EmptyHint>No results for &ldquo;{query}&rdquo;</EmptyHint>
        ) : (
          <>
            <SectionLabel>Commands</SectionLabel>
            <ResultsList role="listbox">
              {filtered.map((item, index) => {
                const Icon = item.icon;
                return (
                  <ResultItem
                    key={item.id}
                    role="option"
                    aria-selected={index === activeIndex}
                    $active={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runItem(item)}
                  >
                    <div className="icon-wrap">
                      <Icon size={16} />
                    </div>
                    <div className="meta">
                      <div className="label">{item.label}</div>
                      {item.hint ? <div className="hint">{item.hint}</div> : null}
                    </div>
                  </ResultItem>
                );
              })}
            </ResultsList>
          </>
        )}
      </Palette>
    </Overlay>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { open, setOpen, toggle: () => setOpen((p) => !p), close: () => setOpen(false) };
}

export function CommandPaletteTrigger({ onClick, collapsed }) {
  return (
    <TriggerButton type="button" onClick={onClick} $collapsed={collapsed} aria-label="Open command palette (Ctrl+K)">
      <Search size={16} />
      {!collapsed && (
        <>
          <span className="label">Search...</span>
          <kbd><Command size={10} />K</kbd>
        </>
      )}
    </TriggerButton>
  );
}

const TriggerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: ${(p) => (p.$collapsed ? '44px' : '100%')};
  height: 36px;
  margin: ${(p) => (p.$collapsed ? '0 auto' : '0')};
  padding: ${(p) => (p.$collapsed ? '0' : '0 12px')};
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'flex-start')};
  border: 1px solid var(--wp-border);
  border-radius: 8px;
  background: var(--wp-surface-2);
  color: var(--wp-text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: var(--wp-border-strong);
    background: var(--wp-surface);
    color: var(--wp-text);
  }

  .label {
    flex: 1;
    text-align: left;
    color: var(--wp-text-subtle);
  }

  kbd {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--wp-border);
    background: var(--wp-surface);
    color: var(--wp-text-subtle);
    font-family: inherit;
  }
`;
