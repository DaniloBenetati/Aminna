
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CRM } from './components/CRM';
import { Clients } from './components/Clients';
import { Finance } from './components/Finance';
import { Closures } from './components/Closures';
import { Inventory } from './components/Inventory';
import { Agenda } from './components/Agenda';
import { DailyAppointments } from './components/DailyAppointments';
import { Professionals } from './components/Professionals';
import { Sales } from './components/Sales';
import { ServicesManagement } from './components/ServicesManagement';
import { Partnerships } from './components/Partnerships';
import { SettingsPage } from './components/Settings';
import { Copa } from './components/Copa';
import { Login } from './components/Login';
import { NFSeTestButton } from './components/NFSeTestButton';
import { ViewState, Customer, Appointment, Sale, StockItem, Service, Campaign, PantryItem, PantryLog, Lead, Provider, Partner, ExpenseCategory, PaymentSetting, CommissionSetting, Supplier, UserProfile, NFSeRecord } from './types';
import { CUSTOMERS, APPOINTMENTS, SALES, STOCK, SERVICES, CAMPAIGNS, PANTRY_ITEMS, PANTRY_LOGS, LEADS } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('currentView');
    return (saved as ViewState) || ViewState.DASHBOARD;
  });

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // GLOBAL STATE: Initialized empty, populated from Supabase
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [pantryLogs, setPantryLogs] = useState<PantryLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [nfseRecords, setNfseRecords] = useState<NFSeRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);


  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [simulatedProfile, setSimulatedProfile] = useState<UserProfile | null>(null);

  // THEME STATE
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Data on Authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      // 0. User Profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
          setUserProfile({
            id: profileData.id,
            email: profileData.email,
            role: profileData.role,
            permissions: profileData.permissions,
            createdAt: profileData.created_at
          });
        }
      }

      // 1. Providers
      const { data: providersData } = await supabase.from('providers').select('*');
      if (providersData) {
        const mappedProviders = providersData.map((p: any) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          specialties: p.specialties || [],
          commissionRate: p.commission_rate,
          avatar: p.avatar,
          phone: p.phone,
          birthDate: p.birth_date,
          pixKey: p.pix_key,
          active: p.active,
          workDays: p.work_days || [],
          order: p.order,
          commissionHistory: p.commission_history || []
        }));

        // Deduplicate by phone number - keep the most recent (last) record
        const deduplicatedProviders = mappedProviders.reduce((acc: any[], current: any) => {
          // Find existing provider with same phone
          const existingIndex = acc.findIndex(p => p.phone && p.phone === current.phone);

          if (existingIndex >= 0) {
            // Replace if current has more complete data or is the same/newer
            acc[existingIndex] = current;
          } else {
            acc.push(current);
          }

          return acc;
        }, []);

        setProviders(deduplicatedProviders);
      }

      // 2. Services
      const { data: servicesData } = await supabase.from('services').select('*');
      if (servicesData) {
        setServices(servicesData.map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          durationMinutes: s.duration_minutes,
          requiredSpecialty: s.required_specialty,
          active: s.active,
          category: s.category
        })));
      }

      // 3. Stock
      const { data: stockData } = await supabase.from('stock_items').select('*');
      const { data: usageLogsData } = await supabase.from('usage_logs').select('*');

      if (stockData) {
        setStock(stockData.map((s: any) => ({
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
          usageHistory: (usageLogsData || [])
            .filter((l: any) => l.stock_item_id === s.id)
            .map((l: any) => ({
              id: l.id,
              date: l.date,
              quantity: l.quantity,
              type: l.type,
              providerId: l.provider_id,
              note: l.note
            }))
        })));
      }

      // 3b. Partners
      const { data: partnersData } = await supabase.from('partners').select('*');
      if (partnersData) {
        setPartners(partnersData.map((p: any) => ({
          id: p.id,
          name: p.name,
          socialMedia: p.social_media,
          category: p.category,
          phone: p.phone,
          email: p.email,
          document: p.document,
          address: p.address,
          partnershipType: p.partnership_type,
          pixKey: p.pix_key,
          notes: p.notes,
          active: p.active
        })));
      }

      // 4. Pantry
      const { data: pantryData } = await supabase.from('pantry_items').select('*');
      if (pantryData) {
        setPantryItems(pantryData.map((p: any) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          category: p.category,
          quantity: p.quantity,
          minQuantity: p.min_quantity,
          costPrice: p.cost_price,
          referencePrice: p.reference_price
        })));
      }

      const { data: logsData } = await supabase.from('pantry_logs').select('*');
      if (logsData) {
        setPantryLogs(logsData.map((l: any) => ({
          id: l.id,
          date: l.date,
          time: l.time,
          itemId: l.item_id,
          quantity: l.quantity,
          appointmentId: l.appointment_id,
          customerId: l.customer_id,
          providerId: l.provider_id,
          costAtMoment: l.cost_at_moment,
          referenceAtMoment: l.reference_at_moment
        })));
      }

      // 5. Campaigns
      const { data: campaignsData } = await supabase.from('campaigns').select('*');
      if (campaignsData) {
        setCampaigns(campaignsData.map((c: any) => ({
          id: c.id,
          partnerId: c.partner_id,
          name: c.name,
          couponCode: c.coupon_code,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          startDate: c.start_date,
          endDate: c.end_date,
          useCount: c.use_count,
          maxUses: c.max_uses,
          totalRevenueGenerated: c.total_revenue_generated
        })));
      }

      // 6. Customers - Fetch ALL with pagination
      let allCustomers: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from('customers')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Error fetching customers batch:', error);
          hasMore = false;
        } else if (batch) {
          allCustomers = [...allCustomers, ...batch];
          if (batch.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allCustomers.length > 0) {
        setCustomers(allCustomers.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          birthDate: c.birth_date,
          registrationDate: c.registration_date,
          lastVisit: c.last_visit,
          totalSpent: c.total_spent,
          status: c.status,
          assignedProviderId: c.assigned_provider_id,
          preferences: c.preferences,
          history: [], // TODO fetch history
          acquisitionChannel: c.acquisition_channel,
          isBlocked: c.is_blocked,
          blockReason: c.block_reason
        })));
      }

      // 6b. Leads
      const { data: leadsData } = await supabase.from('leads').select('*');
      if (leadsData) {
        setLeads(leadsData.map((l: any) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          source: l.source,
          status: l.status,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
          notes: l.notes,
          lostReason: l.lost_reason,
          value: l.value,
          serviceInterest: l.service_interest,
          temperature: l.temperature,
          tags: l.tags || []
        })));
      }

      // 7. Appointments
      const { data: apptsData } = await supabase.from('appointments').select('*');
      if (apptsData) {
        setAppointments(apptsData.map((a: any) => ({
          id: a.id,
          customerId: a.customer_id,
          serviceId: a.service_id,
          providerId: a.provider_id,
          date: a.date,
          time: a.time,
          duration: a.duration,
          status: a.status,
          notes: a.notes,
          price: a.price,
          commissionRate: a.commission_rate,
          pricePaid: a.price_paid,
          paymentMethod: a.payment_method,
          payments: a.payments || [],
          paymentDate: a.payment_date,
          combinedServiceNames: a.combined_service_names,
          bookedPrice: a.booked_price,
          mainServiceProducts: a.main_service_products,
          additionalServices: a.additional_services,
          appliedCoupon: a.applied_coupon,
          discountAmount: a.discount_amount,
          nfseRecordId: a.nfse_record_id
        })));
      }

      // 7b. NFSe Records
      const { data: nfseData } = await supabase.from('nfse_records').select('*');
      if (nfseData) {
        setNfseRecords(nfseData.map((n: any) => ({
          id: n.id,
          appointmentId: n.appointment_id,
          providerId: n.provider_id,
          customerId: n.customer_id,
          reference: n.reference,
          nfseNumber: n.nfse_number,
          verificationCode: n.verification_code,
          status: n.status,
          totalValue: n.total_value,
          salonValue: n.salon_value,
          professionalValue: n.professional_value,
          professionalCnpj: n.professional_cnpj,
          serviceDescription: n.service_description,
          focusResponse: n.focus_response,
          xmlUrl: n.xml_url,
          pdfUrl: n.pdf_url,
          errorMessage: n.error_message,
          retryCount: n.retry_count,
          lastRetryAt: n.last_retry_at,
          cancelledAt: n.cancelled_at,
          cancellationReason: n.cancellation_reason,
          issuedAt: n.issued_at,
          createdAt: n.created_at,
          updatedAt: n.updated_at
        })));
      }

      // 8. Sales
      const { data: salesData } = await supabase.from('sales').select('*');
      if (salesData) {
        setSales(salesData.map((s: any) => ({
          id: s.id,
          customerId: s.customer_id,
          totalAmount: s.total_amount,
          date: s.date,
          paymentMethod: s.payment_method,
          items: s.items || [],
          payments: s.payments || []
        })));
      }

      // 9. Settings
      const { data: commData } = await supabase.from('commission_settings').select('*');
      setCommissionSettings(commData ? commData.map((c: any) => ({
        id: c.id,
        startDay: c.start_day,
        endDay: c.end_day,
        paymentDay: c.payment_day
      })) : []);

      const { data: payData } = await supabase.from('payment_settings').select('*');
      setPaymentSettings(payData ? payData.map((p: any) => ({
        id: p.id,
        method: p.method,
        iconName: p.icon_name,
        fee: p.fee,
        days: p.days,
        color: p.color
      })) : []);

      const { data: catData } = await supabase.from('expense_categories').select('*');
      setExpenseCategories(catData ? catData.map((e: any) => ({
        id: e.id,
        name: e.name,
        dreClass: e.dre_class,
        isSystem: e.is_system
      })) : []);

      const { data: supsData } = await supabase.from('suppliers').select('*');
      if (supsData) {
        setSuppliers(supsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          document: s.document,
          phone: s.phone,
          email: s.email,
          active: s.active
        })));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView(ViewState.DASHBOARD);
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <Dashboard
            onNavigate={setCurrentView}
            customers={customers}
            setCustomers={setCustomers}
            appointments={appointments}
            setAppointments={setAppointments}
            sales={sales}
            stock={stock}
            services={services}
            campaigns={campaigns}
            providers={providers}
          />
        );
      case ViewState.CLIENTES:
        return <Clients customers={customers} setCustomers={setCustomers} appointments={appointments} userProfile={simulatedProfile || userProfile} />;
      case ViewState.CRM:
        return (
          <CRM
            customers={customers}
            setCustomers={setCustomers}
            leads={leads}
            setLeads={setLeads}
            providers={providers}
          />
        );
      case ViewState.PROFISSIONAIS:
        return <Professionals providers={providers} setProviders={setProviders} appointments={appointments} setAppointments={setAppointments} customers={customers} services={services} />;
      case ViewState.FINANCEIRO:
        return <Finance services={services} appointments={appointments} sales={sales} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} paymentSettings={paymentSettings} commissionSettings={commissionSettings} suppliers={suppliers} setSuppliers={setSuppliers} providers={providers} customers={customers} stock={stock} />;
      case ViewState.FECHAMENTOS:
        return <Closures services={services} appointments={appointments} providers={providers} customers={customers} />;
      case ViewState.ESTOQUE:
        return <Inventory stock={stock} setStock={setStock} providers={providers} />;
      case ViewState.VENDAS:
        return <Sales sales={sales} setSales={setSales} stock={stock} setStock={setStock} paymentSettings={paymentSettings} customers={customers} />;
      case ViewState.AGENDA:
        return (
          <Agenda
            customers={customers}
            setCustomers={setCustomers}
            appointments={appointments}
            setAppointments={setAppointments}
            services={services}
            campaigns={campaigns}
            leads={leads}
            setLeads={setLeads}
            paymentSettings={paymentSettings}
            providers={providers}
            stock={stock}
            nfseRecords={nfseRecords}
            userProfile={simulatedProfile || userProfile}
          />
        );
      case ViewState.DAILY_APPOINTMENTS:
        return (
          <DailyAppointments
            customers={customers}
            setCustomers={setCustomers}
            appointments={appointments}
            setAppointments={setAppointments}
            services={services}
            campaigns={campaigns}
            paymentSettings={paymentSettings}
            providers={providers}
            stock={stock}
            nfseRecords={nfseRecords}
            userProfile={simulatedProfile || userProfile}
          />
        );
      case ViewState.SERVICOS:
        return <ServicesManagement services={services} setServices={setServices} />;
      case ViewState.PARTNERSHIPS:
        return <Partnerships partners={partners} setPartners={setPartners} campaigns={campaigns} setCampaigns={setCampaigns} />;
      case ViewState.COPA:
        return (
          <Copa
            pantryItems={pantryItems}
            setPantryItems={setPantryItems}
            pantryLogs={pantryLogs}
            setPantryLogs={setPantryLogs}
            appointments={appointments}
            customers={customers}
            providers={providers}
          />
        );
      case ViewState.SETTINGS:
        return <SettingsPage onNavigate={setCurrentView} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} paymentSettings={paymentSettings} setPaymentSettings={setPaymentSettings} commissionSettings={commissionSettings} setCommissionSettings={setCommissionSettings} isAdmin={userProfile?.role === 'admin'} onSimulateUser={setSimulatedProfile} />;
      default:
        return <div className="p-10 text-center text-slate-500">Módulo em desenvolvimento...</div>;
    }
  };

  if (isLoadingAuth || (isAuthenticated && isLoadingData && services.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 flex-col gap-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        {isAuthenticated && <p className="text-xs font-bold text-slate-400 animate-pulse">Carregando seus dados...</p>}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout
      currentView={currentView}
      onNavigate={setCurrentView}
      onLogout={handleLogout}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
      userProfile={simulatedProfile || userProfile}
      isSimulating={!!simulatedProfile}
      onStopSimulation={() => setSimulatedProfile(null)}
    >
      {renderView()}
      <NFSeTestButton />
    </Layout>
  );
};

export default App;
