
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

async function megaCleanup() {
    const today = '2026-03-20';
    console.log(`🚀 Iniciando FAXINA MEGA nos agendamentos de HOJE (${today})...`);

    // 1. Fetch data
    const { data: customers } = await supabase.from('customers').select('id, name, phone');
    const { data: appts, error } = await supabase.from('appointments').select('*').eq('date', today);
    const { data: services } = await supabase.from('services').select('id, name');

    if (error || !appts) {
        console.error("Erro ao buscar agendamentos de hoje:", error);
        return;
    }

    console.log(`🎯 Encontrados ${appts.length} agendamentos hoje.`);

    // 2. Group by "Same Goal": Same Customer (Name/Phone), Same Time, Same Provider
    const groups = new Map();

    appts.forEach(a => {
        const cust = customers.find(c => c.id === a.customer_id);
        const custNameNormalized = (cust ? cust.name : (a.clientName || 'UNKNOWN')).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const provId = a.provider_id;
        const time = a.time;
        
        const key = `${custNameNormalized}-${time}-${provId}`;
        
        if (groups.has(key)) {
            groups.get(key).push(a);
        } else {
            groups.set(key, [a]);
        }
    });

    const toDelete = [];
    const toUpdate = [];

    for (const [key, list] of groups.entries()) {
        if (list.length > 1) {
            console.log(`⚠️  Grupo Duplicado [${key}]: ${list.length} registros`);
            
            // Lógica de Consolidação:
            // - Status Prioritário: Concluído > Em Andamento > Confirmado > Aguardando > Pendente
            // - Serviços: Juntar todos os serviços únicos
            // - Manter o primeito ID (mais antigo) e deletar os outros após atualizar o primeiro
            
            const sortedByStatus = [...list].sort((a, b) => {
                const order = { 'Concluído': 0, 'Em Andamento': 1, 'Em atendimento': 1, 'Confirmado': 2, 'Aguardando': 3, 'Pendente': 4 };
                return (order[a.status] ?? 5) - (order[b.status] ?? 5);
            });

            const winner = sortedByStatus[0];
            const losers = sortedByStatus.slice(1);

            // Merge services names
            const allServices = list.flatMap(a => (a.combined_service_names || '').split(' + ')).filter(Boolean);
            const uniqueServices = Array.from(new Set(allServices)).join(' + ');

            console.log(`   🏆 Mantendo ${winner.id} (${winner.status}) | Servicios: ${uniqueServices}`);
            
            toUpdate.push({
                id: winner.id,
                status: winner.status,
                combined_service_names: uniqueServices
            });

            losers.forEach(l => {
                console.log(`   🗑️  Removendo ${l.id} (${l.status})`);
                toDelete.push(l.id);
            });
        }
    }

    if (toUpdate.length === 0 && toDelete.length === 0) {
        console.log("✅ Tudo limpo de acordo com os critérios.");
        return;
    }

    // 3. Execution
    for (const upt of toUpdate) {
        await supabase.from('appointments').update({ 
            combined_service_names: upt.combined_service_names,
            status: upt.status 
        }).eq('id', upt.id);
    }

    if (toDelete.length > 0) {
        const { error: delError } = await supabase.from('appointments').delete().in('id', toDelete);
        if (delError) console.error("Erro ao deletar:", delError);
        else console.log(`♻️  ${toDelete.length} duplicados removidos.`);
    }

    console.log("🏁 Faxina concluída!");
}

megaCleanup();
