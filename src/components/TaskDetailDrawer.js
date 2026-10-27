import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import { ArrowUpRight, MessageSquare, Pencil, Send, Trash2, X } from 'lucide-react';
import { commentsAPI } from '../services/api';
import { processTaskImageFiles, TASK_IMAGE_MAX_COUNT } from '../utils/taskImages';
import TaskImageAttachZone from './TaskImageAttachZone';
import {
  AssigneeStack,
  DueTag,
  PriorityTag,
  StatusTag,
  getTaskAssignees,
  getUserDisplayName,
  getUserInitials,
} from './TaskCard';
import { ItemListSkeleton } from './AppLoader';

const COMMENT_MAX_IMAGES = 3;
const COMMENT_MAX_LENGTH = 5000;

/* ------------------------------------------------------------------ helpers */

function formatRelative(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFull(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Comment text with `@Name` mentions highlighted. Built as React nodes, never as HTML. */
function CommentText({ body, names }) {
  if (!names.length) return body;
  const pattern = new RegExp(`(@(?:${names.map(escapeRegExp).join('|')}))`, 'g');
  return body.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="mention">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function initialsOf(name) {
  return (
    String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

/* ------------------------------------------------------------------- styles */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 900;
  background: var(--wp-overlay);
`;

const Panel = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 901;
  width: min(560px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--wp-surface);
  border-left: 1px solid var(--wp-border);
  box-shadow: var(--wp-shadow-xl);

  &:focus {
    outline: none;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px 14px 20px;
  border-bottom: 1px solid var(--wp-border);

  .titles {
    flex: 1;
    min-width: 0;
  }

  .crumb {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--wp-text-subtle);
  }

  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--wp-text);
    word-break: break-word;
  }

  .actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
`;

const HeaderButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-border);
  background: var(--wp-surface);
  color: var(--wp-text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--wp-surface-2);
    color: var(--wp-text);
  }

  &.icon {
    width: 30px;
    padding: 0;
    justify-content: center;
    border-color: transparent;
  }
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const Section = styled.section`
  padding: 16px 20px;
  border-bottom: 1px solid var(--wp-border-subtle);

  &:last-child {
    border-bottom: none;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--wp-text-subtle);
  }
`;

const Props = styled.dl`
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  row-gap: 10px;
  margin: 0;
  font-size: 13px;

  dt {
    color: var(--wp-text-subtle);
    align-self: center;
  }

  dd {
    margin: 0;
    min-height: 22px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--wp-text);
  }

  .muted {
    color: var(--wp-text-subtle);
  }
`;

const Description = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: var(--wp-text);
  word-break: break-word;

  p {
    margin: 0 0 8px;
  }

  img {
    max-width: 100%;
    height: auto;
    margin: 8px 0;
    border-radius: var(--wp-radius);
    border: 1px solid var(--wp-border);
  }

  a {
    color: var(--wp-primary);
  }
`;

const Empty = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--wp-text-subtle);
`;

const Thread = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Comment = styled.li`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;

  .av {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--wp-surface-3);
    color: var(--wp-text);
    font-size: 10px;
    font-weight: 700;
  }

  .meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }

  .author {
    font-size: 13px;
    font-weight: 600;
    color: var(--wp-text);
  }

  .time {
    font-size: 12px;
    color: var(--wp-text-subtle);
  }

  .delete {
    margin-left: auto;
    opacity: 0;
  }

  &:hover .delete,
  .delete:focus-visible,
  .delete[data-armed='true'] {
    opacity: 1;
  }

  .body {
    font-size: 13px;
    line-height: 1.55;
    color: var(--wp-text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .mention {
    padding: 0 2px;
    border-radius: 3px;
    background: var(--wp-primary-muted);
    color: var(--wp-primary);
    font-weight: 500;
  }

  .images {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .images button {
    padding: 0;
    border: 1px solid var(--wp-border);
    border-radius: var(--wp-radius);
    overflow: hidden;
    background: var(--wp-surface-2);
    cursor: zoom-in;
  }

  .images img {
    display: block;
    width: 88px;
    height: 66px;
    object-fit: cover;
  }

  @media (hover: none) {
    .delete {
      opacity: 1;
    }
  }
`;

const DeleteButton = styled.button`
  height: 22px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: var(--wp-radius-sm);
  background: transparent;
  color: var(--wp-text-subtle);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover,
  &[data-armed='true'] {
    color: var(--wp-error);
    background: var(--wp-error-bg);
  }
`;

const Composer = styled.form`
  position: relative;
  padding: 12px 16px 16px 20px;
  border-top: 1px solid var(--wp-border);
  background: var(--wp-surface);

  .box {
    border: 1px solid var(--wp-input-border);
    border-radius: var(--wp-radius-lg);
    background: var(--wp-input-bg);

    &:focus-within {
      border-color: var(--wp-primary);
      box-shadow: 0 0 0 3px var(--wp-focus-ring);
    }
  }

  textarea {
    display: block;
    width: 100%;
    min-height: 64px;
    max-height: 200px;
    padding: 10px 12px;
    border: none;
    background: transparent;
    color: var(--wp-text);
    font-size: 13px;
    line-height: 1.5;
    resize: none;

    &::placeholder {
      color: var(--wp-input-placeholder);
    }

    &:focus {
      outline: none;
    }
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px 8px 12px;
  }

  .hint {
    margin-left: auto;
    font-size: 11px;
    color: var(--wp-text-subtle);

    @media (max-width: 480px) {
      display: none;
    }
  }
`;

const SendButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--wp-radius);
  border: 1px solid var(--wp-primary);
  background: var(--wp-primary);
  color: var(--wp-on-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--wp-primary-hover);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const MentionMenu = styled.ul`
  position: absolute;
  left: 20px;
  bottom: calc(100% - 4px);
  z-index: 2;
  width: 280px;
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--wp-surface-elevated);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  box-shadow: var(--wp-shadow-lg);

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 8px;
    border-radius: var(--wp-radius-sm);
    font-size: 13px;
    color: var(--wp-text);
    cursor: pointer;
  }

  li[aria-selected='true'] {
    background: var(--wp-primary-muted);
    color: var(--wp-primary);
  }

  .av {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: var(--wp-surface-3);
    color: var(--wp-text);
    font-size: 9px;
    font-weight: 700;
  }

  .email {
    margin-left: auto;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: var(--wp-text-subtle);
  }
`;

const Lightbox = styled.button`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 32px;
  border: none;
  background: rgba(10, 12, 16, 0.85);
  cursor: zoom-out;

  img {
    max-width: 100%;
    max-height: 100%;
    border-radius: var(--wp-radius);
  }
`;

/* ---------------------------------------------------------------- comments */

function useTaskComments(taskId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setComments([]);
    return commentsAPI.subscribe(
      taskId,
      (list) => {
        setComments(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
        toast.error('Failed to load comments');
      }
    );
  }, [taskId]);

  return { comments, loading };
}

function CommentComposer({ taskId, candidates }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [sending, setSending] = useState(false);
  const [mention, setMention] = useState(null); // { start, query, index } while typing "@…"
  const textareaRef = useRef(null);

  const matches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return candidates
      .filter((c) => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [mention, candidates]);

  const autosize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  // An "@" at the start of a word opens the menu; the text after it is the query.
  const detectMention = (value, caret) => {
    const before = value.slice(0, caret);
    const at = before.lastIndexOf('@');
    if (at < 0 || (at > 0 && !/\s/.test(before[at - 1]))) {
      setMention(null);
      return;
    }
    const query = before.slice(at + 1);
    if (query.length > 30 || /\n/.test(query)) {
      setMention(null);
      return;
    }
    setMention((prev) => ({ start: at, query, index: prev?.query === query ? prev.index : 0 }));
  };

  const insertMention = (person) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const next = `${text.slice(0, mention.start)}@${person.name} ${text.slice(caret)}`;
    const pos = mention.start + person.name.length + 2;
    setText(next);
    setMention(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
      autosize();
    });
  };

  const submit = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (sending || (!body && images.length === 0)) return;
    // A mention counts only if its "@Name" is still in the final text.
    const mentionIds = candidates.filter((c) => body.includes(`@${c.name}`)).map((c) => c._id);
    try {
      setSending(true);
      await commentsAPI.addComment(taskId, { body, mentionIds, images: images.map((i) => i.dataUrl) });
      setText('');
      setImages([]);
      requestAnimationFrame(autosize);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post comment');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (mention && matches.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setMention((m) => ({ ...m, index: (m.index + step + matches.length) % matches.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(matches[mention.index] || matches[0]);
        return;
      }
    }
    if (e.key === 'Escape' && mention) {
      e.stopPropagation(); // close the menu, not the drawer
      setMention(null);
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  const addImages = async (files) => {
    // processTaskImageFiles caps at the per-task limit; offset it to the per-comment limit.
    const { items, errors } = await processTaskImageFiles(
      files,
      images.length + (TASK_IMAGE_MAX_COUNT - COMMENT_MAX_IMAGES)
    );
    errors.forEach((msg) => toast.error(msg.replace('per task', 'per comment')));
    if (items.length) setImages((prev) => [...prev, ...items].slice(0, COMMENT_MAX_IMAGES));
  };

  const canSend = !sending && (text.trim().length > 0 || images.length > 0);

  return (
    <Composer onSubmit={submit} aria-label="Add a comment">
      {mention && matches.length > 0 && (
        <MentionMenu role="listbox" aria-label="Mention someone">
          {matches.map((c, i) => (
            <li
              key={c._id}
              role="option"
              aria-selected={i === mention.index}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(c);
              }}
              onMouseEnter={() => setMention((m) => ({ ...m, index: i }))}
            >
              <span className="av">{getUserInitials(c)}</span>
              {c.name}
              <span className="email">{c.email}</span>
            </li>
          ))}
        </MentionMenu>
      )}
      <div className="box">
        <textarea
          ref={textareaRef}
          value={text}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Write a comment… type @ to mention someone on this task"
          aria-label="Comment"
          onChange={(e) => {
            setText(e.target.value);
            detectMention(e.target.value, e.target.selectionStart);
            autosize();
          }}
          onKeyDown={onKeyDown}
          onClick={(e) => detectMention(e.target.value, e.target.selectionStart)}
          onBlur={() => setMention(null)}
          disabled={sending}
        />
        <div className="bar">
          <TaskImageAttachZone
            compact
            showLabel={false}
            attachments={images}
            onFilesSelected={addImages}
            onRemove={(id) => setImages((prev) => prev.filter((x) => x.id !== id))}
            disabled={sending || images.length >= COMMENT_MAX_IMAGES}
          />
          <span className="hint">Ctrl + Enter to send</span>
          <SendButton type="submit" disabled={!canSend}>
            <Send size={13} />
            {sending ? 'Sending…' : 'Comment'}
          </SendButton>
        </div>
      </div>
    </Composer>
  );
}

