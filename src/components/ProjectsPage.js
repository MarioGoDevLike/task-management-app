import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import { ArrowRight, FolderKanban, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { projectsAPI, kanbanAPI, DEFAULT_KANBAN_COLUMNS } from '../services/api';
import { hasPermission } from '../utils/permissions';
import { getDueVariant } from '../utils/taskDates';
import { ProjectTableSkeleton } from './AppLoader';

const PROJECT_COLORS = ['#1f5fd6', '#0e7490', '#12804a', '#b45309', '#c62828', '#7c4dcc', '#4a5361', '#0f8b8d'];
const SELECTED_PROJECT_KEY = 'selectedProjectId';
const EMPTY_FORM = { name: '', description: '', color: PROJECT_COLORS[0] };

/* ------------------------------------------------------------------ layout */

const Page = styled.div`
  padding: 16px 20px 32px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .spacer {
    flex: 1;
  }

  .count {
    font-size: 12px;
    color: var(--wp-text-subtle);
  }
`;

const SearchField = styled.div`
  position: relative;
  width: 280px;

  svg {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--wp-text-subtle);
    pointer-events: none;
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const Input = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--wp-input-border);
  border-radius: var(--wp-radius);
  background: var(--wp-input-bg);
  color: var(--wp-text);
  font-size: 13px;

  &.with-icon {
    padding-left: 30px;
  }

  &::placeholder {
    color: var(--wp-input-placeholder);
  }

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }
`;

const TextArea = styled(Input).attrs({ as: 'textarea' })`
  height: auto;
  min-height: 84px;
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.45;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--wp-radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--wp-border);
  background: var(--wp-surface);
  color: var(--wp-text);
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: var(--wp-surface-2);
    border-color: var(--wp-border-strong);
  }

  &.primary {
    border-color: var(--wp-primary);
    background: var(--wp-primary);
    color: var(--wp-on-primary);

    &:hover:not(:disabled) {
      background: var(--wp-primary-hover);
      border-color: var(--wp-primary-hover);
    }
  }

  &.danger {
    border-color: var(--wp-error);
    background: var(--wp-error);
    color: #fff;

    &:hover:not(:disabled) {
      opacity: 0.9;
      background: var(--wp-error);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const IconButton = styled.button`
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: none;
  border-radius: var(--wp-radius-sm);
  background: transparent;
  color: var(--wp-text-subtle);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--wp-hover);
    color: var(--wp-text);
  }

  &.danger:hover:not(:disabled) {
    background: var(--wp-error-bg);
    color: var(--wp-error);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

/* ------------------------------------------------------------------- table */

const COLUMNS = 'minmax(260px, 1fr) 200px 70px 80px 70px 120px 120px';

const Table = styled.div`
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  overflow-x: auto;
`;

const HeadRow = styled.div`
  display: grid;
  grid-template-columns: ${COLUMNS};
  min-width: 960px;
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

  .num {
    text-align: right;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: ${COLUMNS};
  min-width: 960px;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 8px 14px;
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

  .num {
    text-align: right;
    font-size: 13px;
    color: var(--wp-text);
  }

  .num.alert {
    color: var(--wp-error);
    font-weight: 600;
  }

  .num.zero {
    color: var(--wp-text-subtle);
  }

  .date {
    font-size: 12px;
    color: var(--wp-text-subtle);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
  }
`;

const ProjectCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  .swatch {
    width: 28px;
    height: 28px;
    border-radius: var(--wp-radius);
    display: grid;
    place-items: center;
    color: #fff;
    flex-shrink: 0;
  }

  .text {
    min-width: 0;
  }

  .name {
    font-size: 13px;
    font-weight: 600;
    color: var(--wp-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .desc {
    font-size: 12px;
    color: var(--wp-text-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--wp-text-muted);

  .bar {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--wp-surface-3);
    overflow: hidden;
  }

  .fill {
    display: block;
    height: 100%;
    background: var(--wp-success);
  }

  .pct {
    width: 36px;
    text-align: right;
  }
`;

const Empty = styled.div`
  padding: 56px 24px;
  text-align: center;
  color: var(--wp-text-subtle);

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
    line-height: 1.5;
  }
`;

/* ------------------------------------------------------------------ dialog */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
  background: var(--wp-overlay);
`;

const DialogBox = styled.div`
  width: 100%;
  max-width: 460px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  box-shadow: var(--wp-shadow-xl);

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--wp-border);

    h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--wp-text);
    }
  }

  .body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 13px;
    color: var(--wp-text-muted);
    line-height: 1.5;

    p {
      margin: 0;
    }
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--wp-border);
    background: var(--wp-surface-2);
    border-radius: 0 0 var(--wp-radius-lg) var(--wp-radius-lg);
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--wp-text);

  .hint {
    font-weight: 400;
    color: var(--wp-text-subtle);
  }
`;

const Swatches = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  button {
    width: 26px;
    height: 26px;
    border-radius: var(--wp-radius);
    border: 2px solid var(--wp-surface);
    box-shadow: 0 0 0 1px var(--wp-border);
    cursor: pointer;
  }

  button[aria-checked='true'] {
    box-shadow: 0 0 0 2px var(--wp-text);
  }
`;

function Dialog({ title, onClose, busy, children, footer }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <Overlay role="presentation" onMouseDown={() => !busy && onClose()}>
      <DialogBox role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <IconButton type="button" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={16} />
          </IconButton>
        </header>
        {children}
        {footer ? <footer>{footer}</footer> : null}
      </DialogBox>
    </Overlay>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* -------------------------------------------------------------------- page */

const ProjectsPage = () => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const location = useLocation();
  const canManage = hasPermission(user, 'projects.manage');

  const [projects, setProjects] = useState([]);
  const [doneStatuses, setDoneStatuses] = useState(
    () => new Set(DEFAULT_KANBAN_COLUMNS.filter((c) => c.isDone).map((c) => c.id))
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null); // { id?: string, form }
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([projectsAPI.listProjects(), kanbanAPI.getKanbanColumns().catch(() => null)])
      .then(([projectsRes, columnsRes]) => {
        if (cancelled) return;
        setProjects(projectsRes.data.projects || []);
        const columns = columnsRes?.data?.columns;
        if (columns?.length) setDoneStatuses(new Set(columns.filter((c) => c.isDone).map((c) => c.id)));
      })
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = useCallback(() => setEditor({ form: { ...EMPTY_FORM } }), []);

  // Other pages send { create: true } to open the "New project" dialog directly.
  useEffect(() => {
    if (location.state?.create && canManage) {
      openCreate();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, canManage, navigate, openCreate]);

  const statsByProject = useMemo(() => {
    const stats = {};
    tasks.forEach((t) => {
      if (!t.projectId) return;
      const s = stats[t.projectId] || (stats[t.projectId] = { total: 0, done: 0, overdue: 0 });
      s.total += 1;
      if (doneStatuses.has(t.status)) s.done += 1;
      else if (getDueVariant(t.dueDate) === 'overdue') s.overdue += 1;
    });
    return stats;
  }, [tasks, doneStatuses]);

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
  }, [projects, query]);

  const openBoard = (project) => {
    try {
      localStorage.setItem(SELECTED_PROJECT_KEY, project.id);
    } catch {
      /* storage unavailable: the route state still selects the project */
    }
    navigate('/tasks', { state: { projectId: project.id } });
  };

  const saveProject = async (e) => {
    e.preventDefault();
    if (saving || !editor) return;
    const name = editor.form.name.trim();
    if (!name) return;
    const body = { name, description: editor.form.description.trim(), color: editor.form.color };
    try {
      setSaving(true);
      if (editor.id) {
        const res = await projectsAPI.updateProject(editor.id, body);
        const updated = res.data.project;
        setProjects((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name))
        );
        toast.success('Project updated');
      } else {
        const res = await projectsAPI.createProject(body);
        const created = res.data.project;
        setProjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Project created');
      }
      setEditor(null);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    try {
      setDeleting(true);
      await projectsAPI.deleteProject(toDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== toDelete.id));
      toast.success('Project deleted');
      setToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const setForm = (patch) => setEditor((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));
  const deleteTaskCount = toDelete ? statsByProject[toDelete.id]?.total || 0 : 0;

  return (
    <Page>
      <Toolbar>
        <SearchField>
          <Search size={14} aria-hidden />
          <Input
            className="with-icon"
            type="search"
            placeholder="Filter projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter projects"
          />
        </SearchField>
        <span className="count">
          {visibleProjects.length} of {projects.length} projects
        </span>
        <span className="spacer" />
        {canManage && (
          <Button type="button" className="primary" onClick={openCreate}>
            <Plus size={14} />
            New project
          </Button>
        )}
      </Toolbar>

      {loading ? (
        <ProjectTableSkeleton />
      ) : (
        <Table>
          <HeadRow>
            <div>Project</div>
            <div>Progress</div>
            <div className="num">Tasks</div>
            <div className="num">Overdue</div>
            <div className="num">Done</div>
            <div>Updated</div>
            <div />
          </HeadRow>
          {visibleProjects.map((project) => {
            const s = statsByProject[project.id] || { total: 0, done: 0, overdue: 0 };
            const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
            return (
              <Row
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => openBoard(project)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) openBoard(project);
                }}
                title={`Open ${project.name} board`}
              >
                <ProjectCell>
                  <span className="swatch" style={{ background: project.color }} aria-hidden>
                    <FolderKanban size={14} />
                  </span>
                  <div className="text">
                    <div className="name">{project.name}</div>
                    <div className="desc">{project.description || 'No description'}</div>
                  </div>
                </ProjectCell>
                <Progress aria-label={`${pct}% complete`}>
                  <span className="bar">
                    <span className="fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="pct">{pct}%</span>
                </Progress>
                <div className={`num${s.total ? '' : ' zero'}`}>{s.total}</div>
                <div className={`num${s.overdue ? ' alert' : ' zero'}`}>{s.overdue}</div>
                <div className={`num${s.done ? '' : ' zero'}`}>{s.done}</div>
                <div className="date">{formatDate(project.updatedAt || project.createdAt)}</div>
                <div className="actions" onClick={(e) => e.stopPropagation()}>
                  {canManage && (
                    <>
                      <IconButton
                        type="button"
                        title="Edit project"
                        aria-label={`Edit ${project.name}`}
                        onClick={() =>
                          setEditor({
                            id: project.id,
                            form: {
                              name: project.name,
                              description: project.description || '',
                              color: project.color || PROJECT_COLORS[0],
                            },
                          })
                        }
                      >
                        <Pencil size={14} />
                      </IconButton>
                      <IconButton
                        type="button"
                        className="danger"
                        title="Delete project"
                        aria-label={`Delete ${project.name}`}
                        onClick={() => setToDelete(project)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </>
                  )}
                  <IconButton
                    type="button"
                    title="Open board"
                    aria-label={`Open ${project.name} board`}
                    onClick={() => openBoard(project)}
                  >
                    <ArrowRight size={14} />
                  </IconButton>
                </div>
              </Row>
            );
          })}
          {visibleProjects.length === 0 && (
            <Empty>
              <h3>{projects.length === 0 ? 'No projects yet' : 'No projects match the filter'}</h3>
              <p>
                {projects.length === 0
                  ? 'A project holds a task board, its deadlines and the team working on it.'
                  : 'Try a different name or clear the filter.'}
              </p>
              {projects.length === 0 && canManage && (
                <Button type="button" className="primary" onClick={openCreate}>
                  <Plus size={14} />
                  New project
                </Button>
              )}
            </Empty>
          )}
        </Table>
      )}

      {editor && (
        <Dialog
          title={editor.id ? 'Edit project' : 'New project'}
          onClose={() => setEditor(null)}
          busy={saving}
        >
          <form onSubmit={saveProject}>
            <div className="body">
              <Field>
                Name
                <Input
                  autoFocus
                  value={editor.form.name}
                  maxLength={80}
                  onChange={(e) => setForm({ name: e.target.value })}
                  placeholder="e.g. Bridge retrofit, phase 2"
                  required
                />
              </Field>
              <Field>
                <span>
                  Description <span className="hint">(optional)</span>
                </span>
                <TextArea
                  value={editor.form.description}
                  onChange={(e) => setForm({ description: e.target.value })}
                  placeholder="Scope, client or key milestones"
                />
              </Field>
              <Field as="div">
                Color
                <Swatches role="radiogroup" aria-label="Project color">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={editor.form.color === c}
                      aria-label={c}
                      style={{ background: c }}
                      onClick={() => setForm({ color: c })}
                    />
                  ))}
                </Swatches>
              </Field>
            </div>
            <footer>
              <Button type="button" onClick={() => setEditor(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="primary" disabled={saving || !editor.form.name.trim()}>
                {saving ? 'Saving…' : editor.id ? 'Save changes' : 'Create project'}
              </Button>
            </footer>
          </form>
        </Dialog>
      )}

      {toDelete && (
        <Dialog
          title="Delete project"
          onClose={() => setToDelete(null)}
          busy={deleting}
          footer={
            <>
              <Button type="button" onClick={() => setToDelete(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                type="button"
                className="danger"
                onClick={confirmDelete}
                disabled={deleting || deleteTaskCount > 0}
              >
                {deleting ? 'Deleting…' : 'Delete project'}
              </Button>
            </>
          }
        >
          <div className="body">
            {deleteTaskCount > 0 ? (
              <p>
                <strong>{toDelete.name}</strong> still has {deleteTaskCount} active task
                {deleteTaskCount === 1 ? '' : 's'}. Move or archive them before deleting the project.
              </p>
            ) : (
              <p>
                Delete <strong>{toDelete.name}</strong>? This can’t be undone.
              </p>
            )}
          </div>
        </Dialog>
      )}
    </Page>
  );
};

export default ProjectsPage;
