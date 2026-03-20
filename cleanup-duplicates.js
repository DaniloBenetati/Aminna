
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

async function cleanup() {
    console.log("🚀 Iniciando Auditoria de Duplicados...");

    // Fetch all records after 2026-02-18
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*');

    if (error) {
        console.error("❌ Erro ao buscar agendamentos:", error);
        return;
    }

    console.log(`📊 Analisando ${appointments.length} agendamentos...`);

    const map = new Map();
    const toDelete = [];

    appointments.forEach(appt => {
        // DEFINIÇÃO DE DUPLICADO: Mesmo cliente, data, hora e profissional
        // Se profissional for diferente em mesmo cliente/data/hora, pode ser serviço casado (split)
        const key = `${appt.customer_id}-${appt.date}-${appt.time}-${appt.provider_id}`;
        
        if (map.has(key)) {
            const existing = map.get(key);
            
            // Lógica de desempate:
            // 1. Manter 'Concluído' ou 'Em Andamento' sobre 'Pendente'
            // 2. Se ambos tiverem mesmo status, manter o que tem mais serviços (combined_service_names)
            // 3. Se empatar, manter o que foi criado/atualizado depois (maior probabilidade de ser o edidado)
            
            let keepOld = true;
            if (appt.status === 'Concluído' && existing.status !== 'Concluído') keepOld = false;
            else if (appt.status === 'Em Andamento' && existing.status === 'Pendente') keepOld = false;
            else if (appt.status === existing.status) {
                const newLen = (appt.combined_service_names || '').length;
                const oldLen = (existing.combined_service_names || '').length;
                if (newLen > oldLen) keepOld = false;
                else if (newLen === oldLen) {
                    if (new Date(appt.created_at || 0) > new Date(existing.created_at || 0)) keepOld = false;
                }
            }

            if (keepOld) {
                toDelete.push(appt.id);
                console.log(`🗑️ Marcado para remoção (duplicata): ${appt.id} [${key}] - Status: ${appt.status}`);
            } else {
                toDelete.push(existing.id);
                console.log(`🗑️ Marcado para remoção (duplicata anterior): ${existing.id} [${key}] - Status: ${existing.status}`);
                map.set(key, appt);
            }
        } else {
            map.set(key, appt);
        }
    });

    if (toDelete.length === 0) {
        console.log("✅ Nenhum duplicado encontrado.");
        return;
    }

    console.log(`✨ Total de duplicados encontrados: ${toDelete.length}`);
    
    // Executar deleção em lotes
    for (let i = 0; i < toDelete.length; i += 10) {
        const batch = toDelete.slice(i, i + 10);
        console.log(`♻️ Deletando lote ${i/10 + 1}...`);
        const { error: delError } = await supabase.from('appointments').delete().in('id', batch);
        if (delError) {
            console.error(`❌ Erro ao deletar lote ${batch}:`, delError);
        }
    }

    console.log("🏁 Auditoria e correção concluídas com sucesso!");
}

cleanup();
