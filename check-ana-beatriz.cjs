
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: appts, error } = await supabase
        .from('appointments')
        .select('*, customers(name)')
        .order('date', { ascending: false });
        
    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    const anaAppts = appts.filter(a => a.customers && a.customers.name.toLowerCase().includes('ana beatriz reis'));
    fs.writeFileSync('ana-appts.json', JSON.stringify(anaAppts, null, 2));
    console.log("Written ana-appts.json");
}

main();
