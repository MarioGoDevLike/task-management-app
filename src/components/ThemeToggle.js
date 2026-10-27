import React from 'react';
import styled from 'styled-components';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--wp-border);
  background: var(--wp-surface);
  color: var(--wp-text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover {
    background: var(--wp-surface-2);
    border-color: var(--wp-border-strong);
    color: var(--wp-text);
  }

  &:active {
    background: var(--wp-active);
  }

  .icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: var(--wp-text);
  }

  .label {
    @media (max-width: 640px) {
      display: none;
    }
  }
`;

const IconOnlyButton = styled(ToggleButton)`
  width: 36px;
  padding: 0;
  justify-content: center;
`;

export function ThemeToggle({ compact = false, className }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const label = isDark ? 'Light mode' : 'Dark mode';
  const Button = compact ? IconOnlyButton : ToggleButton;

  return (
    <Button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <span className="icon-wrap" aria-hidden>
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
      {!compact && <span className="label">{isDark ? 'Light' : 'Dark'}</span>}
    </Button>
  );
}

export default ThemeToggle;
