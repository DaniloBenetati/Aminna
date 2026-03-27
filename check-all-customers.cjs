
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: customers, error } = await supabase
        .from('appointments')
        .select('customers(name), date, status')
        .eq('date', '2026-03-27');
        
    if (error) {
        console.error("Error fetching:", error);
        return;
    }
    fs.writeFileSync('all-customers-27-03.json', JSON.stringify(customers, null, 2));
    console.log("Written all-customers-27-03.json");
}

main();
