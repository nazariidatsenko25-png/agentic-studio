import { Handle, Position } from 'reactflow';
import { useStore } from '@/store/agentStore';
import { NodeAddMenu } from '@/components/NodeAddMenu';
import { getLucideIcon } from '@/components/Icons';

export function OutputNode({ id, data }: { id: string; data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);

  return (
    <div
      className="relative bg-[var(--bg-card)] shadow-lg rounded-xl border border-[var(--border)] overflow-visible min-w-[280px] transition-all duration-300 hover:shadow-[0_0_24px_var(--node-output-glow)] group/node animate-scale-in"
      style={{ borderColor: data.format ? 'var(--node-output)' : undefined }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-none !top-0 !-translate-x-1/2 !-translate-y-1/2 z-10 flex items-center justify-center group/handle "
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-output-glow)]" style={{ background: 'var(--border)' }} />
      </Handle>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-none !bottom-0 !-translate-x-1/2 !translate-y-1/2 z-10 flex items-center justify-center group/handle "
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-output-glow)]" style={{ background: 'var(--node-output)' }} />
      </Handle>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: 'var(--node-output-glow)' }}
        >
          {getLucideIcon('📤')}
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Output Format</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <label className="block text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Формат
          </label>
          <select
            value={data.format || 'text'}
            onChange={(e) => updateNodeData(id, { format: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-[var(--node-output)] hover:border-[#444] transition-colors appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.7rem top 50%',
              backgroundSize: '0.65rem auto'
            }}
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="plain">Plain Text</option>
            <option value="html">HTML</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        {data.format === 'json' && (
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              JSON Schema (опціонально)
            </label>
            <textarea
              className="w-full p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs h-20 focus:ring-1 focus:ring-[var(--node-output)] focus:border-[var(--node-output)] hover:border-[var(--text-tertiary)] outline-none resize-none transition-all text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-mono-brand shadow-inner"
              placeholder='{ "type": "object", ... }'
              value={data.schema || ''}
              onChange={(e) => updateNodeData(id, { schema: e.target.value })}
            />
          </div>
        )}
      </div>
      <NodeAddMenu sourceNodeId={id} />
    </div>
  );
}
