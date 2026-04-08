import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    console.log("Checking ALL expenses in Feb 2026...");
    const {data} = await s.from('expenses').select('*').gte('date', '2026-02-01').lte('date', '2026-02-28');
    
    if (!data || data.length === 0) {
        console.log("No records found in Feb 2026.");
        return;
    }

    let total = 0;
    data.forEach(e => {
        total += e.amount;
    });
    console.log(`Total amount in expenses table for Feb: ${total}`);
    
    const revenueLike = data.filter(e => e.dreClass === 'REVENUE' || e.dreClass === 'OTHER_INCOME' || (e.category || '').toLowerCase().includes('receita'));
    console.log(`Revenue-like entries: ${revenueLike.length}`);
    revenueLike.forEach(e => {
        console.log(`- ${e.description} | ${e.amount} | ${e.date}`);
    });
}

run();
