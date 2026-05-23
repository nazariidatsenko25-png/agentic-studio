import { Handle, Position } from 'reactflow';
import { useStore } from '@/store/agentStore';
import { NodeAddMenu } from '@/components/NodeAddMenu';
import { getLucideIcon } from '@/components/Icons';

export function ApiNode({ id, data }: { id: string; data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

  return (
    <div
      className="relative bg-[var(--bg-card)] shadow-lg rounded-xl border border-[var(--border)] overflow-visible min-w-[320px] transition-all duration-300 hover:border-[var(--node-api)] hover:shadow-[0_0_24px_var(--node-api-glow)] group/node animate-scale-in"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !top-0 !-translate-x-1/2 !-translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-api-glow)]" style={{ background: 'var(--border)' }} />
      </Handle>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: 'var(--node-api-glow)' }}
          >
            {getLucideIcon('🔌')}
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">API Integration</span>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {/* Method + URL row */}
        <div className="flex gap-2">
          <select
            value={data.method || 'GET'}
            onChange={(e) => updateNodeData(id, { method: e.target.value })}
            className="w-24 p-2.5 bg-[#111113] border border-[var(--border)] rounded-lg text-xs font-semibold focus:ring-1 focus:ring-[var(--node-api)] focus:border-[var(--node-api)] hover:border-[#444] outline-none transition-all appearance-none cursor-pointer shadow-inner"
            style={{
              color: 'var(--node-api)',
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.7rem top 50%',
              backgroundSize: '0.65rem auto'
            }}
          >
            {methods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="text"
            className="flex-1 p-2.5 bg-[#111113] border border-[var(--border)] rounded-lg text-xs focus:ring-1 focus:ring-[var(--node-api)] focus:border-[var(--node-api)] hover:border-[#444] outline-none transition-all text-[var(--text-primary)] placeholder:text-[#555] font-mono-brand shadow-inner"
            placeholder="https://api.example.com/v1/..."
            value={data.url || ''}
            onChange={(e) => updateNodeData(id, { url: e.target.value })}
          />
        </div>

        {/* Headers */}
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Headers (JSON)
          </label>
          <textarea
            className="w-full p-2.5 bg-[#111113] border border-[var(--border)] rounded-lg text-xs h-14 focus:ring-1 focus:ring-[var(--node-api)] focus:border-[var(--node-api)] hover:border-[#444] outline-none resize-none transition-all text-[var(--text-primary)] placeholder:text-[#555] font-mono-brand shadow-inner"
            placeholder='{ "Authorization": "Bearer ..." }'
            value={data.headers || ''}
            onChange={(e) => updateNodeData(id, { headers: e.target.value })}
          />
        </div>

        {/* Body (only for POST/PUT/PATCH) */}
        {['POST', 'PUT', 'PATCH'].includes(data.method || 'GET') && (
          <div>
            <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              Body (JSON)
            </label>
            <textarea
              className="w-full p-2.5 bg-[#111113] border border-[var(--border)] rounded-lg text-xs h-14 focus:ring-1 focus:ring-[var(--node-api)] focus:border-[var(--node-api)] hover:border-[#444] outline-none resize-none transition-all text-[var(--text-primary)] placeholder:text-[#555] font-mono-brand shadow-inner"
              placeholder='{ "key": "value" }'
              value={data.body || ''}
              onChange={(e) => updateNodeData(id, { body: e.target.value })}
            />
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !bottom-0 !-translate-x-1/2 !translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-api-glow)]" style={{ background: 'var(--node-api)' }} />
      </Handle>
      <NodeAddMenu sourceNodeId={id} />
    </div>
  );
}
