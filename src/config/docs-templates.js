/**
 * Docs Templates
 * Template functions for generating a static HTML documentation site.
 */

// ─── CSS ──

function generateDocsCSS(designTokens) {
  const colors = designTokens && designTokens.colors
    ? designTokens.colors
    : {
        primary: '#3B82F6',
        secondary: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        bg: '#FFFFFF',
        bgSecondary: '#F9FAFB',
        text: '#111827',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        code: '#F3F4F6',
        codeText: '#DC2626',
      };

  const font = (designTokens && designTokens.fontFamily) || 'Inter, system-ui, -apple-system, sans-serif';
  const radius = (designTokens && designTokens.borderRadius) || { sm: '4px', md: '8px', lg: '12px' };

  return `/* STDD Docs Site */
:root {
  --primary: ${colors.primary};
  --primary-dark: ${colors.primary}dd;
  --secondary: ${colors.secondary};
  --success: ${colors.success};
  --warning: ${colors.warning};
  --error: ${colors.error};
  --bg: ${colors.bg || '#FFFFFF'};
  --bg-secondary: ${colors.bgSecondary || '#F9FAFB'};
  --text: ${colors.text || '#111827'};
  --text-secondary: ${colors.textSecondary || '#6B7280'};
  --border: ${colors.border || '#E5E7EB'};
  --code-bg: ${colors.code || '#F3F4F6'};
  --code-text: ${colors.codeText || '#DC2626'};
  --font: ${font};
  --radius-sm: ${radius.sm || '4px'};
  --radius-md: ${radius.md || '8px'};
  --radius-lg: ${radius.lg || '12px'};
  --sidebar-width: 260px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; -webkit-font-smoothing: antialiased; }

body {
  font-family: var(--font);
  color: var(--text);
  background: var(--bg);
  line-height: 1.7;
}

a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Layout */
.layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  overflow-y: auto;
  padding: 24px 16px;
  z-index: 10;
}

.sidebar-logo {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 24px;
  padding: 0 8px;
}

.sidebar-logo small {
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-top: 2px;
}

.sidebar-nav { list-style: none; }

.sidebar-nav li {
  margin-bottom: 2px;
}

.sidebar-nav a {
  display: block;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 14px;
  transition: background 0.15s;
}

.sidebar-nav a:hover {
  background: var(--border);
  text-decoration: none;
}

.sidebar-nav a.active {
  background: var(--primary);
  color: #fff;
}

.sidebar-section {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  padding: 16px 12px 4px;
}

/* Main */
.main {
  margin-left: var(--sidebar-width);
  flex: 1;
  min-width: 0;
}

.main-content {
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 32px 80px;
}

/* Breadcrumb */
.breadcrumb {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.breadcrumb a { color: var(--text-secondary); }
.breadcrumb a:hover { color: var(--primary); }
.breadcrumb span { margin: 0 6px; }

/* Typography */
h1, h2, h3, h4 {
  color: var(--text);
  line-height: 1.3;
  margin-top: 2em;
  margin-bottom: 0.6em;
}

h1 { font-size: 2em; border-bottom: 2px solid var(--border); padding-bottom: 12px; margin-top: 0; }
h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.1em; }

p { margin-bottom: 1em; }

/* Code */
code {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin-bottom: 1em;
  font-size: 14px;
  line-height: 1.6;
}

pre code {
  background: none;
  color: inherit;
  padding: 0;
  font-size: inherit;
}

/* Blockquote */
blockquote {
  border-left: 4px solid var(--primary);
  background: var(--bg-secondary);
  padding: 12px 20px;
  margin-bottom: 1em;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
}

blockquote p:last-child { margin-bottom: 0; }

/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
  font-size: 14px;
}

th, td {
  border: 1px solid var(--border);
  padding: 10px 14px;
  text-align: left;
}

th {
  background: var(--bg-secondary);
  font-weight: 600;
}

tr:nth-child(even) { background: var(--bg-secondary); }

/* Lists */
ul, ol { padding-left: 24px; margin-bottom: 1em; }
li { margin-bottom: 4px; }

/* HR */
hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2em 0;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.badge-primary { background: var(--primary); color: #fff; }
.badge-success { background: var(--success); color: #fff; }
.badge-warning { background: var(--warning); color: #fff; }
.badge-error   { background: var(--error); color: #fff; }

/* Prev/Next */
.page-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.page-nav a {
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

.page-nav .label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

/* Index page hero */
.hero {
  text-align: center;
  padding: 60px 0 40px;
}

.hero h1 {
  font-size: 2.5em;
  border: none;
  padding: 0;
  margin-bottom: 16px;
}

.hero .subtitle {
  font-size: 1.2em;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto 32px;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 32px;
}

.quick-link {
  display: block;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.quick-link:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  text-decoration: none;
}

.quick-link h3 {
  font-size: 16px;
  margin: 0 0 4px;
  color: var(--primary);
}

.quick-link p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 32px;
}

.feature {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.feature h4 { margin-top: 0; color: var(--primary); }
.feature p { font-size: 14px; color: var(--text-secondary); }

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    position: relative;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .layout { flex-direction: column; }
  .main { margin-left: 0; }
  .main-content { padding: 24px 16px 48px; }
  .quick-links { grid-template-columns: 1fr; }
}`;
}

// ─── Index Page ──

