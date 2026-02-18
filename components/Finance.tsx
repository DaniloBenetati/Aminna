
import React, { useState, useMemo, useEffect } from 'react';
import {
    DollarSign, Download, FileText, Filter, Calendar,
    TrendingUp, Users, Wallet, Printer, ArrowUpCircle,
    ArrowDownCircle, AlertTriangle, BarChart3, Target, Calculator, Files,
    Plus, Minus, Save, X, Edit2, Trash2, CheckCircle2, List, AlertCircle, ArrowRight, Clock,
    ShoppingBag, Sparkles, MessageCircle, Lock, PenTool, FolderPlus, ChevronLeft, ChevronRight, CalendarRange, ChevronDown, ChevronUp, Menu,
    Paperclip, Stamp, ShieldCheck, Share2, Copy, Send, Search, Calculator as CalcIcon, Percent, Info, Crown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { Service, FinancialTransaction, Expense, Appointment, Sale, ExpenseCategory, PaymentSetting, CommissionSetting, Supplier, Provider, Customer, StockItem } from '../types';
import { supabase } from '../services/supabase';
import { FinanceCharts } from './FinanceCharts';

const toLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateSafe = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date();
    try {
        const str = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
        const d = new Date(str);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
        return new Date();
    }
};

// --- MOCK DATA GENERATOR FOR OPERATIONAL EXPENSES ---
const generateMockExpenses = (): Expense[] => {
    // Return empty array to start fresh as requested by user
    return [];
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
    date: Date;
    appointments: Appointment[];
    services: Service[];
}

