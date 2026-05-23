import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  XYPosition,
} from 'reactflow';

// ─── NODE CATALOG ───

export type NodeCatalogItem = {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: 'core' | 'tools' | 'data' | 'logic';
  defaultData: Record<string, any>;
};

export const NODE_CATALOG: NodeCatalogItem[] = [
  // Core
  {
    type: 'prompt',
    label: 'Системний Промпт',
    icon: '📝',
    description: 'Інструкції для агента',
    category: 'core',
    defaultData: { system_prompt: '' },
  },
  {
    type: 'guardrail',
    label: 'Обмеження',
    icon: '🛡️',
    description: 'Ліміти ітерацій',
    category: 'core',
    defaultData: { max_iterations: 5 },
  },

  // Tools
  {
    type: 'tool',
    label: 'Web Search',
    icon: '🔍',
    description: 'Tavily API пошук',
    category: 'tools',
    defaultData: { tool_id: 'web_search', tool_name: 'Web Search', tool_description: 'Tavily API', tool_icon: '🔍', enabled: true },
  },
  {
    type: 'tool',
    label: 'Calculator',
    icon: '🧮',
    description: 'Математичний двигун',
    category: 'tools',
    defaultData: { tool_id: 'calculator', tool_name: 'Calculator', tool_description: 'Math engine', tool_icon: '🧮', enabled: true },
  },
  {
    type: 'tool',
    label: 'Code Interpreter',
    icon: '💻',
    description: 'Виконання Python',
    category: 'tools',
    defaultData: { tool_id: 'code_interpreter', tool_name: 'Code Interpreter', tool_description: 'Python sandbox', tool_icon: '💻', enabled: true },
  },
  {
    type: 'tool',
    label: 'Image Generation',
    icon: '🎨',
    description: 'DALL·E / Stable Diffusion',
    category: 'tools',
    defaultData: { tool_id: 'image_generation', tool_name: 'Image Generation', tool_description: 'AI image gen', tool_icon: '🎨', enabled: true },
  },
  {
    type: 'tool',
    label: 'File Reader',
    icon: '📄',
    description: 'Читання файлів',
    category: 'tools',
    defaultData: { tool_id: 'file_reader', tool_name: 'File Reader', tool_description: 'PDF, DOCX, TXT', tool_icon: '📄', enabled: true },
  },

  // Data
  {
    type: 'knowledge',
    label: 'Knowledge Base',
    icon: '📚',
    description: 'Джерело знань',
    category: 'data',
    defaultData: { source_type: 'url', source_value: '', chunk_size: 500 },
  },
  {
    type: 'api',
    label: 'API Integration',
    icon: '🔌',
    description: 'HTTP endpoint',
    category: 'data',
    defaultData: { method: 'GET', url: '', headers: '', body: '' },
  },
  {
    type: 'memory',
    label: 'Memory',
    icon: '🧠',
    description: 'Контекст сесії',
    category: 'data',
    defaultData: { memory_type: 'session', ttl_minutes: 60 },
  },

  // Logic
  {
    type: 'condition',
    label: 'Condition',
    icon: '🔀',
    description: 'If / else логіка',
    category: 'logic',
    defaultData: { expression: '', true_label: 'True', false_label: 'False' },
  },
  {
    type: 'output_format',
    label: 'Output Format',
    icon: '📤',
    description: 'Формат відповіді',
    category: 'logic',
    defaultData: { format: 'markdown', schema: '' },
  },
];

export const CATEGORIES = [
  { id: 'core', label: 'Core', icon: '⚡' },
  { id: 'tools', label: 'Інструменти', icon: '🛠️' },
  { id: 'data', label: 'Дані', icon: '💾' },
  { id: 'logic', label: 'Логіка', icon: '🧩' },
] as const;

// ─── AGENT CONFIG ───

export type AgentConfig = {
  system_prompt: string;
  tools: string[];
  max_iterations: number;
  knowledge_sources: { source_type: string; source_value: string }[];
  output_format: { format: string; schema: string } | null;
  api_integrations: { method: string; url: string; headers: string; body: string }[];
  memory_config: { memory_type: string; ttl_minutes: number } | null;
  conditions: { expression: string }[];
};

