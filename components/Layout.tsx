
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Users, DollarSign, Package, Menu, Settings, Briefcase, ShoppingCart, Sparkles, Contact, X, Handshake, Clock, BarChart3, Moon, Sun, Coffee, LogOut } from 'lucide-react';
import { ViewState, UserProfile } from '../types';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  userProfile?: UserProfile | null;
  isSimulating?: boolean;
  onStopSimulation?: () => void;
  children: React.ReactNode;
}

// Componente de Logo para reutilização
const Logo = ({ className = "h-16", collapsed = false }: { className?: string; collapsed?: boolean }) => (
  <div className={`flex items-center justify-center transition-all duration-500 overflow-hidden ${className}`}>
    <img
      src="/logo.png"
      alt="Aminna Logo"
      className={`object-contain transition-all duration-500 ${collapsed ? 'w-10 h-10' : 'w-full h-full'} dark:invert dark:brightness-200`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
          const fallback = document.createElement('h1');
          fallback.className = `font-serif italic text-slate-950 dark:text-white ${collapsed ? 'text-xl' : 'text-3xl'}`;
          fallback.innerText = "A";
          if (!collapsed) fallback.innerText = "Aminna";
          parent.appendChild(fallback);
        }
      }}
    />
  </div>
);

export const Layout: React.FC<LayoutProps> = ({
  currentView,
  onNavigate,
  onLogout,
  isDarkMode,
  toggleTheme,
  userProfile,
  isSimulating,
  onStopSimulation,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);


  const menuItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.AGENDA, label: 'Agenda Completa', icon: Calendar },
    { id: ViewState.DAILY_APPOINTMENTS, label: 'Agenda Diária', icon: Clock },
    { id: ViewState.CLIENTES, label: 'Clientes', icon: Contact },
    { id: ViewState.CRM, label: 'CRM', icon: Users },
    { id: ViewState.COPA, label: 'Copa & Consumo', icon: Coffee },
    { id: ViewState.PARTNERSHIPS, label: 'Parcerias', icon: Handshake },
    { id: ViewState.SERVICOS, label: 'Serviços', icon: Sparkles },
    { id: ViewState.PROFISSIONAIS, label: 'Profissionais', icon: Briefcase },
    { id: ViewState.VENDAS, label: 'Vendas', icon: ShoppingCart },
    { id: ViewState.FINANCEIRO, label: 'Financeiro', icon: BarChart3 },
    { id: ViewState.FECHAMENTOS, label: 'Fechamentos', icon: DollarSign },
    { id: ViewState.ESTOQUE, label: 'Estoque', icon: Package },
  ].filter(item => {
    if (!userProfile) return true;
    if (userProfile.role === 'admin') return true;
    return userProfile.permissions.tabs.includes(item.id);
  });

  const handleNavigate = (view: ViewState) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  // Define views that should take full width (no max-width 7xl)
  const isFluidView = [
    ViewState.CRM,
    ViewState.AGENDA,
    ViewState.FINANCEIRO,
    ViewState.ESTOQUE,
    ViewState.DAILY_APPOINTMENTS
  ].includes(currentView);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden text-slate-950 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className={`bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 flex flex-col hidden md:flex flex-shrink-0 transition-all duration-300 border-r border-slate-200 dark:border-zinc-800 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`p-6 border-b border-slate-100 dark:border-zinc-800 flex flex-col items-center text-center relative transition-all duration-300 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <Logo collapsed={isSidebarCollapsed} className={isSidebarCollapsed ? "h-10 w-10" : "h-20 w-auto mb-2"} />
          {!isSidebarCollapsed && (
            <p className="text-[10px] font-black text-slate-950 dark:text-slate-400 uppercase tracking-[0.2em] opacity-80 mt-1">Gestão Inteligente</p>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full flex items-center justify-center shadow-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all z-10 hover:scale-110 active:scale-90"
          >
            {isSidebarCollapsed ? <Menu size={12} /> : <X size={12} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4 scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative group ${isActive
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-zinc-700'
                  : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}

                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 space-y-1">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all w-full rounded-xl ${isDarkMode ? 'text-yellow-400 hover:bg-zinc-800' : 'text-indigo-600 hover:bg-indigo-50'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            title={isSidebarCollapsed ? (isDarkMode ? 'Modo Claro' : 'Modo Escuro') : ''}
          >
            {isDarkMode ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
            {!isSidebarCollapsed && (isDarkMode ? 'Modo Claro' : 'Modo Escuro')}
          </button>

          <button
            onClick={() => onNavigate(ViewState.SETTINGS)}
            className={`flex items-center gap-3 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all w-full rounded-xl ${currentView === ViewState.SETTINGS ? 'bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'} ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            title={isSidebarCollapsed ? 'Ajustes' : ''}
          >
            <Settings size={18} className="flex-shrink-0" />
            {!isSidebarCollapsed && 'Ajustes'}
          </button>

          <button
            onClick={onLogout}
            className={`flex items-center gap-3 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all w-full rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            title={isSidebarCollapsed ? 'Sair' : ''}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!isSidebarCollapsed && 'Sair'}
          </button>

          <div className={`mt-4 flex items-center gap-3 px-4 pt-4 border-t border-slate-50 dark:border-zinc-800 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-950 dark:text-white font-serif italic text-xs">
              {userProfile?.email ? userProfile.email.slice(0, 2).toUpperCase() : 'Am'}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden text-left transition-all">
                <p className="text-sm font-black text-slate-950 dark:text-white truncate">{userProfile?.email?.split('@')[0] || 'Recepção'}</p>
                <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-widest">{userProfile?.role || 'Unidade SP'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 z-50 flex flex-col md:hidden transition-transform duration-300 ease-out border-r border-slate-200 dark:border-zinc-800 shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
          <Logo className="h-12" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 hover:text-slate-950 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-black transition-all ${isActive
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white border border-slate-200 dark:border-zinc-700'
                  : 'text-slate-600 dark:text-slate-400 active:bg-slate-50 dark:active:bg-zinc-800'
                  }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}

          <div className="my-4 border-t border-slate-100 dark:border-zinc-800"></div>

          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-black transition-all ${isDarkMode ? 'text-yellow-400 active:bg-zinc-800' : 'text-indigo-600 active:bg-indigo-50'}`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <button
            onClick={() => handleNavigate(ViewState.SETTINGS)}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-black transition-all ${currentView === ViewState.SETTINGS
              ? 'bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white border border-slate-200 dark:border-zinc-700'
              : 'text-slate-600 dark:text-slate-400 active:bg-slate-50 dark:active:bg-zinc-800'
              }`}
          >
            <Settings size={20} />
            Ajustes do Sistema
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-black transition-all text-rose-500 active:bg-rose-50 dark:active:bg-rose-900/10"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-zinc-900 text-slate-950 dark:text-white z-30 p-4 flex justify-between items-center shadow-sm border-b border-slate-100 dark:border-zinc-800">
        <Logo className="h-10" />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-colors border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-yellow-400' : 'bg-slate-50 border-slate-100 text-indigo-600'}`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-xl transition-colors border border-slate-100 dark:border-zinc-700"
          >
            <Menu size={24} className="text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto pt-20 md:pt-0 ${isFluidView && currentView === ViewState.AGENDA ? 'p-0' : 'md:pt-10 md:px-8 md:pb-8 p-4'}`}>
        {isSimulating && (
          <div className="mb-6 bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-2xl flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <Sparkles className="animate-pulse" size={20} />
              <p className="text-sm font-black uppercase tracking-widest">
                Simulando Acesso: <span className="text-indigo-200">{userProfile?.email}</span> ({userProfile?.role})
              </p>
            </div>
            <button
              onClick={onStopSimulation}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
            >
              Sair da Simulação
            </button>
          </div>
        )}
        <div className={`${isFluidView ? 'w-full h-full max-w-none' : 'max-w-7xl mx-auto h-full'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};
