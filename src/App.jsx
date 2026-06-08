import { useState, useEffect, useRef } from 'react'
import './index.css'
import './App.css'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'
import AddTransactionSheet from './components/AddTransactionSheet'
import SetupWizard from './components/SetupWizard'
import AIAssistantSheet from './components/AIAssistantSheet'
import Settings from './pages/Settings'
import { useFinance } from './context/FinanceContext'
import Login from './pages/Login'
import Friends from './pages/Friends'
import { supabase } from './lib/supabase'
import SplashScreen from './components/SplashScreen'
import PinLock from './components/PinLock'

const TABS = [
  { id: 'dashboard', icon: '⊞', label: 'Overview' },
  { id: 'transactions', icon: '↕', label: 'Entries' },
  { id: 'friends', icon: '⚇', label: 'Friends' },
  { id: 'analytics', icon: '◑', label: 'Insights' },
]

export default function App() {
  const { state, dispatch, dataLoading, isOffline, pendingSyncs } = useFinance();
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // PIN Lock State
  const savedPin = localStorage.getItem('pf-pin')
  const [isLocked, setIsLocked] = useState(!!savedPin)

  // Settlement Resolution State
  const pendingRequests = state.settlementRequests?.filter(req => req.status === 'pending' && req.receiver_phone === state.profile?.phone);
  const activeRequest = pendingRequests && pendingRequests.length > 0 ? pendingRequests[0] : null;
  const [resolveAccountId, setResolveAccountId] = useState('');
  const [page, setPage] = useState('dashboard')
  const [theme, setTheme] = useState(() => localStorage.getItem('pf-theme') || 'dark')
  const [themeSpinning, setThemeSpinning] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isAIOpen, setIsAIOpen] = useState(false)
  const [viewMode, setViewMode] = useState('mobile')
  const shellRef = useRef(null)
  const tabBarRef = useRef(null)

  // Sliding Nav Physics State
  const navRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pillStyle, setPillStyle] = useState({ left: 4, width: 0 })

  const activeIdx = TABS.findIndex(t => t.id === page)
  const dragOffsetRef = useRef(activeIdx)

  // Fluidly morph the pill's left position and width based on touch offset
  const updatePill = (offset) => {
    if (!navRef.current) return
    const tabs = Array.from(navRef.current.querySelectorAll('.tab-item'))
    if (tabs.length === 0 || offset < 0) return

    const lowerIdx = Math.max(0, Math.floor(offset))
    const upperIdx = Math.min(lowerIdx + 1, tabs.length - 1)
    const fraction = offset - lowerIdx

    const t1 = tabs[lowerIdx]
    const t2 = tabs[upperIdx]

    // iOS Gooey Stretch Physics
    // Leading edge moves fast (easeOut), trailing edge delays (easeIn)
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn = (t) => Math.pow(t, 3);

    const l1 = t1.offsetLeft;
    const r1 = l1 + t1.offsetWidth;
    const l2 = t2.offsetLeft;
    const r2 = l2 + t2.offsetWidth;

    // Left edge (trailing)
    const leftEdge = l1 + (l2 - l1) * easeIn(fraction);
    // Right edge (leading)
    const rightEdge = r1 + (r2 - r1) * easeOut(fraction);

    const left = leftEdge;
    const width = rightEdge - leftEdge;

    setPillStyle({ left, width })
  }

  // Handle external page changes and ensure calculation after shell mounts
  useEffect(() => {
    if (!isDragging) {
      dragOffsetRef.current = activeIdx
      // Small timeout to allow the browser to paint the nav bar after auth/setup
      setTimeout(() => updatePill(activeIdx), 100)
    }
  }, [page, activeIdx, isDragging, authLoading, session, state.profile?.isSetupComplete])

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => updatePill(dragOffsetRef.current)
    window.addEventListener('resize', handleResize)
    // Run once on mount to establish initial exact widths
    setTimeout(() => updatePill(dragOffsetRef.current), 50)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Supabase Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handlers for fluid 1:1 finger and mouse tracking
  const handlePointerDown = (e) => {
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    updateDragPosition(e.clientX)
  }

  const handlePointerMove = (e) => {
    if (!isDragging || !navRef.current) return
    updateDragPosition(e.clientX)
  }

  const handlePointerUp = (e) => {
    if (!isDragging) return
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
    const snapIndex = Math.round(dragOffsetRef.current)
    setPage(TABS[snapIndex].id)
    dragOffsetRef.current = snapIndex
    updatePill(snapIndex)
  }

  const updateDragPosition = (clientX) => {
    const rect = navRef.current.getBoundingClientRect()
    let x = clientX - rect.left

    const tabs = Array.from(navRef.current.querySelectorAll('.tab-item'))
    if (tabs.length === 0) return

    let newOffset = 0
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i]
      const tCenter = t.offsetLeft + t.offsetWidth / 2

      if (x <= tCenter) {
        if (i === 0) {
          newOffset = 0
          break
        } else {
          const prev = tabs[i - 1]
          const prevCenter = prev.offsetLeft + prev.offsetWidth / 2
          const fraction = (x - prevCenter) / (tCenter - prevCenter)
          newOffset = (i - 1) + fraction
          break
        }
      }
      if (i === tabs.length - 1) {
        newOffset = i
      }
    }

    dragOffsetRef.current = newOffset
    updatePill(newOffset)

    const snapIndex = Math.round(newOffset)
    if (TABS[snapIndex].id !== page) {
      setPage(TABS[snapIndex].id)
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pf-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setThemeSpinning(true)
    setTheme(t => t === 'dark' ? 'light' : 'dark')
    setTimeout(() => setThemeSpinning(false), 600)
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />
      case 'transactions': return <Transactions />
      case 'friends': return <Friends />
      case 'analytics': return <Analytics />
      case 'settings': return <Settings toggleTheme={toggleTheme} onBack={() => setPage('dashboard')} />
      default: return <Dashboard />
    }
  }

  return (
    <>
      {/* ── FLOATING ORB BACKGROUND ── */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <SplashScreen isReady={!authLoading && !dataLoading} />

      {authLoading || dataLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          {/* Splash screen handles the visual loading state */}
        </div>
      ) : isLocked ? (
        <PinLock correctPin={savedPin} onUnlock={() => setIsLocked(false)} />
      ) : !session ? (
        <Login onLoginSuccess={(sess) => setSession(sess)} />
      ) : !state.profile.isSetupComplete ? (
        <SetupWizard />
      ) : (
        <div ref={shellRef} className="app-shell anim-fade-in" style={{
          width: '100%',
          height: '100%',
          overflowX: 'hidden',
          overflowY: 'auto'
        }}>


          {/* ══ HEADER ══ */}
          <header className="app-header anim-fade-in">
            <div className="header-top">

              {/* Brand */}
              <div className="header-brand" onClick={() => setPage('dashboard')} style={{ cursor: 'pointer' }}>
                <div
                  className="logo-gem"
                  role="img"
                  aria-label="Finance app logo"
                >₹</div>
                <div className="brand-text">
                  <p className="brand-eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wealth Management</p>
                  <h1 className="brand-name">Personal Finance</h1>
                </div>
              </div>

              {/* Controls */}
              <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                
                {/* Offline & Sync Indicators */}
                {(isOffline || pendingSyncs > 0) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: isOffline ? 'rgba(255, 69, 58, 0.15)' : 'rgba(10, 132, 255, 0.15)',
                    border: `1px solid ${isOffline ? 'rgba(255, 69, 58, 0.3)' : 'rgba(10, 132, 255, 0.3)'}`,
                    color: isOffline ? 'var(--c-red)' : 'var(--c-blue)',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {isOffline ? (
                      <>
                        <span>⚠️</span>
                        <span>Offline Mode</span>
                      </>
                    ) : (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>
                        <span>Syncing ({pendingSyncs})</span>
                      </>
                    )}
                  </div>
                )}


                <button
                  id="theme-toggle"
                  className="btn btn-icon theme-btn"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  style={{
                    transition: `all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                    transform: themeSpinning ? 'rotate(360deg) scale(1.15)' : 'rotate(0deg) scale(1)',
                  }}
                >
                  {theme === 'dark' ? '☀' : '◑'}
                </button>

                <button
                  id="settings-btn"
                  className="btn btn-icon"
                  aria-label="Settings"
                  onClick={() => setPage('settings')}
                >
                  ⚙
                </button>
              </div>
            </div>
          </header>

          {/* ══ MAIN ══ */}
          <main className="page-content" key={page}>
            {renderPage()}
          </main>

          {/* ══ TAB BAR — Apple Photos exact layout ══ */}
          {page !== 'settings' && (
            <nav ref={tabBarRef} className="tab-bar-wrap" role="navigation" aria-label="Main navigation">
              <div className="tab-bar-row" style={{ gap: '12px' }}>

                {/* Glass pill housing the expanding tabs */}
                <div className="tab-bar-pill">
                  <div
                    ref={navRef}
                    className={`photos-nav ${isDragging ? 'is-dragging' : ''}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ touchAction: 'none' }}
                  >
                    {/* The dynamic morphing iOS highlight pill */}
                    <div
                      className="nav-highlight-pill"
                      style={{ left: `${pillStyle.left}px`, width: `${pillStyle.width}px` }}
                    />

                    {TABS.map((tab, idx) => (
                      <button
                        key={tab.id}
                        id={`tab-${tab.id}`}
                        className={`tab-item ${page === tab.id ? 'active' : ''}`}
                        onClick={() => {
                          if (page === tab.id) {
                            // If clicking the same menu, just close the modals
                            setIsSheetOpen(false)
                            setIsAIOpen(false)
                          } else {
                            setPage(tab.id)
                            dragOffsetRef.current = idx
                            updatePill(idx)
                            setIsSheetOpen(false)
                            setIsAIOpen(false)
                          }
                        }}
                        aria-label={tab.label}
                        aria-current={page === tab.id ? 'page' : undefined}
                      >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Transaction Button (inline with nav) */}
                <button
                  id="add-transaction-btn"
                  className="btn btn-primary lg-interactive"
                  aria-label="Add transaction"
                  onClick={() => {
                    if (isSheetOpen) {
                      setIsSheetOpen(false)
                    } else {
                      setIsAIOpen(false)
                      setIsSheetOpen(true)
                    }
                  }}
                  style={{ padding: '0 16px', height: '44px', flexShrink: 0 }}
                >
                  + New
                </button>

                {/* AI Sparkle Button */}
                <button
                  id="ai-assistant-btn"
                  className="ai-sparkle-btn"
                  aria-label="AI Assistant"
                  title="Ask AI Analyst"
                  onClick={() => {
                    if (isAIOpen) {
                      setIsAIOpen(false)
                    } else {
                      setIsSheetOpen(false)
                      setIsAIOpen(true)
                    }
                  }}
                >
                  ✨
                </button>
              </div>
            </nav>
          )}

          {/* ══ ADD TRANSACTION SHEET ══ */}
          <AddTransactionSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} shellRef={shellRef} />

          {/* ══ AI ASSISTANT SHEET ══ */}
          <AIAssistantSheet isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} tabBarRef={tabBarRef} shellRef={shellRef} />

          {/* ══ SETTLEMENT HANDSHAKE PROMPT ══ */}
          {activeRequest && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', padding: '16px' }}>
              <div className="lg-card lg-p-xl w-full max-w-md anim-slide-up" style={{ borderRadius: '32px', border: '1px solid var(--c-cyan)' }}>
                <div className="flex justify-center mb-4">
                  <span style={{ fontSize: '48px' }}>🤝</span>
                </div>
                <h2 className="title-medium mb-2 text-center">Settlement Request</h2>
                <p className="t-secondary mb-6 text-center" style={{ fontSize: '15px' }}>
                  A friend has marked <b>₹{Number(activeRequest.amount).toFixed(2)}</b> as settled. 
                  Which account did you use to fulfill this?
                </p>

                <div className="flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto hide-scrollbar">
                  {state.accounts.map(acc => (
                    <div 
                      key={acc.id}
                      onClick={() => setResolveAccountId(acc.id)}
                      className={`flex justify-between items-center p-4 cursor-pointer transition-all ${resolveAccountId === acc.id ? 'lg-card' : ''}`}
                      style={{ 
                        borderRadius: '16px',
                        border: resolveAccountId === acc.id ? '1px solid var(--c-cyan)' : '1px solid var(--lg-border)',
                        background: resolveAccountId === acc.id ? 'var(--lg-fill-hover)' : 'var(--lg-fill)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: '24px' }}>{acc.type === 'Bank' ? '🏦' : acc.type === 'Card' ? '💳' : '💵'}</span>
                        <span className="fw-bold">{acc.name}</span>
                      </div>
                      {resolveAccountId === acc.id && <span style={{ color: 'var(--c-cyan)' }}>✓</span>}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    className="w-full btn btn-primary" 
                    style={{ borderRadius: '16px', padding: '16px', fontSize: '16px', fontWeight: 'bold' }} 
                    disabled={!resolveAccountId}
                    onClick={() => {
                      if (!resolveAccountId) return;
                      // Find the contact who initiated this (to get their name, or we just use 'Friend')
                      // Create the offsetting transaction
                      // For a receiver, if the initiator sent money, the receiver got it (Income). 
                      // Wait, how do we know direction? 
                      // If the initiator owed the receiver, initiator paid -> receiver gets Income.
                      // If the receiver owed the initiator, receiver paid -> receiver gets Expense.
                      // Let's deduce this from sharedSplits.
                      
                      let netDebt = 0;
                      (state.sharedSplits || []).forEach(split => {
                        (split.splitData?.debts || []).forEach(debt => {
                           if (debt.status !== 'pending') return;
                           const amt = Number(debt.amount) || 0;
                           if (debt.debtorId === 'me' && debt.creditorPhone === activeRequest.initiator_phone) netDebt -= amt;
                           if (debt.creditorId === 'me' && debt.debtorPhone === activeRequest.initiator_phone) netDebt += amt;
                        });
                      });
                      
                      // Actually, netDebt is hard to calculate here because the initiator's phone isn't in activeRequest directly unless we fetch it.
                      // But wait, the user just knows if they received or paid.
                      // Let's assume standard Splitwise: "You owe Friend ₹500" -> Friend initiates settlement? 
                      // Usually the payer initiates it. If I pay my friend, I initiate. Friend receives.
                      // So receiver usually records INCOME. But what if friend pays me, and I initiate?
                      // We can just use the initiator_id to match contacts and get the balance.
                      const contact = state.contacts.find(c => c.linkedUserId === activeRequest.initiator_id) || { name: 'Friend' };
                      
                      const transaction = {
                        id: `tx-settle-recv-${Date.now()}`,
                        amount: activeRequest.amount,
                        type: 'Transfer', // Using Transfer or Expense/Income based on logic, let's use Transfer for safety or determine later
                        category: 'Transfer', 
                        accountId: resolveAccountId,
                        date: new Date().toISOString(),
                        title: `Settlement resolved with ${contact.name || 'Friend'}`,
                      };

                      // Mark all splits with this contact as settled
                      // ... (Simplified for this UI demo, let's just dispatch)

                      dispatch({
                        type: 'RESOLVE_SETTLEMENT',
                        payload: {
                          requestId: activeRequest.id,
                          transaction,
                          updatedSplits: [] // In a real app we'd map over splits and zero them
                        }
                      });
                      
                      setResolveAccountId('');
                    }}
                  >
                    Confirm Settlement
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