export type WorkflowStep = {
  step_id: string;
  label: string;
  system_prompt: string;
  tools: string[];
  max_iterations: number;
  knowledge_sources: { source_type: string; source_value: string }[];
  output_format: { format: string; schema: string } | null;
  api_integrations: { method: string; url: string; headers: string; body: string }[];
  memory_config: { memory_type: string; ttl_minutes: number } | null;
  conditions: { expression: string }[];
};

export type WorkflowConfig = {
  mode: 'single' | 'workflow';
  steps: WorkflowStep[];
  // Flat config for backward compat in single mode
  singleConfig?: AgentConfig;
};

// ─── STORE ───

type RFState = {
  nodes: Node[];
  edges: Edge[];
  editingAgentId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateNodeData: (nodeId: string, data: any) => void;
  addNode: (type: string, position: XYPosition, data: Record<string, any>) => void;
  addNodeWithEdge: (sourceNodeId: string, type: string, data: Record<string, any>, sourceHandleId?: string) => void;
  removeNode: (nodeId: string) => void;
  getAgentConfig: () => AgentConfig;
  getWorkflowConfig: () => WorkflowConfig;
  loadTemplate: (templateId: string) => void;
  loadAgentFromAPI: (agentId: string) => Promise<void>;
  clearCanvas: () => void;
};

// ─── AGENT TEMPLATES ───

