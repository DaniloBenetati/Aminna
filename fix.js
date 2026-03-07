import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Fetching configs...');
    const { data: configs } = await supabase.from('financial_config').select('*');
    console.log(configs);

    // Delete all existing ones
    for (const c of configs || []) {
        await supabase.from('financial_config').delete().eq('id', c.id);
    }

    // Insert the single correct one
    const { error } = await supabase.from('financial_config').insert([{
        valid_from: '2026-01-01',
        anticipation_rate: 1.79,
        anticipation_enabled: true,
        initial_balance: 101179.98,
        cash_flow_reserve_rate: 0
    }]);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Config successfully reset to 2026-01-01 with 101.179,98 balance and 1.79 rate.');
    }
}
run();
