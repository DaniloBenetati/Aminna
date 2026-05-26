import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing credentials!");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    console.log("Fetching all data for diagnostic map test...");

    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const referenceDate = threeMonthsAgo < startOfYear ? threeMonthsAgo : startOfYear;
    const minDate = referenceDate.getFullYear() + '-' + String(referenceDate.getMonth() + 1).padStart(2, '0') + '-' + String(referenceDate.getDate()).padStart(2, '0');

    console.log("minDate is:", minDate);

    const fetchCustomers = async () => {
        const pageSize = 1000;
        const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
        const pages = Math.ceil((count || 0) / pageSize);
        const promises = Array.from({ length: pages }, (_, i) =>
          supabase.from('customers').select('*').order('name', { ascending: true }).order('id', { ascending: true }).range(i * pageSize, (i + 1) * pageSize - 1)
        );
        const results = await Promise.all(promises);
        return results.flatMap(r => r.data || []);
    };

    const fetchAppointments = async () => {
        const pageSize = 1000;
        const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('date', minDate);
        const pages = Math.ceil((count || 0) / pageSize);
        const promises = Array.from({ length: pages }, (_, i) =>
          supabase.from('appointments').select('*').gte('date', minDate).range(i * pageSize, (i + 1) * pageSize - 1)
        );
        const results = await Promise.all(promises);
        return results.flatMap(r => r.data || []);
    };

    const fetchExpenses = async () => {
        const pageSize = 1000;
        const { count } = await supabase.from('expenses').select('*', { count: 'exact', head: true }).gte('date', minDate);
        const pages = Math.ceil((count || 0) / pageSize);
        const promises = Array.from({ length: pages }, (_, i) =>
          supabase.from('expenses').select('*').gte('date', minDate).range(i * pageSize, (i + 1) * pageSize - 1)
        );
        const results = await Promise.all(promises);
        return results.flatMap(r => r.data || []);
    };

    const fetchSales = async () => {
        const pageSize = 1000;
        const { count } = await supabase.from('sales').select('*', { count: 'exact', head: true }).gte('date', minDate);
        const pages = Math.ceil((count || 0) / pageSize);
        const promises = Array.from({ length: pages }, (_, i) =>
          supabase.from('sales').select('*').gte('date', minDate).range(i * pageSize, (i + 1) * pageSize - 1)
        );
        const results = await Promise.all(promises);
        return results.flatMap(r => r.data || []);
    };

    try {
        const [
            { data: providersData },
            { data: servicesData },
            { data: stockData },
            { data: usageLogsData },
            { data: campaignsData },
            { data: pantryItemsData },
            { data: pantryLogsData },
            { data: leadsData },
            { data: partnersData },
            { data: partnerExchangesData },
            { data: expenseCategoriesData },
            { data: paymentSettingsData },
            { data: commissionSettingsData },
            { data: suppliersData },
            { data: nfseRecordsData },
            fetchedCustomers,
            fetchedAppointments,
            fetchedSales,
            fetchedExpenses,
            { data: financialConfigData },
            { data: fiscalConfigsData },
            { data: employeesDataRaw },
            { data: payrollDataRaw },
            { data: employeeLoansDataRaw }
        ] = await Promise.all([
            supabase.from('providers').select('*'),
            supabase.from('services').select('*'),
            supabase.from('stock_items').select('*').eq('active', true).order('created_at', { ascending: false }),
            supabase.from('usage_logs').select('*').gte('date', minDate),
            supabase.from('campaigns').select('*'),
            supabase.from('pantry_items').select('*'),
            supabase.from('pantry_logs').select('*').gte('date', minDate),
            supabase.from('leads').select('*'),
            supabase.from('partners').select('*'),
            supabase.from('partner_exchanges').select('*'),
            supabase.from('expense_categories').select('*'),
            supabase.from('payment_settings').select('*'),
            supabase.from('commission_settings').select('*'),
            supabase.from('suppliers').select('*'),
            supabase.from('nfse_records').select('*').gte('created_at', minDate),
            fetchCustomers(),
            fetchAppointments(),
            fetchSales(),
            fetchExpenses(),
            supabase.from('financial_config').select('*').order('valid_from', { ascending: false }),
            supabase.from('professional_fiscal_config').select('*'),
            supabase.from('employees').select('*'),
            supabase.from('payroll').select('*'),
            supabase.from('employee_loans').select('*')
        ]);

        console.log("All data successfully fetched from database.");

        // Now test each mapping section separately and print detailed error if it fails.
        
        console.log("--- Testing employee mapping ---");
        try {
            if (employeesDataRaw) {
                const mapped = employeesDataRaw.map((e) => ({
                    id: e.id,
                    name: e.name,
                    role: e.role,
                    phone: e.phone,
                    email: e.email,
                    pixKey: e.pix_key,
                    baseSalary: e.base_salary,
                    admissionDate: e.admission_date,
                    active: e.active,
                    avatar: e.avatar,
                    bankInfo: e.bank_info,
                    resignationDate: e.resignation_date
                }));
                console.log(`Success: Mapped ${mapped.length} employees`);
            }
        } catch (err) {
            console.error("❌ Employee mapping failed:", err);
        }

        console.log("--- Testing payroll mapping ---");
        try {
            if (payrollDataRaw) {
                const mapped = payrollDataRaw.map((p) => ({
                    id: p.id,
                    employeeId: p.employee_id,
                    month: p.month,
                    year: p.year,
                    baseSalary: p.base_salary,
                    commissions: p.commissions,
                    bonus: p.bonus,
                    deductions: p.deductions,
                    loanDeduction: p.loan_deduction,
                    otherDeductions: p.other_deductions,
                    otherDeductionsReason: p.other_deductions_reason,
                    netSalary: p.net_salary,
                    paymentDate: p.payment_date,
                    status: p.status,
                    notes: p.notes
                }));
                console.log(`Success: Mapped ${mapped.length} payroll records`);
            }
        } catch (err) {
            console.error("❌ Payroll mapping failed:", err);
        }

        console.log("--- Testing employee loans mapping ---");
        try {
            if (employeeLoansDataRaw) {
                const mapped = employeeLoansDataRaw.map((l) => ({
                    id: l.id,
                    employeeId: l.employee_id,
                    date: l.date,
                    totalAmount: l.total_amount,
                    installments: l.installments,
                    installmentAmount: l.installment_amount,
                    remainingAmount: l.remaining_amount,
                    status: l.status,
                    reason: l.reason,
                    schedule: l.schedule
                }));
                console.log(`Success: Mapped ${mapped.length} employee loans`);
            }
        } catch (err) {
            console.error("❌ Employee loans mapping failed:", err);
        }

        console.log("--- Testing providers mapping ---");
        try {
            if (providersData) {
                const mappedProviders = providersData.map((p) => {
                    const fiscal = (fiscalConfigsData || []).find((f) => f.provider_id === p.id);
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
                console.log(`Success: Mapped ${deduplicatedProviders.length} providers (deduplicated)`);
            }
        } catch (err) {
            console.error("❌ Providers mapping failed:", err);
        }

        console.log("--- Testing services mapping ---");
        try {
            if (servicesData) {
                const mapped = servicesData.map((s) => ({
                    id: s.id,
                    name: s.name,
                    price: s.price,
                    durationMinutes: s.duration_minutes,
                    requiredSpecialty: s.required_specialty,
                    active: s.active,
                    category: s.category,
                    priceHistory: s.price_history || []
                }));
                console.log(`Success: Mapped ${mapped.length} services`);
            }
        } catch (err) {
            console.error("❌ Services mapping failed:", err);
        }

        console.log("--- Testing stock mapping ---");
        try {
            if (stockData) {
                const mapped = stockData.map((s) => ({
                    id: s.id,
                    code: s.code,
                    name: s.name,
                    category: s.category,
                    group: s.group,
                    subGroup: s.sub_group,
                    quantity: s.quantity,
                    minQuantity: s.min_quantity,
                    unit: s.unit,
                    costPrice: s.cost_price,
                    price: s.sale_price,
                    imageUrl: s.image_url,
                    imageUrls: s.image_urls || [],
                    priceHistory: s.price_history || [],
                    usageHistory: (usageLogsData || [])
                        .filter((l) => l.stock_item_id === s.id)
                        .map((l) => ({
                            id: l.id,
                            date: l.date,
                            quantity: l.quantity,
                            type: l.type,
                            providerId: l.provider_id,
                            note: l.note
                        }))
                }));
                console.log(`Success: Mapped ${mapped.length} stock items`);
            }
        } catch (err) {
            console.error("❌ Stock mapping failed:", err);
        }

        console.log("--- Testing campaigns mapping ---");
        try {
            if (campaignsData) {
                const mapped = campaignsData.map((c) => ({
                    id: c.id,
                    partnerId: c.partner_id,
                    name: c.name,
                    couponCode: c.coupon_code,
                    discountType: c.discount_type,
                    discountValue: c.discount_value,
                    startDate: c.start_date,
                    endDate: c.end_date,
                    useCount: c.use_count || 0,
                    maxUses: c.max_uses || 0,
                    totalRevenueGenerated: c.total_revenue_generated || 0,
                    investmentValue: c.investment_value || 0
                }));
                console.log(`Success: Mapped ${mapped.length} campaigns`);
            }
        } catch (err) {
            console.error("❌ Campaigns mapping failed:", err);
        }

        console.log("--- Testing pantryItems mapping ---");
        try {
            if (pantryItemsData) {
                const mapped = pantryItemsData.map((p) => ({
                    ...p,
                    minQuantity: p.min_quantity,
                    costPrice: p.cost_price,
                    referencePrice: p.reference_price,
                    priceHistory: p.price_history
                }));
                console.log(`Success: Mapped ${mapped.length} pantry items`);
            }
        } catch (err) {
            console.error("❌ PantryItems mapping failed:", err);
        }

        console.log("--- Testing pantryLogs mapping ---");
        try {
            if (pantryLogsData) {
                const mapped = pantryLogsData.map((l) => ({
                    ...l,
                    itemId: l.item_id,
                    appointmentId: l.appointment_id,
                    customerId: l.customer_id,
                    providerId: l.provider_id,
                    costAtMoment: l.cost_at_moment,
                    referenceAtMoment: l.reference_at_moment
                }));
                console.log(`Success: Mapped ${mapped.length} pantry logs`);
            }
        } catch (err) {
            console.error("❌ PantryLogs mapping failed:", err);
        }

        console.log("--- Testing leads mapping ---");
        try {
            if (leadsData) {
                const mapped = leadsData.map((l) => ({ ...l, createdAt: l.created_at }));
                console.log(`Success: Mapped ${mapped.length} leads`);
            }
        } catch (err) {
            console.error("❌ Leads mapping failed:", err);
        }

        console.log("--- Testing partners mapping ---");
        try {
            if (partnersData) {
                const mapped = partnersData.map((p) => ({
                    ...p,
                    socialMedia: p.social_media,
                    socialMediaSecondary: p.social_media_secondary,
                    socialMediaList: p.social_media_list || [],
                    thermometer: p.thermometer,
                    contractScope: p.contract_scope,
                    contractUrl: p.contract_url,
                    partnershipType: p.partnership_type,
                    partnerType: p.partner_type,
                    contactPerson: p.contact_person,
                    city: p.city,
                    pixKey: p.pix_key,
                    linkedCustomerId: p.linked_customer_id
                }));
                console.log(`Success: Mapped ${mapped.length} partners`);
            }
        } catch (err) {
            console.error("❌ Partners mapping failed:", err);
        }

        console.log("--- Testing partnerExchanges mapping ---");
        try {
            if (partnerExchangesData) {
                const mapped = partnerExchangesData.map((e) => ({
                    id: e.id,
                    partnerId: e.partner_id,
                    receivedItem: e.received_item,
                    offeredItem: e.offered_item,
                    estimatedValue: e.estimated_value,
                    exchangeDate: e.exchange_date,
                    campaignId: e.campaign_id,
                    eventName: e.event_name,
                    status: e.status,
                    notes: e.notes
                }));
                console.log(`Success: Mapped ${mapped.length} partner exchanges`);
            }
        } catch (err) {
            console.error("❌ PartnerExchanges mapping failed:", err);
        }

        console.log("--- Testing expenseCategories mapping ---");
        try {
            if (expenseCategoriesData) {
                const mapped = expenseCategoriesData.map((c) => ({
                    id: c.id,
                    name: c.name,
                    dreClass: c.dre_class,
                    isSystem: c.is_system
                }));
                console.log(`Success: Mapped ${mapped.length} expense categories`);
            }
        } catch (err) {
            console.error("❌ ExpenseCategories mapping failed:", err);
        }

        console.log("--- Testing paymentSettings mapping ---");
        try {
            if (paymentSettingsData) {
                const mapped = paymentSettingsData.map((p) => ({
                    id: p.id,
                    method: p.method,
                    fee: parseFloat(p.fee) || 0,
                    days: p.days,
                    color: p.color,
                    iconName: p.icon_name,
                    maxInstallments: p.max_installments
                }));
                console.log(`Success: Mapped ${mapped.length} payment settings`);
            }
        } catch (err) {
            console.error("❌ PaymentSettings mapping failed:", err);
        }

        console.log("--- Testing commissionSettings mapping ---");
        try {
            if (commissionSettingsData) {
                const mapped = commissionSettingsData.map((c) => ({
                    id: c.id,
                    startDay: c.start_day,
                    endDay: c.end_day,
                    paymentDay: c.payment_day
                }));
                console.log(`Success: Mapped ${mapped.length} commission settings`);
            }
        } catch (err) {
            console.error("❌ CommissionSettings mapping failed:", err);
        }

        console.log("--- Testing suppliers mapping ---");
        try {
            if (suppliersData) {
                const mapped = suppliersData.map((s) => ({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    document: s.document,
                    phone: s.phone,
                    email: s.email,
                    active: s.active
                }));
                console.log(`Success: Mapped ${mapped.length} suppliers`);
            }
        } catch (err) {
            console.error("❌ Suppliers mapping failed:", err);
        }

        console.log("--- Testing nfseRecords mapping ---");
        try {
            if (nfseRecordsData) {
                const mapped = nfseRecordsData.map((r) => ({
                    id: r.id,
                    appointmentId: r.appointment_id,
                    providerId: r.provider_id,
                    customerId: r.customer_id,
                    nfseNumber: r.nfse_number,
                    verificationCode: r.verification_code,
                    totalValue: r.total_value,
                    salonValue: r.salon_value,
                    professionalValue: r.professional_value,
                    professionalCnpj: r.professional_cnpj,
                    serviceDescription: r.service_description,
                    status: r.status,
                    focusResponse: r.focus_response,
                    xmlUrl: r.xml_url,
                    pdfUrl: r.pdf_url,
                    errorMessage: r.error_message,
                    retryCount: r.retry_count,
                    createdAt: r.created_at,
                    updatedAt: r.updated_at
                }));
                console.log(`Success: Mapped ${mapped.length} NFSe records`);
            }
        } catch (err) {
            console.error("❌ NFSeRecords mapping failed:", err);
        }

        console.log("--- Testing financialConfig mapping ---");
        try {
            if (financialConfigData) {
                const mapped = financialConfigData.map((f) => ({
                    id: f.id,
                    anticipationRate: f.anticipation_rate,
                    anticipationEnabled: f.anticipation_enabled,
                    validFrom: f.valid_from,
                    initialBalance: Number(f.initial_balance) || 0,
                    cashFlowReserveRate: f.cash_flow_reserve_rate || 0,
                    createdAt: f.created_at,
                    updatedAt: f.updated_at
                }));
                console.log(`Success: Mapped ${mapped.length} financial configs`);
            }
        } catch (err) {
            console.error("❌ FinancialConfig mapping failed:", err);
        }

        console.log("--- Testing expenses mapping ---");
        try {
            if (fetchedExpenses) {
                const mapped = fetchedExpenses.map((e) => ({
                    id: e.id,
                    description: e.description,
                    category: e.category,
                    subcategory: e.subcategory,
                    dreClass: e.dre_class,
                    amount: Number(e.amount) || 0,
                    date: e.date,
                    status: e.status,
                    paymentMethod: e.payment_method,
                    supplierId: e.supplier_id,
                    providerId: e.provider_id,
                    employeeId: e.employee_id,
                    recurringId: e.recurring_id,
                    isReconciled: e.is_reconciled,
                    payroll_id: e.payroll_id
                }));
                console.log(`Success: Mapped ${mapped.length} expenses`);
            }
        } catch (err) {
            console.error("❌ Expenses mapping failed:", err);
        }

        console.log("--- Testing customers mapping ---");
        try {
            if (fetchedCustomers && fetchedCustomers.length > 0) {
                const mappedCustomers = fetchedCustomers.map((c) => ({
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
                console.log(`Success: Mapped ${uniqueCustomers.length} unique customers`);
            }
        } catch (err) {
            console.error("❌ Customers mapping failed:", err);
        }

        console.log("--- Testing appointments mapping ---");
        try {
            if (fetchedAppointments && fetchedAppointments.length > 0) {
                const mappedAppts = fetchedAppointments.map((a) => ({
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
                console.log(`Success: Mapped ${uniqueAppointments.length} unique appointments`);
            }
        } catch (err) {
            console.error("❌ Appointments mapping failed:", err);
        }

        console.log("--- Testing sales mapping ---");
        try {
            if (fetchedSales) {
                const mapped = fetchedSales.map((s) => ({
                    id: s.id,
                    customerId: s.customer_id,
                    items: s.items || [],
                    total: Number(s.total_amount || s.total_price || 0),
                    totalAmount: Number(s.total_amount || s.total_price || 0),
                    date: s.date,
                    paymentMethod: s.payment_method,
                    payments: s.payments || [],
                    status: s.status,
                    createdAt: s.created_at,
                    isReconciled: s.is_reconciled,
                    adjustmentAmount: Number(s.adjustment_amount || 0),
                    adjustmentReason: s.adjustment_reason
                }));
                console.log(`Success: Mapped ${mapped.length} sales`);
            }
        } catch (err) {
            console.error("❌ Sales mapping failed:", err);
        }

    } catch (globalErr) {
        console.error("💥 Global database fetch or Promise.all failed:", globalErr);
    }
}

run();
