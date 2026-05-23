'use client';

import MockChatWidget from '@/components/MockChatWidget';
import { Puzzle, Brain, Rocket } from 'lucide-react';
import { useScrollReveal, useScrollRevealChildren } from '@/components/useScrollReveal';

export default function Home() {
  const featuresRef = useScrollRevealChildren('.scroll-reveal-scale', 150);
  const techLeftRef = useScrollReveal<HTMLDivElement>();
  const techRightRef = useScrollReveal<HTMLDivElement>();
  const footerRef = useScrollReveal<HTMLDivElement>();

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="font-display text-lg">Agentic Studio</span>
          <div className="flex items-center gap-6">
            <a href="/agents" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">My Agents</a>
            <a href="/builder" className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-sm font-semibold hover:brightness-110 transition-all btn-press">
              Builder
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center noise-overlay">
        {/* Animated gradient orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-[0.04] blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px] animate-float-reverse"></div>
        <div className="absolute top-[30%] left-[40%] w-[300px] h-[300px] rounded-full bg-[#7DFFEE] opacity-[0.02] blur-[80px] animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="max-w-6xl mx-auto px-6 relative z-10 py-24">
          {/* Status badge */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] mb-10 hover-lift">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
              </span>
              <span className="text-xs font-mono-brand tracking-wider uppercase text-[var(--text-secondary)]">Platform Active</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up delay-1 font-display text-5xl sm:text-6xl md:text-8xl leading-[0.95] tracking-tight mb-8 max-w-4xl text-balance">
            Build Autonomous{' '}
            <span className="italic animate-shimmer">AI Agents</span>
            <br />Without Code
          </h1>

          {/* Subhead */}
          <p className="animate-fade-in-up delay-2 text-lg md:text-xl text-[var(--text-secondary)] mb-12 max-w-2xl leading-relaxed">
            Визуально проєктуйте агентів, оснащуйте інструментами та деплойте 
            чат-віджет на будь-який сайт одним рядком JS.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up delay-3 flex flex-col sm:flex-row gap-4">
            <a 
              href="/builder" 
              className="group inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent)] text-[var(--text-inverse)] font-semibold rounded-xl text-lg btn-press hover:shadow-[0_0_40px_var(--accent-glow-strong)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Open Builder
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
            <a 
              href="#features" 
              className="inline-flex items-center gap-2 px-8 py-4 border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl text-lg btn-press hover:border-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-all duration-300"
            >
              How It Works
            </a>
          </div>

          {/* Code snippet preview */}
          <div className="animate-fade-in-up delay-5 mt-16 max-w-lg">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 font-mono-brand text-sm hover-lift">
              <div className="flex gap-1.5 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--error)] opacity-60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] opacity-60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] opacity-60"></div>
              </div>
              <code className="text-[var(--text-secondary)]">
                <span className="text-[var(--text-tertiary)]">&lt;</span>
                <span className="text-[var(--accent)]">script</span>
                {' '}
                <span className="text-[var(--warning)]">src</span>
                <span className="text-[var(--text-tertiary)]">=</span>
                <span className="text-[var(--success)]">&quot;/embed.js&quot;</span>
                {' '}
                <span className="text-[var(--warning)]">data-agent</span>
                <span className="text-[var(--text-tertiary)]">=</span>
                <span className="text-[var(--success)]">&quot;your-id&quot;</span>
                <span className="text-[var(--text-tertiary)]"> /&gt;</span>
                <span className="inline-block w-[2px] h-4 bg-[var(--accent)] ml-1 animate-typewriter-blink align-middle" />
              </code>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="animate-fade-in delay-6 mt-20 flex justify-center">
            <a href="#features" className="animate-scroll-hint text-[var(--text-tertiary)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-20">
            <p className="font-mono-brand text-xs tracking-[0.2em] uppercase text-[var(--accent)] mb-4">Features</p>
            <h2 className="font-display text-4xl md:text-6xl tracking-tight text-balance">
              Everything you need<br />
              <span className="text-[var(--text-tertiary)]">nothing you don't.</span>
            </h2>
          </div>

          <div ref={featuresRef} className="grid md:grid-cols-3 gap-px bg-[var(--border)] rounded-2xl overflow-hidden">
            {/* Feature 1 */}
            <div className="scroll-reveal-scale stagger-1 bg-[var(--bg-primary)] p-8 md:p-10 group hover:bg-[var(--bg-secondary)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center mb-6 group-hover:shadow-[0_0_20px_var(--accent-glow)] transition-shadow duration-300 group-hover:animate-glow-pulse">
                <Puzzle className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Visual Builder</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                Drag-and-drop блоки: промпт, інструменти, обмеження. Зберіть повну логіку агента за хвилину без єдиного рядка бекенд-коду.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="scroll-reveal-scale stagger-3 bg-[var(--bg-primary)] p-8 md:p-10 group hover:bg-[var(--bg-secondary)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center mb-6 group-hover:shadow-[0_0_20px_var(--accent-glow)] transition-shadow duration-300 group-hover:animate-glow-pulse">
                <Brain className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Live Thought Tracking</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                SSE-потік показує роздуми агента в реальному часі: думки → виклик інструменту → спостереження → відповідь.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="scroll-reveal-scale stagger-5 bg-[var(--bg-primary)] p-8 md:p-10 group hover:bg-[var(--bg-secondary)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center mb-6 group-hover:shadow-[0_0_20px_var(--accent-glow)] transition-shadow duration-300 group-hover:animate-glow-pulse">
                <Rocket className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Deploy Anywhere</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                Один JS-сніпет — і ваш автономний чат-віджет працює на Shopify, WordPress чи будь-якому HTML-сайті.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-24 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div ref={techLeftRef} className="scroll-reveal-left">
              <p className="font-mono-brand text-xs tracking-[0.2em] uppercase text-[var(--accent)] mb-4">Architecture</p>
              <h2 className="font-display text-4xl md:text-5xl tracking-tight mb-6 text-balance">
                Built on a<br />
                <span className="italic text-[var(--accent)]">modern stack.</span>
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Кожен компонент підібраний для максимальної швидкості та надійності.
                Кастомний ReAct Engine за ~100 рядків Python замість важких фреймворків.
              </p>
            </div>
            <div ref={techRightRef} className="scroll-reveal-right">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 font-mono-brand text-sm hover-lift">
                <div className="flex gap-1.5 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--error)] opacity-60"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] opacity-60"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] opacity-60"></div>
                </div>
                <div className="space-y-2 text-[var(--text-secondary)]">
                  <div><span className="text-[var(--accent)]">frontend</span>  → Next.js 14 App Router</div>
                  <div><span className="text-[var(--accent)]">state</span>     → React Flow + Zustand</div>
                  <div><span className="text-[var(--accent)]">backend</span>   → FastAPI + Python</div>
                  <div><span className="text-[var(--accent)]">database</span>  → Supabase (Postgres)</div>
                  <div><span className="text-[var(--accent)]">ai_model</span>  → Gemini 2.5 Flash</div>
                  <div><span className="text-[var(--accent)]">search</span>    → Tavily API</div>
                  <div><span className="text-[var(--accent)]">stream</span>    → Server-Sent Events</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer ref={footerRef} className="scroll-reveal border-t border-[var(--border)] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-display text-xl tracking-tight">Agentic Studio</div>
          <p className="text-sm text-[var(--text-tertiary)]">© 2026 · Built for the 48-hour Hackathon</p>
        </div>
      </footer>

      {/* Chat Widget */}
      <MockChatWidget />
    </main>
  );
}
