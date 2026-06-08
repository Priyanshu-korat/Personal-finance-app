import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import LiquidSelect from './LiquidSelect';
import MiniCalendar from './MiniCalendar';
import AutocompleteInput from './AutocompleteInput';
import SplitExpenseSection from './SplitExpenseSection';
import STOCK_SUGGESTIONS from '../data/stocks.json';
import SIP_SUGGESTIONS from '../data/sips.json';

const INCOME_CATEGORIES = ['Salary', 'Freelancing', 'Stock Profit', 'Dividend', 'Interest', 'Reimbursement (Friend)', 'Reimbursement (Tatvix)', 'Other Income'];

export default function AddTransactionSheet({ isOpen, onClose, shellRef }) {
  const { state, dispatch } = useFinance();
  
  // Transaction Form State
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Expense');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [account, setAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [classification, setClassification] = useState('Need');
  const [splitData, setSplitData] = useState(null);
  const [isSubscription, setIsSubscription] = useState(false);

  // SIP Specific State
  const [sipFrequency, setSipFrequency] = useState('One-Time');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [sipDate, setSipDate] = useState('1');

  const segmentRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 2, width: 0 });

  // Update the sliding pill geometry whenever type changes
  useEffect(() => {
    if (!segmentRef.current) return;
    const activeBtn = segmentRef.current.querySelector('.segment.active');
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth
      });
    }
  }, [type, isOpen]);

  // Cascading Logic - Clear children when parent changes
  useEffect(() => {
    setCategory('');
    setSubCategory('');
  }, [type]);

  // Auto-select first sub-category when main category is picked
  useEffect(() => {
    if (!category || !state.profile.useSubCategories) {
      setSubCategory('');
      return;
    }
    const catObj = (state.categories || []).find(c => c.name === category);
    const subs = catObj?.subCategories || [];
    if (subs.length > 0) {
      // First sub-cat is the default ('Others') — auto-select it
      const first = typeof subs[0] === 'string' ? subs[0] : subs[0].name;
      setSubCategory(first);
    } else {
      setSubCategory('');
    }
  }, [category]);

  const availableCategories = useMemo(() => {
    if (type === 'Expense') {
      // SetupWizard categories have no `type` field — treat untyped as Expense
      const allCats = state.categories || [];
      const expenseCats = allCats.filter(c => !c.type || c.type === 'Expense');
      if (expenseCats.length === 0) return [{ id: 'cat-other', name: 'Other', icon: '📌', type: 'Expense' }];
      return expenseCats;
    }
    if (type === 'Income') return INCOME_CATEGORIES.map(c => ({ name: c, icon: '💵' }));
    if (type === 'Investment') return [{ name: 'SIP', icon: '🔄' }, { name: 'Stock / ETF', icon: '📈' }];
    return [];
  }, [type, state.categories]);

  // Normalize sub-categories: wizard saves them as strings, FinanceContext as objects
  const normalizeSubCat = (sub) => {
    if (typeof sub === 'string') return { name: sub, value: sub };
    return { name: sub.name, value: sub.name };
  };

  const availableSubCategories = useMemo(() => {
    if (type !== 'Expense' || !category || !state.profile.useSubCategories) return [];
    const catObj = availableCategories.find(c => c.name === category);
    return (catObj?.subCategories || []).map(normalizeSubCat);
  }, [type, category, availableCategories, state.profile.useSubCategories]);

  // Extract unique existing investments for the autocomplete feature
  const investmentSuggestions = useMemo(() => {
    if (type !== 'Investment' || !category) return [];
    
    // 1. Get existing user investments for this category
    const investments = state.transactions
      .filter(tx => tx.type === 'Investment' && tx.category === category && tx.subCategory)
      .map(tx => tx.subCategory);
    const uniqueExisting = [...new Set(investments)];

    // 2. If user is actively typing, switch to the large JSON datasets
    if (subCategory && subCategory.trim().length > 0) {
      if (category === 'Stock / ETF') return STOCK_SUGGESTIONS;
      if (category === 'SIP') return SIP_SUGGESTIONS;
    }

    // 3. Default: Show current investments. If none exist yet, show the JSON list so the dropdown isn't empty!
    if (uniqueExisting.length > 0) {
      return uniqueExisting;
    } else {
      if (category === 'Stock / ETF') return STOCK_SUGGESTIONS;
      if (category === 'SIP') return SIP_SUGGESTIONS;
    }
    return [];
  }, [type, category, state.transactions, subCategory]);

  const availableAccounts = useMemo(() => {
    return (state.accounts || []).filter(a => a.type !== 'Investment' && a.type !== 'SIP' && a.type !== 'Stock');
  }, [state.accounts]);

  const isMonthlySip = type === 'Investment' && category === 'SIP' && sipFrequency === 'Monthly';
  
  const isSaveDisabled = useMemo(() => {
    if (type === 'Transfer') {
      return !amount || !account || !toAccount;
    }
    const isCategoryValid = category && (category !== 'SIP' || (category === 'SIP' && subCategory));
    
    // Split Validation
    if (type === 'Expense' && splitData?.isEnabled) {
      if (splitData.involved.length === 0) return true;
      const amt = Number(amount) || 0;
      if (splitData.splitType === 'manual') {
        const sum = splitData.involved.reduce((acc, id) => acc + (Number(splitData.manualAmounts?.[id]) || 0), 0);
        if (Math.abs(sum - amt) >= 0.01) return true;
      }
      if (splitData.splitType === 'percentage') {
        const sum = splitData.involved.reduce((acc, id) => acc + (Number(splitData.percentages?.[id]) || 0), 0);
        if (Math.abs(sum - 100) >= 0.01) return true;
      }
    }

    const isPaidByMe = type !== 'Expense' || !splitData?.isEnabled || splitData?.paidBy === 'me';
    return !amount || !isCategoryValid || (isPaidByMe && !account);
  }, [type, amount, category, subCategory, account, toAccount, splitData]);

  const handleSave = () => {
    if (isSaveDisabled) return;

    // 1. Dispatch immediate transaction if amount is > 0
    if (amount && parseFloat(amount) > 0) {
      const tx = {
        id: `tx-${Date.now()}`,
        date: new Date().toISOString(),
        amount: parseFloat(amount),
        title: title || (type === 'Transfer' ? 'Transfer' : category),
        type,
        category: type === 'Transfer' ? 'Transfer' : category,
        subCategory: subCategory || null,
        accountId: (type === 'Expense' && splitData?.isEnabled && splitData?.paidBy !== 'me') ? null : account,
        toAccountId: type === 'Transfer' ? toAccount : null,
        classification: type === 'Expense' ? classification : null,
        isSubscription: type === 'Expense' ? isSubscription : false,
      };
      dispatch({ type: 'ADD_TRANSACTION', payload: tx });

        // If transferring to a Card, reduce its spent balance automatically
      if (type === 'Transfer') {
        const destAccount = state.accounts.find(a => a.id === toAccount);
        if (destAccount && destAccount.type === 'Card') {
          const currentSpent = parseFloat(destAccount.spent) || 0;
          const newSpent = Math.max(0, currentSpent - parseFloat(amount));
          dispatch({
            type: 'UPDATE_ACCOUNT',
            payload: { id: toAccount, updates: { spent: newSpent } }
          });
        }
      }

      // 1.5 Handle Splits
      if (type === 'Expense' && splitData?.isEnabled && splitData.involved.length > 0) {
        // Find which contacts are registered users vs local dummy contacts
        const involvedProfiles = [];
        const involvedContacts = [];
        
        splitData.involved.forEach(id => {
          if (id === 'me') {
            involvedProfiles.push(state.profile?.id);
          } else {
            const contact = state.contacts.find(c => c.id === id);
            if (contact?.registeredUserId) {
              involvedProfiles.push(contact.registeredUserId);
            } else if (contact) {
              involvedContacts.push(contact);
            }
          }
        });

        let paidById = splitData.paidBy === 'me' ? state.profile?.id : null;
        let paidByName = null;
        if (splitData.paidBy !== 'me') {
          const payerContact = state.contacts.find(c => c.id === splitData.paidBy);
          if (payerContact?.registeredUserId) {
            paidById = payerContact.registeredUserId;
          } else {
            paidByName = payerContact?.name || 'Friend';
          }
        }

        // Calculate debts explicitly to save in split_data so we don't have to recalculate everywhere
        const debts = [];
        const creditorId = splitData.paidBy === 'me' ? 'me' : splitData.paidBy;

        splitData.involved.forEach(participantId => {
          const debtorId = participantId;
          if (debtorId === creditorId) return;

          let oweAmount = 0;
          if (splitData.splitType === 'equal') {
            oweAmount = parseFloat(amount) / splitData.involved.length;
          } else if (splitData.splitType === 'manual') {
            oweAmount = Number(splitData.manualAmounts?.[participantId]) || 0;
          } else if (splitData.splitType === 'percentage') {
            const pct = Number(splitData.percentages?.[participantId]) || 0;
            oweAmount = parseFloat(amount) * (pct / 100);
          }

          if (oweAmount > 0) {
            debts.push({ debtorId, creditorId, amount: oweAmount, status: 'pending' });
          }
        });

        const sharedSplit = {
          id: `split-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: tx.date,
          amount: parseFloat(amount),
          title: tx.title,
          category: tx.category,
          subCategory: tx.subCategory,
          splitType: splitData.splitType,
          paidBy: paidById,
          paidByName,
          involvedProfiles,
          involvedContacts,
          splitData: {
            ...splitData,
            debts
          }
        };

        dispatch({ type: 'ADD_SHARED_SPLIT', payload: sharedSplit });
      }
    }

    // 2. Dispatch recurring subscription if Monthly SIP
    if (isMonthlySip && monthlyAmount && parseFloat(monthlyAmount) > 0) {
      const sub = {
        id: `sub-${Date.now()}`,
        name: subCategory || title || 'SIP Investment',
        amount: parseFloat(monthlyAmount),
        date: parseInt(sipDate, 10),
        frequency: 'Monthly',
        category: 'Investment',
        accountId: account,
      };
      dispatch({ type: 'ADD_SUBSCRIPTION', payload: sub });
    }
    
    // Reset and close
    setAmount('');
    setTitle('');
    setType('Expense');
    setCategory('');
    setSubCategory('');
    setAccount('');
    setToAccount('');
    setClassification('Need');
    setSipFrequency('One-Time');
    setMonthlyAmount('');
    setSipDate('1');
    setSplitData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="sheet-overlay anim-fade-in" onClick={onClose}>
      <div 
        className="sheet-modal lg lg-r-xl anim-morph-up" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        
        <div className="sheet-header">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <h3 className="headline">New Entry</h3>
          <button 
            className="btn btn-ghost fw-bold" 
            style={{ color: isSaveDisabled ? 'var(--t-tertiary)' : 'var(--c-indigo-lt)' }}
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            Add
          </button>
        </div>

        <div className="sheet-content">
          <ul className="inset-grouped-list mb-6" style={{ position: 'relative', zIndex: 10 }}>
            <li style={{ padding: 'var(--s2) var(--s4)' }}>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Type</span>
                
                {/* Fluid Segmented Control */}
                <div className="segmented-control" ref={segmentRef}>
                  <div 
                    className="segment-highlight" 
                    style={{ left: `${pillStyle.left}px`, width: `${pillStyle.width}px` }} 
                  />
                  {['Expense', 'Income', 'Investment', 'Transfer'].map(t => (
                    <button
                      key={t}
                      className={`segment ${type === t ? 'active' : ''}`}
                      onClick={() => setType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

              </div>
            </li>
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">
                  {isMonthlySip ? 'First Time Amount' : 'Amount'}
                </span>
                <input 
                  type="number" 
                  className="sheet-input" 
                  placeholder="₹0" 
                  dir="rtl"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
                  placeholder="e.g. Starbucks" 
                  dir="rtl"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </li>
            {type !== 'Transfer' && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">Category</span>
                  <LiquidSelect 
                    value={category}
                    onChange={(v) => setCategory(v)}
                    placeholder="Select"
                    options={availableCategories.map(c => ({
                      label: c.name,
                      value: c.name,
                      icon: c.icon
                    }))}
                  />
                </div>
              </li>
            )}
            
            {state.profile.useSubCategories && type === 'Expense' && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className={`subhead ${!category ? 't-tertiary' : 't-primary'}`}>Sub-category</span>
                  {!category ? (
                    <span className="t-tertiary sheet-input" style={{ textAlign: 'right' }}>Select Category First</span>
                  ) : (
                    <LiquidSelect 
                      value={subCategory}
                      onChange={(v) => setSubCategory(v)}
                      placeholder="Select Sub-Category"
                      options={availableSubCategories.map(sub => ({
                        label: sub.name,
                        value: sub.value,
                        icon: sub.name === 'Others' ? '📌' : undefined
                      }))}
                    />
                  )}
                </div>
              </li>
            )}

            {/* Investment Specific Field: Which stock/etf/sip? */}
            {type === 'Investment' && category && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">Investment</span>
                  <div style={{ flex: 1, marginLeft: '16px' }}>
                    <AutocompleteInput 
                      value={subCategory}
                      onChange={(v) => setSubCategory(v)}
                      placeholder={`Add or search ${category}...`}
                      suggestions={investmentSuggestions}
                      className="sheet-input"
                      dir="rtl"
                      style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
                    />
                  </div>
                </div>
              </li>
            )}

            {/* SIP Frequency Selector */}
            {type === 'Investment' && category === 'SIP' && (
              <li style={{ padding: 'var(--s2) var(--s4)' }}>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">Frequency</span>
                  <div className="segmented-control" style={{ width: '180px' }}>
                    <div 
                      className="segment-highlight" 
                      style={{ 
                        left: sipFrequency === 'One-Time' ? '2px' : '90px', 
                        width: '88px' 
                      }} 
                    />
                    {['One-Time', 'Monthly'].map(t => (
                      <button
                        key={t}
                        className={`segment ${sipFrequency === t ? 'active' : ''}`}
                        onClick={() => setSipFrequency(t)}
                        style={{ width: '50%', fontSize: '13px' }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            )}

            {/* Monthly SIP Fields */}
            {isMonthlySip && (
              <>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">Monthly Amount</span>
                    <input 
                      type="number" 
                      className="sheet-input" 
                      placeholder="₹0" 
                      dir="rtl"
                      value={monthlyAmount}
                      onChange={(e) => setMonthlyAmount(e.target.value)}
                    />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between w-full">
                    <span className="subhead t-primary">SIP Date</span>
                    <MiniCalendar 
                      value={sipDate}
                      onChange={(v) => setSipDate(v.toString())}
                      placeholder="Select Date"
                    />
                  </div>
                </li>
              </>
            )}
          </ul>

          {type === 'Expense' && (
            <SplitExpenseSection 
              totalAmount={amount}
              contacts={state.contacts || []}
              value={splitData}
              onChange={setSplitData}
              onAddContact={(name, phone) => {
                const newContact = {
                  id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  name,
                  phone,
                  createdAt: new Date().toISOString()
                };
                dispatch({ type: 'ADD_CONTACT', payload: newContact });
                // Automatically add them to the involved list
                setSplitData(prev => prev ? { ...prev, involved: [...prev.involved, newContact.id] } : null);
              }}
            />
          )}

          <ul className="inset-grouped-list mb-6">
            {!(type === 'Expense' && splitData?.isEnabled && splitData?.paidBy !== 'me') && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">{type === 'Transfer' ? 'From Account' : 'Account'}</span>
                  <LiquidSelect 
                    value={account}
                    onChange={(v) => setAccount(v)}
                    placeholder="Select"
                    options={(state.accounts || []).map(a => ({
                      label: a.name,
                      value: a.id,
                      icon: a.type === 'Bank' ? '🏦' : a.type === 'Card' ? '💳' : a.type === 'Cash' ? '💰' : '📦'
                    }))}
                  />
                </div>
              </li>
            )}
            
            {(type === 'Expense' && splitData?.isEnabled && splitData?.paidBy !== 'me') && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">Account</span>
                  <span className="t-secondary text-sm fw-medium">
                    Paid by Friend
                  </span>
                </div>
              </li>
            )}

            {type === 'Transfer' && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">To Account</span>
                  <LiquidSelect 
                    value={toAccount}
                    onChange={(v) => setToAccount(v)}
                    placeholder="Select"
                    options={(state.accounts || []).filter(a => a.id !== account).map(a => ({
                      label: a.name,
                      value: a.id,
                      icon: a.type === 'Bank' ? '🏦' : a.type === 'Card' ? '💳' : a.type === 'Cash' ? '💰' : '📦'
                    }))}
                  />
                </div>
              </li>
            )}

            {type === 'Expense' && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">Classification</span>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ background: classification === 'Need' ? 'var(--c-indigo-lt)' : 'transparent', color: classification === 'Need' ? '#fff' : 'var(--t-secondary)', border: classification === 'Need' ? 'none' : '1px solid var(--lg-border)' }}
                      onClick={() => setClassification('Need')}
                    >
                      Need
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ background: classification === 'Want' ? 'var(--c-purple)' : 'transparent', color: classification === 'Want' ? '#fff' : 'var(--t-secondary)', border: classification === 'Want' ? 'none' : '1px solid var(--lg-border)' }}
                      onClick={() => setClassification('Want')}
                    >
                      Want
                    </button>
                  </div>
                </div>
              </li>
            )}
            
            {type === 'Expense' && (
              <li>
                <div className="flex items-center justify-between w-full">
                  <span className="subhead t-primary">Monthly Subscription</span>
                  <input 
                    type="checkbox" 
                    className="toggle-checkbox"
                    checked={isSubscription}
                    onChange={(e) => setIsSubscription(e.target.checked)}
                    style={{ width: '24px', height: '24px', accentColor: 'var(--c-indigo)' }}
                  />
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
