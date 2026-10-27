/** Theme-aware semantic colors for badges, buttons, and status chips */

export const priorityStyle = (priority) => {
  const map = {
    urgent: { bg: 'var(--wp-error-bg)', color: 'var(--wp-error)', border: 'var(--wp-error-border)' },
    high: { bg: 'var(--wp-warning-bg)', color: 'var(--wp-warning)', border: 'var(--wp-warning-border)' },
    medium: { bg: 'var(--wp-info-bg)', color: 'var(--wp-info)', border: 'var(--wp-info-border)' },
    low: { bg: 'var(--wp-surface-2)', color: 'var(--wp-text-muted)', border: 'var(--wp-border)' },
  };
  return map[priority] || map.low;
};

export const dueStyle = (variant) => {
  const map = {
    overdue: { bg: 'var(--wp-error-bg)', color: 'var(--wp-error)', border: 'var(--wp-error-border)' },
    today: { bg: 'var(--wp-info-bg)', color: 'var(--wp-info)', border: 'var(--wp-info-border)' },
    upcoming: { bg: 'var(--wp-warning-bg)', color: 'var(--wp-warning)', border: 'var(--wp-warning-border)' },
  };
  return map[variant] || map.upcoming;
};

export const actionIconStyle = (type) => {
  const map = {
    completed: { color: 'var(--wp-success)', hoverBg: 'var(--wp-success-bg)' },
    danger: { color: 'var(--wp-error)', hoverBg: 'var(--wp-error-bg)' },
    edit: { color: 'var(--wp-primary)', hoverBg: 'var(--wp-primary-muted)' },
    assign: { color: '#8b5cf6', hoverBg: 'rgba(139, 92, 246, 0.12)' },
    default: { color: 'var(--wp-text-muted)', hoverBg: 'var(--wp-hover)' },
  };
  return map[type] || map.default;
};

/** Shared select/dropdown styling for styled-components */
export const selectFieldCss = `
  border: 1px solid var(--wp-input-border);
  background: var(--wp-input-bg);
  color: var(--wp-text);
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--wp-border-strong);
  }

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }
`;

export const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%2371717a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E")`;
