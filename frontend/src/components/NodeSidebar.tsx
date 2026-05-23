'use client';

import { useState, DragEvent } from 'react';
import { NODE_CATALOG, CATEGORIES, NodeCatalogItem } from '@/store/agentStore';
import { getLucideIcon } from '@/components/Icons';

export function NodeSidebar() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragStart = (event: DragEvent, item: NodeCatalogItem) => {
    event.dataTransfer.setData('application/reactflow-type', item.type);
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(item.defaultData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredCatalog = searchQuery.trim()
    ? NODE_CATALOG.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : NODE_CATALOG;

  const getNodeColor = (type: string) => {
    const map: Record<string, string> = {
      prompt: 'var(--node-prompt)',
      tool: 'var(--node-tool)',
      guardrail: 'var(--node-guardrail)',
      knowledge: 'var(--node-knowledge)',
      output: 'var(--node-output)',
      condition: 'var(--node-condition)',
      api: 'var(--node-api)',
      memory: 'var(--node-memory)',
    };
    return map[type] || 'var(--accent)';
  };

  const getNodeGlow = (type: string) => {
    const map: Record<string, string> = {
      prompt: 'var(--node-prompt-glow)',
      tool: 'var(--node-tool-glow)',
      guardrail: 'var(--node-guardrail-glow)',
      knowledge: 'var(--node-knowledge-glow)',
      output: 'var(--node-output-glow)',
      condition: 'var(--node-condition-glow)',
      api: 'var(--node-api-glow)',
      memory: 'var(--node-memory-glow)',
    };
    return map[type] || 'var(--accent-glow)';
  };

  return (
    <aside className="w-[256px] h-full bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
          Блоки
        </h2>
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук..."
            className="w-full pl-8 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const items = filteredCatalog.filter((item) => item.category === cat.id);
          if (items.length === 0) return null;
          const isCollapsed = collapsed[cat.id];

          return (
            <div key={cat.id} className="mb-1">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
                {getLucideIcon(cat.icon, "w-4 h-4 text-[var(--accent)]")}
                <span>{cat.label}</span>
                <span className="ml-auto text-[10px] font-normal opacity-60">{items.length}</span>
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="flex flex-col gap-1 mt-0.5 animate-fade-in" style={{ animationDuration: '0.3s' }}>
                  {items.map((item) => (
                    <div
                      key={`${item.type}-${item.label}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, item)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing active:scale-[0.97] active:opacity-80 border border-transparent hover:border-[var(--border-light)] transition-all duration-200 group"
                      style={{
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = getNodeGlow(item.type);
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0 transition-colors"
                        style={{ background: getNodeGlow(item.type) }}
                      >
                        {getLucideIcon(item.icon, "w-4 h-4 text-[var(--text-inverse)]")}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-[var(--text-primary)] block leading-tight truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)] leading-tight truncate block">
                          {item.description}
                        </span>
                      </div>
                      {/* Drag hint */}
                      <svg
                        className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-50 transition-opacity ml-auto flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <circle cx="9" cy="5" r="1" fill="currentColor" />
                        <circle cx="15" cy="5" r="1" fill="currentColor" />
                        <circle cx="9" cy="12" r="1" fill="currentColor" />
                        <circle cx="15" cy="12" r="1" fill="currentColor" />
                        <circle cx="9" cy="19" r="1" fill="currentColor" />
                        <circle cx="15" cy="19" r="1" fill="currentColor" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed text-center">
          Перетягніть блок на canvas
        </p>
      </div>
    </aside>
  );
}
