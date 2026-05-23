import { Handle, Position } from 'reactflow';
import { useStore } from '@/store/agentStore';
import { NodeAddMenu } from '@/components/NodeAddMenu';
import { getLucideIcon } from '@/components/Icons';

export function KnowledgeNode({ id, data }: { id: string; data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);

  return (
    <div
      className="relative bg-[var(--bg-card)] shadow-lg rounded-xl border border-[var(--border)] overflow-visible min-w-[320px] transition-all duration-300 hover:border-[var(--node-knowledge)] hover:shadow-[0_0_24px_var(--node-knowledge-glow)] group/node animate-scale-in"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !top-0 !-translate-x-1/2 !-translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-knowledge-glow)]" style={{ background: 'var(--border)' }} />
      </Handle>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: 'var(--node-knowledge-glow)' }}
          >
            {getLucideIcon('BookOpen')}
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Knowledge Base</span>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Тип джерела
          </label>
          <div className="flex bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-1 gap-1">
            {(['url', 'text', 'file'] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateNodeData(id, { source_type: t })}
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm"
                style={{
                  background: data.source_type === t ? 'var(--node-knowledge-glow)' : 'transparent',
                  color: data.source_type === t ? 'var(--node-knowledge)' : 'var(--text-tertiary)',
                  boxShadow: data.source_type === t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            {data.source_type === 'url' ? 'URL' : data.source_type === 'file' ? 'Шлях до файлу' : 'Текст'}
          </label>
          {data.source_type === 'text' ? (
            <textarea
              className="w-full p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs h-20 focus:ring-1 focus:ring-[var(--node-knowledge)] focus:border-[var(--node-knowledge)] hover:border-[var(--text-tertiary)] outline-none resize-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-inner"
              placeholder="Введіть текст знань..."
              value={data.source_value || ''}
              onChange={(e) => updateNodeData(id, { source_value: e.target.value })}
            />
          ) : (
            <input
              type="text"
              className="w-full p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs focus:ring-1 focus:ring-[var(--node-knowledge)] focus:border-[var(--node-knowledge)] hover:border-[var(--text-tertiary)] outline-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-inner"
              placeholder={data.source_type === 'url' ? 'https://...' : '/path/to/file.pdf'}
              value={data.source_value || ''}
              onChange={(e) => updateNodeData(id, { source_value: e.target.value })}
            />
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !bottom-0 !-translate-x-1/2 !translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-knowledge-glow)]" style={{ background: 'var(--node-knowledge)' }} />
      </Handle>
      <NodeAddMenu sourceNodeId={id} />
    </div>
  );
}
