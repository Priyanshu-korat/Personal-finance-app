import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import LiquidSelect from './LiquidSelect';

export default function BudgetsWidget() {
  const { state, dispatch } = useFinance();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');

  const budgets = state.budgets || [];
  const transactions = state.transactions || [];
  const categories = (state.categories || []).filter(c => c.type === 'Expense');

  // Calculate current month spending per budgeted category
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const spendingByCategory = useMemo(() => {
    const totals = {};
    transactions.forEach(tx => {
      if (tx.type !== 'Expense') return;
      const d = new Date(tx.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        totals[tx.category] = (totals[tx.category] || 0) + parseFloat(tx.amount);
      }
    });
    return totals;
  }, [transactions, currentMonth, currentYear]);

  const handleSaveBudget = () => {
    if (!selectedCat || !amount) return;
    dispatch({
      type: 'SET_BUDGET',
      payload: { category: selectedCat, amount: parseFloat(amount) }
    });
    setIsEditOpen(false);
    setSelectedCat('');
    setAmount('');
  };

  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex justify-between items-center px-1">
        <h3 className="title-medium">Monthly Budgets</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setIsEditOpen(true)} style={{ color: 'var(--c-blue)', fontWeight: 'bold' }}>+ Set Budget</button>
      </div>

      {budgets.length === 0 ? (
        <div className="lg lg-p-xl lg-r-2xl flex flex-col items-center text-center opacity-80" style={{ borderStyle: 'dashed' }}>
          <span style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</span>
          <h4 className="font-bold mb-1">No Budgets Set</h4>
          <p className="text-xs text-[var(--t-secondary)]">Set spending limits for your categories to keep your expenses in check.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {budgets.map(b => {
            const spent = spendingByCategory[b.category] || 0;
            const limit = b.amount;
            const percent = Math.min((spent / limit) * 100, 100);
            
            let color = 'var(--c-green)';
            if (percent >= 100) color = 'var(--c-red)';
            else if (percent >= 80) color = 'var(--c-orange)';

            const catDef = categories.find(c => c.name === b.category);
            const icon = catDef ? catDef.icon : '🛒';

            return (
              <div key={b.id} className="lg lg-p-md lg-r-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--lg-fill-hover)' }}>
                      {icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{b.category}</h4>
                      <p className="text-xs text-[var(--t-secondary)]">{percent >= 100 ? 'Budget Exceeded!' : `${(100 - percent).toFixed(0)}% remaining`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color }}>₹{spent.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-[var(--t-tertiary)]">of ₹{limit.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--lg-fill)' }}>
                  <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Budget Sheet */}
      {isEditOpen && createPortal(
        <div className="sheet-overlay anim-fade-in" onClick={() => setIsEditOpen(false)}>
          <div className="sheet-modal lg lg-r-xl anim-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <button className="btn btn-ghost" onClick={() => setIsEditOpen(false)}>Cancel</button>
              <h3 className="headline">Set Budget</h3>
              <button className="btn btn-ghost fw-bold" onClick={handleSaveBudget} disabled={!selectedCat || !amount} style={{ color: 'var(--c-blue)' }}>Save</button>
            </div>
            <div className="sheet-content">
              <ul className="inset-grouped-list mb-6">
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Category</span>
                    <LiquidSelect 
                      value={selectedCat}
                      onChange={v => setSelectedCat(v)}
                      placeholder="Select Category"
                      options={categories.map(c => ({ label: c.name, value: c.name, icon: c.icon }))}
                    />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Monthly Limit</span>
                    <input 
                      type="number" className="sheet-input" dir="rtl" placeholder="₹0"
                      value={amount} onChange={e => setAmount(e.target.value)}
                    />
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
