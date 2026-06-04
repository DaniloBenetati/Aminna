const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getMinDate = () => {
    const now = new Date('2026-06-04'); // Using the date from metadata
    const threeMonthsAgo = new Date('2026-06-04');
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const referenceDate = threeMonthsAgo < startOfYear ? threeMonthsAgo : startOfYear;
    return referenceDate.getFullYear() + '-' + String(referenceDate.getMonth() + 1).padStart(2, '0') + '-' + String(referenceDate.getDate()).padStart(2, '0');
};

const isFirstAppointment = (customerId, date, appointments) => {
    const validApps = appointments.filter(a => a.customerId === customerId && a.status !== 'Cancelado');
    console.log('validApps for', customerId, ':', validApps.map(a => ({ id: a.id, date: a.date, status: a.status, customerId: a.customerId })));
    if (validApps.length === 0) return false;
    const firstDate = validApps.reduce((min, a) => (a.date < min ? a.date : min), validApps[0].date);
    console.log('firstDate:', firstDate, 'checking date:', date, 'result:', date === firstDate);
    return date === firstDate;
};

async function main() {
    // 1. Get customer
    const { data: customer } = await supabase.from('customers').select('*').ilike('name', '%Yormin%').single();
    console.log('Customer:', {
        id: customer.id,
        name: customer.name,
        status: customer.status,
        created_at: customer.created_at
    });

    // 2. Fetch all appointments
    const { data: appointments } = await supabase.from('appointments').select('*').gte('date', getMinDate());
    
    // Map like App.tsx does
    const mappedAppts = appointments.map(a => ({
        id: a.id,
        customerId: a.customer_id,
        date: a.date,
        status: a.status
    }));

    const gridDateStr = '2026-06-05';
    
    const isFirst = isFirstAppointment(customer.id, gridDateStr, mappedAppts);
    const minDate = getMinDate();
    const regDate = customer.created_at; // mapped to registrationDate
    
    console.log('Condition parts:');
    console.log('isFirstAppointment:', isFirst);
    console.log('customer.status === "Novo":', customer.status === 'Novo');
    console.log('registrationDate >= minDate:', regDate >= minDate, `(${regDate} >= ${minDate})`);
    
    const overallCondition = isFirst && (customer.status === 'Novo' || (regDate && regDate >= minDate));
    console.log('Overall Condition:', overallCondition);
}

main();
