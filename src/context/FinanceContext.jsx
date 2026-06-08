import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchInitialState, syncActionToSupabase } from '../lib/sync';

// ============================================
// DEFAULT CATEGORIES (As discussed)
// ============================================
const DEFAULT_CATEGORIES = [
  { id: 'cat-food', name: 'Food', type: 'Expense', icon: '🍔', subCategories: [{ id: 'sub-food-gen', name: 'Food (General)' }] },
  { id: 'cat-transport', name: 'Transport', type: 'Expense', icon: '🚗', subCategories: [{ id: 'sub-trans-gen', name: 'Transport (General)' }] },
  { id: 'cat-home', name: 'Home & Rent', type: 'Expense', icon: '🏠', subCategories: [{ id: 'sub-home-gen', name: 'Home (General)' }] },
  { id: 'cat-personal', name: 'Personal', type: 'Expense', icon: '🛍️', subCategories: [{ id: 'sub-pers-gen', name: 'Personal (General)' }] },
  { id: 'cat-salary', name: 'Salary', type: 'Income', icon: '💰', subCategories: [{ id: 'sub-sal-gen', name: 'Salary (General)' }] },
];

// ============================================
// INITIAL STATE
// ============================================
const initialState = {
  profile: {
    isSetupComplete: false,
    name: '',
    tier: 2, // 1: Expense Only, 2: Standard, 3: Full Portfolio
    useSubCategories: false, // Advanced Tracking Toggle
  },
  accounts: [], 
  /* 
    Account Schema:
    { id: 'acc-1', name: 'HDFC Bank', type: 'Bank', balance: 25000 }
    Types: Bank, Card, Cash, UPI, Investment
    Note: For Tier 1, balance is ignored, it just acts as a tag.
  */
  categories: DEFAULT_CATEGORIES,
  specialTrackers: [],
  /*
    Tracker Schema:
    { id: 'trk-1', name: 'Goa Trip', type: 'Project', target: 0 }
  */
  transactions: [],
  /*
    Transaction Schema:
    { id: 'tx-1', amount: 500, type: 'Expense', categoryId: 'cat-food', subCategoryId: 'sub-food-gen', accountId: 'acc-1', trackerId: null, date: '2026-06-02T10:00:00Z', note: 'Swiggy' }
  */
  subscriptions: [],
  /*
    Subscription Schema:
    { id: 'sub-1', name: 'Netflix', amount: 199, date: 15, frequency: 'Monthly', category: 'Personal', accountId: 'acc-1' }
  */
  processedSubscriptions: [],
  /*
    Processed Schema:
    { subId: 'sub-1', monthYear: '2026-06' }
  */
  processedCardBills: [],
  /*
    Processed Card Bills Schema:
    { cardId: 'acc-1', monthYear: '2026-06', snoozeUntil: '2026-06-06T10:00:00Z' } // snoozeUntil is null if paid
  */
  contacts: [],
  sharedSplits: [],
  settlementRequests: [],
  investments: [],
  investmentOrders: [],
  budgets: [],
  savingsPots: [],
  /*
    Investment Schema:
    { id: 'inv-1', type: 'STOCK', symbol: 'RELIANCE.NS', name: 'Reliance Industries', quantity: 10, averageBuyPrice: 2500, currentPrice: 2600, lastUpdated: '...' }
  */
};

