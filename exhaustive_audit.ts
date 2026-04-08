import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    // Check for ANY REVENUE/OTHER_INCOME in early 2026
    const {data: exps} = await s.from('expenses')
        .select('*')
        .gte('date', '2025-12-01')
        .lte('date', '2026-04-30');
    
    console.log(`Found ${exps?.length} total records in expenses table for this period.`);
    
    const unusual = exps?.filter(e => {
        const cat = (e.category || '').toLowerCase();
        return e.dreClass === 'REVENUE' || e.dreClass === 'OTHER_INCOME' || cat.includes('ajuste') || cat.includes('desconto');
    });
    
    console.log(`Found ${unusual?.length} unusual revenue-like records.`);
    unusual?.forEach(e => {
        console.log(`- ${e.description} | ${e.amount} | ${e.date} | Class: ${e.dreClass} | Cat: ${e.category}`);
    });

    // Check Sales too
    const {data: sls} = await s.from('sales')
        .select('*')
        .gte('date', '2026-02-01')
        .lte('date', '2026-02-28');
    
    console.log(`Found ${sls?.length} sales in Feb 2026.`);
    sls?.forEach(s => {
        console.log(`- Sale ${s.id} | ${s.amount} | ${s.date} | Items: ${JSON.stringify(s.items)}`);
    });
}

run();
