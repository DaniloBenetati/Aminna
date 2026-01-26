
import React, { useState } from 'react';
import {
    // Add Tag to the imports from lucide-react
    Settings, BookOpen, LayoutDashboard, Calendar, Users, DollarSign,
    Package, ShoppingCart, Briefcase, Sparkles, Handshake, BarChart3,
    Clock, Contact, CreditCard, ChevronRight, Info, CheckCircle2, User, Search,
    X, ArrowRight, ExternalLink, Percent, Landmark, Wallet, Smartphone, ShieldCheck, Save, Plus, Trash2, Edit3, ChevronDown, Tag, Coffee, Printer
} from 'lucide-react';
import { ViewState } from '../types';

interface SettingsPageProps {
    onNavigate: (view: ViewState) => void;
}

interface PaymentSetting {
    id: string;
    method: string;
    iconName: 'Smartphone' | 'CreditCard' | 'Landmark' | 'Wallet' | 'Banknote' | 'Ticket';
    fee: number;
    days: number;
    color: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'MANUAL' | 'GENERAL'>('GENERAL');
    const [subTab, setSubTab] = useState<'FINANCE' | 'SYSTEM' | 'UNIT'>('FINANCE');
    const [selectedModule, setSelectedModule] = useState<any>(null);

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
                    <h1>Documentação Técnica e Operacional</h1>
                    <p>Este documento detalha as regras de negócio, módulos funcionais e tecnologias empregadas no sistema.</p>
                </div>

                <div class="section">
                    <h2>1. Módulos do Sistema</h2>
                    <h3>📊 Dashboard</h3>
                    <ul><li>KPIs e Gráficos de performance em tempo real.</li><li>Acesso rápido às funções vitais.</li></ul>

                    <h3>📅 Agenda</h3>
                    <ul><li>Gestão completa de horários e profissionais.</li><li>Controle de status (Pendente, Confirmado, Concluído).</li></ul>

                    <h3>👥 Clientes & CRM</h3>
                    <ul><li>Histórico completo de atendimentos e produtos.</li><li>Funil de vendas (Leads) e identificação de risco de churn.</li></ul>
                    
                    <h3>💰 Financeiro & DRE</h3>
                    <ul><li>Controle de Fluxo de Caixa rigoroso.</li><li>DRE Gerencial (Receita -> Custos -> Lucro).</li></ul>

                    <h3>📦 Estoque & Copa</h3>
                    <ul><li>Controle de insumos (Uso Interno) e Revenda.</li><li>Gestão de itens de cortesia (Copa).</li></ul>
                </div>

                <div class="section">
                    <h2>2. Regras de Negócio por Módulo</h2>
                    
                    <h3>🤝 Parcerias</h3>
                    <ul>
                        <li><strong>Influenciadores:</strong> Custos de permuta computados como CAC (Marketing).</li>
                        <li><strong>Cupons:</strong> Códigos únicos rastreáveis para cálculo de ROI.</li>
                    </ul>

                    <h3>📊 Financeiro</h3>
                    <ul>
                        <li><strong>Caixa Fechado:</strong> Imutabilidade de dados após fechamento diário.</li>
                        <li><strong>Categorização:</strong> Obrigatoriedade de classificar todas as despesas para DRE.</li>
                    </ul>

                    <h3>🛒 Vendas (POS)</h3>
                    <ul>
                        <li><strong>Baixa Automática:</strong> Vendas baixam estoque de revenda imediatamente.</li>
                        <li><strong>Comissões Mistas:</strong> Taxas diferenciadas para serviços vs. produtos.</li>
                    </ul>

                    <h3>✨ Serviços</h3>
                    <ul>
                        <li><strong>Duração Dinâmica:</strong> Bloqueio inteligente da agenda baseado na duração do serviço.</li>
                    </ul>
                </div>

                <div class="section">
                    <h2>3. Stack Tecnológico</h2>
                    <p>Tecnologias modernas utilizadas para alta performance e segurança.</p>
                    
                    <h3>Frontend (Interface)</h3>
                    <div>
                        <span class="tech-tag">React + Vite</span>
                        <span class="tech-tag">TypeScript</span>
                        <span class="tech-tag">TailwindCSS</span>
                        <span class="tech-tag">Lucide Icons</span>
                        <span class="tech-tag">Recharts</span>
                    </div>

