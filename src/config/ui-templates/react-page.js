/**
 * React Page Generator
 * Generates React functional page components with design token CSS.
 */

const { tokensToCSS } = require('./css-tokens');

/**
 * Generate a React page component and its CSS.
 * @param {string} name - Page name (kebab-case)
 * @param {object} options - { layout: 'centered'|'sidebar'|'full', sections: string[], style: 'css'|'scss'|'css-modules'|'tailwind' }
 * @param {object} tokens - Design tokens from extractTokensFromDesignMD
 * @returns {{ jsx: string, css: string }}
 */
function generateReactPage(name, options = {}, tokens = {}) {
  const pascalName = toPascalCase(name);
  const layout = options.layout || 'centered';
  const sections = options.sections || [];
  const style = options.style || 'css';
  const cssFileName = style === 'css-modules' ? `${name}.module.css` : `${name}.css`;
  const importPath = `./${cssFileName}`;

  const layoutClass = layout === 'sidebar' ? `${name}-layout--sidebar` : layout === 'full' ? `${name}-layout--full` : `${name}-layout--centered`;

  const sectionJSX = sections.length > 0
    ? sections.map(sec => {
        const secPascal = toPascalCase(sec);
        return `      <section className="${name}-${sec}">\n        <h2>${secPascal}</h2>\n        {/* ${secPascal} content */}\n      </section>`;
      }).join('\n')
    : '        {/* Add content here */}';

  const jsx = `import React from 'react';
import '${importPath}';

export default function ${pascalName}() {
  return (
    <div className="${name}-page ${layoutClass}">
      <header className="${name}-header">
        <h1>${pascalName}</h1>
      </header>
      <main className="${name}-main">
${sectionJSX}
      </main>
      <footer className="${name}-footer">
        <p>&copy; {new Date().getFullYear()} ${pascalName}</p>
      </footer>
    </div>
  );
}
`;

  const css = generatePageCSS(name, layout, sections, tokens);

  return { jsx, css, cssFileName };
}

/**
 * Generate CSS for a page using design tokens.
 */
function generatePageCSS(name, layout, sections, tokens) {
  const tokenCSS = tokensToCSS(tokens);
  const lines = [
    tokenCSS,
    '',
    `.${name}-page {`,
    `  min-height: 100vh;`,
    `  display: flex;`,
    `  flex-direction: column;`,
    `  font-family: var(--font-family-base, system-ui, sans-serif);`,
    `  color: var(--color-gray-800, #1f2937);`,
    `  background: var(--color-gray-50, #f9fafb);`,
    `}`,
    '',
  ];

  // Header
  lines.push(
    `.${name}-header {`,
    `  padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);`,
    `  background: var(--color-gray-50, #f9fafb);`,
    `  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);`,
    `}`,
    '',
    `.${name}-header h1 {`,
    `  margin: 0;`,
    `  font-size: var(--text-3xl, 1.875rem);`,
    `  font-weight: 700;`,
    `  color: var(--color-gray-900, #111827);`,
    `}`,
    '',
  );

  // Main
  lines.push(
    `.${name}-main {`,
    `  flex: 1;`,
  );

  if (layout === 'centered') {
    lines.push(
      `  max-width: 1200px;`,
      `  margin: 0 auto;`,
      `  padding: var(--spacing-lg, 1.5rem);`,
      `  width: 100%;`,
      `  box-sizing: border-box;`,
    );
  } else if (layout === 'sidebar') {
    lines.push(
      `  display: grid;`,
      `  grid-template-columns: 240px 1fr;`,
      `  gap: var(--spacing-md, 1rem);`,
      `  padding: var(--spacing-lg, 1.5rem);`,
    );
  } else {
    lines.push(
      `  padding: var(--spacing-lg, 1.5rem);`,
      `  width: 100%;`,
      `  box-sizing: border-box;`,
    );
  }

  lines.push('}', '');

  // Footer
  lines.push(
    `.${name}-footer {`,
    `  padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);`,
    `  border-top: 1px solid var(--color-gray-200, #e5e7eb);`,
    `  text-align: center;`,
    `  color: var(--color-gray-500, #6b7280);`,
    `  font-size: var(--text-sm, 0.875rem);`,
    `}`,
    '',
  );

  // Sections
  for (const sec of sections) {
    lines.push(
      `.${name}-${sec} {`,
      `  margin-bottom: var(--spacing-lg, 1.5rem);`,
      `  padding: var(--spacing-lg, 1.5rem);`,
      `  background: white;`,
      `  border: 1px solid var(--color-gray-200, #e5e7eb);`,
      `  border-radius: var(--radius-lg, 0.75rem);`,
      `}`,
      '',
    );
  }

  return lines.join('\n');
}

function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

module.exports = { generateReactPage };
