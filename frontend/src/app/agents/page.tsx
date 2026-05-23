'use client';

import { useState, useEffect } from 'react';
import { Bot, Brain, Send } from 'lucide-react';

type Agent = {
  id: string;
  name: string;
  system_prompt: string;
  tools: string[];
  max_iterations: number;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [embedModal, setEmbedModal] = useState<string | null>(null);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [embedTab, setEmbedTab] = useState<'widget' | 'api'>('widget');
  const [embedCopied, setEmbedCopied] = useState(false);
  const [chatShowStats, setChatShowStats] = useState(false);
  const [chatStats, setChatStats] = useState<any>(null);
  const [chatStatsLoading, setChatStatsLoading] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (e) {
      console.error('Failed to fetch agents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/agents/${deleteConfirmId}`, { method: 'DELETE' });
      setAgents(prev => prev.filter(a => a.id !== deleteConfirmId));
    } catch (e) {
      console.error('Failed to delete:', e);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const getEmbedCode = (id: string) => {
    return `<script src="http://localhost:3000/embed.js" data-agent="${id}" defer></script>`;
  };

  const getApiCurl = (id: string) => {
    return `curl -X POST http://127.0.0.1:8000/api/chat/stream \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "${id}", "message": "Hello!"}' \\
  --no-buffer`;
  };

  const handleEmbedCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const fetchChatStats = async (agentId: string) => {
    setChatStatsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/agents/${agentId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setChatStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setChatStatsLoading(false);
    }
  };

  const toggleChatStats = () => {
    if (!chatShowStats && chatAgentId && !chatStats) {
      fetchChatStats(chatAgentId);
    }
    setChatShowStats(!chatShowStats);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !chatAgentId) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: chatAgentId, message: userMessage })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let eolIndex;
          while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
            const chunk = buffer.slice(0, eolIndex).trim();
            buffer = buffer.slice(eolIndex + 2);
            if (chunk.startsWith('data: ')) {
              try {
                const data = JSON.parse(chunk.slice(6));
                setChatMessages(prev => [...prev, data]);
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { type: 'message', content: 'Помилка підключення.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderMsg = (msg: any, i: number) => {
    if (msg.type === 'user') return (
      <div key={i} className="flex justify-end mb-2">
        <div className="bg-[var(--accent)] text-[var(--text-inverse)] rounded-xl px-3 py-2 max-w-[80%] text-sm">{msg.content}</div>
      </div>
    );
    if (msg.type === 'thought') return (
      <div key={i} className="mb-1.5">
        <div className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-elevated)] rounded-lg px-3 py-1.5 border border-[var(--border)] inline-flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-[var(--accent)]" />
          <span className="italic font-mono-brand">{msg.content}</span>
        </div>
      </div>
    );
    if (msg.type === 'action') return (
      <div key={i} className="mb-1.5">
        <div className="text-xs bg-[var(--bg-elevated)] rounded-lg px-3 py-2 border border-[var(--accent)] border-opacity-30 inline-block">
          <span className="text-[var(--accent)] font-mono-brand font-semibold">▶ {msg.tool}</span>
          <pre className="text-[10px] text-[var(--text-tertiary)] mt-1">{JSON.stringify(msg.args)}</pre>
        </div>
      </div>
    );
    if (msg.type === 'observation') return (
      <div key={i} className="mb-1.5">
        <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-elevated)] rounded-lg px-3 py-2 border border-[var(--border)] max-w-[90%]">
          <span className="text-[var(--warning)] font-mono-brand text-[10px] uppercase tracking-wider">◉ Observation</span>
          <p className="mt-1 line-clamp-3">{msg.content}</p>
        </div>
      </div>
    );
    if (msg.type === 'status') return (
      <div key={i} className="mb-1 text-center">
        <span className="text-[10px] text-[var(--text-tertiary)] font-mono-brand">{msg.content}</span>
      </div>
    );
    if (msg.type === 'message') return (
      <div key={i} className="flex justify-start mb-2">
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 max-w-[85%] text-sm text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</div>
      </div>
    );
    return null;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-display text-lg hover:text-[var(--accent)] transition-colors">Agentic Studio</a>
            <div className="w-px h-5 bg-[var(--border)]"></div>
            <h1 className="text-sm font-semibold">My Agents</h1>
          </div>
          <a href="/builder" className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-sm font-semibold hover:brightness-110 transition-all">
            + New Agent
          </a>
        </div>
      </header>

      {/* Agent List */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-[var(--text-tertiary)]">Завантаження агентів...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Ще немає агентів</h2>
            <p className="text-[var(--text-tertiary)] mb-6 text-sm">Створіть першого агента у візуальному конструкторі</p>
            <a href="/builder" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-sm font-semibold">
              Open Builder →
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {agents.map(agent => (
              <div key={agent.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/50 hover:shadow-[0_8px_30px_var(--accent-glow)] hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg truncate">{agent.name || 'Unnamed Agent'}</h3>
                      <span className="text-[10px] font-mono-brand text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
                        {agent.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                      {agent.system_prompt || '—'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      {agent.tools?.length > 0 && (
                        <span className="flex items-center gap-1">
                          🛠 {agent.tools.join(', ')}
                        </span>
                      )}
                      <span>⚙ max {agent.max_iterations} steps</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setChatAgentId(agent.id); setChatMessages([]); }}
                      className="px-3 py-1.5 bg-[var(--accent-glow)] text-[var(--accent)] rounded-lg text-xs font-semibold hover:bg-[var(--accent)] hover:text-[var(--text-inverse)] transition-all"
                    >
                      Chat
                    </button>
                    <a
                      href={`/agents/${agent.id}`}
                      className="px-3 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                    >
                      📊 Stats
                    </a>
                    <button
                      onClick={() => setEmbedModal(agent.id)}
                      className="px-3 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:border-[var(--text-tertiary)] transition-colors"
                    >
                      Embed
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(agent.id)}
                      className="px-3 py-1.5 border border-[var(--error)]/30 text-[var(--error)] rounded-lg text-xs font-medium hover:bg-[var(--error)] hover:text-white hover:border-[var(--error)] transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Embed & API Modal */}
      {embedModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => { setEmbedModal(null); setEmbedTab('widget'); setEmbedCopied(false); }}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="border-b border-[var(--border)] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setEmbedTab('widget'); setEmbedCopied(false); }}
                  className={`text-sm font-semibold pb-0.5 transition-colors ${
                    embedTab === 'widget' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Widget
                </button>
                <button
                  onClick={() => { setEmbedTab('api'); setEmbedCopied(false); }}
                  className={`text-sm font-semibold pb-0.5 transition-colors ${
                    embedTab === 'api' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  REST API
                </button>
              </div>
              <button onClick={() => setEmbedModal(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">✕</button>
            </div>
            <div className="p-5">
              {embedTab === 'widget' ? (
                <>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Вставте цей код перед <code className="text-[var(--accent)] font-mono-brand">&lt;/body&gt;</code>:</p>
                  <pre className="bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--accent)] p-3 rounded-lg font-mono-brand text-xs overflow-x-auto">
                    {getEmbedCode(embedModal)}
                  </pre>
                  <button
                    onClick={() => handleEmbedCopy(getEmbedCode(embedModal))}
                    className={`mt-3 px-4 py-2 rounded-lg text-xs font-semibold w-full transition-all ${
                      embedCopied
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]'
                        : 'bg-[var(--accent)] text-[var(--text-inverse)] hover:brightness-110'
                    }`}
                  >
                    {embedCopied ? '✓ Copied!' : 'Copy to Clipboard'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Використовуйте REST API для інтеграції з будь-яким додатком:</p>
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono-brand px-1.5 py-0.5 rounded bg-[var(--success)] text-[var(--text-inverse)] font-bold">POST</span>
                      <span className="text-xs font-mono-brand text-[var(--text-secondary)]">/api/chat/stream</span>
                    </div>
                  </div>
                  <pre className="bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] p-3 rounded-lg font-mono-brand text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap">{getApiCurl(embedModal)}</pre>
                  <div className="mt-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono-brand uppercase tracking-wider mb-1.5">Response: SSE Stream</p>
                    <pre className="text-[11px] font-mono-brand text-[var(--text-secondary)] leading-relaxed">{`data: {"type": "thought", "content": "..."}
data: {"type": "action", "tool": "web_search", ...}
data: {"type": "observation", "content": "..."}
data: {"type": "message", "content": "Final answer"}
data: {"type": "done"}`}</pre>
                  </div>
                  <button
                    onClick={() => handleEmbedCopy(getApiCurl(embedModal))}
                    className={`mt-3 px-4 py-2 rounded-lg text-xs font-semibold w-full transition-all ${
                      embedCopied
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]'
                        : 'bg-[var(--accent)] text-[var(--text-inverse)] hover:brightness-110'
                    }`}
                  >
                    {embedCopied ? '✓ Copied!' : 'Copy curl command'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-sm overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <h2 className="font-semibold text-lg mb-2">Видалити агента?</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">Цю дію неможливо скасувати. Агент буде видалений назавжди.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Скасувати
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-[var(--error)] text-white rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
                >
                  Видалити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel (slides in from right) */}
      {chatAgentId && (
        <div className="fixed inset-y-0 right-0 w-[420px] max-w-full bg-[var(--bg-secondary)] border-l border-[var(--border)] z-40 flex flex-col animate-slide-in-right shadow-2xl shadow-black/40">
          {/* Chat header */}
          <div className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">Agent Chat</span>
              <span className="text-[10px] font-mono-brand text-[var(--text-tertiary)]">{chatAgentId.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleChatStats}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all text-xs ${
                  chatShowStats
                    ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
                title="Agent Stats"
              >
                📊
              </button>
              <a
                href={`/agents/${chatAgentId}`}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors text-xs"
                title="Full Dashboard"
              >
                ↗
              </a>
              <button onClick={() => { setChatAgentId(null); setChatShowStats(false); setChatStats(null); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">✕</button>
            </div>
          </div>

          {/* Inline Stats Panel */}
          {chatShowStats && (
            <div className="border-b border-[var(--border)] bg-[var(--bg-primary)] animate-fade-in">
              {chatStatsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : chatStats ? (
                <div className="px-4 py-3">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-2.5 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text-tertiary)] font-mono-brand uppercase">Розмови</p>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{chatStats.stats.total_conversations}</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-2.5 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text-tertiary)] font-mono-brand uppercase">Повідом.</p>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{chatStats.stats.total_messages}</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-2.5 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text-tertiary)] font-mono-brand uppercase">Серед.</p>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{chatStats.stats.avg_messages_per_conversation}</p>
                    </div>
                  </div>
                  {Object.keys(chatStats.stats.tool_usage).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-[var(--text-tertiary)] font-mono-brand uppercase">Інструменти</p>
                      {Object.entries(chatStats.stats.tool_usage).map(([tool, count]) => {
                        const total = Object.values(chatStats.stats.tool_usage as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                        const pct = Math.round(((count as number) / total) * 100);
                        const labels: Record<string, string> = { web_search: '🔍 Search', calculator: '🧮 Calc', call_api: '🔌 API' };
                        return (
                          <div key={tool} className="flex items-center gap-2">
                            <span className="text-[10px] w-16 text-[var(--text-secondary)] truncate">{labels[tool] || tool}</span>
                            <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono-brand w-8 text-right">{count as number}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-3">Немає даних</p>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-[var(--text-tertiary)]">Задайте питання агенту...</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => renderMsg(msg, i))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] p-3">
            <form onSubmit={handleChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Повідомлення..."
                disabled={chatLoading}
                className="flex-1 px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-sm outline-none transition-colors text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2.5 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
