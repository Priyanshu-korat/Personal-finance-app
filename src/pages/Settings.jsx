import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import MiniCalendar from '../components/MiniCalendar';
import LiquidSelect from '../components/LiquidSelect';
import LiquidCombobox from '../components/LiquidCombobox';
import { supabase } from '../lib/supabase';

// ── Fallback lists (always available, even if Supabase is offline/RLS blocked) ──
const FALLBACK_BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank',
  'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Bank of India',
  'Union Bank of India', 'Canara Bank', 'IndusInd Bank', 'Yes Bank',
  'IDFC FIRST Bank', 'Federal Bank', 'South Indian Bank', 'RBL Bank',
  'Bandhan Bank', 'IDBI Bank', 'UCO Bank', 'Central Bank of India',
  'Indian Bank', 'Indian Overseas Bank', 'Punjab & Sind Bank', 'Bank of Maharashtra',
  'AU Small Finance Bank', 'Equitas Small Finance Bank', 'Ujjivan Small Finance Bank',
  'Jana Small Finance Bank', 'ESAF Small Finance Bank', 'Suryoday Small Finance Bank',
];
const FALLBACK_CARDS = [
  'HDFC Bank Credit Card', 'SBI Card', 'ICICI Bank Credit Card',
  'Axis Bank Credit Card', 'Kotak Credit Card', 'RBL Bank Credit Card',
  'IndusInd Bank Credit Card', 'IDFC FIRST Credit Card',
  'American Express', 'Standard Chartered Credit Card',
  'Citi Credit Card', 'AU Small Finance Bank Credit Card',
  'Amazon Pay ICICI Card', 'Flipkart Axis Bank Card',
];

