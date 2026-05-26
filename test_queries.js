import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing credentials!");
    process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
    { name: 'providers', query: () => supabase.from('providers').select('*').limit(1) },
    { name: 'services', query: () => supabase.from('services').select('*').limit(1) },
    { name: 'stock_items', query: () => supabase.from('stock_items').select('*').eq('active', true).limit(1) },
    { name: 'usage_logs', query: () => supabase.from('usage_logs').select('*').limit(1) },
    { name: 'campaigns', query: () => supabase.from('campaigns').select('*').limit(1) },
    { name: 'pantry_items', query: () => supabase.from('pantry_items').select('*').limit(1) },
    { name: 'pantry_logs', query: () => supabase.from('pantry_logs').select('*').limit(1) },
    { name: 'leads', query: () => supabase.from('leads').select('*').limit(1) },
    { name: 'partners', query: () => supabase.from('partners').select('*').limit(1) },
    { name: 'partner_exchanges', query: () => supabase.from('partner_exchanges').select('*').limit(1) },
    { name: 'expense_categories', query: () => supabase.from('expense_categories').select('*').limit(1) },
    { name: 'payment_settings', query: () => supabase.from('payment_settings').select('*').limit(1) },
    { name: 'commission_settings', query: () => supabase.from('commission_settings').select('*').limit(1) },
    { name: 'suppliers', query: () => supabase.from('suppliers').select('*').limit(1) },
    { name: 'nfse_records', query: () => supabase.from('nfse_records').select('*').limit(1) },
    { name: 'customers', query: () => supabase.from('customers').select('*').limit(1) },
    { name: 'appointments', query: () => supabase.from('appointments').select('*').limit(1) },
    { name: 'sales', query: () => supabase.from('sales').select('*').limit(1) },
    { name: 'expenses', query: () => supabase.from('expenses').select('*').limit(1) },
    { name: 'financial_config', query: () => supabase.from('financial_config').select('*').limit(1) },
    { name: 'professional_fiscal_config', query: () => supabase.from('professional_fiscal_config').select('*').limit(1) },
    { name: 'employees', query: () => supabase.from('employees').select('*').limit(1) },
    { name: 'payroll', query: () => supabase.from('payroll').select('*').limit(1) },
    { name: 'employee_loans', query: () => supabase.from('employee_loans').select('*').limit(1) },
];

async function run() {
    console.log("Starting query diagnostic test...");
    for (const t of tables) {
        try {
            const { data, error } = await t.query();
            if (error) {
                console.error(`❌ Table "${t.name}" failed: ${error.message} (Code: ${error.code})`);
            } else {
                console.log(`✅ Table "${t.name}" succeeded. Found: ${data?.length || 0} rows (limited to 1)`);
            }
        } catch (err) {
            console.error(`💥 Table "${t.name}" threw an exception:`, err);
        }
    }
    console.log("Diagnostic test completed.");
}

run();
