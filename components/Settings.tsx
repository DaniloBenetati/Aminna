import React, { useState } from 'react';
import { DOCUMENTATION_DATA } from './DocumentationData';
import {
    Settings, BookOpen, LayoutDashboard, Calendar, Users, DollarSign,
    Package, ShoppingCart, Briefcase, Sparkles, Handshake, BarChart3,
    Clock, Contact, CreditCard, ChevronRight, Info, CheckCircle2, User, Search,
    X, ArrowRight, ExternalLink, Percent, Landmark, Wallet, Smartphone, ShieldCheck, Save, Plus, Trash2, Edit3, ChevronDown, Tag, Coffee, Printer
} from 'lucide-react';
import { ViewState, ExpenseCategory, PaymentSetting, CommissionSetting } from '../types';

interface SettingsPageProps {
    onNavigate: (view: ViewState) => void;
    expenseCategories?: ExpenseCategory[];
    setExpenseCategories?: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
    paymentSettings?: PaymentSetting[];
    setPaymentSettings?: React.Dispatch<React.SetStateAction<PaymentSetting[]>>;
    commissionSettings?: CommissionSetting[];
    setCommissionSettings?: React.Dispatch<React.SetStateAction<CommissionSetting[]>>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    onNavigate,
    expenseCategories = [],
    setExpenseCategories,
    paymentSettings = [],
    setPaymentSettings,
    commissionSettings = [],
    setCommissionSettings
}) => {
    const [activeTab, setActiveTab] = useState<'MANUAL' | 'GENERAL'>('GENERAL');
    const [subTab, setSubTab] = useState<'FINANCE' | 'SYSTEM' | 'UNIT' | 'CATEGORIES'>('FINANCE');
    const [selectedModule, setSelectedModule] = useState<any>(null);

    // --- PAYMENT SETTINGS STATES ---
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<PaymentSetting | null>(null);

    // --- COMMISSION SETTINGS STATES ---
    const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
    const [editingCommission, setEditingCommission] = useState<CommissionSetting | null>(null);

    const handleOpenCommissionModal = (comm: CommissionSetting) => {
        setEditingCommission(comm);
        setIsCommissionModalOpen(true);
    };

    const handleSaveCommission = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;

        let endDayValue: number | 'last' = parseInt((form.elements.namedItem('endDay') as HTMLSelectElement).value);
        if ((form.elements.namedItem('endDay') as HTMLSelectElement).value === 'last') {
            endDayValue = 'last';
        }

        const data: Partial<CommissionSetting> = {
            startDay: parseInt((form.elements.namedItem('startDay') as HTMLSelectElement).value),
            endDay: endDayValue,
            paymentDay: parseInt((form.elements.namedItem('paymentDay') as HTMLSelectElement).value)
        };

        if (!setCommissionSettings || !editingCommission) return;

        setCommissionSettings(prev => prev.map(c => c.id === editingCommission.id ? { ...c, ...data } : c));
        setIsCommissionModalOpen(false);
    };

    // --- CATEGORY SETTINGS STATES ---
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDRE, setNewCategoryDRE] = useState<ExpenseCategory['dreClass']>('EXPENSE_ADM');
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

    const handleSaveCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim() || !setExpenseCategories) return;

        if (editingCategory) {
            setExpenseCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: newCategoryName, dreClass: newCategoryDRE } : c));
            setEditingCategory(null);
        } else {
            const newCat: ExpenseCategory = {
                id: `cat-${Date.now()}`,
                name: newCategoryName,
                dreClass: newCategoryDRE,
                isSystem: false
            };
            setExpenseCategories(prev => [...prev, newCat]);
        }
        setNewCategoryName('');
        setNewCategoryDRE('EXPENSE_ADM');
    };

    const handleEditCategory = (cat: ExpenseCategory) => {
        setEditingCategory(cat);
        setNewCategoryName(cat.name);
        setNewCategoryDRE(cat.dreClass);
    };

    const handleCancelEditCategory = () => {
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryDRE('EXPENSE_ADM');
    };

    const handleDeleteCategory = (id: string) => {
        if (!setExpenseCategories) return;
        if (confirm('Excluir esta categoria?')) {
            setExpenseCategories(prev => prev.filter(c => c.id !== id));
        }
    };

    const dreLabels: Record<string, string> = {
        'COSTS': 'Custos Diretos (CPV/CMV)',
        'EXPENSE_SALES': 'Despesas com Vendas / Mkt',
        'EXPENSE_ADM': 'Despesas Administrativas',
        'EXPENSE_FIN': 'Despesas Financeiras',
        'TAX': 'Impostos',
        'DEDUCTION': 'Deduções de Receita'
    };

    // --- PAYMENT HANDLERS ---
    const handleOpenPaymentModal = (pay: PaymentSetting | null = null) => {
        setEditingPayment(pay);
        setIsPaymentModalOpen(true);
    };

    const handleSavePayment = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data: Partial<PaymentSetting> = {
            method: (form.elements.namedItem('method') as HTMLInputElement).value,
            fee: parseFloat((form.elements.namedItem('fee') as HTMLInputElement).value) || 0,
            days: parseInt((form.elements.namedItem('days') as HTMLSelectElement).value) || 0,
            iconName: (form.elements.namedItem('iconName') as HTMLSelectElement).value as any,
        };

        if (!setPaymentSettings) return;

        if (editingPayment) {
            setPaymentSettings(prev => prev.map(p => p.id === editingPayment.id ? { ...p, ...data } : p));
        } else {
            const newItem: PaymentSetting = {
                ...data as PaymentSetting,
                id: `pay-${Date.now()}`,
                color: 'text-indigo-500'
            };
            setPaymentSettings(prev => [...prev, newItem]);
        }
        setIsPaymentModalOpen(false);
    };

    const handleDeletePayment = (id: string) => {
        if (!setPaymentSettings) return;
        if (confirm('Deseja realmente excluir esta regra de pagamento?')) {
            setPaymentSettings(prev => prev.filter(p => p.id !== id));
        }
    };

    const iconMap = {
        Smartphone: Smartphone,
        CreditCard: CreditCard,
        Landmark: Landmark,
        Wallet: Wallet,
        Banknote: DollarSign,
        Ticket: Tag
    };

    // --- DOCUMENTATION HELPERS ---
    const modules = [
        { title: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-600', bg: 'bg-indigo-50', viewState: ViewState.DASHBOARD, description: 'Visão geral do negócio...', features: ['KPIs', 'Fluxo'], mockup: null },
    ]; // Simplified for brevity as they weren't fully used in view

    const handleNavigateToModule = () => {
        if (selectedModule) onNavigate(selectedModule.viewState);
    };

    const handlePrintDocumentation = () => {
        // Implementation omitted for brevity, keeping only if needed or just button
        window.print();
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Settings className="text-indigo-600" size={28} /> Ajustes & Manual
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Configure o sistema e consulte a documentação</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
                    <button onClick={() => setActiveTab('GENERAL')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'GENERAL' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}>Geral</button>
                    <button onClick={() => setActiveTab('MANUAL')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'MANUAL' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}>Manual</button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6 md:p-8 scrollbar-hide">
                <div className="max-w-6xl mx-auto pb-20">

                    {activeTab === 'GENERAL' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Sub-abas de Configuração */}
                            <div className="flex gap-4 border-b border-slate-100 dark:border-zinc-800 pb-2 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'FINANCE', label: 'Financeiro', icon: Landmark },
                                    { id: 'CATEGORIES', label: 'Planilhas DRE', icon: Tag },
                                    { id: 'SYSTEM', label: 'Sistema', icon: Settings },
                                    { id: 'UNIT', label: 'Minha Unidade', icon: Info },
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => setSubTab(st.id as any)}
                                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${subTab === st.id ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <st.icon size={14} />
                                        {st.label}
                                    </button>
                                ))}
                            </div>

                            {/* CATEGORIES TAB */}
                            {subTab === 'CATEGORIES' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                            <div className="max-w-xl">
                                                <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase mb-2 flex items-center gap-3">
                                                    <Tag className="text-indigo-600" /> Categorização de Despesas
                                                </h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                    Crie categorias personalizadas para organizar suas despesas. Cada categoria deve pertencer a um grupo da DRE para garantir relatórios corretos.
                                                </p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSaveCategory} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-slate-100 dark:border-zinc-700 mb-8">
                                            <div className="flex-1 w-full">
                                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                                    {editingCategory ? 'Editar Categoria' : 'Nome da Categoria'}
                                                </label>
                                                <input
                                                    value={newCategoryName}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                    placeholder="Ex: Manutenção Predial"
                                                    className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-600 dark:text-white"
                                                />
                                            </div>
                                            <div className="md:w-64 w-full">
                                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Grupo DRE</label>
                                                <div className="relative">
                                                    <select
                                                        value={newCategoryDRE}
                                                        onChange={e => setNewCategoryDRE(e.target.value as any)}
                                                        className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold outline-none appearance-none focus:border-indigo-600 dark:text-white"
                                                    >
                                                        {Object.entries(dreLabels).map(([key, label]) => (
                                                            <option key={key} value={key}>{label}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                            {editingCategory && (
                                                <button type="button" onClick={handleCancelEditCategory} className="px-4 py-3 bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-colors h-[48px]">
                                                    Cancelar
                                                </button>
                                            )}
                                            <button disabled={!newCategoryName} type="submit" className="px-6 py-3 bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors w-full md:w-auto h-[48px]">
                                                {editingCategory ? 'Salvar' : 'Adicionar'}
                                            </button>
                                        </form>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {Object.entries(dreLabels).map(([dreKey, label]) => {
                                                const cats = expenseCategories.filter(c => c.dreClass === dreKey);
                                                if (cats.length === 0) return null;
                                                return (
                                                    <div key={dreKey} className="bg-slate-50 dark:bg-zinc-800/30 rounded-2xl p-5 border border-slate-100 dark:border-zinc-700">
                                                        <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-4 pb-2 border-b border-slate-200 dark:border-zinc-700">{label}</h4>
                                                        <ul className="space-y-2">
                                                            {cats.map(cat => (
                                                                <li key={cat.id} className="flex items-center justify-between text-sm group">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => handleEditCategory(cat)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors">
                                                                            <Edit3 size={14} />
                                                                        </button>
                                                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PAYMENT SETTINGS TAB */}
                            {subTab === 'FINANCE' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
                                        <div className="max-w-xl text-center md:text-left">
                                            <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase mb-2 flex items-center justify-center md:justify-start gap-3">
                                                <Percent className="text-indigo-600" /> Prazos e Taxas
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                Gerencie como o dinheiro entra no seu caixa. Defina as taxas das operadoras e os prazos de liquidação para cada método.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleOpenPaymentModal()}
                                            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all w-full md:w-auto justify-center"
                                        >
                                            <Plus size={18} /> Novo Método
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {paymentSettings.map((pay) => {
                                            const Icon = iconMap[pay.iconName] || CreditCard;
                                            return (
                                                <div key={pay.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800 ${pay.color}`}>
                                                                <Icon size={24} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-base text-slate-950 dark:text-white uppercase tracking-tight">{pay.method}</h4>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Regra Ativa</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleOpenPaymentModal(pay)} className="p-2 bg-slate-50 dark:bg-zinc-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"><Edit3 size={16} /></button>
                                                            <button onClick={() => handleDeletePayment(pay.id)} className="p-2 bg-slate-50 dark:bg-zinc-800 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Taxa Administr.</label>
                                                            <p className="text-xl font-black text-slate-950 dark:text-white">{pay.fee.toFixed(2)}%</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Liquidação</label>
                                                            <p className="text-xl font-black text-slate-950 dark:text-white">D+{pay.days}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-zinc-800 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                            <ShieldCheck size={14} />
                                                            <span className="text-[9px] font-black uppercase">Pronto para Projetar</span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase italic">Impacto DRE: {(pay.fee > 0 ? 'Negativo' : 'Neutro')}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between mt-8">
                                        <div className="max-w-xl text-center md:text-left">
                                            <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase mb-2 flex items-center justify-center md:justify-start gap-3">
                                                <Handshake className="text-emerald-500" /> Configuração de Repasses
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                Defina os períodos de apuração e as datas de pagamento das comissões aos profissionais.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {commissionSettings.map((comm) => (
                                            <div key={comm.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-zinc-800 text-emerald-500">
                                                            <Calendar size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-base text-slate-950 dark:text-white uppercase tracking-tight">Período {comm.id}</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configuração Ativa</p>
                                                        </div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleOpenCommissionModal(comm)} className="p-2 bg-slate-50 dark:bg-zinc-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"><Edit3 size={16} /></button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Apuração</label>
                                                        <p className="text-base font-black text-slate-950 dark:text-white">
                                                            Dia {comm.startDay} ao {comm.endDay === 'last' ? 'Fim' : `Dia ${comm.endDay}`}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Pagamento</label>
                                                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400">Dia {comm.paymentDay}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(subTab === 'SYSTEM' || subTab === 'UNIT') && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[3rem] bg-slate-50/50 dark:bg-zinc-900/50 min-h-[400px]">
                                    <Settings size={64} className="opacity-20 mb-4" />
                                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">Módulo em Breve</h3>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 mt-2">Configurações globais adicionais serão disponibilizadas aqui.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'MANUAL' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* DOCUMENTATION CONTENT RECONSTRUCTED */}
                            <div className="flex justify-between items-center bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl">
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight mb-1">Manual Oficial</h2>
                                    <p className="text-indigo-100 text-xs font-bold">Documentação técnica e regras de negócio</p>
                                </div>
                                <button onClick={handlePrintDocumentation} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-colors flex items-center gap-2">
                                    <Printer size={16} /> Imprimir / PDF
                                </button>
                            </div>

                            <div className="grid gap-8">
                                {DOCUMENTATION_DATA.sections.map((section, idx) => (
                                    <section key={idx} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
                                            <BookOpen size={24} className="text-indigo-600" />
                                            <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">{section.title}</h2>
                                        </div>
                                        {/* Doc content simplified for reconstruction/fix - assuming pure text render for now as simple reconstruction */}
                                        <div className="prose dark:prose-invert max-w-none">
                                            {section.content && <p className="mb-4">{section.content}</p>}
                                            {section.subsections && section.subsections.map((sub, sIdx) => (
                                                <div key={sIdx} className="mb-6">
                                                    <h3 className="text-lg font-bold mb-2">{sub.title}</h3>
                                                    {sub.subtitle && <p className="font-semibold text-slate-600 mb-2">{sub.subtitle}</p>}
                                                    {sub.description && <p className="mb-2">{sub.description}</p>}
                                                    {sub.items && (
                                                        <ul className="list-disc pl-5 space-y-1">
                                                            {sub.items.map((item, iIdx) => (
                                                                <li key={iIdx}><strong className="text-slate-800">{item.label}:</strong> {item.text}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {sub.tags && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {sub.tags.map(tag => (
                                                                <span key={tag} className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {section.analysis && (
                                                <div className="bg-slate-50 p-4 rounded-xl mt-4">
                                                    <h4 className="font-bold mb-2 uppercase text-xs">Análise de Dados</h4>
                                                    <ul className="space-y-1">
                                                        {section.analysis.map((an, aIdx) => (
                                                            <li key={aIdx} className="text-sm"><strong>{an.label}:</strong> {an.text}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* PAYMENT RULE MODAL */}
            {
                isPaymentModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col border-2 border-black dark:border-zinc-700 max-h-[90vh]">
                            <div className="px-6 py-5 bg-slate-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                                    <Landmark size={20} className="text-indigo-400" />
                                    {editingPayment ? 'Editar Regra' : 'Novo Método'}
                                </h3>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:text-indigo-400 transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSavePayment} className="p-6 md:p-8 space-y-6 bg-white dark:bg-zinc-900 overflow-y-auto scrollbar-hide">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1.5 ml-1">Nome do Método</label>
                                    <input name="method" required defaultValue={editingPayment?.method} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black outline-none focus:border-indigo-600" placeholder="Ex: Cartão Master 12x" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1.5 ml-1">Ícone Visual</label>
                                        <div className="relative">
                                            <select name="iconName" defaultValue={editingPayment?.iconName || 'CreditCard'} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black outline-none appearance-none focus:border-indigo-600">
                                                <option value="Smartphone">Pix / Celular</option>
                                                <option value="CreditCard">Cartão</option>
                                                <option value="Landmark">Banco / TED</option>
                                                <option value="Wallet">Carteira / Dinheiro</option>
                                                <option value="Banknote">Cédulas</option>
                                                <option value="Ticket">Voucher / Cupom</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1.5 ml-1">Liquidação (Dias)</label>
                                        <div className="relative">
                                            <select name="days" defaultValue={editingPayment?.days || 0} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black outline-none appearance-none focus:border-indigo-600">
                                                <option value={0}>D+0 (Imediato)</option>
                                                <option value={1}>D+1 (1 Dia)</option>
                                                <option value={2}>D+2 (2 Dias)</option>
                                                <option value={7}>D+7 (Semanal)</option>
                                                <option value={15}>D+15 (Quinzenal)</option>
                                                <option value={30}>D+30 (Mensal)</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-800">
                                    <label className="block text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-2 ml-1 text-center">Taxa Administrativa (%)</label>
                                    <div className="relative max-w-[200px] mx-auto">
                                        <input
                                            name="fee"
                                            type="number"
                                            step="0.01"
                                            required
                                            defaultValue={editingPayment?.fee || 0}
                                            className="w-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 rounded-2xl p-4 text-2xl font-black text-center outline-none text-indigo-950 dark:text-indigo-300"
                                        />
                                        <Percent size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                                    </div>
                                    <p className="text-[9px] text-indigo-400 font-bold text-center mt-3 uppercase tracking-tighter">* Esta taxa será deduzida automaticamente do faturamento bruto nos relatórios.</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Save size={18} /> Salvar Regra
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            {/* COMMISSION RULE MODAL */}
            {
                isCommissionModalOpen && editingCommission && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col border-2 border-black dark:border-zinc-700 max-h-[90vh]">
                            <div className="px-6 py-5 bg-slate-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                                    <Handshake size={20} className="text-emerald-400" />
                                    Editar Período {editingCommission.id}
                                </h3>
                                <button onClick={() => setIsCommissionModalOpen(false)} className="p-1 hover:text-emerald-400 transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveCommission} className="p-6 md:p-8 space-y-6 bg-white dark:bg-zinc-900 overflow-y-auto scrollbar-hide">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1.5 ml-1">Dia Início</label>
                                        <div className="relative">
                                            <select name="startDay" defaultValue={editingCommission.startDay} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black outline-none appearance-none focus:border-indigo-600">
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={d}>Dia {d}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1.5 ml-1">Dia Fim</label>
                                        <div className="relative">
                                            <select name="endDay" defaultValue={editingCommission.endDay} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black outline-none appearance-none focus:border-indigo-600">
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={d}>Dia {d}</option>
                                                ))}
                                                <option value="last">Último Dia</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-800">
                                    <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-2 ml-1 text-center">Dia do Pagamento</label>
                                    <div className="relative max-w-[200px] mx-auto">
                                        <div className="relative">
                                            <select name="paymentDay" defaultValue={editingCommission.paymentDay} className="w-full bg-white dark:bg-zinc-900 border-2 border-emerald-600 rounded-2xl p-4 text-xl font-black text-center outline-none text-emerald-950 dark:text-emerald-300 appearance-none">
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={d}>Dia {d}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-emerald-400 font-bold text-center mt-3 uppercase tracking-tighter">* Data limite para realizar os pagamentos deste período.</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsCommissionModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Save size={18} /> Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
