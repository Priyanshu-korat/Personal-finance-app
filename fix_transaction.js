import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tpqtnsfqakhzrnmmoyhe.supabase.co';
const supabaseKey = 'sb_publishable_QAJJxfy27j9yqsYOXODdHw_BoYqtzRy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingTransaction() {
  const { data: profiles } = await supabase.from('profiles').select('id');
  const userId = profiles?.[0]?.id;
  
  if (!userId) {
    console.error('No user profile found');
    return;
  }

  const newTx = {
    user_id: userId,
    id: `tx-${Date.now()}`,
    title: `Bought Quantum Gold Fund ETF`,
    amount: 59591,
    type: 'Investment',
    category: 'Stock / ETF',
    date: new Date().toISOString() // Or backdate it to today
  };

  const { error } = await supabase.from('transactions').insert([newTx]);
  if (error) {
    console.error('Error adding transaction:', error);
  } else {
    console.log('Successfully added missing investment transaction!');
  }
}

addMissingTransaction();
