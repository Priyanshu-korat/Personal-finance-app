import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function AIAssistantSheet({ isOpen, onClose, tabBarRef, shellRef }) {
  const { state } = useFinance();
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi! I\'m your personal financial analyst. I have full access to your data. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | aura | reveal
  const endRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Staged opening animation: aura burst → content reveal
  useEffect(() => {
    if (isOpen) {
      setMessages([{ role: 'ai', text: 'Hi! I\'m your personal financial analyst. I have full access to your data. What would you like to know?' }]);
      setInput('');
      setIsTyping(false);
      setPhase('aura');     // Step 1: aurora light floods the screen
      setTimeout(() => setPhase('reveal'), 400); // Step 2: modal crystallizes from center
    } else {
      setPhase('idle');
    }
  }, [isOpen]);

  // AI Logic Engine
  const generateResponse = (query) => {
    const q = query.toLowerCase();
    const txs = state.transactions || [];
    const expenses = txs.filter(t => t.type === 'Expense');
    const income = txs.filter(t => t.type === 'Income');

    if (q.includes('spend') || q.includes('spent') || q.includes('total expense')) {
      const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      return `You've spent a total of **${total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}** across all your recorded transactions.`;
    }
    if (q.includes('highest') || q.includes('most') || q.includes('biggest') || q.includes('top')) {
      if (!expenses.length) return "You haven't recorded any expenses yet!";
      const cats = {};
      expenses.forEach(t => { cats[t.category] = (cats[t.category] || 0) + Number(t.amount); });
      const [top, val] = Object.entries(cats).sort(([,a],[,b]) => b-a)[0];
      return `Your top spending category is **${top}** at **${Number(val).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}** total.`;
    }
    if (q.includes('income') || q.includes('earn') || q.includes('salary')) {
      const total = income.reduce((sum, t) => sum + Number(t.amount), 0);
      return `Your total recorded income is **${total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}**.`;
    }
    if (q.includes('analyz') || q.includes('summary') || q.includes('overview') || q.includes('report')) {
      const totalExp = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalInc = income.reduce((sum, t) => sum + Number(t.amount), 0);
      const diff = totalInc - totalExp;
      const sign = diff >= 0 ? '+' : '';
      return `Here's your financial snapshot:\n\n**Income:** ${totalInc.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}\n**Expenses:** ${totalExp.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}\n**Net Flow:** ${sign}${diff.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`;
    }
    if (q.includes('transaction') || q.includes('entries') || q.includes('count') || q.includes('how many')) {
      return `You have **${txs.length} transactions** recorded — ${expenses.length} expenses, ${income.length} income entries, and ${txs.filter(t => t.type === 'Investment').length} investments.`;
    }
    return "Try asking: *'How much did I spend?'*, *'What's my top category?'*, or *'Give me a summary.'*";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: generateResponse(userMessage) }]);
      setIsTyping(false);
    }, 1200);
  };

  if (phase === 'idle') return null;

  return (
    <div
      className="sheet-overlay anim-fade-in"
      onClick={onClose}
    >
      {/* ── SOFT BREATHING GRADIENT GLOW ── */}
      <div className="ai-aura-center" aria-hidden="true" />

      {/* ── AURA RING ── */}
      <div className={`ai-aura-ring ${phase === 'reveal' ? 'ai-aura-ring--active' : ''}`} />

      {/* ── AI SHEET (Matches +New button layout) ── */}
      <div
        className={`sheet-modal lg lg-r-xl ai-custom-sheet ${phase === 'reveal' ? 'ai-modal-card--visible' : 'ai-modal-card--hidden'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        
        {/* Living aurora orbs inside the card */}
        <div className="ai-card-orbs" aria-hidden="true">
          <div className="ai-orb ai-orb-1" />
          <div className="ai-orb ai-orb-2" />
          <div className="ai-orb ai-orb-3" />
        </div>

        {/* Rotating conic gradient border */}
        <div className="ai-spinning-border" aria-hidden="true" />

        {/* ── HEADER ── */}
        <div className="ai-header" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ai-icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="white" />
                <path d="M19 2L19.75 4.75L22.5 5.5L19.75 6.25L19 9L18.25 6.25L15.5 5.5L18.25 4.75L19 2Z" fill="rgba(255,255,255,0.7)" />
                <path d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z" fill="rgba(255,255,255,0.5)" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>Finance AI</div>
              <div className="aurora-text" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em' }}>LIVE · PERSONAL DATA</div>
            </div>
          </div>
          <button className="ai-close-btn" onClick={onClose} aria-label="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── CHAT ── */}
        <div className="ai-chat-area hide-scrollbar" style={{ position: 'relative', zIndex: 10 }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={msg.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-ai'}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {msg.role === 'ai' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--c-cyan)' }} />
                  <span className="aurora-text" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>ANALYST</span>
                </div>
              )}
              <div
                className="ai-message-text"
                dangerouslySetInnerHTML={{ __html:
                  msg.text
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--t-primary);font-weight:700;">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em style="color:var(--t-secondary)">$1</em>')
                }}
              />
            </div>
          ))}

          {isTyping && (
            <div className="ai-bubble-ai ai-thinking">
              <div className="aurora-text" style={{ fontSize: '13px', fontWeight: 600 }}>Analyzing your data...</div>
              <div className="ai-think-bar" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* ── INPUT ── */}
        <div className="ai-input-area" style={{ position: 'relative', zIndex: 10 }}>
          <div className="ai-suggestions">
            {['Analyze spending', 'Top category', 'How many transactions?'].map(s => (
              <button key={s} className="ai-chip" onClick={() => { setInput(s); }}>
                {s}
              </button>
            ))}
          </div>
          <div className="ai-input-row">
            <input
              className="ai-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about your finances..."
              autoFocus
            />
            <button
              className={`ai-send-btn ${input.trim() ? 'ai-send-btn--active' : ''}`}
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
