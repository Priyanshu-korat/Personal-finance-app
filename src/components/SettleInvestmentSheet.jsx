import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';

export default function SettleInvestmentSheet({ investment, onClose }) {
  const { state, dispatch } = useFinance();
  const [amount, setAmount] = useState(
    investment ? (investment.quantity * investment.currentPrice).toFixed(2) : ''
  );
  const [accountId, setAccountId] = useState('');

  const bankAccounts = state.accounts.filter(a => a.type === 'Bank' || a.type === 'Cash');

  const handleSubmit = () => {
    if (!amount || !accountId || !investment) return;

    // 1. Log Income transaction
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id: `tx-${Date.now()}`,
        title: `Settled ${investment.name}`,
        amount: Number(amount),
        type: 'Income',
        category: 'Investment Returns',
        accountId: accountId,
        date: new Date().toISOString()
      }
    });

    // 2. Add funds to target account
    const targetAccount = state.accounts.find(a => a.id === accountId);
    if (targetAccount) {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        payload: {
          id: accountId,
          updates: { balance: parseFloat(targetAccount.balance) + Number(amount) }
        }
      });
    }

    // 3. Remove investment from portfolio
    dispatch({
      type: 'DELETE_INVESTMENT',
      payload: investment.id
    });

    onClose();
  };

  if (!investment) return null;

  return createPortal(
    <div className="sheet-overlay anim-fade-in" onClick={onClose}>
      <div className="sheet-modal lg lg-r-xl anim-morph-up" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        
        <div className="sheet-header">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <h3 className="headline">Settle Investment</h3>
          <button 
            type="button"
            className="btn btn-ghost fw-bold" 
            style={{ color: (!amount || !accountId) ? 'var(--t-tertiary)' : 'var(--c-blue-lt)' }}
            onClick={handleSubmit}
            disabled={!amount || !accountId}
          >
            Settle
          </button>
        </div>

        <div className="sheet-body flex flex-col gap-4">
          <div className="lg-card p-4 text-center">
            <p className="t-secondary text-sm mb-1">Settling</p>
            <h4 className="title-medium text-[var(--c-blue)]">{investment.name}</h4>
          </div>

          <div className="form-group">
            <label>Final Amount Received (₹)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 65000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
            <p className="t-tertiary text-xs mt-1">Enter the final amount received after any taxes or broker fees.</p>
          </div>

          <div className="form-group">
            <label>Deposit To</label>
            <select 
              className="input-field" 
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
            >
              <option value="" disabled>Select Account</option>
              {bankAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} (₹{a.balance})</option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