// ============================================
// REDUCER ENGINE
// ============================================
function financeReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };

    case 'COMPLETE_SETUP':
      return {
        ...state,
        profile: {
          ...state.profile,
          isSetupComplete: true,
          name: action.payload.name,
          tier: action.payload.tier,
          useSubCategories: action.payload.useSubCategories,
        },
        // Merge wizard categories into state.categories (where everything reads from)
        categories: action.payload.customCategories?.length
          ? action.payload.customCategories
          : state.categories,
      };
    
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
      
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };

    case 'ADD_SUBSCRIPTION':
      return { ...state, subscriptions: [...state.subscriptions, action.payload] };

    case 'PROCESS_SUBSCRIPTION': {
      const { subId, monthYear, transaction } = action.payload;
      return {
        ...state,
        processedSubscriptions: [...(state.processedSubscriptions || []), { subId, monthYear }],
        transactions: [transaction, ...state.transactions],
      };
    }

    case 'UPDATE_SUBSCRIPTION': {
      return {
        ...state,
        subscriptions: state.subscriptions.map(s => 
          s.id === action.payload.id ? { ...s, amount: action.payload.amount } : s
        )
      };
    }

    case 'PROCESS_CARD_BILL': {
      const { cardId, monthYear, transaction } = action.payload;
      
      // Remove any existing entry (e.g. if it was snoozed before)
      const filtered = (state.processedCardBills || []).filter(
        b => !(b.cardId === cardId && b.monthYear === monthYear)
      );

      return {
        ...state,
        processedCardBills: [...filtered, { cardId, monthYear, snoozeUntil: null }],
        transactions: [transaction, ...state.transactions],
      };
    }

    case 'SNOOZE_CARD_BILL': {
      const { cardId, monthYear, snoozeUntil } = action.payload;
      
      const filtered = (state.processedCardBills || []).filter(
        b => !(b.cardId === cardId && b.monthYear === monthYear)
      );

      return {
        ...state,
        processedCardBills: [...filtered, { cardId, monthYear, snoozeUntil }]
      };
    }

    case 'UPDATE_ACCOUNT': {
      return {
        ...state,
        accounts: state.accounts.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        )
      };
    }

    case 'RESET_APP':
      return initialState;

    case 'REMOVE_ACCOUNT': {
      const { id, transferToId } = action.payload;
      let newState = { ...state, accounts: state.accounts.filter(a => a.id !== id) };
      
      // If there's a transfer to account, and the account being removed had a balance, we should create a transaction
      // However, usually we handle the transaction dispatch in the component BEFORE calling REMOVE_ACCOUNT
      // So REMOVE_ACCOUNT just drops the account from the array.
      // But we DO need to clean up transactions that had this account if they shouldn't exist, OR we can leave them
      // for historical records. We will leave them for historical records, but maybe set their accountId to null or keep it.
      // It's safer to leave the accountId in the transaction history so old analytics don't break.
      return newState;
    }

    case 'ADD_CATEGORY':
      return { ...state, categories: [...(state.categories || []), action.payload] };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: (state.categories || []).map(c => 
          c.name === action.payload.name ? { ...c, ...action.payload.updates } : c
        )
      };

    case 'REMOVE_CATEGORY': {
      const { name, fallbackName } = action.payload;
      const newState = { 
        ...state, 
        categories: (state.categories || []).filter(c => c.name !== name) 
      };

      if (fallbackName) {
        newState.transactions = state.transactions.map(tx => 
          tx.category === name ? { ...tx, category: fallbackName } : tx
        );
      }
      return newState;
    }

    case 'ADD_CONTACT':
      return { ...state, contacts: [...(state.contacts || []), action.payload] };

    case 'ADD_SHARED_SPLIT':
      return { ...state, sharedSplits: [...(state.sharedSplits || []), action.payload] };

    case 'UPDATE_SHARED_SPLIT': {
      return {
        ...state,
        sharedSplits: (state.sharedSplits || []).map(split => 
          split.id === action.payload.id ? { ...split, ...action.payload } : split
        )
      };
    }

    case 'INITIATE_SETTLEMENT': {
      const { request, transaction } = action.payload;
      return {
        ...state,
        settlementRequests: [...(state.settlementRequests || []), request],
        transactions: [transaction, ...state.transactions]
      };
    }

    case 'RESOLVE_SETTLEMENT': {
      const { requestId, splitIds, transaction, updatedSplits } = action.payload;
      return {
        ...state,
        settlementRequests: (state.settlementRequests || []).map(req => 
          req.id === requestId ? { ...req, status: 'completed' } : req
        ),
        transactions: [transaction, ...state.transactions],
        sharedSplits: (state.sharedSplits || []).map(split => {
          if (updatedSplits) {
            const updated = updatedSplits.find(s => s.id === split.id);
            if (updated) return updated;
          }
          return split;
        })
      };
    }

    case 'ADD_INVESTMENT':
      return { ...state, investments: [...(state.investments || []), action.payload] };

    case 'UPDATE_INVESTMENT_PRICES': {
      return {
        ...state,
        investments: (state.investments || []).map(inv => {
          const update = action.payload.find(u => u.id === inv.id);
          if (update) {
            return { ...inv, currentPrice: update.currentPrice, lastUpdated: new Date().toISOString() };
          }
          return inv;
        })
      };
    }

    case 'UPDATE_INVESTMENT': {
      return {
        ...state,
        investments: (state.investments || []).map(inv =>
          inv.id === action.payload.id ? { ...inv, ...action.payload.updates } : inv
        )
      };
    }

    case 'ADD_INVESTMENT_ORDER':
      return { ...state, investmentOrders: [action.payload, ...(state.investmentOrders || [])] };

    case 'SETTLE_INVESTMENT_ORDER': {
      const { orderId, updates } = action.payload;
      return {
        ...state,
        investmentOrders: (state.investmentOrders || []).map(o =>
          o.id === orderId ? { ...o, ...updates } : o
        )
      };
    }

    case 'SET_BUDGET': {
      const { category, amount } = action.payload;
      const existing = (state.budgets || []).find(b => b.category === category);
      if (existing) {
        return {
          ...state,
          budgets: state.budgets.map(b => b.category === category ? { ...b, amount } : b)
        };
      } else {
        return {
          ...state,
          budgets: [...(state.budgets || []), { id: `budg-${Date.now()}`, category, amount }]
        };
      }
    }

    case 'ADD_SAVINGS_POT':
      return { ...state, savingsPots: [...(state.savingsPots || []), action.payload] };

    case 'UPDATE_SAVINGS_POT': {
      const { id, updates } = action.payload;
      return {
        ...state,
        savingsPots: (state.savingsPots || []).map(p =>
          p.id === id ? { ...p, ...updates } : p
        )
      };
    }

    default:
      return state;
  }
}

