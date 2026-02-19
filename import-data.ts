
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Role Key if available to bypass RLS, else Anon
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = "C:\\Users\\Lenovo\\Downloads\\Avec SalãoVIP - Sistema de Administração.xlsx";

async function main() {
    console.log("Starting import process...");

    // 1. Load Reference Data
    console.log("Loading reference data...");

    const { data: providers, error: provError } = await supabase.from('providers').select('id, name');
    if (provError) throw provError;
    console.log(`Loaded ${providers.length} providers.`);

    console.log("Loading services...");
    let services = [];
    try {
        const { data, error } = await supabase.from('services').select('id, name, price');
        if (error) throw error;
        services = data;
        console.log(`Loaded ${services.length} services.`);
    } catch (err) {
        console.error("CRITICAL ERROR loading services:", err);
        process.exit(1);
    }

    const { data: customers, error: custError } = await supabase.from('customers').select('id, name, phone');
    if (custError) throw custError;
    console.log(`Loaded ${customers.length} customers.`);

    // 2. Read Excel
    console.log("Reading Excel file...");
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]; // Array of arrays

    // Headers: ["date","time","Cliente","Celular","Profissional","Serviço","Status"]
    const headers = rawData[0];
    let dataRows = rawData.slice(1);

    console.log(`Found ${dataRows.length} total rows.`);

    // DEBUG: Process only first 20 rows to test
    // dataRows = dataRows.slice(0, 20); 
    // console.log(`DEBUG: Processing subset of ${dataRows.length} rows.`);

    const processedAppointments = [];
    const errors = [];

    // Manual Mappings based on list-providers output
    const providerMap = {
        'Grazi': 'Grazi',
        'Marcia': 'Marcia',
        'Vitoria': 'Vitória',
        'Jessica': 'Jhenny',
        'Jéssica': 'Jhenny',
        'Massa': 'Mancen',
        'Renata': 'Renata',
        'Kellen': 'Kellen',
        'Ge': 'Ge',
        'Mari': 'Mari',
        'Raquel': 'Raquel',
    };

    const serviceMap = {
        'Manutenção': 'Manutenção',
        'Pé e Mão': 'TRADICIONAL',
        'Escova': 'ESCOVA',
        'Pé': 'PEDICURE Trad',
        'Mão': 'TRADICIONAL',
        'Hidratação': 'HYDRA Gloss',
        'Botox': 'TRADICIONAL',
        'Corte': 'TRADICIONAL',
        'Coloração': 'TRADICIONAL',
    };

    let loopCount = 0;
    for (const row of dataRows) {
        loopCount++;
        if (row.length === 0) continue;

        const dateStr = row[0]; // "21/02/2026"
        const timeStr = row[1]; // "15:00"
        const clientName = row[2];
        const clientPhone = row[3];
        let providerName = row[4];
        let serviceName = row[5];
        const status = row[6];

        // 3. Parse Date
        if (!dateStr || !timeStr) continue;

        const [day, month, year] = dateStr.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const cutoffDate = new Date(2026, 1, 18);

        if (dateObj < cutoffDate) {
            if (loopCount % 100 === 0) console.log(`Row ${loopCount}: Skipped (Date ${dateStr} < Cutoff)`);
            continue;
        }

        console.log(`Row ${loopCount}: Processing ${dateStr} ${timeStr} - ${clientName}`);

        // Format Date: YYYY-MM-DD
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Format Time: HH:MM:SS
        let isoTime = timeStr;
        if (typeof timeStr === 'string') {
            if (timeStr.length === 5) isoTime += ':00';
        }

        // 4. Match Entity

        if (providerMap[providerName]) providerName = providerMap[providerName];
        if (serviceMap[serviceName]) serviceName = serviceMap[serviceName];

        let provider = providers.find(p => p.name.toLowerCase() === providerName?.toLowerCase());
        if (!provider) {
            provider = providers.find(p => p.name.toLowerCase().includes(providerName?.toLowerCase()));
        }

        if (!provider) {
            console.log(` -> Provider not found: ${providerName}`);
            errors.push(`Provider not found: ${providerName} (Original: ${row[4]}) for appointment on ${dateStr}`);
            continue;
        }

        let service = services.find(s => s.name.toLowerCase() === serviceName?.toLowerCase());
        if (!service) {
            service = services.find(s => s.name.toLowerCase().includes(serviceName?.toLowerCase()));
        }

        if (!service) {
            console.log(` -> Service not found: ${serviceName}`);
            errors.push(`Service not found: ${serviceName} (Original: ${row[5]}) for appointment on ${dateStr}`);
            continue;
        }

        // Match or Create Customer
        let customerId = null;
        let normalizedPhone = String(clientPhone).replace(/\D/g, '');

        let customer = customers.find(c => c.phone && c.phone.replace(/\D/g, '') === normalizedPhone);
        if (!customer) {
            customer = customers.find(c => c.name.toLowerCase() === clientName?.toLowerCase());
        }

        if (customer) {
            customerId = customer.id;
        } else {
            console.log(` -> Creating new customer: ${clientName}`);
            const { data: newCust, error: createError } = await supabase.from('customers').insert({
                name: clientName,
                phone: clientPhone,
                registration_date: new Date().toISOString(),
                status: 'Novo',
                total_spent: 0
            }).select().single();

            if (createError) {
                console.log(` -> Error creating customer: ${createError.message}`);
                errors.push(`Failed to create customer ${clientName}: ${createError.message}`);
                continue;
            }
            customerId = newCust.id;
            customers.push(newCust);
        }

        // Check for existing appointment
        // console.log(` -> Checking duplicate...`);
        const { data: existingAppt } = await supabase
            .from('appointments')
            .select('id')
            .match({
                provider_id: provider.id,
                date: isoDate,
                time: isoTime
            })
            .maybeSingle();

        if (existingAppt) {
            // console.log(` -> Duplicate skipped regarding DB.`);
            continue;
        }

        // Check for duplicate in current batch
        const isBatchDuplicate = processedAppointments.some(appt =>
            appt.provider_id === provider.id &&
            appt.date === isoDate &&
            appt.time === isoTime
        );

        if (isBatchDuplicate) {
            console.log(` -> Duplicate skipped (found in current batch).`);
            continue;
        }

        const appointment = {
            customer_id: customerId,
            provider_id: provider.id,
            service_id: service.id,
            date: isoDate,
            time: isoTime,
            status: status === 'Pendente' ? 'Pendente' : 'Confirmado',
            price_paid: 0,
            booked_price: service.price,
            is_courtesy: false
        };

        processedAppointments.push(appointment);
    }

    console.log(`Prepared ${processedAppointments.length} appointments to insert.`);

    // 6. Insert Logic
    let successCount = 0;
    for (const appt of processedAppointments) {
        const { error } = await supabase.from('appointments').insert(appt);
        if (error) {
            console.log(` -> Insert Error: ${error.message}`);
            errors.push(`Failed to insert appointment for ${appt.date} ${appt.time}: ${error.message}`);
        } else {
            successCount++;
            if (successCount % 10 === 0) process.stdout.write('.');
        }
    }

    console.log(`\nImport completed.`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errors.length}`);

    const errorLogPath = path.resolve(__dirname, 'import-errors.log');
    fs.writeFileSync(errorLogPath, errors.join('\n'));
}

main().catch(console.error);
