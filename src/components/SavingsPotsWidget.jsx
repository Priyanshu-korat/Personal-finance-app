import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';

export default function SavingsPotsWidget() {
  const { state, dispatch } = useFinance();
  const pots = state.savingsPots || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFundOpen, setIsFundOpen] = useState(false);
  const [selectedPot, setSelectedPot] = useState(null);

  // Add Pot State
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('🏖️');

  // Fund Pot State
  const [fundAmount, setFundAmount] = useState('');

  const handleSavePot = () => {
    if (!name || !target) return;
    dispatch({
      type: 'ADD_SAVINGS_POT',
      payload: {
        id: `pot-${Date.now()}`,
        name,
        targetAmount: parseFloat(target),
        currentAmount: 0,
        icon
      }
    });
    setIsAddOpen(false);
    setName('');
    setTarget('');
    setIcon('🏖️');
  };

  const handleFundPot = () => {
    if (!selectedPot || !fundAmount) return;
    dispatch({
      type: 'UPDATE_SAVINGS_POT',
      payload: {
        id: selectedPot.id,
        updates: {
          currentAmount: selectedPot.currentAmount + parseFloat(fundAmount)
        }
      }
    });
    setIsFundOpen(false);
    setSelectedPot(null);
    setFundAmount('');
  };

  // SVG Circular Progress
  const CircularProgress = ({ percent, color }) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle 
            cx="32" cy="32" r={radius} 
            stroke="var(--lg-border)" strokeWidth="6" fill="transparent" 
          />
          <circle 
            cx="32" cy="32" r={radius} 
            stroke={color} strokeWidth="6" fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
          {percent.toFixed(0)}%
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      <div className="flex justify-between items-center px-1">
        <h3 className="title-medium">Savings Goals</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setIsAddOpen(true)} style={{ color: 'var(--c-cyan)', fontWeight: 'bold' }}>+ New Goal</button>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar px-1">
        {pots.length === 0 ? (
          <div className="lg lg-p-xl lg-r-2xl flex flex-col items-center justify-center text-center w-full opacity-80" style={{ borderStyle: 'dashed' }}>
            <span style={{ fontSize: '32px', marginBottom: '8px' }}>🐷</span>
            <h4 className="font-bold mb-1">No Goals Yet</h4>
            <p className="text-xs text-[var(--t-secondary)]">Create a pot for your next vacation, gadget, or emergency fund.</p>
          </div>
        ) : (
          pots.map(pot => {
            const percent = Math.min((pot.currentAmount / pot.targetAmount) * 100, 100);
            const isCompleted = percent >= 100;
            const color = isCompleted ? 'var(--c-green)' : 'var(--c-cyan)';

            return (
              <div 
                key={pot.id} 
                className="lg lg-p-md lg-r-2xl shrink-0 flex flex-col items-center justify-between anim-fade-in" 
                style={{ width: '160px', border: isCompleted ? '1px solid var(--c-green)' : '1px solid var(--lg-border)' }}
                onClick={() => { if (!isCompleted) { setSelectedPot(pot); setIsFundOpen(true); } }}
              >
                <div className="text-3xl mb-2">{pot.icon}</div>
                <h4 className="font-bold text-sm text-center mb-1 truncate w-full">{pot.name}</h4>
                <p className="text-xs text-[var(--t-tertiary)] mb-4">₹{pot.currentAmount.toLocaleString('en-IN')} / ₹{pot.targetAmount.toLocaleString('en-IN')}</p>
                
                <CircularProgress percent={percent} color={color} />
                
                {isCompleted ? (
                  <div className="mt-3 text-xs font-bold px-3 py-1 rounded-full bg-[var(--c-green)] text-white">Goal Reached!</div>
                ) : (
                  <button className="mt-3 btn btn-ghost btn-sm w-full" style={{ background: 'var(--lg-fill-hover)', color: 'var(--c-cyan)', borderRadius: '12px' }}>
                    + Fund
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Pot Sheet */}
      {isAddOpen && createPortal(
        <div className="sheet-overlay anim-fade-in" onClick={() => setIsAddOpen(false)}>
          <div className="sheet-modal lg lg-r-xl anim-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <button className="btn btn-ghost" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <h3 className="headline">New Goal</h3>
              <button className="btn btn-ghost fw-bold" onClick={handleSavePot} disabled={!name || !target} style={{ color: 'var(--c-cyan)' }}>Create</button>
            </div>
            <div className="sheet-content">
              <ul className="inset-grouped-list mb-6">
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Goal Name</span>
                    <input type="text" className="sheet-input" dir="rtl" placeholder="e.g. iPhone 15" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Target Amount</span>
                    <input type="number" className="sheet-input" dir="rtl" placeholder="₹0" value={target} onChange={e => setTarget(e.target.value)} />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Emoji Icon</span>
                    <input type="text" className="sheet-input" dir="rtl" placeholder="🏖️" value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} />
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fund Pot Sheet */}
      {isFundOpen && selectedPot && createPortal(
        <div className="sheet-overlay anim-fade-in" onClick={() => setIsFundOpen(false)}>
          <div className="sheet-modal lg lg-r-xl anim-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <button className="btn btn-ghost" onClick={() => setIsFundOpen(false)}>Cancel</button>
              <h3 className="headline">Fund {selectedPot.name}</h3>
              <button className="btn btn-ghost fw-bold" onClick={handleFundPot} disabled={!fundAmount} style={{ color: 'var(--c-cyan)' }}>Add</button>
            </div>
            <div className="sheet-content">
              <div className="flex flex-col items-center mb-6">
                <span className="text-4xl mb-2">{selectedPot.icon}</span>
                <p className="text-sm t-secondary">Remaining: ₹{(selectedPot.targetAmount - selectedPot.currentAmount).toLocaleString('en-IN')}</p>
              </div>
              <ul className="inset-grouped-list mb-6">
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Amount to Add</span>
                    <input type="number" className="sheet-input" dir="rtl" placeholder="₹0" value={fundAmount} onChange={e => setFundAmount(e.target.value)} autoFocus />
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
