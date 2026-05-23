'use client';

import { useCallback, useMemo, useState, useRef, useEffect, DragEvent, MouseEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, { Background, Controls, MiniMap, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore, AGENT_TEMPLATES } from '@/store/agentStore';
import { PromptNode } from '@/components/nodes/PromptNode';
import { ToolNode } from '@/components/nodes/ToolNode';
import { GuardrailNode } from '@/components/nodes/GuardrailNode';
import { KnowledgeNode } from '@/components/nodes/KnowledgeNode';
import { OutputNode } from '@/components/nodes/OutputNode';
import { ConditionNode } from '@/components/nodes/ConditionNode';
import { ApiNode } from '@/components/nodes/ApiNode';
import { MemoryNode } from '@/components/nodes/MemoryNode';
import { NodeSidebar } from '@/components/NodeSidebar';
import MockChatWidget from '@/components/MockChatWidget';

export default function BuilderPage() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, getAgentConfig, addNode, removeNode, loadTemplate, loadAgentFromAPI, editingAgentId } = useStore();
  const searchParams = useSearchParams();
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [agentName, setAgentName] = useState('');
  const [deployedAgentId, setDeployedAgentId] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [loadedAgentName, setLoadedAgentName] = useState('');

  // Load agent from URL param on mount
  useEffect(() => {
    const agentId = searchParams.get('agent_id');
    if (agentId) {
      setIsLoadingAgent(true);
      // Fetch agent name first, then load canvas
      fetch(`http://127.0.0.1:8000/api/agents/${agentId}`)
        .then(res => res.json())
        .then(data => {
          if (data.agent) {
            setAgentName(data.agent.name || '');
            setLoadedAgentName(data.agent.name || '');
          }
        })
        .catch(() => {});
      loadAgentFromAPI(agentId).finally(() => setIsLoadingAgent(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(() => ({
    prompt: PromptNode,
    tool: ToolNode,
    guardrail: GuardrailNode,
    knowledge: KnowledgeNode,
    output_format: OutputNode,
    condition: ConditionNode,
    api: ApiNode,
    memory: MemoryNode,
  }), []);

  // ─── Drag & Drop from Sidebar ───
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const dataStr = event.dataTransfer.getData('application/reactflow-data');

      if (!type || !rfInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      let data = {};
      try {
        data = JSON.parse(dataStr);
      } catch {}

      addNode(type, position, data);
    },
    [rfInstance, addNode]
  );

  // ─── Context Menu (Right-click) ───
  const onNodeContextMenu = useCallback(
    (event: MouseEvent, node: any) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteNode = useCallback(() => {
    if (contextMenu) {
      removeNode(contextMenu.nodeId);
      setContextMenu(null);
    }
  }, [contextMenu, removeNode]);

  // ─── Deploy ───
  const handleDeploy = async () => {
    const config = getAgentConfig();
    setIsDeploying(true);
    try {
      let url = 'http://127.0.0.1:8000/api/agents';
      let method = 'POST';

      // If editing an existing agent, update instead of create
      if (editingAgentId) {
        url = `http://127.0.0.1:8000/api/agents/${editingAgentId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName || 'Unnamed Agent',
          ...config
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to deploy agent');
      }
      
      const data = await res.json();
      const resultId = data.agent_id || editingAgentId;
      setDeployedAgentId(resultId);
      setGeneratedScript(`<script src="http://localhost:3000/embed.js" data-agent="${resultId}" defer></script>`);
      setShowSuccessModal(true);
    } catch (e) {
      console.error(e);
      alert('Error deploying agent. Is the backend running at port 8000?');
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <a href="/" className="font-display text-lg text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
            Agentic Studio
          </a>
          <div className="w-px h-5 bg-[var(--border)]"></div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
              Templates
            </button>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Agent name..."
              className="bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent)] hover:border-[var(--text-tertiary)] rounded-lg text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none py-1.5 px-3 w-48 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <a 
            href="/agents"
            className="px-3 py-1.5 text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors"
          >
            My Agents
          </a>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              showPreview
                ? 'bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)] border-opacity-40'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            Test Agent
          </button>
            <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className="px-5 py-2 bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--text-inverse)] rounded-lg text-sm font-semibold btn-press hover:shadow-[0_0_24px_var(--accent-glow-strong)] flex items-center gap-2 animate-glow-pulse"
          >
            {isDeploying ? 'Deploying...' : editingAgentId ? 'Update & Deploy →' : 'Save & Deploy →'}
          </button>
        </div>
      </header>

      {/* Main area: Sidebar + Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <NodeSidebar />

        {/* Loading overlay */}
        {isLoadingAgent && (
          <div className="absolute inset-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[var(--text-tertiary)]">Завантаження агента...</p>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ maxZoom: 0.75, padding: 0.3 }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: 'var(--accent)', strokeWidth: 2 },
            }}
            className="bg-[var(--bg-primary)]"
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background color="#2A2A2E" gap={20} size={1} />
            <Controls 
              className="!bg-[var(--bg-secondary)] !border-[var(--border)] !rounded-xl !shadow-2xl [&>button]:!bg-[var(--bg-secondary)] [&>button]:!border-[var(--border)] [&>button]:!text-[var(--text-secondary)] [&>button:hover]:!bg-[var(--bg-elevated)]" 
            />
            <MiniMap 
              nodeStrokeWidth={3} 
              className="!rounded-xl !shadow-2xl !border-[var(--border)] !bg-[var(--bg-secondary)]" 
              maskColor="rgba(12, 12, 14, 0.8)"
              nodeColor={() => '#18181B'}
              nodeStrokeColor={() => '#2A2A2E'}
            />
          </ReactFlow>

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="fixed z-50 animate-fade-in"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
                <button
                  onClick={handleDeleteNode}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[var(--error)] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Видалити блок
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview Chat Panel */}
        {showPreview && (
          <div className="w-[380px] h-full border-l border-[var(--border)] bg-[var(--bg-primary)] animate-slide-in-spring overflow-hidden">
            <MockChatWidget inline />
          </div>
        )}
      </div>

      {/* Deploy Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
            {/* Modal header */}
            <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
                  <span className="text-[var(--accent)]">✓</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agent Deployed</h2>
                  <p className="text-xs text-[var(--text-tertiary)] font-mono-brand">{deployedAgentId.slice(0, 8)}...</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              <p className="text-[var(--text-secondary)] mb-4 text-sm">
                Додайте цей сніпет перед <code className="font-mono-brand text-[var(--accent)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">&lt;/body&gt;</code>:
              </p>
              <div className="relative group">
                <pre className="bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--accent)] p-4 rounded-xl overflow-x-auto font-mono-brand text-sm">
                  {generatedScript}
                </pre>
                <button 
                  onClick={copyToClipboard}
                  className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    copied
                      ? 'bg-[var(--accent-glow)] border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] border-[var(--border)]'
                  }`}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <a
                  href="/agents"
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
                >
                  View All Agents →
                </a>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:border-[var(--text-tertiary)] transition-colors"
                >
                  Continue Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agent Templates</h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Виберіть шаблон для швидкого старту</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {AGENT_TEMPLATES.map((tpl, idx) => (
                <button
                  key={tpl.id}
                  onClick={() => { loadTemplate(tpl.id); setShowTemplates(false); setAgentName(tpl.name); }}
                  className="group text-left p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/50 hover:shadow-[0_8px_30px_var(--accent-glow)] hover-lift btn-press animate-scale-in"
                  style={{ animationDelay: `${0.05 * idx}s` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `color-mix(in srgb, ${tpl.color} 15%, transparent)` }}>
                      {tpl.icon}
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{tpl.name}</h3>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tpl.description}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] font-mono-brand">
                    <span>{tpl.nodes.length} nodes</span>
                    <span>·</span>
                    <span>{tpl.edges.length} connections</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
