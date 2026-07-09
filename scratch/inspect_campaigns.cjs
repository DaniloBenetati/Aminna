const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Heuristics from Marketing.tsx
function isAppointmentInMarketingPeriod(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  return dateStr >= startDate && dateStr <= endDate;
}

async function main() {
  // Fetch campaigns, appointments, services, partnerCampaigns
  const { data: campaigns } = await supabase.from('campaigns').select('*');
  const { data: appointments } = await supabase.from('appointments').select('*');
  const { data: services } = await supabase.from('services').select('*');
  const { data: partnerCampaigns } = await supabase.from('partner_campaigns').select('*');

  console.log(`Loaded ${campaigns?.length} campaigns, ${appointments?.length} appointments, ${services?.length} services.`);

  // Let's filter active campaigns
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  console.log(`Active campaigns: ${activeCampaigns.length}`);
  activeCampaigns.forEach(c => {
    console.log(`- Campaign: "${c.name}" | Status: ${c.status} | Spend: ${c.spend}`);
  });

  // Let's see some appointments and if they match multiple campaigns
  // We need to calculate firstVisits for customers
  const firstVisits = {};
  const sortedAppts = [...appointments].sort((a, b) => a.date.localeCompare(b.date));
  sortedAppts.forEach(a => {
    if (!firstVisits[a.customer_id]) {
      firstVisits[a.customer_id] = { date: a.date };
    }
  });

  // Let's define the dates based on last 30 days or similar
  const startDate = '2026-06-01';
  const endDate = '2026-07-08';

  const getMatchingCouponAppts = (cName) => {
    const nameLower = cName.toLowerCase();
    const isConversionCampaign = nameLower.includes('conversas') || 
                                 nameLower.includes('lead') || 
                                 nameLower.includes('cupom agendamento') ||
                                 nameLower.includes('estetica') ||
                                 nameLower.includes('estética') ||
                                 (nameLower.includes('trafego') && !nameLower.includes('manicures') && !nameLower.includes('seguidores'));

    if (!isConversionCampaign) return [];

    return appointments.filter(a => {
        if (a.status !== 'Concluído' || !isAppointmentInMarketingPeriod(a.date, startDate, endDate)) return false;
        
        const svc = services.find(s => s.id === a.service_id);
        const isSobrancelhaSvc = svc?.category === 'Sobrancelha';
        const isSobrancelhaCampaign = nameLower.includes('sobrancelha');

        if (isSobrancelhaCampaign) {
            if (!isSobrancelhaSvc) return false;
        } else {
            if (isSobrancelhaSvc) return false;
        }

        const isNewCustomer = firstVisits[a.customer_id]?.date === a.date;
        if (!isNewCustomer) return false;

        const coupon = a.applied_coupon ? a.applied_coupon.toLowerCase().trim() : '';
        
        if (coupon && nameLower.includes(coupon)) return true;
        
        if (nameLower.includes('cupom agendamento') || nameLower.includes('trafego')) {
            const isPartnerCoupon = coupon && partnerCampaigns.some(pc => pc.coupon_code && pc.coupon_code.toLowerCase().trim() === coupon);
            if (!isPartnerCoupon || coupon === 'aminnavip') return true;
        }
        return false;
    });
  };

  const apptToCampaigns = {};
  activeCampaigns.forEach(c => {
    const matches = getMatchingCouponAppts(c.name);
    matches.forEach(a => {
      if (!apptToCampaigns[a.id]) apptToCampaigns[a.id] = [];
      apptToCampaigns[a.id].push(c.name);
    });
  });

  console.log("\nAppointments matching MULTIPLE active campaigns:");
  let overlapCount = 0;
  Object.entries(apptToCampaigns).forEach(([apptId, campNames]) => {
    if (campNames.length > 1) {
      overlapCount++;
      const a = appointments.find(ap => ap.id === apptId);
      console.log(`Appt ID: ${apptId} | Date: ${a.date} | Customer: ${a.customer_id} | Coupon: "${a.applied_coupon}" | Matches:`, campNames);
    }
  });
  console.log(`Total overlapping appointments: ${overlapCount}`);
}

main();
