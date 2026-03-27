
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: customer } = await supabase.from('customers').select('id').eq('name', 'Patricia Prata').single();
    if (!customer) {
        console.log("Customer not found");
        return;
    }
    
    const { data: appts, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('date', '2026-03-27');
        
    if (error) {
        console.error("Error fetching appointments:", error);
        return;
    }
    fs.writeFileSync('patricia-appts-clean.json', JSON.stringify(appts, null, 2));
    console.log("Written patricia-appts-clean.json");
}

main();
