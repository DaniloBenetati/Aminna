
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: payroll } = await supabase.from('payroll').select('*').order('year, month');
    console.log("--- RECORDS IN PAYROLL ---");
    payroll?.forEach(p => console.log(`${p.month}/${p.year} - ID: ${p.id}`));
    console.log("Total:", payroll?.length);
}

check();
