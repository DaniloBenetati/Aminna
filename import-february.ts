
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = "C:\\Users\\Danilo Souza\\Downloads\\Avec SalãoVIP - Sistema de Administração fevereiro.xlsx";

async function main() {
    console.log("Iniciando importação de Fevereiro/2026 (Fix)...");

    // 1. Load Reference Data
    console.log("Carregando profissionais...");
    const { data: providers, error: provError } = await supabase.from('providers').select('id, name, nickname');
    if (provError) throw provError;
    console.log(`Carregadas ${providers.length} profissionais.`);
    
    // Log nicknames to help mapping
    // providers.forEach(p => console.log(` -> ${p.name} (Nickname: ${p.nickname})`));

    console.log("Carregando serviços...");
    const { data: services, error: svcError } = await supabase.from('services').select('id, name, price');
    if (svcError) throw svcError;

    // Use paginated fetch for customers
    async function fetchAllCustomers() {
        let allCustomers: any[] = [];
        let from = 0;
        let to = 999;
        let finished = false;
        while (!finished) {
            const { data, error } = await supabase.from('customers').select('id, name, phone').range(from, to);
            if (error) throw error;
            if (data.length === 0) {
                finished = true;
            } else {
                allCustomers = allCustomers.concat(data);
                from += 1000;
                to += 1000;
            }
        }
        return allCustomers;
    }

    console.log("Carregando clientes...");
    let customers = await fetchAllCustomers();
    console.log(`Carregados ${customers.length} clientes.`);

    // 2. Read Excel
    console.log("Lendo arquivo Excel...");
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const dataRows = rawData.slice(1);

    const appointmentsToInsert = [];
    const errors = [];

    // 3. Fetch Existing Appointments for February
    const { data: existingAppts, error: fetchError } = await supabase
        .from('appointments')
        .select('customer_id, provider_id, date, time')
        .gte('date', '2026-02-01')
        .lte('date', '2026-02-28');
    
    if (fetchError) throw fetchError;

    const existingKeys = new Set(existingAppts.map(a => 
        `${a.customer_id}-${a.provider_id}-${a.date}-${a.time}`
    ));

    const providerNickMap: Record<string, string> = {
        'Isa': 'Isadora',
        'Beth': 'Elisabete',
    };

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length < 6) continue;

        const dateStr = row[0];
        const timeStr = row[1];
        const clientName = row[2];
        const clientPhone = row[3];
        let profNickname = row[4]; 
        const serviceName = row[5];  
        let status = row[6];       

        if (!dateStr || !timeStr || !clientName) continue;

        const dateParts = String(dateStr).split('/');
        if (dateParts.length < 3) continue;
        const [day, month, year] = dateParts.map(Number);
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (!isoDate.startsWith('2026-02')) continue;

        let isoTime = String(timeStr);
        if (isoTime.length === 5) isoTime += ':00';

        // Apply mapping if needed
        if (profNickname && providerNickMap[profNickname]) {
            profNickname = providerNickMap[profNickname];
        }

        // Match Provider
        let provider = providers.find(p => p.nickname && p.nickname.toLowerCase() === String(profNickname || '').toLowerCase());
        if (!provider) {
            provider = providers.find(p => p.name.toLowerCase() === String(profNickname || '').toLowerCase());
        }
        if (!provider) {
             errors.push(`Profissional não encontrado: ${profNickname} (${row[4]}) para data ${dateStr} ${timeStr}`);
             continue;
        }

        // Match Service
        let service = services.find(s => s.name.toLowerCase() === String(serviceName || '').toLowerCase());
        if (!service) {
             service = services.find(s => s.name.toLowerCase().includes(String(serviceName || '').toLowerCase()));
        }
        if (!service) {
             errors.push(`Serviço não encontrado: ${serviceName} para data ${dateStr} ${timeStr}`);
             continue;
        }

        // Match or Create Customer
        let customer = customers.find(c => c.name.toLowerCase() === String(clientName).toLowerCase());
        const normalizedPhone = clientPhone ? String(clientPhone).replace(/\D/g, '') : null;
        
        if (!customer && normalizedPhone) {
            customer = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === normalizedPhone);
        }

        let customerId;
        if (customer) {
            customerId = customer.id;
        } else {
            const { data: newCust, error: createError } = await supabase.from('customers').insert({
                name: clientName,
                phone: normalizedPhone,
                registration_date: new Date().toISOString(),
                status: 'Novo'
            }).select().single();

            if (createError) {
                // If phone already exists, fetch the existing customer
                if (createError.message.includes('unique_customer_phone') && normalizedPhone) {
                    const { data: existingCust } = await supabase
                        .from('customers')
                        .select('id, name, phone')
                        .eq('phone', normalizedPhone)
                        .maybeSingle();
                    if (existingCust) {
                        customerId = existingCust.id;
                        customers.push(existingCust);
                    } else {
                        errors.push(`Falha crítica ao recuperar cliente existente ${clientName} (${normalizedPhone})`);
                        continue;
                    }
                } else {
                    errors.push(`Falha ao criar cliente ${clientName}: ${createError.message}`);
                    continue;
                }
            } else {
                customerId = newCust.id;
                customers.push(newCust);
            }
        }

        // DEDUPLICATION CHECK
        const key = `${customerId}-${provider.id}-${isoDate}-${isoTime}`;
        if (existingKeys.has(key)) {
            continue;
        }

        // Map status
        if (status === 'Agendado' || status === 'Confirmado') status = 'Confirmado';
        else if (status === 'Pendente') status = 'Pendente';
        else if (status === 'Concluido' || status === 'Concluído') status = 'Concluído';
        else status = 'Pendente';

        appointmentsToInsert.push({
            customer_id: customerId,
            provider_id: provider.id,
            service_id: service.id,
            date: isoDate,
            time: isoTime,
            status: status,
            booked_price: service.price || 0,
            price_paid: 0,
            is_courtesy: false
        });
    }

    console.log(`Pronto para inserir ${appointmentsToInsert.length} agendamentos novos.`);

    if (appointmentsToInsert.length > 0) {
        // Dedup locally as well
        const seenInBatch = new Set();
        const finalBatch = appointmentsToInsert.filter(appt => {
            const key = `${appt.customer_id}-${appt.provider_id}-${appt.date}-${appt.time}`;
            if (seenInBatch.has(key)) return false;
            seenInBatch.add(key);
            return true;
        });

        console.log(`Após deduplicação local: ${finalBatch.length} agendamentos.`);

        for (let i = 0; i < finalBatch.length; i += 50) {
            const currentBatch = finalBatch.slice(i, i + 50);
            const { error: insertError } = await supabase.from('appointments').insert(currentBatch);
            if (insertError) {
                console.error("Erro na inserção do lote:", insertError.message);
                errors.push(`Falha na inserção do lote começando em ${i}: ${insertError.message}`);
            } else {
                process.stdout.write(".");
            }
        }
        console.log("\nInserção concluída.");
    }

    if (errors.length > 0) {
        console.log(`Finalizado com ${errors.length} alertas/erros. Verifique import-feb-errors.log`);
        fs.writeFileSync('import-feb-errors.log', errors.join('\n'));
    } else {
        console.log("Finalizado com sucesso sem erros.");
        if (fs.existsSync('import-feb-errors.log')) fs.unlinkSync('import-feb-errors.log');
    }
}

main().catch(console.error);
