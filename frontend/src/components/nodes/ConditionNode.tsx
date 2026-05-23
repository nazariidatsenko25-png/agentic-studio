import { Handle, Position } from 'reactflow';
import { useStore } from '@/store/agentStore';
import { NodeAddMenu } from '@/components/NodeAddMenu';
import { getLucideIcon } from '@/components/Icons';

export function ConditionNode({ id, data }: { id: string; data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);

  return (
    <div
      className="relative bg-[var(--bg-card)] shadow-lg rounded-xl border border-[var(--border)] overflow-visible min-w-[320px] transition-all duration-300 hover:border-[var(--node-condition)] hover:shadow-[0_0_24px_var(--node-condition-glow)] group/node animate-scale-in"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !top-0 !-translate-x-1/2 !-translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-condition-glow)]" style={{ background: 'var(--border)' }} />
      </Handle>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: 'var(--node-condition-glow)' }}
          >
            {getLucideIcon('GitBranch')}
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Condition</span>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Вираз умови
          </label>
          <input
            type="text"
            className="w-full p-2.5 bg-[#111113] border border-[var(--border)] rounded-lg text-xs focus:ring-1 focus:ring-[var(--node-condition)] focus:border-[var(--node-condition)] hover:border-[#444] outline-none transition-all text-[var(--text-primary)] placeholder:text-[#555] font-mono-brand shadow-inner"
            placeholder="contains(response, 'error')"
            value={data.expression || ''}
            onChange={(e) => updateNodeData(id, { expression: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium"
            style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
            {data.true_label || 'True'}
          </div>
          <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium"
            style={{ background: 'rgba(248, 113, 113, 0.1)', color: 'var(--error)' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--error)' }} />
            {data.false_label || 'False'}
          </div>
        </div>
      </div>
      {/* Two source handles: left = true, right = false */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !bottom-0 !-translate-x-1/2 !translate-y-1/2"
        style={{ left: '25%' }}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_rgba(52,211,153,0.5)]" style={{ background: 'var(--success)' }} />
      </Handle>
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !bottom-0 !-translate-x-1/2 !translate-y-1/2"
        style={{ left: '75%' }}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_rgba(248,113,113,0.5)]" style={{ background: 'var(--error)' }} />
      </Handle>
      <NodeAddMenu sourceNodeId={id} />
    </div>
  );
}
