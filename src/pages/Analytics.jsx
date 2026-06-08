import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import NeonDonut from '../components/charts/NeonDonut';
import ActivityRings from '../components/charts/ActivityRings';
import TrendChart from '../components/charts/TrendChart';
import Odometer from '../components/ui/Odometer';
import useTilt from '../hooks/useTilt';
import PortfolioWidget from '../components/PortfolioWidget';
import BudgetsWidget from '../components/BudgetsWidget';

const APPLE_COLORS = [
  '#ff453a', '#ff9f0a', '#ffd60a', '#32d74b', '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f'
];

function TiltCard({ children, motionEnabled, delay = 'd-1', hasGyro, className = '' }) {
  const { ref, style } = useTilt({ enabled: motionEnabled || hasGyro, maxRotation: 8 });
  return (
    <div 
      ref={ref} 
      className={`lg lg-r-3xl lg-p-xl anim-fade-up ${delay} ${className}`} 
      style={{ ...style, transformStyle: 'preserve-3d' }}
    >
      <div style={{ transform: 'translateZ(30px)' }}>
        {children}
      </div>
    </div>
  );
}

const TABS = ['All', 'Expense', 'Income', 'Investment', 'Friends'];
const TIME_RANGES = ['1W', '1M', '1Y', 'ALL'];

