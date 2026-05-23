import { Handle, Position } from 'reactflow';
import { useStore } from '@/store/agentStore';
import { NodeAddMenu } from '@/components/NodeAddMenu';
import { getLucideIcon } from '@/components/Icons';

export function ToolNode({ id, data }: { id: string; data: any }) {
  const updateNodeData = useStore((state) => state.updateNodeData);
  const isEnabled = data.enabled !== false;

  return (
    <div
      className="relative bg-[var(--bg-card)] shadow-lg rounded-xl border overflow-visible min-w-[240px] transition-all duration-300 group/node animate-scale-in"
      style={{
        borderColor: isEnabled ? 'var(--node-tool)' : 'var(--border)',
        boxShadow: isEnabled ? '0 0 24px var(--node-tool-glow)' : 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !top-0 !-translate-x-1/2 !-translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-tool-glow)]" style={{ background: 'var(--node-tool)' }} />
      </Handle>
      <div className="px-4 py-3 border-b-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors"
            style={{
              background: isEnabled ? 'var(--node-tool-glow)' : 'var(--bg-elevated)',
            }}
          >
            {getLucideIcon(data.tool_icon || 'Wrench')}
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--text-primary)] block leading-tight">
              {data.tool_name || 'Tool'}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] leading-tight">
              {data.tool_description || ''}
            </span>
          </div>
        </div>
        <label className="relative cursor-pointer">
          <div
            className="w-9 h-5 rounded-full transition-colors relative"
            style={{
              background: isEnabled ? 'var(--node-tool)' : 'var(--bg-elevated)',
            }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-all"
              style={{ left: isEnabled ? '18px' : '3px' }}
            />
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={isEnabled}
            onChange={() => updateNodeData(id, { enabled: !isEnabled })}
          />
        </label>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-none z-10 flex items-center justify-center group/handle !bottom-0 !-translate-x-1/2 !translate-y-1/2"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] transition-all duration-200 group-hover/handle:w-4 group-hover/handle:h-4 group-hover/handle:shadow-[0_0_12px_var(--node-tool-glow)]" style={{ background: 'var(--node-tool)' }} />
      </Handle>
      <NodeAddMenu sourceNodeId={id} />
    </div>
  );
}
