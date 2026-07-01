import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Filter, Files, Calendar, MessageCircle, FileText, Download, ChevronDown, CircleCheck, AlertCircle, Search, Copy, Send, X, Printer, Scissors, FileSpreadsheet, FileCode, Heart } from 'lucide-react';
import { Service, Appointment, Provider, Customer } from '../types';
import { Toast } from './Toast';

interface ClosuresProps {
  services: Service[];
  appointments: Appointment[];
  providers: Provider[];
  customers: Customer[];
}

export const Closures: React.FC<ClosuresProps> = ({ services, appointments, providers, customers }) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [whatsappModalData, setWhatsappModalData] = useState<any | null>(null);
  const [fiscalDetailingData, setFiscalDetailingData] = useState<any | null>(null);
  const [dasAmounts, setDasAmounts] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aminna_das_amounts');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [otherDiscounts, setOtherDiscounts] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aminna_other_discounts');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [fiscalConfigs, setFiscalConfigs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('professional_fiscal_config').select('*').then(({ data }) => {
      if (data) setFiscalConfigs(data);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('aminna_das_amounts', JSON.stringify(dasAmounts));
  }, [dasAmounts]);

  useEffect(() => {
    localStorage.setItem('aminna_other_discounts', JSON.stringify(otherDiscounts));
  }, [otherDiscounts]);

  // Pre-fill from provider defaults if not in localStorage
  useEffect(() => {
    if (providers.length > 0) {
      setDasAmounts(prev => {
        const next = { ...prev };
        let changed = false;
        providers.forEach(p => {
          if (p.dasAmount !== undefined && next[p.id] === undefined) {
            next[p.id] = p.dasAmount;
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setOtherDiscounts(prev => {
        const next = { ...prev };
        let changed = false;
        providers.forEach(p => {
          if (p.otherDiscounts !== undefined && next[p.id] === undefined) {
            next[p.id] = p.otherDiscounts;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [providers]);

  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isAccountingModalOpen, setIsAccountingModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const persistDiscount = async (providerId: string, type: 'das' | 'discount', value: number) => {
    try {
      if (type === 'das') {
        // Update both tables for consistency
        await Promise.all([
          supabase.from('providers').update({ das_amount: value }).eq('id', providerId),
          supabase.from('professional_fiscal_config').update({ das_amount: value }).eq('provider_id', providerId)
        ]);
      } else {
        await supabase.from('professional_fiscal_config').update({ other_discounts: value }).eq('provider_id', providerId);
      }
    } catch (err) {
      console.error('Error persisting discount:', err);
    }
  };
  const [isPrintingProvision, setIsPrintingProvision] = useState(false);
  const [hideFaturamento, setHideFaturamento] = useState(false);
  const [printMode, setPrintMode] = useState<'auditoria' | 'receipt'>('receipt');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getFinancials = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    const defaultRate = provider?.commissionRate || 0;

    let revenue = 0; // Faturamento Bruto (Production)
    let commissionVal = 0; // Total a Repassar (Commission + Tips)
    let serviceCommission = 0; // Valor p/ Nota (Only Commissions)
    let totalTips = 0; // Caixinhas
    let count = 0;
    const detailedServices: any[] = [];

    appointments.forEach(app => {
      const referenceDate = app.date ? app.date.substring(0, 10) : (app.paymentDate ? app.paymentDate.substring(0, 10) : '');
      const inRange = referenceDate >= startDate && referenceDate <= endDate;
      const validStatus = app.status === 'Concluído';

      if (!inRange || !validStatus) return;

      const customer = customers.find(c => c.id === app.customerId);
      const displayDate = app.paymentDate || app.date;

      // Unify logic with DailyCloseView: Calculate total booked and actual collected revenue
      const mainService = services.find(s => s.id === app.serviceId);
      const mainBooked = (app.bookedPrice !== undefined && app.bookedPrice !== null ? app.bookedPrice : (mainService?.price || 0)) * (app.quantity || 1);
      
      const extrasList = (app.additionalServices || []).map(extra => {
        const extraS = services.find(s => s.id === extra.serviceId);
        const eBooked = extra.bookedPrice;
        return {
          ...extra,
          bookedPrice: (eBooked !== undefined && eBooked !== null ? eBooked : (extraS?.price || 0)) * (extra.quantity || 1),
          serviceName: extraS?.name || 'Serviço Extra'
        };
      });

      const totalBooked = mainBooked + extrasList.reduce((acc, e) => acc + e.bookedPrice, 0);
      const isRemake = app.isRemake || app.paymentMethod === 'Refazer' || app.paymentMethod?.startsWith('Justificativa');
      const tipAmount = Number(app.tipAmount || 0);
      const pricePaid = app.pricePaid !== undefined && app.pricePaid !== null ? Number(app.pricePaid) : totalBooked;
      const actualCollectedRevenue = app.status === 'Concluído' ? (pricePaid - tipAmount) : totalBooked;

      const isCourtesy = app.isCourtesy || app.paymentMethod === 'Cortesia' || (actualCollectedRevenue <= 0 && !isRemake && app.status === 'Concluído');
      
      // Calculate denominator for revenue pro-rating (paying services only)
      const totalBookedNonCourtesy = (isCourtesy ? 0 : mainBooked) + 
        extrasList.reduce((acc, e) => acc + (e.isCourtesy || app.paymentMethod === 'Cortesia' || (actualCollectedRevenue <= 0 && !isRemake && app.status === 'Concluído') ? 0 : e.bookedPrice), 0);

      const isDebt = app.paymentMethod === 'Dívida' || (app.payments || []).some((p: any) => p.method === 'Dívida');

      // 1. Process Main Service for this provider
      if (app.providerId === providerId) {
        // Revenue: For Production, we count the full booked price if it's a Debt or Courtesy
        // otherwise we use what was actually collected.
        // Use production value (booked price) for professional report
        let serviceRevenue = isRemake ? 0 : mainBooked;

        // Commission (Based on proportional revenue unless it's a remake)
        // If a coupon, debt or courtesy is applied, the commission base is the FULL booked price
        const hasCoupon = app.appliedCoupon && app.appliedCoupon.length > 0;
        const isActuallyRemake = isRemake || app.paymentMethod === 'Refazer' || app.paymentMethod?.startsWith('Justificativa');

        let commissionBase = 0;
        if (!isActuallyRemake) {
          commissionBase = (hasCoupon || isDebt || isCourtesy || customer?.isVip) && mainBooked > 0 ? mainBooked : serviceRevenue;
        }
        
        const rate = app.commissionRateSnapshot ?? defaultRate;
        const payout = commissionBase * rate;

        revenue += (isDebt || isCourtesy) ? mainBooked : serviceRevenue;
        serviceCommission += payout;
        commissionVal += payout;
        count += 1;

        detailedServices.push({
          date: displayDate,
          time: app.time,
          serviceName: app.combinedServiceNames && (!app.additionalServices || app.additionalServices.length === 0)
            ? app.combinedServiceNames
            : (mainService?.name || 'Serviço'),
          clientName: customer?.name || 'Cliente Avulso',
          price: payout, // Commission displayed as "Valor"
          faturamento: serviceRevenue, // Collected Revenue displayed as "Faturamento"
          rate: rate,
          appliedCoupon: app.appliedCoupon,
          isDebt,
          isCourtesy,
          isRemake,
          isSemCupom: !hasCoupon,
          observation: app.observation
        });
      }

      // 2. Process Additional Services for this provider
      extrasList.forEach(extra => {
        if (extra.providerId === providerId) {
          const extraIsCourtesy = extra.isCourtesy || app.paymentMethod === 'Cortesia' || (actualCollectedRevenue <= 0 && !isRemake && app.status === 'Concluído');
          
          // Revenue (Proportional)
          // Use production value (booked price) for professional report
          let serviceRevenue = isRemake ? 0 : extra.bookedPrice;

          // Commission (Based on proportional revenue)
          const extraBookedPrice = extra.bookedPrice;
          const hasCoupon = app.appliedCoupon && app.appliedCoupon.length > 0;
          const isActuallyRemake = isRemake || app.paymentMethod === 'Refazer' || app.paymentMethod?.startsWith('Justificativa');

          let commissionBase = 0;
          if (!isActuallyRemake) {
            commissionBase = (hasCoupon || isDebt || extraIsCourtesy || customer?.isVip) && extraBookedPrice > 0 ? extraBookedPrice : serviceRevenue;
          }
          
          const rate = extra.commissionRateSnapshot ?? defaultRate;
          const payout = commissionBase * rate;

          revenue += (isDebt || extraIsCourtesy) ? extraBookedPrice : serviceRevenue;
          serviceCommission += payout;
          commissionVal += payout;
          count += 1;

          detailedServices.push({
            date: displayDate,
            time: extra.startTime || app.time,
            serviceName: extra.serviceName,
            clientName: extra.clientName || customer?.name || 'Cliente Avulso',
            price: payout,
            faturamento: serviceRevenue,
            rate: rate,
            appliedCoupon: app.appliedCoupon,
            isDebt,
            isCourtesy: extraIsCourtesy,
            isRemake,
            isSemCupom: !hasCoupon,
            observation: app.observation
          });
        }
      });

      // 3. Tip (Caixinha) - Properly split between professionals
      const extrasTipsSum = (app.additionalServices || []).reduce((acc, s) => acc + (s.tipAmount || 0), 0);
      const mainProviderTip = tipAmount - extrasTipsSum;

      // main provider receives their part of the tip
      if (mainProviderTip > 0 && app.providerId === providerId) {
        commissionVal += mainProviderTip;
        totalTips += mainProviderTip;
        detailedServices.push({
          date: displayDate,
          time: app.time,
          serviceName: 'Caixinha / Gorjeta',
          clientName: customer?.name || 'Cliente Avulso',
          price: mainProviderTip,
          faturamento: mainProviderTip,
          rate: 1,
          isSemCupom: true
        });
      }

      // extra providers receive their specific tips
      extrasList.forEach(extra => {
        if (extra.tipAmount && extra.tipAmount > 0 && extra.providerId === providerId) {
          commissionVal += extra.tipAmount;
          totalTips += extra.tipAmount;
          detailedServices.push({
            date: displayDate,
            time: extra.startTime || app.time,
            serviceName: `Caixinha (${extra.serviceName})`,
            clientName: extra.clientName || customer?.name || 'Cliente Avulso',
            price: extra.tipAmount,
            faturamento: extra.tipAmount,
            rate: 1,
            isSemCupom: true
          });
        }
      });
    });

    const effectiveRate = revenue > 0 ? (serviceCommission / revenue) : defaultRate;
    const semCupomTotal = detailedServices.reduce((acc, s) => acc + (s.isSemCupom ? s.faturamento : 0), 0);

    return { provider, revenue, commissionRate: effectiveRate, commissionVal, serviceCommission, totalTips, count, details: detailedServices, semCupomTotal };
  };

  const reportData = useMemo(() => {
    const activeProviders = providers.filter(p => (selectedProvider === 'all' || p.id === selectedProvider) && (p.name.toLowerCase().includes(searchTerm.toLowerCase())));
    return activeProviders
      .map(p => {
        const financials = getFinancials(p.id);
        const das = dasAmounts[p.id] || 0;
        const discount = otherDiscounts[p.id] || 0;
        return { 
          ...financials, 
          das,
          discount,
          finalToPay: financials.commissionVal - das - discount
        };
      })
      .filter(data => data.revenue > 0 || data.commissionVal > 0);
  }, [providers, selectedProvider, searchTerm, startDate, endDate, services, appointments, dasAmounts, otherDiscounts]);

  const totals = useMemo(() => {
    return {
      toPay: reportData.reduce((acc, curr) => acc + curr.finalToPay, 0),
      serviceCommission: reportData.reduce((acc, curr) => acc + curr.serviceCommission, 0),
      revenue: reportData.reduce((acc, curr) => acc + curr.revenue, 0),
      tips: reportData.reduce((acc, curr) => acc + curr.totalTips, 0),
      semCupom: reportData.reduce((acc, curr) => acc + (curr.semCupomTotal || 0), 0),
      servicesCount: reportData.reduce((acc, curr) => acc + curr.count, 0)
    };
  }, [reportData]);

  const handleGenerateReceipts = (data: any | null = null, hideFat: boolean = false, mode: 'auditoria' | 'receipt' = 'receipt') => {
    setHideFaturamento(hideFat);
    setPrintMode(mode);
    setIsPrinting(true);
    setTimeout(() => {
      const wrapperId = data ? 'single-print-wrapper' : 'print-wrapper';
      const printContents = document.getElementById(wrapperId)?.innerHTML;
      if (!printContents) return;

      const newWin = window.open('', '_blank');
      if (!newWin) return;

      newWin.document.write(`
        <html>
          <head>
            <title>Recibo Aminna ${data ? '- ' + (data.provider?.name || '') : ''}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <style>
              @media print {
                @page { 
                  margin: 0; 
                  size: A4 portrait;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  height: 100%;
                }
                body { 
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact;
                  background-color: white !important;
                }
                .no-print { display: none !important; }
                .receipt-card {
                  margin: 0 !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  border: none !important;
                  display: block !important;
                  page-break-after: always !important;
                  overflow: visible !important;
                }
                thead { display: table-header-group !important; }
                tfoot { display: table-row-group !important; }
                tr { break-inside: avoid !important; }
                .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
                .detailed-report table { margin-bottom: 3rem !important; }
              }
              body { 
                font-family: 'Inter', sans-serif; 
                background-color: #f1f5f9;
                margin: 0;
                padding-top: 80px;
              }
              .toolbar {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 12px 24px;
                border-radius: 20px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                display: flex;
                gap: 12px;
                z-index: 1000;
              }
              .btn {
                padding: 8px 20px;
                border-radius: 12px;
                font-weight: 800;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
              }
              .btn-print { background: #0f172a; color: white; }
              .btn:hover { opacity: 0.9; transform: translateY(-1px); }
            </style>
          </head>
          <body>
            <div class="toolbar no-print">
              <button class="btn btn-print" onclick="window.print()">Imprimir Tudo</button>
            </div>
            <div id="content-to-export" class="max-w-[210mm] mx-auto">
              ${printContents}
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  // Optional: auto-trigger something?
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      newWin.document.close();
      setIsPrinting(false);
      setIsPrintingProvision(false);
    }, 500);
  };

  const ProvisionPrintSheet = () => {
    return (
      <div className="w-[210mm] min-h-[297mm] bg-white text-black p-12 flex flex-col gap-10">
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-8">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Aminna" className="w-16 h-16 object-contain dark:invert" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">Provisão de Pagamento</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Período de Referência</p>
            <p className="text-[11px] font-bold uppercase">{new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="border-2 border-slate-100 p-6 rounded-3xl">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Faturamento Bruto</p>
            <p className="text-lg font-black">{formatCurrency(totals.revenue)}</p>
          </div>
          <div className="border-2 border-slate-100 p-6 rounded-3xl">
            <p className="text-[8px] font-black text-indigo-400 uppercase mb-2">Total para Nota</p>
            <p className="text-lg font-black text-indigo-600">{formatCurrency(totals.serviceCommission)}</p>
          </div>
          <div className="border-2 border-slate-100 p-6 rounded-3xl">
            <p className="text-[8px] font-black text-rose-400 uppercase mb-2">Total Caixinhas</p>
            <p className="text-lg font-black text-rose-600">{formatCurrency(totals.tips)}</p>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl">
            <p className="text-[8px] font-black text-emerald-600 uppercase mb-2">Total a Repassar</p>
            <p className="text-lg font-black text-emerald-700">{formatCurrency(totals.toPay)}</p>
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 font-black uppercase text-slate-400">Profissional</th>
                <th className="px-4 py-4 text-right font-black uppercase text-slate-400">Nota</th>
                <th className="px-4 py-4 text-right font-black uppercase text-slate-400">Caixinhas</th>
                <th className="px-4 py-4 text-right font-black uppercase text-slate-400">DAS/Desc.</th>
                <th className="px-4 py-4 text-right font-black uppercase text-slate-400">Total Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((data, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-4 font-black uppercase text-slate-900">{data.provider?.name}</td>
                  <td className="px-4 py-4 text-right font-bold text-slate-500">{formatCurrency(data.serviceCommission)}</td>
                  <td className="px-4 py-4 text-right font-bold text-slate-500">{formatCurrency(data.totalTips)}</td>
                  <td className="px-4 py-4 text-right font-bold text-rose-500">
                    {(data.das + data.discount) > 0 ? `- ${formatCurrency(data.das + data.discount)}` : '—'}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-emerald-700 text-sm">{formatCurrency(data.finalToPay)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-900">
                <td colSpan={4} className="px-4 py-6 text-right font-black uppercase text-slate-900">Total Geral a Pagar</td>
                <td className="px-4 py-6 text-right font-black text-slate-950 text-base">{formatCurrency(totals.toPay)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-auto pt-10 flex justify-between items-end border-t border-slate-100 text-[9px] text-slate-400 uppercase font-black tracking-widest">
          <p>Aminna Gestão de Atendimentos — Relatório Interno</p>
          <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
    );
  };

  const ReceiptSheet: React.FC<{ data: any; type: 'summary' | 'details'; hideFaturamento: boolean; printMode?: 'auditoria' | 'receipt'; idx: number; receiptNumber: number }> = ({ data, type, hideFaturamento, printMode, idx, receiptNumber }) => {
    const Copy = ({ copyNum }: { copyNum: number }) => (
      <div className={`${type === 'summary' ? 'flex flex-col h-[147mm] overflow-hidden' : 'block min-h-[297mm] h-auto'} ${printMode === 'auditoria' ? 'p-6' : 'p-12'} relative bg-white border-b border-dashed border-slate-200 last:border-b-0 print:border-slate-300`}>
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-8">
            <img src="/logo.png" alt="Aminna" className="w-20 h-20 object-contain dark:invert" />
            <div className="text-[9px] font-medium text-slate-400 space-y-0.5 uppercase tracking-[0.2em]">
              <p>Aminna Gestão de Atendimentos</p>
              <p>CNPJ: 00.000.000/0001-00</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-900 tracking-[0.25em] mb-1">
              {type === 'summary' ? 'Recibo de Pagamento' : 'Recibo - Detalhamento de Serviços'}
            </p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Via {copyNum === 1 ? 'Contabilidade' : 'Profissional'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-10 pb-6 border-b border-slate-100">
          <div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-2">Profissional Beneficiária</p>
            <p className="text-base font-black uppercase text-slate-900 tracking-tighter">{data.provider?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-2">Referência</p>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase leading-none opacity-70">De {new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {type === 'summary' ? (
          <div className="flex-1 flex flex-col justify-start pt-4">
            <div className="mb-12 relative pl-8 border-l-2 border-slate-900">
              <p className="text-[13px] font-medium leading-relaxed text-slate-700 text-justify tracking-tight">
                Recebi de <span className="font-bold text-slate-900">AMINNA GESTÃO DE ATENDIMENTOS</span> a importância de <span className="font-black text-slate-900 border-b-2 border-indigo-500/30 pb-0.5">R$ {data.finalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> referente a <span className="font-bold">{data.count} serviços prestados</span> e ao repasse de comissão sobre atendimentos executados no período acima mencionado.
              </p>
              <p className="text-[10px] text-slate-500 mt-4">
                Composição: Comissões (R$ {data.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) + Caixinhas (R$ {data.totalTips.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}){data.das > 0 ? ` - DAS (R$ ${data.das.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}{data.discount > 0 ? ` - Descontos (R$ ${data.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}
              </p>
            </div>

            <div className="flex justify-end mt-4">
              <div className="flex flex-col items-end">
                <p className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Valor Total a Repassar</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter leading-none">R$ {data.finalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="block pt-4 overflow-visible">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Scissors size={10} className="opacity-40" /> Relatório de Atendimentos
            </p>
            <div className="block pr-2">
              <table className="w-full text-[10px] border-collapse overflow-visible">
                <thead>
                  <tr className="text-left font-black uppercase text-slate-300 tracking-widest border-b border-slate-100">
                    <th className="py-2 px-2">Data/Hora</th>
                    <th className="py-2">Serviço</th>
                    <th className="py-2">Cliente</th>
                    {!hideFaturamento && <th className="py-2 text-right">Faturamento</th>}
                    <th className="py-2 text-right pr-2">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.details.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0">
                      <td className="py-1 px-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 uppercase leading-none">{new Date((item.date ? item.date.substring(0, 10) : new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                          <span className="text-[7px] font-medium text-slate-400 mt-0.5">{item.time}</span>
                        </div>
                      </td>
                      <td className="py-1">
                        <p className="font-black text-slate-900 uppercase tracking-tight text-[9px]">{item.serviceName}</p>
                        {item.observation && (item.isRemake || item.isCourtesy) && (
                          <p className="text-[7px] font-bold text-rose-500 uppercase leading-tight mt-0.5">
                            {item.observation.includes('JUSTIFICATIVA') 
                              ? item.observation.substring(item.observation.indexOf('JUSTIFICATIVA')) 
                              : item.observation}
                          </p>
                        )}
                      </td>
                      <td className="py-1">
                        <p className="text-slate-500 font-bold uppercase tracking-tight text-[9px]">{item.clientName}</p>
                      </td>
                      {!hideFaturamento && (
                        <td className="py-1 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-slate-900">R$ {item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            {item.faturamento === 0 && (
                              <span className="text-[6px] font-black text-rose-500 uppercase leading-none">
                                {item.appliedCoupon ? `CUPOM: ${item.appliedCoupon}` : item.isRemake ? 'REFAZER' : item.isCourtesy ? 'CORTESIA' : 'SEM FATURAMENTO'}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="py-1 text-right pr-2 font-black text-slate-900">
                        R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Total Row for Conference */}
                <tfoot className="border-t-2 border-slate-900">
                  <tr className="bg-slate-50/50">
                    <td colSpan={2} className="py-2 px-2 font-black text-slate-900 uppercase">Subtotal Comissões</td>
                    <td></td>
                    {!hideFaturamento && (
                      <td className="py-2 text-right font-black text-slate-900">
                        R$ {data.details.reduce((acc: number, item: any) => acc + (item.faturamento || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td className="py-2 text-right pr-2 font-black text-indigo-600">
                      R$ {data.details.reduce((acc: number, item: any) => acc + (item.price || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {(data.das > 0 || data.discount > 0) && (
                    <React.Fragment>
                      {data.das > 0 && (
                        <tr className="bg-white">
                          <td colSpan={type === 'details' && !hideFaturamento ? 4 : 3} className="py-1 px-2 text-right text-[10px] font-bold text-slate-400 uppercase">(-) DAS</td>
                          <td className="py-1 text-right pr-2 font-black text-rose-500">R$ {data.das.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      {data.discount > 0 && (
                        <tr className="bg-white">
                          <td colSpan={type === 'details' && !hideFaturamento ? 4 : 3} className="py-1 px-2 text-right text-[10px] font-bold text-slate-400 uppercase">(-) Outros Descontos</td>
                          <td className="py-1 text-right pr-2 font-black text-rose-500">R$ {data.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      <tr className="bg-indigo-50/30 border-t border-slate-100">
                        <td colSpan={type === 'details' && !hideFaturamento ? 4 : 3} className="py-2 px-2 text-right text-[11px] font-black text-slate-900 uppercase">Total Líquido a Repassar</td>
                        <td className="py-2 text-right pr-2 font-black text-emerald-700 text-sm">R$ {data.finalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </React.Fragment>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className={`${type === 'summary' ? 'mt-auto' : 'mt-16'} pt-6 flex justify-between items-end avoid-break`}>
          <div className="flex-1 max-w-[280px]">
            <div className="w-full border-b border-slate-900 mb-2"></div>
            <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{data.provider?.name}</p>
            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-1">Assinatura</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-1">Autenticação: {receiptNumber}-{idx}</p>
          </div>
        </div>
      </div>
    );

    return (
      <React.Fragment>
        <div className={`receipt-card w-[210mm] ${type === 'summary' ? 'flex flex-col h-[297mm] overflow-hidden' : 'block min-h-[297mm] h-auto detailed-report'} bg-white text-black print:break-after-page shadow-2xl mx-auto my-8 print:my-0 relative shrink-0`}>
          <Copy copyNum={1} />
          {type === 'summary' && printMode !== 'auditoria' && <Copy copyNum={2} />}
        </div>
        {type === 'details' && (
          <div className="receipt-card w-[210mm] block min-h-[297mm] h-auto detailed-report bg-white text-black print:break-after-page shadow-2xl mx-auto my-8 print:my-0 relative shrink-0">
            <Copy copyNum={2} />
          </div>
        )}
      </React.Fragment>
    );
  };

  const generateWhatsappMessage = (data: any, includeDetails: boolean = false) => {
    const phone = data.provider?.phone?.replace(/\D/g, '') || '';
    let message = `* RECIBO DE REPASSE - AMINNA *\n`;
    message += `* Profissional:* ${data.provider.name}\n`;
    message += `* Período:* ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n\n`;

    if (includeDetails && data.details && data.details.length > 0) {
      message += `* RECIBO - DETALHAMENTO DE SERVIÇOS:*\n`;
      data.details.forEach((item: any) => {
        const itemVal = item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        let dateLabel = item.date || '';
        if (dateLabel.includes('T')) dateLabel = dateLabel.split('T')[0];
        if (dateLabel.includes('-')) {
          const parts = dateLabel.split('-');
          if (parts.length === 3) dateLabel = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        message += `* ${dateLabel} - ${item.serviceName} (${item.clientName}): R$ ${itemVal}\n`;
        if (item.observation && (item.isRemake || item.isCourtesy)) {
          const just = item.observation.includes('JUSTIFICATIVA') 
            ? item.observation.substring(item.observation.indexOf('JUSTIFICATIVA')) 
            : item.observation;
          message += `  _Motivo: ${just}_\n`;
        }
      });
      message += `\n`;
    }

    message += `* RESUMO FINANCEIRO:*\n`;
    message += `* VALOR P/ NOTA:* R$ ${data.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    message += `* CAIXINHAS:* R$ ${data.totalTips.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    if (data.das > 0) {
      message += `* DESCONTO DAS:* -R$ ${data.das.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    }
    if (data.discount > 0) {
      message += `* OUTROS DESCONTOS:* -R$ ${data.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    }
    message += `* TOTAL LÍQUIDO: R$ ${data.finalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    message += `_Gerado automaticamente pelo Sistema Aminna._`;
    return { message, phone };
  };

  const generateProvisionSummary = () => {
    let message = `* PROVISÃO DE PAGAMENTO - AMINNA *\n`;
    message += `* Período:* ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n`;
    message += `----------------------------\n\n`;

    reportData.forEach(data => {
      message += `*${data.provider?.name?.toUpperCase()}*\n`;
      message += `• Valor p/ Nota: R$ ${data.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      message += `• Caixinhas: R$ ${data.totalTips.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      if (data.das > 0) {
        message += `• DAS (Desconto): -R$ ${data.das.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      if (data.discount > 0) {
        message += `• Outros Descontos: -R$ ${data.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      message += `*LÍQUIDO: R$ ${data.finalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
      message += `----------------------------\n`;
    });

    const totalProvision = totals.toPay;
    message += `\n*TOTAL GERAL A PAGAR: R$ ${totalProvision.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    message += `_Gerado automaticamente pelo Sistema Aminna._`;
    return message;
  };

  const generateFiscalDetailingText = (data: any) => {
    if (!data || !data.details) return '';

    // Group services by name
    const grouped = data.details.reduce((acc: any, item: any) => {
      // Skip tips if they shouldn't be in the fiscal service description
      if (item.serviceName.toLowerCase().includes('caixinha') || item.serviceName.toLowerCase().includes('gorjeta')) return acc;
      
      const key = item.serviceName;
      if (!acc[key]) {
        acc[key] = { count: 0, total: 0 };
      }
      acc[key].count += 1;
      acc[key].total += item.price;
      return acc;
    }, {});

    const providerName = data.provider?.name?.toUpperCase() || '';
    const rate = ((data.provider?.commissionRate || 0) * 100).toFixed(0);
    const fiscal = fiscalConfigs.find((f: any) => f.provider_id === data.provider?.id);
    
    // Competence date from the selected range starts
    const competenceDate = new Date(startDate + 'T12:00:00');
    const month = String(competenceDate.getMonth() + 1).padStart(2, '0');
    const year = competenceDate.getFullYear();
    const competence = `${month}/${year}`;

    let text = `SERVIÇOS REALIZADOS\n\n`;
    text += `COMPETÊNCIA: ${competence}\n`;
    text += `PROFISSIONAL: ${providerName}\n`;
    text += `PERCENTUAL CONTRATO: ${rate}% CONFORME LEI 13.352/2016 (ART. 1º-A):\n`;
    
    if (fiscal) {
      if (fiscal.social_name) text += `RAZÃO SOCIAL: ${fiscal.social_name.toUpperCase()}\n`;
      if (fiscal.cnpj) text += `CNPJ: ${fiscal.cnpj}\n`;
    }
    
    text += `\nVALORES REFERENTES À COTA-PARTE DO PROFISSIONAL PARCEIRO, SEGREGADOS NOS TERMOS DA LEI Nº 13.352/2016.\n\n`;
    
    Object.entries(grouped).forEach(([name, info]: [string, any]) => {
      text += `• ${name.toUpperCase()}: R$ ${info.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (QTD: ${info.count})\n`;
    });

    const totalService = Object.values(grouped).reduce((acc: number, info: any) => acc + info.total, 0);
    text += `\nTOTAL DAS COTAS-PARTE: R$ ${totalService.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    return text;
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col pb-24 md:pb-8 text-slate-900 dark:text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight uppercase">Repasses Profissionais</h2><p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Cálculo de Comissões e Caixinhas</p></div>
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-2 rounded-2xl border border-slate-200 shadow-sm"><Calendar size={16} className="text-slate-400" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none" /><span className="text-slate-300 font-black">-</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none" /></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <div className="bg-white dark:bg-zinc-900 p-2 md:p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="min-w-0"><p className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">Faturamento Bruto</p><p className="text-[10px] md:text-[11px] font-black whitespace-nowrap">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
          <div className="bg-slate-50 dark:bg-zinc-800 p-1 md:p-1.5 rounded-lg text-slate-400 flex-shrink-0 ml-1"><Files size={12} className="md:w-[14px] md:h-[14px]" /></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-2 md:p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="min-w-0"><p className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">Total para Nota</p><p className="text-[10px] md:text-[11px] font-black text-indigo-600 whitespace-nowrap">R$ {totals.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
          <div className="bg-slate-50 dark:bg-zinc-800 p-1 md:p-1.5 rounded-lg text-indigo-400 flex-shrink-0 ml-1"><FileText size={12} className="md:w-[14px] md:h-[14px]" /></div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-2 md:p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="min-w-0"><p className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">Total Caixinhas</p><p className="text-[10px] md:text-[11px] font-black text-rose-600 whitespace-nowrap">R$ {totals.tips.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
          <div className="bg-slate-50 dark:bg-zinc-800 p-1 md:p-1.5 rounded-lg text-rose-400 flex-shrink-0 ml-1"><Heart size={12} className="md:w-[14px] md:h-[14px]" /></div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 md:p-2.5 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="min-w-0"><p className="text-[6px] md:text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 truncate">Total a Repassar</p><p className="text-[10px] md:text-[11px] font-black text-emerald-700 whitespace-nowrap">R$ {totals.toPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
          <div className="bg-white dark:bg-zinc-900 p-1 md:p-1.5 rounded-lg text-emerald-600 flex-shrink-0 ml-1"><CircleCheck size={12} className="md:w-[14px] md:h-[14px]" /></div>
        </div>
      </div>

      <div className="flex flex-row justify-between items-center bg-white dark:bg-zinc-900 p-2 md:p-3 rounded-2xl border border-slate-200 shadow-sm gap-2">
        <div className={`relative transition-all duration-300 flex items-center ${isSearchOpen ? 'flex-1 min-w-[150px]' : 'w-9'}`}>
          {isSearchOpen ? (
            <div className="relative w-full flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Buscar profissional..." 
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-zinc-800 border rounded-xl text-[10px] font-black outline-none animate-in slide-in-from-left-1 duration-200" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button onClick={() => {setSearchTerm(''); setIsSearchOpen(false);}} className="absolute right-2 p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-md transition-colors"><X size={12} className="text-slate-400" /></button>
            </div>
          ) : (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl hover:bg-slate-100 transition-colors"
              title="Buscar"
            >
              <Search size={16} className="text-slate-500" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => handleGenerateReceipts(null, false, 'auditoria')} className="flex items-center justify-center gap-1.5 bg-slate-950 dark:bg-white text-white dark:text-black px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md hover:bg-slate-800 transition-all active:scale-95">
            <Printer size={12} /> <span className="hidden sm:inline">Auditoria</span>
          </button>
          <button onClick={() => handleGenerateReceipts(null, true, 'receipt')} className="flex items-center justify-center gap-1.5 bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all active:scale-95">
            <Printer size={12} /> <span className="hidden sm:inline">Recibos</span>
          </button>
          <button onClick={() => setIsProvisionModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-white dark:bg-zinc-800 text-slate-950 dark:text-white border border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all active:scale-95">
            <FileSpreadsheet size={12} className="text-emerald-500" /> <span className="hidden sm:inline">Provisão</span>
          </button>
          <button onClick={() => setIsAccountingModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-white dark:bg-zinc-800 text-slate-950 dark:text-white border border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all active:scale-95">
            <FileCode size={12} className="text-amber-500" /> <span className="hidden sm:inline">Contabilidade</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 text-slate-900 dark:text-white scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
          <table className="w-full text-left text-sm relative min-w-[1000px] lg:min-w-0">
            <thead className="bg-slate-50 dark:bg-zinc-800 text-[9px] uppercase font-black border-b sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-zinc-800 z-20">Profissional</th>
                <th className="px-3 py-3 text-center">Serviços</th>
                <th className="px-3 py-3 text-right">Faturamento</th>
                <th className="px-3 py-3 text-center">Comissão</th>
                <th className="px-3 py-3 text-right underline decoration-indigo-200 whitespace-nowrap">Valor p/ Nota</th>
                <th className="px-3 py-3 text-right underline decoration-rose-200 whitespace-nowrap">Caixinhas</th>
                <th className="px-3 py-3 text-right text-rose-500 whitespace-nowrap">DAS</th>
                <th className="px-3 py-3 text-right text-rose-600 whitespace-nowrap">Descontos</th>
                <th className="px-3 py-3 text-right underline decoration-emerald-200 whitespace-nowrap">Total à Repassar</th>
                <th className="px-4 py-3 text-center sticky right-0 bg-slate-50 dark:bg-zinc-800 z-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {reportData.map(data => (
                <tr key={data.provider?.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors text-[10px] md:text-xs">
                  <td className="px-4 py-3 font-black sticky left-0 bg-white dark:bg-zinc-900 z-10 uppercase">{data.provider?.name}</td>
                  <td className="px-3 py-3 text-center font-bold">{data.count}</td>
                  <td className="px-3 py-3 text-right text-slate-500 font-bold whitespace-nowrap">R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-3 text-center font-black">{((data.provider?.commissionRate || 0) * 100).toFixed(0)}%</td>
                  <td className="px-3 py-3 text-right font-black text-indigo-600 whitespace-nowrap">R$ {data.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-3 text-right font-black text-rose-600 whitespace-nowrap">R$ {data.totalTips.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                   <td className="px-3 py-3 text-right">
                    <input 
                      type="number" 
                      value={dasAmounts[data.provider?.id || ''] || ''} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setDasAmounts(prev => ({ ...prev, [data.provider?.id || '']: val }));
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        persistDiscount(data.provider?.id || '', 'das', val);
                      }}
                      placeholder="0,00"
                      className="w-16 text-right bg-slate-50 dark:bg-zinc-800 border-none rounded-lg p-1 text-[10px] font-black text-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input 
                      type="number" 
                      value={otherDiscounts[data.provider?.id || ''] || ''} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setOtherDiscounts(prev => ({ ...prev, [data.provider?.id || '']: val }));
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        persistDiscount(data.provider?.id || '', 'discount', val);
                      }}
                      placeholder="0,00"
                      className="w-16 text-right bg-slate-50 dark:bg-zinc-800 border-none rounded-lg p-1 text-[10px] font-black text-rose-600 focus:ring-1 focus:ring-rose-600 outline-none"
                    />
                  </td>
                  <td className="px-3 py-3 text-right font-black text-emerald-700 whitespace-nowrap">R$ {data.finalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 sticky right-0 bg-white dark:bg-zinc-900 z-10">
                    <div className="flex items-center justify-center gap-1">
                       <button onClick={() => { setSelectedReceipt(data); handleGenerateReceipts(data, true, 'auditoria'); }} title="Recibo Detalhado (Sem Faturamento)" className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors">
                        <FileText size={16} />
                      </button>
                      <button onClick={() => setWhatsappModalData(data)} title="Enviar via WhatsApp" className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors">
                        <MessageCircle size={16} />
                      </button>
                      <button onClick={() => setFiscalDetailingData(data)} title="Gerar Detalhamento Fiscal (NFSe)" className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors">
                        <FileCode size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {whatsappModalData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl p-6 flex flex-col items-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600"><MessageCircle size={24} /></div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Enviar Comprovante</h3>
            <p className="text-xs text-slate-500 text-center mb-6">Compartilhar com {whatsappModalData.provider?.name}.</p>
            <div className="w-full space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    const { message, phone } = generateWhatsappMessage(whatsappModalData, false);
                    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`, '_blank');
                    setWhatsappModalData(null);
                  }} 
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex flex-col items-center justify-center"
                >
                  <Send size={14} className="mb-1" /> Enviar Resumo
                </button>
                <button 
                  onClick={() => {
                    const { message, phone } = generateWhatsappMessage(whatsappModalData, true);
                    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`, '_blank');
                    setWhatsappModalData(null);
                  }} 
                  className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex flex-col items-center justify-center"
                >
                  <FileText size={14} className="mb-1" /> Detalhado
                </button>
              </div>
              <button 
                onClick={() => {
                  const { message } = generateWhatsappMessage(whatsappModalData, true);
                  navigator.clipboard.writeText(message);
                  setWhatsappModalData(null);
                  showToast('Texto Detalhado Copiado!', 'success');
                }} 
                className="w-full py-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Copy size={16} /> Copiar Texto (Completo)
              </button>
              <button onClick={() => setWhatsappModalData(null)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {fiscalDetailingData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                  <FileCode size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalhamento p/ Nota</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{fiscalDetailingData.provider?.name}</p>
                </div>
              </div>
              <button onClick={() => setFiscalDetailingData(null)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <textarea
              readOnly
              className="w-full h-64 p-6 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-3xl font-mono text-[11px] text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
              value={generateFiscalDetailingText(fiscalDetailingData)}
            />

            <div className="mt-8 grid grid-cols-2 gap-4">
              <button
                onClick={() => setFiscalDetailingData(null)}
                className="py-4 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const text = generateFiscalDetailingText(fiscalDetailingData);
                  navigator.clipboard.writeText(text);
                  showToast('Copiado com sucesso! Agora você pode colar na descrição da sua nota fiscal.', 'success');
                  setFiscalDetailingData(null);
                }}
                className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
              >
                <Copy size={18} /> Copiar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50">
              <div><h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalhamento</h3><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedReceipt.provider?.name}</p></div>
              <button onClick={() => setSelectedReceipt(null)} className="p-3 hover:bg-white rounded-2xl text-slate-400"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {!hideFaturamento && (
                  <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Faturamento</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">R$ {selectedReceipt.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Comissões</p>
                  <p className="text-sm font-black text-indigo-600">R$ {selectedReceipt.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Caixinhas</p>
                  <p className="text-sm font-black text-rose-600">R$ {selectedReceipt.totalTips.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                {selectedReceipt.das > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-3xl border border-rose-100">
                    <p className="text-[8px] font-black text-rose-500 uppercase mb-1">DAS (MEI)</p>
                    <p className="text-sm font-black text-rose-600">R$ {selectedReceipt.das.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                {selectedReceipt.discount > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-3xl border border-rose-100">
                    <p className="text-[8px] font-black text-rose-500 uppercase mb-1">Descontos</p>
                    <p className="text-sm font-black text-rose-600">R$ {selectedReceipt.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-3xl border border-emerald-100">
                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Líquido</p>
                  <p className="text-sm font-black text-emerald-700">R$ {selectedReceipt.finalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Serviços</h4>
                <div className="space-y-2">
                  {selectedReceipt.details.map((service: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                          {new Date((service.date ? service.date.substring(0, 10) : new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </div>
                        <div><p className="text-xs font-black uppercase text-slate-900 dark:text-white">{service.serviceName}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{service.clientName}</p></div>
                      </div>
                      <div className="flex items-center gap-6">
                        {!hideFaturamento && (
                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Faturamento</p>
                            <div className="flex flex-col items-end">
                               <p className="text-[10px] font-bold text-slate-900 dark:text-white">R$ {service.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                               {service.faturamento === 0 && (
                                 <span className="text-[7px] font-black text-rose-500 uppercase leading-none">
                                   {service.appliedCoupon ? `CUPOM: ${service.appliedCoupon}` : service.isRemake ? 'REFAZER' : service.isCourtesy ? 'CORTESIA' : 'SEM FATURAMENTO'}
                                 </span>
                               )}
                            </div>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-[8px] font-black text-indigo-600 uppercase leading-none">Comissão</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white">R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-4 bg-slate-50/50">
              <button 
                onClick={() => handleGenerateReceipts(selectedReceipt, false, 'auditoria')}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
              >
                <Printer size={18} /> Detalhado (Auditoria)
              </button>
              <button 
                onClick={() => handleGenerateReceipts(selectedReceipt, true, 'receipt')}
                className="flex-[2] flex items-center justify-center gap-2 bg-slate-950 dark:bg-white text-white dark:text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg"
              >
                <Printer size={18} /> Imprimir Recibo Profissional
              </button>
            </div>
          </div>
        </div>
      )}

      {(isPrinting || isPrintingProvision) && (
        <div id="print-wrapper" className="hidden print:block">
          {isPrintingProvision ? (
            <ProvisionPrintSheet />
          ) : (
            <>
              {selectedReceipt ? (
                <div id="single-print-wrapper">
                  {(() => {
                    const rNum = Math.floor(100000 + Math.random() * 900000);
                    return (
                      <React.Fragment>
                        {printMode === 'receipt' && (
                          <ReceiptSheet data={selectedReceipt} type="summary" hideFaturamento={hideFaturamento} printMode={printMode} idx={0} receiptNumber={rNum} />
                        )}
                        <ReceiptSheet data={selectedReceipt} type="details" hideFaturamento={hideFaturamento} printMode={printMode} idx={0} receiptNumber={rNum} />
                      </React.Fragment>
                    );
                  })()}
                </div>
              ) : (
                reportData.map((data, idx) => {
                  const rNum = Math.floor(100000 + Math.random() * 900000);
                  return (
                    <React.Fragment key={idx}>
                      {printMode === 'receipt' && (
                        <ReceiptSheet data={data} type="summary" hideFaturamento={hideFaturamento} printMode={printMode} idx={idx} receiptNumber={rNum} />
                      )}
                      <ReceiptSheet data={data} type="details" hideFaturamento={hideFaturamento} printMode={printMode} idx={idx} receiptNumber={rNum} />
                    </React.Fragment>
                  );
                })
              )}
            </>
          )}
        </div>
      )}

      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Provisão de Pagamento</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Resumo consolidado para o financeiro</p>
                </div>
              </div>
              <button onClick={() => setIsProvisionModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white text-slate-400"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-3xl p-6 border border-slate-100 dark:border-zinc-700 font-mono text-[11px] whitespace-pre-wrap text-slate-600 dark:text-slate-300 line-clamp-[20]">
                {generateProvisionSummary()}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <button 
                onClick={() => {
                  const msg = generateProvisionSummary();
                  navigator.clipboard.writeText(msg);
                  showToast('Copiado para a área de transferência!', 'success');
                }}
                className="py-4 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                <Copy size={18} /> Copiar Texto
              </button>
              <button 
                onClick={() => {
                  const message = generateProvisionSummary();
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
              >
                <MessageCircle size={18} /> WhatsApp
              </button>
              <button 
                onClick={() => {
                  setIsPrintingProvision(true);
                  handleGenerateReceipts();
                }}
                className="py-4 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all col-span-2 lg:col-span-1"
              >
                <Printer size={18} /> Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {isAccountingModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                  <FileCode size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Relatório Contábil</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dados fiscais e faturamento por profissional</p>
                </div>
              </div>
              <button onClick={() => setIsAccountingModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white text-slate-400 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-auto p-3 md:p-6">
              <table className="w-full text-left text-[9px] md:text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800 text-[8px] md:text-[9px] font-black uppercase tracking-widest border-b">
                    <th className="px-2 py-2 md:px-3 md:py-3">Profissional</th>
                    <th className="px-2 py-2 md:px-3 md:py-3">Empresa (Razão Social)</th>
                    <th className="px-2 py-2 md:px-3 md:py-3">CNPJ</th>
                    <th className="px-2 py-2 md:px-3 md:py-3 text-right whitespace-nowrap">Valor p/ Nota</th>
                    <th className="px-2 py-2 md:px-3 md:py-3 text-right whitespace-nowrap">Faturamento Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {reportData.map(data => {
                    const fiscal = fiscalConfigs.find((f: any) => f.provider_id === data.provider?.id);
                    return (
                      <tr key={data.provider?.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-2 py-2 md:px-3 md:py-3 font-black text-slate-900 dark:text-white uppercase">{data.provider?.name}</td>
                        <td className="px-2 py-2 md:px-3 md:py-3 font-bold text-slate-500 uppercase">{fiscal?.social_name || '—'}</td>
                        <td className="px-2 py-2 md:px-3 md:py-3 font-bold text-slate-500">{fiscal?.cnpj || '—'}</td>
                        <td className="px-2 py-2 md:px-3 md:py-3 text-right font-black text-indigo-600 whitespace-nowrap">R$ {data.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-2 md:px-3 md:py-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap gap-4">
              <button 
                onClick={() => {
                  const headers = ["Profissional", "Razao Social", "CNPJ", "Valor para Nota", "Faturamento Bruto"];
                  const rows = reportData.map(data => {
                    const fiscal = fiscalConfigs.find((f: any) => f.provider_id === data.provider?.id);
                    return [
                      data.provider?.name,
                      fiscal?.social_name || '',
                      fiscal?.cnpj || '',
                      data.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false }),
                      data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, useGrouping: false })
                    ].join(";");
                  });
                  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `Relatorio_Contabil_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex-1 min-w-[150px] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Download size={18} /> Exportar CSV
              </button>
              <button 
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  
                  const rows = reportData.map(data => {
                    const fiscal = fiscalConfigs.find((f: any) => f.provider_id === data.provider?.id);
                    return `
                      <tr>
                        <td style="font-weight: bold; text-transform: uppercase;">${data.provider?.name || ''}</td>
                        <td style="text-transform: uppercase;">${fiscal?.social_name || '—'}</td>
                        <td>${fiscal?.cnpj || '—'}</td>
                        <td align="right" style="font-weight: bold; color: #4f46e5;">R$ ${data.serviceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td align="right" style="font-weight: bold;">R$ ${data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    `;
                  }).join('');

                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Relatório Contábil - Aminna</title>
                        <style>
                          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                          .logo-area h1 { margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; }
                          .logo-area p { margin: 5px 0 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                          .date-area { text-align: right; font-size: 12px; font-weight: 700; color: #64748b; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th { background: #f1f5f9; text-align: left; padding: 12px 8px; font-size: 10px; text-transform: uppercase; font-weight: 900; border-bottom: 1px solid #cbd5e1; color: #475569; }
                          td { padding: 12px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
                          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 700; text-transform: uppercase; }
                          @media print {
                            @page { margin: 2cm; }
                            body { padding: 0; }
                          }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div class="logo-area">
                            <h1>Relatório Contábil</h1>
                            <p>Aminna • Gestão Inteligente</p>
                          </div>
                          <div class="date-area">
                            <p>EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>Profissional</th>
                              <th>Razão Social</th>
                              <th>CNPJ</th>
                              <th style="text-align: right">Valor p/ Nota</th>
                              <th style="text-align: right">Faturamento Bruto</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${rows}
                          </tbody>
                        </table>
                        <div class="footer">
                          Relatório gerado automaticamente pelo Sistema Aminna
                        </div>
                        <script>
                          window.onload = () => {
                            setTimeout(() => {
                              window.print();
                            }, 500);
                          };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="flex-1 min-w-[150px] py-4 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Printer size={18} /> Imprimir PDF
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast 
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
};
