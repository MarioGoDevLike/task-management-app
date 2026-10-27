import React, { memo } from 'react';
import styled from 'styled-components';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Pencil,
  UserPlus,
  Trash2,
  CalendarClock,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { getDueVariant, formatDueLabel } from '../utils/taskDates';

/* ------------------------------------------------------------------ helpers */

export function getUserInitials(user) {
  if (!user) return '?';
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  return (user.email || '?')[0].toUpperCase();
}

export function getUserDisplayName(user) {
  if (!user) return 'Unassigned';
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.email || 'Unknown';
}

export function getTaskAssignees(task) {
  if (task.assignees && task.assignees.length > 0) return task.assignees;
  return task.user ? [task.user] : [];
}

const PREVIEW_CACHE_LIMIT = 500;
const previewCache = new Map();
const BLOCK_END = /<(?:br|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi;

/**
 * Plain-text preview of a task's rich-text description, plus its image count.
 * Parsed with an inert DOMParser document (embedded images are never decoded)
 * and cached by description string, so re-renders cost a Map lookup.
 */
export function getTaskPreview(html) {
  if (!html) return { text: '', imageCount: 0 };
  const cached = previewCache.get(html);
  if (cached) return cached;
  const docu = new DOMParser().parseFromString(html.replace(BLOCK_END, ' $&'), 'text/html');
  const preview = {
    text: (docu.body.textContent || '').replace(/\s+/g, ' ').trim(),
    imageCount: docu.body.querySelectorAll('img').length,
  };
  if (previewCache.size >= PREVIEW_CACHE_LIMIT) previewCache.clear();
  previewCache.set(html, preview);
  return preview;
}

const PRIORITY = {
  urgent: { label: 'Urgent', color: 'var(--wp-error)' },
  high: { label: 'High', color: 'var(--wp-warning)' },
  medium: { label: 'Medium', color: 'var(--wp-info)' },
  low: { label: 'Low', color: 'var(--wp-text-subtle)' },
};

/* ------------------------------------------------------------------- pieces */

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--wp-radius-sm);
  border: 1px solid var(--wp-border);
  background: var(--wp-surface);
  font-size: 11px;
  font-weight: 500;
  color: var(--wp-text-muted);
  white-space: nowrap;

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    background: ${(p) => p.$color || 'var(--wp-text-subtle)'};
  }

  &[data-variant='overdue'] {
    color: var(--wp-error);
    border-color: var(--wp-error-border);
    background: var(--wp-error-bg);
  }

  &[data-variant='today'] {
    color: var(--wp-warning);
    border-color: var(--wp-warning-border);
    background: var(--wp-warning-bg);
  }
`;

export function PriorityTag({ priority }) {
  const p = PRIORITY[priority] || PRIORITY.low;
  return (
    <Tag $color={p.color} title={`Priority: ${p.label}`}>
      <span className="dot" aria-hidden />
      {p.label}
    </Tag>
  );
}

export function DueTag({ dueDate }) {
  if (!dueDate) return null;
  const variant = getDueVariant(dueDate) || 'upcoming';
  const text =
    variant === 'overdue'
      ? `Overdue · ${formatDueLabel(dueDate)}`
      : variant === 'today'
        ? 'Due today'
        : formatDueLabel(dueDate);
  return (
    <Tag data-variant={variant} title="Due date">
      <CalendarClock size={12} aria-hidden />
      {text}
    </Tag>
  );
}

export const StatusTag = styled(Tag)`
  .dot {
    border-radius: 50%;
  }
`;

const Stack = styled.div`
  display: inline-flex;
  align-items: center;

  .av {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 9px;
    font-weight: 700;
    color: var(--wp-text);
    background: var(--wp-surface-3);
    border: 2px solid var(--wp-surface);
    margin-left: -6px;

    &:first-child {
      margin-left: 0;
    }
  }

  .more {
    font-size: 11px;
    color: var(--wp-text-subtle);
    margin-left: 4px;
  }
`;

export function AssigneeStack({ assignees, max = 3 }) {
  if (!assignees.length) return null;
  const shown = assignees.slice(0, max);
  const names = assignees.map(getUserDisplayName).join(', ');
  return (
    <Stack title={names} aria-label={`Assigned to ${names}`}>
      {shown.map((a, i) => (
        <span className="av" key={a?._id || i}>
          {getUserInitials(a)}
        </span>
      ))}
      {assignees.length > max ? <span className="more">+{assignees.length - max}</span> : null}
    </Stack>
  );
}

const IconBtn = styled.button`
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

  &.ok:hover {
    color: var(--wp-success);
    background: var(--wp-success-bg);
  }

  &.danger:hover {
    color: var(--wp-error);
    background: var(--wp-error-bg);
  }
`;

/* --------------------------------------------------------------- card body */

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Title = styled.div`
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--wp-text);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-right: 4px;

  &[data-done='true'] {
    color: var(--wp-text-subtle);
    text-decoration: line-through;
  }
