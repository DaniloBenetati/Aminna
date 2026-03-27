
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: pros, error } = await supabase
        .from('providers')
        .select('*')
        .ilike('name', '%Maria%');
        
    if (error) {
        console.error("Error fetching:", error);
        return;
    }
    fs.writeFileSync('maria-pros.json', JSON.stringify(pros, null, 2));
    console.log("Written maria-pros.json");
}

main();
