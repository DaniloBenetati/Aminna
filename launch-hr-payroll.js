
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function launchPayroll() {
    console.log("🚀 Iniciando Lançamento de Folha de Pagamento até o Final do Ano...");

    // 1. Buscar Funcionários
    const { data: employees } = await supabase.from('employees').select('id, name');
    const kayto = employees?.find(e => e.name.toUpperCase().includes('KAYTO'));
    const sara = employees?.find(e => e.name.toUpperCase().includes('SARA'));

    if (!kayto || !sara) {
        console.error("❌ Funcionários não encontrados.");
        return;
    }

    const months = [
        { name: 'Janeiro', m: 1, year: 2026, payDay: '2026-02-05' },
        { name: 'Fevereiro', m: 2, year: 2026, payDay: '2026-03-05' },
        { name: 'Março', m: 3, year: 2026, payDay: '2026-04-05' },
        { name: 'Abril', m: 4, year: 2026, payDay: '2026-05-05' },
        { name: 'Maio', m: 5, year: 2026, payDay: '2026-06-05' },
        { name: 'Junho', m: 6, year: 2026, payDay: '2026-07-05' },
        { name: 'Julho', m: 7, year: 2026, payDay: '2026-08-05' },
        { name: 'Agosto', m: 8, year: 2026, payDay: '2026-09-05' },
        { name: 'Setembro', m: 9, year: 2026, payDay: '2026-10-05' },
        { name: 'Outubro', m: 10, year: 2026, payDay: '2026-11-05' },
        { name: 'Novembro', m: 11, year: 2026, payDay: '2026-12-05' },
        { name: 'Dezembro', m: 12, year: 2026, payDay: '2027-01-05' },
    ];

    const payrollToInsert = [];
    const expensesToInsert = [];

    for (const month of months) {
        // Kayto
        payrollToInsert.push({
            employee_id: kayto.id,
            month: month.m,
            year: month.year,
            base_salary: 1804.00,
            commissions: 0,
            bonus: 0,
            deductions: 138.04,
            loan_deduction: 0,
            net_salary: 1665.96,
            payment_date: month.payDay,
            status: 'PENDENTE'
        });

        expensesToInsert.push({
            description: `SALÁRIO MENSAL - ${kayto.name.split(' ')[0].toUpperCase()} - REF ${month.name}/${month.year}`,
            amount: 1665.96,
            date: month.payDay,
            category: 'PESSOAL ADMINISTRATIVO',
            status: 'PENDING',
            payment_method: 'PIX'
        });

        // Sara
        payrollToInsert.push({
            employee_id: sara.id,
            month: month.m,
            year: month.year,
            base_salary: 1804.00,
            commissions: 0,
            bonus: 0,
            deductions: 246.28,
            loan_deduction: 0,
            net_salary: 1557.72,
            payment_date: month.payDay,
            status: 'PENDENTE'
        });

        expensesToInsert.push({
            description: `SALÁRIO MENSAL - ${sara.name.split(' ')[0].toUpperCase()} - REF ${month.name}/${month.year}`,
            amount: 1557.72,
            date: month.payDay,
            category: 'PESSOAL ADMINISTRATIVO',
            status: 'PENDING',
            payment_method: 'PIX'
        });
    }

    // Buscar despesas existentes para evitar duplicidade
    const { data: existingExpenses } = await supabase.from('expenses').select('description');
    const existingDescSet = new Set(existingExpenses?.map(e => e.description) || []);

    const filteredExpenses = expensesToInsert.filter(ex => !existingDescSet.has(ex.description));
    
    // Buscar folha existente
    const { data: existingPayroll } = await supabase.from('payroll').select('employee_id, month, year');
    const existingPayrollSet = new Set(existingPayroll?.map(p => `${p.employee_id}-${p.month}-${p.year}`) || []);

    const filteredPayroll = payrollToInsert.filter(p => !existingPayrollSet.has(`${p.employee_id}-${p.month}-${p.year}`));

    console.log(`- Filtrados: Inserindo ${filteredPayroll.length} folhas e ${filteredExpenses.length} despesas (removendo duplicados)...`);

    // Inserir na tabela payroll
    if (filteredPayroll.length > 0) {
        const { error: payError } = await supabase.from('payroll').insert(filteredPayroll);
        if (payError) console.error("❌ Erro ao inserir folha:", payError);
    }

    // Inserir na tabela expenses
    if (filteredExpenses.length > 0) {
        const { error: expError } = await supabase.from('expenses').insert(filteredExpenses);
        if (expError) console.error("❌ Erro ao inserir despesas:", expError);
    }

    if (!payError && !expError) {
        console.log("✅ Concluído com sucesso!");
    }
}

launchPayroll();
