import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function run() {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url!, key!);

    const { data: txs, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .gte('date', '2026-05-01')
        .lte('date', '2026-05-31')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const dailyMap: Record<string, { receitas: number; despesas: number; list: any[] }> = {};
    
    txs.forEach(t => {
        if (!dailyMap[t.date]) {
            dailyMap[t.date] = { receitas: 0, despesas: 0, list: [] };
        }
        const amt = parseFloat(t.amount as any);
        if (t.type === 'RECEITA') {
            dailyMap[t.date].receitas += amt;
        } else {
            dailyMap[t.date].despesas += amt;
        }
        dailyMap[t.date].list.push(t);
    });

    let runningBalance = 52334.84;
    console.log(`Saldo Inicial (01/05/2026): R$ ${runningBalance.toFixed(2)}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("| Data       | Qtd | Total Receitas | Total Despesas | Saldo Diário   | Saldo Fim Dia  |");
    console.log("--------------------------------------------------------------------------------");

    Object.keys(dailyMap).sort().forEach(date => {
        const day = dailyMap[date];
        const dayChange = day.receitas - day.despesas;
        runningBalance += dayChange;
        console.log(
            `| ${date} | ${String(day.list.length).padStart(3)} | ` +
            `R$ ${day.receitas.toFixed(2).padStart(12)} | ` +
            `R$ ${day.despesas.toFixed(2).padStart(12)} | ` +
            `R$ ${dayChange.toFixed(2).padStart(12)} | ` +
            `R$ ${runningBalance.toFixed(2).padStart(12)} |`
        );
    });
    console.log("--------------------------------------------------------------------------------");
}

run().catch(console.error);
