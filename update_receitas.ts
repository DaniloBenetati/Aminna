import { supabase } from './services/supabase';

async function main() {
    console.log('Upading RECEITA bank_transactions to Serviço...');
    const { data, error } = await supabase
        .from('bank_transactions')
        .update({ system_category: 'Serviço' })
        .eq('type', 'RECEITA');

    if (error) {
        console.error('Error updating:', error);
    } else {
        console.log('Successfully updated.');
    }
}

main();
