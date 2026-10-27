const fs = require('fs');
const path = require('path');

const files = [
  'src/components/TaskManagement.js',
  'src/components/SettingsPage.js',
  'src/components/AdminDashboard.js',
  'src/components/CalendarPage.js',
  'src/components/CommandPalette.js',
];

const replacements = [
  [/background:\s*white\b/g, 'background: var(--wp-surface)'],
  [/background:\s*#fff\b/g, 'background: var(--wp-surface)'],
  [/background:\s*#ffffff\b/g, 'background: var(--wp-surface)'],
  [/color:\s*#0f172a\b/g, 'color: var(--wp-text)'],
  [/color:\s*#18181b\b/g, 'color: var(--wp-text)'],
  [/color:\s*#111827\b/g, 'color: var(--wp-text)'],
  [/color:\s*#1f2937\b/g, 'color: var(--wp-text)'],
  [/color:\s*#374151\b/g, 'color: var(--wp-text-muted)'],
  [/color:\s*#475569\b/g, 'color: var(--wp-text-muted)'],
  [/color:\s*#64748b\b/g, 'color: var(--wp-text-muted)'],
  [/color:\s*#6b7280\b/g, 'color: var(--wp-text-muted)'],
  [/color:\s*#4b5563\b/g, 'color: var(--wp-text-muted)'],
  [/color:\s*#94a3b8\b/g, 'color: var(--wp-text-subtle)'],
  [/color:\s*#9ca3af\b/g, 'color: var(--wp-text-subtle)'],
  [/color:\s*#a1a1aa\b/g, 'color: var(--wp-text-subtle)'],
  [/border:\s*1px solid #e2e8f0\b/g, 'border: 1px solid var(--wp-border)'],
  [/border:\s*1px solid #e8ecf0\b/g, 'border: 1px solid var(--wp-border)'],
  [/border:\s*1px solid #e5e7eb\b/g, 'border: 1px solid var(--wp-border)'],
  [/border:\s*1px solid #e4e4e7\b/g, 'border: 1px solid var(--wp-border)'],
  [/border:\s*2px solid #e2e8f0\b/g, 'border: 2px solid var(--wp-border)'],
  [/border-bottom:\s*1px solid #e2e8f0\b/g, 'border-bottom: 1px solid var(--wp-border)'],
  [/border-bottom:\s*1px solid #f1f5f9\b/g, 'border-bottom: 1px solid var(--wp-border-subtle)'],
  [/border-top:\s*1px solid #e2e8f0\b/g, 'border-top: 1px solid var(--wp-border)'],
  [/border-top:\s*1px solid #e8ecf0\b/g, 'border-top: 1px solid var(--wp-border)'],
  [/border-color:\s*#e2e8f0\b/g, 'border-color: var(--wp-border)'],
  [/border-color:\s*#cbd5e1\b/g, 'border-color: var(--wp-border-strong)'],
  [/border-color:\s*#d1d5db\b/g, 'border-color: var(--wp-border-strong)'],
  [/background:\s*#f8fafc\b/g, 'background: var(--wp-surface-2)'],
  [/background:\s*#f1f5f9\b/g, 'background: var(--wp-surface-2)'],
  [/background:\s*#f4f4f5\b/g, 'background: var(--wp-surface-2)'],
  [/background:\s*#fafbfc\b/g, 'background: var(--wp-bg)'],
  [/background:\s*#f5f7fb\b/g, 'background: var(--wp-bg)'],
  [/rgba\(15,\s*23,\s*42,\s*0\.55\)/g, 'var(--wp-overlay)'],
  [/rgba\(0,\s*0,\s*0,\s*0\.6\)/g, 'var(--wp-overlay)'],
  [/rgba\(0,\s*0,\s*0,\s*0\.45\)/g, 'var(--wp-overlay)'],
  [/box-shadow:\s*0 20px 60px rgba\(0, 0, 0, 0\.3\)/g, 'box-shadow: var(--wp-shadow-xl)'],
  [/box-shadow:\s*0 20px 40px rgba\(15, 23, 42, 0\.08\)/g, 'box-shadow: var(--wp-shadow-md)'],
  [/box-shadow:\s*0 12px 28px rgba\(15, 23, 42, 0\.08\)/g, 'box-shadow: var(--wp-shadow-md)'],
  [/box-shadow:\s*0 8px 28px rgba\(15, 23, 42, 0\.04\)/g, 'box-shadow: var(--wp-shadow-sm)'],
  [/box-shadow:\s*0 4px 12px rgba\(0, 0, 0, 0\.06\)/g, 'box-shadow: var(--wp-shadow-sm)'],
  [/box-shadow:\s*0 4px 12px rgba\(0, 0, 0, 0\.08\)/g, 'box-shadow: var(--wp-shadow-sm)'],
  [/box-shadow:\s*0 1px 3px rgba\(0, 0, 0, 0\.05\)/g, 'box-shadow: var(--wp-shadow-sm)'],
  [/box-shadow:\s*0 1px 2px rgba\(0, 0, 0, 0\.03\)/g, 'box-shadow: var(--wp-shadow-sm)'],
  [/color:\s*#334155\b/g, 'color: var(--wp-text)'],
  [/color:\s*#2563eb\b/g, 'color: var(--wp-primary)'],
  [/border:\s*1\.5px solid #e2e8f0\b/g, 'border: 1.5px solid var(--wp-border)'],
  [/border:\s*2px solid #e5e7eb\b/g, 'border: 2px solid var(--wp-border)'],
  [/background:\s*linear-gradient\(135deg,\s*#ffffff 0%,\s*#eff6ff 100%\)/g, 'background: var(--wp-input-bg)'],
  [/border:\s*1px solid #bfdbfe\b/g, 'border: 1px solid var(--wp-primary-border)'],
  [/border:\s*2px dashed #bfdbfe\b/g, 'border: 2px dashed var(--wp-primary-border)'],
  [/border:\s*1px dashed #dbeafe\b/g, 'border: 1px dashed var(--wp-primary-border)'],
];

/**
 * Second pass: remaining Tailwind-style hex literals → theme tokens.
 * Only applied on CSS declaration lines (e.g. `color: ...;`) so data values
 * such as kanban column colors stay untouched.
 */
const hexTokens = {
  '#3b82f6': 'var(--wp-primary)',
  '#2563eb': 'var(--wp-primary)',
  '#60a5fa': 'var(--wp-primary)',
  '#1d4ed8': 'var(--wp-primary-hover)',
  '#1e40af': 'var(--wp-primary)',
  '#1e3a8a': 'var(--wp-primary)',
  '#eff6ff': 'var(--wp-primary-muted)',
  '#dbeafe': 'var(--wp-primary-muted)',
  '#bfdbfe': 'var(--wp-primary-border)',
  '#93c5fd': 'var(--wp-primary-border)',
  '#0f172a': 'var(--wp-text)',
  '#1e293b': 'var(--wp-text)',
  '#334155': 'var(--wp-text)',
  '#64748b': 'var(--wp-text-muted)',
  '#475569': 'var(--wp-text-muted)',
  '#4b5563': 'var(--wp-text-muted)',
  '#94a3b8': 'var(--wp-text-subtle)',
  '#e2e8f0': 'var(--wp-border)',
  '#e8ecf0': 'var(--wp-border)',
  '#e5e7eb': 'var(--wp-border)',
  '#cbd5e1': 'var(--wp-border-strong)',
  '#d1d5db': 'var(--wp-border-strong)',
  '#f1f5f9': 'var(--wp-surface-2)',
  '#f8fafc': 'var(--wp-surface-2)',
  '#f9fafb': 'var(--wp-surface-2)',
  '#ef4444': 'var(--wp-error)',
  '#dc2626': 'var(--wp-error)',
  '#991b1b': 'var(--wp-error)',
  '#fee2e2': 'var(--wp-error-bg)',
  '#fef2f2': 'var(--wp-error-bg)',
  '#fecaca': 'var(--wp-error-border)',
  '#f59e0b': 'var(--wp-warning)',
  '#92400e': 'var(--wp-warning)',
  '#fef3c7': 'var(--wp-warning-bg)',
  '#10b981': 'var(--wp-success)',
  '#065f46': 'var(--wp-success)',
  '#d1fae5': 'var(--wp-success-bg)',
  '#f0fdf4': 'var(--wp-success-bg)',
  '#047857': 'var(--wp-success)',
  '#111827': 'var(--wp-text)',
  '#374151': 'var(--wp-text-muted)',
  '#6b7280': 'var(--wp-text-muted)',
  '#9ca3af': 'var(--wp-text-subtle)',
  '#f3f4f6': 'var(--wp-surface-2)',
};
const DECLARATION_LINE = /^\s*(?:background|color|border|outline|fill|stroke|box-shadow)[\w-]*\s*:/;
const PURPLE_GRADIENT = /linear-gradient\(135deg,\s*#667eea 0%,\s*#764ba2 100%\)/g;

function mapHexOnDeclarationLines(content) {
  return content
    .replace(PURPLE_GRADIENT, 'var(--wp-primary)')
    .split('\n')
    .map((line) => {
      if (!DECLARATION_LINE.test(line)) return line;
      let out = line.replace(/\bcolor:\s*(?:#fff|#ffffff|white)\b/gi, 'color: var(--wp-on-primary)');
      out = out.replace(/(background(?:-color)?:\s*)(?:#fff|#ffffff|white)\b/gi, '$1var(--wp-surface)');
      return out.replace(/#[0-9a-fA-F]{6}\b/g, (hex) => hexTokens[hex.toLowerCase()] || hex);
    })
    .join('\n');
}

/**
 * Third pass: quoted hex in JSX style objects and color props, e.g.
 * `style={{ color: '#64748b' }}` or `<Icon color="#2563eb" />`.
 */
const INLINE_COLOR = /\b(color|background|backgroundColor|borderColor|bg|fill|stroke)(=|:\s*)(['"])(#[0-9a-fA-F]{6})\3/g;

function mapInlineHex(content) {
  return content.replace(INLINE_COLOR, (match, prop, sep, quote, hex) => {
    const token = hexTokens[hex.toLowerCase()];
    return token ? `${prop}${sep}${quote}${token}${quote}` : match;
  });
}

const root = path.join(__dirname, '..');

files.forEach((rel) => {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  replacements.forEach(([pattern, replacement]) => {
    const next = content.replace(pattern, replacement);
    if (next !== content) {
      content = next;
      changed = true;
    }
  });
  const mapped = mapInlineHex(mapHexOnDeclarationLines(content));
  if (mapped !== content) {
    content = mapped;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Updated:', rel);
  }
});

console.log('Done.');
