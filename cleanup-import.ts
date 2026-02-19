
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
    console.log("Deleting appointments from 2026-02-18 onwards...");

    const { error, count } = await supabase
        .from('appointments')
        .delete({ count: 'exact' })
        .gte('date', '2026-02-18');

    if (error) {
        console.error("Error deleting:", error);
    } else {
        console.log(`Deleted ${count} appointments.`);
    }
}

main();
