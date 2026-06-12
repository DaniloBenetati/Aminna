const URL = 'https://eedazqhgvvelcjurigla.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZGF6cWhndnZlbGNqdXJpZ2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM4NTI5NywiZXhwIjoyMDg0OTYxMjk3fQ.g6GobuEV8PYw92hzHjz303xRYYl7etqrfcSDMxh37WM';

async function fetchAll(table) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const res = await fetch(`${URL}/${table}?select=*&limit=${pageSize}&offset=${page * pageSize}`, {
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      }
    });
    if (!res.ok) throw new Error(`Fetch failed for ${table}: ${res.statusText}`);
    const data = await res.json();
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return allData;
}

async function run() {
  console.log("Fetching database tables...");
  const [appointmentsRaw, customersRaw, servicesRaw, campaignsRaw] = await Promise.all([
    fetchAll('appointments'),
    fetchAll('customers'),
    fetchAll('services'),
    fetchAll('campaigns')
  ]);

  console.log(`Fetched ${appointmentsRaw.length} appointments, ${customersRaw.length} customers, ${servicesRaw.length} services, ${campaignsRaw.length} campaigns.`);

  // Map fields to match components/Marketing.tsx formatting
  const appointments = appointmentsRaw.map(a => ({
    id: a.id,
    customerId: a.customer_id,
    providerId: a.provider_id,
    serviceId: a.service_id,
    date: a.date,
    time: a.time,
    status: a.status,
    appliedCoupon: a.applied_coupon,
    pricePaid: a.price_paid,
    bookedPrice: a.booked_price,
    additionalServices: a.additional_services
  }));

  const customers = customersRaw.map(c => ({
    id: c.id,
    name: c.name
  }));

  const services = servicesRaw.map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    price: s.price
  }));

  const partnerCampaigns = campaignsRaw.map(c => ({
    id: c.id,
    couponCode: c.coupon_code
  }));

  // Calculate firstVisits
  const firstVisits = {};
  customers.forEach(c => {
    const customerApps = appointments.filter(a => a.customerId === c.id && a.status === 'Concluído');
    if (customerApps.length > 0) {
      const sorted = [...customerApps].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || '').localeCompare(b.time || '');
      });
      firstVisits[c.id] = { date: sorted[0].date };
    }
  });

  const campaignName = "[TRAFEGO] - ESTETICA - SOBRANCELHA E CÍLIOS";
  const nameLower = campaignName.toLowerCase();

  const start = '2026-05-13'; // last 30 days start
  const end = '2026-06-12';   // last 30 days end

  console.log(`\nAnalyzing campaign: "${campaignName}"`);
  console.log(`Period: ${start} to ${end}\n`);

  const matched = appointments.filter(a => {
    if (a.status !== 'Concluído') return false;
    
    // Check if in period
    const cleanDate = a.date.split('T')[0];
    if (cleanDate < start || cleanDate > end) return false;

    // Split logic: Sobrancelha campaigns vs others
    const svc = services.find(s => s.id === a.serviceId);
    const isSobrancelhaSvc = svc?.category === 'Sobrancelha';
    const isSobrancelhaCampaign = nameLower.includes('sobrancelha');

    if (isSobrancelhaCampaign) {
        if (!isSobrancelhaSvc) return false;
    } else {
        if (isSobrancelhaSvc) return false;
    }

    const isNewCustomer = firstVisits[a.customerId]?.date === a.date;
    if (!isNewCustomer) return false;

    const coupon = a.appliedCoupon ? a.appliedCoupon.toLowerCase().trim() : '';
    
    // Match specific coupons if they are in the campaign name
    if (coupon && nameLower.includes(coupon)) return true;
    
    // Generic matching for booking campaigns
    if (nameLower.includes('cupom agendamento') || nameLower.includes('trafego')) {
        const isPartnerCoupon = coupon && partnerCampaigns.some(pc => pc.couponCode && pc.couponCode.toLowerCase().trim() === coupon);
        if (!isPartnerCoupon || coupon === 'aminnavip') return true;
    }
    return false;
  });

  console.log(`Found ${matched.length} matching appointments:`);
  matched.forEach((a, idx) => {
    const cust = customers.find(c => c.id === a.customerId);
    const svc = services.find(s => s.id === a.serviceId);
    console.log(`${idx + 1}. Customer: ${cust ? cust.name : 'Unknown (' + a.customerId + ')'}`);
    console.log(`   Date/Time: ${a.date} at ${a.time}`);
    console.log(`   Service: ${svc ? svc.name : 'Unknown (' + a.serviceId + ')'} (Category: ${svc?.category || 'N/A'})`);
    console.log(`   Coupon: ${a.appliedCoupon || 'None'}`);
    console.log(`   First Visit Date: ${firstVisits[a.customerId]?.date}`);
    console.log(`   Status: ${a.status}`);
    console.log('------------------------------------');
  });

  // Let's also print ALL appointments in the period of category "Sobrancelha" to see why others weren't matched
  console.log("\n--- OTHER SOBRANCELHA APPOINTMENTS IN THE PERIOD (not matching new customer/coupon filters) ---");
  const otherAppts = appointments.filter(a => {
    const cleanDate = a.date.split('T')[0];
    if (cleanDate < start || cleanDate > end) return false;
    
    const svc = services.find(s => s.id === a.serviceId);
    const isSobrancelhaSvc = svc?.category === 'Sobrancelha';
    
    return isSobrancelhaSvc && !matched.some(m => m.id === a.id);
  });

  console.log(`Found ${otherAppts.length} other Sobrancelha appointments:`);
  otherAppts.forEach((a, idx) => {
    const cust = customers.find(c => c.id === a.customerId);
    const svc = services.find(s => s.id === a.serviceId);
    const isNewCustomer = firstVisits[a.customerId]?.date === a.date;
    console.log(`${idx + 1}. Customer: ${cust ? cust.name : 'Unknown'}`);
    console.log(`   Date/Time: ${a.date} at ${a.time}`);
    console.log(`   Service: ${svc ? svc.name : 'Unknown'}`);
    console.log(`   Coupon: ${a.appliedCoupon || 'None'}`);
    console.log(`   Status: ${a.status}`);
    console.log(`   Is New Customer: ${isNewCustomer} (First visit: ${firstVisits[a.customerId]?.date})`);
    console.log('------------------------------------');
  });
}

run().catch(console.error);
