
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
import { ViewState, Customer, Appointment, Sale, StockItem, Service, Campaign, PantryItem, PantryLog, Lead, Provider, ExpenseCategory, PaymentSetting, CommissionSetting } from './types';
import { CUSTOMERS, APPOINTMENTS, SALES, STOCK, SERVICES, CAMPAIGNS, PANTRY_ITEMS, PANTRY_LOGS, LEADS } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

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
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([
    { id: 'cat-rent', name: 'Aluguel', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-energy', name: 'Energia', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-water', name: 'Água', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-net', name: 'Internet / Telefone', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-sys', name: 'Sistemas / Software', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-clean', name: 'Limpeza', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-maint', name: 'Manutenção', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-pers', name: 'Pessoal (Salários)', dreClass: 'EXPENSE_ADM', isSystem: false },
    { id: 'cat-mkt', name: 'Marketing / Ads', dreClass: 'EXPENSE_SALES', isSystem: false },
    { id: 'cat-comm', name: 'Comissões de Venda', dreClass: 'EXPENSE_SALES', isSystem: false },
    { id: 'cat-bank', name: 'Tarifas Bancárias', dreClass: 'EXPENSE_FIN', isSystem: false },
    { id: 'cat-tax', name: 'Impostos (Simples/DAS)', dreClass: 'TAX', isSystem: false },
    { id: 'cat-mat', name: 'Materiais (Uso Técnico)', dreClass: 'COSTS', isSystem: false },
    { id: 'cat-prod', name: 'Compra de Produtos (Revenda)', dreClass: 'COSTS', isSystem: false },
  ]);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([
    { id: 'pix', method: 'Pix', iconName: 'Smartphone', fee: 0, days: 0, color: 'text-emerald-500' },
    { id: 'credit_vista', method: 'Cartão de Crédito (À Vista)', iconName: 'CreditCard', fee: 3.49, days: 30, color: 'text-indigo-500' },
    { id: 'debit', method: 'Cartão de Débito', iconName: 'Landmark', fee: 1.25, days: 1, color: 'text-blue-500' },
    { id: 'cash', method: 'Dinheiro', iconName: 'Wallet', fee: 0, days: 0, color: 'text-amber-500' },
  ]);

  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([
    { id: '1', startDay: 1, endDay: 15, paymentDay: 20 },
    { id: '2', startDay: 16, endDay: 'last', paymentDay: 5 }
  ]);


  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

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
      // 1. Providers - (Note: Providers are not in global state in App.tsx originally? 
      // Wait, they were imported as PROVIDERS constant but not in state passed to children?
      // Checking Dashboard props... Dashboard takes services, sales, etc.
      // Professionals component takes appointments...
      // Ah, PROVIDERS constant was imported directly in components too?
      // Let's check imports. Yes, 'constants.ts' was widely used.
      // We might need to pass providers down or refactor components to fetching too.
      // For now, let's focus on the state variables present in App.tsx)

      // 2. Services
      const { data: servicesData } = await supabase.from('services').select('*');
      if (servicesData) {
        setServices(servicesData.map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          durationMinutes: s.duration_minutes,
          requiredSpecialty: s.required_specialty,
          active: s.active
        })));
      }

      // 3. Stock
      const { data: stockData } = await supabase.from('stock_items').select('*');
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
          usageHistory: [] // Todo fetch logs
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

      // 6. Customers
      const { data: customersData } = await supabase.from('customers').select('*');
      if (customersData) {
        setCustomers(customersData.map((c: any) => ({
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
          acquisitionChannel: c.acquisition_channel
        })));
      }

      // 7. Appointments
      // Fetching appointments logic would go here.
      // For 'Fresh Start', it will be empty.

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
          />
        );
      case ViewState.CLIENTES:
        return <Clients customers={customers} setCustomers={setCustomers} appointments={appointments} />;
      case ViewState.CRM:
        return (
          <CRM
            customers={customers}
            setCustomers={setCustomers}
            leads={leads}
            setLeads={setLeads}
          />
        );
      case ViewState.PROFISSIONAIS:
        return <Professionals appointments={appointments} setAppointments={setAppointments} customers={customers} services={services} />;
      case ViewState.FINANCEIRO:
        return <Finance services={services} appointments={appointments} sales={sales} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} paymentSettings={paymentSettings} />;
      case ViewState.FECHAMENTOS:
        return <Closures services={services} appointments={appointments} />;
      case ViewState.ESTOQUE:
        return <Inventory stock={stock} setStock={setStock} />;
      case ViewState.VENDAS:
        return <Sales sales={sales} setSales={setSales} stock={stock} setStock={setStock} paymentSettings={paymentSettings} />;
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
          />
        );
      case ViewState.SERVICOS:
        return <ServicesManagement services={services} setServices={setServices} />;
      case ViewState.PARTNERSHIPS:
        return <Partnerships campaigns={campaigns} setCampaigns={setCampaigns} />;
      case ViewState.COPA:
        return (
          <Copa
            pantryItems={pantryItems}
            setPantryItems={setPantryItems}
            pantryLogs={pantryLogs}
            setPantryLogs={setPantryLogs}
            appointments={appointments}
            customers={customers}
          />
        );
      case ViewState.SETTINGS:
        return <SettingsPage onNavigate={setCurrentView} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} paymentSettings={paymentSettings} setPaymentSettings={setPaymentSettings} commissionSettings={commissionSettings} setCommissionSettings={setCommissionSettings} />;
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
    <Layout currentView={currentView} onNavigate={setCurrentView} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

export default App;
