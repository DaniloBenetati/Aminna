
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
    const { data: maria, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', mariaId)
        .single();
        
    if (error) {
        console.error("Error fetching provider:", error);
        return;
    }
    fs.writeFileSync('maria-specialties.json', JSON.stringify(maria.specialties, null, 2));
    console.log("Written maria-specialties.json");
}

main();