// ============================================
// CONTEXT PROVIDER
// ============================================
const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Offline & Sync Queue
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncQueue, setSyncQueue] = useState(() => {
    try {
      const q = localStorage.getItem('finance-sync-queue-v1');
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  });

  // Try to load from localStorage first for immediate UI render
  const [state, dispatch] = useReducer(financeReducer, initialState, (initial) => {
    try {
      const localData = localStorage.getItem('finance-data-v1');
      return localData ? JSON.parse(localData) : initial;
    } catch {
      return initial;
    }
  });

  // Track Supabase Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Offline Detection & Queue Processing
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save sync queue to local storage
  useEffect(() => {
    localStorage.setItem('finance-sync-queue-v1', JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Process the sync queue when back online
  useEffect(() => {
    let timeoutId;
    if (!isOffline && syncQueue.length > 0 && userId) {
      const processQueue = async () => {
        let currentQueue = [...syncQueue];
        let processedCount = 0;
        let requiresRetry = false;
        
        for (const action of currentQueue) {
          const success = await syncActionToSupabase(action, userId);
          if (success) {
            processedCount++;
          } else {
            action._retries = (action._retries || 0) + 1;
            if (action._retries > 3) {
              console.warn("Dropping failed action after 3 retries:", action);
              processedCount++;
            } else {
              requiresRetry = true;
              break;
            }
          }
        }
        
        if (processedCount > 0) {
          setSyncQueue(prev => prev.slice(processedCount));
        } else if (requiresRetry) {
          // If it failed, wait 5 seconds and retry
          timeoutId = setTimeout(() => {
            setSyncQueue(prev => [...prev]);
          }, 5000);
        }
      };
      
      processQueue();
    }
    return () => clearTimeout(timeoutId);
  }, [isOffline, userId, syncQueue]);

  // Hydrate from Supabase when user logs in
  useEffect(() => {
    if (userId) {
      setDataLoading(true);
      fetchInitialState(userId).then((cloudState) => {
        if (cloudState && cloudState.profile) {
          dispatch({ type: 'HYDRATE', payload: cloudState });
          
          // Re-apply offline queue optimistically on top of hydrated state
          setSyncQueue(currentQueue => {
            if (currentQueue.length > 0) {
              currentQueue.forEach(action => dispatch(action));
            }
            return currentQueue;
          });
        }
        setDataLoading(false);
      });
    } else {
      // If logged out, reset app
      dispatch({ type: 'RESET_APP' });
      setSyncQueue([]); // Clear queue on logout
      setDataLoading(false);
    }
  }, [userId]);

  // Save to localStorage as a fallback/offline cache
  useEffect(() => {
    localStorage.setItem('finance-data-v1', JSON.stringify(state));
  }, [state]);

  // Intercept dispatch to also sync to Supabase
  const asyncDispatch = async (action) => {
    dispatch(action); // Optimistic UI update instantly
    
    if (userId) {
      if (isOffline) {
        setSyncQueue(prev => [...prev, action]);
      } else {
        const success = await syncActionToSupabase(action, userId);
        if (!success) {
          // If network failed during sync, queue it
          setSyncQueue(prev => [...prev, action]);
        }
      }
    }
  };

  return (
    <FinanceContext.Provider value={{ state, dispatch: asyncDispatch, dataLoading, isOffline, pendingSyncs: syncQueue.length }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
