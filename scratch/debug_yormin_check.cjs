const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getMinDate = () => {
    const now = new Date('2026-06-04');
    const threeMonthsAgo = new Date('2026-06-04');
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const referenceDate = threeMonthsAgo < startOfYear ? threeMonthsAgo : startOfYear;
    return referenceDate.getFullYear() + '-' + String(referenceDate.getMonth() + 1).padStart(2, '0') + '-' + String(referenceDate.getDate()).padStart(2, '0');
};

async function main() {
    const minD = getMinDate();
    console.log('minD:', minD);
    const { count, error: countError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('date', minD);

    if (countError) {
        console.error('Count error:', countError);
        return;
    }
    console.log('Count from DB:', count);

    const pageSize = 1000;
    const pages = Math.ceil(count / pageSize);
    const promises = Array.from({ length: pages }, (_, i) =>
      supabase
        .from('appointments')
        .select('*')
        .gte('date', minD)
        .range(i * pageSize, (i + 1) * pageSize - 1)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .order('id', { ascending: true })
    );

    const results = await Promise.all(promises);
    const allAppts = results.flatMap(r => r.data || []);
    console.log('Total appointments mapped:', allAppts.length);

    const targetApp = allAppts.find(a => a.id === '50e773c6-c21d-4530-bab9-3ddd6bbfd874');
    console.log('Is target appointment in list?', !!targetApp);
}

main();
