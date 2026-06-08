import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import LiquidSelect from './LiquidSelect';
import MiniCalendar from './MiniCalendar';

export default function AddSubscriptionSheet({ isOpen, onClose }) {
  const { state, dispatch } = useFinance();
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('1');
  const [account, setAccount] = useState('');

  const availableCategories = (state.categories || []).filter(c => c.type === 'Expense');
  
  const availableAccounts = React.useMemo(() => {
    return (state.accounts || []).filter(a => a.type !== 'Investment' && a.type !== 'SIP' && a.type !== 'Stock' && a.type !== 'ETF');
  }, [state.accounts]);

  const handleSave = () => {
    if (!name || !amount || !category || !date || !account) return;
    
    dispatch({
      type: 'ADD_SUBSCRIPTION',
      payload: {
        id: `sub-${Date.now()}`,
        name,
        amount: parseFloat(amount),
        category,
        date: parseInt(date, 10),
        accountId: account,
        frequency: 'Monthly'
      }
    });

    setName('');
    setAmount('');
    setCategory('');
    setDate('1');
    setAccount('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="sheet-overlay anim-fade-in" onClick={onClose}>
      <div className="sheet-modal lg lg-r-xl anim-morph-up" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        
        <div className="sheet-header">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <h3 className="headline">New Subscription</h3>
          <button 
            className="btn btn-ghost fw-bold" 
            style={{ color: (!name || !amount || !category || !account) ? 'var(--t-tertiary)' : 'var(--c-indigo-lt)' }}
            onClick={handleSave}
            disabled={!name || !amount || !category || !account}
          >
            Add
          </button>
        </div>

        <div className="sheet-content">
          <p className="caption t-tertiary text-center mb-6 px-4">
            Add recurring bills (like Netflix or Google One). The system will remind you when the due date passes.
          </p>

          <ul className="inset-grouped-list mb-6">
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Service Name</span>
                <input 
                  type="text" 
                  className="sheet-input" 
                  placeholder="e.g. Netflix" 
                  dir="rtl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            </li>
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Amount</span>
                <input 
                  type="number" 
                  className="sheet-input" 
                  placeholder="₹0" 
                  dir="rtl"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </li>
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Category</span>
                <LiquidSelect 
                  value={category}
                  onChange={(v) => setCategory(v)}
                  placeholder="Select Bucket"
                  options={availableCategories.map(c => ({
                    label: c.name,
                    value: c.name,
                    icon: c.icon
                  }))}
                />
              </div>
            </li>
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Monthly Due Date</span>
                <MiniCalendar 
                  value={date}
                  onChange={(v) => setDate(v.toString())}
                  placeholder="Select Due Date"
                />
              </div>
            </li>
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Payment Mode</span>
                <LiquidSelect 
                  value={account}
                  onChange={(v) => setAccount(v)}
                  placeholder="Select Account"
                  options={availableAccounts.map(a => ({
                    label: a.name,
                    value: a.id,
                    icon: a.type === 'Card' ? '💳' : '🏦'
                  }))}
                />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}
