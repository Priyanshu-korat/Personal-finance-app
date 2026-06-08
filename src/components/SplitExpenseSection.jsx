import React, { useState, useEffect } from 'react';
import LiquidSelect from './LiquidSelect';

export default function SplitExpenseSection({ totalAmount, contacts, value, onChange, onAddContact }) {
  const amount = Number(totalAmount) || 0;

  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Initialize split data if not present
  useEffect(() => {
    if (!value) {
      onChange({
        isEnabled: false,
        paidBy: 'me', // 'me' or contact.id
        splitType: 'equal', // 'equal', 'percentage', 'manual'
        involved: ['me'] // Array of contact IDs (and 'me')
      });
    }
  }, []);

  if (!value) return null;

  // Derive split calculations based on type
  const calculateSplits = () => {
    if (!value.isEnabled) return [];
    
    let splits = [];
    if (value.splitType === 'equal') {
      const splitAmount = amount / value.involved.length;
      splits = value.involved.map(id => ({ id, amount: splitAmount }));
    } 
    // For manual and percentage, we expect the parent/user to manage `manualAmounts` mapping
    // But for simplicity in the UI, we'll store it directly on the value object
    else if (value.splitType === 'manual' || value.splitType === 'percentage') {
      splits = value.involved.map(id => ({
        id,
        amount: Number(value.manualAmounts?.[id]) || 0,
        percent: Number(value.percentages?.[id]) || 0
      }));
    }
    return splits;
  };

  const calculatedSplits = calculateSplits();
  
  // Validation for Save Button
  const isSplitValid = () => {
    if (!value.isEnabled) return true;
    if (value.involved.length === 0) return false;
    
    if (value.splitType === 'manual') {
      const sum = calculatedSplits.reduce((acc, curr) => acc + curr.amount, 0);
      return Math.abs(sum - amount) < 0.01; // exact match
    }
    if (value.splitType === 'percentage') {
      const sum = calculatedSplits.reduce((acc, curr) => acc + curr.percent, 0);
      return Math.abs(sum - 100) < 0.01;
    }
    return true; // equal is always valid
  };



  const handleAddNewContact = (e) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    onAddContact(newContactName, newContactPhone);
    setIsAddingContact(false);
    setNewContactName('');
    setNewContactPhone('');
  };

  const remainingManual = amount - calculatedSplits.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Quick action helpers
  const applyQuickAction = (actionId) => {
    if (contacts.length === 0) return;
    const firstFriend = contacts[0].id; // For 1-on-1, assume the first friend if not selected
    const friendId = value.involved.find(id => id !== 'me') || firstFriend;
    
    let newVal = { ...value, isEnabled: true, involved: ['me', friendId], splitType: 'manual', manualAmounts: {} };
    
    if (actionId === 'you-equal') {
      newVal.paidBy = 'me';
      newVal.splitType = 'equal';
    } else if (actionId === 'you-owe-all') {
      // You paid, but they owe you all (Wait, "paid by you and they owe all money")
      newVal.paidBy = 'me';
      newVal.manualAmounts['me'] = 0;
      newVal.manualAmounts[friendId] = amount;
    } else if (actionId === 'them-equal') {
      newVal.paidBy = friendId;
      newVal.splitType = 'equal';
    } else if (actionId === 'them-owe-all') {
      // They paid, and you owe them all
      newVal.paidBy = friendId;
      newVal.manualAmounts['me'] = amount;
      newVal.manualAmounts[friendId] = 0;
    }
    onChange(newVal);
  };

  const handleToggleInvolved = (id) => {
    const newInvolved = value.involved.includes(id)
      ? value.involved.filter(x => x !== id)
      : [...value.involved, id];
    onChange({ ...value, involved: newInvolved });
  };

  const handleManualChange = (id, val, isPercent) => {
    const key = isPercent ? 'percentages' : 'manualAmounts';
    onChange({
      ...value,
      [key]: { ...(value[key] || {}), [id]: val }
    });
  };

  const getContactName = (id) => id === 'me' ? 'You' : (contacts.find(c => c.id === id)?.name || 'Unknown');

  return (
    <ul className="inset-grouped-list mb-6" style={{ overflow: 'visible' }}>
      <li>
        <div className="flex items-center justify-between w-full">
          <span className="subhead t-primary fw-bold">Split this Expense?</span>
          <input 
            type="checkbox" 
            checked={value.isEnabled} 
            onChange={(e) => onChange({ ...value, isEnabled: e.target.checked })} 
            style={{ transform: 'scale(1.2)' }}
          />
        </div>
      </li>

      {value.isEnabled && (
        <>
          <li style={{ padding: 'var(--s2) var(--s4)', display: 'block' }}>
            <div className="flex w-full gap-3 mt-2 mb-2">
              <div className="flex flex-col flex-1 gap-2">
                <span className="caption t-secondary uppercase fw-bold" style={{ letterSpacing: '1px' }}>Who Paid?</span>
                <LiquidSelect 
                  value={value.paidBy}
                  onChange={(v) => onChange({ ...value, paidBy: v })}
                  placeholder="Select Payer"
                  options={[
                    { label: 'You', value: 'me' },
                    ...contacts.map(c => ({ label: c.name, value: c.id }))
                  ]}
                />
              </div>
              
              {contacts.length > 0 && value.involved.length <= 2 && (
                <div className="flex flex-col flex-1 gap-2">
                  <span className="caption t-secondary uppercase fw-bold" style={{ letterSpacing: '1px' }}>Presets</span>
                  <LiquidSelect 
                    value=""
                    onChange={(v) => applyQuickAction(v)}
                    placeholder="Choose..."
                    options={[
                      { label: 'You paid, split equal', value: 'you-equal' },
                      { label: 'You paid, they owe all', value: 'you-owe-all' },
                      { label: 'They paid, split equal', value: 'them-equal' },
                      { label: 'They paid, you owe all', value: 'them-owe-all' }
                    ]}
                  />
                </div>
              )}
            </div>
          </li>

          <li style={{ padding: 'var(--s4)', display: 'block' }}>
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between mb-3">
                <span className="caption t-secondary uppercase fw-bold" style={{ letterSpacing: '1px' }}>Who is involved?</span>
                <button 
                  className="btn btn-ghost btn-sm t-primary" 
                  style={{ background: 'rgba(255,255,255,0.05)', fontSize: '12px', padding: '4px 10px', height: 'auto' }}
                  onClick={(e) => { e.preventDefault(); setIsAddingContact(!isAddingContact) }}
                >
                  + Add Friend
                </button>
              </div>

              {isAddingContact && (
                <div className="lg-card p-3 mb-4 anim-fade-down" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex flex-col gap-2">
                    <input type="text" className="form-control text-sm" placeholder="Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} />
                    <input type="tel" className="form-control text-sm" placeholder="Mobile Number" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} />
                    <button className="btn btn-primary btn-sm w-full mt-1" onClick={handleAddNewContact}>Save Friend</button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
              <button 
                className={`btn btn-sm ${value.involved.includes('me') ? 'btn-primary' : 'btn-ghost'}`}
                style={{ border: !value.involved.includes('me') ? '1px solid var(--lg-border)' : 'none' }}
                onClick={(e) => { e.preventDefault(); handleToggleInvolved('me') }}
              >You</button>
              {contacts.map(c => (
                <button 
                  key={c.id}
                  className={`btn btn-sm ${value.involved.includes(c.id) ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ border: !value.involved.includes(c.id) ? '1px solid var(--lg-border)' : 'none' }}
                  onClick={(e) => { e.preventDefault(); handleToggleInvolved(c.id) }}
                >{c.name}</button>
              ))}
            </div>

            <span className="caption t-secondary uppercase fw-bold mb-2 block" style={{ letterSpacing: '1px' }}>Split Method</span>
            <div className="segmented-control mb-4">
              {['equal', 'percentage', 'manual'].map(t => (
                <button
                  key={t}
                  className={`segment ${value.splitType === t ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); onChange({ ...value, splitType: t }) }}
                  style={{ textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {value.involved.map(id => {
                const isManual = value.splitType === 'manual';
                const isPercent = value.splitType === 'percentage';
                const splitVal = isManual ? value.manualAmounts?.[id] || '' : (isPercent ? value.percentages?.[id] || '' : (amount / value.involved.length).toFixed(2));
                
                return (
                  <div key={id} className="flex items-center justify-between">
                    <span className="fw-bold">{getContactName(id)}</span>
                    <div className="flex items-center gap-2">
                      {!isManual && !isPercent && <span className="t-secondary">₹{splitVal}</span>}
                      {isPercent && (
                        <div className="flex items-center gap-1">
                          <input type="number" className="sheet-input w-16 text-right" placeholder="0" value={splitVal} onChange={e => handleManualChange(id, e.target.value, true)} />
                          <span className="t-secondary">%</span>
                        </div>
                      )}
                      {isManual && (
                        <div className="flex items-center gap-1">
                          <span className="t-secondary">₹</span>
                          <input type="number" className="sheet-input w-24 text-right" placeholder="0" value={splitVal} onChange={e => handleManualChange(id, e.target.value, false)} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {value.splitType === 'manual' && remainingManual !== 0 && (
              <p className="caption mt-3 text-right fw-bold" style={{ color: 'var(--c-red)' }}>
                {remainingManual > 0 ? `₹${remainingManual.toFixed(2)} left unsettled` : `₹${Math.abs(remainingManual).toFixed(2)} over allocated`}
              </p>
            )}
            {value.splitType === 'percentage' && !isSplitValid() && (
              <p className="caption mt-3 text-right fw-bold" style={{ color: 'var(--c-red)' }}>
                Percentages must add up to 100%
              </p>
            )}
            </div>
          </li>
        </>
      )}
    </ul>
  );
}
