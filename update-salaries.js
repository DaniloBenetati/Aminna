
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function updateEmployeeSalaries() {
    console.log("🚀 Atualizando salários base dos funcionários...");

    const { data: employees } = await supabase.from('employees').select('id, name');
    
    if (!employees) return;

    for (const emp of employees) {
        if (emp.name.toUpperCase().includes('KAYTO') || emp.name.toUpperCase().includes('SARA')) {
            console.log(`- Atualizando ${emp.name} para R$ 1804.00`);
            await supabase.from('employees').update({ base_salary: 1804.00 }).eq('id', emp.id);
        }
    }

    console.log("✅ Atualização concluída!");
}

updateEmployeeSalaries();
