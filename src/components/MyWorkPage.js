import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CalendarClock, CalendarDays, Check, ChevronDown, Inbox, MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { projectsAPI, kanbanAPI, tasksAPI, DEFAULT_KANBAN_COLUMNS } from '../services/api';
import { hasPermission } from '../utils/permissions';
import { getDueVariant, isYmdDateString } from '../utils/taskDates';
import { DueTag, PriorityTag, StatusTag, getTaskAssignees, getTaskPreview } from './TaskCard';
import TaskDetailDrawer from './TaskDetailDrawer';
import { MyWorkSkeleton } from './AppLoader';

const SELECTED_PROJECT_KEY = 'selectedProjectId';
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

const GROUPS = [
  { id: 'overdue', title: 'Overdue', tone: 'error' },
  { id: 'today', title: 'Due today', tone: 'warning' },
  { id: 'week', title: 'Next 7 days' },
  { id: 'later', title: 'Later' },
  { id: 'none', title: 'No due date' },
];

/* ------------------------------------------------------------------ helpers */

function dueTime(dueDate) {
  if (!dueDate) return null;
  const d = isYmdDateString(dueDate) ? new Date(`${dueDate}T00:00:00`) : new Date(dueDate);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function groupOf(task, weekEnd) {
  const variant = getDueVariant(task.dueDate);
  if (!variant) return 'none';
  if (variant === 'overdue') return 'overdue';
  if (variant === 'today') return 'today';
  return dueTime(task.dueDate) <= weekEnd ? 'week' : 'later';
}

/** Soonest due first, then most urgent. */
function compareTasks(a, b) {
  const da = dueTime(a.dueDate) ?? Infinity;
  const db = dueTime(b.dueDate) ?? Infinity;
  if (da !== db) return da - db;
  return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
}

/* ------------------------------------------------------------------- styles */

const Page = styled.div`
  padding: 16px 20px 32px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

const Kpis = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
`;

const Kpi = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--wp-border-strong);
  }

  &:disabled {
    cursor: default;
  }

  .icon {
    width: 36px;
    height: 36px;
    border-radius: var(--wp-radius);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: var(--wp-surface-2);
    color: var(--wp-text-muted);
  }

  &[data-tone='error'] .icon {
    background: var(--wp-error-bg);
    color: var(--wp-error);
  }

  &[data-tone='warning'] .icon {
    background: var(--wp-warning-bg);
    color: var(--wp-warning);
  }

  &[data-tone='info'] .icon {
    background: var(--wp-primary-muted);
    color: var(--wp-primary);
  }

  .value {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.1;
    color: var(--wp-text);
  }

  .label {
    font-size: 12px;
    font-weight: 500;
    color: var(--wp-text-subtle);
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Segmented = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-border);
  background: var(--wp-surface-2);
`;

const SegmentButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: var(--wp-radius-sm);
  background: ${(p) => (p.$active ? 'var(--wp-surface)' : 'transparent')};
  box-shadow: ${(p) => (p.$active ? 'var(--wp-shadow-sm)' : 'none')};
  color: ${(p) => (p.$active ? 'var(--wp-text)' : 'var(--wp-text-muted)')};
  font-size: 12px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;

  .n {
    font-family: var(--wp-font-mono);
    font-size: 11px;
    color: var(--wp-text-subtle);
  }
`;

const SearchField = styled.div`
  position: relative;
  width: 260px;

  svg {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--wp-text-subtle);
    pointer-events: none;
  }

  input {
    width: 100%;
    height: 32px;
    padding: 0 10px 0 30px;
    border: 1px solid var(--wp-input-border);
    border-radius: var(--wp-radius);
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
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;

// Kept in sync with MY_WORK_COLUMNS in AppLoader.js (the loading skeleton).
const MY_WORK_COLUMNS ='28px minmax(240px, 1fr) 180px 140px 96px 150px 44px';

const Group = styled.section`
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  overflow: hidden;
  scroll-margin-top: 12px;
