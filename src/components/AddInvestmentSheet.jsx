import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function AddInvestmentSheet({ isOpen, onClose, shellRef }) {
  const { dispatch } = useFinance();
  const [type, setType] = useState('STOCK');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [averageBuyPrice, setAverageBuyPrice] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!symbol || !name || !quantity || !averageBuyPrice) return;

    dispatch({
      type: 'ADD_INVESTMENT',
      payload: {
        id: `inv-${Date.now()}`,
        type,
        symbol: symbol.toUpperCase().trim(),
        name: name.trim(),
        quantity: Number(quantity),
        averageBuyPrice: Number(averageBuyPrice),
        currentPrice: Number(averageBuyPrice), // Initialize with buy price, will be updated by sync
        lastUpdated: new Date().toISOString()
      }
    });

    onClose();
    // Reset form
    setSymbol('');
    setName('');
    setQuantity('');
    setAverageBuyPrice('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div className="w-full max-w-lg bg-[var(--bg-primary)] sm:rounded-[32px] rounded-t-[32px] p-6 anim-slide-up" style={{ border: '1px solid var(--lg-border)' }} onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="title-medium">Add Investment</h2>
          <button className="btn btn-icon" onClick={onClose} style={{ background: 'var(--lg-fill)', borderRadius: '50%' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1" style={{ background: 'var(--lg-fill)', borderRadius: '16px' }}>
            <button type="button" className={`flex-1 py-2 text-sm font-bold rounded-[12px] transition-all ${type === 'STOCK' ? 'bg-[var(--c-blue)] text-white shadow-lg' : 'text-[var(--t-secondary)]'}`} onClick={() => setType('STOCK')}>Stock</button>
            <button type="button" className={`flex-1 py-2 text-sm font-bold rounded-[12px] transition-all ${type === 'MF' ? 'bg-[var(--c-green)] text-white shadow-lg' : 'text-[var(--t-secondary)]'}`} onClick={() => setType('MF')}>Mutual Fund</button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">Symbol (Yahoo Finance format)</label>
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder={type === 'STOCK' ? "e.g. RELIANCE.NS" : "e.g. 0P00005WLZ.BO"} className="lg-input" required />
            <span className="text-xs text-[var(--t-tertiary)] mt-1">For Indian stocks, append .NS (NSE) or .BO (BSE).</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={type === 'STOCK' ? "Reliance Industries" : "Parag Parikh Flexi Cap"} className="lg-input" required />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">{type === 'STOCK' ? 'Total Shares' : 'Total Units'}</label>
              <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" className="lg-input" required />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">{type === 'STOCK' ? 'Avg Buy Price' : 'Avg NAV'}</label>
              <input type="number" step="any" value={averageBuyPrice} onChange={e => setAverageBuyPrice(e.target.value)} placeholder="₹0.00" className="lg-input" required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary mt-4" style={{ height: '56px', fontSize: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--c-blue), var(--c-purple))' }}>
            Add {type === 'STOCK' ? 'Stock' : 'Mutual Fund'}
          </button>
        </form>

      </div>
    </div>
  );
}
