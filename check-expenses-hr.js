
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: expenses } = await supabase.from('expenses').select('*').order('date');
    console.log("--- EXPENSES (HR) ---");
    expenses?.filter(e => e.description.includes('REF Janeir') || e.description.includes('REF Fevere'))
    .forEach(e => console.log(`${e.date} - ${e.description}`));
    
    // Check FGTS/INSS for Jan/Feb specifically
    expenses?.filter(e => e.description.includes('FGTS') || e.description.includes('INSS'))
    .forEach(e => console.log(`${e.date} - ${e.description}`));
}

check();
