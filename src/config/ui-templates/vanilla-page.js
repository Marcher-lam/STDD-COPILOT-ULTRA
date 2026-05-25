/**
 * Vanilla HTML Page Generator
 * Generates full HTML pages with inline CSS using design tokens.
 */

const { tokensToCSS } = require('./css-tokens');

/**
 * Generate a full HTML page with inline CSS from design tokens.
 * @param {string} name - Page name
 * @param {object} options - { layout, sections, style }
 * @param {object} tokens - Design tokens
 * @returns {string} Full HTML string
 */
function generateVanillaPage(name, options = {}, tokens = {}) {
  const title = toTitleCase(name);
  const layout = options.layout || 'centered';
  const sections = options.sections || [];
  const tokenCSS = tokensToCSS(tokens);

  const layoutCSS = layout === 'sidebar'
    ? `main { display: grid; grid-template-columns: 240px 1fr; gap: var(--spacing-md, 1rem); }`
    : layout === 'full'
      ? `main { width: 100%; }`
      : `main { max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }`;

  const sectionsHTML = sections.length > 0
    ? sections.map(sec => `    <section class="section">
      <h2>${toTitleCase(sec)}</h2>
      <p>${toTitleCase(sec)} content goes here.</p>
    </section>`).join('\n')
    : `    <section class="section">
      <h2>Welcome</h2>
      <p>Page content goes here.</p>
    </section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
  ${tokenCSS}

  *, *::before, *::after { box-sizing: border-box; margin: 0; }

  body {
    font-family: var(--font-family-base, system-ui, sans-serif);
    color: var(--color-gray-800, #1f2937);
    background: var(--color-gray-50, #f9fafb);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
    background: white;
    border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  header h1 {
    font-size: var(--text-xl, 1.25rem);
    font-weight: 700;
    color: var(--color-gray-900, #111827);
  }

  nav a {
    color: var(--color-gray-600, #4b5563);
    text-decoration: none;
    font-size: var(--text-sm, 0.875rem);
    margin-left: var(--spacing-md, 1rem);
  }

  nav a:hover { color: var(--color-primary, #3b82f6); }

  ${layoutCSS}

  main {
    flex: 1;
    padding: var(--spacing-lg, 1.5rem);
  }

  .section {
    margin-bottom: var(--spacing-lg, 1.5rem);
    padding: var(--spacing-lg, 1.5rem);
    background: white;
    border: 1px solid var(--color-gray-200, #e5e7eb);
    border-radius: var(--radius-lg, 0.75rem);
  }

  .section h2 {
    font-size: var(--text-xl, 1.25rem);
    font-weight: 600;
    margin-bottom: var(--spacing-sm, 0.5rem);
    color: var(--color-gray-900, #111827);
  }

  .section p {
    color: var(--color-gray-600, #4b5563);
    line-height: 1.6;
  }

  footer {
    padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
    border-top: 1px solid var(--color-gray-200, #e5e7eb);
    text-align: center;
    color: var(--color-gray-500, #6b7280);
    font-size: var(--text-sm, 0.875rem);
  }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <nav>
      <a href="#">Home</a>
      <a href="#">About</a>
      <a href="#">Contact</a>
    </nav>
  </header>

  <main>
${sectionsHTML}
  </main>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${title}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

function toTitleCase(str) {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

module.exports = { generateVanillaPage };
