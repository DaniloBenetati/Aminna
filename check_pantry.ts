
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
    console.log("Checking pantry items...");

    const { data, error } = await supabase
        .from('pantry_items')
        .select('*');

    if (error) {
        console.error("Error fetching pantry items:", error);
    } else {
        console.log(`Found ${data.length} pantry items:`);
        console.log(JSON.stringify(data, null, 2));
    }

    const { data: logs, error: logError } = await supabase
        .from('pantry_logs')
        .select('*');

    if (logError) {
        console.error("Error fetching pantry logs:", logError);
    } else {
        console.log(`Found ${logs.length} pantry logs.`);
    }
}

main();
