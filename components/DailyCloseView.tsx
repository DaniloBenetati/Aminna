import React, { useState, useMemo } from 'react';
import {
    Users, Wallet, Lock, Sparkles, ShoppingBag, Target, Info, CheckCircle2,
    ChevronUp, ChevronDown, Crown, Printer, MessageCircle, PenTool, X, Copy, Send
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
    onShareWhatsapp?: (message?: string) => void;

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
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const paymentMethodsSummary = useMemo(() => {
        return dailyRelTrans.reduce((acc: Record<string, number>, t: FinancialTransaction) => {
            const method = t.paymentMethod || 'Outros';
            if (!acc[method]) acc[method] = 0;
            acc[method] += (t.type === 'RECEITA' ? t.amount : -t.amount);
            return acc;
        }, {} as Record<string, number>);
    }, [dailyRelTrans]);

    const handlePrint = () => {
        const printContent = `
            <html>
            <head>
                <title>Fechamento de Caixa - ${dateStr}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    body { 
                        font-family: 'Inter', -apple-system, sans-serif; 
                        padding: 40px; 
                        font-size: 11px; 
                        color: #1a1a1a; 
                        line-height: 1.4;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { font-weight: 900; letter-spacing: -0.5px; color: #000; margin: 0; }
                    .divider { border-bottom: 1.5px solid #eaeaea; margin: 15px 0; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
                    .section-title { 
                        font-weight: 800; 
                        font-size: 10px;
                        color: #666;
                        border-bottom: 2px solid #000;
                        padding-bottom: 2px;
                        margin-bottom: 12px; 
                        text-transform: uppercase; 
                        margin-top: 25px; 
                        letter-spacing: 1px;
                    }
                    .total-row { 
                        font-weight: 900; 
                        font-size: 14px; 
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 1px solid #000;
                    }
                    .professional-block { margin-bottom: 20px; break-inside: avoid; }
                    .professional-header { 
                        font-weight: 900; 
                        font-size: 12px; 
                        margin-bottom: 8px;
                        color: #000;
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 1px solid #f0f0f0;
                        padding-bottom: 4px;
                    }
                    .customer-row { font-weight: 700; margin-left: 0; margin-top: 8px; color: #333; }
                    .transaction-row { 
                        display: flex; 
                        justify-content: space-between; 
                        padding-left: 15px; 
                        color: #666; 
                        font-size: 9px;
                        margin-bottom: 2px;
                    }
                    @media print { 
                        @page { margin: 1cm; size: A4; } 
                        body { padding: 0; margin: 0; width: 100%; } 
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="font-size: 10px;">${new Date().toLocaleString('pt-BR')}</div>
                    <h1 style="font-size: 16px; font-weight: bold; margin: 10px 0;">AMINNA HOME NAIL GEL</h1>
                    <p style="margin: 0;">FECHAMENTO DE CAIXA</p>
                    <p style="font-size: 10px; margin: 5px 0;">Referência: ${date.toLocaleDateString('pt-BR')}</p>
                </div>

                <div class="divider"></div>

                <div class="row"><span>SERVIÇOS:</span> <span>R$ ${servicesWithTips.toFixed(2)}</span></div>
                <div class="row"><span>PRODUTOS:</span> <span>R$ ${totalProducts.toFixed(2)}</span></div>
                <div class="row total-row"><span>FATURAMENTO BRUTO:</span> <span>R$ ${totalRevenue.toFixed(2)}</span></div>

                <div class="divider"></div>

                <div class="section-title">DETALHAMENTO POR MÉTODO:</div>
                ${Object.entries(dailyTrans.reduce((acc: any, t: FinancialTransaction) => {
            const method = t.paymentMethod || 'Outros';
            if (!acc[method]) acc[method] = { count: 0, total: 0 };
            acc[method].count += 1;
            acc[method].total += (t.type === 'RECEITA' ? t.amount : -t.amount);
            return acc;
        }, {})).map(([method, data]: [string, any]) => `
                    <div class="row">
                        <span>${method.toUpperCase()} (${data.count}x):</span>
                        <span>R$ ${data.total.toFixed(2)}</span>
                    </div>
                `).join('')}

                <div class="divider"></div>

                <div class="section-title">OUTRAS INFORMAÇÕES:</div>
                <div class="row"><span>CAIXA POR:</span> <span>${closerName || '---'}</span></div>
                <div class="row"><span>CORTESIAS / VIP:</span> <span>${vipMetrics.count}x (R$ ${vipMetrics.value.toFixed(2)})</span></div>

                <div class="divider"></div>

                <div class="section-title">EXTRATO POR PROFISSIONAL:</div>
                <div style="font-size: 10px;">
                    ${Object.entries(groupedByProviderAndCustomer)
                .sort((a: [string, any], b: [string, any]) => b[1].amount - a[1].amount)
                .map(([pName, pData]: [string, any]) => `
                            <div class="professional-block">
                                <div class="professional-header">
                                    <span>${pName.toUpperCase()}</span>
                                    <span>R$ ${pData.amount.toFixed(2)}</span>
                                </div>
                                ${Object.entries(pData.customers)
                        .sort((a: [string, any], b: [string, any]) => b[1].amount - a[1].amount)
                        .map(([cName, cData]: [string, any]) => `
                                        <div class="customer-block">
                                            <div class="customer-row">${cName} (R$ ${cData.amount.toFixed(2)})</div>
                                            ${cData.transactions.map((t: FinancialTransaction) => `
                                                <div class="transaction-row">
                                                    <span style="flex: 2;">${t.serviceName || t.description}</span>
                                                    <span style="flex: 1; text-align: center; color: #999;">${t.paymentMethod}</span>
                                                    <span style="flex: 1; text-align: right;">R$ ${t.amount.toFixed(2)}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `).join('')}
                            </div>
                        `).join('')}
                </div>

                <div class="divider"></div>

                <div class="section-title">CONFERÊNCIA (DINHEIRO):</div>
                <div class="row"><span>SISTEMA:</span> <span>R$ ${dailyRelTrans.filter(t => t.paymentMethod === 'Dinheiro').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0).toFixed(2)}</span></div>
                <div class="row"><span>FÍSICO (GAVETA):</span> <span>R$ ${parseFloat(physicalCash || '0').toFixed(2)}</span></div>
                <div class="divider"></div>
                <div class="row total-row">
                    <span>DIFERENÇA:</span>
                    <span>R$ ${(parseFloat(physicalCash || '0') - dailyRelTrans.filter(t => t.paymentMethod === 'Dinheiro').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0)).toFixed(2)}</span>
                </div>
                ${(parseFloat(physicalCash || '0') - dailyRelTrans.filter(t => t.paymentMethod === 'Dinheiro').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0)) === 0 ? '<div style="text-align: center; font-weight: bold; margin-top: 5px;">(CAIXA BATIDO)</div>' : ''}
                
                <script>
                    window.onload = () => { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(printContent);
            win.document.close();
        }
    };

    const handleOpenWhatsapp = () => {
        const paymentMethods = dailyTrans.reduce((acc: any, t) => {
            const method = t.paymentMethod || 'Outros';
            if (!acc[method]) acc[method] = { count: 0, total: 0 };
            acc[method].count += 1;
            acc[method].total += (t.type === 'RECEITA' ? t.amount : -t.amount);
            return acc;
        }, {});

        const groupedProv = dailyRelTrans.reduce((acc: Record<string, any>, t) => {
            const pName = t.providerName || 'Não atribuído';
            if (!acc[pName]) acc[pName] = { amount: 0 };
            acc[pName].amount += (t.type === 'RECEITA' ? t.amount : -t.amount);
            return acc;
        }, {});

        const systemCash = dailyRelTrans.filter(t => t.paymentMethod === 'Dinheiro').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
        const phyCash = parseFloat(physicalCash || '0');
        const diff = phyCash - systemCash;

        // Using standard Unicode escapes for safety to ensure correct encoding across browsers/OS
        let message = `*AMINNA HOME NAIL GEL*\n`;
        message += `*FECHAMENTO DE CAIXA - ${date.toLocaleDateString('pt-BR')}* \uD83D\uDD12\n\n`;

        message += `*RESUMO GERAL:*\n`;
        message += `\u2728 Serviços: R$ ${(servicesWithTips).toFixed(2)}\n`;
        message += `\uD83D\uDECD️ Produtos: R$ ${totalProducts.toFixed(2)}\n`;
        message += `\uD83D\uDCA0 *FATURAMENTO BRUTO: R$ ${totalRevenue.toFixed(2)}*\n\n`;

        message += `*DETALHAMENTO POR MÉTODO:*\n`;
        Object.entries(paymentMethods).forEach(([method, data]: [string, any]) => {
            message += `\uD83D\uDD39 ${method} (${data.count}x): R$ ${data.total.toFixed(2)}\n`;
        });
        message += `\n`;

        message += `*EXTRATO POR PROFISSIONAL:*\n`;
        Object.entries(groupedProv).forEach(([pName, pData]: [string, any]) => {
            message += `\uD83D\uDC64 ${pName}: R$ ${pData.amount.toFixed(2)}\n`;
        });
        message += `\n`;

        message += `*CONFERÊNCIA:*\n`;
        message += `\uD83D\uDCBB Sistema (Dinheiro): R$ ${systemCash.toFixed(2)}\n`;
        message += `\uD83D\uDCB5 Físico (Gaveta): R$ ${phyCash.toFixed(2)}\n`;
        message += `\u2696\uFE0F Diferença: R$ ${diff.toFixed(2)} ${diff === 0 ? '(OK)' : ''}\n\n`;

        message += `*Observações:* ${closingObservation || 'Nenhuma'}\n`;
        message += `*Caixa por:* ${closerName || '---'}`;

        setWhatsappMessage(message);
        setIsWhatsAppModalOpen(true);
        setIsCopied(false);
    };

    return (
        <div className="space-y-4 animate-in slide-in-from-right duration-300 relative">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 print:hidden">
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
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



            <div className={`grid grid-cols-1 ${showControls ? 'lg:grid-cols-2' : ''} gap-4 print:hidden`}>
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
                                            {Object.entries(pData.customers).sort((a: [string, any], b: [string, any]) => b[1].amount - a[1].amount).map(([customerName, cData]: [string, any]) => {
                                                const hasRefazer = cData.transactions.some((t: any) => t.paymentMethod === 'Refazer');
                                                // If it's Refazer, we completely ignore VIP logic for display priority
                                                const isVip = !hasRefazer && (cData.amount < 0.01 || cData.isVip);

                                                return (
                                                    <div key={customerName} className="bg-white dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden p-2.5">
                                                        <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-50 dark:border-zinc-800/50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1.5">
                                                                    {customerName}
                                                                    {hasRefazer && <span className="bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 text-[7px] px-1.5 rounded-full flex items-center gap-0.5">REFAZER</span>}
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
                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                                <h5 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Wallet size={10} /> Totais por Método</h5>
                                <div className="space-y-1.5">
                                    {Object.entries(paymentMethodsSummary).map(([method, amount]: [string, any]) => (
                                        <div key={method} className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold uppercase text-slate-700 dark:text-slate-300">{method}</span>
                                            <span className="font-black text-slate-950 dark:text-white">R$ {amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-200 dark:border-zinc-700 my-1 pt-1 flex justify-between items-center text-[10px]">
                                        <span className="font-black uppercase text-slate-950 dark:text-white">Total</span>
                                        <span className="font-black text-slate-950 dark:text-white">R$ {Object.values(paymentMethodsSummary).reduce((a: any, b: any) => a + b, 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
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
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    <Printer size={12} /> Relatório
                                </button>
                                <button
                                    onClick={onCloseRegister}
                                    disabled={!physicalCash}
                                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Lock size={12} /> Fechar
                                </button>
                                <button onClick={handleOpenWhatsapp} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"><MessageCircle size={12} /> WhatsApp</button>
                            </div>
                            {!physicalCash && (
                                <p className="text-[10px] text-rose-500 text-center font-bold">Realize a conferência do valor em dinheiro para liberar o fechamento.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* WhatsApp Modal */}
            {
                isWhatsAppModalOpen && (
                    <div className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border-2 border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
                            <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="font-black uppercase text-base tracking-widest flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <MessageCircle size={20} />
                                        </div>
                                        Relatório WhatsApp
                                    </h3>
                                    <p className="text-[10px] uppercase font-bold opacity-80 mt-1 pl-12">Confira a mensagem antes de enviar</p>
                                </div>
                                <button onClick={() => setIsWhatsAppModalOpen(false)} className="hover:bg-white/20 p-2 rounded-2xl transition-colors"><X size={24} /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="bg-slate-50 dark:bg-zinc-950 p-6 rounded-3xl text-[13px] font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto border-2 border-slate-100 dark:border-zinc-800 shadow-inner leading-relaxed">
                                    {whatsappMessage}
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(whatsappMessage);
                                            setIsCopied(true);
                                            setTimeout(() => setIsCopied(false), 2000);
                                        }}
                                        className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 ${isCopied ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                                    >
                                        {isCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                        {isCopied ? 'Copiado!' : 'Copiar Texto'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (onShareWhatsapp) {
                                                onShareWhatsapp(whatsappMessage);
                                            } else {
                                                const encodedMessage = encodeURIComponent(whatsappMessage);
                                                window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
                                            }
                                            setIsWhatsAppModalOpen(false);
                                        }}
                                        className="flex-1 py-4 px-6 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-green-700 transition-all shadow-xl shadow-green-200 dark:shadow-none active:scale-95"
                                    >
                                        <Send size={18} /> Enviar Agora
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
