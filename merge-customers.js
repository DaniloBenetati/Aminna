
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

async function mergeCustomers() {
    console.log("🚀 Auditoria e Fusão de Clientes Duplicados...");

    // 1. Fetch ALL customers
    const { data: customers, error } = await supabase.from('customers').select('*');
    if (error || !customers) {
        console.error("Erro ao buscar clientes:", error);
        return;
    }

    console.log(`📊 Total de CPFs/Nomes para analisar: ${customers.length}`);

    const groups = new Map();

    customers.forEach(c => {
        const normName = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const normPhone = (c.phone || '').replace(/\D/g, '');
        
        // Key logic: Same name + Same phone (if phone exists)
        // If phone is different, they are different people (usually).
        // If one has no phone, but same name, they are likely the same.
        const key = `${normName}-${normPhone}`;
        
        if (groups.has(key)) {
            groups.get(key).push(c);
        } else {
            groups.set(key, [c]);
        }
    });

    let mergedCount = 0;

    for (const [key, list] of groups.entries()) {
        if (list.length > 1) {
            console.log(`\n⚠️  Grupo Duplicado [${key}]: ${list.length} clientes`);
            
            // Lógica de desempate:
            // 1. Manter o que tem mais "total_spent" ou "last_visit"
            const sorted = [...list].sort((a, b) => {
                if ((a.total_spent || 0) !== (b.total_spent || 0)) return (b.total_spent || 0) - (a.total_spent || 0);
                if (a.last_visit && b.last_visit) return b.last_visit.localeCompare(a.last_visit);
                return a.id.localeCompare(b.id);
            });

            const winner = sorted[0];
            const losers = sorted.slice(1);

            console.log(`   🏆 Vencedor: ${winner.name} (ID: ${winner.id}) | Gasto: R$ ${winner.total_spent}`);
            
            for (const loser of losers) {
                console.log(`   Merging ${loser.name} (ID: ${loser.id}) into ${winner.id}...`);

                // Tables to update:
                const tables = ['appointments', 'sales', 'leads', 'nfse_records', 'pantry_logs', 'usage_logs'];
                for (const table of tables) {
                    const col = table === 'leads' ? 'customerId' : 'customer_id';
                    const { error: updateError } = await supabase.from(table).update({ [col]: winner.id }).eq(col, loser.id);
                    if (updateError) console.error(`      ❌ Erro na tabela ${table}:`, updateError.message);
                    else console.log(`      ✅ Tabela ${table} atualizada.`);
                }

                // Delete the loser customer record
                const { error: delError } = await supabase.from('customers').delete().eq('id', loser.id);
                if (delError) console.error(`      ❌ Erro ao deletar cliente ${loser.id}:`, delError.message);
                else {
                    console.log(`      🗑️  Cliente deletado.`);
                    mergedCount++;
                }
            }
        }
    }

    console.log(`\n🏁 Concluído! Total de clientes unificados: ${mergedCount}`);
}

mergeCustomers();
