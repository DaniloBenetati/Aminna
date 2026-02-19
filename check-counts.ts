
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("Checking appointment counts...");

    // Count total future appointments
    const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('date', '2026-02-18');

    if (countError) console.error("Count Error:", countError);
    console.log(`Total appointments >= 2026-02-18: ${count}`);

    // List distinct dates
    const { data: dates, error: dateError } = await supabase
        .from('appointments')
        .select('date')
        .gte('date', '2026-02-18')
        .order('date', { ascending: true })
        .limit(20);

    if (dateError) console.error("Date Error:", dateError);
    if (dates) {
        console.log("Sample dates found:", [...new Set(dates.map(d => d.date))]);
    }
}

main();
