
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = "C:\\Users\\Lenovo\\Downloads\\Avec SalãoVIP - Sistema de Administração (1).xlsx";

async function main() {
    console.log("Starting re-import process (ESM JS version) with corrected indices...");

    // 1. Load Reference Data
    const { data: providers, error: provError } = await supabase.from('providers').select('id, name, nickname');
    if (provError) throw provError;
    
    const { data: services, error: svcError } = await supabase.from('services').select('id, name, price');
    if (svcError) throw svcError;

    const { data: customersRaw, error: custError } = await supabase.from('customers').select('id, name, phone');
    if (custError) throw custError;
    let customers = customersRaw;

    // 2. Read Excel
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rawData.slice(1);

    console.log(`Processing ${dataRows.length} rows from Excel.`);

    const appointmentsToInsert = [];
    const errors = [];

    // Indices based on inspection:
    // [0] date, [1] time, [2] Cliente, [3] Celular, [4] Data Cadastro (Ignored), [5] Profissional, [6] Serviço, [7] Status

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length < 8) continue;

        const dateStr = row[0];
        const timeStr = row[1];
        const clientName = row[2];
        const clientPhone = row[3];
        const profNickname = row[5]; // Corrected index
        const serviceName = row[6];  // Corrected index
        let status = row[7];       // Corrected index

        if (!dateStr || !timeStr || !clientName) continue;

        const [day, month, year] = String(dateStr).split('/').map(Number);
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (isoDate < '2026-03-15') continue;

        let isoTime = String(timeStr);
        if (isoTime.length === 5) isoTime += ':00';

        // Match Provider by Nickname
        let provider = providers.find(p => p.nickname && p.nickname.toLowerCase() === String(profNickname || '').toLowerCase());
        if (!provider) {
            provider = providers.find(p => p.name.toLowerCase() === String(profNickname || '').toLowerCase());
        }
        if (!provider) {
             errors.push(`Profissional não encontrado: ${profNickname} para data ${dateStr}`);
             continue;
        }

        // Match Service
        let service = services.find(s => s.name.toLowerCase() === String(serviceName || '').toLowerCase());
        if (!service) {
             service = services.find(s => s.name.toLowerCase().includes(String(serviceName || '').toLowerCase()));
        }
        if (!service) {
             errors.push(`Serviço não encontrado: ${serviceName} para data ${dateStr}`);
             continue;
        }

        // Match or Create Customer
        let customer = customers.find(c => c.name.toLowerCase() === String(clientName).toLowerCase());
        if (!customer && clientPhone) {
            const normalizedPhone = String(clientPhone).replace(/\D/g, '');
            customer = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === normalizedPhone);
        }

        let customerId;
        if (customer) {
            customerId = customer.id;
        } else {
            console.log(`Creating customer: ${clientName}`);
            const { data: newCust, error: createError } = await supabase.from('customers').insert({
                name: clientName,
                phone: clientPhone ? String(clientPhone).replace(/\D/g, '') : null,
                registration_date: new Date().toISOString(),
                status: 'Novo'
            }).select().single();

            if (createError) {
                errors.push(`Falha ao criar cliente ${clientName}: ${createError.message}`);
                continue;
            }
            customerId = newCust.id;
            customers.push(newCust);
        }

        if (status === 'Agendado') status = 'Pendente';

        appointmentsToInsert.push({
            customer_id: customerId,
            provider_id: provider.id,
            service_id: service.id,
            date: isoDate,
            time: isoTime,
            status: status || 'Pendente',
            booked_price: service.price || 0,
            price_paid: 0,
            is_courtesy: false
        });
    }

    console.log(`Ready to insert ${appointmentsToInsert.length} appointments.`);

    if (appointmentsToInsert.length > 0) {
        for (let i = 0; i < appointmentsToInsert.length; i += 100) {
            const batch = appointmentsToInsert.slice(i, i + 100);
            const { error: insertError } = await supabase.from('appointments').insert(batch);
            if (insertError) {
                console.error("Batch Insert Error:", insertError);
                errors.push(`Batch insert failed starting at ${i}: ${insertError.message}`);
            } else {
                process.stdout.write(".");
            }
        }
        console.log("\nBatch insertion complete.");
    }

    if (errors.length > 0) {
        console.log(`Completed with ${errors.length} errors. See import-future-errors.log`);
        fs.writeFileSync('import-future-errors.log', errors.join('\n'));
    } else {
        console.log("Completed successfully with no errors.");
        if (fs.existsSync('import-future-errors.log')) fs.unlinkSync('import-future-errors.log');
    }
}

main().catch(console.error);
