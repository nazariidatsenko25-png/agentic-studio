'use client';

import { useState, useEffect } from 'react';
import { Brain, ArrowLeft, MessageSquare, BarChart3, Zap } from 'lucide-react';

type AgentStats = {
  agent: {
    id: string;
    name: string;
    system_prompt: string;
    tools: string[];
  };
  stats: {
    total_conversations: number;
    total_messages: number;
    avg_messages_per_conversation: number;
    tool_usage: Record<string, number>;
  };
  recent_conversations: {
    session_id: string;
    first_message: string;
    message_count: number;
    created_at: string;
  }[];
};

export default function AgentDetailPage({ params }: { params: { agent_id: string } }) {
  const [data, setData] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/agents/${params.agent_id}/stats`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError('Не вдалося завантажити аналітику');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [params.agent_id]);

  const toolColors: Record<string, string> = {
    web_search: 'var(--accent)',
    calculator: 'var(--node-guardrail)',
    call_api: 'var(--node-api)',
  };

  const toolLabels: Record<string, string> = {
    web_search: '🔍 Web Search',
    calculator: '🧮 Calculator',
    call_api: '🔌 API Call',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-tertiary)]">Завантаження аналітики...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--error)] mb-4">{error || 'Помилка'}</p>
          <a href="/agents" className="text-sm text-[var(--accent)] hover:underline">← Повернутися</a>
        </div>
      </div>
    );
  }

  const { agent, stats, recent_conversations } = data;
  const totalToolUse = Object.values(stats.tool_usage).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/agents" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Agents
            </a>
            <div className="w-px h-5 bg-[var(--border)]" />
            <div>
              <h1 className="font-semibold text-lg">{agent.name || 'Unnamed Agent'}</h1>
              <p className="text-[10px] text-[var(--text-tertiary)] font-mono-brand">{agent.id.slice(0, 12)}...</p>
            </div>
          </div>
          <a href={`/builder?agent_id=${agent.id}`} className="px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] btn-press transition-all">
            Edit Agent
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/30 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center group-hover:shadow-[0_0_16px_var(--accent-glow)] transition-all">
                <MessageSquare className="w-4.5 h-4.5 text-[var(--accent)]" />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-mono-brand">Розмови</span>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.total_conversations}</p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/30 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center group-hover:shadow-[0_0_16px_var(--accent-glow)] transition-all">
                <BarChart3 className="w-4.5 h-4.5 text-[var(--accent)]" />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-mono-brand">Повідомлення</span>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.total_messages}</p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/30 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center group-hover:shadow-[0_0_16px_var(--accent-glow)] transition-all">
                <Brain className="w-4.5 h-4.5 text-[var(--accent)]" />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-mono-brand">Серед. довж.</span>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.avg_messages_per_conversation}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">повідомлень/розмова</p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/30 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center group-hover:shadow-[0_0_16px_var(--accent-glow)] transition-all">
                <Zap className="w-4.5 h-4.5 text-[var(--accent)]" />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-mono-brand">Інструменти</span>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{totalToolUse}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">викликів</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tool Usage */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
              <span className="text-[var(--accent)]">⚡</span>
              Використання інструментів
            </h2>
            {totalToolUse === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Ще немає даних</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.tool_usage).map(([tool, count]) => {
                  const pct = Math.round((count / totalToolUse) * 100);
                  return (
                    <div key={tool}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-[var(--text-primary)]">{toolLabels[tool] || tool}</span>
                        <span className="text-xs font-mono-brand text-[var(--text-tertiary)]">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: toolColors[tool] || 'var(--accent)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Conversations */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
              <span className="text-[var(--accent)]">💬</span>
              Останні розмови
            </h2>
            {recent_conversations.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Ще немає розмов</p>
            ) : (
              <div className="space-y-2">
                {recent_conversations.map((conv) => (
                  <div
                    key={conv.session_id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/30 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-[var(--accent-glow)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--text-primary)] truncate font-medium">{conv.first_message || '—'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono-brand">{conv.message_count} msgs</span>
                        {conv.created_at && (
                          <>
                            <span className="text-[10px] text-[var(--text-tertiary)]">·</span>
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono-brand">
                              {new Date(conv.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Config Preview */}
        <div className="mt-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="text-[var(--accent)]">⚙</span>
            Конфігурація агента
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 font-mono-brand">Системний промпт</p>
              <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)] leading-relaxed">
                {agent.system_prompt || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 font-mono-brand">Інструменти</p>
              <div className="flex flex-wrap gap-2">
                {(agent.tools || []).length > 0 ? agent.tools.map(tool => (
                  <span key={tool} className="px-2.5 py-1 bg-[var(--accent-glow)] text-[var(--accent)] rounded-md text-xs font-medium">
                    {toolLabels[tool] || tool}
                  </span>
                )) : (
                  <span className="text-xs text-[var(--text-tertiary)]">Немає інструментів</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
