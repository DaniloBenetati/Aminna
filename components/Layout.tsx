
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Users, DollarSign, Package, Menu, Settings, Briefcase, ShoppingCart, Sparkles, Contact, X, Handshake, Clock, BarChart3, Moon, Sun, Coffee, LogOut } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

// Componente de Logo para reutilização
const Logo = ({ className = "h-16" }: { className?: string }) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <img
      src="/logo.png"
      alt="Aminna Logo"
      className="h-full w-auto object-contain dark:invert dark:brightness-200 transition-all duration-300"
      onError={(e) => {
        // Fallback caso a imagem falhe (mantém a identidade visual)
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
          const fallback = document.createElement('h1');
          fallback.className = "text-3xl font-serif italic text-slate-950 dark:text-white";
          fallback.innerText = "Aminna";
          parent.appendChild(fallback);
        }
      }}
    />
  </div>
);

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, onLogout, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle Theme Function
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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
  ];

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
      <aside className="w-64 bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 flex flex-col hidden md:flex flex-shrink-0 transition-all border-r border-slate-200 dark:border-zinc-800">
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex flex-col items-center text-center">
          <Logo className="h-24" />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4 scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-zinc-700'
                    : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-zinc-800">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors w-full rounded-xl mb-1 ${isDarkMode ? 'text-yellow-400 hover:bg-zinc-800' : 'text-indigo-600 hover:bg-indigo-50'}`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <button
            onClick={() => onNavigate(ViewState.SETTINGS)}
            className={`flex items-center gap-3 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors w-full rounded-xl mb-1 ${currentView === ViewState.SETTINGS ? 'bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
          >
            <Settings size={18} />
            Ajustes
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors w-full rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10"
          >
            <LogOut size={18} />
            Encerrar Sessão
          </button>

          <div className="mt-4 flex items-center gap-3 px-4 pt-4 border-t border-slate-50 dark:border-zinc-800">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-950 dark:text-white font-serif italic text-xs">
              Am
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-sm font-black text-slate-950 dark:text-white truncate">Recepção</p>
              <p className="text-[10px] text-slate-500 font-bold truncate">Unidade SP</p>
            </div>
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
        <div className={`${isFluidView ? 'w-full h-full max-w-none' : 'max-w-7xl mx-auto h-full'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};
