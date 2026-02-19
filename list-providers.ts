
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
    const { data: providers } = await supabase.from('providers').select('name');
    console.log("PROVIDERS:");
    console.log(providers?.map(p => p.name).join('\n'));

    const { data: services } = await supabase.from('services').select('name');
    console.log("\nSERVICES:");
    console.log(services?.map(s => s.name).join('\n'));
}

main();
