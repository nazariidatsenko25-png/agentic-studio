'use client';

/**
 * Lightweight Markdown renderer for chat messages.
 * Handles: tables, headers, bold, italic, code, links, lists, line breaks.
 * No external dependencies — avoids ESM/Babel compatibility issues.
 */

import React from 'react';

type MarkdownProps = {
  content: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Bold, italic, code, links
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    if (match[1]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-semibold text-[var(--text-primary)]">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      // `code`
      parts.push(<code key={match.index} className="bg-[var(--bg-tertiary)] px-1 py-0.5 rounded text-[var(--accent)] text-[11px] font-mono-brand">{match[6]}</code>);
    } else if (match[7]) {
      // [text](url)
      parts.push(<a key={match.index} href={match[9]} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">{match[8]}</a>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts;
}

function renderTable(lines: string[]): React.ReactNode {
  const rows = lines.filter(l => !l.match(/^\|[\s-:|]+\|$/)); // Remove separator row
  if (rows.length === 0) return null;

  const parseRow = (row: string) =>
    row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(cell => cell.trim());

  const headerCells = parseRow(rows[0]);
  const bodyRows = rows.slice(1).map(parseRow);

  return (
    <div className="overflow-x-auto my-2 rounded-lg border border-[var(--border)]">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-[var(--bg-tertiary)]">
          <tr>
            {headerCells.map((cell, i) => (
              <th key={i} className="px-2.5 py-1.5 text-left font-semibold text-[var(--text-primary)] border-b border-[var(--border)]">
                {parseInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className="hover:bg-[var(--bg-elevated)] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-2.5 py-1.5 border-b border-[var(--border)] text-[var(--text-secondary)]">
                  {parseInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SimpleMarkdown({ content }: MarkdownProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection (starts with |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      elements.push(<React.Fragment key={`table-${i}`}>{renderTable(tableLines)}</React.Fragment>);
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++; // skip opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={`code-${i}`} className="bg-[var(--bg-primary)] border border-[var(--border)] p-2 rounded-lg text-xs font-mono-brand overflow-x-auto my-1.5">
          <code className="text-[var(--text-secondary)]">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3-${i}`} className="text-sm font-semibold mt-2 mb-1 text-[var(--text-primary)]">{parseInline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${i}`} className="text-sm font-bold mt-2.5 mb-1 text-[var(--text-primary)]">{parseInline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${i}`} className="text-base font-bold mt-3 mb-1.5 text-[var(--text-primary)]">{parseInline(line.slice(2))}</h1>);
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[\s]*[-*]\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s/)) {
        listItems.push(lines[i].replace(/^[\s]*[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-1 space-y-0.5">
          {listItems.map((item, li) => (
            <li key={li} className="text-[var(--text-secondary)]">{parseInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^[\s]*\d+\.\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s/)) {
        listItems.push(lines[i].replace(/^[\s]*\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside my-1 space-y-0.5">
          {listItems.map((item, li) => (
            <li key={li} className="text-[var(--text-secondary)]">{parseInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^[\s]*---[\s]*$/)) {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-[var(--border)]" />);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-0.5 leading-relaxed text-[var(--text-secondary)]">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div className="markdown-content">{elements}</div>;
}
