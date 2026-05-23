import { Handle, Position } from 'reactflow';
import { useStore } from '@/store/agentStore';
import { NodeAddMenu } from '@/components/NodeAddMenu';
import { getLucideIcon } from '@/components/Icons';

export function MemoryNode({ id, data }: { id: string; data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);

  return (
    <div
      className="relative bg-[var(--bg-card)] shadow-lg rounded-xl border border-[var(--border)] overflow-visible min-w-[280px] transition-all duration-300 hover:border-[var(--node-memory)] hover:shadow-[0_0_24px_var(--node-memory-glow)] group/node animate-scale-in"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !top-0 !-translate-x-1/2 !-translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-memory-glow)]" style={{ background: 'var(--border)' }} />
      </Handle>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: 'var(--node-memory-glow)' }}
        >
          {getLucideIcon('Brain')}
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Memory</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Тип пам'яті
          </label>
          <div className="flex bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-1 gap-1">
            {(['session', 'persistent'] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateNodeData(id, { memory_type: t })}
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all text-center"
                style={{
                  background: data.memory_type === t ? 'var(--node-memory-glow)' : 'transparent',
                  color: data.memory_type === t ? 'var(--node-memory)' : 'var(--text-tertiary)',
                  boxShadow: data.memory_type === t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {t === 'session' ? '⏱ Session' : '💿 Persistent'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              TTL (хвилини)
            </label>
            <span
              className="font-mono-brand font-semibold px-2 py-0.5 rounded-md text-xs"
              style={{ background: 'var(--node-memory-glow)', color: 'var(--node-memory)' }}
            >
              {data.ttl_minutes || 60}
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="1440"
            step="5"
            value={data.ttl_minutes || 60}
            onChange={(e) => updateNodeData(id, { ttl_minutes: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--border)] transition-colors rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: 'var(--node-memory)' }}
          />
          <div className="flex justify-between text-[9px] text-[var(--text-tertiary)] mt-1">
            <span>5 хв</span>
            <span>24 год</span>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !bottom-0 !-translate-x-1/2 !translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-memory-glow)]" style={{ background: 'var(--node-memory)' }} />
      </Handle>
      <NodeAddMenu sourceNodeId={id} />
    </div>
  );
}
