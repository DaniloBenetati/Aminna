
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = "C:\\Users\\Lenovo\\Downloads\\Avec SalãoVIP - Sistema de Administração (1).xlsx";

async function main() {
    console.log("Starting re-import process for future appointments...");

    // 1. Load Reference Data
    const { data: providers, error: provError } = await supabase.from('providers').select('id, name, nickname');
    if (provError) throw provError;
    
    const { data: services, error: svcError } = await supabase.from('services').select('id, name, price');
    if (svcError) throw svcError;

    // Load customers (simple fetch for this script, could be optimized if huge)
    const { data: customersRaw, error: custError } = await supabase.from('customers').select('id, name, phone');
    if (custError) throw custError;
    let customers = customersRaw;

    // 2. Read Excel
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const dataRows = rawData.slice(1);

    console.log(`Processing ${dataRows.length} rows from Excel.`);

    const appointmentsToInsert = [];
    const errors = [];

    for (const row of dataRows) {
        if (!row || row.length === 0) continue;

        const dateStr = row[0]; // "DD/MM/YYYY"
        const timeStr = row[1]; // "HH:MM"
        const clientName = row[2];
        const clientPhone = row[3];
        const profNickname = row[4];
        const serviceName = row[5];
        let status = row[6];

        if (!dateStr || !timeStr || !clientName) continue;

        const [day, month, year] = dateStr.split('/').map(Number);
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Skip if before 15/03/2026
        if (isoDate < '2026-03-15') continue;

        let isoTime = timeStr;
        if (typeof timeStr === 'string' && timeStr.length === 5) isoTime += ':00';

        // Match Provider by Nickname
        let provider = providers.find(p => p.nickname?.toLowerCase() === profNickname?.toLowerCase());
        if (!provider) {
            provider = providers.find(p => p.name.toLowerCase() === profNickname?.toLowerCase());
        }
        if (!provider) {
             errors.push(`Profissional não encontrado: ${profNickname} para data ${dateStr}`);
             continue;
        }

        // Match Service
        let service = services.find(s => s.name.toLowerCase() === serviceName?.toLowerCase());
        if (!service) {
             service = services.find(s => s.name.toLowerCase().includes(serviceName?.toLowerCase()));
        }
        if (!service) {
             // Default to a generic service if not found or log error? User wants "conforme dados da tabela"
             errors.push(`Serviço não encontrado: ${serviceName} para data ${dateStr}`);
             continue;
        }

        // Match or Create Customer
        let customer = customers.find(c => c.name.toLowerCase() === clientName.toLowerCase());
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

        // Map Status: Agendado -> Pendente
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

    // Batch Insert (Supabase handles this well)
    const { error: insertError } = await supabase.from('appointments').insert(appointmentsToInsert);
    if (insertError) {
        console.error("Insert Error:", insertError);
        errors.push(`Insert failed: ${insertError.message}`);
    } else {
        console.log("Successfully inserted appointments.");
    }

    if (errors.length > 0) {
        console.log("Completed with some errors. See import-future-errors.log");
        fs.writeFileSync('import-future-errors.log', errors.join('\n'));
    } else {
        console.log("Completed successfully with no errors.");
    }
}

main().catch(console.error);
