import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    console.log("Dumping first 100 expenses in Feb 2026...");
    const {data} = await s.from('expenses').select('*').gte('date', '2026-02-01').lte('date', '2026-02-28').limit(100);
    
    if (!data || data.length === 0) {
        console.log("No records found in Feb 2026 in 'expenses' table.");
        return;
    }

    data.forEach(e => {
        console.log(`- [${e.date}] ${e.description} | ${e.amount} | Class: ${e.dreClass} | Cat: ${e.category}`);
    });
}

run();
