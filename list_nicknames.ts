import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const {data, error} = await s.from('providers').select('name, nickname');
    if (error) {
        console.error("Error fetching providers:", error);
        return;
    }
    console.log(`Found ${data.length} providers.`);
    console.table(data);
}

run().catch(console.error);