                    <h3>Backend & Dados</h3>
                    <div>
                        <span class="tech-tag">Supabase</span>
                        <span class="tech-tag">PostgreSQL</span>
                        <span class="tech-tag">Row Level Security (RLS)</span>
                    </div>
                </div>

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
                                    <h1 className="text-2xl font-black uppercase text-indigo-600 dark:text-indigo-400 m-0">Documentação do Sistema</h1>
                                    <button
                                        onClick={handlePrintDocumentation}
                                        className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2"
                                    >
                                        <Printer size={16} /> Imprimir / PDF
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-xl font-black uppercase flex items-center gap-3 mb-6 text-slate-800 dark:text-slate-200 border-b border-indigo-100 dark:border-zinc-800 pb-2">
                                            <LayoutDashboard size={24} className="text-indigo-600" />
                                            Módulos Operacionais
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Calendar className="text-indigo-500" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Agenda (Completa e Diária)</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Gestão total do tempo. Visualize a agenda mensal ou foque no operacional do dia ("Agenda Diária") para realizar check-in/out. Suporta agendamentos com múltiplos serviços e profissionais simultâneos.
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Contact className="text-pink-500" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Clientes</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Base completa com histórico de visitas, preferências e restrições. O sistema identifica automaticamente clientes VIP ou em Risco de Churn.
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Users className="text-blue-500" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">CRM (Leads)</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Funil de vendas para potenciais clientes. Acompanhe desde o primeiro contato (Instagram/WhatsApp) até a conversão em cliente real.
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Coffee className="text-amber-600" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Copa & Consumo</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Controle de itens servidos como cortesia (café, água) e consumo interno da equipe. Gera custo operacional auditável sem cobrar do cliente.
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-xl font-black uppercase flex items-center gap-3 mb-6 text-slate-800 dark:text-slate-200 border-b border-indigo-100 dark:border-zinc-800 pb-2">
                                            <Briefcase size={24} className="text-indigo-600" />
                                            Gestão e Backoffice
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Package className="text-emerald-600" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Estoque</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Controle híbrido de produtos: "Uso Interno" (consumo profissional) e "Venda" (home care). Alertas de reposição automáticos.
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <BarChart3 className="text-violet-600" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Financeiro & DRE</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Fluxo de caixa rigoroso e DRE estruturada: Receita Bruta ➔ Líquida ➔ Lucro Bruto ➔ Resultado Operacional ➔ Lucro Líquido.
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <DollarSign className="text-green-600" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Fechamentos</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Cálculo automatizado de comissões. O sistema usa o "snapshot" da taxa no momento do agendamento para garantir precisão histórica no pagamento.
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Handshake className="text-orange-500" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Parcerias</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Gestão de influenciadores e parceiros locais. Crie campanhas e cupons para medir exatamente o retorno sobre o investimento (ROI).
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-xl font-black uppercase flex items-center gap-3 mb-6 text-slate-800 dark:text-slate-200 border-b border-indigo-100 dark:border-zinc-800 pb-2">
                                            <Settings size={24} className="text-indigo-600" />
                                            Configurações
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Sparkles className="text-cyan-500" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Serviços</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Cadastro do menu de serviços, preços, durações e especialidades técnicas exigidas para execução.
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Briefcase className="text-slate-500" size={20} />
                                                    <strong className="block text-base font-black text-slate-900 dark:text-white uppercase">Profissionais</strong>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    Cadastro da equipe, definição de comissões individuais, especialidades e dados bancários para pagamento.
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-lg font-black uppercase flex items-center gap-2 mb-4">
                                            <Settings size={20} className="text-slate-400" />
                                            Regras de Negócio
                                        </h3>
                                        <ul className="space-y-4">
                                            <li className="flex gap-4 items-start p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-300 shrink-0">
                                                    <Briefcase size={16} />
                                                </div>
                                                <div>
                                                    <strong className="block text-xs font-black uppercase text-indigo-900 dark:text-indigo-300 mb-1">Comissões (Snapshot)</strong>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        A taxa de comissão é gravada no momento do agendamento. Alterações no perfil do profissional só valem para agendamentos futuros.
                                                    </p>
                                                </div>
                                            </li>
                                            <li className="flex gap-4 items-start p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                                <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300 shrink-0">
                                                    <Sparkles size={16} />
                                                </div>
                                                <div>
                                                    <strong className="block text-xs font-black uppercase text-emerald-900 dark:text-emerald-300 mb-1">Multiserviços</strong>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        Agendamentos podem conter múltiplos serviços com diferentes profissionais executando simultaneamente.
                                                    </p>
                                                </div>
                                            </li>
                                            <li className="flex gap-4 items-start p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg text-amber-600 dark:text-amber-300 shrink-0">
                                                    <Coffee size={16} />
                                                </div>
                                                <div>
                                                    <strong className="block text-xs font-black uppercase text-amber-900 dark:text-amber-300 mb-1">Copa e Consumo</strong>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        Itens consumidos por clientes são cortesia (Custo Atendimento). Itens da equipe são Custo Administrativo.
                                                    </p>
                                                </div>
                                            </li>
                                            <li className="flex gap-4 items-start p-4 bg-slate-50/50 dark:bg-zinc-800/30 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                <div className="p-2 bg-slate-100 dark:bg-zinc-700 rounded-lg text-slate-600 dark:text-slate-300 shrink-0">
                                                    <BarChart3 size={16} />
                                                </div>
                                                <div>
                                                    <strong className="block text-xs font-black uppercase text-slate-900 dark:text-white mb-1">Estrutura DRE</strong>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        1. Receita Bruta (-) Deduções (=) Receita Líquida<br />
                                                        (-) CMV/CPV (=) Lucro Bruto<br />
                                                        (-) Despesas (Vendas/Adm/Fin) (=) Resultado Antes IRPJ<br />
                                                        (-) IRPJ/CSLL (=) Resultado Líquido
                                                    </p>
                                                </div>
                                            </li>
                                        </ul>
                                    </section>
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
