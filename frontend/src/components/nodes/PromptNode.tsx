import { Handle, Position } from 'reactflow';
import { useStore } from '@/store/agentStore';
import { NodeAddMenu } from '@/components/NodeAddMenu';
import { getLucideIcon } from '@/components/Icons';

export function PromptNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);

  return (
    <div className="relative bg-[var(--bg-card)] shadow-lg rounded-xl border border-[var(--border)] overflow-visible min-w-[320px] transition-all duration-300 hover:border-[var(--node-prompt)] hover:shadow-[0_0_24px_var(--node-prompt-glow)] group/node animate-scale-in">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: 'var(--node-prompt-glow)' }}>
          {getLucideIcon('📝')}
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Системний Промпт</span>
      </div>
      <div className="p-4 pt-3">
        <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Інструкції для агента</label>
        <textarea
          className="w-full p-3 bg-[#111113] border border-[var(--border)] rounded-lg text-sm h-32 focus:ring-1 focus:ring-[var(--node-prompt)] focus:border-[var(--node-prompt)] hover:border-[#444] outline-none resize-none transition-all text-[var(--text-primary)] placeholder:text-[#555] shadow-inner"
          placeholder="Ти корисний асистент..."
          value={data.system_prompt || ''}
          onChange={(e) => updateNodeData(id, { system_prompt: e.target.value })}
        />
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-none !top-0 !-translate-x-1/2 !-translate-y-1/2 z-10 flex items-center justify-center group/handle "
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-prompt-glow)]" style={{ background: 'var(--border)' }} />
      </Handle>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-none !bottom-0 !-translate-x-1/2 !translate-y-1/2 z-10 flex items-center justify-center group/handle "
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-prompt-glow)]" style={{ background: 'var(--node-prompt)' }} />
      </Handle>
      <NodeAddMenu sourceNodeId={id} />
    </div>
  );
}
