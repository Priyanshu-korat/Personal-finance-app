import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function AddInvestmentSheet({ isOpen, onClose, shellRef }) {
  const { dispatch } = useFinance();
  const [type, setType] = useState('STOCK');
  const [entryMode, setEntryMode] = useState('PAST'); // 'PAST', 'NEW', 'SIP'
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [averageBuyPrice, setAverageBuyPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [sipDate, setSipDate] = useState('1');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!symbol || !name) return;

    if (entryMode === 'PAST') {
      if (!quantity || !averageBuyPrice) return;
      dispatch({
        type: 'ADD_INVESTMENT',
        payload: {
          id: `inv-${Date.now()}`,
          type,
          symbol: symbol.toUpperCase().trim(),
          name: name.trim(),
          quantity: Number(quantity),
          averageBuyPrice: Number(averageBuyPrice),
          currentPrice: Number(averageBuyPrice),
          lastUpdated: new Date().toISOString()
        }
      });
    } else if (entryMode === 'NEW') {
      if (!amount) return;
      dispatch({
        type: 'ADD_INVESTMENT_ORDER',
        payload: {
          id: `ord-${Date.now()}`,
          investmentId: null,
          type,
          symbol: symbol.toUpperCase().trim(),
          name: name.trim(),
          amount: Number(amount),
          orderDate: new Date().toISOString(),
          status: 'PENDING'
        }
      });
    } else if (entryMode === 'SIP') {
      if (!amount || !sipDate) return;
      dispatch({
        type: 'ADD_SUBSCRIPTION',
        payload: {
          id: `sub-${Date.now()}`,
          name: `${name} (${type === 'STOCK' ? 'Stock SIP' : 'MF SIP'})`,
          amount: parseFloat(amount),
          category: 'Investment',
          date: parseInt(sipDate, 10),
          frequency: 'Monthly',
          isSip: true,
          sipType: type,
          sipSymbol: symbol.toUpperCase().trim(),
          sipName: name.trim()
        }
      });
    }

    onClose();
    setSymbol('');
    setName('');
    setQuantity('');
    setAverageBuyPrice('');
    setAmount('');
    setSipDate('1');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div className="w-full max-w-lg bg-[var(--bg-primary)] sm:rounded-[32px] rounded-t-[32px] p-6 anim-slide-up" style={{ border: '1px solid var(--lg-border)' }} onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="title-medium">Add Investment</h2>
          <button className="btn btn-icon" onClick={onClose} style={{ background: 'var(--lg-fill)', borderRadius: '50%' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Entry Mode Toggle */}
          <div className="flex gap-2 p-1" style={{ background: 'var(--lg-fill)', borderRadius: '16px' }}>
            <button type="button" className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-[12px] transition-all ${entryMode === 'PAST' ? 'bg-[var(--lg-border)] text-[var(--t-primary)] shadow-sm' : 'text-[var(--t-secondary)]'}`} onClick={() => setEntryMode('PAST')}>Past Holding</button>
            <button type="button" className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-[12px] transition-all ${entryMode === 'NEW' ? 'bg-[var(--lg-border)] text-[var(--t-primary)] shadow-sm' : 'text-[var(--t-secondary)]'}`} onClick={() => setEntryMode('NEW')}>One-Time Today</button>
            <button type="button" className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-[12px] transition-all ${entryMode === 'SIP' ? 'bg-[var(--lg-border)] text-[var(--t-primary)] shadow-sm' : 'text-[var(--t-secondary)]'}`} onClick={() => setEntryMode('SIP')}>Monthly SIP</button>
          </div>

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

          {entryMode === 'PAST' ? (
            <div className="flex gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">{type === 'STOCK' ? 'Current Total Shares' : 'Current Total Units'}</label>
                <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" className="lg-input" required />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">{type === 'STOCK' ? 'Average Buy Price' : 'Average NAV'}</label>
                <input type="number" step="any" value={averageBuyPrice} onChange={e => setAverageBuyPrice(e.target.value)} placeholder="₹0.00" className="lg-input" required />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">Invested Amount</label>
              <input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹0.00" className="lg-input" required />
              <span className="text-xs text-[var(--c-orange)] mt-1">This will be marked as "Pending". The app will auto-fetch the units in 1-3 days when the order settles.</span>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">Monthly Amount</label>
                <input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹0.00" className="lg-input" required />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold text-[var(--t-secondary)] uppercase tracking-wider">SIP Date</label>
                <input type="number" min="1" max="31" value={sipDate} onChange={e => setSipDate(e.target.value)} placeholder="1-31" className="lg-input" required />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary mt-4" style={{ height: '56px', fontSize: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--c-blue), var(--c-purple))' }}>
            {entryMode === 'PAST' ? `Save ${type === 'STOCK' ? 'Stock' : 'Mutual Fund'}` : entryMode === 'NEW' ? 'Place Order' : 'Start SIP Auto-Tracker'}
          </button>
        </form>

      </div>
    </div>
  );
}
