import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZGF6cWhndnZlbGNqdXJpZ2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM4NTI5NywiZXhwIjoyMDg0OTYxMjk3fQ.g6GobuEV8PYw92hzHjz303xRYYl7etqrfcSDMxh37WM'; // service_role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    log('Searching for Patricia Prata...');
    const { data: customers, error: cError } = await supabase
        .from('customers')
        .select('id, name')
        .ilike('name', '%Patricia Prata%');

    if (cError) {
        log('Error fetching customers: ' + JSON.stringify(cError));
        fs.writeFileSync('check-results.json', output);
        return;
    }

    if (!customers || customers.length === 0) {
        log('No customer found.');
        fs.writeFileSync('check-results.json', output);
        return;
    }

    const customer = customers[0];
    log(`Found Customer: ${customer.name} (ID: ${customer.id})`);

    const date = '2026-03-27';
    log(`Searching for appointments on ${date}...`);
    const { data: appts, error: aError } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('date', date);

    if (aError) {
        log('Error fetching appointments: ' + JSON.stringify(aError));
        fs.writeFileSync('check-results.json', output);
        return;
    }

    log(`Found ${appts?.length || 0} appointments.`);
    
    log('Fetching services to map IDs...');
    const { data: services, error: sError } = await supabase
        .from('services')
        .select('id, name');

    if (sError) {
        log('Error fetching services: ' + JSON.stringify(sError));
        fs.writeFileSync('check-results.json', output);
        return;
    }

    const serviceMap = Object.fromEntries(services.map(s => [s.id, s.name]));
    
    log('Fetching providers to map IDs...');
    const { data: providers, error: pError } = await supabase
        .from('providers')
        .select('id, name');
    
    if (pError) {
        log('Error fetching providers: ' + JSON.stringify(pError));
        fs.writeFileSync('check-results.json', output);
        return;
    }

    const providerMap = Object.fromEntries(providers.map(p => [p.id, p.name]));

    const results = {
        customer,
        appointments: appts?.map(a => ({
            ...a,
            service_name: serviceMap[a.service_id],
            provider_name: providerMap[a.provider_id],
            additional_services_mapped: a.additional_services?.map((as: any) => ({
                ...as,
                service_name: serviceMap[as.service_id],
                provider_name: providerMap[as.provider_id]
            }))
        }))
    };

    fs.writeFileSync('check-results.json', JSON.stringify(results, null, 2));
    log('Results written to check-results.json');
}

checkData();
