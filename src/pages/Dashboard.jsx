import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import SetupWizard from '../components/SetupWizard';
import LiquidSelect from '../components/LiquidSelect';
import SavingsPotsWidget from '../components/SavingsPotsWidget';
import HealthScoreWidget from '../components/HealthScoreWidget';
import { useFinance } from '../context/FinanceContext';
import AddSubscriptionSheet from '../components/AddSubscriptionSheet';
import PulseLine from '../components/charts/PulseLine';

// ============================================
// DASHBOARD — Apple Photos inspired layout
// Large title · Staggered grid · Spring cards
// ============================================

// METRICS will be dynamically calculated

const fmt = (n, sign = false) => {
  const s = '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  if (n < 0) return '-' + s
  if (sign && n > 0) return '+' + s
  return s
}

/* Small icon pill */
function IconPill({ emoji, colorClass }) {
  return (
    <div className={`m-icon ${colorClass}`} style={{ marginBottom: 'var(--s3)' }}>
      {emoji}
    </div>
  )
}

/* Hero metric card */
function HeroCard({ label, value, sub, colorClass, pulseData, pulseColor }) {
  return (
    <div
      className={`lg lg-r-3xl lg-p-xl lg-interactive lg-tint-indigo anim-fade-up d-1`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {pulseData && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', opacity: 0.6, zIndex: 0, pointerEvents: 'none' }} className="anim-fade-in d-4">
          <PulseLine data={pulseData} color={pulseColor || 'var(--c-indigo)'} strokeWidth={1.5} />
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p className="m-label">{label}</p>
        <p
          className="anim-count-up d-2"
          style={{
            fontSize: 46,
            fontWeight: 900,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            color: 'var(--c-indigo-lt)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
        <p className="m-sub anim-fade-in d-3">{sub}</p>
      </div>
    </div>
  )
}

/* Grid metric card */
function MetricCard({ emoji, iconClass, label, value, valueClass, delay, tintClass, pulseData, pulseColor }) {
  return (
    <div className={`lg lg-r-2xl lg-p-md lg-interactive ${tintClass} anim-scale ${delay}`} style={{ position: 'relative', overflow: 'hidden' }}>
      {pulseData && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', opacity: 0.4, zIndex: 0, pointerEvents: 'none' }} className="anim-fade-in d-4">
          <PulseLine data={pulseData} color={pulseColor || 'var(--c-indigo)'} strokeWidth={1.5} />
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <IconPill emoji={emoji} colorClass={iconClass} />
        <p className="m-label">{label}</p>
        <p className={`m-value ${valueClass}`}>{value}</p>
      </div>
    </div>
  )
}

/* Tracker row */
function TrackerRow({ emoji, iconClass, label, sub, value, valueClass, delay }) {
  return (
    <div className={`lg lg-r-xl lg-p-sm lg-interactive flex items-center justify-between anim-fade-up ${delay}`}
         style={{ padding: 'var(--s3) var(--s4)' }}>
      <div className="flex items-center g3">
        <div className={`m-icon ${iconClass}`} style={{ marginBottom: 0, flexShrink: 0 }}>
          {emoji}
        </div>
        <div className="min-w-0">
          <p className="headline" style={{ fontSize: 14 }}>{label}</p>
          <p className="caption t-tertiary" style={{ marginTop: 2 }}>{sub}</p>
        </div>
      </div>
      <p className={`tx-amount-val ${valueClass}`}>{value}</p>
    </div>
  )
}

/* ── BANK THEMES ── */
const getStringHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getBankTheme = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('icici')) {
    return {
      bg: 'linear-gradient(135deg, #3c1a0a 0%, #50200f 50%, #3c1a0a 100%)',
      border: 'rgba(255, 140, 0, 0.25)',
      glow: 'var(--c-gold)',
      accent: 'var(--c-gold)',
    };
  }
  if (n.includes('pnb') || n.includes('punjab') || n.includes('kotak')) {
    return {
      bg: 'linear-gradient(135deg, #3c0a0a 0%, #500f0f 50%, #3c0a0a 100%)',
      border: 'rgba(255, 60, 60, 0.25)',
      glow: 'var(--c-red)',
      accent: 'var(--c-red)',
    };
  }
  if (n.includes('axis')) {
    return {
      bg: 'linear-gradient(135deg, #2a0a3c 0%, #3a0f50 50%, #2a0a3c 100%)',
      border: 'rgba(200, 60, 255, 0.25)',
      glow: 'var(--c-purple)',
      accent: 'var(--c-purple)',
    };
  }
  if (n.includes('sbi') || n.includes('state bank')) {
    return {
      bg: 'linear-gradient(135deg, #0a2a3c 0%, #0f3a50 50%, #0a2a3c 100%)',
      border: 'rgba(60, 200, 255, 0.25)',
      glow: 'var(--c-cyan)',
      accent: 'var(--c-cyan)',
    };
  }
  if (n.includes('bob') || n.includes('baroda')) {
    return {
      bg: 'linear-gradient(135deg, #3c1a0a 0%, #50200f 50%, #3c1a0a 100%)',
      border: 'rgba(255, 140, 0, 0.25)',
      glow: 'var(--c-gold)',
      accent: 'var(--c-gold)',
    };
  }
  if (n.includes('hdfc')) {
    return {
      bg: 'linear-gradient(135deg, #0a1a3c 0%, #0f2050 50%, #0a1a3c 100%)',
      border: 'rgba(85, 165, 255, 0.25)',
      glow: 'var(--c-blue)',
      accent: 'var(--c-blue)',
    };
  }
  
  // Dynamic deterministic fallback for ANY unknown bank name
  const hue = getStringHash(n) % 360;
  return {
    bg: `linear-gradient(135deg, hsl(${hue}, 40%, 10%) 0%, hsl(${hue}, 50%, 15%) 50%, hsl(${hue}, 40%, 10%) 100%)`,
    border: `hsla(${hue}, 70%, 50%, 0.25)`,
    glow: `hsl(${hue}, 80%, 50%)`,
    accent: `hsl(${hue}, 80%, 60%)`,
  };
};

/* ── WALLET CAROUSEL ── */
function WalletCarousel({ accounts }) {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Track which card is in view via scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = 240 + 16; // card width + gap
    const idx = Math.round(el.scrollLeft / cardW);
    setActiveIdx(Math.max(0, Math.min(idx, accounts.length - 1)));
  }, [accounts.length]);

  // Mouse drag
  const onMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
  };
  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };
  const stopDrag = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  };

  // Touch drag
  const onTouchStart = (e) => {
    startX.current = e.touches[0].pageX;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };
  const onTouchMove = (e) => {
    const x = e.touches[0].pageX;
    const walk = startX.current - x;
    scrollRef.current.scrollLeft = scrollLeft.current + walk;
  };

  const scrollToIdx = (idx) => {
    const cardW = 240 + 16;
    scrollRef.current?.scrollTo({ left: idx * cardW, behavior: 'smooth' });
    setActiveIdx(idx);
  };

  return (
    <div>
      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          cursor: 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        className="wallet-scroll"
      >
        <style>{`.wallet-scroll::-webkit-scrollbar{display:none}`}</style>
        <div style={{
          display: 'flex', flexDirection: 'row', gap: 16,
          padding: '4px 16px 12px 16px', width: 'max-content'
        }}>
          {accounts.map((acc) => (
            acc.type === 'Card' ? <CreditCardWidget key={acc.id} account={acc} /> :
            acc.type === 'Bank' ? <BankWidget key={acc.id} account={acc} /> :
            acc.type === 'Contact' ? <ContactWidget key={acc.id} account={acc} /> :
            <CashWidget key={acc.id} account={acc} />
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {accounts.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 6, paddingBottom: 4, marginTop: 4
        }}>
          {accounts.map((_, i) => (
            <div
              key={i}
              onClick={() => scrollToIdx(i)}
              style={{
                width: i === activeIdx ? 20 : 7,
                height: 7,
                borderRadius: 999,
                background: i === activeIdx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
                transition: 'all 300ms cubic-bezier(0.34,1.2,0.64,1)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function CreditCardWidget({ account }) {
  const spent = parseFloat(account.spent) || 0;
  const limit = parseFloat(account.limitAmount) || 0;
  const theme = getBankTheme(account.name);
  
  return (
    <div 
      style={{
        flexShrink: 0, width: 240, padding: 20, borderRadius: 18,
        background: `linear-gradient(135deg, #14141e 0%, color-mix(in srgb, ${theme.glow} 15%, #24243c) 50%, #1a1a2e 100%)`,
        border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 150,
        position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: '-40%', right: '-15%', width: 130, height: 130, background: theme.glow, filter: 'blur(55px)', opacity: 0.35, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-15%', width: 90, height: 90, background: 'var(--c-cyan)', filter: 'blur(45px)', opacity: 0.25, pointerEvents: 'none' }} />
      
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 26, background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', borderRadius: 4, opacity: 0.85 }} />
        <span style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: 1 }}>CREDIT</span>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 2 }}>DUE AMOUNT</p>
          {limit > 0 && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>LIMIT ₹{limit.toLocaleString()}</p>}
        </div>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          ₹{spent.toLocaleString()}
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1 }}>{account.name}</p>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,60,60,0.7)' }} />
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,165,0,0.7)', marginLeft: -8 }} />
        </div>
      </div>
    </div>
  )
}


/* Wallet Card: Bank Account Style */
function BankWidget({ account }) {
  const bal = parseFloat(account.balance) || 0;
  const theme = getBankTheme(account.name);
  
  return (
    <div 
      style={{
        flexShrink: 0, width: 240, padding: 20, borderRadius: 18,
        background: theme.bg,
        border: `1px solid ${theme.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 150, position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 100, height: 100, background: theme.glow, filter: 'blur(45px)', opacity: 0.25, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 22 }}>🏛️</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: theme.accent, letterSpacing: 2, textTransform: 'uppercase' }}>BANK A/C</span>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1, marginTop: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, marginBottom: 4 }}>AVAILABLE BALANCE</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          ₹{bal.toLocaleString()}
        </p>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1, marginTop: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{account.name}</p>
      </div>
    </div>
  )
}


/* Wallet Card: Cash & UPI Style */
function CashWidget({ account }) {
  const balance = parseFloat(account.balance) || 0;
  const isUPI = account.type === 'UPI';
  const accentColor = isUPI ? '#ff9f0a' : '#30d158'; // Gold for UPI, Green for Cash
  
  return (
    <div 
      style={{
        flexShrink: 0, width: 240, padding: 20, borderRadius: 18,
        background: `linear-gradient(135deg, ${isUPI ? '#2a1b0a' : '#0a2a1b'} 0%, ${isUPI ? '#3a200f' : '#0f3a20'} 100%)`,
        border: `1px solid ${isUPI ? 'rgba(255, 159, 10, 0.25)' : 'rgba(48, 209, 88, 0.25)'}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 150, position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: '-40%', right: '-15%', width: 130, height: 130, background: accentColor, filter: 'blur(55px)', opacity: 0.15, pointerEvents: 'none' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 22 }}>{isUPI ? '📱' : '💵'}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: 2, textTransform: 'uppercase' }}>{isUPI ? 'UPI LITE' : 'CASH'}</span>
      </div>
      
      <div style={{ marginTop: 14 }}>
        <p className="caption" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4 }}>AVAILABLE</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
      </div>
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {isUPI ? 'Digital Wallet' : 'Physical Cash'}
        </p>
      </div>
    </div>
  );
}

