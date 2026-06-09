import { supabase } from './supabase';

// Convert JS camelCase to Supabase snake_case
const toSnake = (obj) => {
  if (!obj) return null;
  const snake = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snake[snakeKey] = value;
  }
  return snake;
};

// Convert Supabase snake_case to JS camelCase
const toCamel = (obj) => {
  if (!obj) return null;
  const camel = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    camel[camelKey] = value;
  }
  return camel;
};

export const fetchInitialState = async (userId) => {
  try {
    // 1. Fetch profile first because we need the phone number for settlement requests
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();

    // 2. Fetch the rest concurrently
    const [
      { data: accountsData },
      { data: categoriesData },
      { data: transactionsData },
      { data: subscriptionsData },
      { data: logsData },
      { data: contactsData },
      { data: splitsData },
      { data: settlementsData },
      { data: investmentsData },
      { data: ordersData },
      { data: budgetsData },
      { data: potsData }
    ] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('categories').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('user_id', userId),
      supabase.from('processed_logs').select('*').eq('user_id', userId),
      supabase.from('contacts').select('*').eq('user_id', userId),
      // Fetch all shared splits where this user is the creator, the payer, or is involved
      supabase.from('shared_splits').select('*').or(`creator_id.eq.${userId},paid_by.eq.${userId},involved_profiles.cs.[{"userId":"${userId}"}]`).order('date', { ascending: false }),
      supabase.from('settlement_requests').select('*').or(`initiator_id.eq.${userId},receiver_phone.eq.${profileData?.phone || 'none'}`).eq('status', 'pending'),
      supabase.from('investments').select('*').eq('user_id', userId),
      supabase.from('investment_orders').select('*').eq('user_id', userId).order('order_date', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', userId),
      supabase.from('savings_pots').select('*').eq('user_id', userId)
    ]);

    return {
      profile: profileData ? {
        isSetupComplete: profileData.is_setup_complete,
        name: profileData.name || '',
        phone: profileData.phone || '',
        tier: profileData.tier || 2,
        useSubCategories: profileData.use_sub_categories || false
      } : null,
      accounts: (accountsData || []).map(toCamel),
      categories: (categoriesData || []).map(toCamel),
      transactions: (transactionsData || []).map(toCamel),
      subscriptions: (subscriptionsData || []).map(toCamel),
      processedLogs: (logsData || []).map(toCamel),
      contacts: (contactsData || []).map(toCamel),
      sharedSplits: (splitsData || []).map(toCamel),
      settlementRequests: (settlementsData || []).map(toCamel),
      investments: (investmentsData || []).map(toCamel),
      investmentOrders: (ordersData || []).map(toCamel),
      budgets: (budgetsData || []).map(toCamel),
      savingsPots: (potsData || []).map(toCamel)
    };
  } catch (err) {
    console.error('Error fetching initial state:', err);
    // If it's a network error (e.g. Failed to fetch), throw it so the UI can show an offline message
    if (err.message && err.message.includes('fetch')) {
      throw err;
    }
    return null;
  }
};

const handleSupabaseResponse = (res) => {
  if (res.error) throw res.error;
  return res;
};

// Check array of responses for Promise.all
const handleAllResponses = (responses) => {
  responses.forEach(res => {
    if (res.error) throw res.error;
  });
  return responses;
};