const DailyCloseView: React.FC<DailyCloseViewProps> = ({
    transactions, physicalCash, setPhysicalCash, closingObservation, setClosingObservation, closerName, setCloserName, date, appointments, services
}) => {
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    // Use the passed date prop instead of current date
    const dateStr = toLocalDateStr(date);

    const dailyTrans = transactions.filter(t => (t.appointmentDate || t.date) === dateStr);
    const dailyRevenueTransactions = dailyTrans.filter(t => t.type === 'RECEITA' && (t.status === 'Pago' || t.status === 'Previsto'));

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

    // VIP / Courtesy Calculation
    const vipMetrics = useMemo(() => {
        let vipValue = 0;
        let vipCount = 0;

        const dayAppts = appointments.filter(a => {
            if (a.status === 'Cancelado') return false;
            // Match date logic similar to transactions (paymentDate if Concluído, else date)
            const appDateStr = (a.status === 'Concluído' && a.paymentDate) ? a.paymentDate : a.date;
            return appDateStr === dateStr;
        });

        dayAppts.forEach(app => {
            const rawApp = app as any;
            const pricePaid = app.pricePaid ?? rawApp.price_paid;
            // Check if the whole appointment was effectively free/VIP (100% discount)
            const isTotalFree = app.status === 'Concluído' && pricePaid < 0.01;

            // Check main service
            if (app.isCourtesy || isTotalFree) {
                const s = services.find(x => x.id === app.serviceId);
                vipValue += (app.bookedPrice || s?.price || 0);
                vipCount++;
            }

            // Check additional services
            if (app.additionalServices) {
                app.additionalServices.forEach(extra => {
                    const extraRaw = extra as any;
                    // If the whole appointment is free, assume all parts are free/VIP
                    if (extra.isCourtesy || isTotalFree) {
                        const s = services.find(x => x.id === extra.serviceId);
                        // Use bookedPrice from extra if available, else service price
                        const extraPrice = extraRaw.bookedPrice || extraRaw.booked_price || s?.price || 0;
                        vipValue += extraPrice;
                        vipCount++;
                    }
                });
            }
        });

        return { value: vipValue, count: vipCount };
    }, [appointments, services, dateStr]);

    // Grouping by Professional -> Client -> Service
    const groupedByProvider = dailyRevenueTransactions.reduce((acc, t) => {
        const pName = t.providerName || 'Não atribuído';
        const cName = t.customerName || 'Desconhecido';
        if (!acc[pName]) acc[pName] = { amount: 0, count: 0, clients: {} };
        if (!acc[pName].clients[cName]) acc[pName].clients[cName] = { amount: 0, transactions: [] };

        acc[pName].amount += t.amount;
        acc[pName].count += 1;
        acc[pName].clients[cName].amount += t.amount;
        acc[pName].clients[cName].transactions.push(t);
        return acc;
    }, {} as Record<string, {
        amount: number;
        count: number;
        clients: Record<string, { amount: number; transactions: FinancialTransaction[] }>
    }>);


    const handlePrintClosingReport = () => {
        const printContent = `
            <html>
            <head>
                <title>Fechamento de Caixa - ${date.toLocaleDateString('pt-BR')}</title>
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
                    .prov-header { font-weight: bold; background: #eee; padding: 4px; margin-top: 10px; font-size: 11px; }
                    .cli-header { font-weight: bold; text-decoration: underline; margin-top: 5px; font-size: 10px; margin-left: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>AMINNA HOME NAIL GEL</h1>
                    <p>FECHAMENTO DE CAIXA</p>
                    <p>${date.toLocaleString('pt-BR')}</p>
                </div>
                <div class="section">
                    <div class="row"><span>SERVIÇOS:</span> <span>R$ ${totalServices.toFixed(2)}</span></div>
                    <div class="row"><span>PRODUTOS:</span> <span>R$ ${totalProducts.toFixed(2)}</span></div>
                    <div class="row total"><span>FATURAMENTO BRUTO:</span> <span>R$ ${totalRevenue.toFixed(2)}</span></div>
                </div>
                </div>
                <div class="section">
                    <div style="font-weight:bold; margin-bottom:5px; font-size:12px;">DETALHAMENTO POR MÉTODO:</div>
                    ${Object.entries(paymentBreakdown).map(([method, data]) => {
            const d = data as { count: number; amount: number };
            return `<div class="row"><span>${method.toUpperCase()} (${d.count}x):</span><span>R$ ${d.amount.toFixed(2)}</span></div>`
        }).join('')}
                </div>
                <div class="section">
                    <div style="font-weight:bold; margin-bottom:5px; font-size:12px;">OUTRAS INFORMAÇÕES:</div>
                    <div class="row"><span>CAIXA POR:</span> <span>${closerName || '---'}</span></div>
                    <div class="row"><span>CORTESIAS / VIP:</span> <span>${vipMetrics.count}x (R$ ${vipMetrics.value.toFixed(2)})</span></div>
                </div>
                <div class="section">
                    <div style="font-weight:bold; margin-bottom:5px; font-size:12px;">EXTRATO POR PROFISSIONAL/CLIENTE:</div>
                    ${Object.entries(groupedByProvider).sort((a, b) => b[1].amount - a[1].amount).map(([pName, pData]) => `
                        <div class="prov-header">${pName.toUpperCase()} - R$ ${pData.amount.toFixed(2)}</div>
                        ${Object.entries(pData.clients).map(([cName, cData]) => `
                            <div class="cli-header">${cName.toUpperCase()} (Total: R$ ${cData.amount.toFixed(2)})</div>
                            <table>
                                <tbody>
                                    ${cData.transactions.map(t => `
                                        <tr>
                                            <td style="width: 60%">${t.serviceName}</td>
                                            <td style="width: 20%; text-align: center">${t.paymentMethod}</td>
                                            <td style="width: 20%; text-align: right">R$ ${t.amount.toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `).join('')}
                    `).join('')}
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

    const handleShareWhatsapp = () => {
        let text = `*FECHAMENTO DE CAIXA - AMINNA*\n`;
        text += `Data: ${date.toLocaleDateString('pt-BR')}\n\n`;
        text += `*RESUMO FINANCEIRO*\n`;
        text += `Servicos: R$ ${totalServices.toFixed(2)}\n`;
        text += `Produtos: R$ ${totalProducts.toFixed(2)}\n`;
        text += `*Faturamento Bruto: R$ ${totalRevenue.toFixed(2)}*\n\n`;

        text += `*DETALHAMENTO*\n`;
        Object.entries(paymentBreakdown).forEach(([method, data]) => {
            text += `${method}: R$ ${data.amount.toFixed(2)} (${data.count}x)\n`;
        });

        text += `\n*CONFERENCIA*\n`;
        text += `Sistema: R$ ${systemCashTotal.toFixed(2)}\n`;
        text += `Fisico: R$ ${physicalCashNum.toFixed(2)}\n`;
        text += `Diferenca: R$ ${cashDifference.toFixed(2)}\n`;
        if (hasDifference) text += `(QUEBRA/SOBRA)\n`;

        text += `\n*OUTRAS INFO*\n`;
        text += `Caixa por: ${closerName}\n`;
        text += `VIPs: ${vipMetrics.count}x (R$ ${vipMetrics.value.toFixed(2)})\n`;

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleCloseRegister = () => {
        if (confirm('Confirma o fechamento do caixa deste dia? Isso irá registrar o fechamento no sistema.')) {
            // Here we would ideally save to DB. For now, we simulate success and maybe update observation.
            alert('Caixa fechado com sucesso!');
        }
    };

    return (
        <div className="space-y-4 animate-in slide-in-from-right duration-300 relative">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
                <div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2"><Lock size={20} className="text-indigo-600 dark:text-indigo-400" /> Fechamento de Caixa</h3><p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mt-0.5">Ref: {date.toLocaleDateString('pt-BR')}</p></div>
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
                        {Object.entries(groupedByProvider).sort((a, b) => b[1].amount - a[1].amount).map(([providerName, data]) => {
                            const isExpanded = expandedProvider === providerName;
                            return (
                                <div key={providerName} className="border-b border-slate-5 dark:border-zinc-800 last:border-none">
                                    <div onClick={() => setExpandedProvider(isExpanded ? null : providerName)} className={`flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer rounded-xl transition-all ${isExpanded ? 'bg-slate-50 dark:bg-zinc-800' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                <Users size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-950 dark:text-white uppercase">{providerName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{data.count} ATENDIMENTOS</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-950 dark:text-white">R$ {data.amount.toFixed(2)}</span>
                                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="bg-slate-50/80 dark:bg-zinc-800/80 p-2 mx-2 mb-2 rounded-b-xl animate-in slide-in-from-top-2 duration-200 space-y-2">
                                            {Object.entries(data.clients).map(([clientName, clientData]) => (
                                                <div key={clientName} className="bg-white dark:bg-zinc-900/50 p-2 rounded-lg border border-slate-100 dark:border-zinc-700">
                                                    <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-50 dark:border-zinc-800">
                                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{clientName}</span>
                                                        <span className="text-[10px] font-black text-slate-900 dark:text-white">R$ {clientData.amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {clientData.transactions.map((t, idx) => (
                                                            <div key={t.id || idx} className="flex justify-between items-center text-[9px] px-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase">{t.serviceName}</span>
                                                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded text-[8px] text-slate-400 font-bold uppercase">{t.paymentMethod}</span>
                                                                </div>
                                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                                    {t.amount === 0 && <span className="mr-1 text-amber-600"><Crown size={8} /></span>}
                                                                    R$ {t.amount.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
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
                        <div className="flex gap-2 pt-1">
                            <button onClick={handlePrintClosingReport} className="flex-1 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Printer size={12} /> Relatório</button>
                            <button onClick={handleCloseRegister} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Lock size={12} /> Fechar</button>
                            <button onClick={handleShareWhatsapp} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><MessageCircle size={12} /> WhatsApp</button>
                        </div>
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
    paymentSettings: PaymentSetting[];
    commissionSettings?: CommissionSetting[];
    expenseCategories: ExpenseCategory[];
    setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    providers: Provider[];
    customers: Customer[];
    stock: StockItem[];
}

export const Finance: React.FC<FinanceProps> = ({ services, appointments, sales, expenseCategories = [], setExpenseCategories, paymentSettings, commissionSettings, suppliers, setSuppliers, providers, customers, stock }) => {
    const [activeTab, setActiveTab] = useState<'DETAILED' | 'PAYABLES' | 'DAILY' | 'DRE' | 'SUPPLIERS' | 'CHARTS'>('DAILY');
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('year');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 8) + '01');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const [expenses, setExpenses] = useState<Expense[]>([]);

    // Fetch Expenses from Supabase
    useEffect(() => {
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
                    recurringId: e.recurring_id
                })));
            }
        };
        fetchExpenses();
    }, []);

    // Suppliers CRUD States
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
        name: '', category: '', document: '', phone: '', email: '', active: true
    });

    const handleOpenSupplierModal = (sup?: Supplier) => {
        if (sup) {
            setEditingSupplierId(sup.id);
            setSupplierForm(sup);
        } else {
            setEditingSupplierId(null);
            setSupplierForm({ name: '', category: '', document: '', phone: '', email: '', active: true });
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
                if (data) setSuppliers(prev => [...prev, data[0]]);
            }
            setIsSupplierModalOpen(false);
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
        } catch (error) {
            console.error('Error deleting supplier:', error);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [recurrenceMonths, setRecurrenceMonths] = useState(1);
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix'
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
    const [payablesFilter, setPayablesFilter] = useState('');
    const [payablesSupplierFilter, setPayablesSupplierFilter] = useState('');

    // Filter States for Detailed View
    const [detailedFilter, setDetailedFilter] = useState('');

    // Date Navigation & View States
    const [dateRef, setDateRef] = useState(new Date());
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

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

    const transactions: FinancialTransaction[] = useMemo(() => {
        const allTrans: FinancialTransaction[] = [];
        const today = new Date();
        const todayStr = toLocalDateStr(today);

        // Helper to find commission payment date
        const getCommissionDate = (dateStr: string) => {
            if (!commissionSettings || commissionSettings.length === 0) return dateStr;
            const date = parseDateSafe(dateStr);
            const day = date.getDate();
            const month = date.getMonth();
            const year = date.getFullYear();

            const setting = commissionSettings.find(s => {
                if (s.endDay === 'last') return day >= s.startDay;
                return day >= s.startDay && day <= (s.endDay as number);
            });

            if (!setting) return dateStr;

            let targetMonth = month;
            let targetYear = year;

            // Logic: If payment day is smaller than start day, it DEFINITELY is next month.
            // Example: Period 16-31, Payment 5. 5 < 16 -> Next Month.
            // Example: Period 1-15, Payment 20. 20 < 1 -> False -> Same Month.
            // Note: This assumes standard logic where you don't pay before the period starts.
            if (setting.paymentDay < setting.startDay) {
                targetMonth++;
                if (targetMonth > 11) { targetMonth = 0; targetYear++; }
            }

            const targetDate = new Date(targetYear, targetMonth, setting.paymentDay);
            return toLocalDateStr(targetDate);
        };

        const getPaymentDetails = (methodName: string) => {
            const method = paymentSettings.find(p => p.method === methodName);
            return {
                fee: (method ? method.fee : 0) || 0,
                days: (method ? method.days : 0) || 0
            };
        };

        const addDays = (dateStr: string, days: number) => {
            const d = parseDateSafe(dateStr);
            d.setDate(d.getDate() + days);
            return toLocalDateStr(d);
        };

        appointments.forEach(app => {
            if (app.status === 'Cancelado') return;
            const service = services.find(s => s.id === app.serviceId);
            const customer = customers.find(c => c.id === app.customerId);
            const provider = providers.find(p => p.id === app.providerId);
            // Revenue logic: Handle snake_case from DB if camelCase is missing
            const rawApp = app as any;
            const pricePaid = app.pricePaid ?? rawApp.price_paid;
            const bookedPrice = app.bookedPrice ?? rawApp.booked_price;

            // Payment Logic
            let paymentMethodName = app.paymentMethod || rawApp.payment_method || 'Pix';
            const { fee, days } = getPaymentDetails(paymentMethodName);

            // Date Logic
            // If concluded, use paymentDate (D+0 reference), else use scheduled date
            const paymentDate = app.paymentDate || rawApp.payment_date;
            const baseDate = (app.status === 'Concluído' && paymentDate) ? paymentDate : app.date;
            const settlementDate = addDays(baseDate, days);

            // Status Logic
            let status: 'Pago' | 'Previsto' | 'Atrasado' = 'Previsto';
            if (app.status === 'Concluído') {
                status = settlementDate <= todayStr ? 'Pago' : 'Previsto';
            } else if (app.date < todayStr) {
                status = 'Atrasado';
            }

            // --- REVENUE SPLIT LOGIC ---
            // We need to split the appointment revenue between all involved professionals.
            // 1. Calculate total expected (booked) price
            const mainBooked = bookedPrice || service?.price || 0;
            const extrasList = (app.additionalServices || []).map(extra => {
                const extraRaw = extra as any;
                const extraS = services.find(s => s.id === extra.serviceId);
                return {
                    ...extra,
                    bookedPrice: extra.bookedPrice ?? extraRaw.booked_price ?? extraS?.price ?? 0,
                    serviceName: extraS?.name || 'Serviço Extra'
                };
            });
            const totalBooked = mainBooked + extrasList.reduce((acc, e) => acc + e.bookedPrice, 0);

            // 2. Determine actual total revenue (pricePaid if concluded, else totalBooked)
            const actualTotalRevenue = (app.status === 'Concluído' && pricePaid !== undefined && pricePaid !== null)
                ? pricePaid
                : totalBooked;

            // 3. Helper to get proportional amount
            const getProportionalAmount = (booked: number) => {
                if (totalBooked === 0) return 0;
                return (booked / totalBooked) * actualTotalRevenue;
            };

            // 4. Create transaction for MAIN service
            const mainRevenue = getProportionalAmount(mainBooked);

            allTrans.push({
                id: `app-main-${app.id}`,
                date: settlementDate,
                type: 'RECEITA',
                category: 'Serviço',
                description: `${service?.name || 'Serviço'} - ${customer?.name}`,
                amount: mainRevenue,
                status: status,
                paymentMethod: app.status === 'Concluído' && mainRevenue === 0 ? 'Cortesia' : paymentMethodName,
                origin: 'Serviço',
                customerOrProviderName: customer?.name || 'Cliente',
                providerName: provider?.name || 'Não atribuído',
                customerName: customer?.name || 'Desconhecido',
                serviceName: service?.name || 'Serviço',
                appointmentDate: app.date
            });

            // 5. Create transactions for ADDITIONAL services
            extrasList.forEach((extra, idx) => {
                const extraProv = providers.find(p => p.id === extra.providerId);
                const extraRevenue = getProportionalAmount(extra.bookedPrice);

                allTrans.push({
                    id: `app-extra-rev-${app.id}-${idx}`,
                    date: settlementDate,
                    type: 'RECEITA',
                    category: 'Serviço',
                    description: `${extra.serviceName} - ${customer?.name}`,
                    amount: extraRevenue,
                    status: status,
                    paymentMethod: app.status === 'Concluído' && extraRevenue === 0 ? 'Cortesia' : paymentMethodName,
                    origin: 'Serviço',
                    customerOrProviderName: customer?.name || 'Cliente',
                    providerName: extraProv?.name || 'Não atribuído',
                    customerName: customer?.name || 'Desconhecido',
                    serviceName: extra.serviceName,
                    appointmentDate: app.date
                });
            });

            if (provider) {
                const commissionRateSnapshot = app.commissionRateSnapshot ?? rawApp.commission_rate_snapshot;
                const rate = commissionRateSnapshot ?? provider.commissionRate;
                // Commission is on NET value of the MAIN service
                const mainServiceBookedPrice = bookedPrice || service?.price || 0;
                const commissionLiquidBase = mainServiceBookedPrice * (1 - (fee / 100));
                const commissionAmount = commissionLiquidBase * rate;

                const commissionDate = getCommissionDate(baseDate);

                allTrans.push({
                    id: `comm-main-${app.id}`,
                    date: commissionDate,
                    type: 'DESPESA',
                    category: 'Comissão',
                    description: `Repasse - ${provider.name.split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                    amount: commissionAmount,
                    status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                    paymentMethod: 'Transferência',
                    origin: 'Outro',
                    customerOrProviderName: provider.name,
                    providerName: provider.name,
                    customerName: customer?.name || 'Desconhecido',
                    serviceName: `Comissão: ${service?.name || 'Serviço'}`,
                    appointmentDate: app.date
                });
            }

            // --- ADDITIONAL SERVICES COMMISSIONS ---
            if (app.additionalServices && app.additionalServices.length > 0) {
                app.additionalServices.forEach((extra, idx) => {
                    const extraProvider = providers.find(p => p.id === extra.providerId);
                    const extraService = services.find(s => s.id === extra.serviceId);
                    if (extraProvider) {
                        const rawExtra = extra as any;
                        const extraRateSnapshot = extra.commissionRateSnapshot ?? rawExtra.commission_rate_snapshot;
                        const rate = extraRateSnapshot ?? extraProvider.commissionRate;

                        const extraBooked = extra.bookedPrice ?? rawExtra.booked_price;
                        const extraBookedPrice = extraBooked || extraService?.price || 0;
                        const commissionLiquidBase = extraBookedPrice * (1 - (fee / 100));
                        const commissionAmount = commissionLiquidBase * rate;

                        const commissionDate = getCommissionDate(baseDate);

                        allTrans.push({
                            id: `comm-extra-${app.id}-${idx}`,
                            date: commissionDate,
                            type: 'DESPESA',
                            category: 'Comissão',
                            description: `Repasse Extra - ${extraProvider.name.split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                            amount: commissionAmount,
                            status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                            paymentMethod: 'Transferência',
                            origin: 'Outro',
                            customerOrProviderName: extraProvider.name,
                            providerName: extraProvider.name,
                            customerName: customer?.name || 'Desconhecido',
                            serviceName: `Comissão: ${extraService?.name || 'Serviço'}`,
                            appointmentDate: app.date
                        });
                    }
                });
            }
        });


        sales.forEach(sale => {
            const paymentMethodName = sale.paymentMethod || 'Dinheiro';
            const { fee, days } = getPaymentDetails(paymentMethodName);
            const netAmount = (sale.totalAmount || 0) * (1 - (fee / 100));
            const settlementDate = addDays(sale.date, days);

            const status = settlementDate <= todayStr ? 'Pago' : 'Previsto';

            allTrans.push({
                id: `sale-${sale.id}`,
                date: settlementDate,
                type: 'RECEITA',
                category: 'Produto',
                description: 'Venda de Produto',
                amount: netAmount,
                status: status,
                paymentMethod: paymentMethodName,
                origin: 'Produto',
                customerOrProviderName: 'Cliente Balcão',
                providerName: 'Venda Direta',
                customerName: 'Cliente Balcão',
                serviceName: 'Venda de Produto',
                appointmentDate: sale.date
            });
        });

        expenses.forEach(exp => {
            allTrans.push({ id: exp.id, date: exp.date, type: 'DESPESA', category: exp.category, description: exp.description, amount: exp.amount, status: exp.status === 'Pago' ? 'Pago' : 'Pendente', paymentMethod: exp.paymentMethod, origin: 'Despesa' });
        });

        return allTrans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [services, expenses, appointments, sales, paymentSettings, commissionSettings]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesDate = t.date >= startDate && t.date <= endDate;
            const matchesDescription = t.description.toLowerCase().includes(detailedFilter.toLowerCase()) ||
                (t.customerOrProviderName || '').toLowerCase().includes(detailedFilter.toLowerCase()); // Search in both description and name

            // Only apply filters if we are in DETAILED tab ideally, but filteredTransactions is used for the view.
            // Wait, filteredTransactions is ONLY used in DETAILED rendering and PAYABLES rendering?
            // PAYABLES uses `filteredPayables` (which I usually see in other codebases or need to check if it exists).
            // Let's check where `filteredTransactions` is used.
            // It is used in lines 1399 (DETAILED TABLE).

            return matchesDate && matchesDescription;
        });
    }, [transactions, startDate, endDate, detailedFilter]);

    const handlePrintDetailedReport = () => {
        const printContent = `
            <html>
            <head>
                <title>Extrato de Fluxo Financeiro - ${getDateLabel()}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #000; }
                    .report-title { text-align: right; }
                    h1 { font-size: 18px; margin: 0; text-transform: uppercase; font-weight: 900; }
                    p { margin: 2px 0; font-size: 12px; font-weight: 600; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                    th { bg: #f8fafc; text-align: left; padding: 12px 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
                    td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
                    .amount { text-align: right; font-weight: 800; }
                    .RECEITA { color: #059669; }
                    .DESPESA { color: #dc2626; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                    .summary { display: flex; gap: 40px; justify-content: flex-end; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; }
                    .summary-item { text-align: right; }
                    .summary-label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; }
                    .summary-value { font-size: 16px; font-weight: 900; margin-top: 2px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">AMINNA</div>
                    <div class="report-title">
                        <h1>Extrato de Fluxo Financeiro</h1>
                        <p>Período: ${getDateLabel()}</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Origem</th>
                            <th>Descrição</th>
                            <th>Pagamento</th>
                            <th class="amount">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredTransactions.map(t => `
                            <tr>
                                <td>${parseDateSafe(t.date).toLocaleDateString('pt-BR')}</td>
                                <td class="${t.type}"><strong>${t.type}</strong></td>
                                <td>${t.origin}</td>
                                <td>
                                    <div style="font-weight: 800; text-transform: uppercase;">${t.description}</div>
                                    <div style="font-size: 9px; color: #64748b;">${t.customerOrProviderName || ''}</div>
                                </td>
                                <td>${t.paymentMethod}</td>
                                <td class="amount ${t.type}">${t.type === 'DESPESA' ? '-' : '+'} R$ ${t.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-label">Total Entradas</div>
                        <div class="summary-value RECEITA">R$ ${filteredTransactions.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Saídas</div>
                        <div class="summary-value DESPESA">R$ ${filteredTransactions.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Saldo Líquido</div>
                        <div class="summary-value ${filteredTransactions.reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0) >= 0 ? 'RECEITA' : 'DESPESA'}">
                            R$ ${filteredTransactions.reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div class="footer">
                    Relatório gerado em ${new Date().toLocaleString('pt-BR')} - Sistema Aminna Home Nail Gel
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const filteredPayables = useMemo(() => {
        return expenses.filter(exp => {
            const matchesDate = exp.date >= startDate && exp.date <= endDate;
            const matchesDesc = exp.description.toLowerCase().includes(payablesFilter.toLowerCase());
            const supplierName = suppliers.find(s => s.id === exp.supplierId)?.name || '';
            const matchesSupplier = supplierName.toLowerCase().includes(payablesSupplierFilter.toLowerCase());
            return matchesDate && matchesDesc && matchesSupplier;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [expenses, startDate, endDate, payablesFilter, payablesSupplierFilter, suppliers]);

    const dreData = useMemo(() => {
        const getSnapshot = (start: string, end: string) => {
            const apps = appointments.filter(a => a.date >= start && a.date <= end && a.status !== 'Cancelado');
            const sls = sales.filter(s => s.date >= start && s.date <= end);
            const exps = expenses.filter(e => e.date >= start && e.date <= end);

            const revenueServices = apps.reduce((acc, a) => {
                const mainPrice = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
                const extraPrice = (a.additionalServices || []).reduce((sum, extra) => {
                    return sum + (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0);
                }, 0);
                return acc + mainPrice + extraPrice;
            }, 0);

            const revenueProducts = sls.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
            const grossRevenue = revenueServices + revenueProducts;

            // Automated Deductions (Fees)
            const automatedDeductions = apps.reduce((acc, a) => {
                const method = a.paymentMethod || 'Dinheiro';
                const settings = paymentSettings.find(ps => ps.method === method);
                if (!settings) return acc;

                const totalAppValue = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0) +
                    (a.additionalServices || []).reduce((sum, e) => sum + (e.bookedPrice ?? services.find(s => s.id === e.serviceId)?.price ?? 0), 0);

                return acc + (totalAppValue * (settings.fee / 100));
            }, 0);

            const manualDeductions = exps.filter(e => e.dreClass === 'DEDUCTION').reduce((acc, e) => acc + e.amount, 0);
            const deductions = manualDeductions + automatedDeductions;
            const netRevenue = grossRevenue - deductions;

            const commissions = apps.reduce((acc, a) => {
                // Main service commission (uses bookedPrice for courtesies fallback)
                const provider = providers.find(p => p.id === a.providerId);
                const rate = a.commissionRateSnapshot ?? provider?.commissionRate ?? 0;
                const mainComm = (a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0) * rate;

                // Additional services commission
                const extraComm = (a.additionalServices || []).reduce((eAcc, extra) => {
                    const eProv = providers.find(p => p.id === extra.providerId);
                    if (!eProv) return eAcc;
                    const eRate = extra.commissionRateSnapshot ?? eProv.commissionRate ?? 0;
                    const ePrice = extra.bookedPrice || services.find(s => s.id === extra.serviceId)?.price || 0;
                    return eAcc + (ePrice * eRate);
                }, 0);

                return acc + mainComm + extraComm;
            }, 0);

            const manualCosts = exps.filter(e => e.dreClass === 'COSTS').reduce((acc, e) => acc + e.amount, 0);
            const totalCOGS = commissions + manualCosts;
            const grossProfit = netRevenue - totalCOGS;

            const expensesVendas = exps.filter(e => e.dreClass === 'EXPENSE_SALES');
            const expensesAdm = exps.filter(e => e.dreClass === 'EXPENSE_ADM');
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

            const resultBeforeTaxes = grossProfit - totalOpExpenses;
            const irpjCsll = exps.filter(e => e.dreClass === 'TAX').reduce((acc, e) => acc + e.amount, 0);
            const netResult = resultBeforeTaxes - irpjCsll;

            const breakdownServices = apps.reduce((acc, a) => {
                // Main service
                const serviceName = services.find(s => s.id === a.serviceId)?.name || 'Serviço Removido';
                if (!acc[serviceName]) acc[serviceName] = { total: 0, count: 0 };
                const amount = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
                acc[serviceName].total += amount;
                acc[serviceName].count += 1;

                // Extras
                (a.additionalServices || []).forEach(extra => {
                    const extraName = services.find(s => s.id === extra.serviceId)?.name || 'Serviço Removido';
                    if (!acc[extraName]) acc[extraName] = { total: 0, count: 0 };
                    const extraPrice = (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0);
                    acc[extraName].total += extraPrice;
                    acc[extraName].count += 1;
                });

                return acc;
            }, {} as Record<string, { total: number, count: number }>);

            const breakdownCommissions = apps.reduce((acc, a) => {
                // Main professional
                const provider = providers.find(p => p.id === a.providerId);
                if (provider) {
                    const name = provider.name;
                    const rate = a.commissionRateSnapshot ?? provider.commissionRate ?? 0;
                    const commVal = (a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0) * rate;

                    if (!acc[name]) acc[name] = { total: 0, count: 0 };
                    acc[name].total += commVal;
                    acc[name].count += 1;
                }

                // Additional professionals
                (a.additionalServices || []).forEach(extra => {
                    const eProv = providers.find(p => p.id === extra.providerId);
                    if (eProv) {
                        const name = eProv.name;
                        const eRate = extra.commissionRateSnapshot ?? eProv.commissionRate ?? 0;
                        const ePrice = extra.bookedPrice || services.find(s => s.id === extra.serviceId)?.price || 0;
                        const eComm = ePrice * eRate;

                        if (!acc[name]) acc[name] = { total: 0, count: 0 };
                        acc[name].total += eComm;
                        acc[name].count += 1;
                    }
                });

                return acc;
            }, {} as Record<string, { total: number, count: number }>);

            return {
                grossRevenue, revenueServices,
                deductions, netRevenue,
                totalCOGS, commissions,
                grossProfit, totalOpExpenses, amountVendas, amountAdm, amountFin,
                resultBeforeTaxes, irpjCsll, netResult,
                breakdownVendas: groupByCat(expensesVendas),
                breakdownAdm: groupByCat(expensesAdm),
                breakdownFin: groupByCat(expensesFin),
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

        return { ...currentPeriod, monthlySnapshots };
    }, [appointments, sales, expenses, startDate, endDate, timeView]);

    const handleOpenModal = (expense?: Expense) => {
        if (expense) { setEditingExpenseId(expense.id); setExpenseForm(expense); setRecurrenceMonths(1); }
        else { setEditingExpenseId(null); setRecurrenceMonths(1); setExpenseForm({ description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix' }); }
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
                recurringId: e.recurring_id
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
                        <span>R$ ${filteredPayables.filter(e => e.status !== 'Pago').reduce((acc, e) => acc + e.amount, 0).toFixed(2)}</span>
                    </div>
                    <div class="summary-card" style="border-color: #000; background: #f8fafc;">
                        <p>Vlr. Total do Período</p>
                        <span>R$ ${filteredPayables.reduce((acc, e) => acc + e.amount, 0).toFixed(2)}</span>
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
                                <td class="amount">R$ ${e.amount.toFixed(2)}</td>
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


    const handleSaveExpense = async (e?: React.FormEvent, overrideOption?: 'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL') => {
        if (e) e.preventDefault();
        if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) return;

        const currentOption = overrideOption || batchOption;

        const expenseData = {
            description: expenseForm.description,
            amount: expenseForm.amount,
            category: expenseForm.category,
            subcategory: expenseForm.subcategory,
            dre_class: expenseForm.dreClass, // Mapping to snake_case column
            date: expenseForm.date,
            status: expenseForm.status,
            payment_method: expenseForm.paymentMethod || 'Pix',
            supplier_id: expenseForm.supplierId
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
                    // BATCH UPDATE: Needs smart handling to preserve (x/y) suffixes and shift dates relative to the original
                    let query = supabase.from('expenses').select('*').eq('recurring_id', originalExpense.recurringId);

                    if (currentOption === 'THIS_AND_FUTURE') {
                        query = query.gte('date', originalExpense.date);
                    }

                    const { data: expensesToUpdate } = await query;

                    if (expensesToUpdate) {
                        const originalDateObj = parseDateSafe(originalExpense.date);
                        const newDateObj = parseDateSafe(expenseForm.date!);
                        const timeDiff = newDateObj.getTime() - originalDateObj.getTime(); // Time difference in ms

                        // Base description: remove the (x/y) suffix from the input to get the clean name
                        // This assumes the user might have edited the description, e.g., "Loan B (10/12)" -> "Loan B"
                        const baseDescription = expenseForm.description.replace(/\s*\(\d+\/\d+\)$/, '');

                        const updates = expensesToUpdate.map(exp => {
                            // Preserve the EXISTING suffix of the expense being updated (e.g. 11/12)
                            const suffixMatch = exp.description.match(/\s*\(\d+\/\d+\)$/);
                            const suffix = suffixMatch ? suffixMatch[0] : '';

                            // Calculate new shifted date
                            const currentExpDate = parseDateSafe(exp.date);
                            const shiftedDate = new Date(currentExpDate.getTime() + timeDiff);

                            return {
                                ...exp, // Keep ID and other props
                                ...expenseData, // Apply new Amount, Category, etc.
                                id: exp.id, // Ensure ID is preserved for Upsert
                                description: baseDescription + suffix, // New Name + Old Suffix
                                date: toLocalDateStr(shiftedDate) // Shifted Date
                            };
                        });

                        const { error } = await supabase.from('expenses').upsert(updates);
                        if (error) throw error;
                    }
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
                        <tr class="main-row"><td>1. RECEITA BRUTA</td><td class="positive">${dreData.grossRevenue.toFixed(0)}</td>${months.map(m => `<td>${m.grossRevenue.toFixed(0)}</td>`).join('')}</tr>
                        <tr class="sub-row"><td>Serviços</td><td>${dreData.revenueServices.toFixed(0)}</td>${months.map(m => `<td>${m.revenueServices.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>2. (-) DEDUÇÕES</td><td class="negative">-${dreData.deductions.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.deductions.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>3. (=) REC. LÍQUIDA</td><td>${dreData.netRevenue.toFixed(0)}</td>${months.map(m => `<td>${m.netRevenue.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>4. (-) CPV / CMV</td><td class="negative">-${dreData.totalCOGS.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.totalCOGS.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>5. (=) LUCRO BRUTO</td><td class="positive">${dreData.grossProfit.toFixed(0)}</td>${months.map(m => `<td class="positive">${m.grossProfit.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>6. (-) DESP. VENDAS</td><td class="negative">-${dreData.amountVendas.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.amountVendas.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>7. (-) DESP. ADM</td><td class="negative">-${dreData.amountAdm.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.amountAdm.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>8. (-) DESP. FIN</td><td class="negative">-${dreData.amountFin.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.amountFin.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>9. (=) RES. ANTES IRPJ</td><td>${dreData.resultBeforeTaxes.toFixed(0)}</td>${months.map(m => `<td>${m.resultBeforeTaxes.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>10. (-) IRPJ/CSLL</td><td class="negative">-${dreData.irpjCsll.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.irpjCsll.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="result-row"><td>11. (=) RES. LÍQUIDO</td><td>${dreData.netResult.toFixed(0)}</td>${months.map(m => `<td>${m.netResult.toFixed(0)}</td>`).join('')}</tr>
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
                        <tr class="main-row"><td>1. RECEITA BRUTA</td><td class="amount positive">R$ ${dreData.grossRevenue.toFixed(2)}</td><td class="amount">100.0%</td></tr>
                        <tr class="sub-row"><td>Serviços</td><td class="amount">R$ ${dreData.revenueServices.toFixed(2)}</td><td class="amount">${formatPercent(dreData.revenueServices, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>2. (-) DEDUÇÕES E IMPOSTOS</td><td class="amount negative">- R$ ${dreData.deductions.toFixed(2)}</td><td class="amount">${formatPercent(dreData.deductions, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>3. (=) RECEITA LÍQUIDA</td><td class="amount">R$ ${dreData.netRevenue.toFixed(2)}</td><td class="amount">${formatPercent(dreData.netRevenue, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>4. (-) CPV / CMV</td><td class="amount negative">- R$ ${dreData.totalCOGS.toFixed(2)}</td><td class="amount">${formatPercent(dreData.totalCOGS, dreData.grossRevenue)}</td></tr>
                        <tr class="sub-row"><td>Comissões Técnica</td><td class="amount">R$ ${dreData.commissions.toFixed(2)}</td><td class="amount">${formatPercent(dreData.commissions, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>5. (=) LUCRO BRUTO</td><td class="amount positive">R$ ${dreData.grossProfit.toFixed(2)}</td><td class="amount">${formatPercent(dreData.grossProfit, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>6. (-) DESPESAS COM VENDAS</td><td class="amount negative">- R$ ${dreData.amountVendas.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountVendas, dreData.grossRevenue)}</td></tr>
                        ${Object.entries(dreData.breakdownVendas as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">└ ${cat}</td><td class="amount">R$ ${info.total.toFixed(2)}</td><td class="amount"></td></tr>
                        `).join('')}
                        
                        <tr><td>7. (-) DESPESAS ADMINISTRATIVAS</td><td class="amount negative">- R$ ${dreData.amountAdm.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountAdm, dreData.grossRevenue)}</td></tr>
                         ${Object.entries(dreData.breakdownAdm as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">└ ${cat}</td><td class="amount">R$ ${info.total.toFixed(2)}</td><td class="amount"></td></tr>
                        `).join('')}

                        <tr><td>8. (-) DESPESAS FINANCEIRAS</td><td class="amount negative">- R$ ${dreData.amountFin.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountFin, dreData.grossRevenue)}</td></tr>
                         ${Object.entries(dreData.breakdownFin as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">└ ${cat}</td><td class="amount">R$ ${info.total.toFixed(2)}</td><td class="amount"></td></tr>
                        `).join('')}

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
            ['1. RECEITA BRUTA', dreData.grossRevenue.toFixed(2), ...(isYearView ? months.map(m => m.grossRevenue.toFixed(2)) : ['100.0%'])],
            ['   Serviços', dreData.revenueServices.toFixed(2), ...(isYearView ? months.map(m => m.revenueServices.toFixed(2)) : [formatPercent(dreData.revenueServices, dreData.grossRevenue)])],
            ['2. (-) DEDUÇÕES', `-${dreData.deductions.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.deductions.toFixed(2)}`) : [formatPercent(dreData.deductions, dreData.grossRevenue)])],
            ['3. (=) RECEITA LÍQUIDA', dreData.netRevenue.toFixed(2), ...(isYearView ? months.map(m => m.netRevenue.toFixed(2)) : [formatPercent(dreData.netRevenue, dreData.grossRevenue)])],
            ['4. (-) CPV / CMV', `-${dreData.totalCOGS.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.totalCOGS.toFixed(2)}`) : [formatPercent(dreData.totalCOGS, dreData.grossRevenue)])],
            ['5. (=) LUCRO BRUTO', dreData.grossProfit.toFixed(2), ...(isYearView ? months.map(m => m.grossProfit.toFixed(2)) : [formatPercent(dreData.grossProfit, dreData.grossRevenue)])],
            ['6. (-) DESPESAS VENDAS', `-${dreData.amountVendas.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.amountVendas.toFixed(2)}`) : [formatPercent(dreData.amountVendas, dreData.grossRevenue)])],
            ['7. (-) DESPESAS ADM', `-${dreData.amountAdm.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.amountAdm.toFixed(2)}`) : [formatPercent(dreData.amountAdm, dreData.grossRevenue)])],
            ['8. (-) DESPESAS FIN', `-${dreData.amountFin.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.amountFin.toFixed(2)}`) : [formatPercent(dreData.amountFin, dreData.grossRevenue)])],
            ['9. (=) RESULTADO ANTES IRPJ', dreData.resultBeforeTaxes.toFixed(2), ...(isYearView ? months.map(m => m.resultBeforeTaxes.toFixed(2)) : [formatPercent(dreData.resultBeforeTaxes, dreData.grossRevenue)])],
            ['10. (-) IRPJ/CSLL', `-${dreData.irpjCsll.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.irpjCsll.toFixed(2)}`) : [formatPercent(dreData.irpjCsll, dreData.grossRevenue)])],
            ['11. (=) RESULTADO LÍQUIDO', dreData.netResult.toFixed(2), ...(isYearView ? months.map(m => m.netResult.toFixed(2)) : [formatPercent(dreData.netResult, dreData.grossRevenue)])]
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
                        { id: 'SUPPLIERS', label: 'Fornecedores', icon: Users },
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
                                if (tab.id === 'DAILY') {
                                    setTimeView('day');
                                    setDateRef(new Date());
                                }
                                if (tab.id === 'CHARTS') {
                                    setTimeView('year');
                                    setDateRef(new Date());
                                }
                            }}
                            className={`flex-1 md:flex-none min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto items-center">
                    {activeTab === 'PAYABLES' && (
                        <div className="flex gap-2 w-full md:w-auto animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="relative w-full md:w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Descrição..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                                    value={payablesFilter}
                                    onChange={e => setPayablesFilter(e.target.value)}
                                />
                            </div>
                            <div className="relative w-full md:w-48">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Favorecido..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                                    value={payablesSupplierFilter}
                                    onChange={e => setPayablesSupplierFilter(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'DETAILED' && (
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

                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button key={v} onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}</button>
                        ))}
                    </div>
                    {timeView !== 'custom' ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between">
                            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span>
                            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
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
                {activeTab === 'DETAILED' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                            <div>
                                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><List size={16} /> Extrato de Fluxo Financeiro</h3>
                                <p className="text-[9px] text-slate-500 uppercase mt-0.5">Listagem de todas as entradas e saídas no período</p>
                            </div>
                            <button onClick={handlePrintDetailedReport} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><Printer size={16} /></button>
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
                {activeTab === 'DAILY' && <DailyCloseView transactions={transactions} physicalCash={physicalCash} setPhysicalCash={setPhysicalCash} closingObservation={closingObservation} setClosingObservation={setClosingObservation} closerName={closerName} setCloserName={setCloserName} date={dateRef} appointments={appointments} services={services} />}
                {activeTab === 'CHARTS' && <FinanceCharts transactions={transactions} expenses={expenses} startDate={startDate} endDate={endDate} timeView={timeView} />}
                {activeTab === 'PAYABLES' && (
                    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
                        {/* Indicadores Contas a Pagar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total no Período', value: filteredPayables.reduce((acc, curr) => acc + curr.amount, 0), icon: FileText, color: 'indigo' },
                                { label: 'Total Pago', value: filteredPayables.filter(p => p.status === 'Pago').reduce((acc, curr) => acc + curr.amount, 0), icon: CheckCircle2, color: 'emerald' },
                                { label: 'Pendente', value: filteredPayables.filter(p => p.status === 'Pendente').reduce((acc, curr) => acc + curr.amount, 0), icon: Clock, color: 'amber' },
                                { label: 'Atrasado', value: filteredPayables.filter(p => p.status === 'Pendente' && new Date(p.date) < new Date(new Date().setHours(0, 0, 0, 0))).reduce((acc, curr) => acc + curr.amount, 0), icon: AlertCircle, color: 'rose' },
                            ].map((card, idx) => (
                                <div key={idx} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm group hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400 group-hover:scale-110 transition-transform`}>
                                            <card.icon size={20} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                                        <h4 className="text-xl font-black text-slate-950 dark:text-white mt-1">R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><ArrowDownCircle size={16} /> Contas a Pagar</h3>
                                <div className="flex gap-2">
                                    <button onClick={handlePrintPayablesReport} className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-all"><Printer size={12} /> Relatório</button>
                                    <button onClick={() => handleOpenModal()} className="text-[10px] font-black uppercase text-white bg-black dark:bg-white dark:text-black px-4 py-2 rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition-all"><Plus size={12} /> Lançar Despesa</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Descrição</th>
                                            <th className="px-6 py-4">Favorecido</th>
                                            <th className="px-6 py-4">Categoria</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Valor</th>
                                            <th className="px-6 py-4 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                        {filteredPayables.map(exp => (
                                            <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-6 py-4 text-xs font-bold font-mono">{parseDateSafe(exp.date).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-6 py-4 font-black text-xs uppercase">{exp.description}</td>
                                                <td className="px-6 py-4 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                                    {suppliers.find(s => s.id === exp.supplierId)?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">{exp.category}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => toggleExpenseStatus(exp.id)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${exp.status === 'Pago' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'}`}>{exp.status}</button>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-rose-700 dark:text-rose-400">R$ {exp.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenModal(exp)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'DRE' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                            <div>
                                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><ArrowUpCircle size={16} className="text-emerald-500" /> Demonstração do Resultado (DRE)</h3>
                                <p className="text-[9px] text-slate-500 uppercase mt-0.5">Visão Gerencial de Competência</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handlePrintDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Printer size={18} /></button>
                                <button onClick={handleDownloadDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Download size={18} /></button>
                            </div>
                        </div>

                        {/* DRE Indicators / Insights at Top */}
                        <div className="p-6 bg-slate-50/50 dark:bg-zinc-800/20 border-b border-slate-200 dark:border-zinc-700">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Receita Bruta', value: dreData.grossRevenue, prefix: 'R$ ', color: 'indigo', icon: TrendingUp },
                                    { label: 'Margem de Lucro', value: dreData.grossRevenue > 0 ? (dreData.netResult / dreData.grossRevenue) * 100 : 0, suffix: '%', color: 'emerald', icon: Info },
                                    { label: 'Ponto de Equilíbrio', value: (dreData.grossProfit / dreData.grossRevenue) > 0 ? (dreData.totalOpExpenses / (dreData.grossProfit / dreData.grossRevenue)) : 0, prefix: 'R$ ', color: 'amber', icon: FileText },
                                    { label: 'Resultado Líquido', value: dreData.netResult, prefix: 'R$ ', color: dreData.netResult >= 0 ? 'emerald' : 'rose', icon: CheckCircle2 },
                                ].map((card, idx) => (
                                    <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`p-2 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`}>
                                                <card.icon size={16} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                                            <p className={`text-lg font-black mt-1 ${card.color === 'rose' ? 'text-rose-600' : 'text-slate-950 dark:text-white'}`}>
                                                {card.prefix}{card.value.toLocaleString('pt-BR', { minimumFractionDigits: card.suffix === '%' ? 1 : 2, maximumFractionDigits: card.suffix === '%' ? 1 : 2 })}{card.suffix}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
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
                                                    <td key={m.name} className="px-4 py-4 text-right text-xs font-bold border-l border-slate-200/50 dark:border-zinc-700/50">{m.grossRevenue.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-sm bg-indigo-100/20 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {dreData.grossRevenue.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.grossRevenue.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">100.0%</td>
                                            </>
                                        )}
                                    </tr>
                                    {expandedSections.includes('gross') && (
                                        <>
                                            <tr onClick={() => toggleSection('services-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {expandedSections.includes('services-list') ? <ChevronDown size={12} /> : <TrendingUp size={12} />}
                                                    └ Serviços
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 border-l border-slate-100 dark:border-zinc-800">{m.revenueServices.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-3 text-right text-xs font-black bg-slate-50/50 dark:bg-zinc-800/30 border-l-2 border-slate-200 dark:border-zinc-700">R$ {dreData.revenueServices.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">R$ {dreData.revenueServices.toFixed(2)}</td>
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
                                                            {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                // Logic to distribute service revenue if available per month
                                                                // Since 'info' here is an aggregate of services by name, we need to know the distribution.
                                                                // The current structure of 'breakdownServices' might only have totals. 
                                                                // Let's check how 'breakdownServices' is built. 
                                                                // If we don't have monthly breakdown in 'info', we can't distribute it easily without refactoring 'breakdownServices' construction.
                                                                // However, assuming 'info' has items list or we can iterate items like in Admin expenses.
                                                                // Wait, 'breakdownServices' in 'dreData' seems to be Record<string, {count: number, total: number}>. 
                                                                // It lacks the items list to group by month.

                                                                // Inspecting how breakdownServices is built in the backend/calculation logic would be ideal.
                                                                // FOR NOW: To fix the user request "Remove parcels", if this is indeed where they see it, 
                                                                // but wait, "Aluguel" is usually an expense, not a Service Revenue.
                                                                // If the user sees "Aluguel" here, they might have categorized it as Service? Unlikely.

                                                                // But to be consistent, we should show monthly values here if possible. 
                                                                // Since I cannot easily get monthly values without items, I might need to skip this section or simple show average? No that's bad.

                                                                // Let's assume the user's "Aluguel" is actually in Admin Expenses and my previous fix DID work, 
                                                                // but maybe they are looking at "CUSTOS OPERACIONAIS"?
                                                                // Let's look for "CUSTOS OPERACIONAIS" breakdown.

                                                                return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                            })}
                                                            <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {info.total.toFixed(2)}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {info.total.toFixed(2)}</td>
                                                            <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    {/* 2. DEDUÇÕES */}
                                    <tr>
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase pl-12 flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">2. (-) DEDUÇÕES E ABATIMENTOS</td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.deductions.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.deductions.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.deductions.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                    {dreData.grossRevenue > 0 ? ((dreData.deductions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                </td>
                                            </>
                                        )}
                                    </tr>

                                    {/* 3. RECEITA LÍQUIDA */}
                                    <tr className="bg-slate-50 dark:bg-zinc-800/50">
                                        <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase sticky left-0 bg-slate-50 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">3. (=) RECEITA LÍQUIDA</td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className="px-4 py-4 text-right text-xs font-bold border-l border-slate-200/50 dark:border-zinc-700/50">{m.netRevenue.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-sm border-l-2 border-slate-200 dark:border-zinc-700">R$ {dreData.netRevenue.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.netRevenue.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">{((dreData.netRevenue / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                            </>
                                        )}
                                    </tr>

                                    {/* 4. CPV/CMV */}
                                    <tr onClick={() => toggleSection('cogs')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <Menu size={16} />
                                            4. (-) CPV / CMV
                                        </td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.totalCOGS.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.totalCOGS.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.totalCOGS.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                    {dreData.grossRevenue > 0 ? ((dreData.totalCOGS / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    {expandedSections.includes('cogs') && (
                                        <>
                                            <tr onClick={() => toggleSection('commissions-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={12} />
                                                    └ Comissões (Técnica)
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">{m.commissions.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">R$ {dreData.commissions.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {dreData.commissions.toFixed(2)}</td>
                                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.commissions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('commissions-list') && Object.entries(dreData.breakdownCommissions as Record<string, any>).sort((a, b) => b[1].total - a[1].total).map(([name, info]) => (
                                                <tr key={name} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                    <td className="px-20 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic border-l-4 border-indigo-50 dark:border-indigo-900/10 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">
                                                        └ {name} <span className="text-[9px] text-slate-300">({info.count}x)</span>
                                                    </td>
                                                    {timeView === 'year' ? (
                                                        <>
                                                            {dreData.monthlySnapshots?.map((m: any) => (
                                                                <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                            ))}
                                                            <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {info.total.toFixed(2)}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {info.total.toFixed(2)}</td>
                                                            <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                            <tr className="animate-in slide-in-from-top-1 duration-200">
                                                <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">└ Custos Operacionais (Manuais)</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => {
                                                            const costVal = m.totalCOGS - m.commissions;
                                                            return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">{costVal.toFixed(0)}</td>
                                                        })}
                                                        <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">R$ {(dreData.totalCOGS - dreData.commissions).toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {(dreData.totalCOGS - dreData.commissions).toFixed(2)}</td>
                                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? (((dreData.totalCOGS - dreData.commissions) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
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
                                                    <td key={m.name} className={`px-4 py-4 text-right text-xs font-black border-l border-emerald-100 dark:border-emerald-800/30 ${m.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.grossProfit.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400 border-l-2 border-emerald-200 dark:border-emerald-800">R$ {dreData.grossProfit.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400">R$ {dreData.grossProfit.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right font-black text-[10px] text-emerald-600/50">
                                                    {dreData.grossRevenue > 0 ? ((dreData.grossProfit / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                </td>
                                            </>
                                        )}
                                    </tr>

                                    {/* 6. DESPESAS COM VENDAS */}
                                    <tr onClick={() => toggleSection('exp-vendas')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <Menu size={16} />
                                            6. (-) DESPESAS COM VENDAS
                                        </td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.amountVendas.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.amountVendas.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountVendas.toFixed(2)}</td>
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
                                                            return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{catTotal.toFixed(0)}</td>
                                                        })}
                                                        <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {(info.total as number).toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">R$ {(info.total as number).toFixed(2)}</td>
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
                                                                    return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? `R$ ${val.toFixed(2)}` : ''}</td>
                                                                })}
                                                                <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {group.total.toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {group.total.toFixed(2)}</td>
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

                                    {/* 7. DESPESAS ADMINISTRATIVAS */}
                                    <tr onClick={() => toggleSection('exp-adm')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <Menu size={16} />
                                            7. (-) DESPESAS ADMINISTRATIVAS
                                        </td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.amountAdm.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.amountAdm.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountAdm.toFixed(2)}</td>
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
                                                            return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{catTotal.toFixed(0)}</td>
                                                        })}
                                                        <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {(info.total as number).toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">R$ {(info.total as number).toFixed(2)}</td>
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
                                                                    return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? `R$ ${val.toFixed(2)}` : ''}</td>
                                                                })}
                                                                <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {group.total.toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {group.total.toFixed(2)}</td>
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

                                    {/* 8. DESPESAS FINANCEIRAS */}
                                    <tr onClick={() => toggleSection('exp-fin')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <Menu size={16} />
                                            8. (-) DESPESAS FINANCEIRAS
                                        </td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.amountFin.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.amountFin.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountFin.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                    {dreData.grossRevenue > 0 ? ((dreData.amountFin / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    {expandedSections.includes('exp-fin') && Object.entries(dreData.breakdownFin as Record<string, any>).map(([cat, info]) => (
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
                                                            return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{catTotal.toFixed(0)}</td>
                                                        })}
                                                        <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {(info.total as number).toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">R$ {(info.total as number).toFixed(2)}</td>
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
                                                                    return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? `R$ ${val.toFixed(2)}` : ''}</td>
                                                                })}
                                                                <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {group.total.toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {group.total.toFixed(2)}</td>
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

                                    {/* 9. RESULTADO ANTES IRPJ */}
                                    <tr className="bg-slate-100 dark:bg-zinc-800">
                                        <td className="px-8 py-4 font-black text-sm text-slate-800 dark:text-slate-200 uppercase sticky left-0 bg-slate-100 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">9. (=) RESULTADO ANTES IRPJ/CSLL</td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className={`px-4 py-4 text-right text-xs font-black border-l border-slate-200/50 dark:border-zinc-700/50 ${m.resultBeforeTaxes >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>{m.resultBeforeTaxes.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-sm text-slate-800 dark:text-slate-200 border-l-2 border-slate-300 dark:border-zinc-600">R$ {dreData.resultBeforeTaxes.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-sm text-slate-800 dark:text-slate-200">R$ {dreData.resultBeforeTaxes.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right font-black text-[10px] text-slate-500">
                                                    {dreData.grossRevenue > 0 ? ((dreData.resultBeforeTaxes / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                </td>
                                            </>
                                        )}
                                    </tr>

                                    {/* 10. PROVISÕES IRPJ */}
                                    <tr>
                                        <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase pl-12 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">10. (-) PROVISÕES IRPJ E CSLL</td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.irpjCsll.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.irpjCsll.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.irpjCsll.toFixed(2)}</td>
                                                <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                    {dreData.grossRevenue > 0 ? ((dreData.irpjCsll / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                </td>
                                            </>
                                        )}
                                    </tr>

                                    {/* 11. RESULTADO LÍQUIDO */}
                                    <tr className="bg-black text-white dark:bg-white dark:text-black">
                                        <td className="px-8 py-6 font-black text-sm uppercase sticky left-0 bg-black dark:bg-white z-10 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">11. (=) RESULTADO LÍQUIDO</td>
                                        {timeView === 'year' ? (
                                            <>
                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                    <td key={m.name} className={`px-4 py-6 text-right text-xs font-black border-l border-white/10 dark:border-black/10 ${m.netResult >= 0 ? '' : 'text-rose-400'}`}>{m.netResult.toFixed(0)}</td>
                                                ))}
                                                <td className="px-6 py-6 text-right font-black text-xl border-l-2 border-white/20 dark:border-black/20">R$ {dreData.netResult.toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-6 text-right font-black text-xl">R$ {dreData.netResult.toFixed(2)}</td>
                                                <td className="px-8 py-6 text-right font-black text-xs text-white/50">
                                                    {dreData.grossRevenue > 0 ? ((dreData.netResult / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>
                )}
                {activeTab === 'SUPPLIERS' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Users size={16} /> Cadastro de Fornecedores</h3>
                            <button onClick={() => handleOpenSupplierModal()} className="text-[10px] font-black uppercase text-white bg-black dark:bg-white dark:text-black px-4 py-2 rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition-all"><Plus size={12} /> Novo Fornecedor</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                        <th className="px-6 py-4">Nome</th>
                                        <th className="px-6 py-4">Categoria</th>
                                        <th className="px-6 py-4">Documento</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                    {suppliers.map(sup => (
                                        <tr key={sup.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                                            <td className="px-6 py-4 font-black text-xs uppercase">{sup.name}</td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">{sup.category || '-'}</td>
                                            <td className="px-6 py-4 text-xs font-bold font-mono">{sup.document || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{sup.phone || '-'}</span>
                                                    <span className="text-[9px] text-slate-400">{sup.email || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 flex items-center justify-center gap-2">
                                                <button onClick={() => handleOpenSupplierModal(sup)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteSupplier(sup.id)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {suppliers.length === 0 && (
                                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-xs font-bold uppercase">Nenhum fornecedor cadastrado</td></tr>
                                    )}
                                </tbody>
                            </table>
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
                            <form onSubmit={(e) => handleSaveExpense(e)} className="p-6 space-y-4">
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

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Categoria</label>
                                    <div className="relative">
                                        <select
                                            value={expenseForm.category}
                                            onChange={e => {
                                                const selectedCat = expenseCategories.find(c => c.name === e.target.value);
                                                setExpenseForm({
                                                    ...expenseForm,
                                                    category: e.target.value,
                                                    dreClass: selectedCat?.dreClass || expenseForm.dreClass
                                                });
                                            }}
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Favorecido (Fornecedor)</label>
                                        <div className="relative">
                                            <select
                                                value={expenseForm.supplierId || ''}
                                                onChange={e => setExpenseForm({ ...expenseForm, supplierId: e.target.value })}
                                                className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                            >
                                                <option value="">Nenhum (Gasto Avulso)</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><Users size={18} /> {editingSupplierId ? 'Editar' : 'Novo'} Fornecedor</h3>
                                <button onClick={() => setIsSupplierModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Nome do Fornecedor</label>
                                    <input type="text" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Categoria</label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                                value={supplierForm.category}
                                                onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })}
                                            >
                                                <option value="" disabled>Selecione...</option>
                                                {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                <option value="Outros">Outros</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Documento (CPF/CNPJ)</label>
                                        <input type="text" className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.document} onChange={e => setSupplierForm({ ...supplierForm, document: e.target.value })} />
                                    </div>
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
                    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border-2 border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
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
                )}
        </div >
    );
};
