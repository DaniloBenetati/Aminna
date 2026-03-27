
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: providers, error } = await supabase
        .from('providers')
        .select('name, specialties');
        
    if (error) {
        console.error("Error fetching providers:", error);
        return;
    }
    fs.writeFileSync('all-providers-specialties.json', JSON.stringify(providers, null, 2));
    console.log("Written all-providers-specialties.json");
}

main();
