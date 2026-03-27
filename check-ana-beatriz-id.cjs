
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const customerId = 'a2798e66-1984-4bf8-86fc-8d07c2ff2e07';
    const { data: appts, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customerId);
        
    if (error) {
        console.error("Error fetching:", error);
        return;
    }
    fs.writeFileSync('ana-id-appts.json', JSON.stringify(appts, null, 2));
    console.log("Written ana-id-appts.json");
}

main();
