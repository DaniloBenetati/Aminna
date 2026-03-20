
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function syncHR() {
    console.log("🚀 Iniciando Sincronização de Recursos Humanos...");

    // 1. Encontrar IDs dos fornecedores
    const { data: suppliers } = await supabase.from('suppliers').select('id, name');
    const kaytoSupplier = suppliers?.find(s => s.name.toUpperCase().includes('KAYTO'));
    const saraSupplier = suppliers?.find(s => s.name.toUpperCase().includes('SARA PATROCIONIO'));

    console.log(`- Fornecedor Kayto: ${kaytoSupplier?.id || 'Não encontrado'}`);
    console.log(`- Fornecedor Sara: ${saraSupplier?.id || 'Não encontrado'}`);

    // 2. Criar/Atualizar Funcionários com dados do PDF
    const employeesData = [
        {
            name: 'Kayto Jordan Alves Vital',
            role: 'Recepcionista',
            base_salary: 1804.00,
            admission_date: '2025-08-18',
            active: true
        },
        {
            name: 'SARA PATROCIONIO DE ANDRADE',
            role: 'Recepcionista',
            base_salary: 1804.00,
            admission_date: '2025-08-18',
            active: true
        }
    ];

    for (const emp of employeesData) {
        const { data: existing } = await supabase.from('employees').select('id').ilike('name', `%${emp.name.split(' ')[0]}%`).limit(1);
        if (existing && existing.length > 0) {
            console.log(`- Atualizando funcionário: ${emp.name}`);
            await supabase.from('employees').update(emp).eq('id', existing[0].id);
        } else {
            console.log(`- Criando funcionário: ${emp.name}`);
            await supabase.from('employees').insert([emp]);
        }
    }

    // Recarregar os funcionários para ter os IDs corretos
    const { data: allEmployees } = await supabase.from('employees').select('id, name');
    const kaytoEmp = allEmployees?.find(e => e.name.toUpperCase().includes('KAYTO'));
    const saraEmp = allEmployees?.find(e => e.name.toUpperCase().includes('SARA PATROCIONIO'));

    if (!kaytoEmp || !saraEmp) {
        console.error("❌ Funcionários não encontrados após criação/atualização.");
        return;
    }

    // 3. Registrar Folha de Fevereiro 2026
    const febPayroll = [
        {
            employee_id: kaytoEmp.id,
            month: 2,
            year: 2026,
            base_salary: 1804.00,
            commissions: 0,
            bonus: 0,
            deductions: 138.04,
            loan_deduction: 0,
            net_salary: 1665.96,
            payment_date: '2026-03-04',
            status: 'PAGO'
        },
        {
            employee_id: saraEmp.id,
            month: 2,
            year: 2026,
            base_salary: 1804.00,
            commissions: 0,
            bonus: 0,
            deductions: 246.28, // 138.04 + 108.24
            loan_deduction: 0,
            net_salary: 1557.72,
            payment_date: '2026-03-04',
            status: 'PAGO'
        }
    ];

    console.log("- Registrando folha de Fevereiro/2026...");
    for (const pay of febPayroll) {
        const { data: existingPay } = await supabase.from('payroll')
            .select('id')
            .eq('employee_id', pay.employee_id)
            .eq('month', pay.month)
            .eq('year', pay.year)
            .limit(1);
        
        if (existingPay && existingPay.length > 0) {
            await supabase.from('payroll').update(pay).eq('id', existingPay[0].id);
        } else {
            await supabase.from('payroll').insert([pay]);
        }
    }

    // 4. Buscar pagamentos históricos em 'expenses'
    const supplierIds = [kaytoSupplier?.id, saraSupplier?.id].filter(Boolean);
    if (supplierIds.length > 0) {
        const { data: expenses } = await supabase.from('expenses')
            .select('*')
            .in('supplier_id', supplierIds)
            .order('date', { ascending: false });
        
        console.log(`- Encontrados ${expenses?.length || 0} lançamentos financeiros vinculados.`);
    }

    console.log("✅ Concluído!");
}

syncHR();
