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
    const { data: customer } = await supabase.from('customers').select('*').ilike('name', '%Yormin%').single();
    
    // Fetch all appointments like App.tsx does (using batching)
    const minD = getMinDate();
    const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('date', minD);
    
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

    const mappedAppts = allAppts.map(a => ({
        id: a.id,
        customerId: a.customer_id,
        date: a.date,
        status: a.status
    }));

    // Find our customer Yormin Martinez
    const customerId = customer.id;
    const gridDateStr = '2026-06-05';

    console.log('Customer ID in DB:', customerId);
    
    // Case sensitive / Strict comparison
    const validAppsStrict = mappedAppts.filter(a => a.customerId === customerId && a.status !== 'Cancelado');
    console.log('Strict matching appointments count:', validAppsStrict.length);
    if (validAppsStrict.length > 0) {
        console.log('Strict validApps dates:', validAppsStrict.map(a => a.date));
    }

    // Case insensitive / Trimmed comparison
    const cleanCustomerId = String(customerId).trim().toLowerCase();
    const validAppsRelaxed = mappedAppts.filter(a => a.customerId && String(a.customerId).trim().toLowerCase() === cleanCustomerId && a.status !== 'Cancelado');
    console.log('Relaxed matching appointments count:', validAppsRelaxed.length);
    if (validAppsRelaxed.length > 0) {
        console.log('Relaxed validApps dates:', validAppsRelaxed.map(a => a.date));
        const firstDate = validAppsRelaxed.reduce((min, a) => (a.date < min ? a.date : min), validAppsRelaxed[0].date);
        console.log('Relaxed firstDate:', firstDate);
    }
}

main();
