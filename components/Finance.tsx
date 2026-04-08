
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    ShoppingCart, Plus, Minus, Search, Calendar, User, Package, Check, X,
    DollarSign, Wallet, TrendingUp, BarChart3, Filter, CreditCard, ArrowUpRight,
    ChevronDown, Trash2, ShoppingBag, ArrowDownCircle, ArrowUpCircle, CircleCheck,
    Clock, AlertCircle, FileText, Printer, Edit2, Users, ChevronRight, BarChart as BarChartIcon,
    PieChart, BrainCircuit, Landmark, Wallet2, Receipt, Building2, LayoutPanelLeft,
    Calculator as CalcIcon, History, Info, ChevronLeft, CalendarDays, RefreshCw, CircleX,
    Download, AlertTriangle, Target, Files, Save, List, ArrowRight, Sparkles, MessageCircle, Lock,
    PenTool, FolderPlus, CalendarRange, ChevronUp, Menu, TrendingDown, Paperclip, Stamp,
    ShieldCheck, Share2, Copy, Send, Percent, Crown, BarChart2, Zap, Link2, FilePlus,
    Scissors, Truck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { Service, FinancialTransaction, BankTransaction, Expense, Appointment, Sale, ExpenseCategory, PaymentSetting, CommissionSetting, Supplier, Provider, Customer, StockItem, Partner, Campaign, FinancialConfig, Employee, PayrollRecord } from '../types';
import { supabase } from '../services/supabase';
import { FinanceCharts } from './FinanceCharts';
import { toLocalDateStr, parseDateSafe, generateFinancialTransactions, calculateDailySummary, getAnticipationRate, calculateAppointmentProduction, calculateProductionRevenue } from '../services/financialService';
import { DailyCloseView } from './DailyCloseView';
import { BankReconciliation } from './BankReconciliation';

// --- CURRENCY FORMATTERS ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const formatValue = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

// --- MOCK DATA GENERATOR FOR OPERATIONAL EXPENSES ---
const generateMockExpenses = (): Expense[] => {
    // Return empty array to start fresh as requested by user
    return [];
};

// --- DAILY CLOSE COMPONENT ---
// DailyCloseView is now imported from ./DailyCloseView

// --- MANUAL LINK MODAL COMPONENT ---
interface ManualLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    bankTx: BankTransaction | null;
    expenses: Expense[];
    sales: Sale[];
    appointments: Appointment[];
    onLink: (bankTxId: string, items: { id: string, type: 'EXPENSE' | 'SALE' | 'APPOINTMENT', amount: number }[], newExpense?: { description: string, category: string, amount: number, supplierId?: string, providerId?: string, employeeId?: string }) => Promise<void>;
    isProcessing: boolean;
    parseDateSafe: (date: any) => Date;
    suppliers: Supplier[];
    customers: Customer[];
    expenseCategories: ExpenseCategory[];
    providers: Provider[];
    employees: Employee[];
    transactions: FinancialTransaction[];
    bankTransactions: BankTransaction[];
}

// --- BATCH LINK MODAL COMPONENT ---
interface BatchLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedExpenses: Expense[];
    bankTransactions: BankTransaction[];
    onLink: (bankTxId: string, expenseIds: string[]) => Promise<void>;
    isProcessing: boolean;
    parseDateSafe: (date: any) => Date;
}

