
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateHR() {
    console.log("🚀 Criando tabelas de Recursos Humanos...");

    const queries = [
        `CREATE TABLE IF NOT EXISTS employees (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            pix_key TEXT,
            base_salary NUMERIC DEFAULT 0,
            admission_date DATE DEFAULT CURRENT_DATE,
            active BOOLEAN DEFAULT TRUE,
            avatar TEXT,
            bank_info TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );`,
        `CREATE TABLE IF NOT EXISTS payroll (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES employees(id),
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            base_salary NUMERIC DEFAULT 0,
            commissions NUMERIC DEFAULT 0,
            bonus NUMERIC DEFAULT 0,
            deductions NUMERIC DEFAULT 0,
            loan_deduction NUMERIC DEFAULT 0,
            net_salary NUMERIC DEFAULT 0,
            payment_date DATE,
            status TEXT DEFAULT 'PENDENTE',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );`,
        `CREATE TABLE IF NOT EXISTS employee_loans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES employees(id),
            date DATE DEFAULT CURRENT_DATE,
            total_amount NUMERIC NOT NULL,
            installments INTEGER DEFAULT 1,
            installment_amount NUMERIC NOT NULL,
            remaining_amount NUMERIC NOT NULL,
            status TEXT DEFAULT 'ATIVO',
            reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );`
    ];

    for (const sql of queries) {
        // Warning: Supabase client doesn't have a direct 'query' method. 
        // We usually use RPC for this if a 'exec_sql' function exists.
        // If not, we'll inform the user to run it in the dashboard.
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error(`❌ Erro ao executar SQL (isso é esperado se você não tiver a função rpc exec_sql):`, error.message);
            console.log("Acesse o Dashboard do Supabase > SQL Editor e cole o seguinte código:");
            console.log(sql);
        } else {
            console.log("✅ SQL executado com sucesso.");
        }
    }

    // Seed Initial Data
    console.log("\n🌱 Inserindo Kayto e Sara como colaboradores...");
    const { data: existing } = await supabase.from('employees').select('name');
    const existingNames = (existing || []).map(e => e.name);

    const seeds = [
        { name: 'Kayto', role: 'Colaborador', base_salary: 0 },
        { name: 'SARA PATROCIONIO DE ANDRADE', role: 'Colaborador', base_salary: 0 }
    ].filter(s => !existingNames.includes(s.name));

    if (seeds.length > 0) {
        const { error: seedError } = await supabase.from('employees').insert(seeds);
        if (seedError) console.error("Erro no seed:", seedError.message);
        else console.log("✅ Kayto e Sara adicionados.");
    } else {
        console.log("ℹ️ Funcionários já existem.");
    }
}

migrateHR();
