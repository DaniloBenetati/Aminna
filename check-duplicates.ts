
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
    console.log("Checking for duplicates...");

    // Fetch all appointments > 18/02
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, date, time, provider_id, customer_id')
        .gte('date', '2026-02-18');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const map = new Map();
    const duplicates = [];

    appointments.forEach(appt => {
        // Key: provider + date + time
        const key = `${appt.provider_id}-${appt.date}-${appt.time}`;
        if (map.has(key)) {
            duplicates.push({
                original: map.get(key),
                duplicate: appt
            });
        } else {
            map.set(key, appt);
        }
    });

    console.log(`Found ${duplicates.length} duplicates.`);
    if (duplicates.length > 0) {
        console.log(`Example duplicate key: ${JSON.stringify(duplicates[0])}`);
    } else {
        console.log("No duplicates found.");
    }
}

main();
