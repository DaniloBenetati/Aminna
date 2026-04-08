import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    const {data} = await s.from('expenses').select('*').gte('date', '2026-02-01').lte('date', '2026-02-28');
    
    console.log(`Fevereiro: ${data?.length} registros totais em expenses.`);
    let sumRevenue = 0;
    data?.forEach(e => {
        if (e.dreClass === 'REVENUE') sumRevenue += e.amount;
        if (e.amount > 500) {
            console.log(`- ${e.description} | ${e.amount} | Class: ${e.dreClass} | Cat: ${e.category} | Reconciled: ${e.isReconciled}`);
        }
    });
    console.log("Total REVENUE in expenses:", sumRevenue);
}

run();
