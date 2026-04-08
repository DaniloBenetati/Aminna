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
    
    const {data: sales} = await s.from('sales').select('*').gte('date', start).lte('date', end);
    
    console.log(`Fevereiro: ${sales?.length} vendas.`);
    let total = 0;
    sales?.forEach(s => {
        total += (s.amount || 0);
    });
    console.log("TOTAL VENDAS:", total);
    
    if (total > 50000) {
        console.log("--- Maiores Vendas ---");
        sales?.sort((a,b) => (b.amount || 0) - (a.amount || 0)).slice(0, 10).forEach(s => {
            console.log(`- ID: ${s.id}, Data: ${s.date}, Valor: ${s.amount}, Cliente: ${s.customer_name}`);
        });
    }
}

run();
