import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Verifying category...');
    const { data: categories } = await supabase.from('expense_categories').select('*').eq('name', 'Repasse Comissão');

    if (categories && categories.length > 0) {
        console.log('Category already exists:', categories[0]);
    } else {
        console.log('Inserting category...');
        const { error } = await supabase.from('expense_categories').insert([{
            name: 'Repasse Comissão',
            dre_class: 'EXPENSE_ADM',
            is_system: true
        }]);

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Successfully inserted category Repasse Comissão.');
        }
    }
}
run();
