/** Due-date helpers shared by the task board and task cards. */

export function isYmdDateString(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function toDateInputValue(value) {
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

/** @returns {'overdue' | 'today' | 'upcoming' | null} */
export function getDueVariant(dueDate) {
  const bounds = getDueDayBounds(dueDate);
  if (!bounds) return null;
  const now = new Date();
  if (bounds.end.getTime() < now.getTime()) return 'overdue';
  if (bounds.start.getTime() <= now.getTime() && bounds.end.getTime() >= now.getTime()) return 'today';
  return 'upcoming';
}

export function formatDueLabel(dueDate) {
  const bounds = getDueDayBounds(dueDate);
  if (!bounds) return '';
  const due = bounds.start;
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
