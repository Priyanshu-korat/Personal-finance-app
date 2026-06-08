import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import SplitExpenseSection from './SplitExpenseSection';

export default function EditSplitModal({ isOpen, onClose, split }) {
  const { state, dispatch } = useFinance();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [splitData, setSplitData] = useState(null);

  useEffect(() => {
    if (isOpen && split) {
      setAmount(split.totalAmount || '');
      setTitle(split.title || '');
      // Copy over the split data
      setSplitData(split.splitData || {
        isEnabled: true,
        paidBy: split.paidBy === state.profile?.id ? 'me' : split.paidBy,
        splitType: 'equal',
        involved: ['me']
      });
    }
  }, [isOpen, split, state.profile?.id]);

  if (!isOpen || !split) return null;

  const handleSave = () => {
    const numAmount = Number(amount);
    if (!numAmount || !splitData || splitData.involved.length === 0) return;

    // Recalculate debts
    let calculatedSplits = [];
    if (splitData.splitType === 'equal') {
      const splitAmount = numAmount / splitData.involved.length;
      calculatedSplits = splitData.involved.map(id => ({ id, amount: splitAmount }));
    } else if (splitData.splitType === 'manual') {
      calculatedSplits = splitData.involved.map(id => ({
        id,
        amount: Number(splitData.manualAmounts?.[id]) || 0
      }));
    } else if (splitData.splitType === 'percentage') {
      calculatedSplits = splitData.involved.map(id => ({
        id,
        amount: (Number(splitData.percentages?.[id]) || 0) * numAmount / 100
      }));
    }

    const debts = [];
    calculatedSplits.forEach(s => {
      if (s.id !== splitData.paidBy && s.amount > 0) {
        // Find existing debt to preserve status if it was settled, though editing usually resets or we only edit pending.
        // For simplicity in this demo, we recreate debts. If a debt was settled, we might have to be careful.
        // Let's assume we preserve status if debt exists between same parties
        const existing = split.splitData?.debts?.find(d => d.debtorId === s.id && d.creditorId === splitData.paidBy);
        
        debts.push({
          debtorId: s.id,
          debtorPhone: s.id === 'me' ? state.profile?.phone : (state.contacts.find(c => c.id === s.id)?.phone || 'none'),
          creditorId: splitData.paidBy,
          creditorPhone: splitData.paidBy === 'me' ? state.profile?.phone : (state.contacts.find(c => c.id === splitData.paidBy)?.phone || 'none'),
          amount: s.amount,
          status: existing ? existing.status : 'pending'
        });
      }
    });

    const updatedSplitData = { ...splitData, debts };

    // Determine the true payer ID for the database
    let payerDbId = state.profile?.id;
    if (splitData.paidBy !== 'me') {
       const contact = state.contacts.find(c => c.id === splitData.paidBy);
       payerDbId = contact?.linkedUserId || contact?.id || splitData.paidBy;
    }

    const updatedSplit = {
      ...split,
      title,
      totalAmount: numAmount,
      paidBy: payerDbId,
      splitData: updatedSplitData,
    };

    dispatch({
      type: 'UPDATE_SHARED_SPLIT',
      payload: updatedSplit
    });

    // If total amount or payer changed, we should ideally update the original transaction
    // This is handled by sync.js or Context in a real app. For UI completeness, we rely on the split update.

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)' }}>
      <div className="lg-card w-full max-w-lg max-h-[90vh] overflow-y-auto anim-slide-up" style={{ borderRadius: '32px 32px 0 0', border: '1px solid var(--lg-border)' }}>
        
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4" style={{ background: 'var(--lg-fill)', backdropFilter: 'blur(20px)' }}>
          <h2 className="title-medium">Edit Split</h2>
          <button onClick={onClose} className="p-2" style={{ borderRadius: '50%', background: 'var(--lg-fill)' }}>✕</button>
        </div>

        <div className="p-6 pt-2 flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <label className="caption t-secondary uppercase fw-bold" style={{ letterSpacing: '1px' }}>Title</label>
            <input 
              type="text" 
              className="form-control text-xl" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Dinner at Goa"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="caption t-secondary uppercase fw-bold" style={{ letterSpacing: '1px' }}>Total Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 t-secondary" style={{ fontSize: '24px' }}>₹</span>
              <input 
                type="number" 
                className="form-control fw-bold" 
                style={{ fontSize: '32px', paddingLeft: '40px', height: 'auto' }}
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                placeholder="0.00"
              />
            </div>
          </div>

          <div style={{ background: 'var(--lg-fill-hover)', borderRadius: '24px', padding: '16px' }}>
            <SplitExpenseSection 
              totalAmount={amount}
              contacts={state.contacts}
              value={splitData}
              onChange={setSplitData}
              onAddContact={() => {}} // Usually don't add contacts while editing
            />
          </div>

          <button 
            className="btn btn-primary w-full" 
            style={{ borderRadius: '20px', padding: '16px', fontSize: '18px', fontWeight: 'bold' }}
            onClick={handleSave}
          >
            Save Changes
          </button>

        </div>
      </div>
    </div>
  );
}
