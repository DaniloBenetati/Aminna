
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
    console.log("Checking appointments...");
    const { data, error } = await supabase
        .from('appointments')
        .select('id, date, status, provider_id, customer_id')
        .gte('date', '2026-02-18')
        .limit(10);

    if (error) {
        console.error("Error fetching appointments:", error);
    } else {
        console.log(`Found ${data?.length} appointments on/after 2026-02-18`);
        console.log("Types: date, status, provider_id, customer_id");
        if (data && data.length > 0) {
            console.log(data);
        }
    }
}

main();
