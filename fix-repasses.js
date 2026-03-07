import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Update existing repasses...');
    const { data: repasses, error: fetchError } = await supabase.from('expenses')
        .select('*')
        .like('description', 'Repasse%');

    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
    }

    console.log(`Found ${repasses?.length || 0} repasse expenses.`);

    let updatedCount = 0;
    for (const repasse of repasses || []) {
        if (repasse.category === 'Comissão' || repasse.origin === 'Outro' || repasse.origin === 'Outros') {
            const { error: updateError } = await supabase.from('expenses')
                .update({ category: 'Repasse Comissão', origin: 'Repasse Comissão' })
                .eq('id', repasse.id);

            if (updateError) {
                console.error(`Error updating expense ${repasse.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Successfully updated ${updatedCount} repasse expenses to have category and origin 'Repasse Comissão'.`);
}
run();
