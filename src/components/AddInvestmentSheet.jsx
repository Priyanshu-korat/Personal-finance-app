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
    <div className="sheet-overlay anim-fade-in" onClick={onClose}>
      <div className="sheet-modal lg lg-r-xl anim-morph-up" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        
        <div className="sheet-header">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <h3 className="headline">Add Investment</h3>
          <button 
            type="button"
            className="btn btn-ghost fw-bold" 
            style={{ color: (!symbol || !name) ? 'var(--t-tertiary)' : 'var(--c-blue-lt)' }}
            onClick={handleSubmit}
            disabled={!symbol || !name}
          >
            Save
          </button>
        </div>

        <div className="sheet-content">
          {/* Top Segmented Controls */}
          <div className="px-4 mb-4 flex flex-col gap-3">
            <div className="flex bg-[var(--glass-surface)] rounded-2xl p-1 shadow-sm border border-[var(--glass-border)]">
              <button type="button" className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${entryMode === 'PAST' ? 'bg-[var(--glass-accent)] text-[var(--t-primary)] shadow-sm' : 'text-[var(--t-secondary)]'}`} onClick={() => setEntryMode('PAST')}>Past Holding</button>
              <button type="button" className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${entryMode === 'NEW' ? 'bg-[var(--glass-accent)] text-[var(--t-primary)] shadow-sm' : 'text-[var(--t-secondary)]'}`} onClick={() => setEntryMode('NEW')}>One-Time Today</button>
              <button type="button" className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${entryMode === 'SIP' ? 'bg-[var(--glass-accent)] text-[var(--t-primary)] shadow-sm' : 'text-[var(--t-secondary)]'}`} onClick={() => setEntryMode('SIP')}>Monthly SIP</button>
            </div>

            <div className="flex bg-[var(--glass-surface)] rounded-2xl p-1 shadow-sm border border-[var(--glass-border)]">
              <button type="button" className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'STOCK' ? 'bg-[var(--c-blue)] text-white shadow-md' : 'text-[var(--t-secondary)]'}`} onClick={() => setType('STOCK')}>Stock</button>
              <button type="button" className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${type === 'MF' ? 'bg-[var(--c-green)] text-white shadow-md' : 'text-[var(--t-secondary)]'}`} onClick={() => setType('MF')}>Mutual Fund</button>
            </div>
          </div>

          <ul className="inset-grouped-list mb-6">
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Symbol</span>
                <input 
                  type="text" 
                  className="sheet-input" 
                  placeholder={type === 'STOCK' ? "e.g. RELIANCE.NS" : "e.g. 0P00005WLZ.BO"}
                  dir="rtl"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </div>
            </li>
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Name</span>
                <input 
                  type="text" 
                  className="sheet-input" 
                  placeholder={type === 'STOCK' ? "Reliance Industries" : "Parag Parikh Flexi"}
                  dir="rtl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </li>

            {entryMode === 'PAST' ? (
              <>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">{type === 'STOCK' ? 'Total Shares' : 'Total Units'}</span>
                    <input 
                      type="number" step="any"
                      className="sheet-input" 
                      placeholder="0.00" 
                      dir="rtl"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">{type === 'STOCK' ? 'Average Buy Price' : 'Average NAV'}</span>
                    <input 
                      type="number" step="any"
                      className="sheet-input" 
                      placeholder="₹0.00" 
                      dir="rtl"
                      value={averageBuyPrice}
                      onChange={(e) => setAverageBuyPrice(e.target.value)}
                    />
                  </div>
                </li>
              </>
            ) : entryMode === 'NEW' ? (
              <>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Invested Amount</span>
                    <input 
                      type="number" step="any"
                      className="sheet-input" 
                      placeholder="₹0.00" 
                      dir="rtl"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </li>
              </>
            ) : (
              <>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Monthly Amount</span>
                    <input 
                      type="number" step="any"
                      className="sheet-input" 
                      placeholder="₹0.00" 
                      dir="rtl"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">SIP Date</span>
                    <input 
                      type="number" min="1" max="31"
                      className="sheet-input" 
                      placeholder="e.g. 5" 
                      dir="rtl"
                      value={sipDate}
                      onChange={(e) => setSipDate(e.target.value)}
                    />
                  </div>
                </li>
              </>
            )}
          </ul>
          
          {entryMode === 'NEW' && (
            <p className="caption px-4 text-center text-[var(--c-orange)] opacity-80 mb-6">
              This order will be marked as "Pending". The app will auto-fetch your exact units in 1-3 days when the NAV settles.
            </p>
          )}

          {entryMode === 'SIP' && (
            <p className="caption px-4 text-center text-[var(--c-blue)] opacity-80 mb-6">
              The app will automatically remind you on this date every month and handle all pending NAVs!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