`;

const GroupHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: none;
  border-bottom: 1px solid ${(p) => (p.$open ? 'var(--wp-border)' : 'transparent')};
  background: var(--wp-surface-2);
  color: var(--wp-text);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;

  .chev {
    color: var(--wp-text-subtle);
    transform: rotate(${(p) => (p.$open ? '0deg' : '-90deg')});
    transition: transform 0.12s ease;
  }

  .count {
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    display: inline-grid;
    place-items: center;
    border-radius: 10px;
    background: var(--wp-surface-3);
    color: var(--wp-text-muted);
    font-family: var(--wp-font-mono);
    font-size: 11px;
    font-weight: 500;
  }

  &[data-tone='error'] .title {
    color: var(--wp-error);
  }

  &[data-tone='warning'] .title {
    color: var(--wp-warning);
  }
`;

const RowsScroll = styled.div`
  overflow-x: auto;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: ${MY_WORK_COLUMNS};
  min-width: 960px;
  gap: 12px;
  align-items: center;
  min-height: 52px;
  padding: 6px 14px;
  border-bottom: 1px solid var(--wp-border-subtle);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

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

  .title {
    font-size: 13px;
    font-weight: 600;
    color: var(--wp-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sub {
    margin-top: 2px;
    font-size: 12px;
    color: var(--wp-text-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    font-size: 12px;
    color: var(--wp-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .muted {
    font-size: 12px;
    color: var(--wp-text-subtle);
  }

  .comments {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--wp-text-subtle);
  }
`;

const CompleteButton = styled.button`
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid var(--wp-border-strong);
  background: var(--wp-surface);
  color: transparent;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--wp-success);
    color: var(--wp-success);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 56px 24px;
  text-align: center;
  background: var(--wp-surface);
  border: 1px dashed var(--wp-border-strong);
  border-radius: var(--wp-radius-lg);

  .icon {
    width: 40px;
    height: 40px;
    margin: 0 auto 12px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--wp-success-bg);
    color: var(--wp-success);
  }

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: var(--wp-text);
  }

  p {
    margin: 0 auto 16px;
    max-width: 420px;
    font-size: 13px;
    color: var(--wp-text-subtle);
  }

  button {
    height: 32px;
    padding: 0 12px;
    border-radius: var(--wp-radius);
    border: 1px solid var(--wp-border);
    background: var(--wp-surface);
    color: var(--wp-text);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: var(--wp-surface-2);
    }
  }
`;

const UndoButton = styled.button`
  margin-left: 10px;
  padding: 0;
  border: none;
  background: none;
  color: var(--wp-primary);
  font-weight: 600;
  cursor: pointer;
`;

/* -------------------------------------------------------------------- page */

