import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log("URL defined:", !!url);
    console.log("Key defined:", !!key);
    
    if (!url || !key) {
        console.error("Missing credentials!");
        return;
    }

    const s = createClient(url, key);
    const {data, error} = await s.from('providers').select('name, nickname');
    if (error) {
        console.error("Error fetching providers:", error.message);
        return;
    }
    console.log(`Found ${data.length} providers.`);
    if (data.length > 0) console.table(data);
}

run().catch(console.error);
