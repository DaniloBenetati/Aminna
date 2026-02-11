import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseKey = 'sb_publishable_s9Liw_EHf5u10063n2-HVA_njRpfSb1'; // Anon key we found earlier

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLatestNFSe() {
    console.log('🔍 Fetching latest NFSe Record...');

    const { data, error } = await supabase
        .from('nfse_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('❌ Error fetching nfse_records:', error.message);
        return;
    }

    if (!data) {
        console.error('❌ No NFSe records found.');
        return;
    }

    console.log('✅ Latest NFSe Record Found:');
    console.log('   ID:', data.id);
    console.log('   Status:', data.status);
    console.log('   Reference:', data.reference);
    console.log('   NFSe Number:', data.nfse_number);
    console.log('   PDF URL:', data.pdf_url);
    console.log('   XML URL:', data.xml_url);

    console.log('   Focus Response (JSON):');
    try {
        // If it's already an object, log it. If string, parse it.
        const responseObj = typeof data.focus_response === 'string'
            ? JSON.parse(data.focus_response)
            : data.focus_response;
        console.dir(responseObj, { depth: null });
    } catch (e) {
        console.log('   (Could not parse focus_response)', data.focus_response);
    }
}

debugLatestNFSe();
