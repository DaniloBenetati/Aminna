
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function launchTaxes() {
    console.log("🚀 Iniciando Lançamento de Encargos RH no Financeiro...");

    // 1. Dados Base
    const monthlySalaries = 3608.00; // Kayto (1804) + Sara (1804)
    const fgtsRate = 0.08;
    const inssPatronalRate = 0.20; // Estimativa (INSS Empresa)
    const ratRate = 0.02; // RAT/FAP
    const terceirosRate = 0.058; // Outras Entidades
    
    const monthlyFGTS = monthlySalaries * fgtsRate; // 288.64
    const monthlyINSS = monthlySalaries * (inssPatronalRate + ratRate + terceirosRate); // ~1002.00

    const months = [
        { name: 'Janeiro', m: 1, year: 2026 },
        { name: 'Fevereiro', m: 2, year: 2026 },
        { name: 'Março', m: 3, year: 2026 },
        { name: 'Abril', m: 4, year: 2026 },
        { name: 'Maio', m: 5, year: 2026 },
        { name: 'Junho', m: 6, year: 2026 },
        { name: 'Julho', m: 7, year: 2026 },
        { name: 'Agosto', m: 8, year: 2026 },
        { name: 'Setembro', m: 9, year: 2026 },
        { name: 'Outubro', m: 10, year: 2026 },
        { name: 'Novembro', m: 11, year: 2026 },
        { name: 'Dezembro', m: 12, year: 2026 },
    ];

    const expensesToInsert = [];

    for (const month of months) {
        // FGTS vence dia 7 (ou dia útil anterior, simplificando como dia 7)
        const fgtsDueDate = `${month.year}-${String(month.m).padStart(2, '0')}-07`;
        // INSS vence dia 20
        const inssDueDate = `${month.year}-${String(month.m).padStart(2, '0')}-20`;

        expensesToInsert.push({
            description: `FGTS DIGITAL - FOLHA ${month.name}/${month.year}`,
            amount: monthlyFGTS,
            date: fgtsDueDate,
            category: 'ENCARGOS SOCIAIS',
            status: 'PENDING',
            payment_method: 'BOLETO'
        });

        expensesToInsert.push({
            description: `DARF PREVIDENCIÁRIO (INSS) - FOLHA ${month.name}/${month.year}`,
            amount: monthlyINSS,
            date: inssDueDate,
            category: 'IMPOSTOS SOBRE FOLHA',
            status: 'PENDING',
            payment_method: 'BOLETO'
        });
    }

    // Buscar despesas existentes para evitar duplicidade
    const { data: existingExpenses } = await supabase.from('expenses').select('description');
    const existingDescSet = new Set(existingExpenses?.map(e => e.description) || []);

    const filteredExpenses = expensesToInsert.filter(ex => !existingDescSet.has(ex.description));

    console.log(`- Filtrados: Inserindo ${filteredExpenses.length} encargos (removendo duplicados)...`);

    if (filteredExpenses.length > 0) {
        const { error } = await supabase.from('expenses').insert(filteredExpenses);
        if (error) {
            console.error("❌ Erro ao inserir lançamentos:", error);
        } else {
            console.log("✅ Lançamentos realizados com sucesso!");
        }
    } else {
        console.log("✅ Nada novo a inserir.");
    }
}

launchTaxes();
