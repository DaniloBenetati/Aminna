
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const mariaId = '407a0c35-aa73-46db-b837-ebee1f9e1407';
    
    // Check main provider
    const { data: mainAppts, error: err1 } = await supabase
        .from('appointments')
        .select('*, customers(name)')
        .eq('date', '2026-03-27')
        .eq('provider_id', mariaId);
        
    // Check additional services provider
    const { data: allAppts, error: err2 } = await supabase
        .from('appointments')
        .select('*, customers(name)')
        .eq('date', '2026-03-27');

    if (err1 || err2) {
        console.error("Error fetching:", err1 || err2);
        return;
    }

    const additionalAppts = allAppts.filter(a => 
        a.additional_services && 
        a.additional_services.some(s => s.providerId === mariaId)
    );

    const results = {
        main: mainAppts,
        additional: additionalAppts
    };

    fs.writeFileSync('maria-appts.json', JSON.stringify(results, null, 2));
    console.log("Written maria-appts.json");
}

main();