function generateIndexPage(sections, projectName) {
  const links = sections.map(s => {
    if (!s.path) return '';
    return `<a href="${s.path}" class="quick-link">
  <h3>${escapeHTML(s.title)}</h3>
  <p>${escapeHTML(s.description || '')}</p>
</a>`;
  }).join('\n');

  const navItems = sections.filter(s => s.path).map(s =>
    `<li><a href="${s.path}">${escapeHTML(s.title)}</a></li>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(projectName)} Documentation</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-logo">${escapeHTML(projectName)}<small>Documentation</small></div>
    <ul class="sidebar-nav">
      ${navItems}
    </ul>
  </aside>
  <main class="main">
    <div class="main-content">
      <div class="hero">
        <h1>${escapeHTML(projectName)}</h1>
        <p class="subtitle">Smart Team-Driven Development — AI-powered full lifecycle development platform</p>
      </div>
      <div class="quick-links">
        ${links}
      </div>
    </div>
  </main>
</div>
</body>
</html>`;
}

// ─── Section Page ──

function generateSectionPage(title, content, navItems, projectName) {
  const sidebarNav = navItems.map(n => {
    const active = n.title === title ? ' class="active"' : '';
    return `<li><a href="${n.path}"${active}>${escapeHTML(n.title)}</a></li>`;
  }).join('\n');

  const idx = navItems.findIndex(n => n.title === title);
  const prev = idx > 0 ? navItems[idx - 1] : null;
  const next = idx < navItems.length - 1 ? navItems[idx + 1] : null;

  const prevNext = (prev || next) ? `<div class="page-nav">
${prev ? `<a href="${prev.path}"><span class="label">Previous</span>${escapeHTML(prev.title)}</a>` : '<span></span>'}
${next ? `<a href="${next.path}" style="text-align:right"><span class="label">Next</span>${escapeHTML(next.title)}</a>` : '<span></span>'}
</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)} — ${escapeHTML(projectName)} Docs</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-logo">${escapeHTML(projectName)}<small>Documentation</small></div>
    <ul class="sidebar-nav">
      ${sidebarNav}
    </ul>
  </aside>
  <main class="main">
    <div class="main-content">
      <div class="breadcrumb">
        <a href="index.html">Home</a><span>/</span>${escapeHTML(title)}
      </div>
      ${content}
      ${prevNext}
    </div>
  </main>
</div>
</body>
</html>`;
}

// ─── Simple Markdown to HTML ──

function simpleMarkdownToHTML(md) {
  if (!md) return '';
  let html = md;

  // Extract and protect code blocks first
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHTML(code.trimEnd())}</code></pre>`);
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Extract and protect inline code
  const inlineCodes = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escapeHTML(code)}</code>`);
    return `%%INLINE_${idx}%%`;
  });

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr>');

  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Tables
  html = convertTables(html);

  // Unordered lists
  html = html.replace(/(^- .+\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('\n');
    return `<ul>\n${items}\n</ul>`;
  });

  // Ordered lists
  html = html.replace(/(^\d+\. .+\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('\n');
    return `<ol>\n${items}\n</ol>`;
  });

  // Paragraphs: wrap lines that are not already wrapped in block elements
  html = wrapParagraphs(html);

  // Restore code blocks and inline code
  for (let i = 0; i < codeBlocks.length; i++) {
    html = html.replace(`%%CODEBLOCK_${i}%%`, codeBlocks[i]);
  }
  for (let i = 0; i < inlineCodes.length; i++) {
    html = html.replace(`%%INLINE_${i}%%`, inlineCodes[i]);
  }

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function convertTables(html) {
  return html.replace(/((^\|.+\|$\n?)+)/gm, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return block;

    // Detect separator row (|---|---|)
    const sepIdx = rows.findIndex(r => /^[\s|:-]+$/.test(r));
    if (sepIdx < 0) return block;

    const headerCells = parseCells(rows[0]);
    const dataRows = rows.slice(sepIdx + 1);

    let table = '<table>\n<thead>\n<tr>\n';
    for (const cell of headerCells) {
      table += `<th>${cell.trim()}</th>\n`;
    }
    table += '</tr>\n</thead>\n<tbody>\n';

    for (const row of dataRows) {
      const cells = parseCells(row);
      table += '<tr>\n';
      for (const cell of cells) {
        table += `<td>${cell.trim()}</td>\n`;
      }
      table += '</tr>\n';
    }

    table += '</tbody>\n</table>';
    return table;
  });
}

function parseCells(row) {
  return row.split('|').slice(1, -1);
}

function wrapParagraphs(html) {
  const blockTags = new Set([
    'h1', 'h2', 'h3', 'h4', 'pre', 'ul', 'ol', 'table', 'blockquote', 'hr', 'div',
  ]);

  const lines = html.split('\n');
  const result = [];
  let buffer = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (buffer.length) {
        result.push('<p>' + buffer.join('\n') + '</p>');
        buffer = [];
      }
      continue;
    }

    const isBlock = blockTags.some(tag => trimmed.startsWith(`<${tag}`) || trimmed.startsWith(`<${tag}>`));
    const isSelfClosing = trimmed.match(/^<(hr|br|img)\b/);

    if (isBlock || isSelfClosing) {
      if (buffer.length) {
        result.push('<p>' + buffer.join('\n') + '</p>');
        buffer = [];
      }
      result.push(line);
    } else {
      buffer.push(trimmed);
    }
  }

  if (buffer.length) {
    result.push('<p>' + buffer.join('\n') + '</p>');
  }

  return result.join('\n');
}

// ─── Search Index ──

function generateSearchIndex(pages) {
  const entries = pages.map(p => ({
    title: p.title,
    path: p.path,
    content: (p.content || '').replace(/[#*`>\[\]()!|_-]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200),
  }));
  return JSON.stringify(entries, null, 2);
}

// ─── Utilities ──

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  generateDocsCSS,
  generateIndexPage,
  generateSectionPage,
  simpleMarkdownToHTML,
  generateSearchIndex,
  escapeHTML,
};