export const syncActionToSupabase = async (action, userId) => {
  if (!userId) return;

  try {
    switch (action.type) {
      case 'COMPLETE_SETUP': {
        const { name, phone, tier, useSubCategories, customCategories } = action.payload;
        await supabase.from('profiles').upsert({
          id: userId,
          name,
          phone,
          tier,
          use_sub_categories: useSubCategories,
          is_setup_complete: true
        }).then(handleSupabaseResponse);

        // Also insert any custom categories
        if (customCategories && customCategories.length > 0) {
          const catsToInsert = customCategories.map(c => ({
            ...toSnake(c),
            user_id: userId
          }));
          await supabase.from('categories').upsert(catsToInsert).then(handleSupabaseResponse);
        }
        break;
      }
      
      case 'ADD_ACCOUNT':
        await supabase.from('accounts').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;

      case 'UPDATE_ACCOUNT':
        await supabase.from('accounts').update(toSnake(action.payload.updates)).eq('id', action.payload.id).eq('user_id', userId).then(handleSupabaseResponse);
        break;

      case 'REMOVE_ACCOUNT':
        await supabase.from('accounts').delete().eq('id', action.payload.id).eq('user_id', userId).then(handleSupabaseResponse);
        break;

      case 'ADD_TRANSACTION':
        await supabase.from('transactions').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;

      case 'ADD_CATEGORY':
        await supabase.from('categories').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;

      case 'UPDATE_CATEGORY':
        if (action.payload.fullCategory) {
          await supabase.from('categories').upsert({
            ...toSnake(action.payload.fullCategory),
            user_id: userId
          }).then(handleSupabaseResponse);
        } else {
          await supabase.from('categories').update(toSnake(action.payload.updates)).eq('name', action.payload.name).eq('user_id', userId).then(handleSupabaseResponse);
        }
        break;

      case 'REMOVE_CATEGORY':
        await supabase.from('categories').delete().eq('name', action.payload.name).eq('user_id', userId).then(handleSupabaseResponse);
        break;

      case 'ADD_SUBSCRIPTION':
        await supabase.from('subscriptions').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;

      case 'UPDATE_SUBSCRIPTION':
        await supabase.from('subscriptions').update({ amount: action.payload.amount }).eq('id', action.payload.id).eq('user_id', userId).then(handleSupabaseResponse);
        break;

      case 'PROCESS_SUBSCRIPTION': {
        const { subId, monthYear, transaction } = action.payload;
        await Promise.all([
          supabase.from('processed_logs').insert({
            id: `log-${Date.now()}`,
            user_id: userId,
            ref_id: subId,
            month_year: monthYear,
            type: 'subscription'
          }),
          supabase.from('transactions').insert({ ...toSnake(transaction), user_id: userId })
        ]).then(handleAllResponses);
        break;
      }

      case 'PROCESS_CARD_BILL': {
        const { cardId, monthYear, transaction } = action.payload;
        // Delete any snooze logs for this month
        await supabase.from('processed_logs')
          .delete()
          .eq('user_id', userId)
          .eq('ref_id', cardId)
          .eq('month_year', monthYear)
          .eq('type', 'card_bill')
          .then(handleSupabaseResponse);

        await Promise.all([
          supabase.from('processed_logs').insert({
            id: `log-card-${Date.now()}`,
            user_id: userId,
            ref_id: cardId,
            month_year: monthYear,
            type: 'card_bill'
          }),
          supabase.from('transactions').insert({ ...toSnake(transaction), user_id: userId })
        ]).then(handleAllResponses);
        break;
      }

      case 'SNOOZE_CARD_BILL': {
        const { cardId, monthYear, snoozeUntil } = action.payload;
        await supabase.from('processed_logs').upsert({
          id: `log-snooze-${cardId}-${monthYear}`,
          user_id: userId,
          ref_id: cardId,
          month_year: monthYear,
          type: 'card_bill',
          snooze_until: snoozeUntil
        }).then(handleSupabaseResponse);
        break;
      }

      case 'ADD_CONTACT': {
        await supabase.from('contacts').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;
      }

      case 'ADD_SHARED_SPLIT': {
        await supabase.from('shared_splits').insert({ ...toSnake(action.payload), creator_id: userId }).then(handleSupabaseResponse);
        break;
      }

      case 'UPDATE_SHARED_SPLIT': {
        const payload = toSnake(action.payload);
        const { id, ...updates } = payload;
        await supabase.from('shared_splits')
          .update(updates)
          .eq('id', id)
          .then(handleSupabaseResponse);
        break;
      }

      case 'INITIATE_SETTLEMENT': {
        const { request, transaction } = action.payload;
        await Promise.all([
          supabase.from('settlement_requests').insert({ ...toSnake(request), initiator_id: userId }),
          supabase.from('transactions').insert({ ...toSnake(transaction), user_id: userId })
        ]).then(handleAllResponses);
        break;
      }

      case 'RESOLVE_SETTLEMENT': {
        const { requestId, splitIds, transaction } = action.payload;
        // The receiver confirms it:
        // 1. Mark request as completed
        // 2. Add their transaction
        // 3. Mark splits as settled (zero out debts)
        await Promise.all([
          supabase.from('settlement_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', requestId),
          supabase.from('transactions').insert({ ...toSnake(transaction), user_id: userId }),
          // In a real production app we'd do a batch update for splits, here we can just fire individual updates or rely on context
        ]).then(handleAllResponses);
        
        // Actually, we must update all splitIds to have debts = 0 for this contact
        // But the split data is complex JSON. Let's let the Context handle the local state, and here we just push the raw updated split objects from action.payload.updatedSplits if provided.
        if (action.payload.updatedSplits) {
          const promises = action.payload.updatedSplits.map(s => 
            supabase.from('shared_splits').update(toSnake(s)).eq('id', s.id)
          );
          await Promise.all(promises).then(handleAllResponses);
        }
        
        break;
      }

      case 'ADD_INVESTMENT': {
        await supabase.from('investments').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;
      }

      case 'UPDATE_INVESTMENT': {
        await supabase.from('investments').update(toSnake(action.payload.updates)).eq('id', action.payload.id).eq('user_id', userId).then(handleSupabaseResponse);
        break;
      }

      case 'DELETE_INVESTMENT': {
        await supabase.from('investments').delete().eq('id', action.payload).eq('user_id', userId).then(handleSupabaseResponse);
        break;
      }

      case 'UPDATE_INVESTMENT_PRICES': {
        const promises = action.payload.map(inv => 
          supabase.from('investments').update({ current_price: inv.currentPrice, last_updated: new Date().toISOString() }).eq('id', inv.id).eq('user_id', userId)
        );
        await Promise.all(promises).then(handleAllResponses);
        break;
      }

      case 'ADD_INVESTMENT_ORDER': {
        await supabase.from('investment_orders').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;
      }

      case 'SETTLE_INVESTMENT_ORDER': {
        const { orderId, updates } = action.payload;
        await supabase.from('investment_orders').update(toSnake(updates)).eq('id', orderId).eq('user_id', userId).then(handleSupabaseResponse);
        break;
      }

      case 'SET_BUDGET': {
        const { category, amount } = action.payload;
        // Upsert logic for budget
        const { data: existing } = await supabase.from('budgets').select('id').eq('user_id', userId).eq('category', category).single();
        if (existing) {
          await supabase.from('budgets').update({ amount }).eq('id', existing.id).then(handleSupabaseResponse);
        } else {
          await supabase.from('budgets').insert({ category, amount, user_id: userId }).then(handleSupabaseResponse);
        }
        break;
      }

      case 'ADD_SAVINGS_POT': {
        await supabase.from('savings_pots').insert({ ...toSnake(action.payload), user_id: userId }).then(handleSupabaseResponse);
        break;
      }

      case 'UPDATE_SAVINGS_POT': {
        const { id, updates } = action.payload;
        await supabase.from('savings_pots').update(toSnake(updates)).eq('id', id).eq('user_id', userId).then(handleSupabaseResponse);
        break;
      }

      case 'RESET_APP': {
        // Wipe all user data from Supabase tables gracefully
        const tables = [
          'accounts', 'categories', 'transactions', 
          'subscriptions', 'processed_logs',
          'contacts', 'shared_splits', 'settlement_requests',
          'investments', 'investment_orders', 'budgets', 'savings_pots'
        ];
        
        const deletePromises = tables.map(table => 
          supabase.from(table).delete().eq('user_id', userId).catch(err => {
            console.log(`Failed to delete from ${table}:`, err);
            return null;
          })
        );
        
        await Promise.all(deletePromises);
        
        // Reset profile
        await supabase.from('profiles').update({
          is_setup_complete: false,
          name: '',
          tier: 2,
          use_sub_categories: false
        }).eq('id', userId).catch(err => console.log('Failed to reset profile:', err));
        
        break;
      }
    }
    return true; // Success
  } catch (err) {
    console.error('Supabase Sync Error:', err);
    return false; // Failed, should be queued
  }
};
