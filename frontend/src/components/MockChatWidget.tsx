'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/agentStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MockChatWidget({ agentId, inline }: { agentId?: string; inline?: boolean }) {
  const [isOpen, setIsOpen] = useState(!!agentId || !!inline);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const getAgentConfig = useStore(state => state.getAgentConfig);
  const getWorkflowConfig = useStore(state => state.getWorkflowConfig);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Load conversation history if a session exists
  useEffect(() => {
    if (!agentId) return;
    const storedSid = typeof window !== 'undefined' ? localStorage.getItem(`session_${agentId}`) : null;
    if (!storedSid) return;
    setSessionId(storedSid);
    
    fetch(`http://127.0.0.1:8000/api/sessions/${storedSid}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          const restored = data.messages.map((m: any) => ({
            type: m.role === 'user' ? 'user' : 'message',
            content: m.content,
          }));
          setMessages(restored);
        }
      })
      .catch(() => {});
  }, [agentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setLoading(true);
    setStreamingText('');

    try {
      let url = 'http://127.0.0.1:8000/api/chat/stream';
      let payload;

      if (agentId) {
        payload = {
          agent_id: agentId,
          message: userMessage,
          session_id: sessionId
        };
      } else {
        // Check if this is a multi-step workflow
        const workflowConfig = getWorkflowConfig();
        if (workflowConfig.mode === 'workflow') {
          url = 'http://127.0.0.1:8000/api/workflow/stream';
          payload = {
            steps: workflowConfig.steps,
            message: userMessage
          };
        } else {
          // Single agent mode (backward compat)
          const config = workflowConfig.singleConfig || getAgentConfig();
          payload = {
            ...config,
            message: userMessage
          };
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokenAccumulator = '';

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
              const dataStr = chunk.slice(6);
              try {
                const data = JSON.parse(dataStr);
                
                if (data.type === 'token') {
                  // Accumulate tokens for live streaming effect
                  tokenAccumulator += data.content;
                  setStreamingText(tokenAccumulator);
                } else if (data.type === 'session_id' || data.type === 'session_created') {
                  // Store session_id for conversation history
                  const sid = data.content || data.session_id;
                  if (sid) {
                    setSessionId(sid);
                    if (agentId && typeof window !== 'undefined') {
                      localStorage.setItem(`session_${agentId}`, sid);
                    }
                  }
                } else if (data.type === 'message') {
                  // Final complete message — flush any accumulated tokens
                  if (tokenAccumulator) {
                    setStreamingText('');
                    tokenAccumulator = '';
                  }
                  setMessages(prev => [...prev, data]);
                } else if (data.type === 'done') {
                  // Stream finished — flush remaining tokens as a message
                  if (tokenAccumulator) {
                    setMessages(prev => [...prev, { type: 'message', content: tokenAccumulator }]);
                    setStreamingText('');
                    tokenAccumulator = '';
                  }
                } else {
                  // thought, action, observation, status, step_start, step_end
                  setMessages(prev => [...prev, data]);
                }
              } catch (e) {
                console.error('Failed to parse JSON chunk:', e);
              }
            }
          }
        }

        // Flush any remaining tokens after stream ends
        if (tokenAccumulator) {
          setMessages(prev => [...prev, { type: 'message', content: tokenAccumulator }]);
          setStreamingText('');
        }
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
      setMessages(prev => [...prev, { type: 'message', content: 'Помилка підключення до сервера.' }]);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const renderMarkdown = (content: string) => (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none text-[var(--text-primary)] prose-p:leading-relaxed prose-pre:bg-[var(--bg-primary)] prose-pre:border prose-pre:border-[var(--border)] prose-headings:text-[var(--text-primary)] prose-a:text-[var(--accent)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--accent)] prose-li:text-[var(--text-secondary)]"
    >
      {content}
    </ReactMarkdown>
  );

  const renderMessageContent = (msg: any, index: number) => {
    switch (msg.type) {
      case 'user':
        return (
          <div key={index} className="flex justify-end mb-3 animate-slide-in-from-right">
            <div className="bg-[var(--accent)] text-[var(--text-inverse)] rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        );
      
      // ─── ITERATION LIFECYCLE ───
      case 'iter_start':
        return (
          <div key={index} className="mb-2 mt-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-[var(--text-inverse)] shadow-[0_0_12px_var(--accent-glow-strong)]">
                {msg.iteration}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--accent)] font-mono-brand">
                  Ітерація {msg.iteration}/{msg.max}
                </span>
                {msg.elapsed > 0 && (
                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono-brand">
                    {msg.elapsed}s
                  </span>
                )}
                <div className="flex-1 h-px bg-[var(--border)]" />
                <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        );
      case 'iter_end':
        return (
          <div key={index} className="mb-3 animate-fade-in">
            <div className="flex items-center gap-2 ml-8">
              <div className="flex-1 h-px bg-[var(--success)] opacity-30" />
              <span className="text-[10px] font-mono-brand text-[var(--success)] flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {msg.elapsed}s
              </span>
            </div>
          </div>
        );
      
      // ─── PHASE INDICATORS ───
      case 'phase':
        const phaseConfig: Record<string, { icon: string; label: string; color: string }> = {
          thinking: { icon: '🧠', label: 'Аналіз', color: 'var(--accent)' },
          acting: { icon: '⚡', label: `Виклик: ${msg.tool || 'tool'}`, color: 'var(--warning)' },
          observing: { icon: '👁', label: `Результат${msg.elapsed ? ` (${msg.elapsed}s)` : ''}`, color: 'var(--node-guardrail)' },
          responding: { icon: '✍', label: 'Формує відповідь', color: 'var(--success)' },
        };
        const phase = phaseConfig[msg.phase] || { icon: '•', label: msg.phase, color: 'var(--text-tertiary)' };
        return (
          <div key={index} className="flex items-center gap-2 ml-3 mb-1 animate-fade-in">
            <div className="w-px h-3 ml-[11px]" style={{ background: phase.color, opacity: 0.3 }} />
            <span className="text-[10px] flex items-center gap-1 font-mono-brand font-semibold" style={{ color: phase.color }}>
              <span>{phase.icon}</span>
              {phase.label}
            </span>
            {msg.phase === 'thinking' && (
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        );

      case 'status':
        return (
          <div key={index} className="mb-1.5 ml-8 animate-fade-in">
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono-brand">{msg.content}</span>
          </div>
        );

      // ─── WORKFLOW STEPS ───
      case 'step_start':
        return (
          <div key={index} className="mb-3 animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent)] border-opacity-30">
              <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-[var(--text-inverse)]">
                {(msg.step_index ?? 0) + 1}
              </div>
              <span className="text-xs font-semibold text-[var(--accent)]">
                Крок {(msg.step_index ?? 0) + 1}/{msg.total_steps}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] truncate flex-1">
                {msg.step_label}
              </span>
              <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
            </div>
          </div>
        );
      case 'step_end':
        return (
          <div key={index} className="mb-3 animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.08)] border border-[var(--success)] border-opacity-20">
              <span className="text-[10px] text-[var(--success)] font-mono-brand font-semibold">
                ✓ Крок {(msg.step_index ?? 0) + 1} завершено
              </span>
            </div>
          </div>
        );

      // ─── REACT TRACE EVENTS ───
      case 'thought':
        return (
          <div key={index} className="ml-3 mb-1.5 animate-fade-in">
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className="w-[3px] flex-1 rounded-full" style={{ background: 'var(--accent)', opacity: 0.2 }} />
              </div>
              <div className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-xs border border-[var(--border)] border-l-2 border-l-[var(--accent)]">
                <div className="flex items-center gap-1.5 mb-1 text-[var(--accent)] font-mono-brand text-[10px] uppercase tracking-wider font-semibold">
                  <span>🧠</span>
                  Think
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">{msg.content}</p>
              </div>
            </div>
          </div>
        );
      case 'action':
        return (
          <div key={index} className="ml-3 mb-1.5 animate-fade-in">
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className="w-[3px] flex-1 rounded-full" style={{ background: 'var(--warning)', opacity: 0.2 }} />
              </div>
              <div className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-xs border border-[var(--border)] border-l-2 border-l-[var(--warning)]">
                <div className="font-semibold flex items-center gap-1.5 text-[var(--warning)] font-mono-brand text-[10px] uppercase tracking-wider">
                  <span>⚡</span>
                  Act — {msg.tool}
                </div>
                <pre className="overflow-x-auto text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] p-1.5 rounded font-mono-brand mt-1">{JSON.stringify(msg.args || msg.input, null, 2)}</pre>
              </div>
            </div>
          </div>
        );
      case 'observation':
        return (
          <div key={index} className="ml-3 mb-1.5 animate-fade-in">
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className="w-[3px] flex-1 rounded-full" style={{ background: 'var(--node-guardrail)', opacity: 0.2 }} />
              </div>
              <div className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-xs border border-[var(--border)] border-l-2 border-l-[var(--node-guardrail)]">
                <div className="font-semibold mb-1 flex items-center gap-1.5 font-mono-brand text-[10px] uppercase tracking-wider" style={{ color: 'var(--node-guardrail)' }}>
                  <span>👁</span>
                  Observe
                </div>
                <div className="line-clamp-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">{msg.content}</div>
              </div>
            </div>
          </div>
        );

      // ─── FINAL RESPONSE ───
      case 'message':
      default:
        return (
          <div key={index} className="flex justify-start mb-3 animate-slide-in-left">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
              <div className="text-sm leading-relaxed">{renderMarkdown(msg.content || '')}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* FAB Toggle */}
      {!agentId && !inline && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent)] rounded-full shadow-[0_0_30px_var(--accent-glow-strong)] flex items-center justify-center text-[var(--text-inverse)] hover:scale-110 btn-press z-50 ${isOpen ? 'scale-0 opacity-0 transition-all duration-200' : 'scale-100 opacity-100 animate-breathe'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      <div 
        className={(agentId || inline)
          ? `w-full h-full bg-[var(--bg-primary)] flex flex-col overflow-hidden`
          : `fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[85vh] bg-[var(--bg-primary)] rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden z-50 border border-[var(--border)] ${isOpen ? 'animate-scale-in' : 'scale-0 opacity-0 pointer-events-none transition-all duration-200'}`}
      >
        {/* Header */}
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-3 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Agentic AI</h3>
              <p className="text-[10px] text-[var(--text-tertiary)] font-mono-brand">ReAct Live Tracking</p>
            </div>
          </div>
          {!agentId && !inline && (
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {messages.length === 0 && !streamingText ? (
             <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
               <div className="w-12 h-12 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center mb-4 animate-float">
                 <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
               </div>
               <p className="text-sm text-[var(--text-tertiary)] max-w-[200px]">Поставте запитання — я використаю інструменти для відповіді.</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => renderMessageContent(msg, index))}
              {/* Live streaming text */}
              {streamingText && (
                <div className="flex justify-start mb-3 animate-slide-in-left">
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                    <div className="text-sm leading-relaxed">
                      {renderMarkdown(streamingText)}
                      <span className="inline-block w-[2px] h-4 bg-[var(--accent)] ml-0.5 animate-typewriter-blink rounded-sm" />
                    </div>
                  </div>
                </div>
              )}
              {/* Typing indicator */}
              {loading && !streamingText && messages[messages.length - 1]?.type === 'user' && (
                <div className="flex justify-start mb-3 animate-fade-in">
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="dot-pulse">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] z-10">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Введіть повідомлення..."
              className="w-full pl-4 pr-12 py-3 bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] rounded-xl text-sm transition-all outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 text-[var(--accent)] disabled:text-[var(--text-tertiary)] hover:bg-[var(--accent-glow)] rounded-lg btn-press transition-colors"
            >
              <svg className="w-5 h-5 -rotate-90 transition-transform duration-200 hover:-rotate-[80deg]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
