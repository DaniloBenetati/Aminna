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
    
    const {data: exps} = await s.from('expenses').select('*').gte('date', start).lte('date', end);
    
    console.log(`Fevereiro: ${exps?.length} despesas/entradas.`);
    
    const revenueAdjustments = exps?.filter(e => {
        const cat = (e.category || '').toLowerCase();
        return cat === 'ajuste de valor' || cat === 'desconto concedido' || e.dreClass === 'REVENUE';
    }).reduce((acc, e) => acc + (e.dreClass === 'REVENUE' ? e.amount : -e.amount), 0) || 0;
    
    const otherIncome = exps?.filter(e => e.dreClass === 'OTHER_INCOME').reduce((acc, e) => acc + e.amount, 0) || 0;
    
    console.log("Revenue Adjustments (Calculado):", revenueAdjustments);
    console.log("Other Income (Calculado):", otherIncome);
    
    if (Math.abs(revenueAdjustments) > 1000 || otherIncome > 1000) {
        console.log("--- Detalhes das Entradas Maiores ---");
        exps?.filter(e => e.amount > 1000).forEach(e => {
             console.log(`- ${e.description}: ${e.amount} (${e.category}) [${e.dreClass}]`);
        });
    }
}

run();
