import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';

export default function EditTransactionSheet({ transaction, onClose }) {
  const { state, dispatch } = useFinance();
  
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  
  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setTitle(transaction.title || transaction.category || '');
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_TRANSACTION',
      payload: {
        id: transaction.id,
        updates: {
          amount: parseFloat(amount) || 0,
          title: title
        }
      }
    });
    onClose();
  };

  const handleDelete = () => {
    dispatch({
      type: 'DELETE_TRANSACTION',
      payload: transaction.id
    });
    onClose();
  };

  return createPortal(
    <div className="sheet-overlay anim-fade-in" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="sheet-modal lg lg-r-xl anim-slide-up" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <h3 className="headline">Edit Entry</h3>
          <button className="btn btn-ghost fw-bold" onClick={handleSave} style={{ color: 'var(--c-cyan)' }}>Save</button>
        </div>
        
        <div className="sheet-content">
          <div className="flex flex-col items-center mb-6">
            <span className="text-4xl mb-2">
              {transaction.type === 'Expense' ? '🍔' : transaction.type === 'Income' ? '💰' : '💳'}
            </span>
            <p className="caption t-secondary">{transaction.category}</p>
          </div>
          
          <ul className="inset-grouped-list mb-6">
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Amount</span>
                <input 
                  type="number" 
                  className="sheet-input" 
                  dir="rtl" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  autoFocus 
                />
              </div>
            </li>
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Title / Note</span>
                <input 
                  type="text" 
                  className="sheet-input" 
                  dir="rtl" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                />
              </div>
            </li>
          </ul>

          <button 
            className="btn w-full lg-r-md py-3 fw-bold" 
            style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--c-red)' }}
            onClick={handleDelete}
          >
            Delete Transaction
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
