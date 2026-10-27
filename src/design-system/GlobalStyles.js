import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  /* React Quill */
  .ql-toolbar.ql-snow {
    border-color: var(--wp-border) !important;
    background: var(--wp-surface-2) !important;
    border-radius: 8px 8px 0 0;
  }

  .ql-container.ql-snow {
    border-color: var(--wp-border) !important;
    background: var(--wp-input-bg) !important;
    color: var(--wp-text) !important;
    border-radius: 0 0 8px 8px;
  }

  .ql-editor {
    color: var(--wp-text);
    min-height: 120px;
  }

  .ql-editor.ql-blank::before {
    color: var(--wp-input-placeholder) !important;
    font-style: normal;
  }

  .ql-snow .ql-stroke {
    stroke: var(--wp-text-muted) !important;
  }

  .ql-snow .ql-fill {
    fill: var(--wp-text-muted) !important;
  }

  .ql-snow .ql-picker {
    color: var(--wp-text-muted) !important;
  }

  .ql-snow .ql-picker-options {
    background: var(--wp-surface-elevated) !important;
    border-color: var(--wp-border) !important;
  }

  .ql-snow .ql-picker-item:hover {
    color: var(--wp-primary) !important;
  }

  .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-label,
  .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
    border-color: var(--wp-border) !important;
  }

  .ql-snow.ql-toolbar button:hover,
  .ql-snow .ql-toolbar button:hover,
  .ql-snow.ql-toolbar button:focus,
  .ql-snow .ql-toolbar button:focus,
  .ql-snow.ql-toolbar button.ql-active,
  .ql-snow .ql-toolbar button.ql-active {
    color: var(--wp-primary) !important;
  }

  .ql-snow.ql-toolbar button:hover .ql-stroke,
  .ql-snow .ql-toolbar button:hover .ql-stroke,
  .ql-snow.ql-toolbar button.ql-active .ql-stroke,
  .ql-snow .ql-toolbar button.ql-active .ql-stroke {
    stroke: var(--wp-primary) !important;
  }

  /* Native form elements fallback */
  select,
  textarea,
  input:not([type='checkbox']):not([type='radio']) {
    color-scheme: inherit;
  }

  /* React Hot Toast */
  [data-theme='dark'] .react-hot-toast {
    --toast-bg: var(--wp-surface-elevated);
    --toast-border: var(--wp-border);
  }
`;

export default GlobalStyles;
