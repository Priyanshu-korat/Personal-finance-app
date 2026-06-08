import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import LiquidToggle from './LiquidToggle';
import LiquidSelect from './LiquidSelect';
import MiniCalendar from './MiniCalendar';
import AutocompleteInput from './AutocompleteInput';
import STOCK_SUGGESTIONS from '../data/stocks.json';
import SIP_SUGGESTIONS from '../data/sips.json';

const DEFAULT_ICONS = ['💰', '🍔', '🚗', '🏠', '🛍️', '🎓', '🏥', '✈️', '🎮', '📱', '💡', '🐶', '🎁', '☕', '👶', '🛒', '🍸', '🎬', '👗', '🎟️'];

export default function SetupWizard() {
  const { dispatch } = useFinance();
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Setup State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState(null); // Default to null for staggered reveal
  const [useSubCategories, setUseSubCategories] = useState(false);
  const [accounts, setAccounts] = useState([]);
  
  // Account Form State
  const [accFormType, setAccFormType] = useState(null); // 'Bank' | 'Card' | 'Stock' | 'SIP' | null
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardSpent, setNewCardSpent] = useState('');
  const [newCardBillingDate, setNewCardBillingDate] = useState('1');
  const [isActiveSIP, setIsActiveSIP] = useState(false);
  const [sipAmount, setSipAmount] = useState('');
  const [sipQuantity, setSipQuantity] = useState('');
  const [sipDate, setSipDate] = useState('');

  // Category Form State
  const [categories, setCategories] = useState([
    { id: 'cat-1', name: 'Food', icon: '🍔', subCategories: ['Others', 'Swiggy', 'Groceries'] },
    { id: 'cat-2', name: 'Transport', icon: '🚗', subCategories: ['Others', 'Fuel', 'Uber'] },
    { id: 'cat-3', name: 'Home & Rent', icon: '🏠', subCategories: ['Others', 'Rent', 'Electricity'] },
    { id: 'cat-4', name: 'Personal', icon: '🛍️', subCategories: ['Others', 'Shopping'] },
    { id: 'cat-5', name: 'Others', icon: '📦', subCategories: ['Others'], isDefault: true },
  ]);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [newCatIcon, setNewCatIcon] = useState('💰');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubCats, setNewCatSubCats] = useState(['Others']); // First element is permanent

  const handleComplete = () => {
    if (!navigator.onLine) {
      setErrorMsg('No internet connection. Please connect to the internet to complete setup.');
      return;
    }
    setErrorMsg('');
    
    // Dispatch accounts if any
    accounts.forEach(acc => {
      dispatch({ type: 'ADD_ACCOUNT', payload: acc });
    });

    // Complete setup
    dispatch({
      type: 'COMPLETE_SETUP',
      payload: { name, phone, tier, useSubCategories, customCategories: categories }
    });
  };

  const handleAddAccount = () => {
    if (!newAccName) return;
    
    const accountPayload = {
      id: `acc-${Date.now()}`, 
      name: newAccName, 
      type: accFormType, 
      balance: parseFloat(newAccBalance) || 0 
    };

    if (accFormType === 'Card') {
      accountPayload.limit = parseFloat(newCardLimit) || 0;
      accountPayload.spent = parseFloat(newCardSpent) || 0;
      accountPayload.billingDate = parseInt(newCardBillingDate) || 1;
    } else if (accFormType === 'SIP' || accFormType === 'Stock' || accFormType === 'ETF') {
      accountPayload.isActiveSIP = isActiveSIP;
      if (isActiveSIP) {
        if (accFormType === 'SIP') {
          accountPayload.sipAmount = parseFloat(sipAmount) || 0;
        } else {
          accountPayload.sipQuantity = parseFloat(sipQuantity) || 0;
        }
        accountPayload.sipDate = parseInt(sipDate) || 1;
      }
    }

    setAccounts([...accounts, accountPayload]);
    
    // Reset form
    setAccFormType(null);
    setNewAccName('');
    setNewAccBalance('');
    setNewCardLimit('');
    setNewCardSpent('');
    setNewCardBillingDate('1');
  };

  const handleEditAccount = (acc) => {
    setAccounts(accounts.filter(a => a.id !== acc.id));
    setAccFormType(acc.type);
    setNewAccName(acc.name);
    setNewAccBalance(acc.balance);
    if (acc.type === 'Card') {
      setNewCardLimit(acc.limit || '');
      setNewCardSpent(acc.spent || '');
      setNewCardBillingDate(acc.billingDate ? acc.billingDate.toString() : '1');
    }
    if (acc.type === 'SIP' || acc.type === 'Stock' || acc.type === 'ETF') {
      setIsActiveSIP(acc.isActiveSIP || false);
      setSipAmount(acc.sipAmount || '');
      setSipQuantity(acc.sipQuantity || '');
      setSipDate(acc.sipDate || '');
    }
  };

  const handleDeleteAccount = (e, id) => {
    e.stopPropagation();
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const handleCancelForm = () => {
    setAccFormType(null);
    setNewAccName('');
    setNewAccBalance('');
    setNewCardLimit('');
    setNewCardSpent('');
    setNewCardBillingDate('1');
    setIsActiveSIP(false);
    setSipAmount('');
    setSipQuantity('');
    setSipDate('');
    setIsAddingCat(false);
    setEditingCatId(null);
    setNewCatIcon('💰');
    setShowIconPicker(false);
    setNewCatName('');
    setNewCatSubCats(['Others']);
  };

  const handleEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setIsAddingCat(true);
    setNewCatIcon(cat.icon);
    setNewCatName(cat.name);
    // Ensure there's always at least one sub-category
    const subs = cat.subCategories && cat.subCategories.length > 0 ? cat.subCategories : ['Others'];
    setNewCatSubCats([...subs]);
  };

  const handleDeleteCategory = (e, id) => {
    e.stopPropagation();
    setCategories(categories.filter(c => c.id !== id));
  };

  const handleSaveCategory = () => {
    if (!newCatName) return;
    
    if (editingCatId) {
      setCategories(categories.map(c => 
        c.id === editingCatId 
          ? { ...c, name: newCatName, icon: newCatIcon, subCategories: newCatSubCats.map(s => s.trim()).filter(s => s) } 
          : c
      ));
    } else {
      setCategories([...categories, {
        id: `cat-${Date.now()}`,
        name: newCatName,
        icon: newCatIcon || '💰',
        subCategories: newCatSubCats.map(s => s.trim()).filter(s => s)
      }]);
    }
    
    setIsAddingCat(false);
    setEditingCatId(null);
    setNewCatIcon('💰');
    setShowIconPicker(false);
    setNewCatName('');
    setNewCatSubCats(['Others']);
  };

  const categoryFormJSX = (
    <div className="flex flex-col gap-4 anim-fade-up">
      {!editingCatId && (
        <div className="flex justify-between items-center">
          <span className="caption t-tertiary fw-bold uppercase">Adding Category</span>
        </div>
      )}
      
      <div className="flex gap-3">
        <div className="relative">
          <button 
            className="form-control lg-r-md flex items-center justify-center cursor-pointer" 
            style={{ width: '64px', height: '56px', fontSize: '24px', background: 'rgba(0,0,0,0.2)', padding: 0 }}
            onClick={() => setShowIconPicker(!showIconPicker)}
          >
            {newCatIcon}
          </button>
          {showIconPicker && (
            <div 
              className="absolute top-full left-0 mt-2 p-3 lg-r-md anim-fade-in" 
              style={{ background: '#1a1a1a', border: '1px solid var(--lg-border)', zIndex: 100, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', width: '220px' }}
            >
              {DEFAULT_ICONS.map(icon => (
                <button 
                  key={icon}
                  className="btn btn-ghost flex items-center justify-center p-2 lg-r-sm"
                  style={{ fontSize: '18px', background: 'rgba(255,255,255,0.02)' }}
                  onClick={() => {
                    setNewCatIcon(icon);
                    setShowIconPicker(false);
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
        <input 
          type="text" 
          className="form-control lg-r-md px-5 w-full" 
          style={{ height: '56px', background: 'rgba(0,0,0,0.2)', fontSize: '18px', fontWeight: '600' }}
          placeholder="Category Name (e.g. Health)"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
        />
      </div>

      {useSubCategories && (
        <div className="flex flex-col gap-3 mt-4">
          <span className="caption t-tertiary fw-bold uppercase px-1">Sub-Categories</span>
          <div className="flex flex-col gap-2">
            {newCatSubCats.map((sub, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input 
                  type="text" 
                  className="form-control lg-r-md px-4 w-full" 
                  style={{ height: '46px', background: 'rgba(0,0,0,0.2)' }}
                  placeholder="Sub-Category Name"
                  value={sub}
                  onChange={(e) => {
                    const newSubs = [...newCatSubCats];
                    newSubs[idx] = e.target.value;
                    setNewCatSubCats(newSubs);
                  }}
                />
                {idx !== 0 && (
                  <button 
                    className="btn btn-ghost flex items-center justify-center p-0"
                    style={{ width: '46px', height: '46px', color: 'rgba(255,255,255,0.5)' }}
                    onClick={() => {
                      const newSubs = [...newCatSubCats];
                      newSubs.splice(idx, 1);
                      setNewCatSubCats(newSubs);
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button 
            className="btn btn-ghost lg-r-md py-3 w-full mt-1"
            style={{ background: 'rgba(255,255,255,0.03)' }}
            onClick={() => setNewCatSubCats([...newCatSubCats, ''])}
          >
            + Add Sub-Category
          </button>
        </div>
      )}
      
      <div className="flex gap-3 mt-3">
        <button className="btn btn-ghost w-full lg-r-md py-3" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={handleCancelForm}>Cancel</button>
        <button className="btn btn-primary w-full lg-r-md py-3" onClick={handleSaveCategory} disabled={!newCatName}>Save Category</button>
      </div>
    </div>
  );

  return (
    <div className="app-shell flex items-center justify-center" style={{ minHeight: '100dvh', padding: 'var(--s4)' }}>
      
      <div className="lg lg-p-xl lg-r-2xl w-full anim-morph-up" style={{ position: 'relative', overflow: 'hidden' }}>
        
        {/* Soft internal gradient for the card */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(180deg, var(--lg-specular-top) 0%, transparent 100%)', opacity: 0.5, pointerEvents: 'none' }} />

        {/* Premium iOS Back Button */}
        {step > 1 && (
          <button 
            className="btn btn-ghost lg-interactive" 
            style={{ 
              position: 'absolute', 
              top: '24px', 
              left: '20px', 
              zIndex: 10, 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--r-full)', 
              padding: 0,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              color: 'var(--c-indigo-lt)'
            }}
            onClick={() => {
              handleCancelForm();
              setStep(step - 1);
            }}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-1px)' }}>
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        {/* STEP 1: Welcome & Name */}
        {step === 1 && (
          <div className="anim-fade-in" style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex items-center justify-center mb-6">
              <div className="m-icon lg-tint-cyan" style={{ width: 64, height: 64, borderRadius: 'var(--r-xl)', fontSize: 32 }}>✨</div>
            </div>
            <h1 className="title-large text-center">Welcome</h1>
            <p className="t-secondary text-center mt-2 mb-10">Let's build your financial profile.</p>
            
            <div className="flex flex-col gap-6">
              <div>
                <label className="t-secondary mb-2 block ml-1 fw-bold" style={{ fontSize: '16px' }}>What should we call you?</label>
                <input 
                  type="text" 
                  className="form-control w-full" 
                  style={{ fontSize: '20px', padding: 'var(--s4)', background: 'rgba(255,255,255,0.03)' }}
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="t-secondary mb-2 block ml-1 fw-bold flex items-center justify-between" style={{ fontSize: '16px' }}>
                  Mobile Number
                  <span className="t-tertiary" style={{ fontSize: '13px', fontWeight: 'normal' }}>For sharing bills</span>
                </label>
                <input 
                  type="tel" 
                  className="form-control w-full" 
                  style={{ fontSize: '20px', padding: 'var(--s4)', background: 'rgba(255,255,255,0.03)' }}
                  placeholder="+91 99999 99999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            
            <button 
              className="btn btn-primary w-full lg-r-md py-4" 
              style={{ marginTop: '40px' }}
              onClick={() => setStep(2)}
              disabled={!name.trim()}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2: Tracking Tier & Options */}
        {step === 2 && (
          <div className="anim-fade-in" style={{ position: 'relative', zIndex: 1, paddingTop: '64px' }}>
            <h2 className="title-large" style={{ marginTop: '8px' }}>Tracking Style</h2>
            <p className="t-secondary mt-1 mb-6">Choose your tracking complexity.</p>
            
            <div className="flex flex-col gap-3">
              <div 
                className={`lg lg-interactive lg-p-md lg-r-md ${tier === 1 ? 'lg-tint-cyan' : ''}`}
                style={{ border: tier === 1 ? '1px solid var(--c-cyan)' : '1px solid transparent' }}
                onClick={() => setTier(1)}
              >
                <div className="flex items-center gap-3">
                  <span className="m-icon lg-tint-cyan" style={{ margin: 0 }}>📊</span>
                  <div>
                    <div className="headline">Expense Only</div>
                    <p className="caption t-tertiary mt-1">Minimal. No balances.</p>
                  </div>
                </div>
              </div>

              <div 
                className={`lg lg-interactive lg-p-md lg-r-md ${tier === 2 ? 'lg-tint-green' : ''}`}
                style={{ border: tier === 2 ? '1px solid var(--c-green)' : '1px solid transparent' }}
                onClick={() => setTier(2)}
              >
                <div className="flex items-center gap-3">
                  <span className="m-icon lg-tint-green" style={{ margin: 0 }}>🏦</span>
                  <div>
                    <div className="headline">Standard Budget</div>
                    <p className="caption t-tertiary mt-1">Track cash flow & banks.</p>
                  </div>
                </div>
              </div>

              <div 
                className={`lg lg-interactive lg-p-md lg-r-md ${tier === 3 ? 'lg-tint-purple' : ''}`}
                style={{ border: tier === 3 ? '1px solid var(--c-purple)' : '1px solid transparent' }}
                onClick={() => setTier(3)}
              >
                <div className="flex items-center gap-3">
                  <span className="m-icon lg-tint-purple" style={{ margin: 0 }}>💎</span>
                  <div>
                    <div className="headline">Full Portfolio</div>
                    <p className="caption t-tertiary mt-1">Stocks, SIPs & Net Worth.</p>
                  </div>
                </div>
              </div>
            </div>

            {tier !== null && (
              <div className="anim-fade-up">
                <button 
                  className="btn btn-primary mt-6 w-full lg-r-full"
                  style={{ padding: 'var(--s4)' }}
                  onClick={() => {
                    if (tier === 1) setStep(5);
                    else setStep(3);
                  }}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Accounts (Balances) */}
        {step === 3 && (
          <div className="anim-fade-in" style={{ position: 'relative', zIndex: 1, paddingTop: '64px' }}>
            <h2 className="title-large">Accounts</h2>
            <p className="t-secondary mt-1 mb-6">Add your starting bank balances.</p>
            
            <div className="flex flex-col gap-2 mb-6 max-h-[200px] overflow-y-auto" style={{ margin: '0 -var(--s4)', padding: '0 var(--s4)' }}>
              {accounts.filter(a => a.type !== 'Investment' && a.type !== 'Stock' && a.type !== 'SIP' && a.type !== 'ETF').map(acc => (
                <div 
                  key={acc.id} 
                  className={`lg lg-p-sm lg-r-md flex justify-between items-center ${accFormType ? 'opacity-50' : 'lg-interactive cursor-pointer'}`}
                  onClick={accFormType ? undefined : () => handleEditAccount(acc)}
                  title={accFormType ? "" : "Click to edit"}
                >
                  <div>
                    <div className="fw-bold ml-2">{acc.name} <span className="caption t-tertiary">({acc.type})</span></div>
                    {acc.type === 'Card' && <div className="caption t-tertiary ml-2">Spent: ₹{acc.spent} / Limit: ₹{acc.limit}</div>}
                  </div>
                  <div className="flex items-center gap-2 mr-1">
                    <span className="t-secondary mr-2 fw-bold">₹{acc.balance}</span>
                    <button 
                      className="btn btn-ghost flex items-center justify-center" 
                      style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--r-full)', color: '#ff5555' }}
                      onClick={(e) => handleDeleteAccount(e, acc.id)}
                      title="Delete"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="t-tertiary text-center py-4 caption">No accounts added yet.</div>
              )}
            </div>

            {!accFormType ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button className="btn btn-ghost w-full lg-r-md py-3" style={{ border: '1px solid var(--lg-border)' }} onClick={() => setAccFormType('Bank')}>+ Bank</button>
                  <button className="btn btn-ghost w-full lg-r-md py-3" style={{ border: '1px solid var(--lg-border)' }} onClick={() => setAccFormType('Card')}>+ Card</button>
                  <button className="btn btn-ghost w-full lg-r-md py-3" style={{ border: '1px solid var(--lg-border)' }} onClick={() => { setAccFormType('Cash'); setNewAccName('Cash Wallet'); }}>+ Cash</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 anim-fade-up">
                <div className="flex justify-between items-center mb-1">
                  <span className="caption t-tertiary fw-bold uppercase">Adding {accFormType}</span>
                  <span className="caption t-tertiary lg-interactive cursor-pointer" onClick={handleCancelForm}>Cancel</span>
                </div>
                
                <input 
                  type="text" 
                  className="form-control lg-r-md px-4 py-3" 
                  placeholder={accFormType === 'Bank' ? "Bank Name (e.g. HDFC)" : accFormType === 'Card' ? "Card Name (e.g. SBI Pulse)" : "Wallet Name (e.g. Physical Cash)"}
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                />
                
                {(accFormType === 'Bank' || accFormType === 'Cash') && (
                  <input 
                    type="number" 
                    className="form-control lg-r-md px-4 py-3" 
                    placeholder="Current Balance (₹)"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                  />
                )}

                {accFormType === 'Card' && (
                  <>
                    <input 
                      type="number" 
                      className="form-control lg-r-md px-4 py-3" 
                      placeholder="Total Credit Limit (₹)"
                      value={newCardLimit}
                      onChange={(e) => setNewCardLimit(e.target.value)}
                    />
                    <input 
                      type="number" 
                      className="form-control lg-r-md px-4 py-3" 
                      placeholder="Spent This Month (₹)"
                      value={newCardSpent}
                      onChange={(e) => {
                        setNewCardSpent(e.target.value);
                        setNewAccBalance(e.target.value); // Automatically sync the balance to the spent amount
                      }}
                    />
                    
                    <div className="form-control lg-r-md flex items-center justify-between mt-2" style={{ padding: '13px 16px' }}>
                      <span style={{ color: 'var(--t-tertiary)' }}>Billing Date</span>
                      <MiniCalendar 
                        placeholder="1st of month"
                        value={newCardBillingDate}
                        onChange={(v) => setNewCardBillingDate(String(v))}
                      />
                    </div>
                    
                    {newCardLimit && newCardSpent && (
                      <div className="lg lg-p-sm lg-r-sm mt-1 flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="caption t-secondary">Available Limit:</span>
                        <span className="caption fw-bold" style={{ color: 'var(--c-green)' }}>
                          ₹{Math.max(0, (parseFloat(newCardLimit) || 0) - (parseFloat(newCardSpent) || 0))}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <button 
                  className="btn btn-primary w-full lg-r-md py-3 mt-2" 
                  onClick={handleAddAccount}
                  disabled={!newAccName}
                >
                  Save {accFormType}
                </button>
              </div>
            )}

            <button 
              className="btn btn-primary mt-8 w-full lg-r-full py-3"
              onClick={() => {
                if (tier === 2) setStep(5);
                else setStep(4);
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 4: Investments (Stocks & SIPs) */}
        {step === 4 && (
          <div className="anim-fade-in" style={{ position: 'relative', zIndex: 1, paddingTop: '64px' }}>
            <h2 className="title-large">Investments</h2>
            <p className="t-secondary mt-1 mb-6">Add your Stock or Mutual Fund buckets.</p>
            
            <div className="flex flex-col gap-2 mb-6 max-h-[200px] overflow-y-auto" style={{ margin: '0 -var(--s4)', padding: '0 var(--s4)' }}>
              {accounts.filter(a => a.type === 'Stock' || a.type === 'SIP' || a.type === 'ETF').map(acc => (
                <div 
                  key={acc.id} 
                  className={`lg lg-p-sm lg-r-md flex justify-between items-center ${accFormType ? 'opacity-50' : 'lg-interactive cursor-pointer'}`}
                  onClick={accFormType ? undefined : () => handleEditAccount(acc)}
                  title={accFormType ? "" : "Click to edit"}
                >
                  <div>
                    <span className="fw-bold ml-2">{acc.name}</span>
                    <span className="caption t-tertiary ml-2">({acc.type})</span>
                    {acc.type === 'SIP' && acc.isActiveSIP && (
                      <div className="caption t-tertiary ml-2 mt-1">Active: ₹{acc.sipAmount}/mo on day {acc.sipDate}</div>
                    )}
                    {(acc.type === 'Stock' || acc.type === 'ETF') && acc.isActiveSIP && (
                      <div className="caption t-tertiary ml-2 mt-1">Active: {acc.sipQuantity} shares/mo on day {acc.sipDate}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mr-1">
                    <span className="t-secondary mr-2 fw-bold">₹{acc.balance}</span>
                    <button 
                      className="btn btn-ghost flex items-center justify-center" 
                      style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--r-full)', color: '#ff5555' }}
                      onClick={(e) => handleDeleteAccount(e, acc.id)}
                      title="Delete"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {accounts.filter(a => a.type === 'Stock' || a.type === 'SIP' || a.type === 'ETF').length === 0 && (
                <div className="t-tertiary text-center py-4 caption">No investments added yet.</div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {!accFormType || (accFormType !== 'Stock' && accFormType !== 'SIP' && accFormType !== 'ETF') ? (
                <div className="flex gap-2">
                  <button className="btn btn-ghost w-full lg-r-md py-3" style={{ border: '1px solid var(--lg-border)' }} onClick={() => setAccFormType('Stock')}>+ Stock</button>
                  <button className="btn btn-ghost w-full lg-r-md py-3" style={{ border: '1px solid var(--lg-border)' }} onClick={() => setAccFormType('SIP')}>+ SIP</button>
                  <button className="btn btn-ghost w-full lg-r-md py-3" style={{ border: '1px solid var(--lg-border)' }} onClick={() => setAccFormType('ETF')}>+ ETF</button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 anim-fade-up">
                  <div className="flex justify-between items-center mb-1">
                    <span className="caption t-tertiary fw-bold uppercase">Adding {accFormType}</span>
                    <span className="caption t-tertiary lg-interactive cursor-pointer" onClick={handleCancelForm}>Cancel</span>
                  </div>
                  
                  <AutocompleteInput 
                    className="form-control lg-r-md px-4 py-3 w-full"
                    placeholder={accFormType === 'Stock' ? "Search Stock (e.g. Reliance)" : accFormType === 'ETF' ? "Search ETF (e.g. NIFTYBEES)" : "Search Mutual Fund (e.g. Parag Parikh)"}
                    value={newAccName}
                    onChange={setNewAccName}
                    suggestions={accFormType === 'SIP' ? SIP_SUGGESTIONS : STOCK_SUGGESTIONS}
                  />

                  <input 
                    type="number" 
                    className="form-control lg-r-md px-4 py-3" 
                    placeholder="Current Value (₹)"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                  />

                  {(accFormType === 'SIP' || accFormType === 'Stock' || accFormType === 'ETF') && (
                    <div className="flex flex-col gap-3 mt-1">
                      <div className="flex items-center justify-between lg-p-sm lg-r-sm" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="t-secondary">Is this an ongoing active SIP?</span>
                        <input 
                          type="checkbox" 
                          checked={isActiveSIP} 
                          onChange={(e) => setIsActiveSIP(e.target.checked)}
                          style={{ width: '20px', height: '20px', accentColor: 'var(--c-purple)' }}
                        />
                      </div>
                      
                      {isActiveSIP && (
                        <div className="flex gap-2 anim-fade-up">
                          {accFormType === 'SIP' ? (
                            <input 
                              type="number" 
                              className="form-control lg-r-md px-4 py-3 w-full" 
                              placeholder="Monthly (₹)"
                              value={sipAmount}
                              onChange={(e) => setSipAmount(e.target.value)}
                            />
                          ) : (
                            <input 
                              type="number" 
                              className="form-control lg-r-md px-4 py-3 w-full" 
                              placeholder="Monthly Qty (Shares)"
                              value={sipQuantity}
                              onChange={(e) => setSipQuantity(e.target.value)}
                            />
                          )}
                          <input 
                            type="number" 
                            className="form-control lg-r-md px-4 py-3 w-full" 
                            placeholder="Date (1-31)"
                            min="1" max="31"
                            value={sipDate}
                            onChange={(e) => setSipDate(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <button className="btn btn-primary w-full lg-r-md py-3 mt-2" onClick={handleAddAccount} disabled={!newAccName}>Save {accFormType}</button>
                </div>
              )}
            </div>

            <button 
              className="btn btn-primary mt-8 w-full lg-r-full py-3"
              onClick={() => setStep(5)}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 5: Categories */}
        {step === 5 && (
          <div className="anim-fade-in" style={{ position: 'relative', zIndex: 1, paddingTop: '64px' }}>
            <h2 className="title-large">Categories</h2>
            <p className="t-secondary mt-1 mb-6">Your default spending buckets.</p>
            
            <div className="flex flex-col gap-2 mb-6 max-h-[200px] overflow-y-auto" style={{ margin: '0 -var(--s4)', padding: '0 var(--s4)' }}>
              {categories.map((cat, idx) => (
                <div 
                  key={cat.id}
                  className={`lg lg-r-md transition-all ${isAddingCat && editingCatId !== cat.id ? 'opacity-50' : ''}`}
                  style={isAddingCat && editingCatId === cat.id ? { border: '1px solid var(--c-indigo)' } : {}}
                >
                  {!(isAddingCat && editingCatId === cat.id) && (
                    <div 
                      className={`lg-p-sm flex justify-between items-center ${!isAddingCat ? 'lg-interactive cursor-pointer' : ''}`}
                      onClick={isAddingCat ? undefined : () => handleEditCategory(cat)}
                      title={isAddingCat ? "" : "Click to edit"}
                    >
                      <div className="flex items-center gap-3">
                        <span className="m-icon" style={{ margin: 0, width: 32, height: 32, fontSize: '18px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {cat.icon}
                        </span>
                        <div className="flex flex-col">
                          <span className="fw-bold">{cat.name}</span>
                          {useSubCategories && cat.subCategories && cat.subCategories.length > 0 && (
                            <span className="caption t-tertiary mt-1" style={{ fontSize: '11px' }}>{cat.subCategories.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mr-1">
                        {!cat.isDefault && (
                          <button 
                            className="btn btn-ghost flex items-center justify-center" 
                            style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--r-full)', color: '#ff5555' }}
                            onClick={(e) => handleDeleteCategory(e, cat.id)}
                            title="Delete"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {isAddingCat && editingCatId === cat.id && (
                    <div style={{ padding: '24px 20px' }}>
                      {/* The form will be injected here */}
                      {categoryFormJSX}
                    </div>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <div className="t-tertiary text-center py-4 caption">No categories added.</div>
              )}
            </div>

            {!isAddingCat ? (
              <button className="btn btn-ghost w-full lg-r-md py-3 mb-6" style={{ border: '1px solid var(--lg-border)' }} onClick={() => setIsAddingCat(true)}>+ Add Custom Category</button>
            ) : (
              !editingCatId && (
                <div className="mb-6">
                  {categoryFormJSX}
                </div>
              )
            )}

            <div className="flex justify-end mb-2 mt-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="caption fw-bold">Sub-Categories</div>
                  <div className="t-tertiary" style={{ fontSize: '11px' }}>Food -&gt; Swiggy</div>
                </div>
                <div style={{ transform: 'scale(0.8)', transformOrigin: 'right center' }}>
                  <LiquidToggle checked={useSubCategories} onChange={setUseSubCategories} />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 mb-3 lg-r-md caption" style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--c-red)', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button 
              className="btn btn-primary mt-4 w-full lg-r-full py-3"
              onClick={() => {
                if (!navigator.onLine) {
                  setErrorMsg("No internet connection. Please check your network and try again.");
                  return;
                }
                handleComplete();
              }}
            >
              Finish & Enter App
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
