import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

const normalizeSearch = (str) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

async function run() {
  console.log("Fetching data from DB...");
  const { data: rawProviders } = await supabase.from('providers').select('*');
  const { data: rawServices } = await supabase.from('services').select('*');
  const { data: rawCustomers } = await supabase.from('customers').select('*');
  const { data: rawAppointments } = await supabase.from('appointments').select('*');
  const { data: rawFiscal } = await supabase.from('professional_fiscal_config').select('*');

  console.log(`Raw totals fetched:`);
  console.log(`- Providers: ${rawProviders?.length || 0}`);
  console.log(`- Services: ${rawServices?.length || 0}`);
  console.log(`- Customers: ${rawCustomers?.length || 0}`);
  console.log(`- Appointments: ${rawAppointments?.length || 0}`);

  // MAPPING (Exact logic from App.tsx)
  console.log("\nMapping Providers...");
  const mappedProviders = rawProviders.map((p) => {
    const fiscal = (rawFiscal || []).find((f) => f.provider_id === p.id);
    return {
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      specialties: p.specialties || [],
      commissionRate: p.commission_rate,
      avatar: p.avatar,
      nickname: p.nickname,
      phone: p.phone,
      birthDate: p.birth_date,
      pixKey: p.pix_key,
      active: p.active,
      workDays: p.work_days || [],
      order: p.order,
      commissionHistory: p.commission_history || [],
      vacationStart: p.vacation_start,
      vacationEnd: p.vacation_end,
      daysOff: p.days_off || [],
      dasAmount: fiscal?.das_amount || p.das_amount || 0,
      otherDiscounts: fiscal?.other_discounts || 0
    };
  });
  
  const deduplicatedProviders = mappedProviders.reduce((acc, current) => {
    const existingIndex = acc.findIndex(p => p.phone && p.phone === current.phone);
    if (existingIndex >= 0) acc[existingIndex] = current;
    else acc.push(current);
    return acc;
  }, []);

  console.log(`Deduplicated Providers: ${deduplicatedProviders.length}`);

  console.log("\nMapping Services...");
  const mappedServices = rawServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    durationMinutes: s.duration_minutes,
    requiredSpecialty: s.required_specialty,
    active: s.active,
    category: s.category,
    priceHistory: s.price_history || []
  }));

  console.log("\nMapping Customers...");
  const mappedCustomers = rawCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone || '',
    cpf: c.cpf,
    birthDate: c.birth_date,
    address: c.address,
    preferences: c.preferences,
    totalSpent: c.total_spent,
    lastVisit: c.last_visit,
    outstandingBalance: c.outstanding_balance,
    history: c.history || [],
    status: c.status || 'Ativo',
    blockReason: c.block_reason,
    assignedProviderId: c.assigned_provider_id,
    assignedProviderIds: c.assigned_provider_ids || [],
    packageName: c.package_name,
    packageSessions: c.package_sessions,
    packageSessionsUsed: c.package_sessions_used,
    registrationDate: c.created_at,
    isVip: c.is_vip,
    vipDiscountPercent: c.vip_discount_percent,
    creditBalance: c.credit_balance,
    lastMarketingContact: c.last_marketing_contact,
    acquisitionChannel: c.acquisition_channel
  }));
  const uniqueCustomers = Array.from(new Map(mappedCustomers.map(c => [c.id, c])).values());

  console.log("\nMapping Appointments...");
  const mappedAppts = rawAppointments.map((a) => ({
    id: a.id,
    customerId: a.customer_id,
    providerId: a.provider_id,
    serviceId: a.service_id,
    date: a.date,
    paymentDate: a.payment_date,
    time: a.time,
    endTime: a.end_time,
    status: a.status,
    paymentMethod: a.payment_method,
    payments: a.payments || [],
    amount: a.amount,
    commissionRate: a.commission_rate,
    commissionRateSnapshot: a.commission_rate_snapshot,
    observation: a.observation,
    rating: a.rating,
    feedback: a.feedback,
    additionalServices: a.additional_services,
    combinedServiceNames: a.combined_service_names,
    appliedCoupon: a.applied_coupon,
    pricePaid: a.price_paid,
    bookedPrice: a.booked_price,
    tipAmount: a.tip_amount,
    quantity: a.quantity,
    startTimeActual: a.start_time_actual,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    isReconciled: a.is_reconciled,
    adjustmentAmount: a.adjustment_amount,
    adjustmentReason: a.adjustment_reason,
    whatsappResponseNeeded: a.whatsapp_response_needed
  }));
  const uniqueAppointments = Array.from(new Map(mappedAppts.map(a => [a.id, a])).values());
  console.log(`Deduplicated Appointments: ${uniqueAppointments.length}`);

  // AGENDA STATES SIMULATION FOR TODAY (2026-05-26)
  const targetDateStr = '2026-05-26';
  const selectedProviderId = 'all';
  const visibleProviderIds = []; // Empty = show all
  const searchTerm = '';
  const visibleServiceIds = []; // Empty = show all

  console.log(`\n--- SIMULATING AGENDA FILTERING FOR DATE: ${targetDateStr} ---`);
  
  const activeProviders = deduplicatedProviders.filter(p => p.active);
  console.log(`Active Providers (p.active = true): ${activeProviders.length}`);
  activeProviders.forEach(p => {
    console.log(`- [${p.id}] ${p.name} (Active: ${p.active})`);
  });

  const gridAppointments = uniqueAppointments.filter(a => {
    const isDate = a.date === targetDateStr;

    let isProvider = true;
    if (selectedProviderId !== 'all') {
      isProvider = String(a.providerId).trim().toLowerCase() === String(selectedProviderId).trim().toLowerCase() ||
          !!(a.additionalServices?.some(s => String(s.providerId).trim().toLowerCase() === String(selectedProviderId).trim().toLowerCase()));
    } else if (visibleProviderIds.length > 0) {
      const normalizedVisibleIds = visibleProviderIds.map(vid => String(vid).trim().toLowerCase());
      isProvider = normalizedVisibleIds.includes(String(a.providerId).trim().toLowerCase()) ||
          !!(a.additionalServices?.some(s => normalizedVisibleIds.includes(String(s.providerId).trim().toLowerCase())));
    }

    const isNotCancelled = a.status !== 'Cancelado';
    let isSearchMatch = true;
    if (searchTerm) {
      const customer = uniqueCustomers.find(c => String(c.id).trim().toLowerCase() === String(a.customerId).trim().toLowerCase());
      const search = normalizeSearch(searchTerm);
      isSearchMatch = customer ? normalizeSearch(customer.name).includes(search) : false;
    }

    let isService = true;
    if (visibleServiceIds.length > 0) {
      isService = visibleServiceIds.includes(a.serviceId) ||
          !!(a.additionalServices?.some(s => visibleServiceIds.includes(s.serviceId)));
    }

    return isDate && isProvider && isNotCancelled && isSearchMatch && isService;
  });

  console.log(`\nFiltered Grid Appointments count for ${targetDateStr}: ${gridAppointments.length}`);
  gridAppointments.forEach(a => {
    const customer = uniqueCustomers.find(c => c.id === a.customerId);
    console.log(`- Appt: ID=${a.id}, Time=${a.time}, Customer=${customer?.name || a.customerId}, ProviderId=${a.providerId}, Status=${a.status}`);
  });

  const activeVisibileProviders = (() => {
    const filtered = selectedProviderId === 'all'
        ? activeProviders.filter(p => visibleProviderIds.length === 0 || visibleProviderIds.some(vid => String(vid).trim().toLowerCase() === String(p.id).trim().toLowerCase()))
        : activeProviders.filter(p => String(p.id).trim().toLowerCase() === String(selectedProviderId).trim().toLowerCase());

    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  })();

  console.log(`\nActive Visible Providers in Grid: ${activeVisibileProviders.length}`);
  activeVisibileProviders.forEach(p => {
    console.log(`- [${p.id}] ${p.name}`);
  });
}

run();