function ContactWidget({ account }) {
  const balance = parseFloat(account.balance) || 0;
  const isOwedToMe = balance >= 0;
  const accentColor = isOwedToMe ? '#30d158' : '#ff3b30'; // Green if they owe, Red if I owe
  
  return (
    <div 
      style={{
        flexShrink: 0, width: 240, padding: 20, borderRadius: 18,
        background: `linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)`,
        border: `1px solid rgba(255,255,255, 0.1)`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 150, position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: '-40%', right: '-15%', width: 130, height: 130, background: accentColor, filter: 'blur(55px)', opacity: 0.15, pointerEvents: 'none' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 22 }}>👤</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase' }}>FRIEND</span>
      </div>
      
      <div style={{ marginTop: 14 }}>
        <p className="caption" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4 }}>
          {isOwedToMe ? 'THEY OWE YOU' : 'YOU OWE THEM'}
        </p>
        <p style={{ fontSize: 28, fontWeight: 800, color: accentColor, letterSpacing: -0.5 }}>₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
      </div>
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {account.name}
        </p>
      </div>
    </div>
  );
}

/* Helper to make a smooth pulse line that doesn't plunge */
const makePulse = (val) => {
  const v = parseFloat(val) || 0;
  if (v <= 0) return [0, 0, 0, 0, 0, 0, 0];
  return [v*0.7, v*0.75, v*0.72, v*0.85, v*0.9, v*0.96, v];
};

