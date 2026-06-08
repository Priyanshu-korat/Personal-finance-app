import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import AutocompleteInput from './AutocompleteInput';
import STOCK_SUGGESTIONS from '../data/stocks.json';
import SIP_SUGGESTIONS from '../data/sips.json';

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

  const modeRef = useRef(null);
  const typeRef = useRef(null);
  const [modePill, setModePill] = useState({ left: 2, width: 0 });
  const [typePill, setTypePill] = useState({ left: 2, width: 0 });

  useEffect(() => {
    if (!modeRef.current) return;
    const activeBtn = modeRef.current.querySelector('.segment.active');
    if (activeBtn) {
      setModePill({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
    }
  }, [entryMode, isOpen]);

  useEffect(() => {
    if (!typeRef.current) return;
    const activeBtn = typeRef.current.querySelector('.segment.active');
    if (activeBtn) {
      setTypePill({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
    }
  }, [type, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    const finalSymbol = symbol || name;

    if (entryMode === 'PAST') {
      if (!quantity || !averageBuyPrice) return;
      dispatch({
        type: 'ADD_INVESTMENT',
        payload: {
          id: `inv-${Date.now()}`,
          type,
          symbol: finalSymbol.toUpperCase().trim(),
          name: name.trim(),
          quantity: Number(quantity),
          averageBuyPrice: Number(averageBuyPrice),
          currentPrice: Number(averageBuyPrice),
          lastUpdated: new Date().toISOString()
        }
      });
    } else if (entryMode === 'NEW') {
      if (type === 'STOCK') {
        if (!quantity || !averageBuyPrice) return;
        dispatch({
          type: 'ADD_INVESTMENT',
          payload: {
            id: `inv-${Date.now()}`,
            type,
            symbol: finalSymbol.toUpperCase().trim(),
            name: name.trim(),
            quantity: Number(quantity),
            averageBuyPrice: Number(averageBuyPrice),
            currentPrice: Number(averageBuyPrice),
            lastUpdated: new Date().toISOString()
          }
        });
      } else {
        if (!amount) return;
        dispatch({
          type: 'ADD_INVESTMENT_ORDER',
          payload: {
            id: `ord-${Date.now()}`,
            investmentId: null,
            type,
            symbol: finalSymbol.toUpperCase().trim(),
            name: name.trim(),
            amount: Number(amount),
            orderDate: new Date().toISOString(),
            status: 'PENDING'
          }
        });
      }
    } else if (entryMode === 'SIP') {
      if (!amount || !sipDate) return;
      dispatch({
        type: 'ADD_SUBSCRIPTION',
        payload: {
          id: `sub-${Date.now()}`,
          name: `${name} (${type === 'STOCK' ? 'Stock SIP' : type === 'MF' ? 'MF SIP' : 'Bond SIP'})`,
          amount: parseFloat(amount),
          category: 'Investment',
          date: parseInt(sipDate, 10),
          frequency: 'Monthly',
          isSip: true,
          sipType: type,
          sipSymbol: finalSymbol.toUpperCase().trim(),
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

  return createPortal(
    <div className="sheet-overlay anim-fade-in" onClick={onClose}>
      <div className="sheet-modal lg lg-r-xl anim-morph-up" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        
        <div className="sheet-header">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <h3 className="headline">Add Investment</h3>
          <button 
            type="button"
            className="btn btn-ghost fw-bold" 
            style={{ color: !name ? 'var(--t-tertiary)' : 'var(--c-blue-lt)' }}
            onClick={handleSubmit}
            disabled={!name}
          >
            Save
          </button>
        </div>

        <div className="sheet-content">
          {/* Top Segmented Controls */}
          <div className="px-4 mb-4 flex flex-col gap-3">
            <div className="segmented-control" ref={modeRef}>
              <div className="segment-highlight" style={{ left: `${modePill.left}px`, width: `${modePill.width}px` }} />
              <button type="button" className={`segment ${entryMode === 'PAST' ? 'active' : ''}`} onClick={() => setEntryMode('PAST')}>Past Holding</button>
              <button type="button" className={`segment ${entryMode === 'NEW' ? 'active' : ''}`} onClick={() => setEntryMode('NEW')}>One-Time Today</button>
              <button type="button" className={`segment ${entryMode === 'SIP' ? 'active' : ''}`} onClick={() => setEntryMode('SIP')}>Monthly SIP</button>
            </div>

            <div className="segmented-control" ref={typeRef}>
              <div className="segment-highlight" style={{ left: `${typePill.left}px`, width: `${typePill.width}px` }} />
              <button type="button" className={`segment ${type === 'STOCK' ? 'active' : ''}`} onClick={() => setType('STOCK')}>Stock / ETF</button>
              <button type="button" className={`segment ${type === 'MF' ? 'active' : ''}`} onClick={() => setType('MF')}>Mutual Fund</button>
            </div>
          </div>

          <ul className="inset-grouped-list mb-6">
            <li>
              <div className="flex flex-col w-full py-2">
                <span className="subhead t-primary mb-2">Search {type === 'STOCK' ? 'Stock / ETF' : 'Mutual Fund'}</span>
                <AutocompleteInput 
                  className="sheet-input w-full p-0 m-0" 
                  style={{ textAlign: 'left' }}
                  placeholder={type === 'STOCK' ? "e.g. Reliance, NIFTYBEES" : "e.g. Parag Parikh Flexi"}
                  value={name}
                  onChange={setName}
                  onSelect={(suggestion) => {
                    const isObj = typeof suggestion === 'object';
                    if (isObj) {
                      setName(suggestion.name);
                      setSymbol(suggestion.symbol || suggestion.name);
                    } else {
                      setName(suggestion);
                      setSymbol(suggestion);
                    }
                  }}
                  suggestions={type === 'STOCK' ? STOCK_SUGGESTIONS : SIP_SUGGESTIONS}
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
                {(type === 'STOCK') ? (
                  <>
                    <li>
                      <div className="flex items-center justify-between w-full">
                        <span className="subhead t-primary">Quantity</span>
                        <input 
                          type="number" step="any"
                          className="sheet-input" 
                          placeholder="0" 
                          dir="rtl"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                        />
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center justify-between w-full">
                        <span className="subhead t-primary">Buy Price</span>
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
                ) : (
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
                )}
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
          
          {entryMode === 'NEW' && type === 'MF' && (
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
    </div>,
    document.body
  );
}