const BatchLinkModal: React.FC<BatchLinkModalProps> = ({ 
    isOpen, onClose, selectedExpenses, bankTransactions, onLink, isProcessing, parseDateSafe 
}) => {
    const [searchBank, setSearchBank] = useState('');
    const [selectedBankTxId, setSelectedBankTxId] = useState<string | null>(null);

    const filteredBankTxs = useMemo(() => {
        return (bankTransactions || []).filter(bt => 
            !bt.reconciled && 
            bt.type === 'DESPESA' && // Batch linking defaults to expenses in 'Contas a Pagar'
            (bt.description.toLowerCase().includes(searchBank.toLowerCase()) || bt.amount.toString().includes(searchBank))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [bankTransactions, searchBank]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden scale-in-center duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                           <Link2 className="text-indigo-600" /> Vincular Selecionados
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                           Selecione a transação bancária correspondente
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                        <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Itens Selecionados ({selectedExpenses.length})</h3>
                        <div className="space-y-2 max-h-32 overflow-auto scrollbar-hide">
                            {selectedExpenses.map(exp => (
                                <div key={exp.id} className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[300px]">{exp.description}</span>
                                    <span className="font-black text-rose-600">R$ {exp.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-indigo-200/50 flex justify-between text-sm font-black">
                            <span className="text-indigo-700 dark:text-indigo-300">Total Selecionado:</span>
                            <span className="text-indigo-700 dark:text-indigo-300">R$ {selectedExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Buscar transação bancária (descrição ou valor)..."
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold uppercase outline-none focus:border-indigo-500 transition-all placeholder:text-[10px]"
                                value={searchBank}
                                onChange={e => setSearchBank(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-auto scrollbar-hide pr-2">
                            {filteredBankTxs.map(tx => (
                                <button
                                    key={tx.id}
                                    onClick={() => setSelectedBankTxId(tx.id)}
                                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all group ${selectedBankTxId === tx.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBankTxId === tx.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-zinc-800 text-slate-400 group-hover:bg-slate-100'}`}>
                                            <Landmark size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[250px]">{tx.description}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{parseDateSafe(tx.date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-rose-600">R$ {tx.amount.toFixed(2)}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Bancário</p>
                                    </div>
                                </button>
                            ))}
                            {filteredBankTxs.length === 0 && (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-3xl">
                                    Nenhuma transação bancária disponível
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 px-6 py-4 bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase rounded-2xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 transition-all">Cancelar</button>
                    <button 
                        onClick={() => selectedBankTxId && onLink(selectedBankTxId, selectedExpenses.map(e => e.id))}
                        disabled={!selectedBankTxId || isProcessing}
                        className="flex-[2] px-6 py-4 bg-indigo-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Link2 size={16} />}
                        Confirmar Vínculo
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManualLinkModal: React.FC<ManualLinkModalProps> = ({ 
    isOpen, onClose, bankTx, expenses, sales, appointments, onLink, isProcessing, parseDateSafe, suppliers, customers, expenseCategories, providers, employees, transactions, bankTransactions
}) => {
    const [innerSearch, setInnerSearch] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ id: string, type: 'EXPENSE' | 'SALE' | 'APPOINTMENT', amount: number }[]>([]);
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');

    // Quick Expense Creation State
    const [isCreatingQuickExpense, setIsCreatingQuickExpense] = useState(false);
    const [quickExpenseCategory, setQuickExpenseCategory] = useState('');
    const [quickExpenseDescription, setQuickExpenseDescription] = useState('');
    const [quickSupplierId, setQuickSupplierId] = useState('');
    const [quickProviderId, setQuickProviderId] = useState('');
    const [quickEmployeeId, setQuickEmployeeId] = useState('');

    // Reset state when bankTx changes or modal opens
    useEffect(() => {
        if (isOpen && bankTx) {
            setInnerSearch('');
            setSelectedItems(bankTx.systemMatches || []);

            // DEFAULT to 'all' to ensure everything is visible to the user unless they want to filter
            setFilterMonth('all');
            setFilterYear('all');
            setFilterType(bankTx.type === 'RECEITA' ? 'REVENUE' : 'EXPENSE');

            // Reset quick expense creation
            setIsCreatingQuickExpense(false);
            setQuickExpenseCategory('');
            setQuickExpenseDescription(bankTx.description || '');
            setQuickSupplierId('');
            setQuickProviderId('');
            setQuickEmployeeId('');
        }
    }, [isOpen, bankTx?.id]);

    if (!isOpen || !bankTx) return null;

    const pendingExpenses = (expenses || []).filter(e => !e.isReconciled || (bankTx.systemMatches || []).some(m => m.type === 'EXPENSE' && m.id === e.id));
    const pendingSales = (sales || []).filter(s => !s.isReconciled || (bankTx.systemMatches || []).some(m => m.type === 'SALE' && m.id === s.id));
    const pendingAppointments = (appointments || []).filter(a => !a.isReconciled || (bankTx.systemMatches || []).some(m => m.type === 'APPOINTMENT' && m.id === a.id));
    
    // Add derived commissions to the list of linkable items
    const linkableCommissions = transactions.filter(t => 
        t.category === 'Repasse Comissão' && 
        (!bankTransactions.some(bt => bt.systemMatches?.some(m => m.id === t.id)) || (bankTx.systemMatches || []).some(m => m.id === t.id))
    );

    const allPending = [
        ...pendingExpenses.map(e => {
            const sup = (suppliers || []).find(s => s.id === e.supplierId);
            const prov = (providers || []).find(p => p.id === e.providerId);
            const emp = (employees || []).find(ee => ee.id === e.employeeId);
            return { id: e.id, type: 'EXPENSE' as const, description: e.description || '', amount: e.amount || 0, date: e.date, origin: 'Despesa', entity: sup?.name || prov?.name || emp?.name || '' };
        }),
        ...linkableCommissions.map(c => ({
            id: c.id, type: 'EXPENSE' as const, description: c.description, amount: c.amount, date: c.date, origin: 'Despesa', entity: c.providerName || ''
        })),
        ...pendingSales.map(s => {
            const cus = (customers || []).find(c => c.id === s.customerId);
            return { id: s.id, type: 'SALE' as const, description: `Venda #${(s.id || '').slice(0, 5)}`, amount: s.totalAmount || 0, date: s.date, origin: 'Venda', entity: cus?.name || '' };
        }),
        ...pendingAppointments.map(a => {
            const cus = (customers || []).find(c => c.id === a.customerId);
            return { id: a.id, type: 'APPOINTMENT' as const, description: `Agendamento: ${a.combinedServiceNames || 'Serviço'}`, amount: a.bookedPrice || a.pricePaid || 0, date: a.date, origin: 'Serviço', entity: cus?.name || '' };
        })
    ].filter(item => {
        const itemDate = parseDateSafe(item.date);
        const matchesMonth = filterMonth === 'all' || (itemDate.getMonth() + 1).toString() === filterMonth;
        const matchesYear = filterYear === 'all' || itemDate.getFullYear().toString() === filterYear;

        // REVENUE type matches SALE and APPOINTMENT
        const matchesType = filterType === 'all' ||
            (filterType === 'EXPENSE' && item.type === 'EXPENSE') ||
            (filterType === 'REVENUE' && (item.type === 'SALE' || item.type === 'APPOINTMENT'));

        const desc = (item.description || '').toLowerCase();
        const ent = (item.entity || '').toLowerCase();
        const amt = (item.amount || 0).toString();
        const search = (innerSearch || '').toLowerCase();
        return matchesMonth && matchesYear && matchesType && (desc.includes(search) || ent.includes(search) || amt.includes(search));
    }).sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
    });

    const months = [
        { value: 'all', label: 'Todos os Meses' },
        { value: '1', label: 'Janeiro' },
        { value: '2', label: 'Fevereiro' },
        { value: '3', label: 'Março' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Maio' },
        { value: '6', label: 'Junho' },
        { value: '7', label: 'Julho' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' }
    ];

    const currentYear = new Date().getFullYear();
    const years = ['all', ...Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())];

    const totalSelected = selectedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const bankAmount = Math.abs(bankTx.amount || 0);
    const diff = bankAmount - totalSelected;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 w-full md:max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                                <Link2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Vincular Lançamentos</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Selecione contas que totalizam o valor do banco</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="mt-6 p-4 bg-white dark:bg-zinc-800 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bankTx.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {bankTx.type === 'RECEITA' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 font-mono">LANÇAMENTO DO BANCO</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{bankTx.description}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400 font-mono">VALOR EXTRATO</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">R$ {bankAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-b dark:border-zinc-800 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por descrição, valor ou entidade..."
                                value={innerSearch}
                                onChange={e => setInnerSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className={`px-6 py-4 rounded-2xl flex flex-col items-center justify-center min-w-[150px] ${Math.abs(diff) < 0.01 ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600'}`}>
                            <span className="text-[9px] font-black uppercase">Total Selecionado</span>
                            <span className="text-lg font-black font-mono">R$ {totalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 p-2 rounded-xl border border-slate-200 dark:border-zinc-700">
                            <Calendar size={14} className="text-slate-400 ml-1" />
                            <select
                                value={filterMonth}
                                onChange={e => setFilterMonth(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 outline-none text-slate-600 dark:text-slate-300 min-w-[120px]"
                            >
                                {months.map(m => (
                                    <option key={m.value} value={m.value} className="dark:bg-zinc-900">{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 p-2 rounded-xl border border-slate-200 dark:border-zinc-700">
                            <Clock size={14} className="text-slate-400 ml-1" />
                            <select
                                value={filterYear}
                                onChange={e => setFilterYear(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 outline-none text-slate-600 dark:text-slate-300"
                            >
                                {years.map(y => (
                                    <option key={y} value={y} className="dark:bg-zinc-900">{y === 'all' ? 'Todos os Anos' : y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 p-2 rounded-xl border border-slate-200 dark:border-zinc-700">
                            <BarChart2 size={14} className="text-slate-400 ml-1" />
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 outline-none text-slate-600 dark:text-slate-300 min-w-[100px]"
                            >
                                <option value="all" className="dark:bg-zinc-900">Todos os Tipos</option>
                                <option value="EXPENSE" className="dark:bg-zinc-900">Despesas</option>
                                <option value="REVENUE" className="dark:bg-zinc-900">Receitas (Vendas/Serviços)</option>
                            </select>
                        </div>

                        {(filterMonth !== 'all' || filterYear !== 'all' || filterType !== 'all') && (
                            <button
                                onClick={() => { setFilterMonth('all'); setFilterYear('all'); setFilterType('all'); }}
                                className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-600 ml-2"
                            >
                                Limpar Filtros
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Current Links Section */}
                    {selectedItems.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase text-indigo-500 mb-3 tracking-widest flex items-center gap-2">
                                <Link2 size={12} /> Vínculos Atuais ({selectedItems.length})
                            </p>
                            <div className="space-y-2">
                                {selectedItems.map(item => {
                                    const detail = (() => {
                                        if (item.type === 'EXPENSE') {
                                            const exp = expenses.find(e => e.id === item.id);
                                            if (exp) return { desc: exp.description, cat: exp.category, ent: suppliers.find(s => s.id === exp.supplierId)?.name || providers.find(p => p.id === exp.providerId)?.name || employees.find(e => e.id === exp.employeeId)?.name || 'Despesa' };
                                            
                                            // Check derived transactions (Commissions, Card Fees)
                                            const tx = transactions.find(tr => tr.id === item.id);
                                            if (tx) return { desc: tx.description, cat: tx.category, ent: tx.customerOrProviderName || tx.providerName || 'Despesa' };
                                            
                                            return { desc: 'Lançamento Vinculado', cat: 'Despesa', ent: '-' };
                                        } else if (item.type === 'SALE') {
                                            const s = sales.find(s => s.id === item.id);
                                            if (s) return { desc: `Venda #${s.id.slice(0, 5)}`, cat: 'Venda', ent: customers.find(c => c.id === s.customerId)?.name || 'Cliente' };
                                            return { desc: 'Venda Vinculada', cat: 'Venda', ent: '-' };
                                        } else {
                                            const a = appointments.find(a => a.id === item.id);
                                            if (a) return { desc: `Serviço: ${a.combinedServiceNames || 'Agendamento'}`, cat: 'Serviço', ent: customers.find(c => c.id === a.customerId)?.name || 'Cliente' };
                                            return { desc: 'Agendamento Vinculado', cat: 'Serviço', ent: '-' };
                                        }
                                    })();

                                    return (
                                        <div 
                                            key={`selected-${item.type}-${item.id}`}
                                            className="w-full p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-between group animate-in zoom-in-95 duration-200"
                                        >
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center">
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black uppercase bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded">{detail.cat}</span>
                                                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{detail.ent}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{detail.desc}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="text-sm font-black text-indigo-600">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                <button 
                                                    onClick={() => setSelectedItems(prev => prev.filter(si => !(si.id === item.id && si.type === item.type)))}
                                                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                                    title="Desvincular"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Available Items Section */}
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                            {innerSearch ? 'Resultados da Busca' : 'Outros Itens Pendentes'}
                        </p>
                        <div className="space-y-2">
                            {allPending.filter(item => !selectedItems.some(si => si.id === item.id && si.type === item.type)).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50 dark:bg-zinc-800/20 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-zinc-800">
                                    <Search size={32} className="mb-2 opacity-20" />
                                    <p className="font-bold uppercase text-[9px] tracking-widest">Nenhum item adicional encontrado</p>
                                </div>
                            ) : allPending.filter(item => !selectedItems.some(si => si.id === item.id && si.type === item.type)).map(item => {
                                return (
                                    <button
                                        key={`pending-${item.type}-${item.id}`}
                                        onClick={() => {
                                            setSelectedItems(prev => [...prev, { id: item.id, type: item.type, amount: item.amount }]);
                                        }}
                                        className="w-full p-4 rounded-2xl border-2 border-slate-50 dark:border-zinc-800/50 hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-zinc-700 text-transparent flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-400 transition-colors">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-500">{item.origin}</span>
                                                    <span className="text-[8px] font-black text-slate-400">{parseDateSafe(item.date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.description}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{item.entity}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                    <div className="flex-1">
                        {Math.abs(diff) > 0.01 && !isCreatingQuickExpense && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-rose-500">
                                    <AlertCircle size={14} />
                                    <p className="text-[9px] font-black uppercase">Diferença de R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <button
                                    onClick={() => setIsCreatingQuickExpense(true)}
                                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                    <Plus size={12} /> Resolver com Nova Despesa
                                </button>
                            </div>
                        )}
                        {isCreatingQuickExpense && (
                            <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/30 flex flex-col gap-3 max-w-md animate-in slide-in-from-bottom-2 duration-200">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[9px] font-black uppercase text-slate-500">Nova Despesa de Ajuste (R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</p>
                                    <button onClick={() => setIsCreatingQuickExpense(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                                </div>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Descrição do ajuste..."
                                        value={quickExpenseDescription}
                                        onChange={e => setQuickExpenseDescription(e.target.value)}
                                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                    />
                                    <select
                                        value={quickExpenseCategory}
                                        onChange={e => setQuickExpenseCategory(e.target.value)}
                                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione a Categoria...</option>
                                        {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    
                                    <div className="grid grid-cols-1 gap-2">
                                        <select 
                                            value={quickProviderId ? `PRO_${quickProviderId}` : quickEmployeeId ? `EMP_${quickEmployeeId}` : quickSupplierId || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setQuickProviderId('');
                                                setQuickEmployeeId('');
                                                setQuickSupplierId('');
                                                if (val.startsWith('PRO_')) setQuickProviderId(val.replace('PRO_', ''));
                                                else if (val.startsWith('EMP_')) setQuickEmployeeId(val.replace('EMP_', ''));
                                                else setQuickSupplierId(val);
                                            }}
                                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                        >
                                            <option value="">Selecione o Favorecido (Opcional)...</option>
                                            <optgroup label="Profissionais">
                                                {providers.map(p => <option key={p.id} value={`PRO_${p.id}`}>{p.name?.toUpperCase()}</option>)}
                                            </optgroup>
                                            <optgroup label="Funcionários">
                                                {employees.map(p => <option key={p.id} value={`EMP_${p.id}`}>{p.name?.toUpperCase()}</option>)}
                                            </optgroup>
                                            <optgroup label="Fornecedores">
                                                {suppliers.map(p => <option key={p.id} value={p.id}>{p.name?.toUpperCase()}</option>)}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                        {Math.abs(diff) < 0.01 && selectedItems.length > 0 && (
                            <div className="flex items-center gap-2 text-emerald-500">
                                <CircleCheck size={14} />
                                <p className="text-[9px] font-black uppercase">Valores conferem!</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest">
                            Fechar
                        </button>
                        <button
                            disabled={((selectedItems.length === 0 && (!bankTx.systemMatches || bankTx.systemMatches.length === 0)) && !isCreatingQuickExpense) || isProcessing || (isCreatingQuickExpense && !quickExpenseCategory)}
                            onClick={async () => {
                                let newExpense = undefined;
                                if (isCreatingQuickExpense) {
                                    if (!quickExpenseCategory) return alert('Selecione uma categoria para a nova despesa.');
                                    newExpense = {
                                        description: quickExpenseDescription || bankTx.description,
                                        category: quickExpenseCategory,
                                        amount: Math.abs(diff),
                                        supplierId: quickSupplierId,
                                        providerId: quickProviderId,
                                        employeeId: quickEmployeeId
                                    };
                                } else if (Math.abs(diff) > 0.01) {
                                    if (!window.confirm(`Valores não batem. Deseja vincular assim mesmo?`)) return;
                                }
                                await onLink(bankTx.id, selectedItems, newExpense);
                            }}
                            className="px-8 py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 size={14} />}
                            {isCreatingQuickExpense ? 'Criar e Vincular' : `Vincular ${selectedItems.length > 1 ? `(${selectedItems.length})` : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
interface FinanceProps {
    services: Service[];
    appointments: Appointment[];
    sales: Sale[];
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    paymentSettings: PaymentSetting[];
    commissionSettings?: CommissionSetting[];
    expenseCategories: ExpenseCategory[];
    setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    providers: Provider[];
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    stock: StockItem[];
    campaigns: Campaign[];
    partners: Partner[];
    financialConfigs: FinancialConfig[];
    employees?: Employee[];
    payroll?: PayrollRecord[];
}

export const Finance: React.FC<FinanceProps> = ({ services, appointments, setAppointments, sales, setSales, expenseCategories = [], setExpenseCategories, paymentSettings, commissionSettings, suppliers, setSuppliers, providers, customers, setCustomers, stock,
    expenses, setExpenses, campaigns = [], partners = [], financialConfigs = [], employees = [], payroll = []
}) => {
    const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'DRE' | 'CHARTS'>('ACCOUNTS');
    const [accountsSubTab, setAccountsSubTab] = useState<'DETAILED' | 'PAYABLES' | 'DAILY' | 'SUPPLIERS' | 'CONCILIADO' | 'AUDIT'>('DAILY');
    const [supplierSubTab, setSupplierSubTab] = useState<'PROFISSIONAIS' | 'RH' | 'FORNECEDORES'>('PROFISSIONAIS');
    const [conciliadoFilter, setConciliadoFilter] = useState('');
    const [conciliadoTypeFilter, setConciliadoTypeFilter] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL');
    const [conciliadoSplitFilter, setConciliadoSplitFilter] = useState<'ALL' | 'SPLIT' | 'NOT_SPLIT'>('ALL');
    const [conciliadoPage, setConciliadoPage] = useState(1);
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('day');
    const [startDate, setStartDate] = useState(toLocalDateStr(new Date()));
    const [endDate, setEndDate] = useState(toLocalDateStr(new Date()));
    const [chartsSubTab, setChartsSubTab] = useState<'GENERAL' | 'PREDICTIVE'>('GENERAL');
    const [predictiveTargetGrowth, setPredictiveTargetGrowth] = useState(20);
    const [filterProvider, setFilterProvider] = useState('all');
    const [filterService, setFilterService] = useState('all');
    const [filterCampaign, setFilterCampaign] = useState('all');
    const [filterProduct, setFilterProduct] = useState('all');
    const [filterPartner, setFilterPartner] = useState('all');
    const [filterChannel, setFilterChannel] = useState('all');

    // AI Strategist States
    const [isStrategistDetailModalOpen, setIsStrategistDetailModalOpen] = useState(false);
    const [strategistDetailData, setStrategistDetailData] = useState<any[]>([]);
    const [strategistDetailTitle, setStrategistDetailTitle] = useState('');

    // Quick add states
    const [isQuickAddingSupplier, setIsQuickAddingSupplier] = useState(false);
    const [isQuickAddingCategory, setIsQuickAddingCategory] = useState(false);
    const [reconcilingTx, setReconcilingTx] = useState<BankTransaction | null>(null);

    // Reconciled Edit States
    const [editingReconciled, setEditingReconciled] = useState<FinancialTransaction | null>(null);
    const [isReconciledEditModalOpen, setIsReconciledEditModalOpen] = useState(false);
    const [editReconciledForm, setEditReconciledForm] = useState({
        description: '',
        category: '',
        customerOrProviderName: '',
        supplierId: ''
    });

    // Manual Linking States
    const [linkingBankTx, setLinkingBankTx] = useState<BankTransaction | null>(null);
    const [isManualLinkModalOpen, setIsManualLinkModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isManualLinkingProcessing, setIsManualLinkingProcessing] = useState(false); // Added for consistency

    // Dashboard Indicators Notification
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Effect to clear notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Yearly Billing Comparison State
    const [yearlyBillingData, setYearlyBillingData] = useState<{
        currentYear: { month: number; total: number }[];
        previousYear: { month: number; total: number }[];
    }>({ currentYear: [], previousYear: [] });

    // Monthly Closing State
    const [monthlyClosings, setMonthlyClosings] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('aminna_monthly_closings');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem('aminna_monthly_closings', JSON.stringify(monthlyClosings));
    }, [monthlyClosings]);

    const toggleMonthlyClosing = (year: number, month: number) => {
        const key = `${year}-${month}`;
        setMonthlyClosings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Bank Transactions State
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [bankTransactionsLoading, setBankTransactionsLoading] = useState(false);
    const [pendingDates, setPendingDates] = useState<string[]>([]);
    const [isPendingDatesLoading, setIsPendingDatesLoading] = useState(false);

    useEffect(() => {
        const fetchBankTransactions = async () => {
            setBankTransactionsLoading(true);
            setBankTransactions([]); // Clear stale data
            setOpeningBalance(0);    // Clear stale balance

            try {
                // 1. Fetch historical sum for Opening Balance
                const { data: historyData, error: historyError } = await supabase
                    .from('bank_transactions')
                    .select('amount, type')
                    .lt('date', startDate);

                if (!historyError && historyData) {
                    const oldestConfig = financialConfigs[financialConfigs.length - 1];
                    const initialBalance = oldestConfig?.initialBalance || 0;
                    const historicalSum = historyData.reduce((acc, t) => acc + (t.type === 'RECEITA' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
                    setOpeningBalance(initialBalance + historicalSum);
                }

                // 2. Fetch strictly within the selected date range
                const { data, error } = await supabase
                    .from('bank_transactions')
                    .select('*')
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: true });

                if (error) throw error;
                if (data) {
                    // map snake_case to camelCase
                    setBankTransactions(data.map(d => ({
                        id: d.id,
                        date: d.date,
                        description: d.description,
                        document: d.document,
                        amount: d.amount,
                        type: d.type,
                        systemCategory: d.system_category,
                        systemEntityName: d.system_entity_name,
                        systemPaymentMethod: d.system_payment_method,
                        systemMatches: d.system_matches,
                        createdAt: d.created_at
                    })));
                }
            } catch (err) {
                console.error("Error fetching bank_transactions:", err);
            } finally {
                setBankTransactionsLoading(false);
            }
        };

        if (accountsSubTab === 'CONCILIADO' || accountsSubTab === 'PAYABLES') {
            fetchBankTransactions();
        }
    }, [startDate, endDate, accountsSubTab, financialConfigs]);

    useEffect(() => {
        const fetchYearlyBilling = async () => {
            const year = new Date().getFullYear();
            const startCurr = `${year}-01-01`;
            const endCurr = `${year}-12-31`;
            const startPrev = `${year - 1}-01-01`;
            const endPrev = `${year - 1}-12-31`;

            const fetchYearData = async (start: string, end: string) => {
                const { data: appData } = await supabase.from('appointments')
                    .select('date, status, booked_price, price_paid, service_id, additional_services, quantity, provider_id, payment_method, is_remake, tip_amount')
                    .gte('date', start).lte('date', end)
                    .neq('status', 'Cancelado');
                const { data: saleData } = await supabase.from('sales').select('date, total_amount, items').gte('date', start).lte('date', end);
                const { data: expData } = await supabase.from('expenses')
                    .select('date, amount, category, dreClass')
                    .gte('date', start).lte('date', end);

                const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }));

                (appData || []).forEach(a => {
                    const parts = a.date.split('-');
                    if (parts.length >= 2) {
                        const m = parseInt(parts[1], 10) - 1;
                        if (m >= 0 && m < 12) {
                            if (a.status?.toUpperCase() === 'CONCLUÍDO') {
                                // Production
                                const production = calculateAppointmentProduction(a, services);
                                monthly[m].total += production;
                                // Tips
                                const tips = Number(a.tip_amount || 0) + (a.additional_services || []).reduce((sum: number, s: any) => sum + Number(s.tip_amount || 0), 0);
                                monthly[m].total += tips;
                            }
                        }
                    }
                });

                (saleData || []).forEach(s => {
                    const parts = s.date.split('-');
                    if (parts.length >= 2) {
                        const m = parseInt(parts[1], 10) - 1;
                        if (m >= 0 && m < 12) {
                            const productTotal = (s.items || []).reduce((sum: number, item: any) => {
                                if (item.productId) {
                                    const amount = Number(item.totalAmount) || (Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0)) || 0;
                                    return sum + amount;
                                }
                                return sum;
                            }, 0);
                            monthly[m].total += (Number(productTotal) || 0);
                        }
                    }
                });

                (expData || []).forEach(e => {
                    const parts = e.date.split('-');
                    if (parts.length >= 2) {
                        const m = parseInt(parts[1], 10) - 1;
                        if (m >= 0 && m < 12) {
                            const cleanCat = (e.category || '').toLowerCase();
                            if (e.dreClass === 'REVENUE' || cleanCat === 'ajuste de valor' || cleanCat === 'desconto concedido') {
                                const val = e.dreClass === 'REVENUE' ? e.amount : -e.amount;
                                monthly[m].total += val;
                            }
                        }
                    }
                });

                return monthly;
            };

            const [current, previous] = await Promise.all([
                fetchYearData(startCurr, endCurr),
                fetchYearData(startPrev, endPrev)
            ]);

            setYearlyBillingData({ currentYear: current, previousYear: previous });
        };

        const allowedTabs = ['FINANCEIRO', 'CHARTS', 'DRE', 'ANALYTICS'];
        if (allowedTabs.includes(activeTab) && services.length > 0 && providers.length > 0) {
            fetchYearlyBilling();
        }
    }, [activeTab, services, providers]);

    const handleOpenReconciledEditModal = (t: FinancialTransaction) => {
        setEditingReconciled(t);
        setEditReconciledForm({
            description: t.description,
            category: t.category,
            customerOrProviderName: t.customerOrProviderName || t.providerName || '',
            supplierId: t.supplierId || ''
        });
        setIsReconciledEditModalOpen(true);
    };

    const handleSaveReconciledEdit = async () => {
        if (!editingReconciled) return;

        try {
            const { origin, id: rawId } = editingReconciled;
            // More comprehensive prefix removal for all possible transaction types
            const id = rawId.replace(/^(app-main-|app-extra-rev-|app-fee-|app-ant-fee-|app-tip-|comm-main-|comm-extra-|sale-)/, '');

            if (origin === 'Despesa') {
                const { error } = await supabase.from('expenses')
                    .update({
                        description: editReconciledForm.description,
                        category: editReconciledForm.category,
                        supplier_id: editReconciledForm.supplierId || null
                    })
                    .eq('id', id);
                if (error) {
                    console.error('Supabase Expense Update Error:', error);
                    throw error;
                }
                setExpenses(prev => prev.map(e => e.id === id ? {
                    ...e,
                    description: editReconciledForm.description,
                    category: editReconciledForm.category,
                    supplierId: editReconciledForm.supplierId
                } : e));
            } else if (origin === 'Produto') {
                try {
                    const { data: sale, error: fetchError } = await supabase.from('sales').select('items').eq('id', id).single();
                    if (fetchError) throw fetchError;
                    if (sale && sale.items && sale.items.length > 0) {
                        const newItems = [...sale.items];
                        newItems[0].name = editReconciledForm.description;
                        newItems[0].source = editReconciledForm.category;
                        const { error: updateError } = await supabase.from('sales').update({ items: newItems }).eq('id', id);
                        if (updateError) throw updateError;
                        setSales(prev => prev.map(s => s.id === id ? { ...s, items: newItems } : s));
                    }
                } catch (err) {
                    console.error("Error updating sale items:", err);
                    throw err;
                }
            } else if (origin === 'Serviço' || origin === 'Outro') {
                const { error } = await supabase.from('appointments').update({
                    observation: editReconciledForm.description
                }).eq('id', id);
                if (error) {
                    console.error('Supabase Appointment Update Error:', error);
                    throw error;
                }
                setAppointments(prev => prev.map(a => a.id === id ? { ...a, observation: editReconciledForm.description } : a));
            }

            setIsReconciledEditModalOpen(false);
            setEditingReconciled(null);
        } catch (error) {
            console.error('Detailed Error updating reconciled transaction:', error);
            alert('Erro ao atualizar. Verifique os dados e tente novamente.');
        }
    };

    const handleManualLink = async (
        bankTxId: string,
        matches: { id: string, type: 'EXPENSE' | 'SALE' | 'APPOINTMENT', amount: number }[],
        newExpenseData?: { 
            description: string; 
            category: string; 
            amount: number;
            supplierId?: string;
            providerId?: string;
            employeeId?: string;
        }
    ) => {
        setIsManualLinkingProcessing(true);
        try {
            // Identified duplication issue mentioned by user: 
            // Ensure matches are distinct by ID to prevent duplicate linking entries
            const uniqueMatches = Array.from(new Set(matches.map(m => m.id))).map(id => matches.find(m => m.id === id)!);
            
            // 1. Identify items that are being UNLINKED
            const prevMatches = bankTransactions.find(tx => tx.id === bankTxId)?.systemMatches || [];
            const unlinkedItems = prevMatches.filter(pm => !uniqueMatches.some(m => m.id === pm.id && m.type === pm.type));

            let finalMatches = [...uniqueMatches];

            // 1.5 Handle quick expense creation if needed
            if (newExpenseData) {
                const cat = expenseCategories.find(c => c.name === newExpenseData.category);
                const { data: newExp, error: expErr } = await supabase
                    .from('expenses')
                    .insert([{
                        description: newExpenseData.description,
                        category: newExpenseData.category,
                        amount: newExpenseData.amount,
                        dre_class: cat?.dreClass || 'EXPENSE_ADM',
                        date: linkingBankTx?.date || new Date().toISOString().split('T')[0],
                        status: 'Pago',
                        is_reconciled: true,
                        payment_method: 'Pix',
                        supplier_id: newExpenseData.supplierId || null,
                        provider_id: newExpenseData.providerId || null,
                        employee_id: newExpenseData.employeeId || null
                    }])
                    .select()
                    .single();

                if (expErr) throw expErr;
                if (newExp) {
                    finalMatches.push({ id: newExp.id, type: 'EXPENSE', amount: newExp.amount });
                    // Add to local state
                    const mappedExp: Expense = {
                        id: newExp.id,
                        description: newExp.description,
                        category: newExp.category,
                        dreClass: newExp.dre_class as any,
                        amount: newExp.amount,
                        date: newExp.date,
                        status: newExp.status as any,
                        paymentMethod: newExp.payment_method as any,
                        isReconciled: true,
                        supplierId: newExp.supplier_id,
                        providerId: newExp.provider_id,
                        employeeId: newExp.employee_id
                    };
                    setExpenses(prev => [mappedExp, ...prev]);
                }
            }

            // 2. Update bank_transaction
            const { error: txError } = await supabase
                .from('bank_transactions')
                .update({ system_matches: finalMatches })
                .eq('id', bankTxId);
            if (txError) throw txError;

            // 3. Update status of LINKED items
            const linkPromises = finalMatches.map(m => {
                if (m.type === 'EXPENSE') {
                    return supabase.from('expenses').update({ is_reconciled: true, status: 'Pago' }).eq('id', m.id);
                } else if (m.type === 'SALE') {
                    return supabase.from('sales').update({ is_reconciled: true }).eq('id', m.id);
                } else {
                    return supabase.from('appointments').update({ is_reconciled: true, payment_date: linkingBankTx?.date }).eq('id', m.id);
                }
            });

            // 4. Update status of UNLINKED items
            const unlinkPromises = unlinkedItems.map(m => {
                if (m.type === 'EXPENSE') {
                    return supabase.from('expenses').update({ is_reconciled: false }).eq('id', m.id);
                } else if (m.type === 'SALE') {
                    return supabase.from('sales').update({ is_reconciled: false }).eq('id', m.id);
                } else {
                    return supabase.from('appointments').update({ is_reconciled: false }).eq('id', m.id);
                }
            });

            await Promise.all([...linkPromises, ...unlinkPromises]);

            // 5. Update local state
            setBankTransactions(prev => prev.map(tx => tx.id === bankTxId ? { ...tx, systemMatches: finalMatches } : tx));

            setExpenses(prev => prev.map(e => {
                const isLinked = finalMatches.find(m => m.type === 'EXPENSE' && m.id === e.id);
                const isUnlinked = unlinkedItems.find(m => m.type === 'EXPENSE' && m.id === e.id);
                if (isLinked) return { ...e, isReconciled: true, status: 'Pago' };
                if (isUnlinked) return { ...e, isReconciled: false };
                return e;
            }));

            setSales(prev => prev.map(s => {
                const isLinked = finalMatches.find(m => m.type === 'SALE' && m.id === s.id);
                const isUnlinked = unlinkedItems.find(m => m.type === 'SALE' && m.id === s.id);
                if (isLinked) return { ...s, isReconciled: true };
                if (isUnlinked) return { ...s, isReconciled: false };
                return s;
            }));

            setAppointments(prev => prev.map(a => {
                const isLinked = finalMatches.find(m => m.type === 'APPOINTMENT' && m.id === a.id);
                const isUnlinked = unlinkedItems.find(m => m.type === 'APPOINTMENT' && m.id === a.id);
                if (isLinked) return { ...a, isReconciled: true, paymentDate: linkingBankTx!.date };
                if (isUnlinked) return { ...a, isReconciled: false };
                return a;
            }));

            setLinkingBankTx(null);
            setNotification({ message: "Vínculo atualizado com sucesso!", type: "success" });
        } catch (err) {
            console.error("Error manual linking/unlinking:", err);
            setNotification({ message: "Erro ao atualizar vínculos.", type: "error" });
        } finally {
            setIsManualLinkingProcessing(false);
        }
    };

    // Suppliers CRUD States
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
        name: '', document: '', phone: '', email: '', active: true
    });

    const handleOpenSupplierModal = (sup?: Supplier) => {
        if (sup) {
            setEditingSupplierId(sup.id);
            setSupplierForm(sup);
        } else {
            setEditingSupplierId(null);
            setSupplierForm({ name: '', document: '', phone: '', email: '', active: true });
        }
        setIsSupplierModalOpen(true);
    };

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierForm.name) return;

        try {
            if (editingSupplierId) {
                const { error } = await supabase.from('suppliers').update(supplierForm).eq('id', editingSupplierId);
                if (error) throw error;
                setSuppliers(prev => prev.map(s => s.id === editingSupplierId ? { ...s, ...supplierForm } as Supplier : s));
            } else {
                const { data, error } = await supabase.from('suppliers').insert([supplierForm]).select();
                if (error) throw error;
                if (data) {
                    setSuppliers(prev => [...prev, data[0]]);
                    if (isQuickAddingSupplier) {
                        setExpenseForm(prev => ({ ...prev, supplierId: data[0].id }));
                    }
                    if (reconcilingTx) {
                        // Automatically link the new supplier to the transaction being reconciled
                        await handleLinkNewPayeeToTx(reconcilingTx, data[0].name, data[0].id, 'SUPPLIER');
                        setReconcilingTx(null);
                    }
                }
            }
            setIsSupplierModalOpen(false);
            setIsQuickAddingSupplier(false);
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert('Erro ao salvar fornecedor.');
        }
    };

    const handleDeleteSupplier = async (id: string) => {
        if (!window.confirm('Excluir fornecedor?')) return;
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            setSuppliers(prev => prev.filter(s => s.id !== id));
        } catch (error: any) {
            console.error('Error deleting supplier:', error);
            if (error.code === '23503') {
                alert('Não é possível excluir este fornecedor pois existem despesas vinculadas a ele. Exclua ou altere as despesas primeiro.');
            } else {
                alert('Erro ao excluir fornecedor: ' + (error.message || 'Erro desconhecido'));
            }
        }
    };

    // ---- Plano de Contas CRUD ----
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryForm.name.trim()) return;
        try {
            if (editingCategoryId) {
                const { error } = await supabase.from('expense_categories').update({ name: categoryForm.name, dre_class: categoryForm.dreClass }).eq('id', editingCategoryId);
                if (error) throw error;
                setExpenseCategories(prev => prev.map(c => c.id === editingCategoryId ? { ...c, name: categoryForm.name, dreClass: categoryForm.dreClass as any } : c));
            } else {
                const { data, error } = await supabase.from('expense_categories').insert([{ name: categoryForm.name, dre_class: categoryForm.dreClass }]).select();
                if (error) throw error;
                if (data) {
                    setExpenseCategories(prev => [...prev, { id: data[0].id, name: data[0].name, dreClass: data[0].dre_class }]);
                    if (isQuickAddingCategory) {
                        setExpenseForm(prev => ({ ...prev, category: data[0].name, dreClass: data[0].dre_class as any }));
                        setCategoryInputSearch(data[0].name);
                    }
                }
            }
            setIsCategoryFormOpen(false);
            setIsQuickAddingCategory(false);
            setEditingCategoryId(null);
            setCategoryForm({ name: '', dreClass: 'EXPENSE_ADM' });
        } catch (err) {
            console.error('Error saving category:', err);
            alert('Erro ao salvar conta.');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!window.confirm('Excluir esta conta do plano?')) return;
        try {
            const { error } = await supabase.from('expense_categories').delete().eq('id', id);
            if (error) throw error;
            setExpenseCategories(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedAuditRows, setExpandedAuditRows] = useState<string[]>([]);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [recurrenceMonths, setRecurrenceMonths] = useState(1);
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: toLocalDateStr(new Date()), status: 'Pago', paymentMethod: 'Pix', invoiceNumber: ''
    });

    // Daily Close States
    const [physicalCash, setPhysicalCash] = useState('');
    const [closingObservation, setClosingObservation] = useState('');
    const [closerName, setCloserName] = useState('');

    // Batch Edit States
    const [batchActionType, setBatchActionType] = useState<'IDLE' | 'SAVE' | 'DELETE'>('IDLE');
    const [batchOption, setBatchOption] = useState<'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL'>('ONLY_THIS');
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

    // Filter States for Payables
    const [payablesSearch, setPayablesSearch] = useState('');
    const [payablesStatusFilter, setPayablesStatusFilter] = useState<'ALL' | 'Pago' | 'Pendente' | 'Atrasado'>('ALL');
    const [payablesSupplierFilter, setPayablesSupplierFilter] = useState('ALL');
    const [payablesSplitFilter, setPayablesSplitFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');

    // Filter States for Detailed View
    const [detailedFilter, setDetailedFilter] = useState('');

    // Date Navigation & View States
    const datePickerRef = useRef<HTMLInputElement>(null);
    const [dateRef, setDateRef] = useState(new Date());
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
    const [isBatchLinkModalOpen, setIsBatchLinkModalOpen] = useState(false);

    const handleBatchLinkExpenses = async (bankTxId: string, expenseIds: string[]) => {
        setIsManualLinkingProcessing(true);
        try {
            const bankTx = bankTransactions.find(bt => bt.id === bankTxId);
            if (!bankTx) return;

            const itemsToLink = expenseIds.map(id => {
               const exp = expenses.find(e => e.id === id);
               return { id, type: 'EXPENSE' as const, amount: exp?.amount || 0 };
            });

            await handleManualLink(bankTxId, itemsToLink);
            setIsBatchLinkModalOpen(false);
            setSelectedExpenseIds([]); // Clear selection after linking
        } catch (error) {
            console.error('Error in batch link:', error);
            setNotification({ message: 'Erro ao vincular despesas.', type: 'error' });
        } finally {
            setIsManualLinkingProcessing(false);
        }
    };
    const [payablesIgnoreDateFilter, setPayablesIgnoreDateFilter] = useState(false);
    const [isBatchDateModalOpen, setIsBatchDateModalOpen] = useState(false);
    const [applyToFuture, setApplyToFuture] = useState(false);
    const [batchNewDate, setBatchNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    // DRE Sub-tab: 'STATEMENT' = existing DRE view | 'ACCOUNTS' = Plano de Contas
    const [dreSubTab, setDreSubTab] = useState<'STATEMENT' | 'ACCOUNTS'>('STATEMENT');

    // Plano de Contas CRUD
    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryForm, setCategoryForm] = useState<{ name: string; dreClass: string }>({ name: '', dreClass: 'EXPENSE_ADM' });
    const [categorySearch, setCategorySearch] = useState('');

    // Expense modal category autocomplete
    const [categoryInputSearch, setCategoryInputSearch] = useState('');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    // Bank Reconciliation State
    const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    const [expandedSubSections, setExpandedSubSections] = useState<string[]>([]);

    const toggleSubSection = (subSection: string) => {
        setExpandedSubSections(prev => prev.includes(subSection) ? prev.filter(s => s !== subSection) : [...prev, subSection]);
    };

    const getDateLabel = () => {
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (timeView === 'year') return dateRef.getFullYear().toString();
        return 'Período Personalizado';
    };

    const navigateDate = (direction: 'next' | 'prev') => {
        const newDate = new Date(dateRef);
        const modifier = direction === 'next' ? 1 : -1;

        if (timeView === 'day') {
            newDate.setDate(newDate.getDate() + modifier);
        } else if (timeView === 'month') {
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + modifier);
        } else if (timeView === 'year') {
            newDate.setDate(1);
            newDate.setFullYear(newDate.getFullYear() + modifier);
        }

        setDateRef(newDate);
    };

    const navigateRedDay = (direction: 'next' | 'prev') => {
        if (pendingDates.length === 0) return;

        const current = toLocalDateStr(dateRef);
        let nextDateStr;

        if (direction === 'next') {
            nextDateStr = pendingDates.slice().reverse().find(d => d > current);
        } else {
            nextDateStr = pendingDates.find(d => d < current);
        }

        if (nextDateStr) {
            const d = new Date(nextDateStr + 'T12:00:00');
            setDateRef(d);
            if (timeView !== 'day') setTimeView('day');
        }
    };

    // Fetch dates with pending reconciliation
    useEffect(() => {
        const fetchPendingDates = async () => {
            setIsPendingDatesLoading(true);
            try {
                // Fetch from bank_transactions
                const { data: bankData } = await supabase
                    .from('bank_transactions')
                    .select('date')
                    .or('system_matches.is.null,system_matches.eq.[]')
                    .order('date', { ascending: false });

                // Fetch from expenses
                const { data: expData } = await supabase
                    .from('expenses')
                    .select('date')
                    .eq('is_reconciled', false)
                    .order('date', { ascending: false });

                const combined = [
                    ...(bankData || []).map(d => d.date),
                    ...(expData || []).map(d => d.date)
                ];

                const unique = Array.from(new Set(combined))
                    .filter(Boolean)
                    .sort((a, b) => (b as string).localeCompare(a as string));
                setPendingDates(unique);
            } catch (err) {
                console.error('Error fetching pending dates:', err);
            } finally {
                setIsPendingDatesLoading(false);
            }
        };

        fetchPendingDates();
    }, [bankTransactionsLoading, isReconciliationOpen]); // Re-fetch on relevant state shifts

    // Update startDate and endDate when timeView or dateRef changes
    React.useEffect(() => {
        if (timeView === 'custom') return;

        const year = dateRef.getFullYear();
        const month = dateRef.getMonth();

        let start = new Date(year, month, 1);
        let end = new Date(year, month + 1, 0);

        if (timeView === 'day') {
            start = new Date(dateRef);
            end = new Date(dateRef);
        } else if (timeView === 'month') {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0);
        } else if (timeView === 'year') {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
        }

        setStartDate(toLocalDateStr(start));
        setEndDate(toLocalDateStr(end));
    }, [timeView, dateRef]);

    const transactions = useMemo(() => {
        return generateFinancialTransactions(
            appointments,
            sales,
            expenses,
            services,
            customers,
            providers,
            suppliers,
            employees,
            commissionSettings || [],
            paymentSettings,
            financialConfigs
        );
    }, [appointments, sales, expenses, services, customers, providers, suppliers, employees, commissionSettings, paymentSettings, financialConfigs]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesDate = t.date >= startDate && t.date <= endDate;
            const matchesDescription = t.description.toLowerCase().includes(detailedFilter.toLowerCase()) ||
                (t.customerOrProviderName || '').toLowerCase().includes(detailedFilter.toLowerCase()); // Search in both description and name

            return matchesDate && matchesDescription;
        });
    }, [transactions, startDate, endDate, detailedFilter]);

    const reconciledTransactions = useMemo(() => {
        const results = transactions.filter(t => {
            if (!t.isReconciled) return false;
            // For the Bank Statement (CONCILIADOS) view, we MUST use the settlement date (t.date)
            // to match the bank statement lines for the selected period, regardless of when 
            // the service occurred.
            const rawDate = t.date;
            const effectiveDate = rawDate ? rawDate.substring(0, 10) : '';
            return effectiveDate >= startDate && effectiveDate <= endDate;
        });
        return results;
    }, [transactions, startDate, endDate]);

    const combinedSuppliers = useMemo(() => {
        const supList = (suppliers || []).map(s => ({ ...s, isProvider: false, isEmployee: false }));
        const provList = (providers || []).map(p => ({
            id: `prov_${p.id}`,
            name: p.name,
            category: p.specialty,
            document: p.pixKey ? `PIX: ${p.pixKey}` : '-',
            phone: p.phone,
            email: '',
            isProvider: true,
            isEmployee: false,
            originalProvider: p
        }));
        const empList = (employees || []).map(e => ({
            id: `emp_${e.id}`,
            name: e.name,
            category: e.role,
            document: '-',
            phone: e.phone,
            email: '',
            isProvider: false,
            isEmployee: true,
            originalEmployee: e
        }));
        return [...supList, ...provList, ...empList].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [suppliers, providers, employees]);

    const summary = useMemo(() => calculateDailySummary(filteredTransactions), [filteredTransactions]);
    const { totalServices, totalProducts, totalAjustes, totalTips, totalAnticipationFees, totalRevenue, servicesWithTips } = summary;

    const handlePrintDetailedReport = () => {
        // Calculate the previous balance (Saldo Anterior)
        // We take the initial balance from the oldest configuration, as that represents the beginning of the financial records.
        const oldestConfig = financialConfigs[financialConfigs.length - 1];
        const initialBalance = oldestConfig?.initialBalance || 0;
        const previousTransactions = transactions.filter(t => t.date < startDate);
        const previousBalanceSum = previousTransactions.reduce((acc, t) => acc + (t.type === 'RECEITA' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
        let currentBalance = initialBalance + previousBalanceSum;

        // Sort transactions chronologically for the printed statement
        const statementTransactions = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Generate rows with running balances
        const rowsHtml = statementTransactions.map((t, index) => {
            const amount = t.type === 'RECEITA' ? Math.abs(t.amount) : -Math.abs(t.amount);
            currentBalance += amount;

            // Alternate row backgrounds (light gray / white)
            const bgClass = index % 2 === 0 ? 'bg-even' : 'bg-odd';

            return `
                <tr class="${bgClass}">
                    <td class="col-date">${parseDateSafe(t.date).toLocaleDateString('pt-BR')}</td>
                    <td class="col-desc">${t.description.toUpperCase()}</td>
                    <td class="col-doc">${t.id.substring(0, 8).toUpperCase()}${t.isReconciled ? '<br/><span style="color:#10b981;font-size:9px;">[CONCILIADO]</span>' : ''}</td>
                    <td class="col-val text-right">${amount > 0 ? '' : '-'}${Math.abs(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="col-saldo text-right">${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `;
        }).join('');

        const printContent = `
            <html>
            <head>
                <title>Extrato de Fluxo Financeiro - ${getDateLabel()}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 20px 40px; color: #333; background: #fff; margin: 0; }
                    .header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 20px; }
                    .header h1 { color: #000000; font-size: 24px; font-weight: bold; margin: 0; display: inline-block; }
                    .header span { color: #888; font-size: 14px; font-weight: normal; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th { 
                        text-align: left; 
                        padding: 10px 8px; 
                        color: #000000; 
                        font-weight: bold; 
                        border-bottom: 2px solid #000000; 
                    }
                    th.text-right { text-align: right; }
                    td { padding: 8px; border: none; }
                    td.text-right { text-align: right; }
                    .bg-even { background-color: #f9f9f9; }
                    .bg-odd { background-color: #ffffff; }
                    .col-date { width: 80px; }
                    .col-desc { }
                    .col-doc { width: 100px; }
                    .col-val { width: 80px; }
                    .col-saldo { width: 80px; }
                    .saldo-row { background-color: #f4f4f4; font-weight: bold; }
                    .saldo-row td { color: #888; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Extrato</h1>
                    <span>(Período de ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')})</span>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th class="col-date">Data</th>
                            <th class="col-desc">Descrição</th>
                            <th class="col-doc">Documento</th>
                            <th class="col-val text-right">Valor (R$)</th>
                            <th class="col-saldo text-right">Saldo (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="saldo-row">
                            <td></td>
                            <td colspan="3">SALDO ANTERIOR</td>
                            <td class="text-right">${(initialBalance + previousBalanceSum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        ${rowsHtml}
                    </tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const filteredPayables = useMemo(() => {
        // Collect IDs of transactions linked to current bank view (forced to be visible if they match other filters)
        const forcedTxIds = new Set<string>();
        const splitTxIds = new Set<string>(); // Tracks strictly those that were split in bank reconciliation

        bankTransactions.forEach(t => {
            if (t.systemMatches) {
                const isSplit = t.systemMatches.length > 1;
                t.systemMatches.forEach(m => {
                    forcedTxIds.add(m.id);
                    // Robust matching: strip all segments of the prefix to find the underlying ID
                    const bareMatchId = m.id.replace(/^([a-z0-9]+-)+/, '');
                    forcedTxIds.add(bareMatchId);
                    
                    if (isSplit) {
                        splitTxIds.add(m.id);
                        splitTxIds.add(bareMatchId);
                    }
                });
            }
        });

        // We filter ALL transactions of type DESPESA, plus those that are forced (multi-category splits etc)
        const filtered = transactions.filter(t => {
            if (t.type !== 'DESPESA') return false;

            const bareId = t.id.replace(/^([a-z0-9]+-)+/, '');
            const isForced = forcedTxIds.has(t.id) || forcedTxIds.has(bareId);
            const isSplit = splitTxIds.has(t.id) || splitTxIds.has(bareId);

            // 1. Date Filter (Always show forced links if they match the bank view, else respect date)
            const txDate = (t.date || '').substring(0, 10);
            const matchesDate = payablesIgnoreDateFilter
                ? (t.status === 'Pendente' || (txDate >= startDate && txDate <= endDate))
                : (txDate >= startDate && txDate <= endDate) || isForced || isSplit;

            if (!matchesDate) return false;

            // 2. Search Filter
            const searchLower = payablesSearch.toLowerCase().trim();
            const matchesSearch = !searchLower || 
                (t.description || '').toLowerCase().includes(searchLower) ||
                (t.customerOrProviderName || '').toLowerCase().includes(searchLower) ||
                (t.providerName || '').toLowerCase().includes(searchLower) ||
                (t.category || '').toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;

            // 3. Status Filter (Now applies to everything including forced links)
            const statusLabel = (t.status || '').toUpperCase();
            const isAtrasado = (statusLabel === 'PENDENTE' || statusLabel === 'PENDING') && txDate < new Date().toISOString().split('T')[0];
            
            const matchesStatus = payablesStatusFilter === 'ALL' ||
                (payablesStatusFilter === 'Atrasado' ? isAtrasado :
                    payablesStatusFilter === 'Pago' ? statusLabel === 'PAGO' :
                        payablesStatusFilter === 'Pendente' ? (statusLabel === 'PENDENTE' || statusLabel === 'PENDING') :
                            false);

            if (!matchesStatus) return false;

            // 4. Supplier/Favorecido Filter
            let entityIdMatch = true;
            if (payablesSupplierFilter !== 'ALL') {
                const targetId = payablesSupplierFilter;
                const item = t as any;
                const selectedEntity = combinedSuppliers.find(s => s.id === targetId);
                const isMatch = item.supplierId === targetId || 
                                (item.providerId && `prov_${item.providerId}` === targetId) ||
                                (item.employeeId && `emp_${item.employeeId}` === targetId) ||
                                (t.category === 'Repasse Comissão' && providers.some(p => p.name === t.providerName && `prov_${p.id}` === targetId)) ||
                                (t.customerOrProviderName?.toUpperCase() === selectedEntity?.name?.toUpperCase()); 
                entityIdMatch = isMatch;
            }

            if (!entityIdMatch) return false;

            // 5. Split (Desmembrado) Filter
            const matchesSplit = payablesSplitFilter === 'ALL' ||
                (payablesSplitFilter === 'YES' && isSplit) ||
                (payablesSplitFilter === 'NO' && !isSplit);

            return matchesSplit;
        });

        // 6. Category filter for visibility ('identifiedPayables' logic merged here)
        // We only show items that have a category or are forced, to avoid showing empty placeholder records
        const identified = filtered.filter(t => {
            const category = t.category || '';
            const bareId = t.id.replace(/^([a-z0-9]+-)+/, '');
            const isForced = forcedTxIds.has(t.id) || forcedTxIds.has(bareId);
            const isSplit = splitTxIds.has(t.id) || splitTxIds.has(bareId);
            const hasCategory = category.trim() !== '' && category !== 'Sem Categoria';
            return hasCategory || isForced || isSplit;
        });

        const unique = Array.from(new Map(identified.map(t => [t.id, t])).values());
        return unique.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, startDate, endDate, payablesSearch, payablesStatusFilter, payablesSupplierFilter, suppliers, providers, payablesIgnoreDateFilter, bankTransactions, payablesSplitFilter]);

    const dreData = useMemo(() => {
        const getSnapshot = (start: string, end: string) => {
            const dateObj = parseDateSafe(start);
            const isClosed = monthlyClosings[`${dateObj.getFullYear()}-${dateObj.getMonth()}`];

            const apps = appointments.filter(a => a.date >= start && a.date <= end && a.status !== 'Cancelado');
            const sls = sales.filter(s => s.date >= start && s.date <= end);
            // If the month is closed, show only reconciled expenses.
            // If NOT closed, show ALL expenses (forecast).
            const exps = expenses.filter(e => {
                const eDateClean = e.date ? e.date.substring(0, 10) : '';
                const matchesDate = eDateClean >= start && eDateClean <= end;
                if (!matchesDate) return false;
                if (isClosed) return e.isReconciled;
                return true;
            });

            // SYNCED LOGIC: Realized vs Forecast
            // For past periods, we treat everything that isn't cancelled as "Realized Production" 
            // to match the Repasses/Closures screen and ensure the DRE isn't empty.
            const realizedApps = apps.filter(a => a.status?.toUpperCase() === 'CONCLUÍDO');
            const forecastApps = apps.filter(a => a.status?.toUpperCase() !== 'CANCELADO' && !a.isRemake && a.customerId !== 'INTERNAL_BLOCK');

            const revenueServices = calculateProductionRevenue(realizedApps, services);
            const revenueForecast = calculateProductionRevenue(forecastApps, services);

            // Sync with Daily Close: Include Tips and Adjustments in Gross Revenue
            const revenueTips = realizedApps.reduce((acc, a) => acc + Number(a.tipAmount || 0) + 
                                (a.additionalServices || []).reduce((sum, s) => sum + Number(s.tipAmount || 0), 0), 0);
            
            const revenueAdjustments = exps
                .filter(e => e.category === 'Ajuste de Valor' || e.category === 'Desconto Concedido')
                .reduce((acc, e) => acc + (e.dreClass === 'REVENUE' ? e.amount : -e.amount), 0);

            const revenueProducts = sls.reduce((acc, s) => {
                const productTotal = (s.items || []).reduce((sum, item) => {
                    if (item.productId) {
                        const amount = Number(item.totalAmount) || (Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0)) || 0;
                        return sum + amount;
                    }
                    return sum;
                }, 0);
                return acc + (Number(productTotal) || 0);
            }, 0);

            const grossRevenue = revenueServices + revenueProducts + revenueTips + revenueAdjustments;
            const grossForecast = revenueForecast + revenueProducts + revenueTips + revenueAdjustments;

            const breakdownProducts = sls.reduce((acc, s) => {
                (s.items || []).forEach(item => {
                    if (item.productId) {
                        const name = item.name || item.productName || 'Produto sem nome';
                        if (!acc[name]) acc[name] = { total: 0, count: 0 };
                        const amount = Number(item.totalAmount) || (Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0)) || 0;
                        acc[name].total += amount;
                        acc[name].count += (Number(item.quantity) || 1);
                    }
                });
                return acc;
            }, {} as Record<string, { total: number, count: number }>);

            // Receitas bancárias conciliadas (dreClass=REVENUE) = real service income via card/PIX
            const reconciledBankRevenues = exps
                .filter(e => e.dreClass === 'REVENUE')
                .reduce((acc, e) => acc + e.amount, 0);

            // Outras receitas (dreClass=OTHER_INCOME) = reembolsos, devoluções, aportes
            // Always shown in section 6 regardless of isClosed
            const otherIncome = exps
                .filter(e => e.dreClass === 'OTHER_INCOME')
                .reduce((acc, e) => acc + e.amount, 0);


            const { fees: automatedDeductions, anticipation: anticipationFees } = { fees: 0, anticipation: 0 };

            const latestConfig = financialConfigs[0];
            const suggestedCashReserve = grossRevenue * ((latestConfig?.cashFlowReserveRate || 0) / 100);
            const oldestConfig = financialConfigs[financialConfigs.length - 1];
            const periodInitialBalance = oldestConfig?.initialBalance || 0;

            const realRepasses = exps.filter(e => e.category.toLowerCase().includes('repasse') || e.category.toLowerCase().includes('comissão')).reduce((acc, e) => acc + e.amount, 0);
            const otherDeductions = exps.filter(e => {
                const cat = e.category.toLowerCase();
                return e.dreClass === 'DEDUCTION' && !cat.includes('repasse') && !cat.includes('comissão');
            }).reduce((acc, e) => acc + e.amount, 0);

            // Theoretical commissions based on all appointments in the period
            const theoreticalCommissions = apps.reduce((acc, a) => {
                const provider = providers.find(p => p.id === a.providerId);
                const rate = a.commissionRateSnapshot ?? provider?.commissionRate ?? 0;
                const mainComm = (a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0) * rate;

                const extraComm = (a.additionalServices || []).reduce((eAcc, extra) => {
                    const eProv = providers.find(p => p.id === extra.providerId);
                    if (!eProv) return eAcc;
                    const eRate = extra.commissionRateSnapshot ?? eProv.commissionRate ?? 0;
                    const ePrice = extra.bookedPrice || services.find(s => s.id === extra.serviceId)?.price || 0;
                    return eAcc + (ePrice * eRate);
                }, 0);

                return acc + mainComm + extraComm;
            }, 0);

            // Substitution logic: AGORA sempre segue o teórico (forecast) baseado na agenda, independente de fechamento.
            const commissions = theoreticalCommissions;

            // Sync with Daily Close: Include Tips in Deductions since they are paid out to professionals
            const deductions = otherDeductions + commissions + revenueTips;
            const netRevenue = grossRevenue - deductions;

            const manualCosts = exps.filter(e => e.dreClass === 'COSTS').reduce((acc, e) => acc + e.amount, 0);
            const totalCOGS = manualCosts;
            const grossProfit = netRevenue - totalCOGS;

            const expensesVendas = exps.filter(e => e.dreClass === 'EXPENSE_SALES');
            // Exclude Repasses/Comissões from ADM since they are in Deductions (Line 2)
            const expensesAdm = exps.filter(e => {
                const cat = e.category.toLowerCase();
                return e.dreClass === 'EXPENSE_ADM' && !cat.includes('repasse') && !cat.includes('comissão');
            });
            const expensesFin = exps.filter(e => e.dreClass === 'EXPENSE_FIN');

            const amountVendas = expensesVendas.reduce((acc, e) => acc + e.amount, 0);
            const amountAdm = expensesAdm.reduce((acc, e) => acc + e.amount, 0);
            const amountFin = expensesFin.reduce((acc, e) => acc + e.amount, 0);
            const totalOpExpenses = amountVendas + amountAdm + amountFin;

            const groupByCat = (list: Expense[]) => {
                return list.reduce((acc: Record<string, { total: number, items: Expense[] }>, e) => {
                    if (!acc[e.category]) acc[e.category] = { total: 0, items: [] };
                    acc[e.category].total += e.amount;
                    acc[e.category].items.push(e);
                    return acc;
                }, {});
            };

            // otherRevenues = OTHER_INCOME (reembolsos, devoluções, aportes) â€” sempre na seção 6
            const otherRevenues = otherIncome;
            const resultBeforeTaxes = (grossProfit + otherRevenues) - totalOpExpenses;
            const irpjCsll = exps.filter(e => e.dreClass === 'TAX').reduce((acc, e) => acc + e.amount, 0);
            const netResult = resultBeforeTaxes - irpjCsll;

            const breakdownServices = realizedApps.reduce((acc, a) => {
                const production = calculateAppointmentProduction(a, services);
                if (production <= 0) return acc;

                // Main service
                if (a.providerId) {
                    const mainService = services.find(s => s.id === a.serviceId);
                    const serviceName = mainService?.name || 'Serviço Removido';
                    const mainPriceValue = Number(a.bookedPrice ?? mainService?.price ?? 0);
                    const mainBooked = mainPriceValue * (a.quantity || 1);
                    
                    if (!acc[serviceName]) acc[serviceName] = { total: 0, count: 0 };
                    acc[serviceName].total += mainBooked;
                    acc[serviceName].count += 1;
                }

                // Extras
                (a.additionalServices || []).forEach(extra => {
                    if (extra.providerId) {
                        const extraS = services.find(s => s.id === extra.serviceId);
                        const extraName = extraS?.name || 'Serviço Removido';
                        const extraPriceValue = Number(extra.bookedPrice ?? extraS?.price ?? 0);
                        const extraBooked = extraPriceValue * (extra.quantity || 1);
                        
                        if (!acc[extraName]) acc[extraName] = { total: 0, count: 0 };
                        acc[extraName].total += extraBooked;
                        acc[extraName].count += 1;
                    }
                });

                return acc;
            }, {} as Record<string, { total: number, count: number }>);

            // Separation: Manual Deductions (taxes etc) vs Repasses/Commissions
            const repasseExpenses = exps.filter(e => {
                const cat = e.category.toLowerCase();
                return cat.includes('repasse') || cat.includes('comissão');
            });
            const manualRepassesByCat = groupByCat(repasseExpenses);

            // Theoretical commissions based on all appointments in the period
            const theoreticalByProf = apps.reduce((acc, a) => {
                const addProf = (profId: string, bookedPrice: number, rateSnapshot: number | null) => {
                    const provider = providers.find(p => p.id === profId);
                    if (!provider) return;
                    const name = provider.name;
                    const rate = rateSnapshot ?? provider.commissionRate ?? 0;
                    const commVal = bookedPrice * rate;
                    if (!acc[name]) acc[name] = { total: 0, count: 0 };
                    acc[name].total += commVal;
                    acc[name].count += 1;
                };

                addProf(a.providerId, (a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0), a.commissionRateSnapshot ?? null);
                (a.additionalServices || []).forEach(extra => {
                    addProf(extra.providerId, (extra.bookedPrice || services.find(s => s.id === extra.serviceId)?.price || 0), extra.commissionRateSnapshot ?? null);
                });
                return acc;
            }, {} as Record<string, { total: number, count: number }>);

            const breakdownCommissions: Record<string, { total: number, count: number }> = {};
            // Sempre mostra o teórico por profissional, independente de fechamento, para alinhar com a receita.
            Object.entries(theoreticalByProf).forEach(([name, info]) => {
                breakdownCommissions[name] = { total: info.total, count: info.count };
            });

            const totalOutflows = deductions + totalCOGS + totalOpExpenses + irpjCsll;

            return {
                isClosed,
                grossRevenue, revenueServices, revenueProducts, reconciledBankRevenues, automatedDeductions, anticipationFees,
                revenueForecast, grossForecast,
                deductions, netRevenue,
                totalCOGS, commissions,
                grossProfit, otherRevenues, totalOpExpenses, amountVendas, amountAdm, amountFin,
                resultBeforeTaxes, irpjCsll, netResult,
                totalOutflows,
                suggestedCashReserve, periodInitialBalance,
                breakdownVendas: groupByCat(expensesVendas),
                breakdownAdm: groupByCat(expensesAdm),
                breakdownFin: groupByCat(expensesFin),
                // REVENUE = card service income (Receita Bruta) â€” only show breakdown when not isClosed
                // (when isClosed they're shown as aggregate Cartão/PIX sub-line in Receita Bruta)
                breakdownBankRevenues: (isClosed && reconciledBankRevenues > 0) ? {} : groupByCat(exps.filter(e => e.dreClass === 'REVENUE')),
                // OTHER_INCOME = reimbursements/returns â€” always show in section 6
                breakdownOtherIncome: groupByCat(exps.filter(e => e.dreClass === 'OTHER_INCOME')),
                breakdownProducts,
                breakdownServices,
                breakdownCommissions
            };
        };

        const currentPeriod = getSnapshot(startDate, endDate);

        // Se visualização por ANO, calcular os 12 meses para comparação
        let monthlySnapshots: any[] = [];
        if (timeView === 'year' && startDate) {
            const yearStr = startDate.split('-')[0];
            const year = parseInt(yearStr) || new Date().getFullYear();
            monthlySnapshots = Array.from({ length: 12 }, (_, m) => {
                const mStart = toLocalDateStr(new Date(year, m, 1));
                const mEnd = toLocalDateStr(new Date(year, m + 1, 0));
                return {
                    month: m,
                    name: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][m],
                    ...getSnapshot(mStart, mEnd)
                };
            });
        }

        const totalYearlyReserve = monthlySnapshots.reduce((acc, m) => acc + (m.suggestedCashReserve || 0), 0);
        const totalYearlyAnticFees = monthlySnapshots.reduce((acc, m) => acc + (m.anticipationFees || 0), 0);

        return { ...currentPeriod, monthlySnapshots, totalYearlyReserve, totalYearlyAnticFees };
    }, [appointments, sales, expenses, startDate, endDate, timeView, financialConfigs, monthlyClosings]);
    const auditReportData = useMemo(() => {
        const data: Record<string, Record<string, { agenda: number, closure: number, count: number, closedCount: number, items: any[] }>> = {};

        appointments.forEach(a => {
            const d = a.date ? a.date.substring(0, 10) : '';
            // Skip if out of range, cancelled or internal block
            if (d < startDate || d > endDate || a.status?.toUpperCase() === 'CANCELADO' || a.customerId === 'INTERNAL_BLOCK') return;

            const isConcluido = a.status?.toUpperCase() === 'CONCLUÃDO';
            const isRemake = a.isRemake || a.paymentMethod === 'Refazer' || a.paymentMethod?.startsWith('Justificativa');
            const tipAmount = Number(a.tipAmount || 0);

            // Calculate base and extras exactly like Closures.tsx
            const mainService = services.find(s => s.id === a.serviceId);
            const mainBooked = (a.bookedPrice !== undefined && a.bookedPrice !== null ? a.bookedPrice : (mainService?.price || 0)) * (a.quantity || 1);
            
            const extrasList = (a.additionalServices || []).map(extra => {
                const extraS = services.find(s => s.id === extra.serviceId);
                return {
                    ...extra,
                    bookedPrice: (extra.bookedPrice ?? extraS?.price ?? 0) * (extra.quantity || 1)
                };
            });

            const totalBooked = mainBooked + extrasList.reduce((acc, e) => acc + e.bookedPrice, 0);
            const pricePaid = a.pricePaid !== undefined && a.pricePaid !== null ? Number(a.pricePaid) : totalBooked;
            
            // Production revenue logic (Faturamento)
            const actualCollectedRevenue = isConcluido ? (pricePaid - tipAmount) : totalBooked;
            const isCourtesy = a.isCourtesy || a.paymentMethod === 'Cortesia' || (actualCollectedRevenue <= 0 && !isRemake && isConcluido);
            
            const totalBookedNonCourtesy = (isCourtesy ? 0 : mainBooked) + 
                extrasList.reduce((acc, e) => acc + (e.isCourtesy || a.paymentMethod === 'Cortesia' || (actualCollectedRevenue <= 0 && !isRemake && isConcluido) ? 0 : e.bookedPrice), 0);

            const isDebt = a.paymentMethod === 'Dívida' || (a.payments || []).some((p: any) => p.method === 'Dívida');

            // Helper to assign production to professional
            const assignProduction = (pId: string, bookedVal: number, serviceName: string) => {
                const p = providers.find(pr => pr.id === pId);
                const pName = p?.name || 'Sem Profissional';

                if (!data[d]) data[d] = {};
                if (!data[d][pName]) data[d][pName] = { agenda: 0, closure: 0, count: 0, closedCount: 0, items: [] };

                // 1. Agenda (Potential production)
                let serviceAgendaRevenue = 0;
                if (!isRemake) {
                    if (isCourtesy || isDebt) {
                        serviceAgendaRevenue = bookedVal;
                    } else if (totalBookedNonCourtesy > 0) {
                        serviceAgendaRevenue = (bookedVal / totalBookedNonCourtesy) * totalBooked;
                    } else {
                        serviceAgendaRevenue = bookedVal;
                    }
                }
                data[d][pName].agenda += serviceAgendaRevenue;
                data[d][pName].count += 1;

                // 2. Closure (Only if completed)
                let serviceRevenue = 0;
                if (isConcluido) {
                    if (isRemake) {
                        serviceRevenue = 0;
                    } else if (isCourtesy || isDebt) {
                        serviceRevenue = bookedVal;
                    } else if (totalBookedNonCourtesy > 0) {
                        serviceRevenue = (bookedVal / totalBookedNonCourtesy) * actualCollectedRevenue;
                    }

                    data[d][pName].closure += serviceRevenue;
                    data[d][pName].closedCount += 1;
                }

                data[d][pName].items.push({
                    id: a.id,
                    client: customers.find(c => c.id === a.customerId)?.name || '---',
                    service: serviceName,
                    status: a.status,
                    agenda: serviceAgendaRevenue,
                    closure: isConcluido ? serviceRevenue : 0,
                    isRemake,
                    isCourtesy
                });
            };

            // Main professional
            assignProduction(a.providerId, mainBooked, mainService?.name || 'Serviço');

            // Extra professionals
            extrasList.forEach(extra => {
                const exS = services.find(s => s.id === extra.serviceId);
                assignProduction(extra.providerId, extra.bookedPrice, exS?.name || 'Serviço (Extra)');
            });
        });

        const flat: { date: string, provider: string, agenda: number, closure: number, count: number, closedCount: number, items: any[] }[] = [];
        Object.entries(data).forEach(([date, pros]) => {
            Object.entries(pros).forEach(([provider, vals]) => {
                flat.push({ date, provider, ...vals });
            });
        });

        return flat.sort((a, b) => b.date.localeCompare(a.date) || a.provider.localeCompare(b.provider));
    }, [appointments, startDate, endDate, providers, services, customers]);

    const handlePrintAuditReport = () => {
        const totalAgenda = auditReportData.reduce((acc, curr) => acc + curr.agenda, 0);
        const totalClosure = auditReportData.reduce((acc, curr) => acc + curr.closure, 0);
        const diff = totalAgenda - totalClosure;

        const printContent = `
            <html>
            <head>
                <title>Relatório de Auditoria - ${getDateLabel()}</title>
                <style>
                    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                    h1 { font-size: 20px; font-weight: 900; margin: 0; color: #000; text-transform: uppercase; }
                    p.meta { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 4px; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                    .card { padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; }
                    .card p { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0; }
                    .card span { font-size: 16px; font-weight: 900; color: #0f172a; display: block; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: left; padding: 12px 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
                    td { padding: 10px 8px; font-size: 10px; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
                    .text-right { text-align: right; }
                    .diff { color: #be123c; font-weight: 900; }
                </style>
            </head>
            <body>
                <h1>Relatório de Auditoria: Agenda vs. Fechamento</h1>
                <p class="meta">Período: ${getDateLabel()} | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                <div class="summary">
                    <div class="card"><p>Total Agenda</p><span>${formatCurrency(totalAgenda)}</span></div>
                    <div class="card"><p>Total Fechamento</p><span>${formatCurrency(totalClosure)}</span></div>
                    <div class="card"><p>Diferença (Não Concluído)</p><span class="diff">${formatCurrency(diff)}</span></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Profissional</th>
                            <th class="text-right">Agenda</th>
                            <th class="text-right">Fechamento</th>
                            <th class="text-right">Diferença</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${auditReportData.map(e => `
                            <tr>
                                <td>${new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                <td style="text-transform: uppercase;">${e.provider}</td>
                                <td class="text-right">${formatCurrency(e.agenda)}</td>
                                <td class="text-right">${formatCurrency(e.closure)}</td>
                                <td class="text-right diff">${formatCurrency(e.agenda - e.closure)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const handleDownloadAuditExcel = () => {
        const header = ['Data', 'Profissional', 'Agenda (R$)', 'Fechamento (R$)', 'Diferenca (R$)', 'Qtd Agenda', 'Qtd Concluido'];
        const rows = auditReportData.map(e => [
            e.date,
            e.provider,
            e.agenda.toFixed(2).replace('.', ','),
            e.closure.toFixed(2).replace('.', ','),
            (e.agenda - e.closure).toFixed(2).replace('.', ','),
            e.count,
            e.closedCount
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(";")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `auditoria_agenda_fechamento_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLinkNewPayeeToTx = async (tx: BankTransaction, name: string, id: string, type: 'SUPPLIER' | 'CUSTOMER') => {
        try {
            // 1. Update bank transaction
            await supabase.from('bank_transactions').update({ system_entity_name: name }).eq('id', tx.id);
            setBankTransactions((prev: BankTransaction[]) => prev.map(bt => bt.id === tx.id ? { ...bt, systemEntityName: name } : bt));

            // 2. Extract real ID if it's a prefixed ID (though for newly created it should be clean)
            const realId = id; 

            // 3. Create a new expense/revenue item to match
            if (tx.type === 'DESPESA') {
                const { data: newExp, error: expErr } = await supabase.from('expenses').insert({
                    description: name,
                    amount: tx.amount,
                    date: tx.date,
                    category: tx.systemCategory || 'Despesas Diversas',
                    supplier_id: id,
                    status: 'Pago',
                    payment_method: 'Transferência',
                    is_reconciled: true,
                    dre_class: 'EXPENSE_ADM'
                }).select().single();

                if (expErr) throw expErr;

                const newMatches = [{ id: newExp.id, type: 'EXPENSE' as const, amount: newExp.amount }];
                setExpenses((prev: Expense[]) => [...prev, {
                    id: newExp.id, description: newExp.description, amount: newExp.amount, date: newExp.date,
                    category: newExp.category, status: newExp.status, isReconciled: true,
                    supplierId: newExp.supplier_id || undefined,
                    paymentMethod: newExp.payment_method, dreClass: newExp.dre_class
                }]);
                await supabase.from('bank_transactions').update({ system_matches: newMatches }).eq('id', tx.id);
                setBankTransactions((prev: BankTransaction[]) => prev.map(bt => bt.id === tx.id ? { ...bt, systemMatches: newMatches } : bt));
            } else {
                // For Receita, we might just update the transaction identification for now
                // or create a sale/appointment link if the system supports it.
                // For now, let's just make sure the name is saved.
            }
        } catch (err) {
            console.error('Error linking new payee:', err);
            alert('Erro ao vincular novo favorecido.');
        }
    };

    const handleOpenModal = (expense?: Expense) => {
        if (expense) {
            setEditingExpenseId(expense.id);
            // Map supplierId/providerId to the select format (prov_ID for professionals)
            const combinedId = expense.providerId ? `prov_${expense.providerId}` :
                (expense.employeeId ? `emp_${expense.employeeId}` :
                    (expense.supplierId || ''));
            setExpenseForm({ ...expense, supplierId: combinedId, invoiceNumber: expense.invoiceNumber || '' });
            setCategoryInputSearch(expense.category || '');
            setRecurrenceMonths(1);
        }
        else {
            setEditingExpenseId(null);
            setRecurrenceMonths(1);
            setExpenseForm({ description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix', invoiceNumber: '' });
            setCategoryInputSearch('');
        }
        setIsModalOpen(true);
    };

    const fetchExpenses = async () => {
        const { data } = await supabase.from('expenses').select('*');
        if (data) {
            setExpenses(data.map((e: any) => ({
                id: e.id,
                description: e.description,
                category: e.category,
                subcategory: e.subcategory,
                dreClass: e.dre_class,
                amount: e.amount,
                date: e.date,
                status: e.status,
                paymentMethod: e.payment_method,
                supplierId: e.supplier_id,
                providerId: e.provider_id,
                employeeId: e.employee_id,
                payroll_id: e.payroll_id,
                recurringId: e.recurring_id,
                isReconciled: e.is_reconciled,
                invoiceNumber: e.document_number
            })));
        }
    };

    const handlePrintPayablesReport = () => {
        const printContent = `
            <html>
            <head>
                <title>Relatório de Contas a Pagar - ${getDateLabel()}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo-section h1 { font-size: 24px; font-weight: 900; margin: 0; color: #000; letter-spacing: -0.025em; }
                    .logo-section p { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-top: 4px; }
                    .info-section { text-align: right; }
                    .info-section p { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0; }
                    .info-section h2 { font-size: 14px; font-weight: 900; margin: 4px 0 0 0; color: #0f172a; }
                    
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                    .summary-card { padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; }
                    .summary-card p { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0; }
                    .summary-card span { font-size: 18px; font-weight: 900; color: #0f172a; display: block; margin-top: 4px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
                    td { padding: 12px 8px; font-size: 11px; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
                    .amount { font-weight: 900; text-align: right; }
                    .status { font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; display: inline-block; }
                    .status-pago { background: #f0fdf4; color: #166534; }
                    .status-pendente { background: #fffbeb; color: #92400e; }
                    
                    .footer { margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 9px; color: #94a3b8; font-weight: 600; }
                    @media print { body { padding: 20px; } .summary-card { border: 1px solid #e2e8f0; -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-section">
                        <h1>AMINNA HOME NAIL GEL</h1>
                        <p>GESTÃO FINANCEIRA PROFISSIONAL</p>
                    </div>
                    <div class="info-section">
                        <p>Relatório de Contas a Pagar</p>
                        <h2>${getDateLabel()}</h2>
                        <p style="margin-top: 8px;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="summary-card">
                        <p>Total de Lançamentos</p>
                        <span>${filteredPayables.length} item(ns)</span>
                    </div>
                    <div class="summary-card">
                        <p>Total Pendente</p>
                        <span>${formatCurrency(filteredPayables.filter(e => e.status !== 'Pago').reduce((acc, e) => acc + e.amount, 0))}</span>
                    </div>
                    <div class="summary-card" style="border-color: #000; background: #f8fafc;">
                        <p>Vlr. Total do Período</p>
                        <span>${formatCurrency(filteredPayables.reduce((acc, e) => acc + e.amount, 0))}</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Favorecido</th>
                            <th>Categoria</th>
                            <th>Status</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredPayables.map(e => `
                            <tr>
                                <td>${parseDateSafe(e.date).toLocaleDateString('pt-BR')}</td>
                                <td style="font-weight: 800; text-transform: uppercase;">${e.description}</td>
                                <td style="text-transform: uppercase; color: #4338ca;">${suppliers.find(s => s.id === e.supplierId)?.name || '-'}</td>
                                <td style="text-transform: uppercase; color: #64748b;">${e.category}</td>
                                <td><span class="status ${e.status === 'Pago' ? 'status-pago' : 'status-pendente'}">${e.status}</span></td>
                                <td class="amount">${formatCurrency(e.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    AMINNA GESTÃO INTELIGENTE - Relatório Extraído do Sistema em ${new Date().toLocaleDateString('pt-BR')}
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const sanitizeAmount = (val: any): number => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        let str = String(val);
        // Remove R$ and spaces
        str = str.replace('R$', '').trim();
        // If it has a comma and a dot, it's likely 1.234,56
        if (str.includes(',') && str.includes('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
            // If only comma, it's 1234,56
            str = str.replace(',', '.');
        }
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    };


    const handleSaveExpense = async (e?: React.FormEvent, overrideOption?: 'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL') => {
        if (e) e.preventDefault();

        const finalAmount = sanitizeAmount(expenseForm.amount);

        if (!expenseForm.description) {
            alert('Por favor, preencha a descrição da despesa.');
            return;
        }
        if (finalAmount <= 0) {
            alert('Por favor, informe um valor maior que zero.');
            return;
        }
        if (!expenseForm.category) {
            alert('Por favor, selecione uma categoria (conta) para a despesa.');
            return;
        }

        const currentOption = overrideOption || batchOption;

        const expenseData = {
            description: expenseForm.description,
            amount: finalAmount,
            category: expenseForm.category,
            subcategory: expenseForm.subcategory,
            dre_class: expenseForm.dreClass, // Mapping to snake_case column
            date: expenseForm.date,
            status: expenseForm.status,
            payment_method: expenseForm.paymentMethod || 'Pix',
            supplier_id: (expenseForm.supplierId?.startsWith('prov_') || expenseForm.supplierId?.startsWith('emp_')) ? null : (expenseForm.supplierId || null),
            provider_id: expenseForm.supplierId?.startsWith('prov_') ? expenseForm.supplierId.replace('prov_', '') : (expenseForm.providerId || null),
            employee_id: expenseForm.supplierId?.startsWith('emp_') ? expenseForm.supplierId.replace('emp_', '') : (expenseForm.employeeId || null),
            document_number: expenseForm.invoiceNumber || null
        };

        try {
            if (editingExpenseId) {
                // If editing a recurring expense, we might need a batch prompt
                const originalExpense = expenses.find(exp => exp.id === editingExpenseId);
                if (originalExpense?.recurringId && batchActionType === 'IDLE') {
                    setBatchActionType('SAVE');
                    setIsBatchModalOpen(true);
                    return;
                }

                if (originalExpense?.recurringId && currentOption !== 'ONLY_THIS') {
                    // BATCH UPDATE (logic remains same as original script, preserves shifted dates)
                    let query = supabase.from('expenses').select('*').eq('recurring_id', originalExpense.recurringId);
                    if (currentOption === 'THIS_AND_FUTURE') query = query.gte('date', originalExpense.date);
                    const { data: expensesToUpdate } = await query;
                    if (expensesToUpdate) {
                        const originalDateObj = parseDateSafe(originalExpense.date);
                        const newDateObj = parseDateSafe(expenseForm.date!);
                        const timeDiff = newDateObj.getTime() - originalDateObj.getTime();
                        const baseDescription = expenseForm.description.replace(/\s*\(\d+\/\d+\)$/, '');
                        const updates = expensesToUpdate.map(exp => {
                            const suffixMatch = exp.description.match(/\s*\(\d+\/\d+\)$/);
                            const suffix = suffixMatch ? suffixMatch[0] : '';
                            const currentExpDate = parseDateSafe(exp.date);
                            const shiftedDate = new Date(currentExpDate);
                            shiftedDate.setTime(shiftedDate.getTime() + timeDiff);
                            return {
                                ...exp,
                                ...expenseData,
                                supplier_id: expenseForm.supplierId?.startsWith('prov_') ? null : (expenseForm.supplierId || null),
                                provider_id: expenseForm.supplierId?.startsWith('prov_') ? expenseForm.supplierId.replace('prov_', '') : (expenseForm.providerId || null),
                                recurring_id: originalExpense.recurringId,
                                description: baseDescription + suffix,
                                date: toLocalDateStr(shiftedDate)
                            };
                        });
                        const { error } = await supabase.from('expenses').upsert(updates);
                        if (error) throw error;
                    }
                } else if (editingExpenseId.startsWith('comm-')) {
                    // NEW: Convert virtual commission grouping to real expense record
                    const { error } = await supabase.from('expenses').insert([{
                        ...expenseData,
                        is_reconciled: originalExpense?.isReconciled || false
                    }]);
                    if (error) throw error;
                } else {
                    // SINGLE UPDATE
                    const { error } = await supabase.from('expenses').update(expenseData).eq('id', editingExpenseId);
                    if (error) throw error;
                }
            } else {
                const newExpenses = [];
                const rId = recurrenceMonths > 1 ? crypto.randomUUID() : null;

                for (let i = 0; i < recurrenceMonths; i++) {
                    const d = parseDateSafe(expenseForm.date!);
                    d.setMonth(d.getMonth() + i);

                    newExpenses.push({
                        ...expenseData,
                        description: recurrenceMonths > 1 ? `${expenseForm.description} (${i + 1}/${recurrenceMonths})` : expenseForm.description,
                        date: toLocalDateStr(d),
                        recurring_id: rId
                    });
                }
                const { error } = await supabase.from('expenses').insert(newExpenses);
                if (error) throw error;
            }
            await fetchExpenses(); // Refresh list
            setIsModalOpen(false);
            setIsBatchModalOpen(false);
            setBatchActionType('IDLE');
            setBatchOption('ONLY_THIS');
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Erro ao salvar despesa. Tente novamente.');
        }
    };

    const toggleExpenseStatus = async (id: string) => {
        const expense = expenses.find(e => e.id === id);
        if (!expense) return;

        const newStatus = expense.status === 'Pago' ? 'Pendente' : 'Pago';
        const newDate = newStatus === 'Pago' ? toLocalDateStr(new Date()) : expense.date;

        try {
            const { error } = await supabase.from('expenses').update({ status: newStatus, date: newDate }).eq('id', id);
            if (error) throw error;

            // Optimistic update or refresh
            setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: newStatus, date: newDate } : exp));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDeleteExpense = async (id: string, overrideOption?: 'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL') => {
        const expense = expenses.find(exp => exp.id === id);
        if (!expense) return;

        const currentOption = overrideOption || 'ONLY_THIS';

        if (expense.recurringId && batchActionType === 'IDLE') {
            setEditingExpenseId(id); // Temporarily store to know which series we're acting on
            setBatchActionType('DELETE');
            setIsBatchModalOpen(true);
            return;
        }

        // Only ask for confirmation if not coming from the batch modal
        if (!overrideOption && !window.confirm('Tem certeza que deseja excluir?')) return;

        try {
            if (expense.recurringId && currentOption !== 'ONLY_THIS') {
                let deleteQuery = supabase.from('expenses').delete().eq('recurring_id', expense.recurringId);
                if (currentOption === 'THIS_AND_FUTURE') {
                    deleteQuery = deleteQuery.gte('date', expense.date);
                }
                const { error } = await deleteQuery;
                if (error) throw error;
            } else {
                const { error } = await supabase.from('expenses').delete().eq('id', id);
                if (error) throw error;
            }
            await fetchExpenses();
            setIsBatchModalOpen(false);
            setBatchActionType('IDLE');
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const handleBatchStatusUpdate = async () => {
        if (selectedExpenseIds.length === 0) return;
        const firstExpense = expenses.find(e => e.id === selectedExpenseIds[0]);
        if (!firstExpense) return;

        const newStatus = firstExpense.status === 'Pago' ? 'Pendente' : 'Pago';
        const newDate = newStatus === 'Pago' ? toLocalDateStr(new Date()) : undefined;

        try {
            const { error } = await supabase.from('expenses')
                .update({ status: newStatus, date: newDate || firstExpense.date })
                .in('id', selectedExpenseIds);

            if (error) throw error;

            setExpenses(prev => prev.map(exp => selectedExpenseIds.includes(exp.id) ? { ...exp, status: newStatus, date: newDate || exp.date } as Expense : exp));
            setSelectedExpenseIds([]);
        } catch (error) {
            console.error('Error in batch status update:', error);
            alert('Erro ao atualizar status em lote.');
        }
    };

    const handleBatchDateUpdate = async () => {
        if (selectedExpenseIds.length === 0) return;

        try {
            if (applyToFuture) {
                // COMPLEX SHIFT LOGIC for recurring series
                const recurringProcessedIds = new Set<string>();
                for (const id of selectedExpenseIds) {
                    const exp = expenses.find(e => e.id === id);
                    // Skip if not an expense or if it was already processed as part of a recurring series
                    if (!exp || (exp.recurringId && recurringProcessedIds.has(exp.recurringId))) continue;

                    if (exp.recurringId) {
                        recurringProcessedIds.add(exp.recurringId);

                        const originalDateObj = parseDateSafe(exp.date);
                        const newDateObj = parseDateSafe(batchNewDate);
                        const timeDiff = newDateObj.getTime() - originalDateObj.getTime();

                        const { data: futureItems } = await supabase.from('expenses')
                            .select('*')
                            .eq('recurring_id', exp.recurringId)
                            .gte('date', exp.date);

                        if (futureItems && futureItems.length > 0) {
                            const updates = futureItems.map(item => ({
                                ...item,
                                date: toLocalDateStr(new Date(parseDateSafe(item.date).getTime() + timeDiff))
                            }));
                            const { error } = await supabase.from('expenses').upsert(updates);
                            if (error) throw error;
                        }
                    } else {
                        // Regular item - just update its date
                        const { error } = await supabase.from('expenses')
                            .update({ date: batchNewDate })
                            .eq('id', id);
                        if (error) throw error;
                    }
                }
            } else {
                // SIMPLE BATCH UPDATE: Only update valid expenses
                const validExpenseIds = selectedExpenseIds.filter(id => expenses.some(e => e.id === id));
                if (validExpenseIds.length > 0) {
                    const { error } = await supabase.from('expenses')
                        .update({ date: batchNewDate })
                        .in('id', validExpenseIds);

                    if (error) throw error;
                }
            }

            await fetchExpenses();
            setSelectedExpenseIds([]);
            setIsBatchDateModalOpen(false);
            setApplyToFuture(false);
        } catch (error) {
            console.error('Error in batch date update:', error);
            alert('Erro ao atualizar datas em lote.');
        }
    };

    const handleBatchDelete = async () => {
        if (selectedExpenseIds.length === 0) return;
        if (!window.confirm(`Tem certeza que deseja excluir ${selectedExpenseIds.length} despesas?`)) return;

        try {
            const { error } = await supabase.from('expenses').delete().in('id', selectedExpenseIds);
            if (error) throw error;

            setExpenses(prev => prev.filter(exp => !selectedExpenseIds.includes(exp.id)));
            setSelectedExpenseIds([]);
        } catch (error) {
            console.error('Error in batch delete:', error);
            alert('Erro ao excluir despesas em lote.');
        }
    };

    const toggleSelectAll = (visibleExpenses: Expense[]) => {
        const visibleIds = visibleExpenses.map(e => e.id);
        const allAlreadySelected = visibleIds.every(id => selectedExpenseIds.includes(id));

        if (allAlreadySelected) {
            setSelectedExpenseIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedExpenseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const toggleSelectExpense = (id: string) => {
        setSelectedExpenseIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handlePrintAnnualReport = () => {
        const months = dreData.monthlySnapshots || [];
        const printContent = `
            <html>
            <head>
                <title>DRE Anual - Aminna</title>
                <style>
                    @media print { @page { size: landscape; } }
                    body { font-family: 'Segoe UI', -apple-system, sans-serif; padding: 20px; -webkit-print-color-adjust: exact; font-size: 10px; }
                    h1 { color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; margin-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: right; background: #f8fafc; padding: 5px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; color: #475569; font-size: 9px; white-space: nowrap; }
                    th:first-child { text-align: left; }
                    td { padding: 4px 5px; border-bottom: 1px solid #f1f5f9; color: #1e293b; text-align: right; white-space: nowrap; }
                    td:first-child { text-align: left; white-space: normal; }
                    tr.main-row { background: #f8fafc; font-weight: 800; }
                    tr.sub-row td:first-child { padding-left: 20px; color: #64748b; font-style: italic; }
                    tr.result-row { background: #1e293b; color: white !important; }
                    tr.result-row td { color: white !important; font-weight: 900; }
                    .negative { color: #be123c; }
                    .positive { color: #047857; }
                </style>
            </head>
            <body>
                <h1>DRE Anual - ${new Date().getFullYear()}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>TOTAL</th>
                            ${months.map(m => `<th>${m.name.substring(0, 3)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="main-row"><td>1. RECEITA BRUTA</td><td class="positive">${formatValue(dreData.grossRevenue, 0)}</td>${months.map(m => `<td>${formatValue(m.grossRevenue, 0)}</td>`).join('')}</tr>
                        <tr class="sub-row"><td>Serviços</td><td>${formatValue(dreData.revenueServices, 0)}</td>${months.map(m => `<td>${formatValue(m.revenueServices, 0)}</td>`).join('')}</tr>

                        <tr><td>2. (-) DEDUÇÃ•ES (Repasses Salão Parceiro)</td><td class="negative">-${formatValue(dreData.deductions, 0)}</td>${months.map(m => `<td class="negative">-${formatValue(m.deductions, 0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>3. (=) REC. LÃQUIDA</td><td>${formatValue(dreData.netRevenue, 0)}</td>${months.map(m => `<td>${formatValue(m.netRevenue, 0)}</td>`).join('')}</tr>

                        <tr><td>4. (-) CPV / CMV</td><td class="negative">-${formatValue(dreData.totalCOGS, 0)}</td>${months.map(m => `<td class="negative">-${formatValue(m.totalCOGS, 0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>5. (=) LUCRO BRUTO</td><td class="positive">${formatValue(dreData.grossProfit, 0)}</td>${months.map(m => `<td class="positive">${formatValue(m.grossProfit, 0)}</td>`).join('')}</tr>
                        <tr><td>6. (+) OUTRAS RECEITAS</td><td class="positive">+${formatValue(dreData.otherRevenues, 0)}</td>${months.map(m => `<td>+${formatValue(m.otherRevenues, 0)}</td>`).join('')}</tr>
                        <tr><td>7. (-) DESP. VENDAS</td><td class="negative">-${formatValue(dreData.amountVendas, 0)}</td>${months.map(m => `<td class="negative">-${formatValue(m.amountVendas, 0)}</td>`).join('')}</tr>
                        <tr><td>8. (-) DESP. ADM</td><td class="negative">-${formatValue(dreData.amountAdm, 0)}</td>${months.map(m => `<td class="negative">-${formatValue(m.amountAdm, 0)}</td>`).join('')}</tr>
                        <tr><td>9. (-) DESP. FIN</td><td class="negative">-${formatValue(dreData.amountFin, 0)}</td>${months.map(m => `<td class="negative">-${formatValue(m.amountFin, 0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>10. (=) RES. ANTES IRPJ</td><td>${formatValue(dreData.resultBeforeTaxes, 0)}</td>${months.map(m => `<td>${formatValue(m.resultBeforeTaxes, 0)}</td>`).join('')}</tr>
                        <tr><td>11. (-) IRPJ/CSLL</td><td class="negative">-${formatValue(dreData.irpjCsll, 0)}</td>${months.map(m => `<td class="negative">-${formatValue(m.irpjCsll, 0)}</td>`).join('')}</tr>
                        <tr class="result-row"><td>12. (=) RES. LÃQUIDO</td><td>${formatValue(dreData.netResult, 0)}</td>${months.map(m => `<td>${formatValue(m.netResult, 0)}</td>`).join('')}</tr>
                    </tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const handlePrintDRE = () => {
        if (timeView === 'year') {
            handlePrintAnnualReport();
            return;
        }
        const formatPercent = (val: number, total: number) => (total > 0 ? (val / total) * 100 : 0).toFixed(1) + '%';
        const printContent = `
            <html>
            <head>
                <title>DRE - Aminna (${getDateLabel()})</title>
                <style>
                    body { font-family: 'Segoe UI', -apple-system, sans-serif; padding: 40px; -webkit-print-color-adjust: exact; }
                    h1 { color: #1e293b; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-transform: uppercase; margin-bottom: 5px; }
                    p.meta { color: #64748b; font-size: 14px; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { text-align: left; background: #f8fafc; padding: 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; color: #475569; }
                    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
                    tr.main-row { background: #f8fafc; font-weight: 800; }
                    tr.sub-row td:first-child { padding-left: 30px; color: #64748b; font-style: italic; }
                    tr.result-row { background: #1e293b; color: white !important; font-size: 14px; }
                    tr.result-row td { color: white !important; font-weight: 900; padding: 15px 10px; }
                    .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: bold; }
                    .negative { color: #be123c; }
                    .positive { color: #047857; }
                </style>
            </head>
            <body>
                <h1>Demonstrativo de Resultado do Exercício (DRE)</h1>
                <p class="meta">Período: ${getDateLabel()} | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                
                <table>
                    <thead><tr><th>Descrição</th><th class="amount">Valor (R$)</th><th class="amount">AV%</th></tr></thead>
                    <tbody>
                        <tr class="main-row"><td>1. RECEITA BRUTA</td><td class="amount positive">${formatCurrency(dreData.grossRevenue)}</td><td class="amount">100.0%</td></tr>
                        <tr class="sub-row"><td>Serviços</td><td class="amount">${formatCurrency(dreData.revenueServices)}</td><td class="amount">${formatPercent(dreData.revenueServices, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>2. (-) DEDUÇÃ•ES (Repasses Salão Parceiro)</td><td class="amount negative">- ${formatCurrency(dreData.deductions)}</td><td class="amount">${formatPercent(dreData.deductions, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>3. (=) RECEITA LÃQUIDA</td><td class="amount">${formatCurrency(dreData.netRevenue)}</td><td class="amount">${formatPercent(dreData.netRevenue, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>4. (-) CPV / CMV</td><td class="amount negative">- ${formatCurrency(dreData.totalCOGS)}</td><td class="amount">${formatPercent(dreData.totalCOGS, dreData.grossRevenue)}</td></tr>
                        <tr class="sub-row"><td>Comissões Técnica</td><td class="amount">${formatCurrency(dreData.commissions)}</td><td class="amount">${formatPercent(dreData.commissions, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>5. (=) LUCRO BRUTO</td><td class="amount positive">${formatCurrency(dreData.grossProfit)}</td><td class="amount">${formatPercent(dreData.grossProfit, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>6. (+) OUTRAS RECEITAS</td><td class="amount positive">+ ${formatCurrency(dreData.otherRevenues)}</td><td class="amount">${formatPercent(dreData.otherRevenues, dreData.grossRevenue)}</td></tr>
                        ${Object.entries((dreData.breakdownBankRevenues || {}) as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">â”” ${cat}</td><td class="amount">${formatCurrency(info.total)}</td><td class="amount"></td></tr>
                        `).join('')}

                        <tr><td>7. (-) DESPESAS COM VENDAS</td><td class="amount negative">- ${formatCurrency(dreData.amountVendas)}</td><td class="amount">${formatPercent(dreData.amountVendas, dreData.grossRevenue)}</td></tr>
                        ${Object.entries(dreData.breakdownVendas as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">└ ${cat}</td><td class="amount">${formatCurrency(info.total)}</td><td class="amount"></td></tr>
                        `).join('')}
                        
                        <tr><td>8. (-) DESPESAS ADMINISTRATIVAS</td><td class="amount negative">- ${formatCurrency(dreData.amountAdm)}</td><td class="amount">${formatPercent(dreData.amountAdm, dreData.grossRevenue)}</td></tr>
                         ${Object.entries(dreData.breakdownAdm as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">â”” ${cat}</td><td class="amount">${formatCurrency(info.total)}</td><td class="amount"></td></tr>
                        `).join('')}

                        <tr><td>9. (-) DESPESAS FINANCEIRAS</td><td class="amount negative">- ${formatCurrency(dreData.amountFin)}</td><td class="amount">${formatPercent(dreData.amountFin, dreData.grossRevenue)}</td></tr>

                         ${Object.entries(dreData.breakdownFin as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">â”” ${cat}</td><td class="amount">${formatCurrency(info.total)}</td><td class="amount"></td></tr>
                        `).join('')}

                        <tr class="main-row"><td>10. (=) RESULTADO ANTES IRPJ/CSLL</td><td class="amount">${formatCurrency(dreData.resultBeforeTaxes)}</td><td class="amount">${formatPercent(dreData.resultBeforeTaxes, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>11. (-) PROVISÃ•ES IRPJ/CSLL</td><td class="amount negative">- ${formatCurrency(dreData.irpjCsll)}</td><td class="amount">${formatPercent(dreData.irpjCsll, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="result-row"><td>12. (=) RESULTADO LÃQUIDO</td><td class="amount">${formatCurrency(dreData.netResult)}</td><td class="amount">${formatPercent(dreData.netResult, dreData.grossRevenue)}</td></tr>
                    </tbody>
                </table>
                <p style="margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center;">Este é um documento confidencial gerado pelo sistema Aminna.</p>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const handleDownloadDRE = () => {
        const formatPercent = (val: number, total: number) => {
            if (!isFinite(total) || total <= 0) return '0.0%';
            return ((val / total) * 100).toFixed(1) + '%';
        };

        const isYearView = timeView === 'year';
        const months = dreData.monthlySnapshots || [];

        const headerRow = ['Descrição', 'TOTAL'];
        if (isYearView) months.forEach(m => headerRow.push(m.name));
        else headerRow.push('AV%');

        const rows = [
            ['DRE - Demonstrativo de Resultado', `Período: ${getDateLabel()}`],
            ['Gerado em', new Date().toLocaleString('pt-BR')],
            [],
            headerRow,
            ['1. RECEITA BRUTA', formatValue(dreData.grossRevenue), ...(isYearView ? months.map(m => formatValue(m.grossRevenue)) : ['100.0%'])],
            ['   Serviços', formatValue(dreData.revenueServices), ...(isYearView ? months.map(m => formatValue(m.revenueServices)) : [formatPercent(dreData.revenueServices, dreData.grossRevenue)])],
            ['2. (-) DEDUÇÃ•ES (Repasses Salão Parceiro)', `-${formatValue(dreData.deductions)}`, ...(isYearView ? months.map(m => `-${formatValue(m.deductions)}`) : [formatPercent(dreData.deductions, dreData.grossRevenue)])],
            ['3. (=) RECEITA LÃQUIDA', formatValue(dreData.netRevenue), ...(isYearView ? months.map(m => formatValue(m.netRevenue)) : [formatPercent(dreData.netRevenue, dreData.grossRevenue)])],
            ['4. (-) CPV / CMV', `-${formatValue(dreData.totalCOGS)}`, ...(isYearView ? months.map(m => `-${formatValue(m.totalCOGS)}`) : [formatPercent(dreData.totalCOGS, dreData.grossRevenue)])],
            ['5. (=) LUCRO BRUTO', formatValue(dreData.grossProfit), ...(isYearView ? months.map(m => formatValue(m.grossProfit)) : [formatPercent(dreData.grossProfit, dreData.grossRevenue)])],
            ['6. (+) OUTRAS RECEITAS', formatValue(dreData.otherRevenues), ...(isYearView ? months.map(m => formatValue(m.otherRevenues)) : [formatPercent(dreData.otherRevenues, dreData.grossRevenue)])],
            ['7. (-) DESPESAS VENDAS', `-${formatValue(dreData.amountVendas)}`, ...(isYearView ? months.map(m => `-${formatValue(m.amountVendas)}`) : [formatPercent(dreData.amountVendas, dreData.grossRevenue)])],
            ['8. (-) DESPESAS ADM', `-${formatValue(dreData.amountAdm)}`, ...(isYearView ? months.map(m => `-${formatValue(m.amountAdm)}`) : [formatPercent(dreData.amountAdm, dreData.grossRevenue)])],
            ['9. (-) DESPESAS FIN', `-${formatValue(dreData.amountFin)}`, ...(isYearView ? months.map(m => `-${formatValue(m.amountFin)}`) : [formatPercent(dreData.amountFin, dreData.grossRevenue)])],

            ['10. (=) RESULTADO ANTES IRPJ', formatValue(dreData.resultBeforeTaxes), ...(isYearView ? months.map(m => formatValue(m.resultBeforeTaxes)) : [formatPercent(dreData.resultBeforeTaxes, dreData.grossRevenue)])],
            ['11. (-) IRPJ/CSLL', `-${formatValue(dreData.irpjCsll)}`, ...(isYearView ? months.map(m => `-${formatValue(m.irpjCsll)}`) : [formatPercent(dreData.irpjCsll, dreData.grossRevenue)])],
            ['12. (=) RESULTADO LÃQUIDO', formatValue(dreData.netResult), ...(isYearView ? months.map(m => formatValue(m.netResult)) : [formatPercent(dreData.netResult, dreData.grossRevenue)])]
        ];

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(";")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `dre_aminna_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintDailyClose = () => {
        window.print();
    };



    return (
        <div className="space-y-4 md:space-y-6 relative h-full flex flex-col pb-24 md:pb-8 text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center w-full mb-2">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight">Gestão Financeira</h2>
                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Controle total e sincronizado</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="flex p-0.5 md:p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide w-full xl:w-auto flex-nowrap">
                    {[
                        { id: 'ACCOUNTS', label: 'Contas', icon: FileText },
                        { id: 'DRE', label: 'DRE', icon: CalcIcon },
                        { id: 'CHARTS', label: 'Gráficos', icon: BarChart3 },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                if (tab.id === 'DRE') {
                                    setTimeView('month');
                                    setDateRef(new Date());
                                }
                                if (tab.id === 'CHARTS') {
                                    setTimeView('year');
                                    setDateRef(new Date());
                                }
                            }}
                            className={`flex-1 md:flex-none min-w-[80px] md:min-w-[100px] flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon size={13} className="md:size-[14px]" /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-stretch md:items-center">

                    {activeTab === 'ACCOUNTS' && accountsSubTab === 'DETAILED' && (
                        <div className="flex gap-2 w-full md:w-auto animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar por descrição ou nome..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                                    value={detailedFilter}
                                    onChange={e => setDetailedFilter(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto overflow-x-auto scrollbar-hide flex-nowrap">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button key={v} onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }} className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}</button>
                        ))}
                    </div>
                    {timeView !== 'custom' ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between group shadow-sm transition-all">
                            <div className="flex items-center">
                                <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            </div>

                            <div 
                                className="relative flex items-center justify-center cursor-pointer min-w-[140px]"
                                onClick={() => {
                                    if (datePickerRef.current && ('showPicker' in HTMLInputElement.prototype)) {
                                        (datePickerRef.current as any).showPicker();
                                    }
                                }}
                            >
                                <CalendarDays className="absolute left-0 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" size={12} />
                                <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight whitespace-nowrap px-4 py-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">{getDateLabel()}</span>
                                <input 
                                    ref={datePickerRef}
                                    type={timeView === 'day' ? 'date' : timeView === 'month' ? 'month' : 'text'}
                                    className={`absolute inset-0 opacity-0 cursor-pointer w-full ${(timeView as string) === 'year' || (timeView as string) === 'custom' ? 'pointer-events-none' : ''}`}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const val = e.target.value;
                                            let dString = val;
                                            if (timeView === 'month') dString += '-01';
                                            if (timeView === 'day' || timeView === 'month') {
                                                const d = new Date(dString + 'T12:00:00'); // Use 12:00 to avoid UTC shift issues
                                                if (!isNaN(d.getTime())) setDateRef(d);
                                            }
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex items-center">
                                <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
                            </div>

                            {/* META SIMULATOR (MOVED) */}
                            <div className="ml-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-0.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap flex items-center gap-1"><Target size={10} className="text-indigo-500" /> Meta</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPredictiveTargetGrowth(Math.max(0, predictiveTargetGrowth - 5))} className="w-3.5 h-3.5 rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-[9px] font-black">-</button>
                                    <span className="text-[10px] font-black text-slate-950 dark:text-white">+{predictiveTargetGrowth}%</span>
                                    <button onClick={() => setPredictiveTargetGrowth(predictiveTargetGrowth + 5)} className="w-3.5 h-3.5 rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-[9px] font-black">+</button>
                                </div>
                            </div>

                            {timeView === 'month' && activeTab === 'DRE' && (
                                <button
                                    onClick={() => toggleMonthlyClosing(dateRef.getFullYear(), dateRef.getMonth())}
                                    className={`ml-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm border ${monthlyClosings[`${dateRef.getFullYear()}-${dateRef.getMonth()}`]
                                        ? 'bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600'
                                        : 'bg-white dark:bg-zinc-800 text-slate-400 border-slate-200 dark:border-zinc-700 hover:text-emerald-500 hover:border-emerald-200'
                                        }`}
                                >
                                    <CircleCheck size={12} strokeWidth={3} />
                                    {monthlyClosings[`${dateRef.getFullYear()}-${dateRef.getMonth()}`] ? 'Conciliação Concluída' : 'Marcar como Concluída'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-500" />
                            <span className="text-[10px] font-black text-slate-400">Até</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-500" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {activeTab === 'ACCOUNTS' && (
                    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
                        {/* ===== ACCOUNTS Sub-nav â€” always first ===== */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                            <div className="flex p-0.5 md:p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide w-full sm:w-auto flex-nowrap">
                                {[
                                    { id: 'DETAILED', label: 'Extrato / Fluxo', icon: List },
                                    { id: 'CONCILIADO', label: 'Conciliados', icon: CircleCheck },
                                    { id: 'PAYABLES', label: 'Contas a Pagar', icon: ArrowDownCircle },
                                    { id: 'DAILY', label: 'Caixa Diário', icon: CalcIcon },
                                    { id: 'SUPPLIERS', label: 'Fornecedores', icon: Users },
                                    { id: 'AUDIT', label: 'Ajustes', icon: ShieldCheck },
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => {
                                            setAccountsSubTab(st.id as any);
                                            if (st.id === 'DAILY') { setTimeView('day'); setDateRef(new Date()); }
                                        }}
                                        className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${accountsSubTab === st.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                    >
                                        <st.icon size={12} className="md:size-[13px]" /> {st.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                {(accountsSubTab === 'DETAILED' || accountsSubTab === 'PAYABLES') && (
                                    <button 
                                        onClick={() => handleOpenModal()} 
                                        className="hidden md:flex group relative items-center gap-2 px-6 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all outline-none"
                                    >
                                        <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                                        Lançar Despesa
                                    </button>
                                )}
                                {accountsSubTab === 'CONCILIADO' && (
                                    <button onClick={() => setIsReconciliationOpen(true)} className="hidden md:flex w-full sm:w-auto text-[9px] md:text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-xl items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all hover:bg-indigo-100">
                                        <RefreshCw size={12} /> Conciliação
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile centered buttons */}
                        {(accountsSubTab === 'DETAILED' || accountsSubTab === 'PAYABLES') && (
                            <div className="flex md:hidden justify-center px-4 -mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                <button 
                                    onClick={() => handleOpenModal()} 
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all outline-none"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                    Lançar Despesa
                                </button>
                            </div>
                        )}
                        {accountsSubTab === 'CONCILIADO' && (
                            <div className="flex md:hidden justify-center px-4 -mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                <button onClick={() => setIsReconciliationOpen(true)} className="w-full text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-indigo-100">
                                    <RefreshCw size={14} /> Conciliação
                                </button>
                            </div>
                        )}

                        {/* ===== EXTRATO / FLUXO ===== */}
                        {accountsSubTab === 'DETAILED' && (
                            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                                <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                    <div>
                                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><List size={16} /> Extrato de Fluxo Financeiro</h3>
                                        <p className="text-[9px] text-slate-500 uppercase mt-0.5">Listagem de todas as entradas e saídas no período</p>
                                    </div>
                                    <button onClick={handlePrintDetailedReport} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><Printer size={16} /></button>
                                </div>
                                <div className="overflow-x-auto scrollbar-hide">
                                    {/* Mobile Cards View */}
                                    <div className="grid grid-cols-1 md:hidden p-4 space-y-3">
                                        {filteredTransactions.length > 0 ? (
                                            filteredTransactions.map(t => (
                                                <div key={t.id} className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-colors ${selectedExpenseIds.includes(t.id) ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            {t.origin === 'Despesa' && (
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                    checked={selectedExpenseIds.includes(t.id)}
                                                                    onChange={() => toggleSelectExpense(t.id)}
                                                                />
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-slate-500 font-mono">
                                                                    {parseDateSafe(t.date).toLocaleDateString('pt-BR')}
                                                                </span>
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{t.origin}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                            {t.type === 'RECEITA' ? <ArrowUpCircle size={8} /> : <ArrowDownCircle size={8} />}
                                                            {t.type}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1">
                                                        <div className="flex justify-between gap-2">
                                                            <p className="font-black text-slate-950 dark:text-white uppercase text-[11px] leading-tight line-clamp-2 flex-1">{t.description}</p>
                                                            {t.isReconciled && <CircleCheck size={12} className="text-emerald-500 shrink-0 mt-0.5" />}
                                                        </div>
                                                        {t.customerOrProviderName && <p className="text-[10px] text-slate-500 font-bold mt-0.5 italic">{t.customerOrProviderName}</p>}
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-zinc-800 mt-1">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase">{t.paymentMethod}</span>
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border w-fit ${t.status === 'Pago' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : t.status === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-100 animate-pulse' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
                                                                {t.status}
                                                            </span>
                                                        </div>
                                                        <div className={`text-right font-black text-base ${t.type === 'RECEITA' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                            {t.type === 'DESPESA' ? '-' : '+'} R$ {t.amount.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center opacity-30">
                                                <Search size={48} className="mx-auto mb-2" />
                                                <p className="text-xs font-black uppercase tracking-widest">Nenhuma transação</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Desktop Table View */}
                                    <table className="hidden md:table w-full text-left border-collapse min-w-[1000px]">
                                        <thead className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-200 dark:border-zinc-700">
                                            <tr>
                                                <th className="px-4 py-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                                                        checked={filteredTransactions.length > 0 && filteredTransactions.filter(t => t.origin === 'Despesa').every(t => selectedExpenseIds.includes(t.id))}
                                                        onChange={() => {
                                                            const visibleExpenses = filteredTransactions.filter(t => t.origin === 'Despesa');
                                                            if (visibleExpenses.length === 0) return;
                                                            const visibleIds = visibleExpenses.map(e => e.id);
                                                            const allAlreadySelected = visibleIds.every((id: string) => selectedExpenseIds.includes(id));
                                                            if (allAlreadySelected) {
                                                                setSelectedExpenseIds((prev: string[]) => prev.filter(id => !visibleIds.includes(id)));
                                                            } else {
                                                                setSelectedExpenseIds((prev: string[]) => Array.from(new Set([...prev, ...visibleIds])));
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">Data</th>
                                                <th className="px-6 py-4">Tipo</th>
                                                <th className="px-6 py-4">Origem</th>
                                                <th className="px-6 py-4">Descrição</th>
                                                <th className="px-6 py-4">Pagamento</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-center">Conciliação</th>
                                                <th className="px-6 py-4 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                            {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                                                <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group text-sm ${selectedExpenseIds.includes(t.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                                    <td className="px-4 py-4 w-10">
                                                        {t.origin === 'Despesa' && (
                                                            <input
                                                                type="checkbox"
                                                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                checked={selectedExpenseIds.includes(t.id)}
                                                                onChange={() => toggleSelectExpense(t.id)}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold font-mono text-slate-500 whitespace-nowrap">
                                                        {parseDateSafe(t.date).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit border ${t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'}`}>
                                                            {t.type === 'RECEITA' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                                                            {t.type}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t.origin}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-slate-950 dark:text-white uppercase text-xs leading-tight">{t.description}</p>
                                                        {t.customerOrProviderName && <p className="text-[10px] text-slate-500 font-bold mt-0.5">{t.customerOrProviderName}</p>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">{t.paymentMethod}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${t.status === 'Pago' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                            t.status === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-100 animate-pulse' :
                                                                'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                                                            }`}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-black text-sm whitespace-nowrap ${t.type === 'RECEITA' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                                        <div className="flex items-center justify-end gap-2">
                                                            {t.amount === 0 && t.type === 'RECEITA' && <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="VIP / Cortesia"><Crown size={10} strokeWidth={3} /> VIP</span>}
                                                            {t.type === 'DESPESA' ? '-' : '+'} R$ {t.amount.toFixed(2)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-20 text-center opacity-30">
                                                        <Search size={48} className="mx-auto mb-2" />
                                                        <p className="text-xs font-black uppercase tracking-widest">Nenhuma transação no período</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {accountsSubTab === 'CONCILIADO' && (() => {
                            // openingBalance is now fetched directly from the DB in a useEffect and stored in state

                            let currentBal = openingBalance;
                            const expandedRows: { t: BankTransaction; delta: number; balance: number; match?: { id: string, type: string, amount: number }; isSplit?: boolean }[] = [];

                            bankTransactions.forEach(t => {
                                if (t.systemMatches && t.systemMatches.length > 0) {
                                    // Deduplicate matches to prevent "ficou duplicado" issue
                                    const seenMatchIds = new Set();
                                    const uniqueMatches = t.systemMatches.filter(m => {
                                        if (seenMatchIds.has(m.id)) return false;
                                        seenMatchIds.add(m.id);
                                        return true;
                                    });

                                    // Expand into multiple rows
                                    uniqueMatches.forEach(m => {
                                        const delta = t.type === 'RECEITA' ? Math.abs(m.amount) : -Math.abs(m.amount);
                                        currentBal += delta;
                                        expandedRows.push({ t, delta, balance: currentBal, match: m, isSplit: true });
                                    });
                                } else {
                                    // Single row (Not linked)
                                    const delta = t.type === 'RECEITA' ? Math.abs(t.amount) : -Math.abs(t.amount);
                                    currentBal += delta;
                                    expandedRows.push({ t, delta, balance: currentBal, isSplit: false });
                                }
                            });

                            const allWithBalance = expandedRows;

                            const totalIn = bankTransactions.filter(t => t.type === 'RECEITA').reduce((s, t) => s + Math.abs(t.amount), 0);
                            const totalOut = bankTransactions.filter(t => t.type === 'DESPESA').reduce((s, t) => s + Math.abs(t.amount), 0);
                            const runningBalance = currentBal;

                            const rowsWithBalance = allWithBalance.filter(({ t, match, isSplit }) => {
                                let desc = t.description;
                                let cat = t.systemCategory || '';
                                let ent = t.systemEntityName || '';

                                if (match) {
                                    if (match.type === 'EXPENSE') {
                                        const exp = expenses.find(e => e.id === match.id);
                                        if (exp) {
                                            desc = exp.description;
                                            cat = exp.category;
                                            const sup = suppliers.find(s => s.id === exp.supplierId);
                                            ent = sup?.name || providers.find(p => p.id === exp.providerId)?.name || employees.find(e => e.id === exp.employeeId)?.name || '';
                                        } else {
                                            // Check if it's a commission or other derived transaction
                                            const tx = transactions.find(tr => tr.id === match.id);
                                            if (tx) {
                                                desc = tx.description;
                                                cat = tx.category;
                                                ent = tx.customerOrProviderName || tx.providerName || '';
                                            }
                                        }
                                    } else if (match.type === 'SALE') {
                                        const sale = sales.find(s => s.id === match.id);
                                        if (sale) {
                                            desc = `Venda #${sale.id.slice(0, 5)}`;
                                            cat = 'Venda';
                                            const cust = customers.find(c => c.id === sale.customerId);
                                            ent = cust?.name || '';
                                        }
                                    } else if (match.type === 'APPOINTMENT') {
                                        const app = appointments.find(a => a.id === match.id);
                                        if (app) {
                                            desc = `Agendamento: ${app.combinedServiceNames || 'Serviço'}`;
                                            cat = 'Serviço';
                                            const cust = customers.find(c => c.id === app.customerId);
                                            ent = cust?.name || '';
                                        }
                                    }
                                }

                                const matchesSearch = !conciliadoFilter || (
                                    desc.toLowerCase().includes(conciliadoFilter.toLowerCase()) ||
                                    cat.toLowerCase().includes(conciliadoFilter.toLowerCase()) ||
                                    ent.toLowerCase().includes(conciliadoFilter.toLowerCase()) ||
                                    t.description.toLowerCase().includes(conciliadoFilter.toLowerCase())
                                );

                                const matchesType = conciliadoTypeFilter === 'ALL' || t.type === conciliadoTypeFilter;
                                const matchesSplit = conciliadoSplitFilter === 'ALL' || (conciliadoSplitFilter === 'SPLIT' ? isSplit : !isSplit);

                                return matchesSearch && matchesType && matchesSplit;
                            });

                            const itemsPerPage = 50;
                            const totalPages = Math.ceil(rowsWithBalance.length / itemsPerPage);

                            // Adjust page if filter makes it out of bounds
                            const currentPage = totalPages > 0 ? Math.min(conciliadoPage, totalPages) : 1;

                            const paginatedRows = rowsWithBalance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                            const filtered = rowsWithBalance.map(r => r.t);

                            const handlePrintConciliado = () => {
                                let bal = openingBalance;
                                const rowsHtml = rowsWithBalance.map(({ t, delta, balance, match }) => {
                                    let d = t.description;
                                    let c = t.systemCategory || '';
                                    let e = t.systemEntityName || '';

                                    if (match) {
                                        if (match.type === 'EXPENSE') {
                                            const x = expenses.find(ex => ex.id === match.id);
                                            if (x) { d = x.description; c = x.category; e = suppliers.find(s => s.id === x.supplierId)?.name || ''; }
                                        } else if (match.type === 'SALE') {
                                            const s = sales.find(sl => sl.id === match.id);
                                            if (s) { d = `Venda #${s.id.slice(0, 5)}`; c = 'Venda'; e = customers.find(cu => cu.id === s.customerId)?.name || ''; }
                                        } else if (match.type === 'APPOINTMENT') {
                                            const a = appointments.find(ap => ap.id === match.id);
                                            if (a) { d = `Agendamento: ${a.combinedServiceNames || 'Serviço'}`; c = 'Serviço'; e = customers.find(cu => cu.id === a.customerId)?.name || ''; }
                                        }
                                    }

                                    return `
                                    <tr>
                                        <td>${parseDateSafe(t.date).toLocaleDateString('pt-BR')}</td>
                                        <td>${d.toUpperCase()}</td>
                                        <td>${c}</td>
                                        <td>${e}</td>
                                        <td>${t.systemPaymentMethod || ''}</td>
                                        <td style="text-align:right;color:${delta >= 0 ? '#059669' : '#dc2626'}">${delta >= 0 ? '+' : ''}${delta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td style="text-align:right">${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>`;
                                }).join('');
                                const w = window.open('', '_blank');
                                if (!w) return;
                                w.document.write(`<html><head><title>Extrato Conciliado</title><style>
                                    body{font-family:Arial,sans-serif;padding:24px;color:#111}
                                    h2{margin-bottom:4px}p{color:#888;font-size:12px;margin-bottom:20px}
                                    table{width:100%;border-collapse:collapse;font-size:11px}
                                    th{text-align:left;padding:8px;border-bottom:2px solid #000;font-size:10px;text-transform:uppercase}
                                    td{padding:7px 8px;border-bottom:1px solid #eee}
                                    tr:nth-child(even){background:#f9f9f9}
                                    .totals{margin-top:20px;display:flex;gap:32px}
                                    .tot{font-size:12px}
                                </style></head><body>
                                <h2>Extrato Conciliado</h2>
                                <p>Período: ${parseDateSafe(startDate).toLocaleDateString('pt-BR')} a ${parseDateSafe(endDate).toLocaleDateString('pt-BR')} â€” ${filtered.length} lançamentos do banco</p>
                                <table><thead><tr><th>Data</th><th>Descrição Banco</th><th>Categoria Sinc.</th><th>Favorecido / Origem</th><th>Pagamento</th><th style="text-align:right">Valor (R$)</th><th style="text-align:right">Saldo (R$)</th></tr>
                                <tr><td colspan="5" style="color:#888">Saldo Anterior</td><td></td><td style="text-align:right">${openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
                                </thead><tbody>${rowsHtml}</tbody></table>
                                <div class="totals"><div class="tot">âœ… Entradas: <b style="color:#059669">R$ ${totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div><div class="tot">âŒ Saídas: <b style="color:#dc2626">R$ ${totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div><div class="tot">ðŸ’° Saldo Final: <b>R$ ${runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div></div>
                                </body></html>`);
                                w.document.close(); w.print();
                            };

                            const handleDownloadCSV = () => {
                                const header = ['Data', 'Tipo', 'Categoria Sinc.', 'Favorecido', 'Descrição Banco', 'Pagamento', 'Valor', 'Saldo'];
                                let bal = openingBalance;
                                const rows = rowsWithBalance.map(({ t, delta, balance, match }) => {
                                    let d = t.description;
                                    let c = t.systemCategory || '';
                                    let e = t.systemEntityName || '';

                                    if (match) {
                                        if (match.type === 'EXPENSE') {
                                            const x = expenses.find(ex => ex.id === match.id);
                                            if (x) { d = x.description; c = x.category; e = suppliers.find(s => s.id === x.supplierId)?.name || ''; }
                                        } else if (match.type === 'SALE') {
                                            const s = sales.find(sl => sl.id === match.id);
                                            if (s) { d = `Venda #${s.id.slice(0, 5)}`; c = 'Venda'; e = customers.find(cu => cu.id === s.customerId)?.name || ''; }
                                        } else if (match.type === 'APPOINTMENT') {
                                            const a = appointments.find(ap => ap.id === match.id);
                                            if (a) { d = `Agendamento: ${a.combinedServiceNames || 'Serviço'}`; c = 'Serviço'; e = customers.find(cu => cu.id === a.customerId)?.name || ''; }
                                        }
                                    }

                                    return [
                                        parseDateSafe(t.date).toLocaleDateString('pt-BR'),
                                        t.type, c,
                                        e, d,
                                        t.systemPaymentMethod || '',
                                        delta.toFixed(2).replace('.', ','),
                                        balance.toFixed(2).replace('.', ',')
                                    ];
                                });
                                const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
                                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url;
                                a.download = `extrato-conciliado-${startDate}-${endDate}.csv`;
                                a.click(); URL.revokeObjectURL(url);
                            };

                            return (
                                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300 relative">
                                    {bankTransactionsLoading && (
                                        <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <RefreshCw size={32} className="text-indigo-600 animate-spin" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sincronizando Banco...</p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Header */}
                                    <div className="p-5 border-b bg-slate-50/50 dark:bg-zinc-800/50">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex-1 flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                                        <CircleCheck size={16} className="text-emerald-500" /> Extrato Conciliado
                                                    </h3>
                                                    <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                                                        {bankTransactions.length} transações validadas pelo banco
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handlePrintConciliado} className="p-1.5 sm:p-2 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-400 hover:text-slate-900 transition-colors shadow-sm" title="Imprimir Extrato">
                                                        <Printer size={16} />
                                                    </button>
                                                    <button onClick={handleDownloadCSV} className="p-1.5 sm:p-2 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors shadow-sm" title="Baixar CSV">
                                                        <Download size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                                            {/* Totals Chips */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                                                    {bankTransactions.length} transações bancárias
                                                </span>
                                                <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                                                    R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                        Saldo Final: R$ {runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Type Filters */}
                                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 w-fit">
                                                <button
                                                    onClick={() => setConciliadoTypeFilter((prev: 'ALL' | 'RECEITA' | 'DESPESA') => prev === 'RECEITA' ? 'ALL' : 'RECEITA')}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${conciliadoTypeFilter === 'RECEITA'
                                                        ? 'bg-emerald-500 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                                                        }`}
                                                >
                                                    <ArrowUpCircle size={12} /> Receitas
                                                </button>
                                                <button
                                                    onClick={() => setConciliadoTypeFilter((prev: 'ALL' | 'RECEITA' | 'DESPESA') => prev === 'DESPESA' ? 'ALL' : 'DESPESA')}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${conciliadoTypeFilter === 'DESPESA'
                                                        ? 'bg-rose-500 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
                                                        }`}
                                                >
                                                    <ArrowDownCircle size={12} /> Despesas
                                                </button>
                                            </div>

                                            {/* Conciliation Filters */}
                                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 w-fit ml-auto">
                                                <button
                                                    onClick={() => setConciliadoSplitFilter('ALL')}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${conciliadoSplitFilter === 'ALL'
                                                        ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    Todos
                                                </button>
                                                <button
                                                    onClick={() => setConciliadoSplitFilter('SPLIT')}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${conciliadoSplitFilter === 'SPLIT'
                                                        ? 'bg-emerald-500 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                                                        }`}
                                                >
                                                    Conciliado Sim
                                                </button>
                                                <button
                                                    onClick={() => setConciliadoSplitFilter('NOT_SPLIT')}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${conciliadoSplitFilter === 'NOT_SPLIT'
                                                        ? 'bg-amber-500 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                                                        }`}
                                                >
                                                    Conciliado Não
                                                </button>
                                            </div>
                                        </div>
                                        {/* Search bar */}
                                        <div className="mt-3 relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={conciliadoFilter}
                                                onChange={e => setConciliadoFilter(e.target.value)}
                                                placeholder="Buscar por descrição, categoria, favorecido ou pagamento..."
                                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:border-indigo-400 placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
                                        <table className="w-full text-left md:border-collapse block md:table md:min-w-[1500px]">
                                            <thead className="hidden md:table-header-group bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-200 dark:border-zinc-700">
                                                <tr>
                                                    <th className="px-5 py-4 md:w-[110px]">Data</th>
                                                    <th className="px-5 py-4 md:w-[100px]">Tipo</th>
                                                    <th className="px-5 py-4 md:w-[200px]">Categoria</th>
                                                    <th className="px-5 py-4 md:w-[250px]">Favorecido</th>
                                                    <th className="px-5 py-4">Descrição / Documento</th>
                                                    <th className="px-5 py-4 md:w-[120px]">Pagamento</th>
                                                    <th className="px-5 py-4 md:w-[130px] text-right">Valor (R$)</th>
                                                    <th className="px-5 py-4 md:w-[130px] text-right">Saldo (R$)</th>
                                                    <th className="px-5 py-4 md:w-[130px]">Vínculo</th>
                                                    <th className="px-5 py-4 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="block md:table-row-group divide-y md:divide-y divide-slate-100 dark:divide-zinc-800 mt-4 px-4 md:px-0 md:mt-0">
                                                {/* Opening balance row */}
                                                <tr className="flex flex-col md:table-row bg-slate-50 dark:bg-zinc-800/80 border md:border-0 border-slate-200 dark:border-zinc-700 rounded-2xl md:rounded-none mb-4 md:mb-0 p-4 md:p-0">
                                                     <td colSpan={7} className="block md:table-cell md:px-5 md:py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-0 uppercase">
                                                         Saldo Anterior ({parseDateSafe(startDate).toLocaleDateString('pt-BR')})
                                                     </td>
                                                     <td className="block md:table-cell md:px-5 md:py-3 text-[16px] md:text-[11px] font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-900 md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none border md:border-0 border-slate-200 dark:border-zinc-800 md:text-right">
                                                         R$ {openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                     </td>
                                                     <td colSpan={2} className="hidden md:table-cell"></td>
                                                 </tr>

                                                {paginatedRows.length > 0 ? paginatedRows.map(({ t, delta, balance, match, isSplit }) => {
                                                    let displayDesc = t.description;
                                                    let displayCat = t.systemCategory || '';
                                                    let displayEnt = t.systemEntityName || '';

                                                    if (match) {
                                                        if (match.type === 'EXPENSE') {
                                                            const exp = expenses.find(e => e.id === match.id);
                                                            if (exp) {
                                                                displayDesc = exp.description;
                                                                displayCat = exp.category;
                                                                displayEnt = suppliers.find(s => s.id === exp.supplierId)?.name ||
                                                                    providers.find(p => p.id === exp.providerId)?.name ||
                                                                    employees.find(emp => emp.id === exp.employeeId)?.name || '';
                                                            } else {
                                                                // Handle derived transactions (Commissions, etc)
                                                                const tx = transactions.find(tr => tr.id === match.id);
                                                                if (tx) {
                                                                    displayDesc = tx.description;
                                                                    displayCat = tx.category;
                                                                    displayEnt = tx.customerOrProviderName || tx.providerName || '';
                                                                }
                                                            }
                                                        } else if (match.type === 'SALE') {
                                                            const sale = sales.find(s => s.id === match.id);
                                                            if (sale) {
                                                                displayDesc = `Venda #${sale.id.slice(0, 5)}`;
                                                                displayCat = 'Venda';
                                                                displayEnt = customers.find(c => c.id === sale.customerId)?.name || '';
                                                            }
                                                        } else if (match.type === 'APPOINTMENT') {
                                                            const app = appointments.find(a => a.id === match.id);
                                                            if (app) {
                                                                displayDesc = `Agendamento: ${app.combinedServiceNames || 'Serviço'}`;
                                                                displayCat = 'Serviço';
                                                                displayEnt = customers.find(c => c.id === app.customerId)?.name || '';
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <tr key={`${t.id}-${match?.id || 'main'}`} className={`flex flex-col md:table-row md:hover:bg-slate-50/60 md:dark:hover:bg-zinc-800/30 transition-colors group text-sm block bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-3xl mb-4 p-5 md:border-b md:border-x-0 md:border-t-0 md:rounded-none md:mb-0 md:p-0 relative md:static shadow-sm md:shadow-none ${isSplit ? 'bg-slate-50/30 dark:bg-zinc-900/20' : ''}`}>
                                                            <td className="block md:table-cell md:px-5 md:py-3.5 text-xs font-bold font-mono text-slate-500 whitespace-nowrap mb-2 md:mb-0">
                                                                {parseDateSafe(t.date).toLocaleDateString('pt-BR')}
                                                            </td>
                                                            <td className="block md:table-cell md:px-5 md:py-3.5 absolute right-5 top-5 md:static">
                                                                {(() => {
                                                                    const isReceita = t.type === 'RECEITA';
                                                                    const label = isReceita ? 'Receita' : 'Despesa';
                                                                    return (
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit border ${isReceita ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                                                {isReceita ? <ArrowUpCircle size={9} /> : <ArrowDownCircle size={9} />}
                                                                                {label}
                                                                            </div>
                                                                            {isSplit && (
                                                                                <span className="text-[8px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md w-fit">Desmembrado</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="block md:table-cell md:px-5 md:py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase max-w-full md:w-[200px] w-full mb-3 md:mb-0 border-b border-slate-50 dark:border-zinc-800 md:border-0 pb-3 md:pb-0">
                                                                <span className="md:hidden text-[9px] font-black uppercase text-slate-400 block mb-1">Categoria</span>
                                                                {isSplit ? (
                                                                    <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded text-[10px] font-bold block w-fit">{displayCat}</span>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <select
                                                                            value={t.systemCategory || ''}
                                                                            onChange={async (e) => {
                                                                                const newCategory = e.target.value;
                                                                                try {
                                                                                    // 1. Update bank transaction
                                                                                    const { error } = await supabase
                                                                                        .from('bank_transactions')
                                                                                        .update({ system_category: newCategory })
                                                                                        .eq('id', t.id);
                                                                                    if (error) throw error;

                                                                                    // 2. Sync with linked expense if exists
                                                                                    if (match && match.type === 'EXPENSE') {
                                                                                        await supabase
                                                                                            .from('expenses')
                                                                                            .update({ category: newCategory })
                                                                                            .eq('id', match.id);
                                                                                        // Local state update
                                                                                        setExpenses((prev: Expense[]) => prev.map(exp => exp.id === match.id ? { ...exp, category: newCategory } : exp));
                                                                                    }

                                                                                    setBankTransactions((prev: BankTransaction[]) => prev.map(tx => tx.id === t.id ? { ...tx, systemCategory: newCategory } : tx));
                                                                                } catch (err) {
                                                                                    console.error('Failed to update category', err);
                                                                                    alert('Erro ao atualizar categoria: ' + (err as any).message);
                                                                                }
                                                                            }}
                                                                            className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:border-indigo-500 appearance-none pr-6"
                                                                        >
                                                                            <option value="">Selecione...</option>
                                                                            {t.type === 'RECEITA' ? (
                                                                                expenseCategories.filter(c => c.dreClass === 'REVENUE').map(c => (
                                                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                                                ))
                                                                            ) : (
                                                                                expenseCategories.filter(c => c.dreClass !== 'REVENUE').map(c => (
                                                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                                                ))
                                                                            )}
                                                                        </select>
                                                                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="block md:table-cell md:px-5 md:py-3.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 max-w-full md:w-[250px] w-full mb-3 md:mb-0 border-b border-slate-50 dark:border-zinc-800 md:border-0 pb-3 md:pb-0">
                                                                <span className="md:hidden text-[9px] font-black uppercase text-slate-400 block mb-1">Favorecido / Cliente</span>
                                                                {isSplit ? (
                                                                    <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded text-[10px] font-bold block w-fit">{displayEnt || '-'}</span>
                                                                ) : (
                                                                    <div className="relative">
                                                                            <select
                                                                                value={t.systemEntityName || ''}
                                                                                onChange={async (e) => {
                                                                                    const newName = e.target.value;

                                                                                    try {
                                                                                        // 1. Update bank transaction (storing name or null)
                                                                                        await supabase.from('bank_transactions').update({ system_entity_name: newName || null }).eq('id', t.id);
                                                                                        setBankTransactions((prev: BankTransaction[]) => prev.map(tx => tx.id === t.id ? { ...tx, systemEntityName: newName || undefined } : tx));

                                                                                        if (!newName) {
                                                                                            // Case: UN-LINK / CLEAR Beneficiary
                                                                                            if (match && match.type === 'EXPENSE' && window.confirm("Deseja remover o favorecido deste lançamento no Contas a Pagar?")) {
                                                                                                await supabase.from('expenses').update({ provider_id: null, employee_id: null, supplier_id: null }).eq('id', match.id);
                                                                                                setExpenses((prev: Expense[]) => prev.map(exp => exp.id === match.id ? { ...exp, providerId: undefined, employeeId: undefined, supplierId: undefined } : exp));
                                                                                            }
                                                                                            return;
                                                                                        }

                                                                                        const selectedEntity = combinedSuppliers.find(s => s.name === newName) ||
                                                                                            customers.find(c => c.name === newName);
                                                                                        if (!selectedEntity) return;

                                                                                        const combinedId = selectedEntity.id;
                                                                                        const isProfessional = (selectedEntity as any).isProvider || false;
                                                                                        const isEmployee = (selectedEntity as any).isEmployee || false;
                                                                                        const realId = (isProfessional || isEmployee) ? combinedId.split('_')[1] : combinedId;

                                                                                        // 2. Logic for Syncing / Linking / Creating
                                                                                        let currentMatch = match;

                                                                                        if (!currentMatch) {
                                                                                            // Search for candidates (already has identification logic)
                                                                                            const candidate = expenses.find(exp =>
                                                                                                Math.abs(exp.amount - t.amount) < 0.01 &&
                                                                                                Math.abs(new Date(exp.date).getTime() - new Date(t.date).getTime()) <= 3 * 24 * 60 * 60 * 1000 &&
                                                                                                !bankTransactions.some(bt => bt.systemMatches?.some(m => m.id === exp.id))
                                                                                            );

                                                                                        if (candidate && window.confirm(`Encontramos um lançamento de R$ ${candidate.amount.toFixed(2)} (${candidate.description}) no sistema. Deseja vincular a este registro?`)) {
                                                                                            const newMatches = [{ id: candidate.id, type: 'EXPENSE' as const, amount: candidate.amount }];
                                                                                            await supabase.from('bank_transactions').update({ system_matches: newMatches }).eq('id', t.id);
                                                                                            setBankTransactions((prev: BankTransaction[]) => prev.map(tx => tx.id === t.id ? { ...tx, systemMatches: newMatches } : tx));
                                                                                            currentMatch = { id: candidate.id, type: 'EXPENSE', amount: candidate.amount };
                                                                                        } else if (window.confirm(`Deseja criar um novo lançamento de Contas a Pagar para ${newName}?`)) {
                                                                                            const isProfitDist = (newName?.toLowerCase().includes('lucro') || newName?.toLowerCase().includes('distribuição') || t.description?.toLowerCase().includes('lucro') || t.description?.toLowerCase().includes('distribuição'));
                                                                                            const { data: newExp, error: expErr } = await supabase.from('expenses').insert({
                                                                                                description: newName, // Use the entity name for a cleaner description
                                                                                                amount: t.amount,
                                                                                                date: t.date,
                                                                                                category: isProfitDist ? 'Distribuição de Lucros' : (t.systemCategory || 'Despesas Diversas'),
                                                                                                provider_id: isProfessional ? realId : null,
                                                                                                employee_id: isEmployee ? realId : null,
                                                                                                supplier_id: (!isProfessional && !isEmployee) ? realId : null,
                                                                                                status: 'Pago',
                                                                                                payment_method: 'Transferência',
                                                                                                is_reconciled: true,
                                                                                                dre_class: 'EXPENSE_ADM'
                                                                                            }).select().single();


                                                                                                if (expErr) throw expErr;

                                                                                                const newMatches = [{ id: newExp.id, type: 'EXPENSE' as const, amount: newExp.amount }];
                                                                                                setExpenses((prev: Expense[]) => [...prev, {
                                                                                                    id: newExp.id, description: newExp.description, amount: newExp.amount, date: newExp.date,
                                                                                                    category: newExp.category, status: newExp.status, isReconciled: true,
                                                                                                    providerId: newExp.provider_id || undefined, employeeId: newExp.employee_id || undefined, supplierId: newExp.supplier_id || undefined,
                                                                                                    paymentMethod: newExp.payment_method, dreClass: newExp.dre_class
                                                                                                }]);
                                                                                                setBankTransactions((prev: BankTransaction[]) => prev.map(tx => tx.id === t.id ? { ...tx, systemMatches: newMatches } : tx));
                                                                                             alert('Vinculado a uma despesa do Contas a Pagar com sucesso!');
                                                                                             alert('Vinculado a uma despesa do Contas a Pagar com sucesso!');
                                                                                                currentMatch = { id: newExp.id, type: 'EXPENSE', amount: newExp.amount };
                                                                                            }
                                                                                        }

                                                                                        if (currentMatch && currentMatch.type === 'EXPENSE') {
                                                                                            const updatePayload = {
                                                                                                description: newName, // Update description to cleaner name
                                                                                                date: t.date,         // Sync date with bank transaction
                                                                                                ...(isProfessional ? { provider_id: realId, employee_id: null, supplier_id: null } :
                                                                                                    isEmployee ? { employee_id: realId, provider_id: null, supplier_id: null } :
                                                                                                        { supplier_id: realId, provider_id: null, employee_id: null })
                                                                                            };

                                                                                            await supabase.from('expenses').update(updatePayload).eq('id', currentMatch.id);
                                                                                            setExpenses((prev: Expense[]) => prev.map(exp => exp.id === currentMatch!.id ? {
                                                                                                ...exp,
                                                                                                description: newName,
                                                                                                date: t.date, // Sync date in state
                                                                                                providerId: isProfessional ? realId : undefined,
                                                                                                employeeId: isEmployee ? realId : undefined,
                                                                                                supplierId: (!isProfessional && !isEmployee) ? realId : undefined
                                                                                            } : exp));
                                                                                        }
                                                                                    } catch (err) {
                                                                                        console.error('Failed to update provider/link', err);
                                                                                        alert('Erro ao processar: ' + (err as any).message);
                                                                                    }
                                                                                }}
                                                                                className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:border-indigo-500 appearance-none pr-6"
                                                                            >
                                                                                <option value="">Selecione...</option>
                                                                                {t.type === 'DESPESA'
                                                                                    ? (
                                                                                        <>
                                                                                            <optgroup label="Fornecedores" className="bg-slate-50 dark:bg-zinc-800 font-black">
                                                                                                {combinedSuppliers.filter(s => !(s as any).isProvider && !(s as any).isEmployee).map(s => (
                                                                                                    <option key={s.id} value={s.name}>{s.name?.toUpperCase()}</option>
                                                                                                ))}
                                                                                            </optgroup>
                                                                                            <optgroup label="Profissionais" className="bg-slate-50 dark:bg-zinc-800 font-black">
                                                                                                {combinedSuppliers.filter(s => (s as any).isProvider).map(s => (
                                                                                                    <option key={s.id} value={s.name}>{s.name?.toUpperCase()}</option>
                                                                                                ))}
                                                                                            </optgroup>
                                                                                            <optgroup label="Funcionários" className="bg-slate-50 dark:bg-zinc-800 font-black">
                                                                                                {combinedSuppliers.filter(s => (s as any).isEmployee).map(s => (
                                                                                                    <option key={s.id} value={s.name}>{s.name?.toUpperCase()}</option>
                                                                                                ))}
                                                                                            </optgroup>
                                                                                        </>
                                                                                    )
                                                                                    : customers.map(c => <option key={c.id} value={c.name}>{c.name?.toUpperCase()}</option>)
                                                                                }
                                                                            </select>
                                                                            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pr-0.5">
                                                                                <ChevronDown size={10} className="text-slate-400 pointer-events-none" />
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        if (t.type === 'DESPESA') {
                                                                                            setReconcilingTx(t);
                                                                                            handleOpenSupplierModal();
                                                                                        } else {
                                                                                            const name = window.prompt('Nome do Novo Cliente:');
                                                                                            if (name) {
                                                                                                const { data, error } = await supabase.from('customers').insert([{ name }]).select();
                                                                                                if (!error && data) {
                                                                                                    setCustomers(prev => [...prev, data[0]]);
                                                                                                    handleLinkNewPayeeToTx(t, data[0].name, data[0].id, 'CUSTOMER');
                                                                                                }
                                                                                             alert('Favorecido atualizado com sucesso!');
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 text-indigo-500 rounded transition-colors"
                                                                                    title="Criar Novo"
                                                                                >
                                                                                    <Plus size={10} />
                                                                                </button>
                                                                            </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="block md:table-cell md:px-5 md:py-3.5 mb-3 md:mb-0 border-b border-slate-50 dark:border-zinc-800 md:border-0 pb-3 md:pb-0">
                                                                <span className="md:hidden text-[9px] font-black uppercase text-slate-400 block mb-1">Descrição / Documento</span>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <p className="font-bold text-[11px] text-slate-900 dark:text-white uppercase leading-tight max-w-full md:max-w-[450px] line-clamp-2 md:truncate">{displayDesc}</p>
                                                                    {isSplit && (
                                                                        <p className="text-[9px] text-slate-400 font-mono italic truncate">Ref. Banco: {t.description}</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="flex items-center justify-between md:table-cell md:px-5 md:py-3.5 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap mb-2 md:mb-0 border-b border-slate-50 dark:border-zinc-800 md:border-0 pb-2 md:pb-0">
                                                                <span className="md:hidden text-[9px] font-black uppercase text-slate-400">Pagamento</span>
                                                                <span>{t.systemPaymentMethod || '-'}</span>
                                                            </td>
                                                            <td className={`flex items-center justify-between md:table-cell md:px-5 md:py-3.5 md:text-right font-black text-[14px] md:text-[12px] whitespace-nowrap mb-2 md:mb-0 border-b border-slate-50 dark:border-zinc-800 md:border-0 pb-2 md:pb-0 md:w-[130px] ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                <span className="md:hidden text-[9px] font-black uppercase text-slate-400">Valor Atual</span>
                                                                <span>{delta >= 0 ? '+' : ''} R$ {Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </td>
                                                            <td className="flex items-center justify-between md:table-cell md:px-5 md:py-3.5 md:text-right font-black text-[13px] md:text-[12px] text-slate-700 dark:text-slate-200 whitespace-nowrap mb-4 md:mb-0 border-b border-slate-50 dark:border-zinc-800 md:border-0 pb-3 md:pb-0 md:w-[130px]">
                                                                <span className="md:hidden text-[9px] font-black uppercase text-slate-400">Saldo Resultante</span>
                                                                <span className="bg-slate-50 dark:bg-zinc-800 md:bg-transparent px-2 md:px-0 py-1 md:py-0 rounded font-mono">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </td>
                                                            <td className="flex items-center justify-between md:table-cell md:px-5 md:py-3.5">
                                                                <span className="md:hidden text-[9px] font-black uppercase text-slate-400">Gerenciar Vínculo</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setLinkingBankTx(t);
                                                                            setIsManualLinkModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                                        title="Gerenciar Vínculo"
                                                                    >
                                                                        <Link2 size={14} />
                                                                    </button>
                                                                    {t.systemMatches && t.systemMatches.length > 0 && !isSplit && (
                                                                        <div className="flex -space-x-1.5 overflow-hidden">
                                                                            <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-black border-2 border-white dark:border-zinc-900" title={`${t.systemMatches.length} itens vinculados`}>
                                                                                {t.systemMatches.length}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="hidden md:table-cell"></td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr className="block md:table-row p-4 md:p-0">
                                                        <td colSpan={10} className="block md:table-cell px-6 py-20 text-center border-t border-slate-100 dark:border-zinc-800 md:border-0">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-full text-slate-300"><CircleCheck size={32} /></div>
                                                                <div>
                                                                    <p className="text-slate-500 font-black text-xs uppercase tracking-widest">
                                                                        {conciliadoFilter ? 'Nenhum resultado para esta busca' : 'Nenhum item conciliado'}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                                                                        {conciliadoFilter ? 'Tente outros termos de busca.' : 'Use a Conciliação Bancária para validar seus lançamentos pelo extrato.'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {
                                        totalPages > 1 && (
                                            <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50/50 dark:bg-zinc-800/30 border-t border-slate-200 dark:border-zinc-700 gap-4 md:gap-0">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center md:text-left">
                                                    Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, rowsWithBalance.length)} de {rowsWithBalance.length}
                                                </span>
                                                <div className="flex items-center gap-1 justify-center w-full md:w-auto md:justify-end">
                                                    <button
                                                        onClick={() => setConciliadoPage((prev: number) => Math.max(1, prev - 1))}
                                                        disabled={conciliadoPage === 1}
                                                        className="p-1 rounded bg-slate-200 dark:bg-zinc-700 text-slate-500 disabled:opacity-50"
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>

                                                    <div className="flex gap-1 overflow-x-auto max-w-[200px] scrollbar-hide px-2">
                                                        {Array.from({ length: totalPages }).map((_, i) => {
                                                            const p = i + 1;
                                                            // show first, last, current and +/- 1
                                                            if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
                                                                return (
                                                                    <button
                                                                        key={p}
                                                                        onClick={() => setConciliadoPage(p)}
                                                                        className={`min-w-[24px] h-6 flex items-center justify-center rounded text-[10px] font-black ${currentPage === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'}`}
                                                                    >
                                                                        {p}
                                                                    </button>
                                                                );
                                                            } else if (p === 2 && currentPage > 3) {
                                                                return <span key={p} className="text-slate-400">...</span>;
                                                            } else if (p === totalPages - 1 && currentPage < totalPages - 2) {
                                                                return <span key={p} className="text-slate-400">...</span>;
                                                            }
                                                            return null;
                                                        })}
                                                    </div>

                                                    <button
                                                        onClick={() => setConciliadoPage((prev: number) => Math.min(totalPages, prev + 1))}
                                                        disabled={conciliadoPage === totalPages}
                                                        className="p-1 rounded bg-slate-200 dark:bg-zinc-700 text-slate-500 disabled:opacity-50"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    }
                                </div>
                            );
                        })()}
                        {/* ===== CAIXA DIÃRIO ===== */}
                        {accountsSubTab === 'DAILY' && <DailyCloseView transactions={transactions} physicalCash={physicalCash} setPhysicalCash={setPhysicalCash} closingObservation={closingObservation} setClosingObservation={setClosingObservation} closerName={closerName} setCloserName={setCloserName} date={dateRef} appointments={appointments} services={services} onPrint={handlePrintDailyClose} onCloseRegister={() => { }} />}



                        {/* ======= CONTAS A PAGAR ======= */}
                        {accountsSubTab === 'PAYABLES' && (
                            <>
                                {/* Indicadores Contas a Pagar */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                                    {[
                                        { label: 'Total no Período', value: filteredPayables.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), icon: FileText, color: 'indigo' },
                                        { label: 'Total Pago', value: filteredPayables.filter(p => (p.status || '').toUpperCase() === 'PAGO').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), icon: CircleCheck, color: 'emerald' },
                                        { label: 'Pendente', value: filteredPayables.filter(p => (p.status || '').toUpperCase() === 'PENDENTE' || (p.status || '').toUpperCase() === 'PENDING').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), icon: Clock, color: 'amber' },
                                        { label: 'Atrasado', value: filteredPayables.filter(p => ((p.status || '').toUpperCase() === 'PENDENTE' || (p.status || '').toUpperCase() === 'PENDING') && p.date && new Date(p.date) < new Date(new Date().setHours(0, 0, 0, 0))).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), icon: AlertCircle, color: 'rose' },
                                    ].map((card, idx) => (
                                        <div key={idx} className="bg-white dark:bg-zinc-900 p-3 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm group hover:shadow-md transition-all flex flex-col justify-between">
                                            <div className="flex items-center gap-2 mb-2 md:mb-4">
                                                <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400 group-hover:scale-110 transition-transform`}>
                                                    <card.icon size={16} className="md:w-5 md:h-5" />
                                                </div>
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1 leading-tight">{card.label}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-sm md:text-xl font-black text-slate-950 dark:text-white mt-1 md:mt-0">R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mt-6">
                                    <div className="p-5 border-b flex flex-col gap-4 bg-slate-50/50 dark:bg-zinc-800/50">
                                        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                                            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 whitespace-nowrap"><ArrowDownCircle size={16} /> Contas a Pagar</h3>

                                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar descrição..."
                                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 transition-all placeholder:text-[9px]"
                                                    value={payablesSearch}
                                                    onChange={e => setPayablesSearch(e.target.value)}
                                                />
                                            </div>

                                            <div className="relative flex-1 min-w-[180px] max-w-xs">
                                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <select
                                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                                    value={payablesSupplierFilter}
                                                    onChange={e => setPayablesSupplierFilter(e.target.value)}
                                                >
                                                    <option value="ALL">TODOS FAVORECIDOS</option>
                                                    <optgroup label="Fornecedores">
                                                        {combinedSuppliers.filter(s => !(s as any).isProvider && !(s as any).isEmployee).map(s => (
                                                            <option key={s.id} value={s.id}>{s.name?.toUpperCase()}</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Profissionais">
                                                        {combinedSuppliers.filter(s => (s as any).isProvider).map(s => (
                                                            <option key={s.id} value={s.id}>{s.name?.toUpperCase()}</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Funcionários">
                                                        {combinedSuppliers.filter(s => (s as any).isEmployee).map(s => (
                                                            <option key={s.id} value={s.id}>{s.name?.toUpperCase()}</option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                                            </div>

                                            <div className="flex bg-white dark:bg-zinc-800 p-1 rounded-xl border-2 border-slate-200 dark:border-zinc-700 sm:w-auto justify-center">
                                                {(['ALL', 'Pago', 'Pendente', 'Atrasado'] as const).map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setPayablesStatusFilter(s)}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${payablesStatusFilter === s ? 'bg-slate-900 dark:bg-zinc-700 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                                    >
                                                        {s === 'ALL' ? 'Todos' : s}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex bg-white dark:bg-zinc-800 p-1 rounded-xl border-2 border-slate-200 dark:border-zinc-700 sm:w-auto justify-center">
                                                <span className="self-center px-3 text-[8px] font-black uppercase text-slate-400 border-r border-slate-200 dark:border-zinc-700 mr-1">Desmembrado</span>
                                                {[
                                                    { id: 'ALL', label: 'Todos' },
                                                    { id: 'YES', label: 'Sim' },
                                                    { id: 'NO', label: 'Não' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => setPayablesSplitFilter(opt.id as any)}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${payablesSplitFilter === opt.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <button onClick={handlePrintPayablesReport} className="flex text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl items-center gap-1 shadow-sm active:scale-95 transition-all w-fit"><Printer size={12} /> Relatório</button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
                                        <div className="grid grid-cols-1 gap-3 md:hidden p-4 border-t border-slate-100 dark:border-zinc-800">
                                            {filteredPayables.length > 0 ? filteredPayables.map(exp => {
                                                const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
                                                const rawName = exp.customerOrProviderName || exp.providerName || '';
                                                const supplierName = (isUUID(rawName) || !rawName)
                                                    ? (suppliers.find(s => s.id === (exp as any).supplierId)?.name || 
                                                       providers.find(p => p.id === (exp as any).providerId)?.name || 
                                                       employees.find(e => e.id === (exp as any).employeeId)?.name || 
                                                       '')
                                                    : rawName;
                                                const normalizedStatus = (exp.status || '').toUpperCase();
                                                const isOverdue = (normalizedStatus === 'PENDENTE' || normalizedStatus === 'PENDING') && new Date(exp.date) < new Date(new Date().setHours(0, 0, 0, 0));
                                                
                                                return (
                                                    <div key={exp.id} className={`p-4 rounded-2xl border-2 flex flex-col gap-3 transition-colors shadow-sm ${selectedExpenseIds.includes(exp.id) ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'}`}>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex gap-3">
                                                                <input type="checkbox" className="mt-1 flex-shrink-0 w-5 h-5 rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer" checked={selectedExpenseIds.includes(exp.id)} onChange={() => toggleSelectExpense(exp.id)} />
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                            {exp.date ? new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                                                        </span>
                                                                        {isOverdue && <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded-full uppercase">Atrasado</span>}
                                                                    </div>
                                                                    <h4 className="font-black text-xs text-slate-900 dark:text-white line-clamp-2 leading-tight">{exp.description}</h4>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <p className="text-[10px] text-slate-500 font-bold italic line-clamp-1">{supplierName || '-'}</p>
                                                                        {exp.invoiceNumber && <span className="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-zinc-700 uppercase">NF: {exp.invoiceNumber}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => toggleExpenseStatus(exp.id)} className={`shrink-0 text-[8px] font-black px-2 py-1 flex-shrink-0 rounded-full uppercase transition-colors ${exp.status === 'Pago' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800'}`}>
                                                                {exp.status}
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800 mt-1">
                                                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">{exp.category}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-black text-sm text-rose-600 dark:text-rose-400">R$ {exp.amount.toFixed(2)}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => handleOpenModal(exp as unknown as Expense)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-zinc-800 rounded-lg"><Edit2 size={12} /></button>
                                                                    <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-zinc-800 rounded-lg"><Trash2 size={12} /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="py-12 mt-2 mx-1 text-center text-slate-400 text-xs font-bold uppercase border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl bg-slate-50/50 dark:bg-zinc-800/10">
                                                    Nenhuma despesa no período
                                                </div>
                                            )}
                                        </div>

                                        <table className="hidden md:table w-full text-left text-sm min-w-[800px]">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                                    <th className="px-4 py-4 w-10">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                                                            checked={filteredPayables.length > 0 && filteredPayables.every(exp => selectedExpenseIds.includes(exp.id))}
                                                            onChange={() => {
                                                                const visibleExpenses = filteredPayables;
                                                                if (visibleExpenses.length === 0) return;
                                                                const visibleIds = visibleExpenses.map(e => e.id);
                                                                const allAlreadySelected = visibleIds.every(id => selectedExpenseIds.includes(id));
                                                                if (allAlreadySelected) {
                                                                    setSelectedExpenseIds(prev => prev.filter(id => !visibleIds.includes(id)));
                                                                } else {
                                                                    setSelectedExpenseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                                                                }
                                                            }}
                                                        />
                                                    </th>
                                                    <th className="px-6 py-4">Data</th>
                                                    <th className="px-6 py-4">Descrição</th>
                                                    <th className="px-6 py-4">Nº Nota</th>
                                                    <th className="px-6 py-4 min-w-[150px]">Favorecido</th>
                                                    <th className="px-6 py-4 min-w-[150px]">Categoria</th>
                                                    <th className="px-6 py-4 text-center">Status</th>
                                                    <th className="px-6 py-4 text-right">Valor</th>
                                                    <th className="px-6 py-4 text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                {filteredPayables.length > 0 ? filteredPayables.map(exp => {
                                                    const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
                                                    const rawName = exp.customerOrProviderName || exp.providerName || '';
                                                    const supplierName = (isUUID(rawName) || !rawName)
                                                        ? (suppliers.find(s => s.id === (exp as any).supplierId)?.name || 
                                                           providers.find(p => p.id === (exp as any).providerId)?.name || 
                                                           employees.find(e => e.id === (exp as any).employeeId)?.name || 
                                                           '')
                                                        : rawName;
                                                    const normalizedStatus = (exp.status || '').toUpperCase();
                                                    const isOverdue = (normalizedStatus === 'PENDENTE' || normalizedStatus === 'PENDING') && new Date(exp.date) < new Date(new Date().setHours(0, 0, 0, 0));
                                                    return (
                                                        <tr key={exp.id} className={`group hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors ${selectedExpenseIds.includes(exp.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                                            <td className="px-4 py-4">
                                                                <input type="checkbox" className="w-5 h-5 rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer" checked={selectedExpenseIds.includes(exp.id)} onChange={() => toggleSelectExpense(exp.id)} />
                                                            </td>
                                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                                                {exp.date ? parseDateSafe(exp.date).toLocaleDateString('pt-BR') : '-'}
                                                                {isOverdue && <span className="ml-1 text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded-full uppercase">Atrasado</span>}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-[11px] text-slate-900 dark:text-white max-w-[200px] truncate">{exp.description}</td>
                                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-300">{exp.invoiceNumber || '-'}</td>
                                                            <td className="px-6 py-4 text-[11px] text-slate-500 truncate max-w-[180px]">{supplierName || '-'}</td>
                                                            <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase truncate max-w-[150px]">{exp.category}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button onClick={() => toggleExpenseStatus(exp.id)} className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase transition-colors ${exp.status === 'Pago' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-100'}`}>
                                                                    {exp.status}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-rose-700 dark:text-rose-400">R$ {exp.amount.toFixed(2)}</td>
                                                            <td className="px-6 py-4 flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleOpenModal(exp as unknown as Expense)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                                <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-sm font-bold uppercase">Nenhuma despesa no período</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ===== AJUSTES (RECONCILIAÇÃO AGENDA VS FECHAMENTO) ===== */}
                        {accountsSubTab === 'AUDIT' && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Agenda (Bruto)</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                                            {formatCurrency(auditReportData.reduce((acc, curr) => acc + curr.agenda, 0))}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Fechamento (Realizado)</p>
                                        <p className="text-2xl font-black text-emerald-600">
                                            {formatCurrency(auditReportData.reduce((acc, curr) => acc + curr.closure, 0))}
                                        </p>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 shadow-sm">
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Diferença (Não Concluído)</p>
                                        <p className="text-2xl font-black text-rose-600">
                                            {formatCurrency(auditReportData.reduce((acc, curr) => acc + curr.agenda, 0) - auditReportData.reduce((acc, curr) => acc + curr.closure, 0))}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-zinc-800/50">
                                        <div>
                                            <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2">
                                                <ShieldCheck size={20} className="text-indigo-500" /> Auditoria de Atendimentos
                                            </h3>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Comparativo entre Agenda e Produção Realizada</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleDownloadAuditExcel} className="p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase">
                                                <FileText size={16} /> Excel
                                            </button>
                                            <button onClick={handlePrintAuditReport} className="p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-slate-400 hover:text-indigo-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase">
                                                <Printer size={16} /> PDF
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-zinc-800/30 border-b dark:border-zinc-800">
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Profissional</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Agenda (All)</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Fechamento (Concl.)</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Diferença</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                {auditReportData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-20 text-center">
                                                            <div className="flex flex-col items-center gap-3 opacity-20">
                                                                <Target size={48} />
                                                                <p className="font-black uppercase text-xs tracking-widest">Nenhum atendimento no período</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : auditReportData.map((e, idx) => {
                                                    const rowId = `${e.date}-${e.provider}`;
                                                    const isExpanded = expandedAuditRows.includes(rowId);
                                                    const diffVal = e.agenda - e.closure;

                                                    return (
                                                        <React.Fragment key={idx}>
                                                            <tr 
                                                                className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/30' : ''}`}
                                                                onClick={() => {
                                                                    setExpandedAuditRows(prev => 
                                                                        prev.includes(rowId) ? prev.filter(r => r !== rowId) : [...prev, rowId]
                                                                    );
                                                                }}
                                                            >
                                                                <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">
                                                                    <div className="flex items-center gap-2">
                                                                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                        {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-5">
                                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{e.provider}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{e.count} serviços / {e.closedCount} concluídos</p>
                                                                </td>
                                                                <td className="px-8 py-5 text-right text-xs font-bold text-slate-600 dark:text-slate-400">
                                                                    {formatCurrency(e.agenda)}
                                                                </td>
                                                                <td className="px-8 py-5 text-right text-xs font-black text-emerald-600">
                                                                    {formatCurrency(e.closure)}
                                                                </td>
                                                                <td className="px-8 py-5 text-right">
                                                                    <span className={`text-xs font-black ${diffVal > 0.01 ? 'text-rose-600' : 'text-slate-300'}`}>
                                                                        {formatCurrency(diffVal)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={5} className="px-8 pb-6 bg-slate-50/30 dark:bg-zinc-900/10">
                                                                        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                                                                            <table className="w-full">
                                                                                <thead className="bg-slate-50 dark:bg-zinc-800/50">
                                                                                    <tr>
                                                                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-left">Cliente</th>
                                                                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-left">Serviço</th>
                                                                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Agenda</th>
                                                                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Realizado</th>
                                                                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-center whitespace-nowrap">Status</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                                                    {e.items.map((item: any, i: number) => (
                                                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                                                            <td className="px-4 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">{item.client}</td>
                                                                                            <td className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase">{item.service}</td>
                                                                                            <td className="px-4 py-2.5 text-[10px] font-black text-slate-900 dark:text-white text-right">{formatCurrency(item.agenda)}</td>
                                                                                            <td className="px-4 py-2.5 text-[10px] font-black text-emerald-600 text-right">{formatCurrency(item.closure)}</td>
                                                                                            <td className="px-4 py-2.5 text-center">
                                                                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                                                                    item.status?.toUpperCase() === 'CONCLUÃDO' ? 'bg-emerald-100 text-emerald-700' :
                                                                                                    item.status?.toUpperCase() === 'CANCELADO' ? 'bg-rose-100 text-rose-700' :
                                                                                                    'bg-amber-100 text-amber-700'
                                                                                                }`}>
                                                                                                    {item.status}
                                                                                                </span>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===== FORNECEDORES ===== */}
                        {accountsSubTab === 'SUPPLIERS' && (() => {
                            const list = combinedSuppliers.filter(sup => {
                                if (supplierSubTab === 'PROFISSIONAIS') return sup.isProvider;
                                if (supplierSubTab === 'RH') return (sup as any).isEmployee;
                                return !sup.isProvider && !(sup as any).isEmployee;
                            });
                            return (
                                <div className="space-y-6">
                                    <div className="flex p-0.5 md:p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide w-full sm:w-auto flex-nowrap">
                                        {[
                                            { id: 'PROFISSIONAIS', label: 'Profissionais', icon: Scissors },
                                            { id: 'RH', label: 'Recursos Humanos', icon: Users },
                                            { id: 'FORNECEDORES', label: 'Fornecedores', icon: Truck }
                                        ].map(st => (
                                            <button
                                                key={st.id}
                                                onClick={() => setSupplierSubTab(st.id as any)}
                                                className={`px-3 md:px-6 py-2 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 md:gap-2 ${supplierSubTab === st.id ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                            >
                                                <st.icon size={12} className="md:size-[14px]" />
                                                {st.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                                        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                                {supplierSubTab === 'PROFISSIONAIS' ? <Scissors size={16} /> :
                                                    supplierSubTab === 'RH' ? <Users size={16} /> : <Truck size={16} />}
                                                {supplierSubTab === 'PROFISSIONAIS' ? 'Profissionais' :
                                                    supplierSubTab === 'RH' ? 'Recursos Humanos' : 'Fornecedores'}
                                            </h3>
                                            {!(supplierSubTab === 'PROFISSIONAIS' || supplierSubTab === 'RH') && (
                                                <button
                                                    onClick={() => {
                                                        setEditingSupplierId(null);
                                                        setSupplierForm({ name: '', document: '', phone: '', email: '', category: '' });
                                                        setIsSupplierModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 text-[10px] font-black uppercase rounded-xl hover:scale-95 transition-all flex items-center gap-2"
                                                >
                                                    <Plus size={14} /> Novo Fornecedor
                                                </button>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto scrollbar-hide">
                                            {/* Mobile Cards View */}
                                            <div className="grid grid-cols-1 md:hidden p-4 space-y-3">
                                                {list.length > 0 ? list.map(sup => (
                                                    <div key={sup.id} className="p-4 rounded-2xl border-2 border-slate-50 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-xs uppercase text-slate-900 dark:text-white">{sup.name || 'Sem Nome'}</span>
                                                                    {sup.isProvider ? (
                                                                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase rounded-md border border-indigo-100">Profissional</span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase rounded-md border border-slate-100">Fornecedor</span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                    {supplierSubTab === 'FORNECEDORES' ? (sup.category || '-') :
                                                                        supplierSubTab === 'RH' ? ((sup as any).role || '-') :
                                                                            ((sup as any).specialty || '-')}
                                                                </span>
                                                            </div>
                                                            {!sup.isProvider && (
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => handleOpenSupplierModal(sup as any)} className="p-2 bg-slate-50 dark:bg-zinc-800 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"><Edit2 size={14} /></button>
                                                                    <button onClick={() => handleDeleteSupplier(sup.id)} className="p-2 bg-slate-50 dark:bg-zinc-800 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"><Trash2 size={14} /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50 dark:border-zinc-800 mt-1">
                                                            <div>
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Documento</p>
                                                                <p className="text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300">{sup.document || '-'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contato</p>
                                                                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{sup.phone || '-'}</p>
                                                                <p className="text-[9px] text-slate-400 truncate">{sup.email || '-'}</p>
                                                            </div>
                                                        </div>
                                                        {sup.isProvider && (
                                                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-xl text-center">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase italic">Gerenciado em Profissionais</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )) : (
                                                    <div className="py-12 text-center opacity-30">
                                                        <Search size={40} className="mx-auto mb-2 text-slate-400" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum registro cadastrado</p>
                                                    </div>
                                                )}
                                            </div>

                                            <table className="hidden md:table w-full text-left text-sm min-w-[800px]">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                                        <th className="px-6 py-4">Nome</th>
                                                        {supplierSubTab === 'FORNECEDORES' && <th className="px-6 py-4">Categoria</th>}
                                                        {supplierSubTab === 'RH' && <th className="px-6 py-4">Cargo/Função</th>}
                                                        {supplierSubTab === 'PROFISSIONAIS' && <th className="px-6 py-4">Especialidade</th>}
                                                        <th className="px-6 py-4">Documento</th>
                                                        <th className="px-6 py-4">Contato</th>
                                                        <th className="px-6 py-4 text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                    {list.map(sup => (
                                                        <tr key={sup.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-xs uppercase">{sup.name || 'Sem Nome'}</span>
                                                                    {sup.isProvider ? (
                                                                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase rounded-md border border-indigo-100 dark:border-indigo-800">Profissional</span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase rounded-md border border-slate-100 dark:border-zinc-700">Fornecedor</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">
                                                                {supplierSubTab === 'FORNECEDORES' ? (sup.category || '-') :
                                                                    supplierSubTab === 'RH' ? ((sup as any).role || '-') :
                                                                        ((sup as any).specialty || '-')}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-bold font-mono">{sup.document || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{sup.phone || '-'}</span>
                                                                    <span className="text-[9px] text-slate-400">{sup.email || '-'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 flex items-center justify-center gap-2">
                                                                {!sup.isProvider ? (
                                                                    <>
                                                                        <button onClick={() => handleOpenSupplierModal(sup as any)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                                        <button onClick={() => handleDeleteSupplier(sup.id)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Gerenciado em Profissionais</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {list.length === 0 && (
                                                        <tr><td colSpan={7} className="py-20 text-center text-slate-400 text-xs font-bold uppercase">Nenhum registro cadastrado</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
                {activeTab === 'CHARTS' && (
                    <div className="space-y-6">
                        {/* CHARTS Sub-tab header */}
                        <div className="flex p-1 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-700 w-fit">
                            {[
                                { id: 'GENERAL', label: 'Dashboard Financeiro', icon: BarChart3 },
                                { id: 'PREDICTIVE', label: 'Estudos Preditivos / IA', icon: BrainCircuit }
                            ].map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => setChartsSubTab(st.id as any)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${chartsSubTab === st.id ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <st.icon size={14} />
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        {chartsSubTab === 'GENERAL' ? (
                            <FinanceCharts
                                transactions={transactions}
                                expenses={expenses}
                                startDate={startDate}
                                endDate={endDate}
                                timeView={timeView}
                                yearlyBillingData={Array.from({ length: 12 }, (_, i) => ({
                                    month: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
                                    currentYear: yearlyBillingData.currentYear[i]?.total || 0,
                                    previousYear: yearlyBillingData.previousYear[i]?.total || 0
                                }))}
                            />
                            ) : (
                                <div className="animate-in fade-in duration-500 pb-20">
                                    {(() => {
                                        const HISTORICAL_REVENUE = [
                                            { month: 0, label: 'Jan', pastValue: 203743.00 },
                                            { month: 1, label: 'Fev', pastValue: 223761.00 },
                                            { month: 2, label: 'Mar', pastValue: 191600.00 },
                                            { month: 3, label: 'Abr', pastValue: 208329.00 },
                                            { month: 4, label: 'Mai', pastValue: 222481.00 },
                                            { month: 5, label: 'Jun', pastValue: 213532.00 },
                                            { month: 6, label: 'Jul', pastValue: 243692.00 },
                                            { month: 7, label: 'Ago', pastValue: 265019.00 },
                                            { month: 8, label: 'Set', pastValue: 259375.00 },
                                            { month: 9, label: 'Out', pastValue: 297134.00 },
                                            { month: 10, label: 'Nov', pastValue: 280000.00 },
                                            { month: 11, label: 'Dez', pastValue: 350000.00 }
                                        ];

                                         // 1. REVENUE DATA AGGREGATION (ABSOLUTE SYNC WITH DRE)
                                         // We use the EXACT same data used to render the DRE table rows.
                                         const viewingDate = parseDateSafe(startDate);
                                         const currentYear = viewingDate.getFullYear();
                                         const currentMonthIndex = viewingDate.getMonth();
                                         
                                         const currentRealizedData = Array.from({ length: 12 }, (_, i) => {
                                             // If viewing the whole year, the DRE already has the perfect aggregation for each month
                                             if (timeView === 'year' && dreData?.monthlySnapshots && dreData.monthlySnapshots[i]) {
                                                 const snapshot = dreData.monthlySnapshots[i];
                                                 return { 
                                                     total: snapshot.grossRevenue,
                                                     services: snapshot.revenueServices + snapshot.revenueTips + snapshot.revenueAdjustments,
                                                     products: snapshot.revenueProducts
                                                 };
                                             }
                                             
                                             // Fallback for single month view: the active month matches DRE, others use fetched yearly data
                                             const selDate = parseDateSafe(startDate);
                                             let val = (yearlyBillingData?.currentYear && yearlyBillingData?.currentYear[i]) 
                                                 ? yearlyBillingData.currentYear[i].total 
                                                 : 0;
                                             
                                             if (i === selDate.getMonth()) {
                                                 val = dreData.grossRevenue;
                                             }
                                             
                                             return { total: val, services: 0, products: 0 };
                                         });

                                         // 2. BREAKDOWN FOR CURRENT MONTH MODAL (AI STRATEGIST)
                                         // We only perform this loop to populate the "Ver Detalhamento" breakdown, 
                                         // NOT to calculate the total which is already synced above.
                                         const serviceBreakdown: Record<string, { name: string, realized: number, forecast: number, count: number }> = {};
                                         
                                         // Current Month Appointments Breakdown
                                         appointments.forEach(a => {
                                             const dateObj = parseDateSafe(a.date);
                                             if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonthIndex && a.status?.toUpperCase() === 'CONCLUÍDO') {
                                                 const prod = calculateAppointmentProduction(a, services);
                                                 currentRealizedData[currentMonthIndex].services += prod;
                                                 
                                                 const tips = Number(a.tipAmount || 0) + (a.additionalServices || []).reduce((sum: number, s: any) => sum + Number(s.tipAmount || 0), 0);
                                                 currentRealizedData[currentMonthIndex].services += tips;

                                                 const mainSvc = services.find(s => s.id === a.serviceId)?.name || 'Serviço';
                                                 if (!serviceBreakdown[mainSvc]) serviceBreakdown[mainSvc] = { name: mainSvc, realized: 0, forecast: 0, count: 0 };
                                                 serviceBreakdown[mainSvc].realized += prod + tips;
                                                 serviceBreakdown[mainSvc].count++;
                                             }
                                         });

                                         // Current Month Sales Breakdown
                                         sales.forEach(s => {
                                             const dateObj = parseDateSafe(s.date);
                                             if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonthIndex) {
                                                 const amount = s.totalAmount || 0;
                                                 currentRealizedData[currentMonthIndex].products += amount;

                                                 const origin = 'Produtos';
                                                 if (!serviceBreakdown[origin]) serviceBreakdown[origin] = { name: origin, realized: 0, forecast: 0, count: 0 };
                                                 serviceBreakdown[origin].realized += amount;
                                                 serviceBreakdown[origin].count++;
                                             }
                                         });

                                         // Current Month Adjustments Breakdown
                                         expenses.forEach(e => {
                                             const dateObj = parseDateSafe(e.date);
                                             if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonthIndex) {
                                                 const cleanCat = (e.category || '').toLowerCase();
                                                 if (e.dreClass === 'REVENUE' || cleanCat === 'ajuste de valor' || cleanCat === 'desconto concedido') {
                                                     const isRevenueClass = e.dreClass === 'REVENUE';
                                                     const val = isRevenueClass ? e.amount : -e.amount;
                                                     
                                                     const key = isRevenueClass ? 'Receitas Diretas' : 'Ajustes';
                                                     if (!serviceBreakdown[key]) serviceBreakdown[key] = { name: key, realized: 0, forecast: 0, count: 0 };
                                                     serviceBreakdown[key].realized += val;
                                                     serviceBreakdown[key].count++;
                                                 }
                                             }
                                         });

                                         const predictiveData = HISTORICAL_REVENUE.map((hist, index) => {
                                             const realizedValue = currentRealizedData[index].total;
                                             const targetValue = hist.pastValue * (1 + (predictiveTargetGrowth / 100));
                                             return {
                                                 name: hist.label,
                                                 [`${currentYear - 1}`]: hist.pastValue,
                                                 ['REALIZADO']: realizedValue,
                                                 [`META ${currentYear}`]: targetValue,
                                                 monthIndex: hist.month
                                             };
                                         });

                                         const currentMonthData = predictiveData[currentMonthIndex];
                                         const targetToBeat = currentMonthData[`META ${currentYear}`];
                                         const realizedValue = currentMonthData['REALIZADO'];
                                         const percentageAchieved = targetToBeat > 0 ? (realizedValue / targetToBeat) * 100 : 0;
                                         const gapToTarget = targetToBeat - realizedValue;

                                    return (
                                        <div className="space-y-6">
                                            {/* AI Strategist Banner */}
                                            <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/50 rounded-2xl shadow-sm px-4 md:px-6 py-2 md:py-1.5 flex flex-col md:flex-row items-center gap-3 md:gap-2 justify-between relative overflow-hidden">
                                                <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
                                                    <BrainCircuit size={60} className="md:size-[80px]" />
                                                </div>
                                                <div className="z-10 flex-1 text-center md:text-left">
                                                    <h2 className="text-sm md:text-base font-black uppercase tracking-tighter flex items-center justify-center md:justify-start gap-1.5 md:gap-2 drop-shadow-sm">
                                                        <BrainCircuit size={12} className="md:size-[14px]" /> O Estrategista Aminna
                                                    </h2>
                                                    <p className="text-white/80 font-bold text-[9px] md:text-[10px] leading-tight max-w-4xl drop-shadow-sm mt-0.5 md:mt-0">
                                                        Analisei o histórico de faturamento de {currentYear - 1} e tracei a sazonalidade detalhada do seu negócio.
                                                        Abaixo você encontra a linha de meta ajustada para {currentYear}.
                                                    </p>
                                                </div>
                                                 <div className="z-10 bg-white/40 dark:bg-zinc-800/60 py-2 px-4 rounded-xl backdrop-blur-md border border-slate-200/50 dark:border-zinc-700/50 flex flex-col items-center min-w-[120px]">
                                                     <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1"><Target size={10} className="text-indigo-500" /> Foco do Mês</span>
                                                     <div className="text-sm md:text-base font-black text-slate-900 dark:text-white leading-none">+{predictiveTargetGrowth}%</div>
                                                     <span className="text-[6px] md:text-[7px] font-bold text-slate-400 uppercase mt-1">Meta Definida</span>
                                                 </div>
                                            </div>

                                            {/* Filters Bar Removed Per User Request */}

                                            {/* Core Strategic Diagnostics Reverted to Original Vision */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Left Card: Dynamic Scenario */}
                                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between min-h-[180px]">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-amber-400" /> Cenário de {currentMonthData.name}
                                                        </p>
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-0">
                                                                {formatCurrency(realizedValue)}
                                                            </h3>
                                                            <div className="flex flex-col gap-1 mt-1">
                                                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                                                    <span>Serviços</span>
                                                                    <span className="text-emerald-500">{formatCurrency(realizedValue - currentRealizedData[currentMonthIndex].products)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                                                    <span>Produtos</span>
                                                                    <span className="text-amber-500">{formatCurrency(currentRealizedData[currentMonthIndex].products)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-4 mt-4 flex relative overflow-hidden shadow-inner">
                                                            <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, percentageAchieved)}%` }}></div>
                                                            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white drop-shadow-sm uppercase">
                                                                {percentageAchieved.toFixed(1)}% da Meta
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 space-y-4">
                                                        <p className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl w-fit ${gapToTarget > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {gapToTarget > 0 
                                                                ? `Faltam R$ ${gapToTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para a meta` 
                                                                : 'Meta superada com excelência!'}
                                                        </p>
                                                        <button 
                                                            onClick={() => {
                                                                setStrategistDetailTitle(`Composição ${currentMonthData.name}`);
                                                                setStrategistDetailData(Object.values(serviceBreakdown).sort((a: any, b: any) => b.realized - a.realized));
                                                                setIsStrategistDetailModalOpen(true);
                                                            }}
                                                            className="text-[11px] font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-800 transition-colors flex items-center gap-1 group"
                                                        >
                                                            Ver Detalhamento <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Middle Card: Seasonality Pattern */}
                                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                                                            <BarChart3 size={12} className="text-indigo-500" /> Histórico
                                                        </p>
                                                        <h3 className="text-[18px] font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-tight italic">
                                                            Sazonalidade Detectada
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed uppercase">
                                                            O fluxo de caixa apresenta forte tendência de tração no 2º semestre, com concentração expressiva de receitas entre Outubro e Dezembro.
                                                        </p>
                                                    </div>
                                                    <div className="mt-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                                        <BrainCircuit size={14} className="animate-pulse" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Foco em retenção agora.</span>
                                                    </div>
                                                </div>

                                                {/* Right Card: Recall/Gap Monitor */}
                                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-sm border border-rose-200 dark:border-rose-900/30 flex flex-col justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                                                            <AlertCircle size={12} /> Ponto Crítico
                                                        </p>
                                                        <h3 className="text-[18px] font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-tight italic">
                                                            Recall de {currentMonthData.name}
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed uppercase">
                                                            Historicamente, {currentMonthData.name} apresenta uma retração de ~15% em relação a Fevereiro. É o momento de lançar pacotes de recorrência.
                                                        </p>
                                                    </div>
                                                    <div className="mt-4 flex flex-col gap-1">
                                                        <span className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">Anticíclico: Aja hoje.</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Predictive Chart */}
                                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                                            Modelagem de Curva Financeira {currentYear}
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">Baseline {currentYear - 1} vs Tração Atual vs Target (+{predictiveTargetGrowth}%)</p>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-dashed"></div>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">{currentYear - 1}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">Meta {currentYear}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">Realizado</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="h-[400px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={predictiveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                            <defs>
                                                                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                                </linearGradient>
                                                                <linearGradient id="colorAchieved" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} tickFormatter={(v) => `R$ ${(v / 1000)}k`} />
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />

                                                            <Tooltip
                                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '20px' }}
                                                                itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                                                                labelStyle={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}
                                                                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                            />

                                                            <Area type="monotone" dataKey={`${currentYear - 1}`} stroke="#94a3b8" strokeDasharray="6 6" strokeWidth={2} fill="none" dot={false} />
                                                            <Area type="monotone" dataKey={`META ${currentYear}`} stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorTarget)" dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                                                            <Area type="monotone" dataKey={(d) => d.monthIndex <= currentMonthIndex ? d['REALIZADO'] : null} name="REALIZADO" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorAchieved)" activeDot={{ r: 8, strokeWidth: 0 }} dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'DRE' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* DRE Sub-tab header */}
                        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50 dark:bg-zinc-800/50">
                            <div className="flex p-0.5 md:p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide w-full sm:w-auto flex-nowrap">
                                {[
                                    { id: 'STATEMENT', label: 'Demonstrativo DRE', icon: BarChart3 },
                                    { id: 'ACCOUNTS', label: 'Plano de Contas', icon: Files },
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => setDreSubTab(st.id as any)}
                                        className={`flex-1 sm:flex-none items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex ${dreSubTab === st.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                    >
                                        <st.icon size={12} className="md:size-[13px]" /> {st.label}
                                    </button>
                                ))}
                            </div>
                            {dreSubTab === 'STATEMENT' && (
                                <div className="flex gap-2">
                                    <button onClick={handlePrintDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Printer size={18} /></button>
                                    <button onClick={handleDownloadDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Download size={18} /></button>
                                </div>
                            )}
                            {dreSubTab === 'ACCOUNTS' && (
                                <button
                                    onClick={() => { setEditingCategoryId(null); setCategoryForm({ name: '', dreClass: 'EXPENSE_ADM' }); setIsCategoryFormOpen(true); }}
                                    className="w-full sm:w-auto text-[9px] md:text-[10px] font-black uppercase text-white bg-zinc-950 dark:bg-white dark:text-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                                >
                                    <Plus size={12} /> Nova Conta
                                </button>
                            )}
                        </div>

                        {/* ===== PLANO DE CONTAS SUB-TAB ===== */}
                        {dreSubTab === 'ACCOUNTS' && (() => {
                            const DRE_CLASSES: { key: string; label: string; color: string; bg: string; lineRef: string }[] = [
                                { key: 'REVENUE', label: 'Receita Operacional Bruta', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', lineRef: '1. (+) Faturamento Bruto' },
                                { key: 'COSTS', label: 'CPV / Custos Operacionais', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20', lineRef: '4. (-) CPV / CMV' },
                                { key: 'EXPENSE_SALES', label: 'Despesas com Vendas', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20', lineRef: '6. (-) Despesas Vendas' },
                                { key: 'EXPENSE_ADM', label: 'Despesas Administrativas', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20', lineRef: '7. (-) Despesas ADM' },
                                { key: 'EXPENSE_FIN', label: 'Despesas Financeiras', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20', lineRef: '8. (-) Despesas FIN' },
                                { key: 'TAX', label: 'Impostos e Tributos', color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950/20', lineRef: '10. (-) IRPJ / CSLL / DAS' },
                                { key: 'DEDUCTION', label: 'Deduções (Repasses Salão Parceiro)', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800/40', lineRef: '2. (-) DEDUÇÕES (Repasses Salão Parceiro)' },
                            ];
                            const searchLower = categorySearch.toLowerCase();
                            const filtered = expenseCategories.filter(c => !searchLower || c.name.toLowerCase().includes(searchLower));
                            return (
                                <div className="flex flex-col lg:flex-row min-h-[500px] divide-y lg:divide-y-0 lg:divide-x dark:divide-zinc-800">
                                    {/* Left: Plan list */}
                                    <div className="w-full lg:flex-1 p-4 md:p-6 overflow-y-auto">
                                        {/* Search */}
                                        <div className="relative mb-4">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar conta..."
                                                value={categorySearch}
                                                onChange={e => setCategorySearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-5">
                                            {DRE_CLASSES.map(cls => {
                                                const catList = filtered.filter(c => c.dreClass === cls.key);
                                                return (
                                                    <div key={cls.key}>
                                                        {/* Group header */}
                                                        <div className={`flex items-center justify-between px-4 py-2 rounded-xl mb-2 ${cls.bg}`}>
                                                            <div>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest ${cls.color}`}>{cls.label}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Linha DRE → {cls.lineRef}</p>
                                                            </div>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${cls.bg} ${cls.color} border`}>{catList.length}</span>
                                                        </div>
                                                        {catList.length === 0 ? (
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase pl-4 pb-2 italic">Nenhuma conta nesta classe</p>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {catList.sort((a, b) => a.name.localeCompare(b.name)).map(cat => {
                                                                    const usageCount = expenses.filter(e => e.category === cat.name).length;
                                                                    return (
                                                                        <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 group transition-colors">
                                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls.color.replace('text-', 'bg-')}`} />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{cat.name}</p>
                                                                                {usageCount > 0 && <p className="text-[9px] text-slate-400 font-bold">{usageCount} lançamento(s)</p>}
                                                                            </div>
                                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => { setEditingCategoryId(cat.id); setCategoryForm({ name: cat.name, dreClass: cat.dreClass }); setIsCategoryFormOpen(true); }}
                                                                                    className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                                                                                ><Edit2 size={12} /></button>
                                                                                {usageCount === 0 && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                                                        className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                                                                                    ><Trash2 size={12} /></button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right: Add / Edit form panel */}
                                    {isCategoryFormOpen && (
                                        <div className="lg:w-80 border-l border-slate-200 dark:border-zinc-700 p-6 bg-slate-50/50 dark:bg-zinc-800/30 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-200">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                                    {editingCategoryId ? 'Editar Conta' : 'Nova Conta'}
                                                </h4>
                                                <button onClick={() => setIsCategoryFormOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"><X size={16} /></button>
                                            </div>
                                            <form onSubmit={handleSaveCategory} className="space-y-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Nome da Conta</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        autoFocus
                                                        placeholder="Ex: Energia Elétrica"
                                                        value={categoryForm.name}
                                                        onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                                        className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-white dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:border-indigo-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Classificação DRE</label>
                                                    <div className="relative">
                                                        <select
                                                            value={categoryForm.dreClass}
                                                            onChange={e => setCategoryForm({ ...categoryForm, dreClass: e.target.value })}
                                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-white dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:border-indigo-500 appearance-none text-sm"
                                                        >
                                                            <option value="REVENUE">Receita Operacional Bruta</option>
                                                            <option value="COSTS">CPV / Custos Operacionais</option>
                                                            <option value="EXPENSE_SALES">Despesas com Vendas</option>
                                                            <option value="EXPENSE_ADM">Despesas Administrativas</option>
                                                            <option value="EXPENSE_FIN">Despesas Financeiras</option>
                                                            <option value="TAX">Impostos e Tributos</option>
                                                            <option value="DEDUCTION">Deduções da Receita</option>
                                                        </select>
                                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div className="pt-2 flex flex-col gap-2">
                                                    <button type="submit" className="w-full py-3 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow active:scale-95 transition-all">
                                                        {editingCategoryId ? 'Atualizar' : 'Adicionar'} Conta
                                                    </button>
                                                    <button type="button" onClick={() => setIsCategoryFormOpen(false)} className="w-full py-3 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* ===== DEMONSTRATIVO DRE (existing view wrapped in dreSubTab check) ===== */}
                        {dreSubTab === 'STATEMENT' && (
                            <>

                                {/* DRE Indicators / Insights at Top */}
                                <div className="p-6 bg-slate-50/50 dark:bg-zinc-800/20 border-b border-slate-200 dark:border-zinc-700">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {[
                                            { label: 'Receita Bruta', value: formatCurrency(dreData.grossRevenue), color: 'indigo', icon: TrendingUp },
                                            { label: 'Total de Saídas', value: '-' + formatCurrency(dreData.totalOutflows), color: 'rose', icon: TrendingDown },
                                            { label: 'Margem de Lucro', value: (dreData.grossRevenue > 0 ? (dreData.netResult / dreData.grossRevenue) * 100 : 0).toFixed(1) + '%', color: 'emerald', icon: Info },
                                            { label: 'Ponto de Equilíbrio', value: formatCurrency((dreData.grossProfit / dreData.grossRevenue) > 0 ? (dreData.totalOpExpenses / (dreData.grossProfit / dreData.grossRevenue)) : 0), color: 'amber', icon: FileText },
                                            { label: 'Resultado Líquido', value: formatCurrency(dreData.netResult), color: dreData.netResult >= 0 ? 'emerald' : 'rose', icon: CircleCheck },
                                        ].map((card, idx) => (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`p-2 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`}>
                                                        <card.icon size={16} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                                                    <p className={`text-lg font-black mt-1 ${card.value.startsWith('-') ? 'text-rose-600' : 'text-slate-950 dark:text-white'}`}>
                                                        {card.value}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-0 overflow-x-auto scrollbar-hide">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                                            <tr className="text-[10px] font-black uppercase text-slate-500">
                                                <th className="px-8 py-4 sticky left-0 bg-slate-50 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Categorização Financeira</th>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <th key={m.name} className="px-4 py-4 text-right border-l border-slate-200/50 dark:border-zinc-700/50">{m.name}</th>
                                                        ))}
                                                        <th className="px-6 py-4 text-right bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-200 dark:border-indigo-800">TOTAL ANO</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="px-8 py-4 text-right">Valor (R$)</th>
                                                        <th className="px-8 py-4 text-right">AV%</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                                            {/* 1. RECEITA BRUTA */}
                                            <tr onClick={() => toggleSection('gross')} className="bg-indigo-50/20 dark:bg-indigo-900/10 cursor-pointer hover:bg-indigo-100/30 transition-colors">
                                                <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase flex items-center gap-2 sticky left-0 bg-indigo-50/20 dark:bg-indigo-950/20 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {expandedSections.includes('gross') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    1. RECEITA BRUTA
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-xs font-bold border-l border-slate-200/50 dark:border-zinc-700/50">{formatValue(m.grossRevenue, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm bg-indigo-100/20 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-l-2 border-indigo-200 dark:border-indigo-800">{formatCurrency(dreData.grossRevenue)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm">{formatCurrency(dreData.grossRevenue)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">100.0%</td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('gross') && (
                                                <>
                                                    {/* Sub-linha Serviços: apenas quando NÃO concluído (previsão por agendamentos) */}
                                                    {!dreData.isClosed && (<>
                                                        <tr onClick={() => toggleSection('services-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                            <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                                {expandedSections.includes('services-list') ? <ChevronDown size={12} /> : <TrendingUp size={12} />}
                                                                └ Serviços
                                                            </td>
                                                            {timeView === 'year' ? (
                                                                <>
                                                                    {dreData.monthlySnapshots?.map((m: any) => (
                                                                        <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 border-l border-slate-100 dark:border-zinc-800">{formatValue(m.revenueServices, 0)}</td>
                                                                    ))}
                                                                    <td className="px-6 py-3 text-right text-xs font-black bg-slate-50/50 dark:bg-zinc-800/30 border-l-2 border-slate-200 dark:border-zinc-700">{formatCurrency(dreData.revenueServices)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">{formatCurrency(dreData.revenueServices)}</td>
                                                                    <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                        {dreData.grossRevenue > 0 ? ((dreData.revenueServices / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                        {expandedSections.includes('services-list') && Object.entries(dreData.breakdownServices as Record<string, any>).sort((a, b) => b[1].total - a[1].total).map(([name, info]) => (
                                                            <tr key={name} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                <td className="px-20 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic border-l-4 border-indigo-50 dark:border-indigo-900/10 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">
                                                                    └ {name} <span className="text-[9px] text-slate-300">({info.count}x)</span>
                                                                </td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                                            <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                                        ))}
                                                                        <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(info.total)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{formatCurrency(info.total)}</td>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </>)}

                                                    {/* Sub-linha: Venda de Produtos */}
                                                    <tr onClick={() => toggleSection('products-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            {expandedSections.includes('products-list') ? <ChevronDown size={12} /> : <TrendingUp size={12} />}
                                                            └ Venda de Produtos
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                                    <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 border-l border-slate-100 dark:border-zinc-800">{formatValue(m.revenueProducts, 0)}</td>
                                                                ))}
                                                                <td className="px-6 py-3 text-right text-xs font-black bg-slate-50/50 dark:bg-zinc-800/30 border-l-2 border-slate-200 dark:border-zinc-700">{formatCurrency(dreData.revenueProducts)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">{formatCurrency(dreData.revenueProducts)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.revenueProducts / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSections.includes('products-list') && Object.entries((dreData.breakdownProducts || {}) as Record<string, any>).sort((a, b) => b[1].total - a[1].total).map(([name, info]) => (
                                                        <tr key={name} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                            <td className="px-20 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic border-l-4 border-indigo-50 dark:border-indigo-900/10 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">
                                                                └ {name} <span className="text-[9px] text-slate-300">({info.count}x)</span>
                                                            </td>
                                                            {timeView === 'year' ? (
                                                                <>
                                                                    {dreData.monthlySnapshots?.map((m: any) => (
                                                                        <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                                    ))}
                                                                    <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(info.total)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{formatCurrency(info.total)}</td>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                        {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                                    {/* Sub-linha: Cartão/PIX (sem nota fiscal) - apenas quando concluído */}
                                                    {dreData.isClosed && dreData.reconciledBankRevenues > 0 && (
                                                        <tr onClick={() => toggleSection('bank-revenues-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                            <td className="px-12 py-3 text-xs font-bold text-emerald-600 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                                {expandedSections.includes('bank-revenues-list') ? <ChevronDown size={12} /> : <DollarSign size={12} />}
                                                                └ Cartão/PIX (sem nota)
                                                            </td>
                                                            {timeView === 'year' ? (
                                                                <>
                                                                    {dreData.monthlySnapshots?.map((m: any) => (
                                                                        <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-emerald-500 border-l border-slate-100 dark:border-zinc-800">{formatValue(m.reconciledBankRevenues || 0, 0)}</td>
                                                                    ))}
                                                                    <td className="px-6 py-3 text-right text-xs font-black bg-emerald-50/30 dark:bg-emerald-800/10 border-l-2 border-slate-200 dark:border-zinc-700 text-emerald-700">{formatCurrency(dreData.reconciledBankRevenues)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-8 py-3 text-right text-xs font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(dreData.reconciledBankRevenues)}</td>
                                                                    <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                        {dreData.grossRevenue > 0 ? ((dreData.reconciledBankRevenues / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    )}
                                                    {expandedSections.includes('bank-revenues-list') && dreData.reconciledBankRevenues > 0 && Object.entries((dreData.breakdownBankRevenues || {}) as Record<string, any>).sort((a, b) => b[1].total - a[1].total).map(([name, info]) => (
                                                        <tr key={name} className="animate-in slide-in-from-top-1 duration-200 bg-emerald-50/10 dark:bg-zinc-800/10">
                                                            <td className="px-20 py-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase italic border-l-4 border-emerald-50 dark:border-emerald-900/10 sticky left-0 bg-emerald-50/10 dark:bg-zinc-800/10 z-10">
                                                                └ {name} <span className="text-[9px] text-slate-300">({info.items.length}x)</span>
                                                            </td>
                                                            {timeView === 'year' ? (
                                                                <>
                                                                    {dreData.monthlySnapshots?.map((m: any) => (
                                                                        <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-emerald-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                                    ))}
                                                                    <td className="px-6 py-2 text-right text-[10px] font-black text-emerald-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(info.total)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(info.total)}</td>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                        {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </>
                                            )}

                                            {/* 2. DEDUÇÃ•ES */}
                                            <tr onClick={() => toggleSection('deductions')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {expandedSections.includes('deductions') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    2. (-) DEDUÇÕES (Repasses Salão Parceiro)
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.deductions, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">-{formatCurrency(dreData.deductions)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">-{formatCurrency(dreData.deductions)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.deductions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('deductions') && (
                                                <>
                                                    <tr onClick={() => toggleSection('commissions-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            {expandedSections.includes('commissions-list') ? <ChevronDown size={12} /> : <Menu size={12} />}
                                                            └ Comissões
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                                    <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">{formatValue(m.commissions, 0)}</td>
                                                                ))}
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">{formatCurrency(dreData.commissions)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(dreData.commissions)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.commissions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSections.includes('commissions-list') && Object.entries(dreData.breakdownCommissions as Record<string, any>).sort((a, b) => b[1].total - a[1].total).map(([name, info]) => (
                                                        <tr key={name} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                            <td className="px-20 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic border-l-4 border-rose-50 dark:border-rose-900/10 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">
                                                                └ {name} <span className="text-[9px] text-slate-300">({info.count}x)</span>
                                                            </td>
                                                            {timeView === 'year' ? (
                                                                <>
                                                                    {dreData.monthlySnapshots?.map((m: any) => (
                                                                        <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                                    ))}
                                                                    <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(info.total)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{formatCurrency(info.total)}</td>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                        {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </>
                                            )}

                                            {/* 3. RECEITA LÃQUIDA */}
                                            <tr className="bg-slate-50 dark:bg-zinc-800/50">
                                                <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase sticky left-0 bg-slate-50 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">3. (=) RECEITA LÃQUIDA</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-xs font-bold border-l border-slate-200/50 dark:border-zinc-700/50">{formatValue(m.netRevenue, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm border-l-2 border-slate-200 dark:border-zinc-700">{formatCurrency(dreData.netRevenue)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm">{formatCurrency(dreData.netRevenue)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">{((dreData.netRevenue / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 4. CPV/CMV */}
                                            <tr onClick={() => toggleSection('cogs')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {expandedSections.includes('cogs') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    4. (-) CPV / CMV / CUSTOS OPERACIONAIS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.totalCOGS, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">-{formatCurrency(dreData.totalCOGS)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">-{formatCurrency(dreData.totalCOGS)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.totalCOGS / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('cogs') && (
                                                <>
                                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">└ Insumos e Produtos (Lançamentos Manuais)</td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    const costVal = m.totalCOGS;
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">{formatValue(costVal, 0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">{formatCurrency(dreData.totalCOGS)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(dreData.totalCOGS)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.totalCOGS / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                </>
                                            )}

                                            {/* 5. LUCRO BRUTO */}
                                            <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                                                <td className="px-8 py-4 font-black text-sm text-emerald-800 dark:text-emerald-400 uppercase sticky left-0 bg-emerald-50 dark:bg-emerald-950 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">5. (=) LUCRO BRUTO</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className={`px-4 py-4 text-right text-xs font-black border-l border-emerald-100 dark:border-emerald-800/30 ${m.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatValue(m.grossProfit, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400 border-l-2 border-emerald-200 dark:border-emerald-800">{formatCurrency(dreData.grossProfit)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400">{formatCurrency(dreData.grossProfit)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-emerald-600/50">
                                                            {dreData.grossRevenue > 0 ? ((dreData.grossProfit / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 6. (+) OUTRAS RECEITAS */}
                                            <tr onClick={() => toggleSection('other-revenues')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-emerald-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={16} />
                                                    6. (+) OUTRAS RECEITAS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-emerald-500 border-l border-slate-100 dark:border-zinc-800">+{formatValue(m.otherRevenues, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-emerald-600 bg-emerald-50/20 dark:bg-emerald-900/10 border-l-2 border-emerald-200 dark:border-emerald-800">+{formatCurrency(dreData.otherRevenues)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-emerald-600">+{formatCurrency(dreData.otherRevenues)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.otherRevenues / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('other-revenues') && Object.entries((dreData.breakdownOtherIncome || {}) as Record<string, any>).map(([cat, info]) => (
                                                <React.Fragment key={cat}>
                                                    <tr onClick={() => toggleSubSection(cat)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            <Menu size={12} />
                                                            {cat}
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    const catTotal = (m.breakdownOtherIncome?.[cat]?.total || 0);
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{formatValue(catTotal, 0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">{formatCurrency(info.total)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(info.total)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? (((info.total as number) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSubSections.includes(cat) && (() => {
                                                        const groupedItems: Record<string, { description: string, amounts: Record<number, number>, total: number }> = {};
                                                        (info.items as Expense[]).forEach(e => {
                                                            let key = e.recurringId;
                                                            let displayDesc = e.description || '';
                                                            const match = displayDesc.match(/^(.*?)\s*\(\d+\/\d+\)$/);
                                                            if (key) { if (match) displayDesc = match[1]; }
                                                            else { if (match) { key = match[1]; displayDesc = match[1]; } else { key = displayDesc; } }
                                                            if (!groupedItems[key || 'no-key']) { groupedItems[key || 'no-key'] = { description: displayDesc || 'Sem descrição', amounts: {}, total: 0 }; }
                                                            const dateObj = parseDateSafe(e.date);
                                                            const month = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
                                                            groupedItems[key || 'no-key'].amounts[month] = (groupedItems[key || 'no-key'].amounts[month] || 0) + e.amount;
                                                            groupedItems[key || 'no-key'].total += e.amount;
                                                        });
                                                        const sortedGroups = Object.values(groupedItems).sort((a, b) => b.total - a.total);
                                                        return sortedGroups.map((group, idx) => (
                                                            <tr key={idx} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                <td className="px-20 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase italic border-l-4 border-indigo-100 dark:border-indigo-900/30 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">└ {group.description}</td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                            const val = group.amounts[mIdx];
                                                                            return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? formatCurrency(val) : ''}</td>
                                                                        })}
                                                                        <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(group.total)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{formatCurrency(group.total)}</td>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? ((group.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ));
                                                    })()}
                                                </React.Fragment>
                                            ))}

                                            {/* 7. DESPESAS COM VENDAS */}
                                            <tr onClick={() => toggleSection('exp-vendas')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={16} />
                                                    7. (-) DESPESAS COM VENDAS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.amountVendas, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">-{formatCurrency(dreData.amountVendas)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">-{formatCurrency(dreData.amountVendas)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.amountVendas / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('exp-vendas') && Object.entries(dreData.breakdownVendas as Record<string, any>).map(([cat, info]) => (
                                                <React.Fragment key={cat}>
                                                    <tr onClick={() => toggleSubSection(cat)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            <Menu size={12} />
                                                            {cat}
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    const catTotal = (m.breakdownVendas[cat]?.total || 0);
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{formatValue(catTotal, 0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">{formatCurrency(info.total)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(info.total)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? (((info.total as number) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSubSections.includes(cat) && (() => {
                                                        const groupedItems: Record<string, { description: string, amounts: Record<number, number>, total: number }> = {};
                                                        (info.items as Expense[]).forEach(e => {
                                                            let key = e.recurringId;
                                                            let displayDesc = e.description || '';
                                                            const match = displayDesc.match(/^(.*?)\s*\(\d+\/\d+\)$/);
                                                            if (key) { if (match) displayDesc = match[1]; }
                                                            else { if (match) { key = match[1]; displayDesc = match[1]; } else { key = displayDesc; } }
                                                            if (!groupedItems[key || 'no-key']) { groupedItems[key || 'no-key'] = { description: displayDesc || 'Sem descrição', amounts: {}, total: 0 }; }
                                                            const dateObj = parseDateSafe(e.date);
                                                            const month = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
                                                            groupedItems[key || 'no-key'].amounts[month] = (groupedItems[key || 'no-key'].amounts[month] || 0) + e.amount;
                                                            groupedItems[key || 'no-key'].total += e.amount;
                                                        });
                                                        const sortedGroups = Object.values(groupedItems).sort((a, b) => b.total - a.total);
                                                        return sortedGroups.map((group, idx) => (
                                                            <tr key={idx} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                <td className="px-20 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase italic border-l-4 border-indigo-100 dark:border-indigo-900/30 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">└ {group.description}</td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                            const val = group.amounts[mIdx];
                                                                            return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? formatCurrency(val) : ''}</td>
                                                                        })}
                                                                        <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(group.total)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{formatCurrency(group.total)}</td>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? ((group.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ));
                                                    })()}
                                                </React.Fragment>
                                            ))}

                                            {/* 8. DESPESAS ADMINISTRATIVAS */}
                                            <tr onClick={() => toggleSection('exp-adm')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={16} />
                                                    8. (-) DESPESAS ADMINISTRATIVAS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.amountAdm, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">-{formatCurrency(dreData.amountAdm)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">-{formatCurrency(dreData.amountAdm)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.amountAdm / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('exp-adm') && Object.entries(dreData.breakdownAdm as Record<string, any>).map(([cat, info]) => (
                                                <React.Fragment key={cat}>
                                                    <tr onClick={() => toggleSubSection(cat)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            <Menu size={12} />
                                                            {cat}
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    const catTotal = (m.breakdownAdm[cat]?.total || 0);
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{formatValue(catTotal, 0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">{formatCurrency(info.total)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(info.total)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? (((info.total as number) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSubSections.includes(cat) && (() => {
                                                        const groupedItems: Record<string, { description: string, amounts: Record<number, number>, total: number }> = {};
                                                        (info.items as Expense[]).forEach(e => {
                                                            let key = e.recurringId;
                                                            let displayDesc = e.description || '';
                                                            const match = displayDesc.match(/^(.*?)\s*\(\d+\/\d+\)$/);
                                                            if (key) { if (match) displayDesc = match[1]; }
                                                            else { if (match) { key = match[1]; displayDesc = match[1]; } else { key = displayDesc; } }
                                                            if (!groupedItems[key || 'no-key']) { groupedItems[key || 'no-key'] = { description: displayDesc || 'Sem descrição', amounts: {}, total: 0 }; }
                                                            const dateObj = parseDateSafe(e.date);
                                                            const month = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
                                                            groupedItems[key || 'no-key'].amounts[month] = (groupedItems[key || 'no-key'].amounts[month] || 0) + e.amount;
                                                            groupedItems[key || 'no-key'].total += e.amount;
                                                        });
                                                        const sortedGroups = Object.values(groupedItems).sort((a, b) => b.total - a.total);
                                                        return sortedGroups.map((group, idx) => (
                                                            <tr key={idx} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                <td className="px-20 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase italic border-l-4 border-indigo-100 dark:border-indigo-900/30 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">└ {group.description}</td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                            const val = group.amounts[mIdx];
                                                                            return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? formatCurrency(val) : ''}</td>
                                                                        })}
                                                                        <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(group.total)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{formatCurrency(group.total)}</td>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? ((group.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ));
                                                    })()}
                                                </React.Fragment>
                                            ))}

                                            {/* 9. DESPESAS FINANCEIRAS */}
                                            <tr onClick={() => toggleSection('exp-fin')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={16} />
                                                    9. (-) DESPESAS FINANCEIRAS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.amountFin, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">-{formatCurrency(dreData.amountFin)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">-{formatCurrency(dreData.amountFin)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.amountFin / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('exp-fin') && (
                                                <>
                                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-bold text-rose-500 opacity-80 uppercase italic sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">└ Taxas de Antecipação</td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.anticipationFees, 0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">-{formatCurrency(dreData.anticipationFees)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">-{formatCurrency(dreData.anticipationFees)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.anticipationFees / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-bold text-rose-500 opacity-80 uppercase italic sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">└ Taxas de Cartão/Débito</td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.automatedDeductions, 0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">-{formatCurrency(dreData.automatedDeductions)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">-{formatCurrency(dreData.automatedDeductions)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.automatedDeductions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {Object.entries(dreData.breakdownFin as Record<string, any>).map(([cat, info]) => (
                                                        <React.Fragment key={cat}>
                                                            <tr onClick={() => toggleSubSection(cat)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                                <td className="px-14 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                                    <Menu size={12} />
                                                                    {cat}
                                                                </td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any) => {
                                                                            const catTotal = (m.breakdownFin[cat]?.total || 0);
                                                                            return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{formatValue(catTotal, 0)}</td>
                                                                        })}
                                                                        <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">{formatCurrency(info.total)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(info.total)}</td>
                                                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? (((info.total as number) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                            {expandedSubSections.includes(cat) && (() => {
                                                                const groupedItems: Record<string, { description: string, amounts: Record<number, number>, total: number }> = {};
                                                                (info.items as Expense[]).forEach(e => {
                                                                    let key = e.recurringId;
                                                                    let displayDesc = e.description || '';
                                                                    const match = displayDesc.match(/^(.*?)\s*\(\d+\/\d+\)$/);
                                                                    if (key) { if (match) displayDesc = match[1]; }
                                                                    else { if (match) { key = match[1]; displayDesc = match[1]; } else { key = displayDesc; } }
                                                                    if (!groupedItems[key || 'no-key']) { groupedItems[key || 'no-key'] = { description: displayDesc || 'Sem descrição', amounts: {}, total: 0 }; }
                                                                    const dateObj = parseDateSafe(e.date);
                                                                    const month = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
                                                                    groupedItems[key || 'no-key'].amounts[month] = (groupedItems[key || 'no-key'].amounts[month] || 0) + e.amount;
                                                                    groupedItems[key || 'no-key'].total += e.amount;
                                                                });
                                                                const sortedGroups = Object.values(groupedItems).sort((a, b) => b.total - a.total);
                                                                return sortedGroups.map((group, idx) => (
                                                                    <tr key={idx} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                        <td className="px-20 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase italic border-l-4 border-indigo-100 dark:border-indigo-900/30 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">└ {group.description}</td>
                                                                        {timeView === 'year' ? (
                                                                            <>
                                                                                {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                                    const val = group.amounts[mIdx];
                                                                                    return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? formatCurrency(val) : ''}</td>
                                                                                })}
                                                                                <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">{formatCurrency(group.total)}</td>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{formatCurrency(group.total)}</td>
                                                                                <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                                    {dreData.grossRevenue > 0 ? ((group.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ));
                                                            })()}
                                                        </React.Fragment>
                                                    ))}
                                                </>
                                            )}

                                            {/* 10. RESULTADO ANTES IRPJ */}
                                            <tr className="bg-slate-100 dark:bg-zinc-800">
                                                <td className="px-8 py-4 font-black text-sm text-slate-800 dark:text-slate-200 uppercase sticky left-0 bg-slate-100 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">10. (=) RESULTADO ANTES IRPJ/CSLL</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className={`px-4 py-4 text-right text-xs font-black border-l border-slate-200/50 dark:border-zinc-700/50 ${m.resultBeforeTaxes >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>{formatValue(m.resultBeforeTaxes, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm text-slate-800 dark:text-slate-200 border-l-2 border-slate-300 dark:border-zinc-600">{formatCurrency(dreData.resultBeforeTaxes)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm text-slate-800 dark:text-slate-200">{formatCurrency(dreData.resultBeforeTaxes)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-500">
                                                            {dreData.grossRevenue > 0 ? ((dreData.resultBeforeTaxes / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 11. PROVISÃ•ES IRPJ */}
                                            <tr>
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase pl-12 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">11. (-) PROVISÕES IRPJ E CSLL</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{formatValue(m.irpjCsll, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">-{formatCurrency(dreData.irpjCsll)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">-{formatCurrency(dreData.irpjCsll)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.irpjCsll / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 12. RESULTADO LÍQUIDO */}
                                            <tr className="bg-black text-white dark:bg-white dark:text-black">
                                                <td className="px-8 py-6 font-black text-sm uppercase sticky left-0 bg-black dark:bg-white z-10 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">12. (=) RESULTADO LÍQUIDO DO PERÍODO</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className={`px-4 py-6 text-right text-xs font-black border-l border-white/10 dark:border-black/10 ${m.netResult >= 0 ? '' : 'text-rose-400'}`}>{formatValue(m.netResult, 0)}</td>
                                                        ))}
                                                        <td className="px-6 py-6 text-right font-black text-xl border-l-2 border-white/20 dark:border-black/20">{formatCurrency(dreData.netResult)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-6 text-right font-black text-xl">{formatCurrency(dreData.netResult)}</td>
                                                        <td className="px-8 py-6 text-right font-black text-xs text-white/50">
                                                            {dreData.grossRevenue > 0 ? ((dreData.netResult / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200 my-auto">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><ArrowDownCircle size={18} /> {editingExpenseId ? 'Editar' : 'Nova'} Despesa</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={(e) => handleSaveExpense(e)} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Descrição do Gasto</label>
                                    <input type="text" placeholder="Ex: Conta de Luz" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Valor (R$)</label>
                                        <input
                                            type="text"
                                            placeholder="0,00"
                                            required
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black"
                                            value={expenseForm.amount || ''}
                                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value as any })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Número da Nota / Doc</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 123456"
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black"
                                            value={expenseForm.invoiceNumber || ''}
                                            onChange={e => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Vencimento</label>
                                    <input type="date" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                                </div>

                                {/* Recurrence Field (Only for new expenses) */}
                                {!editingExpenseId && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Repetir (Quantidade de Parcelas)</label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                    placeholder="1"
                                                    className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black"
                                                    value={recurrenceMonths}
                                                    onChange={e => setRecurrenceMonths(parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 p-3 rounded-xl">
                                                {recurrenceMonths > 1 ? 'Meses' : 'Mês'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase">Categoria / Conta</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsQuickAddingCategory(true);
                                                setEditingCategoryId(null);
                                                setCategoryForm({ name: '', dreClass: 'EXPENSE_ADM' });
                                                setIsCategoryFormOpen(true);
                                            }}
                                            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase"
                                        >
                                            <FolderPlus size={12} /> Nova Conta
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar conta... (ex: Aluguel)"
                                            autoComplete="off"
                                            value={categoryInputSearch}
                                            onFocus={() => { setCategoryInputSearch(expenseForm.category || ''); setIsCategoryDropdownOpen(true); }}
                                            onChange={e => { setCategoryInputSearch(e.target.value); setIsCategoryDropdownOpen(true); setExpenseForm({ ...expenseForm, category: e.target.value }); }}
                                            onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 180)}
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black pr-10"
                                        />
                                        {expenseForm.category && (() => {
                                            const selCat = expenseCategories.find(c => c.name === expenseForm.category);
                                            const dreLabels: Record<string, { text: string; color: string }> = {
                                                COSTS: { text: 'CPV', color: 'text-rose-600 bg-rose-50' },
                                                EXPENSE_SALES: { text: 'Vendas', color: 'text-orange-600 bg-orange-50' },
                                                EXPENSE_ADM: { text: 'ADM', color: 'text-indigo-600 bg-indigo-50' },
                                                EXPENSE_FIN: { text: 'FIN', color: 'text-purple-600 bg-purple-50' },
                                                TAX: { text: 'TAX', color: 'text-amber-700 bg-amber-50' },
                                                DEDUCTION: { text: 'DED', color: 'text-slate-600 bg-slate-100' },
                                            };
                                            const dl = selCat ? dreLabels[selCat.dreClass] : null;
                                            return dl ? <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black px-2 py-0.5 rounded-full ${dl.color}`}>{dl.text}</span> : null;
                                        })()}
                                        {isCategoryDropdownOpen && (
                                            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl max-h-52 overflow-y-auto">
                                                {expenseCategories
                                                    .filter(c => !categoryInputSearch || c.name.toLowerCase().includes(categoryInputSearch.toLowerCase()))
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                setExpenseForm({ ...expenseForm, category: c.name, dreClass: c.dreClass as any });
                                                                setCategoryInputSearch(c.name);
                                                                setIsCategoryDropdownOpen(false);
                                                            }}
                                                            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                                                        >
                                                            <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase">{c.name}</span>
                                                            <span className="text-[8px] font-black text-slate-400">{c.dreClass}</span>
                                                        </button>
                                                    ))}
                                                {expenseCategories.filter(c => !categoryInputSearch || c.name.toLowerCase().includes(categoryInputSearch.toLowerCase())).length === 0 && (
                                                    <div className="px-4 py-3 text-[10px] text-slate-400 font-bold uppercase">Nenhuma conta encontrada</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Status do Pagamento</label>
                                        <div className="relative">
                                            <select
                                                value={expenseForm.status}
                                                onChange={e => setExpenseForm({ ...expenseForm, status: e.target.value as 'Pago' | 'Pendente' })}
                                                className={`w-full border-2 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 outline-none appearance-none transition-colors ${expenseForm.status === 'Pago' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/30 dark:text-emerald-400' : 'border-amber-200 text-amber-700 dark:border-amber-900/30 dark:text-amber-400'}`}
                                            >
                                                <option value="Pago">Pago</option>
                                                <option value="Pendente">Pendente</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Favorecido</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsQuickAddingSupplier(true);
                                                    handleOpenSupplierModal();
                                                }}
                                                className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase"
                                            >
                                                <Plus size={12} /> Novo
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <select
                                                autoComplete="off"
                                                value={expenseForm.supplierId || ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    let updatedForm = { ...expenseForm, supplierId: val };

                                                    // No auto-fill category anymore as per user request
                                                    setExpenseForm(updatedForm);
                                                }}
                                                className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                            >
                                                <option value="">Nenhum / Geral</option>
                                                <optgroup label="Fornecedores">
                                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name?.toUpperCase()}</option>)}
                                                </optgroup>
                                                <optgroup label="Profissionais">
                                                    {providers.map(p => <option key={p.id} value={`prov_${p.id}`}>{p.name?.toUpperCase()}</option>)}
                                                </optgroup>
                                                <optgroup label="Funcionários">
                                                    {employees.map(e => <option key={e.id} value={`emp_${e.id}`}>{e.name?.toUpperCase()}</option>)}
                                                </optgroup>
                                            </select>
                                            <Users size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                                        {recurrenceMonths > 1 ? `Lançar ${recurrenceMonths}x Despesas` : 'Salvar Despesa'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isSupplierModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><Users size={18} /> {editingSupplierId ? 'Editar' : 'Novo'} Fornecedor</h3>
                                <button onClick={() => setIsSupplierModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Nome do Fornecedor</label>
                                    <input type="text" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Documento (CPF/CNPJ)</label>
                                    <input type="text" className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.document} onChange={e => setSupplierForm({ ...supplierForm, document: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Telefone</label>
                                        <input type="text" className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">E-mail</label>
                                        <input type="email" className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                                        Salvar Fornecedor
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* BATCH ACTION MODAL (Recurring Expenses) */}
            {
                isBatchModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border-2 border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300 my-auto">
                            <div className="p-8 text-center space-y-6">
                                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                                    <AlertCircle size={40} />
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Despesa Recorrente</h3>
                                    <p className="text-sm text-slate-500 font-bold mt-2 leading-relaxed">
                                        Esta despesa faz parte de uma série. Como deseja prosseguir com a {batchActionType === 'SAVE' ? 'edição' : 'exclusão'}?
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => { if (batchActionType === 'SAVE') handleSaveExpense(undefined, 'ONLY_THIS'); else handleDeleteExpense(editingExpenseId!, 'ONLY_THIS'); }}
                                        className="w-full py-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-950 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                                    >
                                        Somente esta
                                    </button>
                                    <button
                                        onClick={() => { if (batchActionType === 'SAVE') handleSaveExpense(undefined, 'THIS_AND_FUTURE'); else handleDeleteExpense(editingExpenseId!, 'THIS_AND_FUTURE'); }}
                                        className="w-full py-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-950 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                                    >
                                        Esta e as próximas
                                    </button>
                                    <button
                                        onClick={() => { if (batchActionType === 'SAVE') handleSaveExpense(undefined, 'ALL'); else handleDeleteExpense(editingExpenseId!, 'ALL'); }}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
                                    >
                                        Todas da série
                                    </button>
                                </div>

                                <button
                                    onClick={() => { setIsBatchModalOpen(false); setBatchActionType('IDLE'); }}
                                    className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* BATCH DATE ADJUSTMENT MODAL */}
            {
                isBatchDateModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><Calendar size={18} /> Ajustar Data em Lote</h3>
                                <button onClick={() => setIsBatchDateModalOpen(false)}><X size={24} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Nova Data para os {selectedExpenseIds.length} itens</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white outline-none focus:border-black"
                                        value={batchNewDate}
                                        onChange={e => setBatchNewDate(e.target.value)}
                                    />
                                </div>

                                {selectedExpenseIds.some(id => expenses.find(e => e.id === id)?.recurringId) && (
                                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
                                        <input
                                            type="checkbox"
                                            id="applyToFuture"
                                            className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500 mt-0.5"
                                            checked={applyToFuture}
                                            onChange={e => setApplyToFuture(e.target.checked)}
                                        />
                                        <label htmlFor="applyToFuture" className="text-[11px] font-bold text-amber-900 dark:text-amber-400 leading-tight cursor-pointer">
                                            Reajustar automaticamente o vencimento de todas as parcelas futuras das séries selecionadas?
                                        </label>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={handleBatchDateUpdate}
                                        className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
                                    >
                                        Aplicar Nova Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* BATCH ACTION BAR (Floating) */}
            {
                selectedExpenseIds.length > 0 && (
                    <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-500 w-[95%] md:w-auto">
                        <div className="bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl md:rounded-[2rem] shadow-2xl border-4 border-white/10 dark:border-black/10 flex items-center gap-1 md:gap-4 p-1.5 md:p-3 backdrop-blur-md justify-between md:justify-start">
                            <div className="px-2 md:px-6 border-r border-white/20 dark:border-black/20">
                                <div className="flex flex-col items-center md:items-start">
                                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Itens</span>
                                    <span className="text-sm md:text-xl font-black leading-none">{selectedExpenseIds.length}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    onClick={() => setIsBatchDateModalOpen(true)}
                                    className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 hover:bg-white/10 dark:hover:bg-black/5 rounded-xl md:rounded-2xl transition-all group"
                                >
                                    <Calendar size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Ajustar Data</span>
                                </button>

                                <button
                                    onClick={handleBatchStatusUpdate}
                                    className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 hover:bg-white/10 dark:hover:bg-black/5 rounded-xl md:rounded-2xl transition-all group"
                                >
                                    <CircleCheck size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Inverter Status</span>
                                </button>

                                <button
                                    onClick={handleBatchDelete}
                                    className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-xl md:rounded-2xl transition-all group"
                                >
                                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Excluir</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setSelectedExpenseIds([])}
                                className="ml-2 md:ml-4 p-2 md:p-3 bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 rounded-xl md:rounded-2xl transition-colors"
                                title="Limpar seleção"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Quick Category Modal */}
            {
                isQuickAddingCategory && isCategoryFormOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><FolderPlus size={18} /> Nova Conta / Categoria</h3>
                                <button onClick={() => { setIsCategoryFormOpen(false); setIsQuickAddingCategory(false); }}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Nome da Conta</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        placeholder="Ex: Energia Elétrica"
                                        value={categoryForm.name}
                                        onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                        className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Classificação DRE</label>
                                    <div className="relative">
                                        <select
                                            value={categoryForm.dreClass}
                                            onChange={e => setCategoryForm({ ...categoryForm, dreClass: e.target.value })}
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                        >
                                            <option value="COSTS">CPV / Custos Operacionais</option>
                                            <option value="REVENUE">Outras Receitas</option>
                                            <option value="EXPENSE_SALES">Despesas com Vendas</option>
                                            <option value="EXPENSE_ADM">Despesas Administrativas</option>
                                            <option value="EXPENSE_FIN">Despesas Financeiras</option>
                                            <option value="TAX">Impostos e Tributos</option>
                                            <option value="DEDUCTION">Deduções da Receita</option>
                                        </select>
                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                                        Adicionar Conta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isReconciliationOpen && (
                    <BankReconciliation
                        expenses={expenses}
                        setExpenses={setExpenses}
                        appointments={appointments}
                        setAppointments={setAppointments}
                        sales={sales}
                        setSales={setSales}
                        customers={customers}
                        setCustomers={setCustomers}
                        categories={expenseCategories}
                        setExpenseCategories={setExpenseCategories}
                        suppliers={suppliers}
                        setSuppliers={setSuppliers}
                        providers={providers}
                        employees={employees}
                        paymentSettings={paymentSettings}
                        financialConfigs={financialConfigs}
                        onClose={() => setIsReconciliationOpen(false)}
                    />
                )
            }
            {/* Modal de Edição de Conciliado */}
            {
                isReconciledEditModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full md:max-w-4xl overflow-hidden border border-slate-200 dark:border-zinc-800 animate-in zoom-in duration-300">
                            <div className="px-8 py-6 bg-slate-50 dark:bg-zinc-800 border-b flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                        <Edit2 size={18} className="text-indigo-500" /> Editar Lançamento Conciliado
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Ajuste os dados financeiros do lançamento</p>
                                </div>
                                <button onClick={() => setIsReconciledEditModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Descrição</label>
                                        <input
                                            type="text"
                                            value={editReconciledForm.description}
                                            onChange={(e) => setEditReconciledForm({ ...editReconciledForm, description: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="Descreva o lançamento..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Categoria</label>
                                            <select
                                                value={editReconciledForm.category}
                                                onChange={(e) => setEditReconciledForm({ ...editReconciledForm, category: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="">Selecione...</option>
                                                {expenseCategories.map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                                <option value="Serviço">Serviço</option>
                                                <option value="Venda">Venda</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5 ml-1">
                                                <label className="block text-[10px] font-black uppercase text-slate-400">Favorecido</label>
                                                <button
                                                    onClick={() => setIsSupplierModalOpen(true)}
                                                    className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
                                                >
                                                    + Novo
                                                </button>
                                            </div>
                                            <select
                                                value={editReconciledForm.supplierId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    let name = '';
                                                    if (val.startsWith('prov_')) {
                                                        name = providers.find(p => p.id === val.replace('prov_', ''))?.name || '';
                                                    } else if (val.startsWith('emp_')) {
                                                        name = employees.find(e => e.id === val.replace('emp_', ''))?.name || '';
                                                    } else {
                                                        name = suppliers.find(s => s.id === val)?.name || '';
                                                    }

                                                    setEditReconciledForm({
                                                        ...editReconciledForm,
                                                        supplierId: val,
                                                        customerOrProviderName: name
                                                    });
                                                }}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="">Selecione...</option>
                                                <optgroup label="Fornecedores">
                                                    {suppliers.map(sup => (
                                                        <option key={sup.id} value={sup.id}>{sup.name?.toUpperCase()}</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Profissionais">
                                                    {providers.map(p => (
                                                        <option key={p.id} value={`prov_${p.id}`}>{p.name?.toUpperCase()}</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Funcionários">
                                                    {employees.map(e => (
                                                        <option key={e.id} value={`emp_${e.id}`}>{e.name?.toUpperCase()}</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setIsReconciledEditModalOpen(false)}
                                        className="flex-1 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveReconciledEdit}
                                        className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} /> Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Manual Link Modal */}
            <ManualLinkModal 
                isOpen={isManualLinkModalOpen}
                onClose={() => { 
                    setIsManualLinkModalOpen(false); 
                    setLinkingBankTx(null); 
                }}
                bankTx={linkingBankTx!}
                expenses={expenses}
                sales={sales}
                appointments={appointments}
                onLink={handleManualLink}
                isProcessing={isManualLinkingProcessing}
                parseDateSafe={parseDateSafe}
                suppliers={suppliers}
                customers={customers}
                expenseCategories={expenseCategories}
                providers={providers}
                employees={employees}
                transactions={transactions}
                bankTransactions={bankTransactions}
            />

            <BatchLinkModal 
                isOpen={isBatchLinkModalOpen}
                onClose={() => setIsBatchLinkModalOpen(false)}
                selectedExpenses={expenses.filter(e => selectedExpenseIds.includes(e.id))}
                bankTransactions={bankTransactions}
                onLink={handleBatchLinkExpenses}
                isProcessing={isManualLinkingProcessing}
                parseDateSafe={parseDateSafe}
            />

            {/* Strategist Detail Modal */}
            {isStrategistDetailModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full md:max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{strategistDetailTitle}</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Detalhamento por Categoria de Serviço e Produtos</p>
                                </div>
                            </div>
                            <button onClick={() => setIsStrategistDetailModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <div className="space-y-3">
                                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <div className="col-span-6">Serviço / Item</div>
                                    <div className="col-span-3 text-right">Agendado</div>
                                    <div className="col-span-3 text-right">Realizado</div>
                                </div>
                                {strategistDetailData.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 items-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                                        <div className="col-span-6">
                                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase">{item.name}</span>
                                            <div className="text-[9px] font-bold text-slate-400 mt-0.5">{item.count} atendimentos concluídos</div>
                                        </div>
                                        <div className="col-span-3 text-right text-[10px] font-mono font-bold text-slate-500 italic">
                                            {formatCurrency(item.forecast)}
                                        </div>
                                        <div className="col-span-3 text-right text-[12px] font-mono font-black text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(item.realized)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 border-t dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 flex justify-end">
                            <button
                                onClick={() => setIsStrategistDetailModalOpen(false)}
                                className="px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
                            >
                                Fechar Detalhamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