export default function Analytics() {
  const { state } = useFinance();
  const transactions = state.transactions || [];
  const accounts = state.accounts || [];
  
  const { requestGyroPermission, hasGyroPermission } = useTilt({ enabled: false });
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [timeRange, setTimeRange] = useState('1M');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Clear selected category when tab or time range changes
  useEffect(() => {
    setSelectedCategory(null);
  }, [activeTab, timeRange]);

  // Timeline Segmented Control Physics
  const segmentRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 2, width: 0 });

  useEffect(() => {
    if (!segmentRef.current) return;
    // Timeout to allow the DOM to render if needed, or just standard effect
    const activeBtn = segmentRef.current.querySelector('.segment.active');
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth
      });
    }
  }, [timeRange]);

  const handleEnableMotion = async () => {
    const success = await requestGyroPermission();
    setMotionEnabled(true);
  };

  // ----- TIME MATH -----
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Calculate cutoff date for time range
  const cutoffDate = useMemo(() => {
    const d = new Date(now);
    if (timeRange === '1W') d.setDate(d.getDate() - 7);
    if (timeRange === '1M') d.setMonth(d.getMonth() - 1);
    if (timeRange === '1Y') d.setFullYear(d.getFullYear() - 1);
    if (timeRange === 'ALL') d.setFullYear(2000); // basically all time
    return d;
  }, [timeRange]);

  // ----- COMPARISON ENGINE (Calendar Based) -----
  const comparisons = useMemo(() => {
    let thisMonth = 0; let lastMonth = 0;
    let thisYear = 0; let lastYear = 0;

    transactions.forEach(tx => {
      if (activeTab !== 'All' && tx.type !== activeTab) return;
      
      const amt = parseFloat(tx.amount) || 0;
      const d = new Date(tx.date);
      const m = d.getMonth();
      const y = d.getFullYear();

      // For 'All', we look at cash flow (Income - Expense), ignoring internal transfers
      let effectiveAmt = amt;
      if (activeTab === 'All') {
        if (tx.type === 'Income') effectiveAmt = amt;
        else if (tx.type === 'Expense') effectiveAmt = -amt;
        else return; // Ignore investment/transfers for raw cash flow
      }

      if (y === currentYear && m === currentMonth) thisMonth += effectiveAmt;
      if (y === (currentMonth === 0 ? currentYear - 1 : currentYear) && 
          m === (currentMonth === 0 ? 11 : currentMonth - 1)) lastMonth += effectiveAmt;
      
      if (y === currentYear) thisYear += effectiveAmt;
      if (y === currentYear - 1) lastYear += effectiveAmt;
    });

    return { thisMonth, lastMonth, thisYear, lastYear };
  }, [transactions, activeTab, currentMonth, currentYear]);

  // ----- TREND CHART DATA ENGINE -----
  const trendData = useMemo(() => {
    // 1. Calculate Initial Net Worth (at start of time) if needed
    let baseNetWorth = 0;
    accounts.forEach(acc => {
      const bal = parseFloat(acc.balance) || 0;
      if (acc.type === 'Card') baseNetWorth -= (parseFloat(acc.spent) || 0);
      else if (['Bank', 'Cash', 'Stock', 'SIP'].includes(acc.type)) baseNetWorth += bal;
    });

    // 2. Sort transactions chronologically (oldest first)
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    // For ALL tab, we plot absolute Net Worth. For others, we plot cumulative totals in the period.
    const isNetWorth = activeTab === 'All';
    let currentNW = baseNetWorth;
    
    // If plotting Net Worth, we need to apply all transactions before the cutoff to get the starting NW for the chart
    if (isNetWorth) {
      sorted.forEach(tx => {
        const d = new Date(tx.date);
        if (d < cutoffDate) {
          const amt = parseFloat(tx.amount) || 0;
          if (tx.type === 'Income') currentNW += amt;
          if (tx.type === 'Expense') currentNW -= amt;
        }
      });
    }

    const dataPoints = [];
    let runningTotal = isNetWorth ? currentNW : 0;

    // Filter to the time range
    const periodTxs = sorted.filter(tx => new Date(tx.date) >= cutoffDate);
    
    if (periodTxs.length === 0) {
      return { data: isNetWorth ? [currentNW, currentNW] : [0, 0], labels: ['Start', 'Now'], color: 'var(--c-indigo-lt)' };
    }

    // Grouping by appropriate buckets
    const bucketMap = {};
    periodTxs.forEach(tx => {
      if (!isNetWorth && tx.type !== activeTab) return;

      const amt = parseFloat(tx.amount) || 0;
      const d = new Date(tx.date);
      
      let key = '';
      if (timeRange === '1W' || timeRange === '1M') key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      else if (timeRange === '1Y' || timeRange === 'ALL') key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

      if (!bucketMap[key]) bucketMap[key] = { amt: 0, dateStr: key, sortDate: d.getTime() };
      
      if (isNetWorth) {
        if (tx.type === 'Income') bucketMap[key].amt += amt;
        if (tx.type === 'Expense') bucketMap[key].amt -= amt;
      } else {
        bucketMap[key].amt += amt;
      }
    });

    const buckets = Object.values(bucketMap).sort((a, b) => a.sortDate - b.sortDate);

    if (buckets.length === 0) {
       return { data: isNetWorth ? [currentNW, currentNW] : [0, 0], labels: ['Start', 'Now'], color: 'var(--c-indigo-lt)' };
    }

    // Always add the starting baseline as the first point for visual curve
    dataPoints.push(runningTotal);
    const labels = [timeRange === '1W' ? '7d ago' : timeRange === '1M' ? '30d ago' : timeRange === '1Y' ? '1yr ago' : 'Start'];

    buckets.forEach((b, idx) => {
      runningTotal += b.amt;
      dataPoints.push(runningTotal);
      if (idx === Math.floor(buckets.length / 2)) labels.push(b.dateStr);
    });
    
    labels.push('Today');

    let color = 'var(--c-indigo-lt)';
    if (activeTab === 'Expense') color = 'var(--c-red)';
    if (activeTab === 'Income') color = 'var(--c-green)';
    if (activeTab === 'Investment') color = 'var(--c-gold)';

    return { data: dataPoints, labels, color };
  }, [transactions, accounts, activeTab, timeRange, cutoffDate]);


  // ----- DONUT / BREAKDOWN ENGINE -----
  const breakdownData = useMemo(() => {
    const categoryMap = {};
    transactions.forEach(tx => {
      if (activeTab !== 'All' && tx.type !== activeTab) return;
      if (new Date(tx.date) < cutoffDate) return;
      
      const key = activeTab === 'All' ? tx.type : tx.category;
      if (!key || key === 'Transfer') return;

      if (!categoryMap[key]) categoryMap[key] = 0;
      categoryMap[key] += parseFloat(tx.amount) || 0;
    });

    let total = 0;
    return Object.entries(categoryMap)
      .map(([name, value]) => {
        total += value;
        return { name, value };
      })
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({
        ...item,
        color: APPLE_COLORS[index % APPLE_COLORS.length],
        total
      }));
  }, [transactions, activeTab, cutoffDate]);

  // ----- TOP MERCHANTS ENGINE -----
  const topMerchants = useMemo(() => {
    if (activeTab === 'Investment' || activeTab === 'Income') return []; // Only really makes sense for Expenses/All
    
    const merchants = {};
    transactions.forEach(tx => {
      if (activeTab !== 'All' && tx.type !== activeTab) return;
      if (tx.type !== 'Expense') return; // Only track merchants for expenses
      if (new Date(tx.date) < cutoffDate) return;
      
      const title = tx.title ? tx.title.trim() : 'Unknown';
      if (!merchants[title]) merchants[title] = { count: 0, amount: 0 };
      merchants[title].count += 1;
      merchants[title].amount += parseFloat(tx.amount) || 0;
    });

    return Object.entries(merchants)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, activeTab, cutoffDate]);

  // ----- FRIENDS / MULTIPLAYER ENGINE -----
  const friendsInsights = useMemo(() => {
    if (activeTab !== 'Friends') return null;

    let totalVolume = 0;
    let iOwe = 0;
    let theyOweMe = 0;
    const friendVolumes = {};

    (state.sharedSplits || []).forEach(split => {
      const d = new Date(split.date || new Date());
      if (d < cutoffDate) return;

      const amt = parseFloat(split.amount) || 0;
      totalVolume += amt;

      const debts = split.splitData?.debts || [];
      debts.forEach(debt => {
        if (debt.status !== 'pending') return;
        const dAmt = Number(debt.amount) || 0;
        
        if (debt.creditorId === 'me') {
          theyOweMe += dAmt;
          if (!friendVolumes[debt.debtorId]) friendVolumes[debt.debtorId] = 0;
          friendVolumes[debt.debtorId] += dAmt;
        } else if (debt.debtorId === 'me') {
          iOwe += dAmt;
          if (!friendVolumes[debt.creditorId]) friendVolumes[debt.creditorId] = 0;
          friendVolumes[debt.creditorId] += dAmt;
        }
      });
    });

    const topFriends = Object.entries(friendVolumes)
      .map(([contactId, volume]) => {
        const contact = (state.contacts || []).find(c => c.id === contactId);
        return { name: contact?.name || 'Unknown', value: volume };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        color: APPLE_COLORS[index % APPLE_COLORS.length],
        total: totalVolume || 1 // for donut compatibility
      }));

    return { totalVolume, iOwe, theyOweMe, topFriends };
  }, [state.sharedSplits, state.contacts, activeTab, cutoffDate]);

  // ----- ADVANCED METRICS ENGINE -----
  const advancedMetrics = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    let largestTx = null;
    let txCount = 0;

    const periodTxs = transactions.filter(tx => new Date(tx.date) >= cutoffDate);
    
    periodTxs.forEach(tx => {
      const amt = parseFloat(tx.amount) || 0;
      
      if (activeTab === 'All' || tx.type === activeTab) {
        if (!largestTx || amt > (parseFloat(largestTx.amount) || 0)) {
          largestTx = tx;
        }
        txCount++;
      }

      if (tx.type === 'Income') incomeTotal += amt;
      if (tx.type === 'Expense') expenseTotal += amt;
    });

    const savingsRate = incomeTotal > 0 ? ((incomeTotal - expenseTotal) / incomeTotal) * 100 : 0;
    
    // Days in Range
    const now = new Date();
    // Use Math.max(1) to avoid divide by zero if cutoff is today
    const days = Math.max(1, Math.ceil((now - cutoffDate) / (1000 * 60 * 60 * 24)));
    
    let dailyAverage = 0;
    if (activeTab === 'Expense') dailyAverage = expenseTotal / days;
    else if (activeTab === 'Income') dailyAverage = incomeTotal / days;
    else if (activeTab === 'All') dailyAverage = expenseTotal / days; 

    return { savingsRate, dailyAverage, largestTx, txCount, days };
  }, [transactions, activeTab, cutoffDate]);

  // ----- SUB-CATEGORY DRILL DOWN ENGINE -----
  const subCategoryData = useMemo(() => {
    if (!selectedCategory || activeTab === 'All' || activeTab === 'Friends') return [];

    const subMap = {};
    transactions.forEach(tx => {
      if (tx.type !== activeTab) return;
      if (new Date(tx.date) < cutoffDate) return;
      if (tx.category !== selectedCategory) return;

      const subKey = tx.subCategory || 'Others';
      if (!subMap[subKey]) subMap[subKey] = 0;
      subMap[subKey] += parseFloat(tx.amount) || 0;
    });

    let total = 0;
    return Object.entries(subMap)
      .map(([name, value]) => {
        total += value;
        return { name, value };
      })
      .sort((a, b) => b.value - a.value)
      .map((item, index) => ({
        ...item,
        color: APPLE_COLORS[index % APPLE_COLORS.length],
        total
      }));
  }, [transactions, activeTab, cutoffDate, selectedCategory]);

  const displayTotal = trendData.data[trendData.data.length - 1] || 0;
  const momPct = comparisons.lastMonth ? ((comparisons.thisMonth - comparisons.lastMonth) / Math.abs(comparisons.lastMonth)) * 100 : 0;
  const yoyPct = comparisons.lastYear ? ((comparisons.thisYear - comparisons.lastYear) / Math.abs(comparisons.lastYear)) * 100 : 0;

  // ----- CATEGORY LIMITS ENGINE -----
  const categoryLimitsStatus = useMemo(() => {
    const limits = state.categories.filter(c => c.monthlyLimit && c.monthlyLimit > 0);
    if (limits.length === 0) return [];
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= startOfMonth && t.type === 'Expense';
    });
    
    return limits.map(cat => {
      const spent = thisMonthTxs
        .filter(t => t.categoryId === cat.id || t.category === cat.name) 
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
      const percentage = Math.round((spent / cat.monthlyLimit) * 100);
      return {
        ...cat,
        spent,
        percentage,
        isOver: spent > cat.monthlyLimit
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [state.categories, transactions]);

  // Calculate Cash Flow for 'All' tab summary
  const cashFlowSummary = useMemo(() => {
    let income = 0; let expense = 0;
    transactions.forEach(tx => {
      if (new Date(tx.date) >= cutoffDate) {
        if (tx.type === 'Income') income += parseFloat(tx.amount) || 0;
        if (tx.type === 'Expense') expense += parseFloat(tx.amount) || 0;
      }
    });
    return { income, expense, savings: income - expense };
  }, [transactions, cutoffDate]);

  return (
    <div style={{ paddingBottom: 100, perspective: 1200 }}>
      {/* ── HEADER & MOTION ── */}
      <div className="section flex justify-between items-center" style={{ paddingBottom: 0 }}>
        <div>
          <h2 className="title-large anim-fade-up d-0">Insights</h2>
        </div>
        {!motionEnabled && !hasGyroPermission && (
          <button 
            className="btn btn-ghost btn-sm anim-scale d-1" 
            style={{ 
              color: 'var(--c-cyan)', border: '1px solid rgba(50, 173, 230, 0.3)',
              borderRadius: 'var(--r-full)', padding: '6px 14px', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(50, 173, 230, 0.05)'
            }}
            onClick={handleEnableMotion}
          >
            <span>🌀</span> 3D
          </button>
        )}
      </div>

      {/* ── TOP NAVIGATION ── */}
      <div className="section anim-fade-up d-1" style={{ paddingTop: 16 }}>
        {/* Category Segmented Control */}
        <div className="flex gap-3 mb-5 overflow-x-auto no-scrollbar" style={{ padding: '4px' }}>
          {TABS.map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className={`fw-bold ${activeTab === t ? 'lg lg-p-sm' : ''}`}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--r-full)',
                background: activeTab === t ? 'var(--lg-fill)' : 'transparent',
                border: activeTab === t ? '1px solid var(--lg-border)' : '1px solid transparent',
                color: activeTab === t ? 'var(--t-primary)' : 'var(--t-secondary)',
                fontSize: '15px',
                whiteSpace: 'nowrap',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Spring animation
              }}
            >
              {t}
            </button>
          ))}
        </div>
        
        {/* Subtle Bottom Separator Line */}
        <div style={{ height: '1px', background: 'var(--lg-border)', width: '100%', marginBottom: '16px' }} />
      </div>

      {/* ── HERO CHARTS & WIDGETS ── */}
      <div className="anim-fade-up d-2" style={{ padding: '0 16px', marginBottom: '32px' }}>
        {/* ── ADVANCED METRICS WIDGETS ── */}
        {activeTab === 'All' && (
          <div className="flex gap-3 mb-6">
            <div className="lg lg-p-md lg-r-xl w-1/2 flex flex-col justify-center" style={{ background: 'rgba(50, 173, 230, 0.05)', border: '1px solid rgba(50, 173, 230, 0.1)' }}>
              <span className="caption t-tertiary mb-1">Savings Rate</span>
              <div className="flex items-end gap-2">
                <span className="headline t-primary" style={{ fontSize: '24px' }}>
                  {Math.max(0, advancedMetrics.savingsRate).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="lg lg-p-md lg-r-xl w-1/2 flex flex-col justify-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--lg-border)' }}>
              <span className="caption t-tertiary mb-1">Financial Velocity</span>
              <div className="flex items-end gap-2">
                <span className="headline t-primary" style={{ fontSize: '24px' }}>
                  {advancedMetrics.txCount}
                </span>
                <span className="caption t-tertiary mb-1">txns</span>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'Expense' || activeTab === 'Income') && (
          <div className="flex gap-3 mb-6">
            <div className="lg lg-p-md lg-r-xl w-1/2 flex flex-col justify-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--lg-border)' }}>
              <span className="caption t-tertiary mb-1">Daily Average</span>
              <div className="flex items-end gap-2">
                <span className="headline t-primary" style={{ fontSize: '24px' }}>
                  ₹{Math.round(advancedMetrics.dailyAverage).toLocaleString()}
                </span>
                <span className="caption t-tertiary mb-1">/day</span>
              </div>
            </div>
            <div className="lg lg-p-md lg-r-xl w-1/2 flex flex-col justify-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--lg-border)' }}>
              <span className="caption t-tertiary mb-1">Frequency</span>
              <div className="flex items-end gap-2">
                <span className="headline t-primary" style={{ fontSize: '24px' }}>
                  {advancedMetrics.txCount}
                </span>
                <span className="caption t-tertiary mb-1">swipes</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 'All' Tab Cash Flow Widgets */}
        {activeTab === 'All' ? (
          <div className="mb-6">
            <span className="caption t-tertiary mb-2 block">Cash Flow ({timeRange})</span>
            <div className="flex gap-3">
              <div className="lg lg-p-md lg-r-xl w-1/3 flex flex-col items-center justify-center text-center" style={{ background: 'rgba(50, 215, 75, 0.05)', border: '1px solid rgba(50, 215, 75, 0.1)' }}>
                <span className="caption fw-bold" style={{ color: 'var(--c-green)' }}>In</span>
                <span className="fw-bold mt-1 t-primary">₹{cashFlowSummary.income.toLocaleString()}</span>
              </div>
              <div className="lg lg-p-md lg-r-xl w-1/3 flex flex-col items-center justify-center text-center" style={{ background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.1)' }}>
                <span className="caption fw-bold" style={{ color: 'var(--c-red)' }}>Out</span>
                <span className="fw-bold mt-1 t-primary">₹{cashFlowSummary.expense.toLocaleString()}</span>
              </div>
              <div className="lg lg-p-md lg-r-xl w-1/3 flex flex-col items-center justify-center text-center" style={{ background: 'rgba(50, 173, 230, 0.05)', border: '1px solid rgba(50, 173, 230, 0.1)' }}>
                <span className="caption fw-bold" style={{ color: 'var(--c-blue)' }}>Net</span>
                <span className="fw-bold mt-1 t-primary">₹{cashFlowSummary.savings.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="mt-6 mb-2 flex flex-col">
              <span className="caption t-tertiary">Current Net Worth</span>
              <span className="headline" style={{ fontSize: '32px', color: trendData.color }}>
                <Odometer value={displayTotal} prefix="₹" duration={1500} />
              </span>
            </div>
          </div>
        ) : activeTab === 'Friends' ? (
          <div className="mb-6 flex flex-col">
            <span className="caption t-tertiary">Total Shared Volume ({timeRange})</span>
            <span className="headline" style={{ fontSize: '32px', color: 'var(--c-indigo-lt)' }}>
              <Odometer value={friendsInsights?.totalVolume || 0} prefix="₹" duration={1500} />
            </span>
          </div>
        ) : (
          <div className="flex flex-col mb-4">
            <span className="caption t-tertiary">Total {activeTab} ({timeRange})</span>
            <span className="headline" style={{ fontSize: '32px', color: trendData.color }}>
              <Odometer value={displayTotal} prefix="₹" duration={1500} />
            </span>
          </div>
        )}
        
        {activeTab !== 'Friends' && (
          <TrendChart 
            data={trendData.data} 
            labels={trendData.labels} 
            color={trendData.color} 
            height={180} 
          />
        )}

        {/* Time Range Pills (Moved Below Chart) */}
        <div className="flex justify-center mt-6">
          <div className="segmented-control" ref={segmentRef} style={{ padding: '2px' }}>
            <div 
              className="segment-highlight" 
              style={{ left: `${pillStyle.left}px`, width: `${pillStyle.width}px` }} 
            />
            {TIME_RANGES.map(tr => (
              <button 
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`segment ${timeRange === tr ? 'active' : ''}`}
                style={{
                  padding: '4px 14px',
                  fontSize: '11px',
                }}
              >
                {tr}
              </button>
            ))}
          </div>
        </div>

        {/* ── LIVE PORTFOLIO WIDGET ── */}
        {activeTab === 'Investment' && (
          <div className="mt-8">
            <PortfolioWidget />
          </div>
        )}
      </div>

      {/* ── COMPARISONS ── */}
      <div className="section anim-fade-up d-3">
        <p className="section-label mb-3">Comparisons (Calendar)</p>
        <div className="flex gap-3">
          {/* MoM Card */}
          <div className="lg lg-p-md lg-r-xl w-1/2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="caption t-tertiary mb-1">This Month</p>
            <p className="headline mb-3">₹{comparisons.thisMonth.toLocaleString()}</p>
            
            <div className="flex items-center gap-2">
              <div 
                style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                  background: momPct > 0 ? 'rgba(50, 215, 75, 0.15)' : momPct < 0 ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255,255,255,0.1)',
                  color: momPct > 0 ? 'var(--c-green)' : momPct < 0 ? 'var(--c-red)' : 'var(--t-tertiary)'
                }}
              >
                {momPct > 0 ? '↑' : momPct < 0 ? '↓' : '-'} {Math.abs(momPct).toFixed(1)}%
              </div>
              <span className="caption t-tertiary" style={{ fontSize: '10px' }}>vs Last Mo</span>
            </div>
          </div>

          {/* YoY Card */}
          <div className="lg lg-p-md lg-r-xl w-1/2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="caption t-tertiary mb-1">This Year</p>
            <p className="headline mb-3">₹{comparisons.thisYear.toLocaleString()}</p>
            
            <div className="flex items-center gap-2">
              <div 
                style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                  background: yoyPct > 0 ? 'rgba(50, 215, 75, 0.15)' : yoyPct < 0 ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255,255,255,0.1)',
                  color: yoyPct > 0 ? 'var(--c-green)' : yoyPct < 0 ? 'var(--c-red)' : 'var(--t-tertiary)'
                }}
              >
                {yoyPct > 0 ? '↑' : yoyPct < 0 ? '↓' : '-'} {Math.abs(yoyPct).toFixed(1)}%
              </div>
              <span className="caption t-tertiary" style={{ fontSize: '10px' }}>vs Last Yr</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BREAKDOWN DONUT & DRILL-DOWN ── */}
      {breakdownData.length > 0 && activeTab !== 'Friends' && (
        <div className="section anim-fade-up d-4">
          <TiltCard motionEnabled={motionEnabled} hasGyro={hasGyroPermission} delay="d-4">
            <div className="flex justify-between items-center mb-6">
              <p className="headline">{activeTab === 'All' ? 'Cashflow Breakdown' : 'Category Distribution'}</p>
              {selectedCategory && (
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedCategory(null)}
                  style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--c-red)' }}
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <NeonDonut 
                  data={breakdownData} 
                  size={160} 
                  strokeWidth={16} 
                  gap={4} 
                  onSelect={activeTab !== 'All' ? setSelectedCategory : undefined}
                  selectedKey={selectedCategory}
                />
              </div>
              <div className="flex flex-col gap-3" style={{ flex: 1.2 }}>
                {breakdownData.slice(0, 5).map(cat => {
                  const pct = Math.round((cat.value / cat.total) * 100);
                  const isSelected = selectedCategory === cat.name;
                  const isMuted = selectedCategory && !isSelected;
                  return (
                    <div 
                      key={cat.name} 
                      className="flex justify-between items-center text-sm"
                      onClick={() => activeTab !== 'All' && setSelectedCategory(cat.name)}
                      style={{ 
                        opacity: isMuted ? 0.4 : 1, 
                        cursor: activeTab !== 'All' ? 'pointer' : 'default',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                        <span className="t-primary truncate fw-bold">{cat.name}</span>
                      </div>
                      <span className="t-tertiary fw-bold" style={{ flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sub-Category Details */}
            {selectedCategory && subCategoryData.length > 0 && (
              <div className="mt-6 pt-4 anim-fade-up" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="caption t-tertiary mb-3 uppercase tracking-widest">{selectedCategory} Sub-categories</p>
                <div className="flex flex-col gap-2">
                  {subCategoryData.map(sub => {
                    const pct = Math.round((sub.value / sub.total) * 100);
                    return (
                      <div key={sub.name} className="flex justify-between items-center p-2 lg-r-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sub.color }} />
                          <span className="subhead">{sub.name}</span>
                        </div>
                        <div className="flex gap-3 text-sm">
                          <span className="t-tertiary">{pct}%</span>
                          <span className="fw-bold text-right" style={{ width: 60 }}>₹{sub.value.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TiltCard>
        </div>
      )}

      {/* ── ADVANCED METRICS ── */}
      {advancedMetrics.largestTx && activeTab !== 'Friends' && (
        <div className="section anim-fade-up d-4">
          <TiltCard motionEnabled={motionEnabled} hasGyro={hasGyroPermission} delay="d-4">
            <p className="headline mb-4">Largest {activeTab === 'All' ? 'Transaction' : activeTab}</p>
            <div className="flex items-center justify-between p-3 lg-r-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--lg-border)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--lg-fill)', border: '1px solid var(--lg-border)' }}>
                  <span className="text-xl">
                    {advancedMetrics.largestTx.type === 'Income' ? '⬇' : '⬆'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="t-primary fw-bold truncate">{advancedMetrics.largestTx.title || advancedMetrics.largestTx.category}</p>
                  <p className="caption t-tertiary truncate">{new Date(advancedMetrics.largestTx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
              <p className="headline" style={{ color: advancedMetrics.largestTx.type === 'Income' ? 'var(--c-green)' : 'var(--c-red)' }}>
                ₹{Number(advancedMetrics.largestTx.amount).toLocaleString()}
              </p>
            </div>
          </TiltCard>
        </div>
      )}

      {/* ── TOP MERCHANTS ── */}
      {topMerchants.length > 0 && activeTab !== 'Friends' && (
        <div className="section anim-fade-up d-5">
          <TiltCard motionEnabled={motionEnabled} hasGyro={hasGyroPermission} delay="d-5">
            <p className="headline mb-4">Top Payees</p>
            <div className="flex flex-col gap-3">
              {topMerchants.map((merchant, i) => (
                <div key={merchant.name} className="flex justify-between items-center p-3 lg-r-md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <span className="caption t-tertiary fw-bold" style={{ width: '16px' }}>#{i + 1}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="subhead truncate">{merchant.name}</span>
                      <span className="caption t-tertiary" style={{ fontSize: '10px' }}>
                        Avg: ₹{Math.round(merchant.amount / merchant.count).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="fw-bold" style={{ color: 'var(--text-primary)' }}>
                      <Odometer value={merchant.amount} prefix="₹" duration={2000} />
                    </span>
                    <span className="caption t-tertiary">{merchant.count} txns</span>
                  </div>
                </div>
              ))}
            </div>
          </TiltCard>
        </div>
      )}

      {/* ── CATEGORY LIMITS (Monthly Budgets) ── */}
      {categoryLimitsStatus.length > 0 && (activeTab === 'All' || activeTab === 'Expense') && (
        <div className="section anim-fade-up d-5">
          <TiltCard motionEnabled={motionEnabled} hasGyro={hasGyroPermission} delay="d-5">
            <p className="headline mb-4">Monthly Budgets</p>
            <div className="flex flex-col gap-5">
              {categoryLimitsStatus.map((cat, i) => (
                <div key={cat.name} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                      <span className="t-primary fw-bold">{cat.name}</span>
                    </div>
                    <div className="flex gap-2 text-right">
                      <span className={cat.isOver ? "fw-bold" : "t-primary fw-bold"} style={{ color: cat.isOver ? 'var(--c-red)' : '' }}>
                        ₹{cat.spent.toLocaleString()}
                      </span>
                      <span className="t-tertiary">/ ₹{cat.monthlyLimit.toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, cat.percentage)}%`, 
                        background: cat.isOver ? 'var(--c-red)' : (cat.percentage > 80 ? 'var(--c-orange)' : 'var(--c-green)'),
                        borderRadius: '4px',
                        transition: 'width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }} 
                    />
                  </div>
                  {cat.isOver && (
                    <p className="caption mt-1" style={{ fontSize: '11px', color: 'var(--c-red)' }}>
                      Over budget by ₹{(cat.spent - cat.monthlyLimit).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </TiltCard>
        </div>
      )}

      {/* ── FRIENDS INSIGHTS ── */}
      {activeTab === 'Friends' && friendsInsights && (
        <div className="section anim-fade-up d-4">
          <TiltCard motionEnabled={motionEnabled} hasGyro={hasGyroPermission} delay="d-4" className="mb-4">
            <p className="headline mb-4">Net Balances</p>
            <div className="flex gap-3">
              <div className="lg lg-p-md lg-r-xl w-1/2" style={{ background: 'rgba(50, 215, 75, 0.05)', border: '1px solid rgba(50, 215, 75, 0.1)' }}>
                <p className="caption t-tertiary mb-1">Owed to me</p>
                <p className="headline t-primary">₹{friendsInsights.theyOweMe.toLocaleString()}</p>
              </div>
              <div className="lg lg-p-md lg-r-xl w-1/2" style={{ background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.1)' }}>
                <p className="caption t-tertiary mb-1">I owe</p>
                <p className="headline t-primary">₹{friendsInsights.iOwe.toLocaleString()}</p>
              </div>
            </div>
          </TiltCard>

          {friendsInsights.topFriends.length > 0 && (
            <TiltCard motionEnabled={motionEnabled} hasGyro={hasGyroPermission} delay="d-5">
              <p className="headline mb-4">Top Friends by Volume</p>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <NeonDonut 
                    data={friendsInsights.topFriends} 
                    size={150} 
                    strokeWidth={14} 
                    gap={4} 
                  />
                </div>
                <div className="flex flex-col gap-3" style={{ flex: 1.2 }}>
                  {friendsInsights.topFriends.map(friend => {
                    const pct = Math.round((friend.value / friendsInsights.totalVolume) * 100);
                    return (
                      <div key={friend.name} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: friend.color, flexShrink: 0 }} />
                          <span className="t-primary truncate fw-bold">{friend.name}</span>
                        </div>
                        <span className="t-tertiary fw-bold" style={{ flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TiltCard>
          )}
        </div>
      )}



    </div>
  );
}
