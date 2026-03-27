import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZGF6cWhndnZlbGNqdXJpZ2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM4NTI5NywiZXhwIjoyMDg0OTYxMjk3fQ.g6GobuEV8PYw92hzHjz303xRYYl7etqrfcSDMxh37WM'; // service_role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServices() {
    console.log('Fetching all services with prices...');
    const { data: services, error } = await supabase
        .from('services')
        .select('id, name, price');

    if (error) {
        console.error('Error:', error);
        return;
    }

    fs.writeFileSync('all-services.json', JSON.stringify(services, null, 2));
    
    const browLamination = services.find(s => s.name === 'BROW Lamination');
    if (browLamination) {
        console.log(`BROW Lamination details: ID=${browLamination.id}, Price=${browLamination.price}`);
    }

    const colocacao = services.find(s => s.name === 'COLOCAÇÃO');
    if (colocacao) {
        console.log(`COLOCAÇÃO details: ID=${colocacao.id}, Price=${colocacao.price}`);
    }
}

checkServices();
