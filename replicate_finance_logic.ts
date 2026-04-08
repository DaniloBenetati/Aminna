import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    // Exact dates for FEB 2026
    const start = '2026-02-01';
    const end = '2026-02-28';
    
    const {data: apps} = await s.from('appointments').select('*').gte('date', start).lte('date', end);
    const {data: sales} = await s.from('sales').select('*').gte('date', start).lte('date', end);
    const {data: expenses} = await s.from('expenses').select('*').gte('date', start).lte('date', end);
    const {data: services} = await s.from('services').select('*');

    console.log(`Debug February data:`);
    console.log(`- Appointments: ${apps?.length}`);
    console.log(`- Sales: ${sales?.length}`);
    console.log(`- Expenses: ${expenses?.length}`);

    const realizedApps = apps?.filter(a => a.status?.toUpperCase() === 'CONCLUÍDO') || [];
    
    // Mock calculateProductionRevenue
    const revenueServices = realizedApps.reduce((acc, a) => acc + (a.booked_price || 0), 0);
    
    const revenueTips = realizedApps.reduce((acc, a) => acc + Number(a.tipAmount || 0), 0);
    
    const revenueAdjustments = expenses?.filter(e => {
        const cat = (e.category || '').toLowerCase();
        return cat === 'ajuste de valor' || cat === 'desconto concedido' || e.dreClass === 'REVENUE';
    }).reduce((acc, e) => acc + (e.dreClass === 'REVENUE' ? e.amount : -e.amount), 0) || 0;

    const otherIncome = expenses?.filter(e => e.dreClass === 'OTHER_INCOME').reduce((acc, e) => acc + e.amount, 0) || 0;

    const revenueProducts = sales?.reduce((acc, s) => acc + (s.amount || 0), 0) || 0;

    const grossRevenue = revenueServices + revenueProducts + revenueTips + revenueAdjustments + otherIncome;

    console.log(`Results:`);
    console.log(`- revenueServices: ${revenueServices}`);
    console.log(`- revenueProducts: ${revenueProducts}`);
    console.log(`- revenueTips: ${revenueTips}`);
    console.log(`- revenueAdjustments: ${revenueAdjustments}`);
    console.log(`- otherIncome: ${otherIncome}`);
    console.log(`- TOTAL GROSS REVENUE: ${grossRevenue}`);
    
    if (grossRevenue > 400000) {
        console.log("CRITICAL: Value matches the user symptom! Investigating sum components...");
    }
}

run();
