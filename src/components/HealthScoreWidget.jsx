import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import Odometer from './ui/Odometer';

export default function HealthScoreWidget() {
  const { state } = useFinance();
  
  const transactions = state.transactions || [];
  const budgets = state.budgets || [];
  
  // Calculate Streak
  // We define a streak as consecutive days logging at least one transaction
  const streak = useMemo(() => {
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    const datesWithTxs = [...new Set(transactions.map(t => {
      const d = new Date(t.date);
      d.setHours(0,0,0,0);
      return d.getTime();
    }))].sort((a,b) => b - a);

    let checkDate = today.getTime();
    
    // Check if they logged today or yesterday to keep streak alive
    if (datesWithTxs.includes(checkDate) || datesWithTxs.includes(checkDate - 86400000)) {
      for (let d of datesWithTxs) {
        if (d === checkDate || d === checkDate - 86400000) {
          if (d === checkDate) currentStreak++;
          checkDate = d - 86400000;
        } else {
          break;
        }
      }
    }
    
    return currentStreak;
  }, [transactions]);

  // Calculate Health Score (0-100)
  // Factors: Budget Adherence, Income > Expenses
  const score = useMemo(() => {
    let s = 50; // base score

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    const spentByCategory = {};

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'Income') thisMonthIncome += amt;
        if (t.type === 'Expense') {
          thisMonthExpense += amt;
          spentByCategory[t.category] = (spentByCategory[t.category] || 0) + amt;
        }
      }
    });

    // Factor 1: Positive Cashflow
    if (thisMonthIncome > 0) {
      const savingsRate = ((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100;
      if (savingsRate > 20) s += 20;
      else if (savingsRate > 0) s += 10;
      else if (savingsRate < -10) s -= 20;
    }

    // Factor 2: Budgets
    if (budgets.length > 0) {
      let overBudgets = 0;
      budgets.forEach(b => {
        const spent = spentByCategory[b.category] || 0;
        if (spent > b.amount) overBudgets++;
      });
      if (overBudgets === 0) s += 20;
      else s -= (overBudgets * 5);
    }

    // Factor 3: Streak
    s += Math.min(streak * 2, 10); // up to 10 points for streak

    return Math.max(0, Math.min(Math.round(s), 100)); // clamp 0-100
  }, [transactions, budgets, streak]);

  let healthMessage = "Looking Good!";
  let healthColor = "var(--c-green)";
  if (score < 40) { healthMessage = "Needs Attention"; healthColor = "var(--c-red)"; }
  else if (score < 70) { healthMessage = "On Track"; healthColor = "var(--c-blue)"; }
  else if (score > 85) { healthMessage = "Excellent!"; healthColor = "var(--c-cyan)"; }

  return (
    <div className="flex gap-4 px-1 mt-4">
      {/* Score Card */}
      <div className="lg-card flex-1 p-5 flex flex-col justify-between" style={{ borderRadius: '24px' }}>
        <div>
          <p className="text-xs font-bold t-secondary uppercase tracking-wider mb-1">Health Score</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold" style={{ color: healthColor }}><Odometer value={score} /></span>
            <span className="text-sm t-tertiary mb-1">/100</span>
          </div>
        </div>
        <p className="text-sm font-bold mt-3" style={{ color: healthColor }}>{healthMessage}</p>
      </div>

      {/* Streak Card */}
      <div className="lg-card p-5 flex flex-col justify-between items-center text-center" style={{ borderRadius: '24px', width: '120px' }}>
        <p className="text-xs font-bold t-secondary uppercase tracking-wider mb-2">Streak</p>
        <div className="text-4xl">🔥</div>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-2xl font-bold"><Odometer value={streak} /></span>
          <span className="text-xs t-tertiary">days</span>
        </div>
      </div>
    </div>
  );
}
