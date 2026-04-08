import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    const start = '2026-02-01';
    const end = '2026-02-28';
    
    const {data: exps} = await s.from('expenses').select('*').gte('date', start).lte('date', end).in('dreClass', ['REVENUE', 'OTHER_INCOME']);
    
    console.log(`Fevereiro: ${exps?.length} entradas de Receita/Outros.`);
    let total = 0;
    exps?.forEach(e => {
        console.log(`- ${e.description}: ${e.amount} (${e.category}) [${e.dreClass}]`);
        total += e.amount;
    });
    console.log("TOTAL EXTRA:", total);
}

run();
