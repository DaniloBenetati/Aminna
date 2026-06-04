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

const isFirstAppointment = (customerId, date, appointments) => {
    const validApps = appointments.filter(a => a.customerId === customerId && a.status !== 'Cancelado');
    if (validApps.length === 0) {
        console.log(`[isFirstAppointment] No valid appointments for customerId ${customerId}`);
        return false;
    }
    const firstDate = validApps.reduce((min, a) => (a.date < min ? a.date : min), validApps[0].date);
    const res = date === firstDate;
    console.log(`[isFirstAppointment] customerId ${customerId}, checking date ${date}, firstDate is ${firstDate}, result: ${res}`);
    return res;
};

async function main() {
    const minDate = getMinDate();
    console.log('minDate:', minDate);

    // Fetch all customers using pagination
    const fetchCustomers = async () => {
      const pageSize = 1000;
      const { count, error: countError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (countError || count === null) {
        console.error('Error getting customers count:', countError);
        return [];
      }

      const pages = Math.ceil(count / pageSize);
      const promises = Array.from({ length: pages }, (_, i) =>
        supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(i * pageSize, (i + 1) * pageSize - 1)
      );

      const results = await Promise.all(promises);
      return results.flatMap(r => r.data || []);
    };

    // Fetch all appointments using pagination
    const fetchAppointments = async () => {
      const pageSize = 1000;
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('date', minDate);

      if (countError || count === null) {
        console.error('Error getting appointments count:', countError);
        return [];
      }

      const pages = Math.ceil(count / pageSize);
      const promises = Array.from({ length: pages }, (_, i) =>
        supabase
          .from('appointments')
          .select('*')
          .gte('date', minDate)
          .range(i * pageSize, (i + 1) * pageSize - 1)
      );

      const results = await Promise.all(promises);
      return results.flatMap(r => r.data || []);
    };

    const fetchedCustomers = await fetchCustomers();
    const mappedCustomers = fetchedCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status || 'Ativo',
      registrationDate: c.created_at,
    }));

    const fetchedAppointments = await fetchAppointments();
    const mappedAppts = fetchedAppointments.map((a) => ({
      id: a.id,
      customerId: a.customer_id,
      date: a.date,
      status: a.status,
    }));

    console.log(`Total customers loaded: ${mappedCustomers.length}`);
    console.log(`Total appointments loaded: ${mappedAppts.length}`);

    // Let's test for Caroline Stanzani
    const caroline = mappedCustomers.find(c => c.name.includes('Caroline Stanzani'));
    console.log('\n--- Caroline Stanzani ---');
    if (caroline) {
        console.log('Customer:', caroline);
        const apptDateStr = '2026-06-04';
        const isFirst = isFirstAppointment(caroline.id, apptDateStr, mappedAppts);
        const meetsRegistration = caroline.registrationDate && caroline.registrationDate >= minDate;
        console.log('registrationDate >= minDate:', meetsRegistration, `(${caroline.registrationDate} >= ${minDate})`);
        
        const isNewTagVisible = caroline.id && isFirst && (caroline.status === 'Novo' || meetsRegistration);
        console.log('Is "Novo" tag visible for Caroline:', !!isNewTagVisible);
    } else {
        console.log('Caroline Stanzani not found!');
    }

    // Let's test for Yormin Martinez
    const yormin = mappedCustomers.find(c => c.name.includes('Yormin'));
    console.log('\n--- Yormin Martinez ---');
    if (yormin) {
        console.log('Customer:', yormin);
        const apptDateStr = '2026-06-05';
        const isFirst = isFirstAppointment(yormin.id, apptDateStr, mappedAppts);
        const meetsRegistration = yormin.registrationDate && yormin.registrationDate >= minDate;
        console.log('registrationDate >= minDate:', meetsRegistration, `(${yormin.registrationDate} >= ${minDate})`);
        
        const isNewTagVisible = yormin.id && isFirst && (yormin.status === 'Novo' || meetsRegistration);
        console.log('Is "Novo" tag visible for Yormin:', !!isNewTagVisible);
    } else {
        console.log('Yormin Martinez not found!');
    }
}

main();
