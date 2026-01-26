
import React, { useState } from 'react';
import { DOCUMENTATION_DATA } from './DocumentationData';
import {
    // Add Tag to the imports from lucide-react
    Settings, BookOpen, LayoutDashboard, Calendar, Users, DollarSign,
    Package, ShoppingCart, Briefcase, Sparkles, Handshake, BarChart3,
    Clock, Contact, CreditCard, ChevronRight, Info, CheckCircle2, User, Search,
    X, ArrowRight, ExternalLink, Percent, Landmark, Wallet, Smartphone, ShieldCheck, Save, Plus, Trash2, Edit3, ChevronDown, Tag, Coffee, Printer
} from 'lucide-react';
import { ViewState } from '../types';

// ... imports ...
import { ViewState, ExpenseCategory } from '../types';

interface SettingsPageProps {
    onNavigate: (view: ViewState) => void;
    expenseCategories?: ExpenseCategory[];
    setExpenseCategories?: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
}

// ... existing interfaces ...

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, expenseCategories = [], setExpenseCategories }) => {
    // ... existing state ...
    const [subTab, setSubTab] = useState<'FINANCE' | 'SYSTEM' | 'UNIT' | 'CATEGORIES'>('FINANCE');

    // ... existing payment handlers ...

    // Category Handlers
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDRE, setNewCategoryDRE] = useState<ExpenseCategory['dreClass']>('EXPENSE_ADM');

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim() || !setExpenseCategories) return;

        const newCat: ExpenseCategory = {
            id: `cat-${Date.now()}`,
            name: newCategoryName,
            dreClass: newCategoryDRE,
            isSystem: false
        };

        setExpenseCategories(prev => [...prev, newCat]);
        setNewCategoryName('');
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

    // ... return JSX ...

    // ... inside subTab content ...
    {
        [
            { id: 'FINANCE', label: 'Financeiro', icon: Landmark },
            { id: 'CATEGORIES', label: 'Planilhas DRE', icon: Tag }, // New Tab
            { id: 'SYSTEM', label: 'Sistema', icon: Settings },
            { id: 'UNIT', label: 'Minha Unidade', icon: Info },
        ].map(st => (
            // ...

            {/* CATEGORIES TAB */ }
                        { subTab === 'CATEGORIES' && (
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

                        <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-slate-100 dark:border-zinc-700 mb-8">
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Categoria</label>
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
                            <button disabled={!newCategoryName} type="submit" className="px-6 py-3 bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors w-full md:w-auto h-[48px]">
                                Adicionar
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
                                                    {!cat.isSystem && (
                                                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                    {cat.isSystem && <span className="text-[9px] uppercase font-bold text-slate-300 select-none">Padrão</span>}
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

    {
        subTab === 'FINANCE' && (
                            // ... existing finance content ...

    // Modal State for Payment Rules
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
        const [editingPayment, setEditingPayment] = useState<PaymentSetting | null>(null);

        // Mock de configurações financeiras
        const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([
            { id: 'pix', method: 'Pix', iconName: 'Smartphone', fee: 0, days: 0, color: 'text-emerald-500' },
            { id: 'credit_vista', method: 'Cartão de Crédito (À Vista)', iconName: 'CreditCard', fee: 3.49, days: 30, color: 'text-indigo-500' },
            { id: 'debit', method: 'Cartão de Débito', iconName: 'Landmark', fee: 1.25, days: 1, color: 'text-blue-500' },
            { id: 'cash', method: 'Dinheiro', iconName: 'Wallet', fee: 0, days: 0, color: 'text-amber-500' },
        ]);

        const iconMap = {
            Smartphone: Smartphone,
            CreditCard: CreditCard,
            Landmark: Landmark,
            Wallet: Wallet,
            Banknote: DollarSign,
            Ticket: Tag
        };

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
            if (confirm('Deseja realmente excluir esta regra de pagamento?')) {
                setPaymentSettings(prev => prev.filter(p => p.id !== id));
            }
        };

        // Rest of the Manual Module Definitions (keeping them for consistency)
        const modules = [
            { title: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-600', bg: 'bg-indigo-50', viewState: ViewState.DASHBOARD, description: 'Visão geral do negócio...', features: ['KPIs', 'Fluxo'], mockup: null },
            // ... other modules simplified for brevity in this component context
        ];

        const handleNavigateToModule = () => {
            if (selectedModule) onNavigate(selectedModule.viewState);
        };

        const handlePrintDocumentation = () => {
            const renderSection = (section: any) => {
                let html = `<div class="section"><h2>${section.title}</h2>`;
                if (section.content) html += `<p>${section.content}</p>`;

                if (section.subsections) {
                    section.subsections.forEach((sub: any) => {
                        html += `<h3>${sub.title}</h3>`;
                        if (sub.subtitle) html += `<p><strong>${sub.subtitle}</strong></p>`;
                        if (sub.description) html += `<p>${sub.description}</p>`;
                        if (sub.items) {
                            html += `<ul>${sub.items.map((i: any) => `<li><strong>${i.label}:</strong> ${i.text}</li>`).join('')}</ul>`;
                        }
                        if (sub.customContent) html += sub.customContent;
                        if (sub.tags) {
                            html += `<div>${sub.tags.map((t: string) => `<span class="tech-tag">${t}</span>`).join('')}</div>`;
                        }
                        if (sub.hasDiagram) {
                            html += `<div style="border:1px dashed #ccc; padding:10px; margin:10px 0; text-align:center; color:#666; font-style:italic;">[Diagrama: ${sub.diagramType}]</div>`;
                        }
                    });
                }
                if (section.hasDiagram) {
                    html += `<div style="border:1px dashed #ccc; padding:10px; margin:10px 0; text-align:center; color:#666; font-style:italic;">[Diagrama: ${section.diagramType}]</div>`;
                }
                if (section.analysis) {
                    html += `<ul>${section.analysis.map((i: any) => `<li><strong>${i.label}:</strong> ${i.text}</li>`).join('')}</ul>`;
                }
                html += `</div>`;
                return html;
            };

            const printContent = `
            <html>
            <head>
                <title>Documentação do Sistema - Aminna</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; max-width: 800px; mx-auto; }
                    h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 30px; font-size: 24px; text-transform: uppercase; }
                    h2 { color: #333; border-left: 5px solid #4f46e5; padding-left: 10px; margin-top: 30px; font-size: 18px; text-transform: uppercase; background: #f3f4f6; padding-top: 5px; padding-bottom: 5px; }
                    h3 { color: #555; margin-top: 20px; font-size: 16px; font-weight: bold; }
                    ul { margin-top: 10px; margin-bottom: 20px; }
                    li { margin-bottom: 8px; font-size: 14px; }
                    .tech-tag { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 5px; margin-bottom: 5px; }
                    .section { margin-bottom: 40px; }
                    .logo { text-align: center; margin-bottom: 40px; }
                    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
                    @media print {
                        body { padding: 0; }
                        h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="logo">
                     <h1 style="border:none; margin:0; font-size: 32px;">AMINNA</h1>
                     <p style="margin:0; color: #666; font-size: 12px; font-weight: bold; letter-spacing: 2px;">GESTÃO INTELIGENTE</p>
                </div>

                <div class="section">
                    <h1>${DOCUMENTATION_DATA.title}</h1>
                    <p>${DOCUMENTATION_DATA.description}</p>
                    <div style="background:#fff7ed; color:#9a3412; padding:10px; border-left:4px solid #f97316; font-size:0.9em; margin:20px 0;">
                        <strong>NOTA:</strong> ${DOCUMENTATION_DATA.note}
                    </div>
                </div>

                ${DOCUMENTATION_DATA.sections.map(section => renderSection(section)).join('')}

                <div class="footer">
                    Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.
                </div>

                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(printContent);
                win.document.close();
            }
        };

        return (
            <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col text-slate-900 dark:text-white">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight uppercase">Ajustes do Sistema</h2>
                        <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Configurações e Documentação</p>
                    </div>
                </div>

                {/* Tabs Principais */}
                <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto self-start shadow-sm">
                    <button
                        onClick={() => setActiveTab('MANUAL')}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'MANUAL' ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <BookOpen size={16} /> Manual
                    </button>
                    <button
                        onClick={() => setActiveTab('GENERAL')}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'GENERAL' ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Settings size={16} /> Configurações
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {activeTab === 'MANUAL' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 p-8 shadow-sm">
                                <div className="prose dark:prose-invert max-w-none">
                                    <div className="flex justify-between items-center mb-6">
                                        <h1 className="text-2xl font-black uppercase text-indigo-600 dark:text-indigo-400 m-0">{DOCUMENTATION_DATA.title}</h1>
                                        <button
                                            onClick={handlePrintDocumentation}
                                            className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2"
                                        >
                                            <Printer size={16} /> Imprimir / PDF
                                        </button>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">{DOCUMENTATION_DATA.description}</p>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border-l-4 border-amber-500 text-amber-800 dark:text-amber-200 text-sm my-6">
                                        <strong>NOTA:</strong> {DOCUMENTATION_DATA.note}
                                    </div>

                                    <div className="space-y-8">
                                        {DOCUMENTATION_DATA.sections.map((section, idx) => (
                                            <section key={idx} className="border-t border-slate-100 dark:border-zinc-800 pt-8 first:border-none first:pt-0">
                                                <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white mb-4 bg-slate-100 dark:bg-zinc-800 p-2 rounded-lg inline-block">{section.title}</h2>
                                                {section.content && <p className="mb-4 text-slate-600 dark:text-slate-400 text-sm">{section.content}</p>}

                                                {section.subsections && (
                                                    <div className="grid gap-6">
                                                        {section.subsections.map((sub, sIdx) => (
                                                            <div key={sIdx} className="bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                                <h3 className="text-base font-black text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                                                    {sub.title}
                                                                </h3>
                                                                {sub.subtitle && <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">{sub.subtitle}</p>}
                                                                {sub.description && <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{sub.description}</p>}

                                                                {sub.items && (
                                                                    <ul className="space-y-2 mt-2">
                                                                        {sub.items.map((item, iIdx) => (
                                                                            <li key={iIdx} className="text-xs text-slate-600 dark:text-slate-400">
                                                                                <strong className="text-slate-900 dark:text-white uppercase text-[10px] tracking-wider">{item.label}:</strong> {item.text}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}

                                                                {sub.customContent && <div dangerouslySetInnerHTML={{ __html: sub.customContent }} />}

                                                                {sub.tags && (
                                                                    <div className="flex flex-wrap gap-2 mt-4">
                                                                        {sub.tags.map(tag => (
                                                                            <span key={tag} className="px-2 py-1 bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold uppercase">{tag}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {section.analysis && (
                                                    <div className="mt-4 bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                        <h4 className="font-bold text-sm mb-2">Análise de Relacionamentos</h4>
                                                        <ul className="space-y-2">
                                                            {section.analysis.map((item, aIdx) => (
                                                                <li key={aIdx} className="text-xs text-slate-600 dark:text-slate-400">
                                                                    <strong className="text-slate-900 dark:text-white">{item.label}:</strong> {item.text}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </section>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'GENERAL' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Sub-abas de Configuração */}
                            <div className="flex gap-4 border-b border-slate-100 dark:border-zinc-800 pb-2 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'FINANCE', label: 'Financeiro', icon: Landmark },
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
                </div>

                {/* PAYMENT RULE MODAL */}
                {isPaymentModalOpen && (
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
                )}
            </div>
        );
    };