`;

const Preview = styled.div`
  font-size: 12px;
  line-height: 1.4;
  color: var(--wp-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  .spacer {
    flex: 1;
  }

  .img-count {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: var(--wp-text-subtle);
  }
`;

/** Hover toolbar; always visible on touch devices where hover does not exist. */
export const HoverBar = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 1px;
  padding: 2px;
  border-radius: var(--wp-radius);
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  box-shadow: var(--wp-shadow-sm);
  opacity: 0;
  pointer-events: none;

  @media (hover: none) {
    position: static;
    opacity: 1;
    pointer-events: auto;
    align-self: flex-end;
    box-shadow: none;
  }
`;

/**
 * Memoized card content. Parents pass stable `actions`/`can` objects and
 * primitive column info, so a card re-renders only when its task changes.
 */
export const TaskCardBody = memo(function TaskCardBody({
  task,
  isDone,
  nextStatus,
  nextTitle,
  doneStatus,
  reopenStatus,
  can,
  actions,
}) {
  const preview = getTaskPreview(task.description);
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn(task);
  };

  return (
    <Body>
      <Title data-done={isDone}>{task.title}</Title>
      {preview.text ? <Preview>{preview.text}</Preview> : null}
      <Meta>
        <PriorityTag priority={task.priority} />
        {!isDone && <DueTag dueDate={task.dueDate} />}
        {preview.imageCount > 0 && (
          <span className="img-count" title={`${preview.imageCount} image(s)`}>
            <ImageIcon size={12} aria-hidden />
            {preview.imageCount}
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="img-count" title={`${task.commentCount} comment(s)`}>
            <MessageSquare size={12} aria-hidden />
            {task.commentCount}
          </span>
        )}
        <span className="spacer" />
        <AssigneeStack assignees={getTaskAssignees(task)} />
      </Meta>

      {(can.update || can.assign || can.remove) && (
        <HoverBar className="card-actions" onClick={(e) => e.stopPropagation()}>
          {can.update && nextStatus && nextStatus !== doneStatus && (
            <IconBtn
              type="button"
              onClick={stop((t) => actions.move(t, nextStatus))}
              title={`Move to ${nextTitle}`}
              aria-label={`Move to ${nextTitle}`}
            >
              <ArrowRight size={14} />
            </IconBtn>
          )}
          {can.update && doneStatus && !isDone && (
            <IconBtn
              type="button"
              className="ok"
              onClick={stop((t) => actions.move(t, doneStatus))}
              title="Mark complete"
              aria-label="Mark complete"
            >
              <CheckCircle2 size={14} />
            </IconBtn>
          )}
          {can.update && isDone && reopenStatus && (
            <IconBtn
              type="button"
              onClick={stop((t) => actions.move(t, reopenStatus))}
              title="Reopen"
              aria-label="Reopen task"
            >
              <RotateCcw size={14} />
            </IconBtn>
          )}
          {can.update && (
            <IconBtn type="button" onClick={stop(actions.edit)} title="Edit" aria-label="Edit task">
              <Pencil size={14} />
            </IconBtn>
          )}
          {can.assign && (
            <IconBtn type="button" onClick={stop(actions.assign)} title="Assign" aria-label="Assign task">
              <UserPlus size={14} />
            </IconBtn>
          )}
          {can.remove && (
            <IconBtn
              type="button"
              className="danger"
              onClick={stop(actions.remove)}
              title="Delete"
              aria-label="Delete task"
            >
              <Trash2 size={14} />
            </IconBtn>
          )}
        </HoverBar>
      )}
    </Body>
  );
});

/* ----------------------------------------------------- list-view row actions */

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: flex-end;
`;

const MoveSelect = styled.select`
  height: 26px;
  max-width: 128px;
  padding: 0 6px;
  margin-right: 4px;
  border-radius: var(--wp-radius-sm);
  border: 1px solid var(--wp-input-border);
  background: var(--wp-input-bg);
  color: var(--wp-text-muted);
  font-size: 12px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }
`;

export const TaskRowActions = memo(function TaskRowActions({ task, columns, can, actions }) {
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn(task);
  };
  return (
    <RowActions onClick={(e) => e.stopPropagation()}>
      {can.update && (
        <MoveSelect
          value={task.status}
          aria-label="Change status"
          onChange={(e) => actions.move(task, e.target.value)}
        >
          {columns.map((c) => (
            <option key={c.status} value={c.status}>
              {c.title}
            </option>
          ))}
        </MoveSelect>
      )}
      {can.update && (
        <IconBtn type="button" onClick={stop(actions.edit)} title="Edit" aria-label="Edit task">
          <Pencil size={14} />
        </IconBtn>
      )}
      {can.assign && (
        <IconBtn type="button" onClick={stop(actions.assign)} title="Assign" aria-label="Assign task">
          <UserPlus size={14} />
        </IconBtn>
      )}
      {can.remove && (
        <IconBtn
          type="button"
          className="danger"
          onClick={stop(actions.remove)}
          title="Delete"
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </IconBtn>
      )}
    </RowActions>
  );
});
