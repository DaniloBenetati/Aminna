
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
import { Service, FinancialTransaction, Expense, Appointment, Sale, StockItem } from '../types';

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
            { id: `fix-rent-${offset}`, description: 'Aluguel do Espaço', category: 'Despesa Fixa', subcategory: 'Aluguel', amount: 3500.00, date: getDate(5, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Transferência' },
            { id: `fix-net-${offset}`, description: 'Internet Fibra', category: 'Despesa Fixa', subcategory: 'Infraestrutura', amount: 120.00, date: getDate(10, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Boleto' },
            { id: `fix-soft-${offset}`, description: 'Sistema de Gestão (SaaS)', category: 'Despesa Fixa', subcategory: 'Software', amount: 199.90, date: getDate(1, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Cartão' },
            { id: `fix-acc-${offset}`, description: 'Contabilidade Mensal', category: 'Despesa Fixa', subcategory: 'Serviços Terceiros', amount: 600.00, date: getDate(20, offset), status: offset === 0 ? 'Pendente' : 'Pendente', paymentMethod: 'Boleto' },
            { id: `fix-energy-${offset}`, description: 'Energia Elétrica', category: 'Despesa Fixa', subcategory: 'Infraestrutura', amount: 450.00, date: getDate(15, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Pix' },
            { id: `fix-water-${offset}`, description: 'Água / Saneamento', category: 'Despesa Fixa', subcategory: 'Infraestrutura', amount: 180.00, date: getDate(15, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Pix' },
            { id: `fix-clean-${offset}-1`, description: 'Faxina Semanal', category: 'Manutenção', subcategory: 'Limpeza', amount: 150.00, date: getDate(7, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Dinheiro' },
            { id: `fix-clean-${offset}-2`, description: 'Faxina Semanal', category: 'Manutenção', subcategory: 'Limpeza', amount: 150.00, date: getDate(14, offset), status: offset === 0 ? 'Pago' : 'Pendente', paymentMethod: 'Dinheiro' },
            { id: `fix-clean-${offset}-3`, description: 'Faxina Semanal', category: 'Manutenção', subcategory: 'Limpeza', amount: 150.00, date: getDate(21, offset), status: offset === 0 ? 'Pendente' : 'Pendente', paymentMethod: 'Dinheiro' },
            { id: `fix-clean-${offset}-4`, description: 'Faxina Semanal', category: 'Manutenção', subcategory: 'Limpeza', amount: 150.00, date: getDate(28, offset), status: offset === 0 ? 'Pendente' : 'Pendente', paymentMethod: 'Dinheiro' }
        );
    });

    expenses.push(
        { id: 'var-mat-1', description: 'Reposição Esmaltes', category: 'Despesa Variável', subcategory: 'Materiais', amount: 450.00, date: getDate(3), status: 'Pago', paymentMethod: 'Cartão' },
        { id: 'var-mkt-1', description: 'Impulsionar Instagram', category: 'Marketing', subcategory: 'Ads', amount: 300.00, date: getDate(12), status: 'Pago', paymentMethod: 'Cartão' },
        { id: 'var-coffee', description: 'Cápsulas de Café/Água', category: 'Despesa Variável', subcategory: 'Copa/Cozinha', amount: 180.00, date: getDate(8), status: 'Pago', paymentMethod: 'Dinheiro' },
        { id: 'var-maint', description: 'Conserto Ar Condicionado', category: 'Manutenção', subcategory: 'Reparos', amount: 250.00, date: getDate(18), status: 'Pendente', paymentMethod: 'Pix' }
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

export const Finance: React.FC<FinanceProps> = ({ services, appointments, sales }) => {
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
  const [categories, setCategories] = useState(['Despesa Fixa', 'Despesa Variável', 'Pessoal', 'Impostos', 'Marketing', 'Manutenção', 'Sangria/Retirada']);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({ description: '', amount: 0, category: 'Despesa Variável', subcategory: '', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix' });
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

    const revenueServices = apps.reduce((acc, a) => acc + (a.pricePaid || 0), 0);
    const revenueProducts = sls.reduce((acc, s) => acc + s.totalPrice, 0);
    const grossRevenue = revenueServices + revenueProducts;

    const estimatedTaxes = grossRevenue * 0.03;
    const netRevenue = grossRevenue - estimatedTaxes;

    const commissions = apps.reduce((acc, a) => {
        const provider = PROVIDERS.find(p => p.id === a.providerId);
        const rate = a.commissionRateSnapshot ?? provider?.commissionRate ?? 0;
        return acc + ((a.pricePaid || 0) * rate);
    }, 0);

    const productCOGS = sls.reduce((acc, s) => {
        const stockItem = STOCK.find(item => item.id === s.productId);
        return acc + (s.quantity * (stockItem?.costPrice || 0));
    }, 0);

    const totalCOGS = commissions + productCOGS;
    const grossProfit = netRevenue - totalCOGS;

    // Detailed Operating Expenses
    // Fix: explicitly type the accumulator for breakdown calculations
    const fixedBreakdown: Record<string, number> = exps.filter(e => e.category === 'Despesa Fixa').reduce((acc: Record<string, number>, e) => {
        const label = e.subcategory || e.description;
        acc[label] = (acc[label] || 0) + e.amount;
        return acc;
    }, {});

    const varBreakdown: Record<string, number> = exps.filter(e => e.category === 'Despesa Variável' || e.category === 'Marketing' || e.category === 'Manutenção').reduce((acc: Record<string, number>, e) => {
        const label = e.category;
        acc[label] = (acc[label] || 0) + e.amount;
        return acc;
    }, {});

    // Fix: cast Object.values to number[] to ensure reduce works correctly with numeric addition and avoid 'unknown' types
    const fixedExpenses = (Object.values(fixedBreakdown) as number[]).reduce((a, b) => a + b, 0);
    const variableExpenses = (Object.values(varBreakdown) as number[]).reduce((a, b) => a + b, 0);
    const totalOperatingExps = fixedExpenses + variableExpenses;

    const netProfit = grossProfit - totalOperatingExps;

    return {
        grossRevenue,
        revenueServices,
        revenueProducts,
        estimatedTaxes,
        netRevenue,
        commissions,
        productCOGS,
        totalCOGS,
        grossProfit,
        fixedExpenses,
        variableExpenses,
        totalOperatingExps,
        netProfit,
        fixedBreakdown,
        varBreakdown
    };
  }, [appointments, sales, expenses, startDate, endDate]);

  const handleOpenModal = (expense?: Expense) => {
      if (expense) { setEditingExpenseId(expense.id); setExpenseForm(expense); setIsCustomCategory(!categories.includes(expense.category)); }
      else { setEditingExpenseId(null); setExpenseForm({ description: '', amount: 0, category: 'Despesa Variável', subcategory: '', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix' }); setIsCustomCategory(false); }
      setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) return;
      if (isCustomCategory && !categories.includes(expenseForm.category)) setCategories(prev => [...prev, expenseForm.category!]);
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
                    <button key={v} onClick={() => { setTimeView(v); if(v !== 'custom') setDateRef(new Date()); }} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}</button>
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
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                            t.status === 'Pago' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' : 
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
                    <table className="w-full text-left text-sm"><thead><tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700"><th className="px-6 py-4">Data</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Categoria</th><th className="px-6 py-4 Status">Status</th><th className="px-6 py-4 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-zinc-800">{expenses.map(exp => (<tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors"><td className="px-6 py-4 text-xs font-bold font-mono">{new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td><td className="px-6 py-4 font-black text-xs uppercase">{exp.description}</td><td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">{exp.category}</td><td className="px-6 py-4"><button onClick={() => toggleExpenseStatus(exp.id)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${exp.status === 'Pago' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'}`}>{exp.status}</button></td><td className="px-6 py-4 text-right font-black text-rose-700 dark:text-rose-400">R$ {exp.amount.toFixed(2)}</td></tr>))}</tbody></table>
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
                        <button className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950"><Printer size={18} /></button>
                        <button className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950"><Download size={18} /></button>
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
                            {/* RECEITA BRUTA - DRILL DOWN */}
                            <tr 
                                onClick={() => toggleSection('gross')}
                                className="bg-indigo-50/20 dark:bg-indigo-900/10 cursor-pointer hover:bg-indigo-100/30 transition-colors"
                            >
                                <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase flex items-center gap-2">
                                    {expandedSections.includes('gross') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    (=) FATURAMENTO BRUTO
                                </td>
                                <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.grossRevenue.toFixed(2)}</td>
                                <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">100.0%</td>
                            </tr>
                            {expandedSections.includes('gross') && (
                                <>
                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                        <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic">└ Venda de Serviços</td>
                                        <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">R$ {dreData.revenueServices.toFixed(2)}</td>
                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.revenueServices / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                        <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic">└ Venda de Produtos (Revenda)</td>
                                        <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">R$ {dreData.revenueProducts.toFixed(2)}</td>
                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.revenueProducts / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                </>
                            )}

                            {/* DEDUCOES */}
                            <tr>
                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase pl-12 italic">(-) Taxas e Deduções (Est.)</td>
                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.estimatedTaxes.toFixed(2)}</td>
                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">3.0%</td>
                            </tr>

                            <tr className="bg-slate-50 dark:bg-zinc-800/50">
                                <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase">(=) RECEITA LÍQUIDA</td>
                                <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.netRevenue.toFixed(2)}</td>
                                <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">{((dreData.netRevenue / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                            </tr>

                            {/* CPV - DRILL DOWN */}
                            <tr 
                                onClick={() => toggleSection('variable')}
                                className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            >
                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2">
                                    {expandedSections.includes('variable') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    (-) CUSTO VARIÁVEL (CPV)
                                </td>
                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.totalCOGS.toFixed(2)}</td>
                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.totalCOGS / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                            </tr>
                            {expandedSections.includes('variable') && (
                                <>
                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ Comissões (Folha Variável)</td>
                                        <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {dreData.commissions.toFixed(2)}</td>
                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.commissions / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ CMV (Custo de Produtos Vendidos)</td>
                                        <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {dreData.productCOGS.toFixed(2)}</td>
                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{((dreData.productCOGS / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                </>
                            )}

                            <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                                <td className="px-8 py-4 font-black text-sm text-emerald-800 dark:text-emerald-400 uppercase">(=) MARGEM BRUTA</td>
                                <td className="px-8 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400">R$ {dreData.grossProfit.toFixed(2)}</td>
                                <td className="px-8 py-4 text-right font-black text-[10px] text-emerald-600/50">{((dreData.grossProfit / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                            </tr>

                            {/* DESPESAS FIXAS - DRILL DOWN */}
                            <tr 
                                onClick={() => toggleSection('fixed')}
                                className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            >
                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2">
                                    {expandedSections.includes('fixed') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    (-) DESPESAS OPERACIONAIS (FIXAS)
                                </td>
                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.fixedExpenses.toFixed(2)}</td>
                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.fixedExpenses / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                            </tr>
                            {expandedSections.includes('fixed') && (
                                Object.entries(dreData.fixedBreakdown).map(([label, amount]) => (
                                    <tr key={label} className="animate-in slide-in-from-top-1 duration-200">
                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ {label}</td>
                                        <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {(amount as number).toFixed(2)}</td>
                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{(((amount as number) / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                ))
                            )}

                            {/* OUTRAS DESPESAS - DRILL DOWN */}
                            <tr 
                                onClick={() => toggleSection('other-exp')}
                                className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            >
                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2">
                                    {expandedSections.includes('other-exp') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    (-) OUTRAS DESPESAS (VARIAV/MARKETING)
                                </td>
                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.variableExpenses.toFixed(2)}</td>
                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{((dreData.variableExpenses / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                            </tr>
                            {expandedSections.includes('other-exp') && (
                                Object.entries(dreData.varBreakdown).map(([label, amount]) => (
                                    <tr key={label} className="animate-in slide-in-from-top-1 duration-200">
                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic">└ {label}</td>
                                        <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {(amount as number).toFixed(2)}</td>
                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">{(((amount as number) / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                    </tr>
                                ))
                            )}

                            <tr className={`bg-slate-900 text-white ${dreData.netProfit < 0 ? 'bg-rose-900' : 'bg-slate-950'}`}>
                                <td className="px-8 py-6 font-black text-lg uppercase tracking-tight flex items-center gap-3">
                                    <TrendingUp size={24} className={dreData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} /> 
                                    LUCRO / PREJUÍZO LÍQUIDO
                                </td>
                                <td className="px-8 py-6 text-right font-black text-xl">R$ {dreData.netProfit.toFixed(2)}</td>
                                <td className="px-8 py-6 text-right font-black text-xs text-white/50">{((dreData.netProfit / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
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
                                <p className="text-sm font-black text-slate-950 dark:text-white mt-1">R$ {(dreData.fixedExpenses / (dreData.grossProfit / dreData.grossRevenue) || 0).toFixed(2)}</p>
                                <p className="text-[8px] text-slate-400 font-bold mt-1">Faturamento mínimo para não ter prejuízo</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Margem de Lucro Final</p>
                                <p className={`text-sm font-black mt-1 ${dreData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {((dreData.netProfit / dreData.grossRevenue) * 100 || 0).toFixed(1)}%
                                </p>
                                <p className="text-[8px] text-slate-400 font-bold mt-1">Rentabilidade sobre as vendas</p>
                            </div>
                        </div>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                  <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                    <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><ArrowDownCircle size={18} /> {editingExpenseId ? 'Editar' : 'Nova'} Despesa</h3>
                    <button onClick={() => setIsModalOpen(false)}><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Descrição do Gasto</label>
                        <input type="text" placeholder="Ex: Conta de Luz" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Valor (R$)</label>
                          <input type="number" step="0.01" placeholder="0.00" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Vencimento</label>
                          <input type="date" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                        </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Categoria</label>
                          <select className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div className="pt-2">
                        <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Salvar Despesa</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
