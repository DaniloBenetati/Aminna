
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

import { ViewState, Customer, Appointment, Sale, StockItem, Service, Campaign, PantryItem, PantryLog, Lead, Provider, Partner, ExpenseCategory, PaymentSetting, CommissionSetting, Supplier, UserProfile, NFSeRecord } from './types';
import { CUSTOMERS, APPOINTMENTS, SALES, STOCK, SERVICES, CAMPAIGNS, PANTRY_ITEMS, PANTRY_LOGS, LEADS } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('currentView');
    return (saved as ViewState) || ViewState.DASHBOARD;
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
    // Clear selected customer when moving away from CLIENTES
    if (currentView !== ViewState.CLIENTES) {
      setSelectedCustomerId(null);
    }
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
  const [returnView, setReturnView] = useState<ViewState | null>(null);

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

      // Optimization: Filter logs and records by date (last 3 months) to prevent slow loading
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const minDate = threeMonthsAgo.getFullYear() + '-' + String(threeMonthsAgo.getMonth() + 1).padStart(2, '0') + '-' + String(threeMonthsAgo.getDate()).padStart(2, '0');

      // Helper function to fetch customers in parallel batches
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
            .range(i * pageSize, (i + 1) * pageSize - 1)
        );

        const results = await Promise.all(promises);
        const allCustomers = results.flatMap(r => r.data || []);
        return allCustomers;
      };

      // Helper function to fetch appointments in parallel batches
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
            .order('date', { ascending: true })
        );

        const results = await Promise.all(promises);
        const allAppts = results.flatMap(r => r.data || []);
        return allAppts;
      };

      // 1. Parallel Execution
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
        { data: expenseCategoriesData },
        { data: paymentSettingsData },
        { data: commissionSettingsData },
        { data: suppliersData },
        { data: nfseRecordsData },
        fetchedCustomers,
        fetchedAppointments,
        { data: salesData }
      ] = await Promise.all([
        supabase.from('providers').select('*'),
        supabase.from('services').select('*'),
        supabase.from('stock_items').select('*'),
        supabase.from('usage_logs').select('*').gte('date', minDate),
        supabase.from('campaigns').select('*'),
        supabase.from('pantry_items').select('*'),
        supabase.from('pantry_logs').select('*').gte('date', minDate),
        supabase.from('leads').select('*'),
        supabase.from('partners').select('*'),
        supabase.from('expense_categories').select('*'),
        supabase.from('payment_settings').select('*'),
        supabase.from('commission_settings').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('nfse_records').select('*').gte('created_at', minDate),
        fetchCustomers(),
        fetchAppointments(),
        supabase.from('sales').select('*').gte('date', minDate)
      ]);

      console.log('📊 [DATA FETCH] Results:', {
        providers: providersData?.length || 0,
        services: servicesData?.length || 0,
        customers: fetchedCustomers?.length || 0,
        appointments: fetchedAppointments?.length || 0,
        sales: salesData?.length || 0,
        nfse: nfseRecordsData?.length || 0
      });

      // Map and Set Providers
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
        const deduplicatedProviders = mappedProviders.reduce((acc: any[], current: any) => {
          const existingIndex = acc.findIndex(p => p.phone && p.phone === current.phone);
          if (existingIndex >= 0) acc[existingIndex] = current;
          else acc.push(current);
          return acc;
        }, []);
        setProviders(deduplicatedProviders);
      }

      // Map and Set Services
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

      // Map and Set Stock
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

      // Map and Set Campaigns
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
          useCount: c.use_count || 0,
          maxUses: c.max_uses || 0,
          totalRevenueGenerated: c.total_revenue_generated || 0
        })));
      }


      // Map and Set Other States
      if (pantryItemsData) setPantryItems(pantryItemsData.map((p: any) => ({ ...p, name: p.name })));
      if (pantryLogsData) setPantryLogs(pantryLogsData.map((l: any) => ({ ...l, date: l.date })));
      if (leadsData) setLeads(leadsData.map((l: any) => ({ ...l, createdAt: l.created_at })));
      if (partnersData) setPartners(partnersData);
      if (expenseCategoriesData) setExpenseCategories(expenseCategoriesData);
      if (paymentSettingsData) setPaymentSettings(paymentSettingsData.map((p: any) => ({ ...p, maxInstallments: p.max_installments })));
      if (commissionSettingsData) {
        setCommissionSettings(commissionSettingsData.map((c: any) => ({
          id: c.id,
          startDay: c.start_day,
          endDay: c.end_day,
          paymentDay: c.payment_day
        })));
      }
      if (suppliersData) setSuppliers(suppliersData);
      if (nfseRecordsData) {
        setNfseRecords(nfseRecordsData.map((r: any) => ({
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
        })));

      }

      // Set Customers
      if (fetchedCustomers && fetchedCustomers.length > 0) {
        setCustomers(fetchedCustomers.map((c: any) => ({
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
          creditBalance: c.credit_balance
        })));

      }

      // Set Appointments
      if (fetchedAppointments && fetchedAppointments.length > 0) {
        setAppointments(fetchedAppointments.map((a: any) => ({
          id: a.id,
          customerId: a.customer_id,
          providerId: a.provider_id,
          serviceId: a.service_id,
          date: a.date,
          paymentDate: a.payment_date, // Added paymentDate
          time: a.time,
          status: a.status,
          paymentMethod: a.payment_method,
          payments: a.payments || [],
          amount: a.amount,
          commissionRate: a.commission_rate,
          commissionRateSnapshot: a.commission_rate_snapshot, // Added commissionRateSnapshot
          observation: a.observation,
          rating: a.rating,
          feedback: a.feedback,
          additionalServices: a.additional_services,
          combinedServiceNames: a.combined_service_names,
          appliedCoupon: a.applied_coupon,
          pricePaid: a.price_paid, // Critical: Map price_paid
          bookedPrice: a.booked_price, // Critical: Map booked_price
          createdAt: a.created_at,
          updatedAt: a.updated_at
        })));
      }

      // Set Sales
      if (salesData) {
        setSales(salesData.map((s: any) => ({
          id: s.id,
          customerId: s.customer_id,
          items: s.items || [],
          total: s.total,
          totalAmount: s.total,
          date: s.date,
          paymentMethod: s.payment_method,
          payments: s.payments || [],
          status: s.status,
          createdAt: s.created_at
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
            paymentSettings={paymentSettings}
          />
        );
      case ViewState.CLIENTES:
        return (
          <Clients
            customers={customers}
            setCustomers={setCustomers}
            appointments={appointments}
            services={services}
            userProfile={simulatedProfile || userProfile}
            selectedCustomerId={selectedCustomerId}
            returnView={returnView}
            onNavigate={setCurrentView}
            providers={providers}
          />
        );
      case ViewState.CRM:
        return (
          <CRM
            customers={customers}
            setCustomers={setCustomers}
            leads={leads}
            setLeads={setLeads}
            providers={providers}
            appointments={appointments}
            services={services}
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
            isLoadingData={isLoadingData}
            onNavigate={(view, payload) => {
              if (view === ViewState.CLIENTES) {
                if (typeof payload === 'string') {
                  setSelectedCustomerId(payload);
                } else if (payload && typeof payload === 'object' && payload.id) {
                  setSelectedCustomerId(payload.id);
                  if (payload.returnTo) {
                    setReturnView(payload.returnTo);
                  }
                }
              }
              setCurrentView(view);
            }}
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
            isLoadingData={isLoadingData}
            onNavigate={(view, payload) => {
              if (view === ViewState.CLIENTES) {
                if (typeof payload === 'string') {
                  setSelectedCustomerId(payload);
                } else if (payload && typeof payload === 'object' && payload.id) {
                  setSelectedCustomerId(payload.id);
                  if (payload.returnTo) {
                    setReturnView(payload.returnTo);
                  }
                }
              }
              setCurrentView(view);
            }}
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

    </Layout>
  );
};

export default App;
