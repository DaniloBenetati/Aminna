import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZGF6cWhndnZlbGNqdXJpZ2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyOTcsImV4cCI6MjA4NDk2MTI5N30.h23ouIwTVRNV6gUzcviwW-M3hQt4wQ6q-g1UBbDCjJg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('status', 'Pago')
        .gte('date', '2026-02-01')
        .lte('date', '2026-02-28');

    if (error) {
        console.error(error);
        return;
    }

    const startDate = '2026-02-01';
    const endDate = '2026-02-28';

    const filteredPayables = expenses.filter(exp => {
        const expDate = new Date(exp.date + 'T12:00:00');
        const isPayable = exp.dre_class !== 'REVENUE' && exp.dre_class !== 'OTHER_INCOME';
        const isInDateRange = expDate >= new Date(startDate + 'T00:00:00') && expDate <= new Date(endDate + 'T23:59:59');

        if (!isPayable || !isInDateRange) return false;
        return true;
    });

    const totalPago = filteredPayables.reduce((acc, curr) => acc + Number(curr.amount), 0);

    console.log('Total Pago (Simulation):', totalPago);
    console.log('Count:', filteredPayables.length);

    // Group by category
    const byCategory = {};
    filteredPayables.forEach(f => {
        byCategory[f.category] = (byCategory[f.category] || 0) + Number(f.amount);
    });
    console.log('By Category:', JSON.stringify(byCategory, null, 2));
}

run();
