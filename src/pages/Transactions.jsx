import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import EditTransactionSheet from '../components/EditTransactionSheet';

const FILTERS = ['All', 'Expense', 'Income', 'Investment', 'Transfer'];

const getCategoryDetails = (category, type) => {
  const c = (category || '').toLowerCase();
  if (type === 'Transfer') return { icon: '🔄', color: 'var(--c-purple)' };
  if (type === 'Income') return { icon: '💰', color: 'var(--c-green)' };
  if (type === 'Investment') return { icon: '📈', color: 'var(--c-indigo-lt)' };
  if (c.includes('food') || c.includes('dining') || c.includes('swiggy')) return { icon: '🍔', color: 'var(--c-orange)' };
  if (c.includes('transport') || c.includes('car') || c.includes('fuel') || c.includes('uber')) return { icon: '🚕', color: 'var(--c-cyan)' };
  if (c.includes('shop') || c.includes('grocery') || c.includes('amazon')) return { icon: '🛍️', color: 'var(--c-purple)' };
  if (c.includes('bill') || c.includes('util') || c.includes('emi')) return { icon: '📄', color: 'var(--c-red)' };
  if (c.includes('health') || c.includes('med')) return { icon: '💊', color: 'var(--c-pink)' };
  if (c.includes('entertainment') || c.includes('movie')) return { icon: '🍿', color: 'var(--c-gold)' };
  return { icon: '💳', color: 'var(--c-blue)' };
};

const formatGroupDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function Transactions() {
  const { state } = useFinance();
  const allTransactions = state.transactions || [];
  const accounts = state.accounts || [];
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Scroll listener for dynamic frosted glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredTransactions = useMemo(() => {
    return allTransactions
      .filter(tx => {
        if (activeFilter !== 'All' && tx.type !== activeFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (tx.title || '').toLowerCase().includes(q);
          const matchCat = (tx.category || '').toLowerCase().includes(q);
          if (!matchTitle && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allTransactions, activeFilter, searchQuery]);

  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(tx => {
      const groupDate = formatGroupDate(tx.date);
      if (!groups[groupDate]) groups[groupDate] = [];
      groups[groupDate].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Top Mask to prevent scroll leak behind the transparent App logo */}
      <div 
        style={{
          position: 'sticky', /* Using sticky bypasses parent transform/animation bugs that break fixed positioning */
          top: 0, 
          height: '60px',
          marginBottom: '-60px', /* Take up 0 flow space */
          background: 'var(--bg-base)', 
          zIndex: 40, 
          pointerEvents: 'none'
        }}
      />

      {/* Dynamic Header & Search Area */}
      <div 
        style={{ 
          position: 'sticky',
          top: '60px', /* Sit below the top mask */
          zIndex: 45, /* Safely above the mask and list items */
          margin: isScrolled ? '0 16px' : '0', /* Floating pill effect when scrolled */
          padding: '16px 24px 20px 24px',
          background: isScrolled ? 'var(--lg-bg)' : 'transparent', /* Adapts to light/dark mode */
          backdropFilter: isScrolled ? 'blur(40px) saturate(200%)' : 'none', 
          WebkitBackdropFilter: isScrolled ? 'blur(40px) saturate(200%)' : 'none',
          border: isScrolled ? '1px solid var(--lg-border)' : '1px solid transparent',
          borderRadius: isScrolled ? '24px' : '0', /* All corners rounded */
          boxShadow: isScrolled ? 'var(--lg-shadow-lift)' : 'none',
          transition: 'all 0.5s cubic-bezier(0.3, 1, 0.3, 1)'
        }}
      >
        <h2 className="title-large anim-fade-up d-0" style={{ marginBottom: '24px' }}>Entries</h2>
        
        {/* Sleek Search Bar */}
        <div className="anim-fade-in d-1 flex items-center" style={{ position: 'relative', marginBottom: '24px' }}>
          <span style={{ position: 'absolute', left: '16px', fontSize: '18px', opacity: 0.5, pointerEvents: 'none' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search merchants, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="lg lg-r-full outline-none transition-all"
            style={{ 
              width: '100%',
              padding: '14px 14px 14px 44px',
              fontSize: '15px',
              background: 'var(--lg-fill)', 
              border: '1px solid var(--lg-border)',
              color: 'var(--t-primary)',
              boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)'
            }}
          />
        </div>

        {/* Elegant Filter Chips */}
        <div className="flex hide-scrollbar anim-fade-in d-2" style={{ gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="transition-all duration-300"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '8px 18px',
                  borderRadius: '100px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--t-primary)' : 'var(--t-tertiary)',
                  background: isActive ? 'var(--lg-fill)' : 'transparent',
                  border: isActive ? '1px solid var(--lg-border)' : '1px solid transparent',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
        
        {/* Subtle Bottom Separator Line (Fades out when scrolled) */}
        <div style={{ height: '1px', background: 'var(--lg-border)', width: '100%', opacity: isScrolled ? 0 : 1, transition: 'opacity 0.3s' }} />
      </div>

      {/* Grouped Timeline */}
      <div className="flex flex-col anim-fade-in d-3" style={{ padding: '0 24px', marginTop: '32px', gap: '48px' }}>
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="lg lg-r-2xl lg-p-lg empty text-center" style={{ marginTop: '32px' }}>
            <div className="empty-glyph opacity-50" style={{ fontSize: '36px', marginBottom: '8px' }}>💸</div>
            <p className="headline t-secondary">No entries found</p>
            <p className="caption t-tertiary">Try a different search or filter.</p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date} style={{ position: 'relative' }}>
              {/* Normal Flowing Date Header */}
              <div className="flex items-center" style={{ 
                padding: '16px 4px 8px 4px', 
                gap: '12px'
              }}>
                <div style={{ width: '4px', height: '14px', background: 'var(--c-cyan)', borderRadius: '2px' }} />
                <span className="subhead fw-bold t-secondary">{date}</span>
              </div>

              {/* Transactions List Container */}
              <div className="flex flex-col">
                {txs.map((t, index) => {
                  const { icon, color } = getCategoryDetails(t.category, t.type);
                  const isExpense = t.type === 'Expense';
                  const isIncome = t.type === 'Income';
                  const hasAccount = t.account && t.account.trim().length > 0;
                  
                  return (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between lg-interactive"
                      onClick={() => setSelectedTransaction(t)}
                      style={{ 
                        borderBottom: index < txs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        margin: '0 -10px',
                        padding: '16px 10px',
                        borderRadius: '12px'
                      }}
                    >
                      <div className="flex items-center" style={{ gap: '16px' }}>
                        {/* Crisp Category Icon */}
                        <div 
                          className="flex items-center justify-center"
                          style={{
                            flexShrink: 0,
                            position: 'relative',
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.1), 0 4px 10px rgba(0,0,0,0.3)',
                            fontSize: '22px'
                          }}
                        >
                          <div 
                            style={{ 
                              position: 'absolute', inset: 0, borderRadius: '16px', 
                              opacity: 0.2, pointerEvents: 'none', background: color, filter: 'blur(8px)' 
                            }} 
                          />
                          <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>
                        </div>
                        
                        {/* Details */}
                        <div className="flex flex-col" style={{ gap: '4px' }}>
                          {t.type === 'Transfer' ? (
                            <>
                              <span className="fw-bold" style={{ fontSize: '16px', letterSpacing: '0.2px' }}>
                                {(() => {
                                  const fromAcc = accounts.find(a => a.id === t.accountId)?.name || 'Account';
                                  const toAcc = accounts.find(a => a.id === t.toAccountId)?.name || 'Account';
                                  return `${fromAcc} ➔ ${toAcc}`;
                                })()}
                              </span>
                              <span className="caption t-tertiary" style={{ fontSize: '13px' }}>
                                Self Transfer {t.title !== 'Transfer' ? `• ${t.title}` : ''}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="fw-bold" style={{ fontSize: '16px', letterSpacing: '0.2px' }}>
                                {t.title || t.category}
                              </span>
                              <span className="caption t-tertiary" style={{ fontSize: '13px' }}>
                                {t.category} {hasAccount ? `• ${t.account}` : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Precise Amount */}
                      <div className="flex flex-col items-end">
                        <span 
                          className="fw-bold" 
                          style={{ 
                            fontSize: '17px',
                            letterSpacing: '0.3px',
                            color: t.type === 'Transfer' ? 'var(--c-purple)' : isExpense ? 'var(--text-primary)' : isIncome ? 'var(--c-green)' : 'var(--c-cyan)'
                          }}
                        >
                          {t.type === 'Transfer' ? '' : isExpense ? '-' : '+'}{parseFloat(t.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <EditTransactionSheet 
        transaction={selectedTransaction} 
        onClose={() => setSelectedTransaction(null)} 
      />
    </div>
  );
}
