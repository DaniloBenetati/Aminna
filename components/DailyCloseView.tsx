import React, { useState, useMemo } from 'react';
import {
    Users, Wallet, Lock, Sparkles, ShoppingBag, Target, Info, CheckCircle2,
    ChevronUp, ChevronDown, Crown, Printer, MessageCircle, PenTool
} from 'lucide-react';
import { Appointment, Service, FinancialTransaction } from '../types';
import { toLocalDateStr, calculateDailySummary } from '../services/financialService';

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
    onPrint?: () => void;
    onCloseRegister?: () => void;
    onShareWhatsapp?: () => void;
    showControls?: boolean;
    vipMetrics?: { value: number, count: number };
}

export const DailyCloseView: React.FC<DailyCloseViewProps> = ({
    transactions, physicalCash, setPhysicalCash, closingObservation, setClosingObservation,
    closerName, setCloserName, date, appointments, services,
    onPrint, onCloseRegister, onShareWhatsapp, showControls = true,
    vipMetrics = { value: 0, count: 0 }
}) => {
    const dateStr = toLocalDateStr(date);

    const dailyTrans = transactions.filter(t => (t.appointmentDate || t.date) === dateStr);
    const dailyRelTrans = dailyTrans.filter((t: FinancialTransaction) =>
        (t.status === 'Pago' || t.status === 'Previsto') &&
        (t.type === 'RECEITA' || (t.type === 'DESPESA' && t.category === 'Ajuste de Valor'))
    );

    const { totalServices, totalProducts, totalAjustes, totalTips, totalRevenue, servicesWithTips } = calculateDailySummary(dailyRelTrans);

    // Fixed Indicators Calculation
    const revisedRevenue = totalRevenue;

    // Grouping by Professional -> Customer -> Transactions
    const groupedByProviderAndCustomer = dailyRelTrans.reduce((acc: Record<string, any>, t: FinancialTransaction) => {
        const pName = t.providerName || 'Não atribuído';
        const cName = t.customerName || 'Cliente Avulso';

        if (!acc[pName]) {
            acc[pName] = {
                amount: 0,
                count: 0,
                tipTotal: 0,
                customers: {}
            };
        }

        if (!acc[pName].customers[cName]) {
            acc[pName].customers[cName] = {
                amount: 0,
                tipAmount: 0,
                transactions: [],
                isVip: false
            };
        }

        const amt = (t.type === 'RECEITA' ? t.amount : -t.amount);
        acc[pName].amount += amt;
        if (t.origin === 'Serviço') acc[pName].count += 1;

        if (t.category === 'Caixinha') {
            acc[pName].tipTotal += t.amount;
            acc[pName].customers[cName].tipAmount += t.amount;
        }

        acc[pName].customers[cName].amount += amt;
        acc[pName].customers[cName].transactions.push(t);

        if (t.paymentMethod === 'Cortesia' || (t.type === 'DESPESA' && t.serviceName === 'Desconto Concedido' && t.amount > 0)) {
            acc[pName].customers[cName].isVip = true;
        }

        return acc;
    }, {} as Record<string, any>);

    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    return (
        <div className="space-y-4 animate-in slide-in-from-right duration-300 relative">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <Lock size={20} className="text-indigo-600 dark:text-indigo-400" /> Fechamento de Caixa
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mt-0.5">Ref: {date.toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 text-right">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturamento Bruto</p>
                        <p className="text-2xl font-black text-slate-950 dark:text-white">R$ {totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl"><Sparkles size={20} /></div>
                    <div><p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Serviços</p><p className="text-lg font-black text-slate-950 dark:text-white">R$ {servicesWithTips.toFixed(2)}</p></div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><ShoppingBag size={20} /></div>
                    <div><p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Produtos</p><p className="text-lg font-black text-slate-950 dark:text-white">R$ {totalProducts.toFixed(2)}</p></div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl"><Target size={20} /></div>
                    <div><p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Caixinhas</p><p className="text-lg font-black text-slate-950 dark:text-white">R$ {totalTips.toFixed(2)}</p></div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl"><Info size={20} /></div>
                    <div><p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ajustes</p><p className="text-lg font-black text-slate-950 dark:text-white">R$ {totalAjustes.toFixed(2)}</p></div>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${showControls ? 'lg:grid-cols-2' : ''} gap-4`}>
                <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50"><h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><Wallet size={14} /> Detalhamento</h4></div>
                    <div className="p-2 overflow-y-auto max-h-[400px]">
                        {Object.entries(groupedByProviderAndCustomer).sort((a, b) => b[1].amount - a[1].amount).map(([providerName, pData]) => {
                            const isProvExpanded = expandedProvider === providerName;
                            return (
                                <div key={providerName} className="border-b border-slate-5 dark:border-zinc-800 last:border-none">
                                    <div onClick={() => setExpandedProvider(isProvExpanded ? null : providerName)} className={`flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer rounded-xl transition-all ${isProvExpanded ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                <Users size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{providerName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{pData.count} SERVIÇOS TOTAIS</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {pData.tipTotal > 0 && (
                                                <span className="flex items-center gap-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/50">
                                                    <Target size={10} /> R$ {pData.tipTotal.toFixed(2)}
                                                </span>
                                            )}
                                            <span className="text-xs font-black text-slate-950 dark:text-white">R$ {pData.amount.toFixed(2)}</span>
                                            {isProvExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                        </div>
                                    </div>

                                    {isProvExpanded && (
                                        <div className="bg-slate-50/50 dark:bg-zinc-800/30 p-2 mx-2 mb-2 rounded-xl animate-in fade-in zoom-in-95 duration-200 space-y-2">
                                            {Object.entries(pData.customers).sort((a: any, b: any) => b[1].amount - a[1].amount).map(([customerName, cData]: [string, any]) => {
                                                const isVip = cData.amount < 0.01 || cData.isVip;
                                                return (
                                                    <div key={customerName} className="bg-white dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden p-2.5">
                                                        <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-50 dark:border-zinc-800/50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1.5">
                                                                    {customerName}
                                                                    {isVip && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[7px] px-1.5 rounded-full flex items-center gap-0.5"><Crown size={8} /> VIP</span>}
                                                                    {cData.tipAmount > 0 && <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[7px] px-1.5 rounded-full flex items-center gap-0.5"><Target size={8} /> CAIXINHA</span>}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-900 dark:text-white">R$ {cData.amount.toFixed(2)}</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            {cData.transactions.map((t: any, idx: number) => (
                                                                <div key={t.id || idx} className="flex justify-between items-center text-[9px] px-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-bold uppercase ${t.category === 'Caixinha' ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                            {t.serviceName || t.description}
                                                                        </span>
                                                                        <span className="text-[7px] text-slate-400 font-black uppercase tracking-wider">{t.paymentMethod}</span>
                                                                    </div>
                                                                    <span className={`font-black ${t.type === 'DESPESA' ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                        {t.type === 'DESPESA' ? '-' : ''} R$ {t.amount.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
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

                {showControls && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50"><h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><PenTool size={14} /> Conferência</h4></div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Valor em Dinheiro (Físico)</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-8 pr-3 py-2 border-2 rounded-xl text-sm font-black outline-none border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white"
                                            value={physicalCash}
                                            onChange={e => setPhysicalCash(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={onPrint} className="flex-1 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Printer size={12} /> Relatório</button>
                                <button onClick={onCloseRegister} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Lock size={12} /> Fechar</button>
                                <button onClick={onShareWhatsapp} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><MessageCircle size={12} /> WhatsApp</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
