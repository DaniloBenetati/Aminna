// Simple script to apply the missing database columns directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseKey = 'sb_publishable_s9Liw_EHf5u10063n2-HVA_njRpfSb1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('🔧 Applying database migration...\n');

    try {
        // First, check if the columns already exist by trying to query them
        console.log('📊 Checking current database schema...');
        const { data: testData, error: testError } = await supabase
            .from('providers')
            .select('id, order, commission_history')
            .limit(1);

        if (!testError) {
            console.log('✅ Columns already exist! Migration may have been applied previously.');
            console.log('   The database schema is correct.');
            return;
        }

        // If we get here, the columns don't exist
        console.log('⚠️  Columns missing. Manual migration required.\n');
        console.log('Please follow these steps:\n');
        console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/eedazqhgvvelcjurigla');
        console.log('2. Navigate to: SQL Editor (in the left sidebar)');
        console.log('3. Click "New Query"');
        console.log('4. Copy and paste this SQL:\n');
        console.log('--------- SQL START ---------');
        console.log('ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "order" INTEGER;');
        console.log("ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS commission_history JSONB DEFAULT '[]'::jsonb;");
        console.log('CREATE INDEX IF NOT EXISTS idx_providers_order ON public.providers("order");');
        console.log('--------- SQL END ---------\n');
        console.log('5. Click "Run" or press Ctrl+Enter');
        console.log('6. Run this script again to verify\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

applyMigration();
