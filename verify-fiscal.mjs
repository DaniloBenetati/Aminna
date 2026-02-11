import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseKey = 'sb_publishable_s9Liw_EHf5u10063n2-HVA_njRpfSb1'; // Anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFiscal() {
    console.log('🔍 Verifying Fiscal Configuration...');

    const { data, error } = await supabase.from('fiscal_config').select('*').single();

    if (error) {
        console.error('❌ Error fetching fiscal_config:', error.message);
        return;
    }

    if (!data) {
        console.error('❌ No fiscal_config record found.');
        return;
    }

    console.log('✅ fiscal_config found.');
    console.log('   ID:', data.id);
    console.log('   Salon Name:', data.salon_name);
    console.log('   CNPJ:', data.cnpj);

    // Check Token specifically
    if (data.focus_nfe_token) {
        console.log('   Focus NFe Token: [PRESENT] (Starts with: ' + data.focus_nfe_token.substring(0, 3) + '...)');
    } else {
        console.log('   Focus NFe Token: [MISSING/NULL]');
    }

    console.log('   Environment:', data.focus_nfe_environment);
    console.log('   Certificate:', data.certificate_url ? 'Uploaded' : 'Missing');
    console.log('   Certificate Expiry:', data.certificate_expires_at);

}

verifyFiscal();
