import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import AddInvestmentSheet from './AddInvestmentSheet';

export default function PortfolioWidget() {
  const { state, dispatch, isOffline } = useFinance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const investments = state.investments || [];
  const pendingOrders = (state.investmentOrders || []).filter(o => o.status === 'PENDING');
  const prevInvLengthRef = React.useRef(investments.length);

  const handleResolveOrders = async () => {
    if (pendingOrders.length === 0 || isOffline) return;
    setIsResolving(true);
    try {
      const res = await fetch('/api/resolve-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.profile?.id, pendingOrders })
      });
      if (!res.ok) throw new Error('Failed to resolve orders');
      
      const data = await res.json();
      
      if (data.resolvedCount > 0) {
        // Apply each resolution
        data.resolutions.forEach(res => {
          // 1. Mark order as settled
          dispatch({
            type: 'SETTLE_INVESTMENT_ORDER',
            payload: {
              orderId: res.orderId,
              updates: { status: 'SETTLED', settledNav: res.settledNav, settledUnits: res.settledUnits }
            }
          });

          // 2. Update or Create the Investment Holding
          const existing = investments.find(inv => inv.symbol === res.symbol);
          if (existing) {
            // Recalculate Average Buy Price
            const oldTotalCost = existing.quantity * existing.averageBuyPrice;
            const newTotalCost = oldTotalCost + res.amount;
            const newQuantity = existing.quantity + res.settledUnits;
            const newAvgPrice = newTotalCost / newQuantity;

            dispatch({
              type: 'UPDATE_INVESTMENT',
              payload: {
                id: existing.id,
                updates: {
                  quantity: newQuantity,
                  averageBuyPrice: newAvgPrice,
                  currentPrice: res.settledNav // Update to latest known price
                }
              }
            });
          } else {
            // Create new holding
            dispatch({
              type: 'ADD_INVESTMENT',
              payload: {
                id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: res.type,
                symbol: res.symbol,
                name: res.name,
                quantity: res.settledUnits,
                averageBuyPrice: res.settledNav,
                currentPrice: res.settledNav,
                lastUpdated: new Date().toISOString()
              }
            });
          }
        });

        alert(`Successfully settled ${data.resolvedCount} orders automatically at exact market NAVs!`);
      } else {
        alert('No new NAVs found for your pending orders yet. Check back tomorrow!');
      }
    } catch (e) {
      console.error('Resolution failed:', e);
      alert('Failed to resolve orders.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSync = async () => {
    if (investments.length === 0 || isOffline) return;
    setIsSyncing(true);
    try {
      const symbols = investments.map(i => i.symbol);
      const res = await fetch('/api/sync-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });
      if (!res.ok) throw new Error('Failed to sync');
      const data = await res.json();
      
      if (data.prices) {
        const updates = investments.map(inv => ({
          id: inv.id,
          currentPrice: data.prices[inv.symbol] || inv.currentPrice
        }));
        dispatch({ type: 'UPDATE_INVESTMENT_PRICES', payload: updates });
      }
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  React.useEffect(() => {
    if (investments.length > prevInvLengthRef.current) {
      // A new investment was added! Automatically sync prices for ALL investments immediately
      handleSync();
    }
    prevInvLengthRef.current = investments.length;
  }, [investments.length]);

  // Calculations
  let totalInvested = 0;
  let totalCurrent = 0;
  let bestPerformer = null;
  let worstPerformer = null;

  investments.forEach(inv => {
    const invested = inv.quantity * inv.averageBuyPrice;
    const current = inv.quantity * inv.currentPrice;
    const profit = current - invested;
    const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

    totalInvested += invested;
    totalCurrent += current;

    if (!bestPerformer || profitPct > bestPerformer.pct) {
      bestPerformer = { ...inv, pct: profitPct, abs: profit };
    }
    if (!worstPerformer || profitPct < worstPerformer.pct) {
      worstPerformer = { ...inv, pct: profitPct, abs: profit };
    }
  });

  const totalProfit = totalCurrent - totalInvested;
  const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="title-medium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📈</span> Live Portfolio
          </h2>
          <p className="t-secondary" style={{ fontSize: '13px' }}>Real-time Stock & SIP Tracking</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-icon" onClick={handleSync} disabled={isSyncing || isOffline || investments.length === 0} style={{ background: 'var(--lg-fill)', borderRadius: '50%' }}>
            {isSyncing ? '⌛' : '🔄'}
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)} style={{ borderRadius: '20px', padding: '0 16px', height: '36px', fontSize: '14px' }}>
            + Add
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="lg-card lg-p-xl" style={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(10,132,255,0.1), rgba(94,92,230,0.1))', border: '1px solid rgba(10,132,255,0.2)' }}>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-sm font-bold text-[var(--t-secondary)] uppercase tracking-wider">Current Value</span>
          <span className="text-4xl font-extrabold tracking-tight">₹{totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
        
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--t-secondary)]">Total Invested</span>
            <span className="font-bold">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-[var(--t-secondary)]">Total Returns</span>
            <div className={`font-bold flex items-center gap-1 ${totalProfit >= 0 ? 'text-[var(--c-green)]' : 'text-[var(--c-red)]'}`}>
              <span>{totalProfit >= 0 ? '+' : ''}₹{Math.abs(totalProfit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              <span className="text-xs" style={{ background: totalProfit >= 0 ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)', padding: '2px 6px', borderRadius: '8px' }}>
                {totalProfit >= 0 ? '↗' : '↘'} {Math.abs(totalProfitPct).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Widgets */}
      {investments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Best Performer */}
          <div className="lg-card flex flex-col justify-between" style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(48,209,88,0.08), rgba(48,209,88,0.01))', border: '1px solid rgba(48,209,88,0.15)' }}>
            <span className="text-xs font-bold text-[var(--c-green)] uppercase tracking-wider flex items-center gap-1 mb-2">★ Top Gainer</span>
            <span className="font-bold text-sm truncate mb-1" style={{ color: 'var(--t-primary)' }}>{bestPerformer?.name || '-'}</span>
            <span className="text-[var(--c-green)] font-bold text-xl">+{bestPerformer?.pct.toFixed(2)}%</span>
          </div>

          {/* Worst Performer */}
          <div className="lg-card flex flex-col justify-between" style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255,69,58,0.08), rgba(255,69,58,0.01))', border: '1px solid rgba(255,69,58,0.15)' }}>
            <span className="text-xs font-bold text-[var(--c-red)] uppercase tracking-wider flex items-center gap-1 mb-2">▼ Top Loser</span>
            <span className="font-bold text-sm truncate mb-1" style={{ color: 'var(--t-primary)' }}>{worstPerformer?.name || '-'}</span>
            <span className="text-[var(--c-red)] font-bold text-xl">{worstPerformer?.pct.toFixed(2)}%</span>
          </div>
        </div>
      )}

      {/* List of Investments */}
      {investments.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-[var(--t-secondary)] uppercase tracking-wider mb-1">Your Holdings</h3>
          {investments.map(inv => {
            const invested = inv.quantity * inv.averageBuyPrice;
            const current = inv.quantity * inv.currentPrice;
            const profit = current - invested;
            const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
            const isPositive = profit >= 0;

            return (
              <div key={inv.id} className="lg-card p-4 flex justify-between items-center" style={{ borderRadius: '20px' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0" style={{ background: inv.type === 'STOCK' ? 'rgba(10,132,255,0.1)' : 'rgba(48,209,88,0.1)', color: inv.type === 'STOCK' ? 'var(--c-blue)' : 'var(--c-green)' }}>
                    {inv.type === 'STOCK' ? 'S' : 'M'}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-bold truncate" style={{ maxWidth: '140px' }}>{inv.name}</span>
                    <span className="text-xs text-[var(--t-secondary)] uppercase">{inv.symbol} • {inv.quantity} {inv.type === 'STOCK' ? 'shares' : 'units'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-bold">₹{current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  <span className={`text-xs font-bold ${isPositive ? 'text-[var(--c-green)]' : 'text-[var(--c-red)]'}`}>
                    {isPositive ? '+' : ''}₹{Math.abs(profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isPositive ? '+' : ''}{profitPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {investments.length === 0 && pendingOrders.length === 0 && (
        <div className="lg-card p-6 flex flex-col items-center justify-center text-center mt-2" style={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}>
          <span style={{ fontSize: '48px', marginBottom: '12px' }}>📊</span>
          <h3 className="font-bold mb-2">No Investments Yet</h3>
          <p className="text-sm text-[var(--t-secondary)] mb-4">Add your stocks and mutual funds to track your net worth and live returns automatically.</p>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)} style={{ borderRadius: '20px', padding: '0 24px', height: '40px' }}>
            Add Your First Asset
          </button>
        </div>
      )}

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-[var(--c-orange)] uppercase tracking-wider">Pending Orders ({pendingOrders.length})</h3>
            <button className="btn btn-ghost btn-sm" onClick={handleResolveOrders} disabled={isResolving} style={{ color: 'var(--c-orange)', border: '1px solid var(--c-orange)', borderRadius: '12px', padding: '4px 10px', fontSize: '12px' }}>
              {isResolving ? 'Checking API...' : 'Auto-Resolve Now'}
            </button>
          </div>
          {pendingOrders.map(order => {
            const date = new Date(order.orderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return (
              <div key={order.id} className="lg-card p-4 flex justify-between items-center opacity-80" style={{ borderRadius: '20px', borderLeft: '3px solid var(--c-orange)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0" style={{ background: 'rgba(255, 159, 10, 0.1)', color: 'var(--c-orange)' }}>
                    ⏳
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-bold truncate" style={{ maxWidth: '140px' }}>{order.name}</span>
                    <span className="text-xs text-[var(--t-secondary)] uppercase">Waiting for NAV from {date}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-bold">₹{order.amount.toLocaleString('en-IN')}</span>
                  <span className="text-xs font-bold text-[var(--c-orange)]">Processing</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddInvestmentSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}
