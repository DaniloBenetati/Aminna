
import React, { useState, useMemo } from 'react';
import {
    DollarSign, Download, FileText, Filter, Calendar,
    TrendingUp, Users, Wallet, Printer, ArrowUpCircle,
    ArrowDownCircle, AlertTriangle, BarChart3, Target, Calculator, Files,
    Plus, Minus, Save, X, Edit2, Trash2, CheckCircle2, List, AlertCircle, ArrowRight, Clock,
    ShoppingBag, Sparkles, MessageCircle, Lock, PenTool, FolderPlus, ChevronLeft, ChevronRight, CalendarRange, ChevronDown, ChevronUp,
    Paperclip, Stamp, ShieldCheck, Share2, Copy, Send, Search, Calculator as CalcIcon, Percent, Info
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { PROVIDERS, CUSTOMERS, STOCK } from '../constants';
import { Service, FinancialTransaction, Expense, Appointment, Sale, ExpenseCategory } from '../types';

const toLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- MOCK DATA GENERATOR FOR OPERATIONAL EXPENSES ---
const generateMockExpenses = (): Expense[] => {
    const expenses: Expense[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const getDate = (day: number, monthOffset: number = 0) => {
        const d = new Date(currentYear, currentMonth + monthOffset, day);
        return d.toISOString().split('T')[0];
    };

    [0, 1].forEach(offset => {
        expenses.push(
            { id: `fix-rent-${offset}`, description: 'Aluguel do Espaço', category: 'Aluguel', subcategory: 'Predial', dreClass: 'EXPENSE_ADM', amount: 3500.00, date: getDate(5, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Transferência' },
            { id: `fix-net-${offset}`, description: 'Internet Fibra', category: 'Infraestrutura', subcategory: 'Internet', dreClass: 'EXPENSE_ADM', amount: 120.00, date: getDate(10, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Boleto' },
            { id: `fix-soft-${offset}`, description: 'Sistema de Gestão (SaaS)', category: 'Software', subcategory: 'Licenças', dreClass: 'EXPENSE_ADM', amount: 199.90, date: getDate(1, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Cartão' },
            { id: `fix-acc-${offset}`, description: 'Contabilidade Mensal', category: 'Serviços Terceiros', subcategory: 'Contábil', dreClass: 'EXPENSE_ADM', amount: 600.00, date: getDate(20, offset), status: offset === 0 ? 'Pendente' : 'Pendente', paymentMethod: 'Boleto' },
            { id: `fix-energy-${offset}`, description: 'Energia Elétrica', category: 'Infraestrutura', subcategory: 'Energia', dreClass: 'EXPENSE_ADM', amount: 450.00, date: getDate(15, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Pix' },
            { id: `fix-water-${offset}`, description: 'Água / Saneamento', category: 'Infraestrutura', subcategory: 'Água', dreClass: 'EXPENSE_ADM', amount: 180.00, date: getDate(15, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Pix' },
            { id: `fix-clean-${offset}-1`, description: 'Faxina Semanal', category: 'Limpeza', subcategory: 'Serviços', dreClass: 'EXPENSE_ADM', amount: 150.00, date: getDate(7, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Dinheiro' },
            { id: `fix-clean-${offset}-2`, description: 'Faxina Semanal', category: 'Limpeza', subcategory: 'Serviços', dreClass: 'EXPENSE_ADM', amount: 150.00, date: getDate(14, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Dinheiro' },
            { id: `fix-clean-${offset}-3`, description: 'Faxina Semanal', category: 'Limpeza', subcategory: 'Serviços', dreClass: 'EXPENSE_ADM', amount: 150.00, date: getDate(21, offset), status: offset === 0 ? 'Pendente' : 'Pendente', paymentMethod: 'Dinheiro' },
            { id: `fix-clean-${offset}-4`, description: 'Faxina Semanal', category: 'Limpeza', subcategory: 'Serviços', dreClass: 'EXPENSE_ADM', amount: 150.00, date: getDate(28, offset), status: offset === 0 ? 'Pendente' : 'Pendente', paymentMethod: 'Dinheiro' }
        );
    });

    expenses.push(
        { id: 'var-mat-1', description: 'Reposição Esmaltes', category: 'Materiais', subcategory: 'Esmaltes', dreClass: 'COSTS', amount: 450.00, date: getDate(3), status: 'Pago', paymentMethod: 'Cartão' },
        { id: 'var-mkt-1', description: 'Impulsionar Instagram', category: 'Marketing', subcategory: 'Ads', dreClass: 'EXPENSE_SALES', amount: 300.00, date: getDate(12), status: 'Pago', paymentMethod: 'Cartão' },
        { id: 'var-coffee', description: 'Cápsulas de Café/Água', category: 'Copa/Cozinha', subcategory: 'Consumo', dreClass: 'EXPENSE_ADM', amount: 180.00, date: getDate(8), status: 'Pago', paymentMethod: 'Dinheiro' },
        { id: 'var-maint', description: 'Conserto Ar Condicionado', category: 'Manutenção', subcategory: 'Reparos', dreClass: 'EXPENSE_ADM', amount: 250.00, date: getDate(18), status: 'Pendente', paymentMethod: 'Pix' }
    );

    return expenses;
};

// --- DAILY CLOSE COMPONENT ---
interface DailyCloseViewProps {
    transactions: FinancialTransaction[];
    physicalCash: string;
    setPhysicalCash: (v: string) => void;
    closingObservation: string;
    setClosingObservation: (v: string) => void;
    closerName: string;
    setCloserName: (v: string) => void;
}

const DailyCloseView: React.FC<DailyCloseViewProps> = ({
    transactions, physicalCash, setPhysicalCash, closingObservation, setClosingObservation, closerName, setCloserName
}) => {
    const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

    const todayStr = new Date().toISOString().split('T')[0];

    const dailyTrans = transactions.filter(t => t.date === todayStr);
    const dailyRevenueTransactions = dailyTrans.filter(t => t.type === 'RECEITA' && t.status === 'Pago');

    const totalServices = dailyRevenueTransactions.filter(t => t.origin === 'Serviço').reduce((acc, t) => acc + t.amount, 0);
    const totalProducts = dailyRevenueTransactions.filter(t => t.origin === 'Produto').reduce((acc, t) => acc + t.amount, 0);
    const totalRevenue = totalServices + totalProducts;

    const paymentBreakdown = dailyRevenueTransactions.reduce((acc: Record<string, { count: number; amount: number }>, t) => {
        const method = t.paymentMethod;
        if (!acc[method]) {
            acc[method] = { count: 0, amount: 0 };
        }
        acc[method].count += 1;
        acc[method].amount += t.amount;
        return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const systemCashTotal = paymentBreakdown['Dinheiro']?.amount || 0;
    const physicalCashNum = parseFloat(physicalCash || '0');
    const cashDifference = physicalCashNum - systemCashTotal;
    const hasDifference = Math.abs(cashDifference) > 0.01;
    const revisedRevenue = totalRevenue + cashDifference;

    const handlePrintClosingReport = () => {
        const printContent = `
            <html>
            <head>
                <title>Fechamento de Caixa - ${new Date().toLocaleDateString('pt-BR')}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; color: #000; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                    h1 { font-size: 18px; margin: 0; font-weight: bold; }
                    .section { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
                    .total { font-weight: bold; font-size: 14px; margin-top: 5px; }
                    .diff-box { border: 1px solid #000; padding: 5px; margin-top: 10px; text-align: center; font-weight: bold; }
                    table { width: 100%; font-size: 10px; border-collapse: collapse; margin-top: 5px; }
                    th { text-align: left; border-bottom: 1px dashed #000; padding: 2px; }
                    td { padding: 2px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>AMINNA HOME NAIL GEL</h1>
                    <p>FECHAMENTO DE CAIXA</p>
                    <p>${new Date().toLocaleString('pt-BR')}</p>
                </div>
                <div class="section">
                    <div class="row"><span>SERVIÇOS:</span> <span>R$ ${totalServices.toFixed(2)}</span></div>
                    <div class="row"><span>PRODUTOS:</span> <span>R$ ${totalProducts.toFixed(2)}</span></div>
                    <div class="row total"><span>FATURAMENTO BRUTO:</span> <span>R$ ${totalRevenue.toFixed(2)}</span></div>
                </div>
                <div class="section">
                    <div style="font-weight:bold; margin-bottom:5px; font-size:12px;">DETALHAMENTO POR MÉTODO:</div>
                    ${Object.entries(paymentBreakdown).map(([method, data]) => {
            const d = data as { count: number; amount: number };
            return `<div class="row"><span>${method.toUpperCase()} (${d.count}x):</span><span>R$ ${d.amount.toFixed(2)}</span></div>`
        }).join('')}
                </div>
                <div class="section">
                    <div style="font-weight:bold; margin-bottom:5px; font-size:12px;">EXTRATO DE TRANSAÇÕES:</div>
                    <table>
                        <thead><tr><th>DESCRIÇÃO / CLIENTE</th><th>PAGTO</th><th style="text-align:right">VALOR</th></tr></thead>
                        <tbody>${dailyRevenueTransactions.map(t => `<tr><td>${t.description}<br/><span style="font-size:8px;">${t.customerOrProviderName || ''}</span></td><td style="text-align:center">${t.paymentMethod}</td><td style="text-align:right">${t.amount.toFixed(2)}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
                <div class="section">
                    <div style="font-weight:bold; margin-bottom:5px; font-size:12px;">CONFERÊNCIA (DINHEIRO):</div>
                    <div class="row"><span>SISTEMA:</span> <span>R$ ${systemCashTotal.toFixed(2)}</span></div>
                    <div class="row"><span>FÍSICO (GAVETA):</span> <span>R$ ${physicalCashNum.toFixed(2)}</span></div>
                    <div class="diff-box">DIFERENÇA: R$ ${cashDifference.toFixed(2)}${hasDifference ? '<br/>(QUEBRA/SOBRA)' : '<br/>(CAIXA BATIDO)'}</div>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    return (
        <div className="space-y-4 animate-in slide-in-from-right duration-300 relative">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
                <div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2"><Lock size={20} className="text-indigo-600 dark:text-indigo-400" /> Fechamento de Caixa</h3><p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mt-0.5">Ref: {new Date().toLocaleDateString('pt-BR')}</p></div>
                <div className="flex flex-col sm:flex-row gap-6 text-right"><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturamento Bruto</p><p className="text-2xl font-black text-slate-950 dark:text-white">R$ {totalRevenue.toFixed(2)}</p></div><div className="border-l border-slate-200 dark:border-zinc-800 pl-6"><p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center justify-end gap-1">Receita Revisada <CheckCircle2 size={10} /></p><p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">R$ {revisedRevenue.toFixed(2)}</p></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3"><div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl"><Sparkles size={20} /></div><div><p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Serviços</p><p className="text-lg font-black text-slate-950 dark:text-white">R$ {totalServices.toFixed(2)}</p></div></div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3"><div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><ShoppingBag size={20} /></div><div><p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Produtos</p><p className="text-lg font-black text-slate-950 dark:text-white">R$ {totalProducts.toFixed(2)}</p></div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50"><h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><Wallet size={14} /> Detalhamento</h4></div>
                    <div className="p-2 overflow-y-auto max-h-[350px]">
                        {Object.entries(paymentBreakdown).map(([method, data]) => {
                            const d = data as { count: number; amount: number };
                            const isExpanded = expandedMethod === method;
                            return (
                                <div key={method} className="border-b border-slate-50 dark:border-zinc-800 last:border-none">
                                    <div onClick={() => setExpandedMethod(isExpanded ? null : method)} className={`flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer rounded-xl transition-all ${isExpanded ? 'bg-slate-50 dark:bg-zinc-800' : ''}`}>
                                        <div className="flex items-center gap-3"><div className="bg-slate-100 dark:bg-zinc-700 p-1.5 rounded-lg text-slate-600 dark:text-slate-400"><DollarSign size={14} /></div><div><p className="text-[11px] font-black text-slate-950 dark:text-white uppercase">{method}</p><p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{d.count} Transações</p></div></div>
                                        <div className="flex items-center gap-2"><span className="text-xs font-black text-slate-950 dark:text-white">R$ {d.amount.toFixed(2)}</span>{isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}</div>
                                    </div>
                                    {isExpanded && (
                                        <div className="bg-slate-50/80 dark:bg-zinc-800/80 p-2 mx-2 mb-2 rounded-b-xl animate-in slide-in-from-top-2 duration-200">
                                            {dailyRevenueTransactions.filter(t => t.paymentMethod === method).map((t, idx) => (
                                                <div key={t.id || idx} className="flex justify-between items-center p-2 border-b border-slate-100 dark:border-zinc-700 last:border-none text-[10px]">
                                                    <div className="flex flex-col"><span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{t.description.split(' - ')[0]}</span>{t.customerOrProviderName && <span className="text-slate-400 dark:text-slate-500 uppercase text-[9px]">{t.customerOrProviderName}</span>}</div>
                                                    <span className="font-black text-emerald-700 dark:text-emerald-400">R$ {t.amount.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50"><h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><PenTool size={14} /> Conferência</h4></div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Valor em Dinheiro (Físico)</label>
                            <div className="flex items-center gap-3"><div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span><input type="number" className={`w-full pl-8 pr-3 py-2 border-2 rounded-xl text-sm font-black outline-none text-slate-950 dark:text-white ${hasDifference ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800'}`} value={physicalCash} onChange={e => setPhysicalCash(e.target.value)} /></div></div>
                        </div>
                        <div className={`p-3 rounded-xl border flex justify-between items-center ${hasDifference ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-800' : 'bg-slate-50 dark:bg-zinc-800 text-slate-500'}`}><span className="text-[9px] font-black uppercase">{hasDifference ? 'Diferença no Caixa' : 'Caixa Batido'}</span><span className="text-sm font-black">R$ {cashDifference.toFixed(2)}</span></div>
                        <div className="grid grid-cols-2 gap-2 pt-1"><button onClick={handlePrintClosingReport} className="py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Printer size={14} /> Relatório</button></div>
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
}

export const Finance: React.FC<FinanceProps> = ({ services, appointments, sales, expenseCategories = [], setExpenseCategories }) => {
    const [activeTab, setActiveTab] = useState<'DETAILED' | 'PAYABLES' | 'PETTY_CASH' | 'DAILY' | 'DRE'>('DETAILED');
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('month');
    const [dateRef, setDateRef] = useState(new Date());
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    });

    // Drill Down State for DRE
    const [expandedSections, setExpandedSections] = useState<string[]>(['gross']);

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const { startDate, endDate } = useMemo(() => {
        let start = new Date();
        let end = new Date();
        if (timeView === 'day') { start = new Date(dateRef); end = new Date(dateRef); }
        else if (timeView === 'month') { start = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1); end = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0); }
        else if (timeView === 'year') { start = new Date(dateRef.getFullYear(), 0, 1); end = new Date(dateRef.getFullYear(), 11, 31); }
        else if (timeView === 'custom') return { startDate: customRange.start, endDate: customRange.end };
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    }, [timeView, dateRef, customRange]);

    const navigateDate = (direction: 'prev' | 'next') => {
        if (timeView === 'custom') return;
        const newDate = new Date(dateRef);
        const modifier = direction === 'next' ? 1 : -1;
        if (timeView === 'day') newDate.setDate(dateRef.getDate() + modifier);
        else if (timeView === 'month') newDate.setMonth(dateRef.getMonth() + modifier);
        else if (timeView === 'year') newDate.setFullYear(dateRef.getFullYear() + modifier);
        setDateRef(newDate);
    };

    const getDateLabel = () => {
        if (timeView === 'custom') return "Período Personalizado";
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return dateRef.getFullYear().toString();
    };

    const [expenses, setExpenses] = useState<Expense[]>(generateMockExpenses());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    // Removed local categories state
    // const [categories, setCategories] = ... -> REMOVED
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({ description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix' });
    const [physicalCash, setPhysicalCash] = useState<string>('');
    const [closingObservation, setClosingObservation] = useState('');
    const [closerName, setCloserName] = useState('Gerente / Recepção');

    const transactions: FinancialTransaction[] = useMemo(() => {
        const allTrans: FinancialTransaction[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        appointments.forEach(app => {
            if (app.status === 'Cancelado') return;
            const service = services.find(s => s.id === app.serviceId);
            const customer = CUSTOMERS.find(c => c.id === app.customerId);
            const provider = PROVIDERS.find(p => p.id === app.providerId);
            const price = app.pricePaid || app.bookedPrice || service?.price || 0;
            const transactionDate = (app.status === 'Concluído' && app.paymentDate) ? app.paymentDate : app.date;

            allTrans.push({
                id: `app-${app.id}`,
                date: transactionDate,
                type: 'RECEITA',
                category: 'Serviço',
                description: `${service?.name || 'Serviço'} - ${customer?.name}`,
                amount: price,
                status: app.status === 'Concluído' ? 'Pago' : (app.date < todayStr ? 'Atrasado' : 'Previsto'),
                paymentMethod: app.paymentMethod || 'Pix',
                origin: 'Serviço',
                customerOrProviderName: customer?.name || 'Cliente'
            });

            if (provider) {
                const rate = app.commissionRateSnapshot ?? provider.commissionRate;
                allTrans.push({
                    id: `comm-${app.id}`,
                    date: transactionDate,
                    type: 'DESPESA',
                    category: 'Comissão',
                    description: `Repasse - ${provider.name.split(' ')[0]} (${(rate * 100).toFixed(0)}%)`,
                    amount: price * rate,
                    status: app.status === 'Concluído' ? (app.date < todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                    paymentMethod: 'Transferência',
                    origin: 'Outro',
                    customerOrProviderName: provider.name
                });
            }
        });

        sales.forEach(sale => {
            allTrans.push({
                id: `sale-${sale.id}`,
                date: sale.date,
                type: 'RECEITA',
                category: 'Produto',
                description: 'Venda de Produto',
                amount: sale.totalPrice,
                status: 'Pago',
                paymentMethod: sale.paymentMethod || 'Dinheiro',
                origin: 'Produto',
                customerOrProviderName: 'Cliente Balcão'
            });
        });

        expenses.forEach(exp => {
            allTrans.push({ id: exp.id, date: exp.date, type: 'DESPESA', category: exp.category, description: exp.description, amount: exp.amount, status: exp.status === 'Pago' ? 'Pago' : 'Pendente', paymentMethod: exp.paymentMethod, origin: 'Despesa' });
        });

        return allTrans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [services, expenses, appointments, sales]);

    const filteredTransactions = useMemo(() => transactions.filter(t => t.date >= startDate && t.date <= endDate), [transactions, startDate, endDate]);

    const dreData = useMemo(() => {
        const apps = appointments.filter(a => a.date >= startDate && a.date <= endDate && a.status === 'Concluído');
        const sls = sales.filter(s => s.date >= startDate && s.date <= endDate);
        const exps = expenses.filter(e => e.date >= startDate && e.date <= endDate);

        // 1. Receita Bruta
        const revenueServices = apps.reduce((acc, a) => acc + (a.pricePaid || 0), 0);
        const revenueProducts = sls.reduce((acc, s) => acc + s.totalPrice, 0);
        const grossRevenue = revenueServices + revenueProducts;

        // 2. (-) Deduções
        // Auto-calc from settings (approx 6%) PLUS any manual deductions logged
        const manualDeductions = exps.filter(e => e.dreClass === 'DEDUCTION').reduce((acc, e) => acc + e.amount, 0);
        const autoDeductions = grossRevenue * 0.06;
        const deductions = autoDeductions + manualDeductions;

        // 3. (=) Receita Líquida
        const netRevenue = grossRevenue - deductions;

        // 4. (-) CPV / CMV
        const commissions = apps.reduce((acc, a) => {
            const provider = PROVIDERS.find(p => p.id === a.providerId);
            const rate = a.commissionRateSnapshot ?? provider?.commissionRate ?? 0;
            return acc + ((a.pricePaid || 0) * rate);
        }, 0);

        const productCOGS = sls.reduce((acc, s) => {
            const stockItem = STOCK.find(item => item.id === s.productId);
            return acc + (s.quantity * (stockItem?.costPrice || 0));
        }, 0);

        const manualCosts = exps.filter(e => e.dreClass === 'COSTS').reduce((acc, e) => acc + e.amount, 0);
        const totalCOGS = commissions + productCOGS + manualCosts;

        // 5. (=) Lucro Bruto
        const grossProfit = netRevenue - totalCOGS;

        // 6. (=) Despesas Operacionais - Aggregated by dreClass
        const expensesVendas = exps.filter(e => e.dreClass === 'EXPENSE_SALES');
        const expensesAdm = exps.filter(e => e.dreClass === 'EXPENSE_ADM');
        const expensesFin = exps.filter(e => e.dreClass === 'EXPENSE_FIN');

        const amountVendas = expensesVendas.reduce((acc, e) => acc + e.amount, 0);
        const amountAdm = expensesAdm.reduce((acc, e) => acc + e.amount, 0);
        const amountFin = expensesFin.reduce((acc, e) => acc + e.amount, 0);

        const totalOpExpenses = amountVendas + amountAdm + amountFin;

        // 7. (=) Resultado Antes IRPJ CSLL
        const resultBeforeTaxes = grossProfit - totalOpExpenses;

        // 8. (-) Provisões IRPJ e CSLL
        const irpjCsll = exps.filter(e => e.dreClass === 'TAX').reduce((acc, e) => acc + e.amount, 0);

        // 9. (=) Resultado Líquido
        const netResult = resultBeforeTaxes - irpjCsll;

        return {
            grossRevenue, revenueServices, revenueProducts,
            deductions,
            netRevenue,
            commissions, productCOGS, totalCOGS,
            grossProfit,
            amountVendas, amountAdm, amountFin, totalOpExpenses,
            resultBeforeTaxes,
            irpjCsll,
            netResult,
            breakdownVendas: expensesVendas,
            breakdownAdm: expensesAdm,
            breakdownFin: expensesFin
        };
    }, [appointments, sales, expenses, startDate, endDate]);

    const handleOpenModal = (expense?: Expense) => {
        if (expense) { setEditingExpenseId(expense.id); setExpenseForm(expense); }
        else { setEditingExpenseId(null); setExpenseForm({ description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix' }); }
        setIsModalOpen(true);
    };

    const handleSaveExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) return;
        // Logic to add to categories removed as it's now in Settings
        if (editingExpenseId) setExpenses(prev => prev.map(ex => ex.id === editingExpenseId ? { ...ex, ...expenseForm } as Expense : ex));
        else setExpenses(prev => [...prev, { ...expenseForm, id: `exp-${Date.now()}` } as Expense]);
        setIsModalOpen(false);
    };

    const toggleExpenseStatus = (id: string) => {
        setExpenses(prev => prev.map(exp => {
            if (exp.id === id) {
                const newStatus = exp.status === 'Pago' ? 'Pendente' : 'Pago';
                return { ...exp, status: newStatus, date: newStatus === 'Pago' ? toLocalDateStr(new Date()) : exp.date };
            }
            return exp;
        }));
    };

    const handlePrintDRE = () => {
        const formatPercent = (val: number, total: number) => ((val / total) * 100 || 0).toFixed(1) + '%';
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
                        <tr class="main-row"><td>1. RECEITA BRUTA</td><td class="amount positive">R$ ${dreData.grossRevenue.toFixed(2)}</td><td class="amount">100.0%</td></tr>
                        <tr class="sub-row"><td>Serviços</td><td class="amount">R$ ${dreData.revenueServices.toFixed(2)}</td><td class="amount">${formatPercent(dreData.revenueServices, dreData.grossRevenue)}</td></tr>
                        <tr class="sub-row"><td>Produtos (Revenda)</td><td class="amount">R$ ${dreData.revenueProducts.toFixed(2)}</td><td class="amount">${formatPercent(dreData.revenueProducts, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>2. (-) DEDUÇÕES E IMPOSTOS</td><td class="amount negative">- R$ ${dreData.deductions.toFixed(2)}</td><td class="amount">${formatPercent(dreData.deductions, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>3. (=) RECEITA LÍQUIDA</td><td class="amount">R$ ${dreData.netRevenue.toFixed(2)}</td><td class="amount">${formatPercent(dreData.netRevenue, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>4. (-) CPV / CMV</td><td class="amount negative">- R$ ${dreData.totalCOGS.toFixed(2)}</td><td class="amount">${formatPercent(dreData.totalCOGS, dreData.grossRevenue)}</td></tr>
                        <tr class="sub-row"><td>Comissões Técnica</td><td class="amount">R$ ${dreData.commissions.toFixed(2)}</td><td class="amount">${formatPercent(dreData.commissions, dreData.grossRevenue)}</td></tr>
                        <tr class="sub-row"><td>Custo de Produtos</td><td class="amount">R$ ${dreData.productCOGS.toFixed(2)}</td><td class="amount">${formatPercent(dreData.productCOGS, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>5. (=) LUCRO BRUTO</td><td class="amount positive">R$ ${dreData.grossProfit.toFixed(2)}</td><td class="amount">${formatPercent(dreData.grossProfit, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>6. (-) DESPESAS COM VENDAS</td><td class="amount negative">- R$ ${dreData.amountVendas.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountVendas, dreData.grossRevenue)}</td></tr>
                        ${dreData.breakdownVendas.map(e => `<tr class="sub-row"><td>${e.description}</td><td class="amount">R$ ${e.amount.toFixed(2)}</td><td class="amount">${formatPercent(e.amount, dreData.grossRevenue)}</td></tr>`).join('')}
                        
                        <tr><td>7. (-) DESPESAS ADMINISTRATIVAS</td><td class="amount negative">- R$ ${dreData.amountAdm.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountAdm, dreData.grossRevenue)}</td></tr>
                         ${dreData.breakdownAdm.map(e => `<tr class="sub-row"><td>${e.description}</td><td class="amount">R$ ${e.amount.toFixed(2)}</td><td class="amount">${formatPercent(e.amount, dreData.grossRevenue)}</td></tr>`).join('')}

                        <tr><td>8. (-) DESPESAS FINANCEIRAS</td><td class="amount negative">- R$ ${dreData.amountFin.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountFin, dreData.grossRevenue)}</td></tr>
                         ${dreData.breakdownFin.map(e => `<tr class="sub-row"><td>${e.description}</td><td class="amount">R$ ${e.amount.toFixed(2)}</td><td class="amount">${formatPercent(e.amount, dreData.grossRevenue)}</td></tr>`).join('')}

                        <tr class="main-row"><td>9. (=) RESULTADO ANTES IRPJ/CSLL</td><td class="amount">R$ ${dreData.resultBeforeTaxes.toFixed(2)}</td><td class="amount">${formatPercent(dreData.resultBeforeTaxes, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>10. (-) PROVISÕES IRPJ/CSLL</td><td class="amount negative">- R$ ${dreData.irpjCsll.toFixed(2)}</td><td class="amount">${formatPercent(dreData.irpjCsll, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="result-row"><td>11. (=) RESULTADO LÍQUIDO</td><td class="amount">R$ ${dreData.netResult.toFixed(2)}</td><td class="amount">${formatPercent(dreData.netResult, dreData.grossRevenue)}</td></tr>
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
        const formatPercent = (val: number, total: number) => ((val / total) * 100 || 0).toFixed(1) + '%';
        const rows = [
            ['DRE - Demonstrativo de Resultado', `Período: ${getDateLabel()}`],
            ['Gerado em', new Date().toLocaleString('pt-BR')],
            [],
            ['Descrição', 'Valor (R$)', 'AV%'],
            ['1. RECEITA BRUTA', dreData.grossRevenue.toFixed(2), '100.0%'],
            ['   Serviços', dreData.revenueServices.toFixed(2), formatPercent(dreData.revenueServices, dreData.grossRevenue)],
            ['   Produtos', dreData.revenueProducts.toFixed(2), formatPercent(dreData.revenueProducts, dreData.grossRevenue)],
            ['2. (-) DEDUÇÕES', `-${dreData.deductions.toFixed(2)}`, formatPercent(dreData.deductions, dreData.grossRevenue)],
            ['3. (=) RECEITA LÍQUIDA', dreData.netRevenue.toFixed(2), formatPercent(dreData.netRevenue, dreData.grossRevenue)],
            ['4. (-) CPV / CMV', `-${dreData.totalCOGS.toFixed(2)}`, formatPercent(dreData.totalCOGS, dreData.grossRevenue)],
            ['   Comissões', `-${dreData.commissions.toFixed(2)}`, formatPercent(dreData.commissions, dreData.grossRevenue)],
            ['   Custo Produtos', `-${dreData.productCOGS.toFixed(2)}`, formatPercent(dreData.productCOGS, dreData.grossRevenue)],
            ['5. (=) LUCRO BRUTO', dreData.grossProfit.toFixed(2), formatPercent(dreData.grossProfit, dreData.grossRevenue)],
            ['6. (-) DESPESAS VENDAS', `-${dreData.amountVendas.toFixed(2)}`, formatPercent(dreData.amountVendas, dreData.grossRevenue)],
            ...dreData.breakdownVendas.map(e => [`   ${e.description}`, `-${e.amount.toFixed(2)}`, formatPercent(e.amount, dreData.grossRevenue)]),
            ['7. (-) DESPESAS ADM', `-${dreData.amountAdm.toFixed(2)}`, formatPercent(dreData.amountAdm, dreData.grossRevenue)],
            ...dreData.breakdownAdm.map(e => [`   ${e.description}`, `-${e.amount.toFixed(2)}`, formatPercent(e.amount, dreData.grossRevenue)]),
            ['8. (-) DESPESAS FIN', `-${dreData.amountFin.toFixed(2)}`, formatPercent(dreData.amountFin, dreData.grossRevenue)],
            ...dreData.breakdownFin.map(e => [`   ${e.description}`, `-${e.amount.toFixed(2)}`, formatPercent(e.amount, dreData.grossRevenue)]),
            ['9. (=) RESULTADO ANTES IRPJ', dreData.resultBeforeTaxes.toFixed(2), formatPercent(dreData.resultBeforeTaxes, dreData.grossRevenue)],
            ['10. (-) IRPJ/CSLL', `-${dreData.irpjCsll.toFixed(2)}`, formatPercent(dreData.irpjCsll, dreData.grossRevenue)],
            ['11. (=) RESULTADO LÍQUIDO', dreData.netResult.toFixed(2), formatPercent(dreData.netResult, dreData.grossRevenue)]
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

    return (
        <div className="space-y-4 md:space-y-6 relative h-full flex flex-col pb-24 md:pb-8 text-slate-900 dark:text-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div><h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight">Gestão Financeira</h2><p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Controle total e sincronizado</p></div>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide w-full xl:w-auto">
                    {[
                        { id: 'DETAILED', label: 'Extrato / Fluxo', icon: List },
                        { id: 'PAYABLES', label: 'Contas a Pagar', icon: FileText },
                        { id: 'DAILY', label: 'Caixa Diário', icon: ArrowDownCircle },
                        { id: 'DRE', label: 'DRE', icon: CalcIcon },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 md:flex-none min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><tab.icon size={14} /> {tab.label}</button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto items-center">
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button key={v} onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}</button>
                        ))}
                    </div>
                    {timeView !== 'custom' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between"><button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button><span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span><button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button></div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {activeTab === 'DETAILED' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                            <div>
                                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><List size={16} /> Extrato de Fluxo Financeiro</h3>
                                <p className="text-[9px] text-slate-500 uppercase mt-0.5">Listagem de todas as entradas e saídas no período</p>
                            </div>
                            <button className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Printer size={16} /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-200 dark:border-zinc-700">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Origem</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Pagamento</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                    {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group text-sm">
                                            <td className="px-6 py-4 text-xs font-bold font-mono text-slate-500 whitespace-nowrap">
                                                {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
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
                                                {t.type === 'DESPESA' ? '-' : '+'} R$ {t.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-20 text-center opacity-30">
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
                {activeTab === 'DAILY' && <DailyCloseView transactions={transactions} physicalCash={physicalCash} setPhysicalCash={setPhysicalCash} closingObservation={closingObservation} setClosingObservation={setClosingObservation} closerName={closerName} setCloserName={setCloserName} />}
                {activeTab === 'PAYABLES' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50"><h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><ArrowDownCircle size={16} /> Contas a Pagar</h3><button onClick={() => handleOpenModal()} className="text-[10px] font-black uppercase text-white bg-black dark:bg-white dark:text-black px-4 py-2 rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition-all"><Plus size={12} /> Lançar Despesa</button></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Categoria</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Valor</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                    {expenses.map(exp => (
                                        <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-bold font-mono">{new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td className="px-6 py-4 font-black text-xs uppercase">{exp.description}</td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">{exp.category}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => toggleExpenseStatus(exp.id)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${exp.status === 'Pago' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'}`}>{exp.status}</button>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-rose-700 dark:text-rose-400">R$ {exp.amount.toFixed(2)}</td>
                                            <td className="px-6 py-4 flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(exp)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                <button onClick={() => { if (confirm('Excluir esta despesa?')) setExpenses(prev => prev.filter(e => e.id !== exp.id)) }} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'DRE' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                            <div>
                                <h3 className="font-black text-base uppercase tracking-widest flex items-center gap-2"><CalcIcon size={20} className="text-indigo-600" /> DRE - Demonstrativo de Resultado</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Análise detalhada de performance financeira no período</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handlePrintDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Printer size={18} /></button>
                                <button onClick={handleDownloadDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Download size={18} /></button>
                            </div>
                        </div>

                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                                    <tr className="text-[10px] font-black uppercase text-slate-500">
                                        <th className="px-8 py-4">Categorização Financeira</th>
                                        <th className="px-8 py-4 text-right">Valor (R$)</th>
                                        <th className="px-8 py-4 text-right">AV%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                                    {/* 1. RECEITA BRUTA */}
                                    <tr onClick={() => toggleSection('gross')} className="bg-indigo-50/20 dark:bg-indigo-900/10 cursor-pointer hover:bg-indigo-100/30 transition-colors">
                                        <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase flex items-center gap-2">
                                            {expandedSections.includes('gross') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            1. RECEITA BRUTA
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.grossRevenue.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">100.0%</td>
                                    </tr>
                                    {expandedSections.includes('gross') && (
                                        <>
                                            <tr className="animate-in slide-in-from-top-1 duration-200">
                                                <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic">└ Serviços</td>
                                                <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">R$ {dreData.revenueServices.toFixed(2)}</td>
                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.revenueServices / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                            </tr>
                                            <tr className="animate-in slide-in-from-top-1 duration-200">
                                                <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic">└ Produtos</td>
                                                <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">R$ {dreData.revenueProducts.toFixed(2)}</td>
                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.revenueProducts / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                            </tr>
                                        </>
                                    )}

                                    {/* 2. DEDUÇÕES */}
                                    <tr>
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase pl-12 flex items-center gap-2">2. (-) DEDUÇÕES E ABATIMENTOS (IMPOSTOS/TAXAS)</td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.deductions.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.deductions / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>

                                    {/* 3. RECEITA LÍQUIDA */}
                                    <tr className="bg-slate-50 dark:bg-zinc-800/50">
                                        <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase">3. (=) RECEITA LÍQUIDA</td>
                                        <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.netRevenue.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">{((dreData.netRevenue / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>

                                    {/* 4. CPV/CMV */}
                                    <tr onClick={() => toggleSection('cogs')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2">
                                            {expandedSections.includes('cogs') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            4. (-) CPV / CMV (CUSTOS DIRETOS)
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.totalCOGS.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.totalCOGS / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                    {expandedSections.includes('cogs') && (
                                        <>
                                            <tr className="animate-in slide-in-from-top-1 duration-200">
                                                <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ Comissões (Técnica)</td>
                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {dreData.commissions.toFixed(2)}</td>
                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.commissions / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                            </tr>
                                            <tr className="animate-in slide-in-from-top-1 duration-200">
                                                <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ Custo Mercadoria Vendida</td>
                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {dreData.productCOGS.toFixed(2)}</td>
                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.productCOGS / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                            </tr>
                                        </>
                                    )}

                                    {/* 5. LUCRO BRUTO */}
                                    <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                                        <td className="px-8 py-4 font-black text-sm text-emerald-800 dark:text-emerald-400 uppercase">5. (=) LUCRO BRUTO</td>
                                        <td className="px-8 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400">R$ {dreData.grossProfit.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right font-black text-[10px] text-emerald-600/50">{((dreData.grossProfit / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>

                                    {/* 6. DESPESAS COM VENDAS */}
                                    <tr onClick={() => toggleSection('exp-vendas')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2">
                                            {expandedSections.includes('exp-vendas') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            6. (-) DESPESAS COM VENDAS
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountVendas.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.amountVendas / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                    {expandedSections.includes('exp-vendas') && dreData.breakdownVendas.map((e, idx) => (
                                        <tr key={e.id || idx} className="animate-in slide-in-from-top-1 duration-200">
                                            <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ {e.description}</td>
                                            <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {e.amount.toFixed(2)}</td>
                                            <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((e.amount / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                        </tr>
                                    ))}

                                    {/* 7. DESPESAS ADMINISTRATIVAS */}
                                    <tr onClick={() => toggleSection('exp-adm')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2">
                                            {expandedSections.includes('exp-adm') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            7. (-) DESPESAS ADMINISTRATIVAS
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountAdm.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.amountAdm / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                    {expandedSections.includes('exp-adm') && dreData.breakdownAdm.map((e, idx) => (
                                        <tr key={e.id || idx} className="animate-in slide-in-from-top-1 duration-200">
                                            <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ {e.description}</td>
                                            <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {e.amount.toFixed(2)}</td>
                                            <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((e.amount / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                        </tr>
                                    ))}

                                    {/* 8. DESPESAS FINANCEIRAS */}
                                    <tr onClick={() => toggleSection('exp-fin')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2">
                                            {expandedSections.includes('exp-fin') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            8. (-) DESPESAS FINANCEIRAS
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountFin.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.amountFin / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                    {expandedSections.includes('exp-fin') && dreData.breakdownFin.map((e, idx) => (
                                        <tr key={e.id || idx} className="animate-in slide-in-from-top-1 duration-200">
                                            <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ {e.description}</td>
                                            <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {e.amount.toFixed(2)}</td>
                                            <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((e.amount / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                        </tr>
                                    ))}

                                    {/* 9. RESULTADO ANTES IRPJ */}
                                    <tr className="bg-slate-100 dark:bg-zinc-800">
                                        <td className="px-8 py-4 font-black text-sm text-slate-800 dark:text-slate-200 uppercase">9. (=) RESULTADO ANTES IRPJ/CSLL</td>
                                        <td className="px-8 py-4 text-right font-black text-sm text-slate-800 dark:text-slate-200">R$ {dreData.resultBeforeTaxes.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-500">{((dreData.resultBeforeTaxes / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>

                                    {/* 10. PROVISÕES IRPJ */}
                                    <tr>
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase pl-12">10. (-) PROVISÕES IRPJ E CSLL</td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.irpjCsll.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.irpjCsll / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>

                                    {/* 11. RESULTADO LÍQUIDO */}
                                    <tr className={`bg-slate-900 text-white ${dreData.netResult < 0 ? 'bg-rose-900' : 'bg-slate-950'}`}>
                                        <td className="px-8 py-6 font-black text-lg uppercase tracking-tight flex items-center gap-3">
                                            <TrendingUp size={24} className={dreData.netResult >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                                            11. (=) RESULTADO LÍQUIDO
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-xl">R$ {dreData.netResult.toFixed(2)}</td>
                                        <td className="px-8 py-6 text-right font-black text-xs text-white/50">{((dreData.netResult / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-zinc-800/80 border-t border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Info size={14} /> Insights da Saúde Financeira</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Ponto de Equilíbrio</p>
                                        <p className="text-sm font-black text-slate-950 dark:text-white mt-1">R$ {(dreData.totalOpExpenses / (dreData.grossProfit / dreData.grossRevenue) || 0).toFixed(2)}</p>
                                        <p className="text-[8px] text-slate-400 font-bold mt-1">Faturamento mínimo para não ter prejuízo</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Margem de Lucro Final</p>
                                        <p className={`text-sm font-black mt-1 ${dreData.netResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {((dreData.netResult / dreData.grossRevenue) * 100 || 0).toFixed(1)}%
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-bold mt-1">Rentabilidade sobre as vendas</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><ArrowDownCircle size={18} /> {editingExpenseId ? 'Editar' : 'Nova'} Despesa</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Descrição do Gasto</label>
                                    <input type="text" placeholder="Ex: Conta de Luz" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Valor (R$)</label>
                                        <input type="number" step="0.01" placeholder="0.00" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Vencimento</label>
                                        <input type="date" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Categoria</label>
                                    <select className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Salvar Despesa</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
