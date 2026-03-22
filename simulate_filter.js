
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugFilter() {
    const startDate = '2026-01-05';
    const endDate = '2026-01-05';

    const { data: expenses } = await supabase.from('expenses').select('*').eq('date', '2026-01-05');
    console.log(`Found ${expenses?.length} expenses for ${startDate}`);

    const filtered = expenses.filter(exp => {
        const matchesDate = (exp.date >= startDate && exp.date <= endDate);
        const isNotRevenue = exp.dre_class !== 'REVENUE';
        return matchesDate && isNotRevenue;
    });

    console.log(`Filtered: ${filtered.length} items`);
    if (filtered.length > 0) {
        console.log('Sample:', filtered[0].description, filtered[0].amount, filtered[0].dre_class);
    }
}

debugFilter();