export default function Settings({ toggleTheme, onBack }) {
  const { state, dispatch } = useFinance();
  const [view, setView] = useState('main');
  const [selectedItem, setSelectedItem] = useState(null);
  const [metadataOptions, setMetadataOptions] = useState({
    indian_banks: FALLBACK_BANKS,
    credit_cards: FALLBACK_CARDS,
  });
  
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const { data, error } = await supabase.from('finance_metadata').select('*');
        if (data && !error && data.length > 0) {
          const meta = {};
          data.forEach(row => { meta[row.id] = row.data; });
          // Merge with fallbacks so we always have something
          setMetadataOptions(prev => ({ ...prev, ...meta }));
        }
      } catch(e) {
        console.error('Failed to fetch metadata, using fallback lists', e);
      }
    }
    fetchMetadata();
  }, []);

  // Temporary Form States
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('Bank');
  const [accBalance, setAccBalance] = useState('');
  const [accLimit, setAccLimit] = useState('');
  const [accBillingDate, setAccBillingDate] = useState('');
  
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📌');
  const [catType, setCatType] = useState('Expense');
  const [catLimit, setCatLimit] = useState('');

  // Security & Data States
  const [showPinInput, setShowPinInput] = useState(false);
  const [newPin, setNewPin] = useState('');
  const hasPin = !!localStorage.getItem('pf-pin');

  // Deletion Prompt States
  const [isDeleting, setIsDeleting] = useState(false);
  const [fallbackId, setFallbackId] = useState('');
  const [isErasingData, setIsErasingData] = useState(false);

  // --- Handlers ---
  const resetForm = () => {
    setAccName(''); setAccType('Bank'); setAccBalance(''); setAccLimit(''); setAccBillingDate('');
    setCatName(''); setCatIcon('📌'); setCatType('Expense'); setCatLimit('');
    setIsDeleting(false); setFallbackId(''); setIsErasingData(false);
  };

  const handlePickContact = async () => {
    try {
      const props = ['name'];
      const opts = { multiple: false };
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts.length > 0 && contacts[0].name.length > 0) {
          setAccName(contacts[0].name[0]);
        }
      } else {
        alert('Contacts access is not supported on this device/browser.');
      }
    } catch (err) {
      console.log('User cancelled or error picking contact:', err);
    }
  };

  const handleSaveAccount = () => {
    if (!accName || !accBalance) return;
    if (view === 'add_account' || view === 'add_contact') {
      dispatch({
        type: 'ADD_ACCOUNT',
        payload: {
          id: `acc-${Date.now()}`,
          name: accName,
          type: accType,
          balance: parseFloat(accBalance),
          spent: accType === 'Card' ? parseFloat(accBalance) : 0, 
          limitAmount: accType === 'Card' ? parseFloat(accLimit) || 0 : 0,
          billingDate: accType === 'Card' ? parseInt(accBillingDate, 10) || 1 : null
        }
      });
    } else if (view === 'edit_account' && selectedItem) {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        payload: {
          id: selectedItem.id,
          updates: {
            name: accName,
            balance: parseFloat(accBalance),
            limitAmount: accType === 'Card' ? parseFloat(accLimit) || 0 : undefined,
            billingDate: accType === 'Card' ? parseInt(accBillingDate, 10) || 1 : null
          }
        }
      });
    }
    setView('main');
  };

  const handleDeleteAccount = () => {
    if (fallbackId && selectedItem.balance > 0) {
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          id: `tx-${Date.now()}`,
          date: new Date().toISOString(),
          amount: parseFloat(selectedItem.balance),
          title: `Transfer from ${selectedItem.name}`,
          type: 'Transfer',
          category: 'Transfer',
          accountId: selectedItem.id,
          toAccountId: fallbackId,
        }
      });
    }
    dispatch({ type: 'REMOVE_ACCOUNT', payload: { id: selectedItem.id } });
    setView('main');
    resetForm();
  };

  const handleSaveCategory = () => {
    if (!catName) return;
    if (view === 'add_category') {
      dispatch({
        type: 'ADD_CATEGORY',
        payload: {
          name: catName,
          icon: catIcon,
          type: catType,
          monthlyLimit: catLimit ? parseFloat(catLimit) : null,
          subCategories: []
        }
      });
    } else if (view === 'edit_category' && selectedItem) {
      const updatedCategory = {
        ...selectedItem,
        icon: catIcon,
        monthlyLimit: catLimit ? parseFloat(catLimit) : null
      };
      dispatch({
        type: 'UPDATE_CATEGORY',
        payload: {
          name: selectedItem.name,
          updates: {
            icon: catIcon,
            monthlyLimit: catLimit ? parseFloat(catLimit) : null
          },
          fullCategory: updatedCategory
        }
      });
    }
    setView('main');
  };

  const handleDeleteCategory = () => {
    dispatch({
      type: 'REMOVE_CATEGORY',
      payload: {
        name: selectedItem.name,
        fallbackName: fallbackId || null 
      }
    });
    setView('main');
    resetForm();
  };

  const handleSetPin = () => {
    if (newPin.length === 4) {
      localStorage.setItem('pf-pin', newPin);
      setShowPinInput(false);
      setNewPin('');
    } else {
      alert("PIN must be exactly 4 digits");
    }
  };

  const handleRemovePin = () => {
    localStorage.removeItem('pf-pin');
    setShowPinInput(false);
    setNewPin('');
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Views ---
  const renderMain = () => (
    <div className="anim-fade-up d-1">
      <div className="section flex items-center justify-between" style={{ paddingBottom: '16px' }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="title-large" style={{ fontSize: '24px' }}>Settings</h2>
        <div style={{ width: '60px' }} /> {/* Spacer */}
      </div>
      
      <div className="section pt-0" style={{ paddingBottom: 100 }}>
        
        {/* General */}
        <p className="section-label mb-2">General</p>
        <ul className="inset-grouped-list mb-6">
          <li onClick={toggleTheme}>
            <span className="subhead t-primary">Toggle Theme</span>
            <span className="t-tertiary">◑</span>
          </li>
          
          <li onClick={async () => {
            onBack(); // Reset navigation to dashboard
            await supabase.auth.signOut();
            dispatch({ type: 'RESET_APP' }); // Clear local state memory
          }}>
            <span className="subhead" style={{ color: 'var(--c-red)' }}>Log Out</span>
            <span className="t-tertiary">👋</span>
          </li>
          
          {!isErasingData ? (
            <li onClick={() => setIsErasingData(true)}>
              <span className="subhead" style={{ color: 'var(--c-red)' }}>Erase All Data</span>
            </li>
          ) : (
            <div className="lg lg-p-lg" style={{ background: 'rgba(255, 69, 58, 0.15)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p className="fw-bold" style={{ color: 'var(--c-red)' }}>Are you sure?</p>
              <p className="caption t-tertiary">This will permanently delete all your accounts, categories, and transactions. This action cannot be undone.</p>
              <div className="flex gap-2 mt-2">
                <button className="btn lg lg-p-sm flex-1" onClick={() => setIsErasingData(false)}>Cancel</button>
                <button className="btn lg lg-p-sm flex-1 fw-bold" style={{ background: 'var(--c-red)' }} onClick={() => dispatch({ type: 'RESET_APP' })}>Yes, Erase</button>
              </div>
            </div>
          )}
        </ul>

        {/* Security & Data */}
        <p className="section-label mb-2">Security & Data</p>
        <ul className="inset-grouped-list mb-6">
          {!showPinInput ? (
            <li onClick={() => setShowPinInput(true)}>
              <span className="subhead t-primary">{hasPin ? 'Change or Remove PIN' : 'Set App PIN'}</span>
              <span className="t-tertiary">🔒</span>
            </li>
          ) : (
            <div className="lg lg-p-lg" style={{ background: 'var(--bg-layer-2)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p className="fw-bold">{hasPin ? 'Enter new PIN or Remove' : 'Enter 4-digit PIN'}</p>
              <input 
                type="number" 
                className="sheet-input" 
                placeholder="****" 
                value={newPin} 
                onChange={e => setNewPin(e.target.value.slice(0, 4))} 
                maxLength={4}
              />
              <div className="flex gap-2 mt-2">
                <button className="btn lg lg-p-sm flex-1" onClick={() => { setShowPinInput(false); setNewPin(''); }}>Cancel</button>
                {hasPin && <button className="btn lg lg-p-sm flex-1" style={{ color: 'var(--c-red)' }} onClick={handleRemovePin}>Remove</button>}
                <button className="btn lg lg-p-sm flex-1 fw-bold t-indigo-lt" onClick={handleSetPin}>Save</button>
              </div>
            </div>
          )}
          
          <li onClick={handleExportData}>
            <span className="subhead t-primary">Export Data Backup</span>
            <span className="t-tertiary">⬇️</span>
          </li>
        </ul>

        {/* Accounts */}
        <p className="section-label mb-2">My Accounts & Wallets</p>
        <ul className="inset-grouped-list mb-6">
          {(state.accounts || []).filter(a => a.type !== 'Contact').map(acc => (
            <li key={acc.id} onClick={() => {
              setSelectedItem(acc);
              setAccName(acc.name);
              setAccType(acc.type);
              setAccBalance(acc.type === 'Card' ? acc.spent : acc.balance);
              setAccLimit(acc.limitAmount || '');
              setAccBillingDate(acc.billingDate || '');
              setIsDeleting(false);
              setView('edit_account');
            }}>
              <div className="flex items-center gap-3">
                <span>{acc.type === 'Card' ? '💳' : acc.type === 'Bank' ? '🏦' : '💰'}</span>
                <span className="subhead t-primary">{acc.name}</span>
              </div>
              <span className="t-tertiary">Edit ➔</span>
            </li>
          ))}
          <li onClick={() => { resetForm(); setView('add_account'); }}>
            <span className="subhead t-indigo-lt">Add Account...</span>
          </li>
        </ul>

        {/* Contacts */}
        <p className="section-label mb-2">Friends & Contacts</p>
        <ul className="inset-grouped-list mb-6">
          {(state.accounts || []).filter(a => a.type === 'Contact').map(acc => (
            <li key={acc.id} onClick={() => {
              setSelectedItem(acc);
              setAccName(acc.name);
              setAccType(acc.type);
              setAccBalance(acc.balance);
              setIsDeleting(false);
              setView('edit_account');
            }}>
              <div className="flex items-center gap-3">
                <span>👤</span>
                <span className="subhead t-primary">{acc.name}</span>
              </div>
              <span className="t-tertiary">Edit ➔</span>
            </li>
          ))}
          <li onClick={() => { resetForm(); setAccType('Contact'); setView('add_contact'); }}>
            <span className="subhead t-indigo-lt">Add Friend...</span>
          </li>
        </ul>

        {/* Categories */}
        <p className="section-label mb-2">Categories</p>
        <ul className="inset-grouped-list mb-6">
          {(state.categories || []).map(cat => (
            <li key={cat.name} onClick={() => {
              setSelectedItem(cat);
              setCatName(cat.name);
              setCatIcon(cat.icon || '📌');
              setCatType(cat.type || 'Expense');
              setCatLimit(cat.monthlyLimit || '');
              setIsDeleting(false);
              setView('edit_category');
            }}>
              <div className="flex items-center gap-3">
                <span>{cat.icon || '📌'}</span>
                <span className="subhead t-primary">{cat.name}</span>
              </div>
              <span className="t-tertiary">Edit ➔</span>
            </li>
          ))}
          <li onClick={() => { resetForm(); setView('add_category'); }}>
            <span className="subhead t-indigo-lt">Add Category...</span>
          </li>
        </ul>

      </div>
    </div>
  );

  const renderAccountForm = () => (
    <div className="anim-fade-up d-1">
      <div className="section flex items-center justify-between" style={{ paddingBottom: '16px' }}>
        <button className="btn btn-ghost" onClick={() => setView('main')}>← Back</button>
        <h2 className="title-large" style={{ fontSize: '24px' }}>
          {view === 'add_contact' || (view === 'edit_account' && accType === 'Contact') 
            ? (view === 'edit_account' ? 'Edit Friend' : 'Add Friend') 
            : (view === 'edit_account' ? 'Edit Account' : 'Add Account')}
        </h2>
        <button className="btn btn-ghost fw-bold t-indigo-lt" onClick={handleSaveAccount}>Save</button>
      </div>

      <div className="section pt-0" style={{ paddingBottom: 100 }}>
        <ul className="inset-grouped-list mb-6">
          {view === 'add_account' && (
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Type</span>
                <LiquidSelect 
                  value={accType} 
                  onChange={v => {
                    setAccType(v);
                    setAccName(''); // Clear name on type change
                  }} 
                  options={
                    view === 'add_contact' || accType === 'Contact' 
                    ? [{ label: 'Friend / Contact', value: 'Contact' }] 
                    : [
                      { label: 'Bank', value: 'Bank' },
                      ...(state.accounts.some(a => a.type === 'Cash') ? [] : [{ label: 'Cash', value: 'Cash' }]),
                      { label: 'Credit Card', value: 'Card' },
                      ...(state.accounts.some(a => a.type === 'UPI') ? [] : [{ label: 'UPI Lite', value: 'UPI' }])
                    ]
                  }
                />
              </div>
            </li>
          )}
          <li>
            <div className="flex items-center justify-between w-full">
              <span className="subhead t-primary">{accType === 'Contact' ? "Friend's Name" : "Name"}</span>
              {((view === 'add_account' || view === 'add_contact') && accType === 'Bank') ? (
                <div style={{ width: '60%' }}>
                  <LiquidCombobox value={accName} onChange={setAccName} options={metadataOptions.indian_banks || []} placeholder="Search Bank..." />
                </div>
              ) : ((view === 'add_account' || view === 'add_contact') && accType === 'Card') ? (
                <div style={{ width: '60%' }}>
                  <LiquidCombobox value={accName} onChange={setAccName} options={metadataOptions.credit_cards || []} placeholder="Search Card..." />
                </div>
              ) : ((view === 'add_account' || view === 'add_contact') && accType === 'Stock') ? (
                <div style={{ width: '60%' }}>
                  <LiquidCombobox value={accName} onChange={setAccName} options={metadataOptions.stocks_india || []} placeholder="Search Stock/ETF..." />
                </div>
              ) : ((view === 'add_account' || view === 'add_contact') && accType === 'SIP') ? (
                <div style={{ width: '60%' }}>
                  <LiquidCombobox value={accName} onChange={setAccName} options={metadataOptions.sips_india || []} placeholder="Search Fund..." />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', width: '60%' }}>
                  <input type="text" className="sheet-input" style={{ flex: 1, width: '100%' }} value={accName} onChange={e => setAccName(e.target.value)} placeholder={accType === 'Contact' ? "e.g. Rahul" : "e.g. HDFC Bank"} disabled={view === 'edit_account'} />
                  {((view === 'add_account' || view === 'add_contact') && accType === 'Contact' && 'contacts' in navigator && 'ContactsManager' in window) && (
                    <button className="btn btn-ghost" style={{ padding: '0 12px' }} onClick={handlePickContact} title="Pick from Contacts">
                      👤
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
          <li>
            <div className="flex items-center justify-between w-full">
              <span className="subhead t-primary">
                {accType === 'Card' ? 'Current Spent' : accType === 'Contact' ? 'Balance (+ they owe you, - you owe)' : 'Current Balance'}
              </span>
              <input type="number" className="sheet-input" value={accBalance} onChange={e => setAccBalance(e.target.value)} placeholder="₹0" />
            </div>
          </li>
          {accType === 'Card' && (
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Total Limit</span>
                <input type="number" className="sheet-input" value={accLimit} onChange={e => setAccLimit(e.target.value)} placeholder="₹0" />
              </div>
            </li>
          )}
          {accType === 'Card' && (
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Billing Date</span>
                <MiniCalendar 
                  placeholder="1st of month"
                  value={accBillingDate}
                  onChange={(v) => setAccBillingDate(String(v))}
                />
              </div>
            </li>
          )}
        </ul>

        {view === 'edit_account' && !isDeleting && (
          <button className="btn btn-primary w-full lg lg-p-md fw-bold" style={{ background: 'var(--c-red-glow)', color: 'var(--c-red)' }} onClick={() => setIsDeleting(true)}>
            Delete Account
          </button>
        )}

        {isDeleting && (
          <div className="lg lg-p-lg lg-r-xl" style={{ border: '1px solid var(--c-red)', background: 'rgba(255, 69, 58, 0.05)' }}>
            <p className="fw-bold mb-2">Delete {accName}?</p>
            <p className="caption t-tertiary mb-4">Transfer the remaining balance to another account?</p>
            
            <div className="mb-4 w-full">
              <LiquidSelect 
                value={fallbackId}
                onChange={v => setFallbackId(v)}
                options={[
                  { label: 'No Transfer (Lose Balance)', value: '' },
                  ...state.accounts.filter(a => a.id !== selectedItem.id).map(a => ({ label: a.name, value: a.id }))
                ]}
              />
            </div>

            <div className="flex gap-2">
              <button className="btn lg lg-p-sm flex-1" onClick={() => setIsDeleting(false)}>Cancel</button>
              <button className="btn lg lg-p-sm flex-1 fw-bold" style={{ background: 'var(--c-red)' }} onClick={handleDeleteAccount}>Confirm Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCategoryForm = () => (
    <div className="anim-fade-up d-1">
      <div className="section flex items-center justify-between" style={{ paddingBottom: '16px' }}>
        <button className="btn btn-ghost" onClick={() => setView('main')}>← Back</button>
        <h2 className="title-large" style={{ fontSize: '24px' }}>{view === 'add_category' ? 'Add Category' : 'Edit Category'}</h2>
        <button className="btn btn-ghost fw-bold t-indigo-lt" onClick={handleSaveCategory}>Save</button>
      </div>

      <div className="section pt-0" style={{ paddingBottom: 100 }}>
        <ul className="inset-grouped-list mb-6">
          <li>
            <div className="flex items-center justify-between w-full">
              <span className="subhead t-primary">Name</span>
              <input type="text" className="sheet-input" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Groceries" />
            </div>
          </li>
          <li>
            <div className="flex items-center justify-between w-full">
              <span className="subhead t-primary">Icon (Emoji)</span>
              <input type="text" className="sheet-input" value={catIcon} onChange={e => setCatIcon(e.target.value)} placeholder="🛒" />
            </div>
          </li>
          {view === 'add_category' && (
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Type</span>
                <LiquidSelect 
                  value={catType} 
                  onChange={v => setCatType(v)} 
                  options={[
                    { label: 'Expense', value: 'Expense' },
                    { label: 'Income', value: 'Income' }
                  ]}
                />
              </div>
            </li>
          )}
          {catType === 'Expense' && (
            <li>
              <div className="flex items-center justify-between w-full">
                <span className="subhead t-primary">Monthly Limit (Optional)</span>
                <input type="number" className="sheet-input" value={catLimit} onChange={e => setCatLimit(e.target.value)} placeholder="₹0 (No Limit)" />
              </div>
            </li>
          )}
        </ul>

        {view === 'edit_category' && !isDeleting && (
          <button className="btn btn-primary w-full lg lg-p-md fw-bold" style={{ background: 'var(--c-red-glow)', color: 'var(--c-red)' }} onClick={() => setIsDeleting(true)}>
            Delete Category
          </button>
        )}

        {isDeleting && (
          <div className="lg lg-p-lg lg-r-xl" style={{ border: '1px solid var(--c-red)', background: 'rgba(255, 69, 58, 0.05)' }}>
            <p className="fw-bold mb-2">Delete {catName}?</p>
            <p className="caption t-tertiary mb-4">Reassign existing transactions to another category?</p>
            
            <div className="mb-4 w-full">
              <LiquidSelect 
                value={fallbackId}
                onChange={v => setFallbackId(v)}
                options={[
                  { label: 'No Reassignment (Keep Old Name)', value: '' },
                  ...state.categories.filter(c => c.name !== selectedItem.name && c.type === catType).map(c => ({ label: c.name, value: c.name }))
                ]}
              />
            </div>

            <div className="flex gap-2">
              <button className="btn lg lg-p-sm flex-1" onClick={() => setIsDeleting(false)}>Cancel</button>
              <button className="btn lg lg-p-sm flex-1 fw-bold" style={{ background: 'var(--c-red)' }} onClick={handleDeleteCategory}>Confirm Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {view === 'main' && renderMain()}
      {(view === 'add_account' || view === 'add_contact' || view === 'edit_account') && renderAccountForm()}
      {(view === 'add_category' || view === 'edit_category') && renderCategoryForm()}
    </>
  );
}
