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
    
    const {data: apps} = await s.from('appointments').select('*').gte('date', start).lte('date', end).neq('status', 'Cancelado');
    const {data: exps} = await s.from('expenses').select('*').gte('date', start).lte('date', end);
    
    console.log(`Fevereiro: ${apps?.length} agendamentos.`);
    
    const revenueServices = apps?.filter(a => a.status === 'Concluído').reduce((acc, a) => acc + (a.booked_price || 0), 0) || 0;
    const revAdj = exps?.filter(e => {
        const cat = (e.category || '').toLowerCase();
        return cat === 'ajuste de valor' || cat === 'desconto concedido' || e.dreClass === 'REVENUE';
    }).reduce((acc, e) => acc + (e.dreClass === 'REVENUE' ? e.amount : -e.amount), 0) || 0;
    
    const otherInc = exps?.filter(e => e.dreClass === 'OTHER_INCOME').reduce((acc, e) => acc + e.amount, 0) || 0;
    
    console.log("Revenue Services (Concluídos):", revenueServices);
    console.log("Revenue Adjustments (Ajustes/REVENUE):", revAdj);
    console.log("Other Income (Extras):", otherInc);
    
    if (revAdj > 100000 || otherInc > 100000) {
        console.log("--- Detalhes dos Ajustes Maiores ---");
        exps?.filter(e => (e.dreClass === 'REVENUE' || e.dreClass === 'OTHER_INCOME') && e.amount > 1000).forEach(e => {
            console.log(`- ${e.description}: ${e.amount} (${e.category}) [${e.dreClass}]`);
        });
    }
}

run();
