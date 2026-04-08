import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    const {data: apps} = await s.from('appointments')
        .select('booked_price, tipAmount, additionalServices')
        .gte('date', '2026-02-01')
        .lte('date', '2026-02-28')
        .eq('status', 'Concluído');
    
    console.log(`Found ${apps?.length} apps in Feb.`);
    
    let totalService = 0;
    let totalTips = 0;
    let totalAdd = 0;
    
    apps?.forEach(a => {
        totalService += (Number(a.booked_price) || 0);
        totalTips += (Number(a.tipAmount) || 0);
        (a.additionalServices || []).forEach((s: any) => {
            totalAdd += (Number(s.price) || Number(s.booked_price) || 0);
            totalTips += (Number(s.tipAmount) || 0);
        });
    });
    
    console.log("Total Base Service:", totalService);
    console.log("Total Tips:", totalTips);
    console.log("Total Additional Services Price:", totalAdd);
    console.log("SUM (Services + Tips):", totalService + totalAdd + totalTips);
}

run();