function CommentItem({ taskId, comment, canDelete, mentionNames, onOpenImage }) {
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Two-step delete: first click arms the button for 3 seconds.
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const remove = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    try {
      setDeleting(true);
      await commentsAPI.deleteComment(taskId, comment.id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
      setDeleting(false);
    }
  };

  return (
    <Comment>
      <span className="av" aria-hidden>
        {initialsOf(comment.authorName)}
      </span>
      <div>
        <div className="meta">
          <span className="author">{comment.authorName}</span>
          <time className="time" dateTime={comment.createdAt} title={formatFull(comment.createdAt)}>
            {formatRelative(comment.createdAt)}
          </time>
          {canDelete && (
            <DeleteButton
              type="button"
              className="delete"
              data-armed={armed}
              onClick={remove}
              disabled={deleting}
              aria-label={armed ? 'Confirm delete comment' : 'Delete comment'}
            >
              <Trash2 size={12} />
              {armed ? 'Delete?' : null}
            </DeleteButton>
          )}
        </div>
        {comment.body && (
          <div className="body">
            <CommentText body={comment.body} names={mentionNames} />
          </div>
        )}
        {comment.images.length > 0 && (
          <div className="images">
            {comment.images.map((src, i) => (
              <button key={i} type="button" onClick={() => onOpenImage(src)} aria-label={`Open image ${i + 1}`}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Comment>
  );
}

/* ------------------------------------------------------------------ drawer */

/**
 * Task details side panel: properties, description and the live comment thread.
 * `status` is the task's column ({ title, color }); `project` is { name, color }.
 */
export default function TaskDetailDrawer({
  task,
  status,
  project,
  currentUser,
  canEdit,
  onEdit,
  onOpenBoard,
  onClose,
}) {
  const panelRef = useRef(null);
  const threadEndRef = useRef(null);
  const { comments, loading } = useTaskComments(task._id);
  const [candidates, setCandidates] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const isAdmin = currentUser?.roles?.includes('admin');
  const myId = currentUser?._id || currentUser?.id;
  const assignees = getTaskAssignees(task);

  useEffect(() => {
    let cancelled = false;
    commentsAPI
      .listMentionCandidates(task._id)
      .then((res) => {
        if (!cancelled) setCandidates(res.data.users || []);
      })
      .catch(() => {
        /* mentions are optional; commenting still works without them */
      });
    return () => {
      cancelled = true;
    };
  }, [task._id]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const close = useCallback(() => {
    if (lightbox) setLightbox(null);
    else onClose();
  }, [lightbox, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const namesById = useMemo(() => {
    const map = {};
    candidates.forEach((c) => {
      map[c._id] = c.name;
    });
    return map;
  }, [candidates]);

  // Keep the newest comment in view as the thread grows.
  useEffect(() => {
    if (!loading) threadEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [comments.length, loading]);

  const otherPeople = useMemo(() => candidates.filter((c) => c._id !== myId), [candidates, myId]);

  return (
    <>
      <Overlay onClick={onClose} aria-hidden />
      <Panel ref={panelRef} role="dialog" aria-modal="true" aria-label={task.title} tabIndex={-1}>
        <Header>
          <div className="titles">
            {project && (
              <div className="crumb">
                <span className="swatch" style={{ background: project.color }} aria-hidden />
                {project.name}
              </div>
            )}
            <h2>{task.title}</h2>
          </div>
          <div className="actions">
            {onOpenBoard && (
              <HeaderButton type="button" onClick={onOpenBoard} title="Open in project board">
                <ArrowUpRight size={13} />
                Board
              </HeaderButton>
            )}
            {canEdit && (
              <HeaderButton type="button" onClick={onEdit}>
                <Pencil size={13} />
                Edit
              </HeaderButton>
            )}
            <HeaderButton type="button" className="icon" onClick={onClose} aria-label="Close">
              <X size={16} />
            </HeaderButton>
          </div>
        </Header>

        <Scroll>
          <Section>
            <Props>
              <dt>Status</dt>
              <dd>
                <StatusTag $color={status?.color}>
                  <span className="dot" aria-hidden />
                  {status?.title || task.status}
                </StatusTag>
              </dd>
              <dt>Priority</dt>
              <dd>
                <PriorityTag priority={task.priority} />
              </dd>
              <dt>Due date</dt>
              <dd>{task.dueDate ? <DueTag dueDate={task.dueDate} /> : <span className="muted">No due date</span>}</dd>
              <dt>Assignees</dt>
              <dd>
                {assignees.length ? (
                  <>
                    <AssigneeStack assignees={assignees} max={4} />
                    <span>{assignees.map(getUserDisplayName).join(', ')}</span>
                  </>
                ) : (
                  <span className="muted">Unassigned</span>
                )}
              </dd>
              <dt>Created by</dt>
              <dd>{task.user ? getUserDisplayName(task.user) : <span className="muted">Unknown</span>}</dd>
            </Props>
          </Section>

          <Section>
            <h3>Description</h3>
            {task.description ? (
              <Description dangerouslySetInnerHTML={{ __html: task.description }} />
            ) : (
              <Empty>No description.</Empty>
            )}
          </Section>

          <Section>
            <h3>
              <MessageSquare size={12} aria-hidden />
              Comments{comments.length ? ` · ${comments.length}` : ''}
            </h3>
            {loading ? (
              <ItemListSkeleton rows={3} label="Loading comments" />
            ) : comments.length === 0 ? (
              <Empty>No comments yet. Start the discussion below.</Empty>
            ) : (
              <Thread>
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    taskId={task._id}
                    comment={c}
                    canDelete={c.authorId === myId || isAdmin}
                    mentionNames={c.mentionIds.map((id) => namesById[id]).filter(Boolean)}
                    onOpenImage={setLightbox}
                  />
                ))}
              </Thread>
            )}
            <div ref={threadEndRef} />
          </Section>
        </Scroll>

        <CommentComposer taskId={task._id} candidates={otherPeople} />
      </Panel>

      {lightbox && (
        <Lightbox type="button" onClick={() => setLightbox(null)} aria-label="Close image">
          <img src={lightbox} alt="" />
        </Lightbox>
      )}
    </>
  );
}
