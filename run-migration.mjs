// Script to verify Supabase connection and Full Schema Synchronization
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseKey = 'sb_publishable_s9Liw_EHf5u10063n2-HVA_njRpfSb1'; // Anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySystem() {
    console.log('🔌 Testing Connection to Supabase...');
    console.log('   URL:', supabaseUrl);

    try {
        // 1. Basic Connection & Providers Check
        const { data: providers, error: connError } = await supabase.from('providers').select('count', { count: 'exact', head: true });

        if (connError) {
            throw new Error(`Connection Failed: ${connError.message}`);
        }
        console.log('✅ Connection Successful!');
        console.log(`   Found ${providers?.length ?? 'active'} providers.`);

        console.log('\n📊 Verifying Schema Sync (Checking key tables and columns)...');

        const checks = [
            { table: 'appointments', column: 'end_time', name: 'Agenda Fix (end_time)' },
            { table: 'providers', column: 'custom_durations', name: 'Agenda Fix (custom_durations)' },
            { table: 'leads', column: 'id', name: 'CRM Module (leads table)' },
            { table: 'campaigns', column: 'id', name: 'Marketing Module (campaigns table)' },
            { table: 'expenses', column: 'id', name: 'Finance Module (expenses table)' },
            { table: 'stock_items', column: 'id', name: 'Stock Module (stock_items table)' },
            { table: 'expense_categories', column: 'id', name: 'Settings (expense_categories)' },
            { table: 'payment_settings', column: 'id', name: 'Settings (payment_settings)' },
            { table: 'commission_settings', column: 'id', name: 'Settings (commission_settings)' }
        ];

        let allGood = true;

        for (const check of checks) {
            const { error } = await supabase.from(check.table).select(check.column).limit(1);
            if (error) {
                console.log(`❌ Missing: ${check.name} - Table/Column not found.`);
                console.log(`   Error: ${error.message}`);
                allGood = false;
            } else {
                console.log(`✅ Verified: ${check.name}`);
            }
        }

        if (allGood) {
            console.log('\n✨ EXCELLENT! The database is fully synchronized.');
            console.log('   All modules (Agenda, CRM, Finance, Stock) should work correctly.');
        } else {
            console.log('\n⚠️  SOME PARTS ARE MISSING.');
            console.log('   Please run the "full_schema_sync.sql" script in your Supabase Dashboard.');
        }

    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error.message);
        console.log('   Please check your internet connection or Supabase project status.');
    }
}

verifySystem();