export type AgentTemplate = {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  nodes: Node[];
  edges: Edge[];
};

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'market_researcher',
    name: 'Market Researcher',
    icon: '📊',
    description: 'Аналіз конкурентів та ринку з пошуком в інтернеті',
    color: 'var(--accent)',
    nodes: [
      { id: 'tpl-prompt-1', type: 'prompt', position: { x: 250, y: 40 }, data: { system_prompt: 'Ви — експерт з конкурентної розвідки. Шукайте інформацію в інтернеті, аналізуйте конкурентів і складайте структуровані звіти з таблицями та висновками.' } },
      { id: 'tpl-tool-1', type: 'tool', position: { x: 50, y: 220 }, data: { tool_id: 'web_search', tool_name: 'Web Search', tool_description: 'Tavily API', tool_icon: '🔍', enabled: true } },
      { id: 'tpl-guard-1', type: 'guardrail', position: { x: 300, y: 220 }, data: { max_iterations: 5 } },
      { id: 'tpl-output-1', type: 'output_format', position: { x: 550, y: 220 }, data: { format: 'markdown', schema: '' } },
    ],
    edges: [
      { id: 'tpl-e1', source: 'tpl-prompt-1', target: 'tpl-tool-1' },
      { id: 'tpl-e2', source: 'tpl-prompt-1', target: 'tpl-guard-1' },
      { id: 'tpl-e3', source: 'tpl-prompt-1', target: 'tpl-output-1' },
    ],
  },
  {
    id: 'math_tutor',
    name: 'Math Tutor',
    icon: '🧮',
    description: 'Математичний репетитор з калькулятором та поясненнями',
    color: 'var(--node-guardrail)',
    nodes: [
      { id: 'tpl-prompt-1', type: 'prompt', position: { x: 250, y: 40 }, data: { system_prompt: 'Ви — терплячий математичний репетитор. Пояснюйте рішення крок за кроком. Використовуйте калькулятор для точних обчислень. Відповідайте зрозуміло для учня.' } },
      { id: 'tpl-tool-1', type: 'tool', position: { x: 100, y: 220 }, data: { tool_id: 'calculator', tool_name: 'Calculator', tool_description: 'Math engine', tool_icon: '🧮', enabled: true } },
      { id: 'tpl-tool-2', type: 'tool', position: { x: 400, y: 220 }, data: { tool_id: 'web_search', tool_name: 'Web Search', tool_description: 'Tavily API', tool_icon: '🔍', enabled: true } },
      { id: 'tpl-guard-1', type: 'guardrail', position: { x: 250, y: 380 }, data: { max_iterations: 8 } },
    ],
    edges: [
      { id: 'tpl-e1', source: 'tpl-prompt-1', target: 'tpl-tool-1' },
      { id: 'tpl-e2', source: 'tpl-prompt-1', target: 'tpl-tool-2' },
      { id: 'tpl-e3', source: 'tpl-prompt-1', target: 'tpl-guard-1' },
    ],
  },
  {
    id: 'api_monitor',
    name: 'API Monitor',
    icon: '🔌',
    description: 'Моніторинг зовнішнього API з умовною логікою',
    color: 'var(--node-api)',
    nodes: [
      { id: 'tpl-prompt-1', type: 'prompt', position: { x: 250, y: 40 }, data: { system_prompt: 'Ви — системний монітор. Перевіряйте API endpoint та аналізуйте відповідь. Якщо є помилки — опишіть їх. Якщо все добре — підтвердіть статус.' } },
      { id: 'tpl-api-1', type: 'api', position: { x: 50, y: 220 }, data: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1', headers: '', body: '' } },
      { id: 'tpl-cond-1', type: 'condition', position: { x: 350, y: 220 }, data: { expression: 'status code is 200', true_label: 'OK', false_label: 'Error' } },
      { id: 'tpl-output-1', type: 'output_format', position: { x: 550, y: 220 }, data: { format: 'json', schema: '' } },
    ],
    edges: [
      { id: 'tpl-e1', source: 'tpl-prompt-1', target: 'tpl-api-1' },
      { id: 'tpl-e2', source: 'tpl-prompt-1', target: 'tpl-cond-1' },
      { id: 'tpl-e3', source: 'tpl-prompt-1', target: 'tpl-output-1' },
    ],
  },
  {
    id: 'knowledge_bot',
    name: 'Knowledge Bot',
    icon: '📚',
    description: 'Бот з базою знань та пам\'яттю сесії',
    color: 'var(--node-knowledge)',
    nodes: [
      { id: 'tpl-prompt-1', type: 'prompt', position: { x: 250, y: 40 }, data: { system_prompt: 'Ви — розумний асистент з базою знань. Використовуйте надану інформацію для відповідей. Запам\'ятовуйте контекст розмови та відповідайте послідовно.' } },
      { id: 'tpl-know-1', type: 'knowledge', position: { x: 50, y: 220 }, data: { source_type: 'url', source_value: 'https://en.wikipedia.org/wiki/Artificial_intelligence', chunk_size: 500 } },
      { id: 'tpl-mem-1', type: 'memory', position: { x: 350, y: 220 }, data: { memory_type: 'session', ttl_minutes: 60 } },
      { id: 'tpl-tool-1', type: 'tool', position: { x: 600, y: 220 }, data: { tool_id: 'web_search', tool_name: 'Web Search', tool_description: 'Tavily API', tool_icon: '🔍', enabled: true } },
    ],
    edges: [
      { id: 'tpl-e1', source: 'tpl-prompt-1', target: 'tpl-know-1' },
      { id: 'tpl-e2', source: 'tpl-prompt-1', target: 'tpl-mem-1' },
      { id: 'tpl-e3', source: 'tpl-prompt-1', target: 'tpl-tool-1' },
    ],
  },
];

let nodeIdCounter = 10;

const initialNodes: Node[] = [
  {
    id: 'prompt-1',
    type: 'prompt',
    position: { x: 250, y: 80 },
    data: { system_prompt: 'Ви - корисний AI-асистент.' },
  },
];

const initialEdges: Edge[] = [];