export default function Dashboard() {
  const { state, dispatch } = useFinance();
  const accounts = state.accounts || [];
  const investments = state.investments || [];
  const transactions = state.transactions || [];
  
  const walletAccounts = accounts.filter(a => ['Bank', 'Card', 'Cash', 'UPI'].includes(a.type));
  
  // --- Dashboard Analytics Engine ---
  const m = useMemo(() => {
    let netWorth = 0;
    let moneyLeft = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let totalInvested = 0;
    
    let tatvixOutstanding = 0;
    let friendsOweMe = 0;
    let homeSpending = 0;
    let mansiSpending = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // 1. Initial Balances
    accounts.forEach(acc => {
      const bal = parseFloat(acc.balance) || 0;
      if (acc.type === 'Card') {
         const spent = parseFloat(acc.spent) || 0;
         moneyLeft -= spent;
         netWorth -= spent;
      } else if (acc.type === 'Bank' || acc.type === 'Cash') {
         moneyLeft += bal;
      }
      
      if (['Bank', 'Cash', 'Stock', 'SIP'].includes(acc.type)) {
         netWorth += bal;
      }

      if (['Stock', 'SIP'].includes(acc.type)) {
         totalInvested += bal;
      }
    });

    // 2. Transactions
    transactions.forEach(tx => {
      const amt = parseFloat(tx.amount) || 0;
      const txDate = new Date(tx.date);
      const isThisMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

      if (tx.type === 'Income') {
        moneyLeft += amt;
        netWorth += amt;
        if (isThisMonth && !tx.category.includes('Reimbursement')) {
          monthlyIncome += amt;
        }

        // Special trackers
        if (tx.category === 'Reimbursement (Tatvix)') tatvixOutstanding -= amt;
        if (tx.category === 'Reimbursement (Friend)') friendsOweMe -= amt;
      } 
      else if (tx.type === 'Expense') {
        moneyLeft -= amt;
        netWorth -= amt;
        if (isThisMonth) {
          monthlyExpense += amt;
        }

        // Special trackers
        if (tx.category === 'Tatvix') tatvixOutstanding += amt;
        if (tx.category === 'Friend Settlement') friendsOweMe += amt;
        if (isThisMonth) {
          if (tx.category === 'Home') homeSpending += amt;
          if (tx.category === 'Mansi') mansiSpending += amt;
        }
      }
      else if (tx.type === 'Investment') {
        moneyLeft -= amt; 
        totalInvested += amt;
      }
    });

    return {
      netWorth,
      moneyLeft,
      monthlyIncome,
      monthlyExpense,
      totalInvested,
      tatvixOutstanding,
      friendsOweMe,
      homeSpending,
      mansiSpending
    };
  }, [accounts, transactions]);

  const hasSpecialTrackers = m.tatvixOutstanding !== 0 || m.friendsOweMe !== 0 || m.homeSpending !== 0 || m.mansiSpending !== 0;

  // --- Subscriptions Engine ---
  const [isSubSheetOpen, setIsSubSheetOpen] = useState(false);
  const subscriptions = state.subscriptions || [];

  const pendingSubscriptions = useMemo(() => {
    const today = new Date().getDate();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return subscriptions.filter(sub => {
      if (today < sub.date) return false;

      const hasLoggedThisMonth = transactions.some(tx => {
        if (!tx.isSubscriptionLog || tx.subscriptionId !== sub.id) return false;
        const txDate = new Date(tx.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });

      return !hasLoggedThisMonth;
    });
  }, [subscriptions, transactions]);

  const trackedSubscriptions = useMemo(() => {
    const list = {};
    subscriptions.forEach(s => {
      list[s.name] = s.amount;
    });
    transactions.forEach(tx => {
      if (tx.isSubscription) {
        list[tx.title] = parseFloat(tx.amount) || 0;
      }
    });
    return Object.entries(list).map(([name, amount]) => ({ name, amount }));
  }, [subscriptions, transactions]);
  const totalSubscriptionCost = trackedSubscriptions.reduce((acc, curr) => acc + curr.amount, 0);

  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [isModifyingAmount, setIsModifyingAmount] = useState(false);
  const [modifiedAmount, setModifiedAmount] = useState('');
  const [modifyFrequency, setModifyFrequency] = useState('This Time Only');

  const availableAccounts = useMemo(() => {
    return (state.accounts || []).filter(a => a.type !== 'Investment' && a.type !== 'SIP' && a.type !== 'Stock');
  }, [state.accounts]);

  const handleLogSubscription = (isPermanentUpdate = false) => {
    if (!selectedSubscription) return;

    const finalAmount = isModifyingAmount ? parseFloat(modifiedAmount) : selectedSubscription.amount;
    
    // Find a fallback account if the subscription doesn't have one
    const fallbackAccount = availableAccounts.length > 0 ? availableAccounts[0].id : '';
    const accId = selectedSubscription.accountId || fallbackAccount;

    const tx = {
      id: `tx-${Date.now()}`,
      type: 'Expense', // SIP subscriptions might be 'Investment', but standard subscriptions are 'Expense'
      amount: finalAmount,
      category: selectedSubscription.category,
      accountId: accId,
      date: new Date().toISOString(),
      isSubscriptionLog: true,
      subscriptionId: selectedSubscription.id,
      notes: `Auto-logged ${selectedSubscription.name}`,
    };

    // If it's a SIP, ensure type is Investment
    if (selectedSubscription.category === 'Investment' && selectedSubscription.frequency) {
      tx.type = 'Investment';
    }

    dispatch({ 
      type: 'PROCESS_SUBSCRIPTION', 
      payload: { 
        subId: selectedSubscription.id, 
        monthYear: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        transaction: tx 
      } 
    });

    // Auto-Generate Pending Investment Order if it's a SIP
    if (selectedSubscription.isSip) {
      dispatch({
        type: 'ADD_INVESTMENT_ORDER',
        payload: {
          id: `ord-${Date.now()}-sip`,
          investmentId: null,
          type: selectedSubscription.sipType || 'MF',
          symbol: selectedSubscription.sipSymbol,
          name: selectedSubscription.sipName || selectedSubscription.name,
          amount: finalAmount,
          orderDate: new Date().toISOString(),
          status: 'PENDING'
        }
      });
    }

    if (isPermanentUpdate) {
      dispatch({
        type: 'UPDATE_SUBSCRIPTION',
        payload: { id: selectedSubscription.id, amount: finalAmount }
      });
    }

    setSelectedSubscription(null);
    setIsModifyingAmount(false);
    setModifiedAmount('');
  };

  // --- Card Bill Notification Engine ---
  const [selectedCardBill, setSelectedCardBill] = useState(null);
  const [cardBillPaymentAccount, setCardBillPaymentAccount] = useState('');

  const processedCardBills = state.processedCardBills || [];

  const pendingCardBills = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    return accounts.filter(acc => {
      if (acc.type !== 'Card' || !acc.billingDate) return false;
      if (todayDate < acc.billingDate) return false;
      if ((parseFloat(acc.spent) || 0) <= 0) return false; // Nothing to pay
      
      const processed = processedCardBills.find(b => b.cardId === acc.id && b.monthYear === currentMonthYear);
      if (processed) {
        if (!processed.snoozeUntil) return false; // It's paid
        // It is snoozed, check if snooze time has elapsed
        if (new Date(processed.snoozeUntil) > today) return false;
      }
      
      return true;
    });
  }, [accounts, processedCardBills]);

  const handleProcessCardBill = () => {
    if (!selectedCardBill || !cardBillPaymentAccount) return;

    const amount = parseFloat(selectedCardBill.spent) || 0;
    
    // Create an Expense transaction representing the outflow of cash from the bank account
    const tx = {
      id: `tx-${Date.now()}`,
      type: 'Expense',
      amount: amount,
      category: 'Credit Card Bill',
      accountId: cardBillPaymentAccount,
      date: new Date().toISOString(),
      notes: `Paid bill for ${selectedCardBill.name}`,
    };

    dispatch({ 
      type: 'PROCESS_CARD_BILL', 
      payload: { 
        cardId: selectedCardBill.id, 
        monthYear: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        transaction: tx 
      } 
    });

    // Reset the card's spent balance to 0
    dispatch({
      type: 'UPDATE_ACCOUNT',
      payload: { id: selectedCardBill.id, updates: { spent: 0 } }
    });

    setSelectedCardBill(null);
    setCardBillPaymentAccount('');
  };

  const handleSnoozeCardBill = (card) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 2); // Snooze for 2 days

    dispatch({
      type: 'SNOOZE_CARD_BILL',
      payload: {
        cardId: card.id,
        monthYear: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        snoozeUntil: snoozeDate.toISOString()
      }
    });
    
    if (selectedCardBill?.id === card.id) {
      setSelectedCardBill(null);
      setCardBillPaymentAccount('');
    }
  };

  // --- SIP Notification Engine ---
  const [selectedSip, setSelectedSip] = useState(null);
  const [dynamicSipAmount, setDynamicSipAmount] = useState('');

  const pendingSips = useMemo(() => {
    const today = new Date().getDate();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return accounts.filter(acc => {
      if (!acc.isActiveSIP) return false;
      if (today < acc.sipDate) return false;
      
      // Check if logged this month
      const hasLoggedThisMonth = transactions.some(tx => {
        if (!tx.isSipLog || tx.accountId !== acc.id) return false;
        const txDate = new Date(tx.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });
      
      return !hasLoggedThisMonth;
    });
  }, [accounts, transactions]);

  const handleLogSip = (isPermanentUpdate = false) => {
    if (!selectedSip) return;
    
    let amount = selectedSip.type === 'SIP' 
      ? selectedSip.sipAmount 
      : parseFloat(dynamicSipAmount);

    if (selectedSip.type === 'SIP' && isModifyingAmount) {
      amount = parseFloat(modifiedAmount);
    }
      
    if (!amount) return;

    // Create the SIP transaction
    const tx = {
      id: `tx-${Date.now()}`,
      type: 'Investment',
      amount: amount,
      accountId: selectedSip.id,
      date: new Date().toISOString(),
      isSipLog: true,
      notes: `Auto-logged SIP for ${selectedSip.name}`,
    };

    dispatch({ type: 'ADD_TRANSACTION', payload: tx });

    if (isPermanentUpdate && selectedSip.type === 'SIP') {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        payload: { id: selectedSip.id, updates: { sipAmount: amount } }
      });
    }
    
    setSelectedSip(null);
    setDynamicSipAmount('');
    setIsModifyingAmount(false);
    setModifiedAmount('');
  };

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const userName = state.profile?.name?.split(' ')[0] || '';

  return (
    <div>

      {/* ── LARGE TITLE ── */}
      <div className="section">
        <p className="caption t-tertiary anim-fade-in d-0" style={{ marginBottom: 2 }}>
          {dateStr} · {greeting}{userName ? ` ${userName}` : ''} 👋
        </p>
        <h2 className="title-large anim-fade-up d-1">
          Overview
        </h2>
      </div>

      {/* ── P1: NET WORTH HERO (Hidden for Tier 1) ── */}
      {state.profile?.tier !== 1 && (
        <div className="section mb-6 mt-2">
          <HeroCard
            label="Total Net Worth"
            value={fmt(m.netWorth)}
            sub={`Overview of all configured assets and liabilities`}
            pulseData={makePulse(m.netWorth)}
            pulseColor="var(--c-indigo-lt)"
          />
        </div>
      )}

      <HealthScoreWidget />

      <SavingsPotsWidget />

      {/* ── ACTION REQUIRED (SIP, SUBSCRIPTIONS & CARD BILLS) ── */}
      {(pendingSips.length > 0 || pendingSubscriptions.length > 0 || pendingCardBills.length > 0) && (
        <div className="section anim-fade-up">
          <div className="section-header">
            <p className="section-label" style={{ color: 'var(--c-red)' }}>Action Required</p>
          </div>
          <div className="flex flex-col gap-3">
            
            {/* Pending Card Bills */}
            {pendingCardBills.map(card => (
              <div 
                key={card.id} 
                className="lg lg-p-md lg-r-xl lg-interactive flex justify-between items-center"
                style={{ border: '1px solid rgba(85, 165, 255, 0.2)', background: 'rgba(85, 165, 255, 0.05)' }}
                onClick={() => setSelectedCardBill(card)}
              >
                <div className="flex items-center gap-3">
                  <div className="m-icon lg-tint-blue" style={{ margin: 0, width: 40, height: 40 }}>💳</div>
                  <div>
                    <p className="headline" style={{ color: 'var(--c-blue)' }}>Bill Due: {card.name}</p>
                    <p className="caption t-tertiary">
                      ₹{card.spent} · Due on {card.billingDate}
                    </p>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ background: 'var(--c-blue)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--r-full)' }}>
                  Pay
                </button>
              </div>
            ))}

            {/* Pending SIPs */}
            {pendingSips.map(sip => (
              <div 
                key={sip.id} 
                className="lg lg-p-md lg-r-xl lg-interactive flex justify-between items-center"
                style={{ border: '1px solid rgba(255, 85, 85, 0.2)', background: 'rgba(255, 85, 85, 0.05)' }}
                onClick={() => setSelectedSip(sip)}
              >
                <div className="flex items-center gap-3">
                  <div className="m-icon lg-tint-red" style={{ margin: 0, width: 40, height: 40 }}>⚠️</div>
                  <div>
                    <p className="headline" style={{ color: 'var(--c-red)' }}>SIP Due: {sip.name}</p>
                    <p className="caption t-tertiary">
                      {sip.type === 'SIP' ? `₹${sip.sipAmount}` : `${sip.sipQuantity} Shares`} · Due on {sip.sipDate}
                    </p>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ background: 'var(--c-red)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--r-full)' }}>
                  Log
                </button>
              </div>
            ))}

            {/* Pending Subscriptions */}
            {pendingSubscriptions.map(sub => (
              <div 
                key={sub.id} 
                className="lg lg-p-md lg-r-xl lg-interactive flex justify-between items-center"
                style={{ border: '1px solid rgba(255, 165, 0, 0.2)', background: 'rgba(255, 165, 0, 0.05)' }}
                onClick={() => setSelectedSubscription(sub)}
              >
                <div className="flex items-center gap-3">
                  <div className="m-icon lg-tint-gold" style={{ margin: 0, width: 40, height: 40 }}>🔔</div>
                  <div>
                    <p className="headline" style={{ color: 'var(--c-gold)' }}>Bill Due: {sub.name}</p>
                    <p className="caption t-tertiary">
                      ₹{sub.amount} · Due on {sub.date}
                    </p>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ background: 'var(--c-gold)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--r-full)' }}>
                  Log
                </button>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* SUBSCRIPTION LOGGING MODAL */}
      {selectedSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="lg lg-p-xl lg-r-2xl anim-scale-up" style={{ width: '90%', maxWidth: '400px', border: '1px solid var(--lg-border)' }}>
            <h3 className="headline mb-2 text-center" style={{ fontSize: '20px' }}>Log {selectedSubscription.name}</h3>
            
            {!isModifyingAmount ? (
              <>
                <p className="t-tertiary text-center mb-6" style={{ fontSize: '14px' }}>
                  Is the amount exactly ₹{selectedSubscription.amount}?
                </p>
                <div className="flex flex-col gap-3 mt-4">
                  <button 
                    className="btn btn-primary w-full lg-r-md py-3" 
                    style={{ background: 'var(--c-gold)' }}
                    onClick={() => handleLogSubscription(false)}
                  >
                    Yes, log ₹{selectedSubscription.amount}
                  </button>
                  <button 
                    className="btn btn-ghost w-full lg-r-md py-3" 
                    onClick={() => { setIsModifyingAmount(true); setModifiedAmount(selectedSubscription.amount.toString()); }}
                  >
                    No, modify amount
                  </button>
                  <button className="btn btn-ghost w-full lg-r-md py-3 mt-2 t-tertiary" onClick={() => { setSelectedSubscription(null); setIsModifyingAmount(false); }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-4 mb-6 mt-4">
                  <div className="flex items-center justify-between w-full lg-r-md px-4 py-3" style={{ border: '1px solid var(--lg-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <span className="subhead t-primary">New Amount</span>
                    <input 
                      type="number" 
                      className="sheet-input" 
                      placeholder="₹0" 
                      dir="rtl"
                      value={modifiedAmount}
                      onChange={(e) => setModifiedAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex items-center justify-between w-full lg-r-md px-4 py-3" style={{ border: '1px solid var(--lg-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <span className="subhead t-primary" style={{ flexShrink: 0, marginRight: '16px' }}>Apply to</span>
                    <LiquidSelect 
                      value={modifyFrequency}
                      onChange={(v) => setModifyFrequency(v)}
                      options={[
                        { label: 'This Time Only', value: 'This Time Only' },
                        { label: 'Every Month', value: 'Every Month' }
                      ]}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-ghost w-full lg-r-md py-3" onClick={() => setIsModifyingAmount(false)}>Back</button>
                  <button 
                    className="btn btn-primary w-full lg-r-md py-3" 
                    style={{ background: 'var(--c-gold)' }}
                    onClick={() => handleLogSubscription(modifyFrequency === 'Every Month')}
                    disabled={!modifiedAmount || parseFloat(modifiedAmount) <= 0}
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SIP LOGGING MODAL */}
      {selectedSip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="lg lg-p-xl lg-r-2xl anim-scale-up" style={{ width: '90%', maxWidth: '400px', border: '1px solid var(--lg-border)' }}>
            <h3 className="headline mb-2 text-center" style={{ fontSize: '20px' }}>Log {selectedSip.name} SIP</h3>
            
            <div className="flex flex-col gap-4">
              {selectedSip.type === 'SIP' ? (
                !isModifyingAmount ? (
                  <>
                    <p className="t-tertiary text-center mb-6" style={{ fontSize: '14px' }}>
                      Is the deducted amount exactly ₹{selectedSip.sipAmount}?
                    </p>
                    <div className="flex flex-col gap-3">
                      <button 
                        className="btn btn-primary w-full lg-r-md py-3" 
                        style={{ background: 'var(--c-green)' }}
                        onClick={() => handleLogSip(false)}
                      >
                        Yes, log ₹{selectedSip.sipAmount}
                      </button>
                      <button 
                        className="btn btn-ghost w-full lg-r-md py-3" 
                        onClick={() => { setIsModifyingAmount(true); setModifiedAmount(selectedSip.sipAmount.toString()); }}
                      >
                        No, modify amount
                      </button>
                      <button className="btn btn-ghost w-full lg-r-md py-3 mt-2 t-tertiary" onClick={() => { setSelectedSip(null); setIsModifyingAmount(false); }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-4 mb-6 mt-4">
                      <div className="flex items-center justify-between w-full lg-r-md px-4 py-3" style={{ border: '1px solid var(--lg-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <span className="subhead t-primary">New Amount</span>
                        <input 
                          type="number" 
                          className="sheet-input" 
                          placeholder="₹0" 
                          dir="rtl"
                          value={modifiedAmount}
                          onChange={(e) => setModifiedAmount(e.target.value)}
                          autoFocus
                        />
                      </div>
                      
                      <div className="flex items-center justify-between w-full lg-r-md px-4 py-3" style={{ border: '1px solid var(--lg-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <span className="subhead t-primary" style={{ flexShrink: 0, marginRight: '16px' }}>Apply to</span>
                        <LiquidSelect 
                          value={modifyFrequency}
                          onChange={(v) => setModifyFrequency(v)}
                          options={[
                            { label: 'This Time Only', value: 'This Time Only' },
                            { label: 'Every Month', value: 'Every Month' }
                          ]}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="btn btn-ghost w-full lg-r-md py-3" onClick={() => setIsModifyingAmount(false)}>Back</button>
                      <button 
                        className="btn btn-primary w-full lg-r-md py-3" 
                        style={{ background: 'var(--c-green)' }}
                        onClick={() => handleLogSip(modifyFrequency === 'Every Month')}
                        disabled={!modifiedAmount || parseFloat(modifiedAmount) <= 0}
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                )
              ) : (
                <div className="flex flex-col gap-2 mt-4">
                  <p className="caption t-tertiary text-center">Dynamic Amount for {selectedSip.sipQuantity} Shares</p>
                  <input 
                    type="number" 
                    className="form-control lg-r-md px-4 py-3 text-center" 
                    style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--c-green)' }}
                    placeholder="Actual ₹ Deducted"
                    value={dynamicSipAmount}
                    onChange={(e) => setDynamicSipAmount(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-4">
                    <button className="btn btn-ghost w-full lg-r-md py-3" onClick={() => { setSelectedSip(null); setDynamicSipAmount(''); }}>Cancel</button>
                    <button 
                      className="btn btn-primary w-full lg-r-md py-3" 
                      style={{ background: 'var(--c-green)' }}
                      onClick={() => handleLogSip(false)}
                      disabled={!dynamicSipAmount}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── MY WALLET / ACCOUNTS CAROUSEL ── */}
      {walletAccounts.length > 0 && (
        <div className="anim-fade-up d-2" style={{ marginBottom: 32 }}>
          <div className="section-header px-4">
            <p className="section-label">My Wallet</p>
          </div>
          <WalletCarousel accounts={walletAccounts} />
        </div>
      )}

      {/* ── ACTIVE SUBSCRIPTIONS TRACKER ── */}
      {trackedSubscriptions.length > 0 && (
        <div className="anim-fade-up d-2" style={{ marginBottom: 32 }}>
          <div className="section-header px-4 flex justify-between items-center">
            <p className="section-label">Active Subscriptions</p>
            <span className="t-tertiary" style={{ fontSize: '13px' }}>{fmt(totalSubscriptionCost)} /mo</span>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'row', gap: 12, padding: '0 16px',
            overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
          }}>
            {trackedSubscriptions.map((sub, i) => (
              <div key={i} className="lg lg-p-md" style={{ background: 'var(--bg-layer-2)', border: '1px solid var(--lg-border)', borderRadius: '16px', minWidth: '140px', flexShrink: 0, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span className="t-primary fw-bold truncate" style={{ maxWidth: '90px' }}>{sub.name}</span>
                  <span style={{ fontSize: '12px', opacity: 0.5 }}>↻</span>
                </div>
                <div className="t-indigo-lt fw-bold" style={{ fontSize: '16px' }}>{fmt(sub.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FINANCIAL SUMMARY GRID ── */}
      <div className="section">
        <div className="section-header flex justify-between items-center">
          <p className="section-label anim-fade-in d-2">Financial Summary</p>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ color: 'var(--c-indigo-lt)', padding: '4px 12px', fontSize: '12px', borderRadius: 'var(--r-full)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setIsSubSheetOpen(true)}
          >
            + Subscription
          </button>
        </div>
        <div className="grid-2">
          <MetricCard
            emoji="💰" iconClass="ico-green" label="Monthly Income"
            value={fmt(m.monthlyIncome)} valueClass="t-green"
            tintClass="lg-tint-green" delay="d-2"
          />
          <MetricCard
            emoji="💸" iconClass="ico-red" label="Monthly Expenses"
            value={fmt(m.monthlyExpense)} valueClass="t-red"
            tintClass="lg-tint-red" delay="d-3"
          />
          <MetricCard
            emoji="📈" iconClass="ico-gold" label="Total Invested"
            value={fmt(m.totalInvested)}
            sub="Across Stocks, Mutual Funds & SIPs"
            pulseData={makePulse(m.totalInvested)}
            pulseColor="var(--c-gold)"
          />
          <MetricCard
            emoji="🏦" iconClass="ico-indigo" label="Money Left"
            value={fmt(m.moneyLeft)} valueClass="t-indigo-lt"
            tintClass="lg-tint-indigo" delay="d-5"
          />
        </div>
      </div>

      {/* ── INVESTMENTS OVERVIEW ── */}
      {investments.length > 0 && (
        <div className="section">
          <div className="section-header">
            <p className="section-label anim-fade-in d-3">Investments & Assets</p>
          </div>
          <div className="flex flex-col g3">
            {investments.map(inv => (
              <TrackerRow
                key={inv.id}
                emoji={inv.type === 'STOCK' ? '📈' : '🔄'}
                iconClass={inv.type === 'STOCK' ? 'ico-cyan' : 'ico-purple'}
                delay="d-3"
                label={inv.name}
                sub={`${inv.type}`}
                value={fmt(inv.quantity * inv.currentPrice)}
                valueClass="t-primary"
              />
            ))}
          </div>
        </div>
      )}

      {/* ── P2: SPECIAL TRACKERS ── */}
      {hasSpecialTrackers && (
        <div className="section">
          <div className="section-header">
            <p className="section-label anim-fade-in d-3">Special Trackers</p>
          </div>
          <div className="flex flex-col g3">
            {m.tatvixOutstanding !== 0 && (
              <TrackerRow
                emoji="🏢" iconClass="ico-purple" delay="d-3"
                label="Tatvix Outstanding" sub="Paid by you, not reimbursed"
                value={fmt(m.tatvixOutstanding)} valueClass={m.tatvixOutstanding > 0 ? "t-red" : "t-green"}
              />
            )}
            {m.friendsOweMe !== 0 && (
              <TrackerRow
                emoji="👥" iconClass="ico-cyan" delay="d-4"
                label="Friends Owe Me" sub="Pending reimbursements"
                value={fmt(m.friendsOweMe)} valueClass={m.friendsOweMe > 0 ? "t-green" : "t-secondary"}
              />
            )}
            {m.homeSpending !== 0 && (
              <TrackerRow
                emoji="🏠" iconClass="ico-red" delay="d-5"
                label="Home Spending" sub="This month"
                value={fmt(m.homeSpending)} valueClass="t-secondary"
              />
            )}
            {m.mansiSpending !== 0 && (
              <TrackerRow
                emoji="💛" iconClass="ico-gold" delay="d-6"
                label="Mansi Spending" sub="This month"
                value={fmt(m.mansiSpending)} valueClass="t-secondary"
              />
            )}
          </div>
        </div>
      )}

      {/* ── RECENT ENTRIES ── */}
      <div className="section">
        <div className="section-header anim-fade-in d-5">
          <p className="section-label">Recent Entries</p>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--c-indigo)' }}>
            See all
          </button>
        </div>

        <div className="lg lg-r-2xl lg-p-lg empty anim-fade-up d-6"
             style={{ padding: 'var(--s8)' }}>
          <div className="empty-glyph">📋</div>
          <p className="headline t-secondary">No transactions yet</p>
          <p className="caption t-tertiary" style={{ maxWidth: 200 }}>
            Tap the <strong style={{ color: 'var(--c-indigo-lt)' }}>+</strong> button below to log your first entry
          </p>
        </div>
      </div>

      {/* CREDIT CARD BILL MODAL */}
      {selectedCardBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="lg lg-p-xl lg-r-2xl anim-scale-up" style={{ width: '90%', maxWidth: '400px', border: '1px solid var(--lg-border)' }}>
            <h3 className="headline mb-2 text-center" style={{ fontSize: '20px' }}>Pay {selectedCardBill.name} Bill</h3>
            <p className="t-tertiary text-center mb-6" style={{ fontSize: '14px' }}>
              Clear the ₹{selectedCardBill.spent} spent balance.
            </p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between w-full lg-r-md px-4 py-3" style={{ border: '1px solid var(--lg-border)', background: 'rgba(255,255,255,0.02)' }}>
                <span className="subhead t-primary">Pay from</span>
                <LiquidSelect 
                  value={cardBillPaymentAccount}
                  onChange={(v) => setCardBillPaymentAccount(v)}
                  placeholder="Select Bank"
                  options={(state.accounts || []).filter(a => a.type === 'Bank' || a.type === 'Cash').map(a => ({
                    label: a.name,
                    value: a.id,
                    icon: a.type === 'Bank' ? '🏦' : '💰'
                  }))}
                />
              </div>
              
              <div className="flex gap-2 mt-2">
                <button 
                  className="btn btn-ghost w-full lg-r-md py-3 t-tertiary" 
                  onClick={() => handleSnoozeCardBill(selectedCardBill)}
                >
                  Remind Later
                </button>
                <button 
                  className="btn btn-primary w-full lg-r-md py-3" 
                  style={{ background: 'var(--c-blue)' }}
                  onClick={handleProcessCardBill}
                  disabled={!cardBillPaymentAccount}
                >
                  Mark as Paid
                </button>
              </div>
              <button 
                className="btn btn-ghost w-full py-2 mt-1" 
                onClick={() => { setSelectedCardBill(null); setCardBillPaymentAccount(''); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AddSubscriptionSheet 
        isOpen={isSubSheetOpen}
        onClose={() => setIsSubSheetOpen(false)}
      />
    </div>
  )
}
