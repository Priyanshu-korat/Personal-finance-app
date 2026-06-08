import { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import EditSplitModal from '../components/EditSplitModal';

export default function Friends() {
  const { state, dispatch } = useFinance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [activeTab, setActiveTab] = useState('friends');

  // New Contact State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Settlement & Edit State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleContactId, setSettleContactId] = useState(null);
  const [settleAccountId, setSettleAccountId] = useState('');
  const [editingSplit, setEditingSplit] = useState(null);

  // 1. Calculate Balances per contact
  const balances = useMemo(() => {
    const calc = {};
    const myId = state.profile?.id;

    (state.contacts || []).forEach(c => {
      calc[c.id] = { ...c, iOwe: 0, theyOweMe: 0, splits: [] };
    });

    (state.sharedSplits || []).forEach(split => {
      const debts = split.splitData?.debts || [];
      debts.forEach(debt => {
        if (debt.status !== 'pending') return;

        const amount = Number(debt.amount) || 0;
        
        // If I paid, and they owe me
        if (debt.creditorId === 'me' && calc[debt.debtorId]) {
          calc[debt.debtorId].theyOweMe += amount;
          calc[debt.debtorId].splits.push({ ...split, debtAmount: amount, iPaid: true });
        }
        // If they paid, and I owe them
        else if (debt.debtorId === 'me' && calc[debt.creditorId]) {
          calc[debt.creditorId].iOwe += amount;
          calc[debt.creditorId].splits.push({ ...split, debtAmount: amount, iPaid: false });
        }
      });
    });

    return calc;
  }, [state.contacts, state.sharedSplits]);

  const totalIOwe = Object.values(balances).reduce((sum, c) => sum + c.iOwe, 0);
  const totalOwedToMe = Object.values(balances).reduce((sum, c) => sum + c.theyOweMe, 0);

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newContact = {
      id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      phone: newPhone,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_CONTACT', payload: newContact });
    setNewName('');
    setNewPhone('');
    setIsAddOpen(false);
  };

  const handleSettleClick = (contactId) => {
    const contact = balances[contactId];
    if (!contact) return;
    const netBalance = contact.theyOweMe - contact.iOwe;
    if (netBalance === 0) return;
    
    setSettleContactId(contactId);
    setSettleAccountId(state.accounts?.[0]?.id || '');
    setIsSettleModalOpen(true);
  };

  const confirmSettleUp = () => {
    if (!settleContactId || !settleAccountId) return;
    const contact = balances[settleContactId];
    if (!contact) return;

    const netBalance = contact.theyOweMe - contact.iOwe;
    if (netBalance === 0) return;

    const amount = Math.abs(netBalance);
    const type = netBalance > 0 ? 'receive' : 'pay';

    const transaction = {
      id: `tx-settle-${Date.now()}`,
      amount: amount,
      type: type === 'receive' ? 'Income' : 'Expense',
      category: 'Transfer', 
      accountId: settleAccountId,
      date: new Date().toISOString(),
      title: `Settled with ${contact.name}`,
    };

    const request = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      receiver_phone: contact.phone,
      amount: amount,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    dispatch({
      type: 'INITIATE_SETTLEMENT',
      payload: { request, transaction }
    });

    setIsSettleModalOpen(false);
    setSettleContactId(null);
    setSettleAccountId('');
    setSelectedContactId(null); // Close the contact detail view too
  };

  const selectedContact = selectedContactId ? balances[selectedContactId] : null;

  return (
    <div className="view-wrap anim-fade-in" style={{ paddingBottom: '120px' }}>
      
      {/* Top Mask to prevent scroll leak behind the transparent App logo */}
      <div 
        style={{
          position: 'sticky',
          top: 0, 
          height: '60px',
          marginBottom: '-60px',
          background: 'var(--bg-base)', 
          zIndex: 40, 
          pointerEvents: 'none'
        }}
      />

      <header style={{
        position: 'sticky',
        top: '60px',
        zIndex: 45,
        background: 'var(--bg-base)',
        padding: '16px 16px 0 16px'
      }}>
        <h1 className="title-large mb-4">Friends & Splits</h1>
        
        {/* Elegant Filter Chips */}
        <div className="flex hide-scrollbar" style={{ gap: '12px', overflowX: 'auto', paddingBottom: '16px' }}>
          {[
            { id: 'friends', label: 'Friends & Balances' },
            { id: 'entries', label: 'Shared Entries' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="transition-all duration-300"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '8px 18px',
                  borderRadius: '100px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--t-primary)' : 'var(--t-tertiary)',
                  background: isActive ? 'var(--lg-fill)' : 'transparent',
                  border: isActive ? '1px solid var(--lg-border)' : '1px solid transparent',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Subtle Bottom Separator Line */}
        <div style={{ height: '1px', background: 'var(--lg-border)', width: '100%' }} />
      </header>

      <div style={{ padding: '16px' }}>
        {activeTab === 'friends' ? (
          <>
          {/* Top Dashboards */}
          <div className="grid grid-2 gap-3 mb-8 mt-6">
            <div className="lg-card lg-p-md flex flex-col justify-center">
              <p className="caption t-secondary mb-1">You owe</p>
              <h2 className="title-medium" style={{ color: 'var(--c-red)' }}>₹{totalIOwe.toFixed(2)}</h2>
            </div>
            <div className="lg-card lg-p-md flex flex-col justify-center">
              <p className="caption t-secondary mb-1">You are owed</p>
              <h2 className="title-medium" style={{ color: 'var(--c-teal)' }}>₹{totalOwedToMe.toFixed(2)}</h2>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="fw-bold" style={{ fontSize: '18px' }}>Your Contacts</h2>
            <button 
              className="btn btn-ghost t-primary" 
              style={{ fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '12px' }}
              onClick={() => setIsAddOpen(true)}
            >
              + Add
            </button>
          </div>

          {/* Contact List */}
          <div className="flex flex-col gap-3">
            {(state.contacts || []).length === 0 ? (
              <div className="text-center p-6 t-secondary" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r-md)' }}>
                No contacts yet. Add someone to start splitting bills!
              </div>
            ) : (
              Object.values(balances).map(contact => {
                const netBalance = contact.theyOweMe - contact.iOwe;
                let statusText = 'Settled up';
                let statusColor = 'var(--c-secondary)';

                if (netBalance > 0) {
                  statusText = `Owes you ₹${netBalance.toFixed(2)}`;
                  statusColor = 'var(--c-teal)';
                } else if (netBalance < 0) {
                  statusText = `You owe ₹${Math.abs(netBalance).toFixed(2)}`;
                  statusColor = 'var(--c-red)';
                }

                return (
                  <div 
                    key={contact.id} 
                    className="lg-card lg-p-md flex items-center justify-between cursor-pointer lg-interactive"
                    onClick={() => setSelectedContactId(contact.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="m-icon lg-tint-primary" style={{ width: 40, height: 40, borderRadius: '50%', fontSize: '18px' }}>
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="fw-bold">{contact.name}</p>
                        <p className="caption t-secondary">{contact.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="fw-bold" style={{ color: statusColor, fontSize: '14px' }}>{statusText}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 mt-6">
          {(state.sharedSplits || []).length === 0 ? (
            <div className="text-center p-6 t-secondary" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r-md)' }}>
              No shared splits yet.
            </div>
          ) : (
            (state.sharedSplits || []).map(split => (
              <div key={split.id} className="lg-card lg-p-md cursor-pointer lg-interactive" onClick={() => setEditingSplit(split)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="fw-bold">{split.title || split.category}</h3>
                    <p className="caption t-secondary">{new Date(split.date).toLocaleDateString()}</p>
                  </div>
                  <h3 className="fw-bold">₹{Number(split.amount).toFixed(2)}</h3>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-lg">
                  <div className="caption t-secondary flex-1">
                    Paid by <span className="fw-bold text-white">{split.paidBy === 'me' ? 'You' : (split.paidByName || 'Friend')}</span>
                  </div>
                  <div className="caption t-secondary">
                    {split.involvedContacts?.length || 0} friends involved
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddOpen && (
        <div className="modal-overlay anim-fade-in flex items-center justify-center" style={{ zIndex: 100 }}>
          <div className="lg-card p-6 w-full max-w-sm mx-4 relative" style={{ background: 'var(--bg-card)' }}>
            <button 
              className="absolute top-4 right-4 t-secondary"
              onClick={() => setIsAddOpen(false)}
            >✕</button>
            <h2 className="title-medium mb-6">Add Contact</h2>
            <form onSubmit={handleAddContact} className="flex flex-col gap-4">
              <div>
                <label className="caption t-secondary block mb-1">Name</label>
                <input 
                  type="text" 
                  className="form-control w-full" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="e.g. John Doe" 
                  required 
                  autoFocus
                />
              </div>
              <div>
                <label className="caption t-secondary block mb-1">Mobile Number</label>
                <input 
                  type="tel" 
                  className="form-control w-full" 
                  value={newPhone} 
                  onChange={e => setNewPhone(e.target.value)} 
                  placeholder="+91 99999 99999" 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2 lg-r-md py-3">Add Contact</button>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up / Contact Detail Modal */}
      {selectedContactId && selectedContact && (
        <div className="modal-overlay anim-fade-in flex items-center justify-center" style={{ zIndex: 100 }}>
          <div className="lg-card p-6 w-full max-w-sm mx-4 relative flex flex-col max-h-[80vh]" style={{ background: 'var(--bg-card)' }}>
            <button 
              className="absolute top-4 right-4 t-secondary"
              onClick={() => setSelectedContactId(null)}
            >✕</button>
            <div className="flex flex-col items-center mb-6 mt-2">
              <div className="m-icon lg-tint-primary mb-3" style={{ width: 64, height: 64, borderRadius: '50%', fontSize: '24px' }}>
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="title-medium">{selectedContact.name}</h2>
              <p className="caption t-secondary">{selectedContact.phone}</p>
            </div>

            <div className="flex-1 overflow-y-auto mb-6" style={{ minHeight: '100px' }}>
              <h3 className="caption t-secondary uppercase fw-bold mb-3" style={{ letterSpacing: '1px' }}>Unsettled Splits</h3>
              {selectedContact.splits.length === 0 ? (
                <p className="t-secondary text-center italic mt-4">You are all settled up!</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedContact.splits.map(split => {
                    return (
                      <div key={split.id} className="flex items-center justify-between p-3 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div>
                          <p className="fw-bold" style={{ fontSize: '14px' }}>{split.title || split.category}</p>
                          <p className="caption t-secondary">{split.iPaid ? 'You paid' : `${selectedContact.name} paid`}</p>
                        </div>
                        <p className="fw-bold" style={{ color: split.iPaid ? 'var(--c-teal)' : 'var(--c-red)' }}>
                          {split.iPaid ? '+' : '-'}₹{Number(split.debtAmount).toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {selectedContact.splits.length > 0 && (
              <button 
                className="btn btn-primary w-full lg-r-md py-4 fw-bold" 
                onClick={() => handleSettleClick(selectedContact.id)}
              >
                Settle Up Balances
              </button>
            )}
          </div>
        </div>
      )}

      {/* SETTLEMENT HANDSHAKE MODAL */}
      {isSettleModalOpen && settleContactId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center anim-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '16px' }}>
          <div className="lg-card lg-p-xl w-full max-w-md anim-slide-up" style={{ borderRadius: '24px' }}>
            <h2 className="title-medium mb-2">Select Account</h2>
            <p className="t-secondary mb-6" style={{ fontSize: '15px' }}>
              {balances[settleContactId].theyOweMe - balances[settleContactId].iOwe > 0 
                ? `Which account did you receive ₹${Math.abs(balances[settleContactId].theyOweMe - balances[settleContactId].iOwe).toFixed(2)} in?`
                : `Which account did you use to pay ₹${Math.abs(balances[settleContactId].theyOweMe - balances[settleContactId].iOwe).toFixed(2)}?`}
            </p>

            <div className="flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto hide-scrollbar">
              {state.accounts.map(acc => (
                <div 
                  key={acc.id}
                  onClick={() => setSettleAccountId(acc.id)}
                  className={`flex justify-between items-center p-4 cursor-pointer transition-all ${settleAccountId === acc.id ? 'lg-card' : ''}`}
                  style={{ 
                    borderRadius: '16px',
                    border: settleAccountId === acc.id ? '1px solid var(--c-cyan)' : '1px solid var(--lg-border)',
                    background: settleAccountId === acc.id ? 'var(--lg-fill-hover)' : 'var(--lg-fill)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '24px' }}>{acc.type === 'Bank' ? '🏦' : acc.type === 'Card' ? '💳' : '💵'}</span>
                    <span className="fw-bold">{acc.name}</span>
                  </div>
                  {settleAccountId === acc.id && <span style={{ color: 'var(--c-cyan)' }}>✓</span>}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="flex-1 btn btn-ghost" style={{ borderRadius: '16px', padding: '14px' }} onClick={() => setIsSettleModalOpen(false)}>Cancel</button>
              <button className="flex-1 btn btn-primary" style={{ borderRadius: '16px', padding: '14px' }} onClick={confirmSettleUp} disabled={!settleAccountId}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SPLIT MODAL */}
      <EditSplitModal 
        isOpen={!!editingSplit} 
        split={editingSplit} 
        onClose={() => setEditingSplit(null)} 
      />

      </div>
    </div>
  );
}