const MyWorkPage = () => {
  const { user } = useAuth();
  const { tasks, setTasks, isLoading: tasksLoading } = useTasks();
  const navigate = useNavigate();
  const myId = user?._id || user?.id;
  const canUpdate = hasPermission(user, 'tasks.update');

  const [projects, setProjects] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_KANBAN_COLUMNS);
  const [metaLoading, setMetaLoading] = useState(true);
  const [scope, setScope] = useState('assigned');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [collapsed, setCollapsed] = useState({ later: true });
  const [openTaskId, setOpenTaskId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      projectsAPI.listProjects().catch(() => null),
      kanbanAPI.getKanbanColumns().catch(() => null),
    ]).then(([projectsRes, columnsRes]) => {
      if (cancelled) return;
      if (projectsRes) setProjects(projectsRes.data.projects || []);
      else toast.error('Failed to load projects');
      if (columnsRes?.data?.columns?.length) setColumns(columnsRes.data.columns);
      setMetaLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const columnById = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.id, { title: c.label, color: c.color, isDone: c.isDone }])),
    [columns]
  );
  const doneStatus = useMemo(() => columns.find((c) => c.isDone)?.id || null, [columns]);

  // Open (not done) tasks for each scope.
  const scoped = useMemo(() => {
    const open = tasks.filter((t) => !columnById[t.status]?.isDone);
    return {
      assigned: open.filter((t) => getTaskAssignees(t).some((a) => (a?._id || a?.id) === myId)),
      created: open.filter((t) => (t.user?._id || t.user?.id) === myId),
    };
  }, [tasks, columnById, myId]);

  const grouped = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = scoped[scope].filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        (projectById[t.projectId]?.name || '').toLowerCase().includes(q)
    );
    const now = new Date();
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59).getTime();
    const out = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
    list.forEach((t) => out[groupOf(t, weekEnd)].push(t));
    Object.values(out).forEach((arr) => arr.sort(compareTasks));
    return out;
  }, [scoped, scope, deferredQuery, projectById]);

  const visibleCount = GROUPS.reduce((n, g) => n + grouped[g.id].length, 0);

  // Optimistic status change with rollback; the live task feed confirms it.
  const updateStatus = useCallback(
    async (task, status) => {
      const previous = task.status;
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status } : t)));
      try {
        await tasksAPI.updateTask(task._id, { status });
        return true;
      } catch (error) {
        setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: previous } : t)));
        toast.error(error.response?.data?.message || 'Failed to update task');
        return false;
      }
    },
    [setTasks]
  );

  const complete = async (task) => {
    if (!doneStatus) return;
    const previous = task.status;
    if (!(await updateStatus(task, doneStatus))) return;
    const title = task.title.length > 40 ? `${task.title.slice(0, 40)}…` : task.title;
    toast.success(
      (t) => (
        <span>
          Completed “{title}”
          <UndoButton
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              updateStatus({ ...task, status: doneStatus }, previous);
            }}
          >
            Undo
          </UndoButton>
        </span>
      ),
      { duration: 5000 }
    );
  };

  const goToBoard = (task, extraState) => {
    try {
      localStorage.setItem(SELECTED_PROJECT_KEY, task.projectId);
    } catch {
      /* storage unavailable: route state still selects the project */
    }
    navigate('/tasks', { state: { projectId: task.projectId, ...extraState } });
  };

  const jumpTo = (groupId) => {
    setCollapsed((c) => ({ ...c, [groupId]: false }));
    requestAnimationFrame(() =>
      document.getElementById(`mywork-${groupId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  if (tasksLoading || metaLoading) return <MyWorkSkeleton />;

  const openTask = openTaskId ? tasks.find((t) => t._id === openTaskId) : null;
  const kpis = [
    { id: 'overdue', label: 'Overdue', value: grouped.overdue.length, tone: 'error', icon: AlertTriangle },
    { id: 'today', label: 'Due today', value: grouped.today.length, tone: 'warning', icon: CalendarClock },
    { id: 'week', label: 'Next 7 days', value: grouped.week.length, tone: 'info', icon: CalendarDays },
    { id: null, label: 'Open tasks', value: visibleCount, icon: Inbox },
  ];

  return (
    <Page>
      <Kpis>
        {kpis.map(({ id, label, value, tone, icon: Icon }) => (
          <Kpi
            key={label}
            type="button"
            data-tone={value > 0 ? tone : undefined}
            disabled={!id || value === 0}
            onClick={() => id && jumpTo(id)}
            title={id && value ? `Jump to ${label.toLowerCase()}` : undefined}
          >
            <span className="icon">
              <Icon size={18} />
            </span>
            <span>
              <div className="value">{value}</div>
              <div className="label">{label}</div>
            </span>
          </Kpi>
        ))}
      </Kpis>

      <Toolbar>
        <Segmented role="group" aria-label="Show tasks">
          <SegmentButton type="button" $active={scope === 'assigned'} onClick={() => setScope('assigned')}>
            Assigned to me <span className="n">{scoped.assigned.length}</span>
          </SegmentButton>
          <SegmentButton type="button" $active={scope === 'created'} onClick={() => setScope('created')}>
            Created by me <span className="n">{scoped.created.length}</span>
          </SegmentButton>
        </Segmented>
        <SearchField>
          <Search size={14} aria-hidden />
          <input
            type="search"
            placeholder="Filter by task or project"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter my tasks"
          />
        </SearchField>
      </Toolbar>

      {visibleCount === 0 ? (
        <EmptyState>
          <div className="icon">
            <Check size={20} />
          </div>
          <h3>{query ? 'No tasks match the filter' : 'You’re all caught up'}</h3>
          <p>
            {query
              ? 'Try a different task or project name.'
              : scope === 'assigned'
                ? 'Nothing open is assigned to you right now.'
                : 'You have no open tasks that you created.'}
          </p>
          {!query && (
            <button type="button" onClick={() => navigate('/tasks')}>
              Go to the task board
            </button>
          )}
        </EmptyState>
      ) : (
        GROUPS.filter((g) => grouped[g.id].length > 0).map((g) => {
          const open = !collapsed[g.id];
          return (
            <Group key={g.id} id={`mywork-${g.id}`} aria-label={g.title}>
              <GroupHeader
                type="button"
                $open={open}
                data-tone={g.tone}
                aria-expanded={open}
                onClick={() => setCollapsed((c) => ({ ...c, [g.id]: open }))}
              >
                <ChevronDown size={14} className="chev" aria-hidden />
                <span className="title">{g.title}</span>
                <span className="count">{grouped[g.id].length}</span>
              </GroupHeader>
              {open && (
                <RowsScroll>
                  {grouped[g.id].map((task) => {
                    const project = projectById[task.projectId];
                    const status = columnById[task.status];
                    const preview = getTaskPreview(task.description).text;
                    return (
                      <Row
                        key={task._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenTaskId(task._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target === e.currentTarget) setOpenTaskId(task._id);
                        }}
                      >
                        <div>
                          <CompleteButton
                            type="button"
                            disabled={!canUpdate || !doneStatus}
                            onClick={(e) => {
                              e.stopPropagation();
                              complete(task);
                            }}
                            aria-label={`Mark "${task.title}" complete`}
                            title="Mark complete"
                          >
                            <Check size={12} strokeWidth={3} />
                          </CompleteButton>
                        </div>
                        <div>
                          <div className="title">{task.title}</div>
                          {preview ? <div className="sub">{preview}</div> : null}
                        </div>
                        <div>
                          {project ? (
                            <span className="project">
                              <span className="swatch" style={{ background: project.color }} aria-hidden />
                              {project.name}
                            </span>
                          ) : (
                            <span className="muted">No project</span>
                          )}
                        </div>
                        <div>
                          <StatusTag $color={status?.color}>
                            <span className="dot" aria-hidden />
                            {status?.title || task.status}
                          </StatusTag>
                        </div>
                        <div>
                          <PriorityTag priority={task.priority} />
                        </div>
                        <div>
                          {task.dueDate ? <DueTag dueDate={task.dueDate} /> : <span className="muted">—</span>}
                        </div>
                        <div>
                          {task.commentCount > 0 && (
                            <span className="comments" title={`${task.commentCount} comment(s)`}>
                              <MessageSquare size={13} aria-hidden />
                              {task.commentCount}
                            </span>
                          )}
                        </div>
                      </Row>
                    );
                  })}
                </RowsScroll>
              )}
            </Group>
          );
        })
      )}

      {openTask && (
        <TaskDetailDrawer
          task={openTask}
          status={columnById[openTask.status]}
          project={projectById[openTask.projectId]}
          currentUser={user}
          canEdit={canUpdate}
          onEdit={() => goToBoard(openTask, { editTaskId: openTask._id })}
          onOpenBoard={() => goToBoard(openTask, { openTaskId: openTask._id })}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </Page>
  );
};

export default MyWorkPage;