export const useStore = create<RFState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  editingAgentId: null,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  updateNodeData: (nodeId: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },

  addNode: (type: string, position: XYPosition, data: Record<string, any>) => {
    const id = `${type}-${++nodeIdCounter}`;
    const newNode: Node = {
      id,
      type,
      position,
      data: { ...data },
    };
    set({
      nodes: [...get().nodes, newNode],
    });
  },

  addNodeWithEdge: (sourceNodeId: string, type: string, data: Record<string, any>, sourceHandleId?: string) => {
    const sourceNode = get().nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const id = `${type}-${++nodeIdCounter}`;
    // Count existing children from this source to stagger horizontally
    const existingChildren = get().edges.filter((e) => e.source === sourceNodeId).length;
    const xOffset = existingChildren * 320;

    const newNode: Node = {
      id,
      type,
      position: {
        x: sourceNode.position.x + xOffset,
        y: sourceNode.position.y + 260,
      },
      data: { ...data },
    };

    const newEdge: Edge = {
      id: `e-${sourceNodeId}-${id}`,
      source: sourceNodeId,
      target: id,
      ...(sourceHandleId ? { sourceHandle: sourceHandleId } : {}),
    };

    set({
      nodes: [...get().nodes, newNode],
      edges: [...get().edges, newEdge],
    });
  },

  removeNode: (nodeId: string) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  loadTemplate: (templateId: string) => {
    const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    nodeIdCounter = 100; // Reset counter to avoid collisions
    set({
      nodes: template.nodes.map((n) => ({ ...n })),
      edges: template.edges.map((e) => ({ ...e })),
      editingAgentId: null,
    });
  },

  clearCanvas: () => {
    nodeIdCounter = 10;
    set({
      nodes: initialNodes,
      edges: initialEdges,
      editingAgentId: null,
    });
  },

  loadAgentFromAPI: async (agentId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/agents/${agentId}`);
      if (!res.ok) throw new Error('Failed to fetch agent');
      const data = await res.json();
      const agent = data.agent;

      nodeIdCounter = 200; // Start from high number to avoid collisions
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // 1. Prompt node (always present)
      const promptId = `prompt-${++nodeIdCounter}`;
      newNodes.push({
        id: promptId,
        type: 'prompt',
        position: { x: 350, y: 40 },
        data: { system_prompt: agent.system_prompt || '' },
      });

      let childIndex = 0;
      const xStart = 50;
      const xSpacing = 300;
      const yChild = 260;

      // 2. Tool nodes
      const tools: string[] = agent.tools || [];
      for (const toolId of tools) {
        const catalogItem = NODE_CATALOG.find(
          (c) => c.type === 'tool' && c.defaultData.tool_id === toolId
        );
        const nodeId = `tool-${++nodeIdCounter}`;
        newNodes.push({
          id: nodeId,
          type: 'tool',
          position: { x: xStart + childIndex * xSpacing, y: yChild },
          data: catalogItem
            ? { ...catalogItem.defaultData }
            : { tool_id: toolId, tool_name: toolId, tool_description: '', tool_icon: '🛠', enabled: true },
        });
        newEdges.push({ id: `e-${promptId}-${nodeId}`, source: promptId, target: nodeId });
        childIndex++;
      }

      // 3. Guardrail node (max_iterations)
      if (agent.max_iterations && agent.max_iterations !== 5) {
        const nodeId = `guardrail-${++nodeIdCounter}`;
        newNodes.push({
          id: nodeId,
          type: 'guardrail',
          position: { x: xStart + childIndex * xSpacing, y: yChild },
          data: { max_iterations: agent.max_iterations },
        });
        newEdges.push({ id: `e-${promptId}-${nodeId}`, source: promptId, target: nodeId });
        childIndex++;
      }

      // 4. Knowledge nodes
      const knowledgeSources = agent.knowledge_sources || [];
      for (const ks of knowledgeSources) {
        const nodeId = `knowledge-${++nodeIdCounter}`;
        newNodes.push({
          id: nodeId,
          type: 'knowledge',
          position: { x: xStart + childIndex * xSpacing, y: yChild },
          data: { source_type: ks.source_type || 'url', source_value: ks.source_value || '', chunk_size: 500 },
        });
        newEdges.push({ id: `e-${promptId}-${nodeId}`, source: promptId, target: nodeId });
        childIndex++;
      }

      // 5. Output format node
      if (agent.output_format) {
        const nodeId = `output_format-${++nodeIdCounter}`;
        newNodes.push({
          id: nodeId,
          type: 'output_format',
          position: { x: xStart + childIndex * xSpacing, y: yChild },
          data: { format: agent.output_format.format || 'markdown', schema: agent.output_format.schema || '' },
        });
        newEdges.push({ id: `e-${promptId}-${nodeId}`, source: promptId, target: nodeId });
        childIndex++;
      }

      // 6. API integration nodes
      const apiIntegrations = agent.api_integrations || [];
      for (const api of apiIntegrations) {
        const nodeId = `api-${++nodeIdCounter}`;
        newNodes.push({
          id: nodeId,
          type: 'api',
          position: { x: xStart + childIndex * xSpacing, y: yChild },
          data: { method: api.method || 'GET', url: api.url || '', headers: api.headers || '', body: api.body || '' },
        });
        newEdges.push({ id: `e-${promptId}-${nodeId}`, source: promptId, target: nodeId });
        childIndex++;
      }

      // 7. Memory node
      if (agent.memory_config) {
        const nodeId = `memory-${++nodeIdCounter}`;
        newNodes.push({
          id: nodeId,
          type: 'memory',
          position: { x: xStart + childIndex * xSpacing, y: yChild },
          data: { memory_type: agent.memory_config.memory_type || 'session', ttl_minutes: agent.memory_config.ttl_minutes || 60 },
        });
        newEdges.push({ id: `e-${promptId}-${nodeId}`, source: promptId, target: nodeId });
        childIndex++;
      }

      // 8. Condition nodes
      const conditions = agent.conditions || [];
      for (const cond of conditions) {
        const nodeId = `condition-${++nodeIdCounter}`;
        newNodes.push({
          id: nodeId,
          type: 'condition',
          position: { x: xStart + childIndex * xSpacing, y: yChild },
          data: { expression: cond.expression || '', true_label: 'True', false_label: 'False' },
        });
        newEdges.push({ id: `e-${promptId}-${nodeId}`, source: promptId, target: nodeId });
        childIndex++;
      }

      set({
        nodes: newNodes,
        edges: newEdges,
        editingAgentId: agentId,
      });
    } catch (err) {
      console.error('Failed to load agent:', err);
    }
  },

  getAgentConfig: () => {
    const nodes = get().nodes;

    let system_prompt = 'Ви - корисний AI-асистент.';
    const tools: string[] = [];
    let max_iterations = 5;
    const knowledge_sources: { source_type: string; source_value: string }[] = [];
    let output_format: { format: string; schema: string } | null = null;
    const api_integrations: { method: string; url: string; headers: string; body: string }[] = [];
    let memory_config: { memory_type: string; ttl_minutes: number } | null = null;
    const conditions: { expression: string }[] = [];

    nodes.forEach((node) => {
      switch (node.type) {
        case 'prompt':
          if (node.data?.system_prompt) system_prompt = node.data.system_prompt;
          break;
        case 'tool':
          if (node.data?.enabled && node.data?.tool_id) {
            tools.push(node.data.tool_id);
          }
          break;
        case 'guardrail':
          if (node.data?.max_iterations) max_iterations = node.data.max_iterations;
          break;
        case 'knowledge':
          if (node.data?.source_value) {
            knowledge_sources.push({
              source_type: node.data.source_type || 'url',
              source_value: node.data.source_value,
            });
          }
          break;
        case 'output_format':
          output_format = {
            format: node.data?.format || 'markdown',
            schema: node.data?.schema || '',
          };
          break;
        case 'api':
          if (node.data?.url) {
            api_integrations.push({
              method: node.data.method || 'GET',
              url: node.data.url,
              headers: node.data.headers || '',
              body: node.data.body || '',
            });
          }
          break;
        case 'memory':
          memory_config = {
            memory_type: node.data?.memory_type || 'session',
            ttl_minutes: node.data?.ttl_minutes || 60,
          };
          break;
        case 'condition':
          if (node.data?.expression) {
            conditions.push({ expression: node.data.expression });
          }
          break;
      }
    });

    return {
      system_prompt,
      tools,
      max_iterations,
      knowledge_sources,
      output_format,
      api_integrations,
      memory_config,
      conditions,
    };
  },

  getWorkflowConfig: (): WorkflowConfig => {
    const nodes = get().nodes;
    const edges = get().edges;

    // ── Topological sort (BFS / Kahn's algorithm) ──
    const adjacency: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    for (const node of nodes) {
      adjacency[node.id] = [];
      inDegree[node.id] = 0;
    }
    for (const edge of edges) {
      if (adjacency[edge.source]) {
        adjacency[edge.source].push(edge.target);
      }
      if (inDegree[edge.target] !== undefined) {
        inDegree[edge.target]++;
      }
    }

    const queue: string[] = [];
    for (const nodeId of Object.keys(inDegree)) {
      if (inDegree[nodeId] === 0) queue.push(nodeId);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const neighbor of (adjacency[current] || [])) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      }
    }

    // ── Build node lookup ──
    const nodeMap: Record<string, Node> = {};
    for (const node of nodes) {
      nodeMap[node.id] = node;
    }

    // ── Count prompt nodes ──
    const promptNodeIds = sorted.filter((id) => nodeMap[id]?.type === 'prompt');

    // If 0 or 1 prompt nodes → single mode (backward compat)
    if (promptNodeIds.length <= 1) {
      return {
        mode: 'single',
        steps: [],
        singleConfig: get().getAgentConfig(),
      };
    }

    // ── Multi-prompt: group config nodes with their nearest downstream prompt ──
    // Walk sorted order. Accumulate config until we hit a prompt → flush as a step.
    const steps: WorkflowStep[] = [];
    let currentTools: string[] = [];
    let currentMaxIterations = 5;
    let currentKnowledge: { source_type: string; source_value: string }[] = [];
    let currentOutputFormat: { format: string; schema: string } | null = null;
    let currentApi: { method: string; url: string; headers: string; body: string }[] = [];
    let currentMemory: { memory_type: string; ttl_minutes: number } | null = null;
    let currentConditions: { expression: string }[] = [];

    for (const nodeId of sorted) {
      const node = nodeMap[nodeId];
      if (!node) continue;

      switch (node.type) {
        case 'prompt': {
          // Flush accumulated config into a step
          const catalog = NODE_CATALOG.find((c) => c.type === 'prompt');
          steps.push({
            step_id: node.id,
            label: node.data?.system_prompt
              ? node.data.system_prompt.slice(0, 40) + (node.data.system_prompt.length > 40 ? '...' : '')
              : catalog?.label || 'Prompt',
            system_prompt: node.data?.system_prompt || '',
            tools: [...currentTools],
            max_iterations: currentMaxIterations,
            knowledge_sources: [...currentKnowledge],
            output_format: currentOutputFormat,
            api_integrations: [...currentApi],
            memory_config: currentMemory,
            conditions: [...currentConditions],
          });
          // Reset accumulators for next step
          currentTools = [];
          currentMaxIterations = 5;
          currentKnowledge = [];
          currentOutputFormat = null;
          currentApi = [];
          currentMemory = null;
          currentConditions = [];
          break;
        }
        case 'tool':
          if (node.data?.enabled && node.data?.tool_id) {
            currentTools.push(node.data.tool_id);
          }
          break;
        case 'guardrail':
          if (node.data?.max_iterations) currentMaxIterations = node.data.max_iterations;
          break;
        case 'knowledge':
          if (node.data?.source_value) {
            currentKnowledge.push({
              source_type: node.data.source_type || 'url',
              source_value: node.data.source_value,
            });
          }
          break;
        case 'output_format':
          currentOutputFormat = {
            format: node.data?.format || 'markdown',
            schema: node.data?.schema || '',
          };
          break;
        case 'api':
          if (node.data?.url) {
            currentApi.push({
              method: node.data.method || 'GET',
              url: node.data.url,
              headers: node.data.headers || '',
              body: node.data.body || '',
            });
          }
          break;
        case 'memory':
          currentMemory = {
            memory_type: node.data?.memory_type || 'session',
            ttl_minutes: node.data?.ttl_minutes || 60,
          };
          break;
        case 'condition':
          if (node.data?.expression) {
            currentConditions.push({ expression: node.data.expression });
          }
          break;
      }
    }

    // If there are trailing config nodes after the last prompt,
    // attach them to the last step
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      if (currentTools.length) lastStep.tools.push(...currentTools);
      if (currentKnowledge.length) lastStep.knowledge_sources.push(...currentKnowledge);
      if (currentOutputFormat) lastStep.output_format = currentOutputFormat;
      if (currentApi.length) lastStep.api_integrations.push(...currentApi);
      if (currentMemory) lastStep.memory_config = currentMemory;
      if (currentConditions.length) lastStep.conditions.push(...currentConditions);
      if (currentMaxIterations !== 5) lastStep.max_iterations = currentMaxIterations;
    }

    return {
      mode: 'workflow',
      steps,
    };
  },
}));
