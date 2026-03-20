
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("🔍 Verificando Clientes Duplicados...");
    const { data: customers } = await supabase.from('customers').select('id, name, phone');
    if (!customers) return;

    const map = new Map();
    const duplicates = [];

    customers.forEach(c => {
        const normName = c.name.toLowerCase().trim();
        const normPhone = (c.phone || '').replace(/\D/g, '');
        // Key: name + phone (phone often empty, so rely on name if phone is same or empty)
        const key = `${normName}-${normPhone}`;
        
        if (map.has(key)) {
            duplicates.push({ original: map.get(key), duplicate: c });
        } else {
            map.set(key, c);
        }
    });

    console.log(`📊 Clientes Duplicados: ${duplicates.length}`);
    duplicates.forEach(d => console.log(`- ${d.original.name} (${d.original.id}) vs ${d.duplicate.name} (${d.duplicate.id})`));

    console.log("\n🔍 Verificando Agendamentos Duplicados (TODOS os campos)...");
    const { data: appts } = await supabase.from('appointments').select('*').gte('date', '2026-03-01');
    if (!appts) return;

    const apptCountMap = new Map();
    appts.forEach(a => {
        // High level duplicate: same customer name (norm), date, time
        const cust = customers.find(c => c.id === a.customer_id);
        const custName = cust ? cust.name.toLowerCase().trim() : 'UNKNOWN';
        const key = `${custName}-${a.date}-${a.time}`;
        
        if (apptCountMap.has(key)) {
            apptCountMap.get(key).push(a);
        } else {
            apptCountMap.set(key, [a]);
        }
    });

    let count = 0;
    apptCountMap.forEach((list, key) => {
        if (list.length > 1) {
            count++;
            console.log(`⚠️ Duplicidade detectada em [${key}]: ${list.length} registros`);
            list.forEach(l => console.log(`   - ID: ${l.id} | Prov: ${l.provider_id} | Srv: ${l.combined_service_names} | Status: ${l.status}`));
        }
    });
    console.log(`📊 Total de grupos de agendamentos possivelmente duplicados: ${count}`);
}

check();
