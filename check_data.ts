import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    const {data} = await s.from('appointments').select('status, booked_price').gte('date', '2026-02-01').lte('date', '2026-02-28').limit(5);
    console.log("Appointments Feb Sample:", data);
}

run();
