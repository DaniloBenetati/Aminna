
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
import { ViewState, Customer, Appointment, Sale, StockItem, Service, Campaign, PantryItem, PantryLog, Lead } from './types';
import { CUSTOMERS, APPOINTMENTS, SALES, STOCK, SERVICES, CAMPAIGNS, PANTRY_ITEMS, PANTRY_LOGS, LEADS } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

  // GLOBAL STATE: Shared between components to ensure data consistency
  const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS);
  const [appointments, setAppointments] = useState<Appointment[]>(APPOINTMENTS);
  const [sales, setSales] = useState<Sale[]>(SALES);
  const [stock, setStock] = useState<StockItem[]>(STOCK);
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(PANTRY_ITEMS);
  const [pantryLogs, setPantryLogs] = useState<PantryLog[]>(PANTRY_LOGS);
  const [leads, setLeads] = useState<Lead[]>(LEADS);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

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
        return <Finance services={services} appointments={appointments} sales={sales} />;
      case ViewState.FECHAMENTOS:
        return <Closures services={services} appointments={appointments} />;
      case ViewState.ESTOQUE:
        return <Inventory stock={stock} setStock={setStock} />;
      case ViewState.VENDAS:
        return <Sales sales={sales} setSales={setSales} stock={stock} setStock={setStock} />;
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
        return <SettingsPage onNavigate={setCurrentView} />;
      default:
        return <div className="p-10 text-center text-slate-500">Módulo em desenvolvimento...</div>;
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
