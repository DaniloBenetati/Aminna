import React, { useState, useMemo } from 'react';
import { Filter, Files, Calendar, MessageCircle, FileText, Download, ChevronDown, CheckCircle2, AlertCircle, Search, Copy, Send, X, Printer, Scissors, FileSpreadsheet, FileCode } from 'lucide-react';
import { Service, Appointment, Provider, Customer } from '../types';

interface ClosuresProps {
  services: Service[];
  appointments: Appointment[];
  providers: Provider[];
  customers: Customer[];
}

export const Closures: React.FC<ClosuresProps> = ({ services, appointments, providers, customers }) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getFinancials = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    const defaultRate = provider?.commissionRate || 0; // Default rate from provider

    let revenue = 0; // Cash Revenue/Production Total
    let commissionVal = 0; // Total Commission/Payout
    let count = 0;
    const detailedServices: any[] = [];

    appointments.forEach(app => {
      // Normalize referenceDate to YYYY-MM-DD to ensure strict date comparison
      // This handles cases where paymentDate includes time (e.g. ISO string)
      const referenceDate = app.date ? app.date.substring(0, 10) : (app.paymentDate ? app.paymentDate.substring(0, 10) : '');
      const inRange = referenceDate >= startDate && referenceDate <= endDate;
      const validStatus = app.status === 'Concluído';

      if (!inRange || !validStatus) return;

      const customer = customers.find(c => c.id === app.customerId);
      const displayDate = app.paymentDate || app.date;

      // 1. Process Main Service if assigned to this provider
      if (app.providerId === providerId) {
        const service = services.find(s => s.id === app.serviceId);

        // Determine Base Value (Production)
        // Use bookedPrice to avoid capturing the entire appointment total (which includes extras)
        let baseValue = app.bookedPrice || service?.price || 0;

        // Fallback for backward compatibility where single-service apps used pricePaid
        if ((!app.additionalServices || app.additionalServices.length === 0) && app.pricePaid && app.pricePaid > 0) {
          baseValue = app.pricePaid;
        }

        // Exception: VIP, Debt, or Courtesy
        if (app.paymentMethod === 'Dívida' || app.paymentMethod === 'Cortesia' || customer?.isVip || baseValue === 0) {
          baseValue = app.bookedPrice || service?.price || 0;
        }

        // Determine Rate
        const rate = app.commissionRateSnapshot ?? defaultRate;
        const payout = baseValue * rate;

        revenue += baseValue;
        commissionVal += payout;
        count += 1;

        detailedServices.push({
          date: displayDate,
          time: app.time,
          serviceName: app.combinedServiceNames && (!app.additionalServices || app.additionalServices.length === 0)
            ? app.combinedServiceNames
            : (service?.name || 'Serviço'),
          clientName: customer?.name || 'Cliente Avulso',
          price: payout, // DISPLAY PAYOUT VALUE
          originalValue: baseValue,
          rate: rate
        });
      }

      // 2. Process Additional Services if assigned to this provider
      if (app.additionalServices && app.additionalServices.length > 0) {
        app.additionalServices.forEach(extra => {
          if (extra.providerId === providerId) {
            const extraService = services.find(s => s.id === extra.serviceId);

            let baseValue = extra.bookedPrice || extraService?.price || 0;

            if (extra.isCourtesy || app.paymentMethod === 'Dívida' || app.paymentMethod === 'Cortesia' || customer?.isVip || baseValue === 0) {
              baseValue = extra.bookedPrice || extraService?.price || 0;
            }

            const rate = extra.commissionRateSnapshot ?? defaultRate;
            const payout = baseValue * rate;

            revenue += baseValue;
            commissionVal += payout;
            count += 1;

            detailedServices.push({
              date: displayDate,
              time: extra.startTime || app.time,
              serviceName: extraService?.name || 'Serviço Adicional',
              clientName: extra.clientName || customer?.name || 'Cliente Avulso',
              price: payout, // DISPLAY PAYOUT VALUE
              originalValue: baseValue,
              rate: rate
            });
          }
        });
      }
    });

    // Calculate effective average rate for display, handling division by zero
    const effectiveRate = revenue > 0 ? (commissionVal / revenue) : defaultRate;

    return { provider, revenue, commissionRate: effectiveRate, commissionVal, count, details: detailedServices };
  };

  const reportData = useMemo(() => {
    const activeProviders = providers.filter(p => (selectedProvider === 'all' || p.id === selectedProvider) && (p.name.toLowerCase().includes(searchTerm.toLowerCase())));
    return activeProviders.map(p => getFinancials(p.id));
  }, [providers, selectedProvider, searchTerm, startDate, endDate, services, appointments]);

  const totalToPay = reportData.reduce((acc, curr) => acc + curr.commissionVal, 0);
  const totalRevenue = reportData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalServices = reportData.reduce((acc, curr) => acc + curr.count, 0);

  const handleGenerateReceipts = (data: any | null = null) => {
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
            <title>Recibos Aminna ${data ? '- ' + (data.provider?.name || '') : ''}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 0; }
              }
              body { font-family: sans-serif; }
              .receipt-container { background: white; }
            </style>
          </head>
          <body class="bg-slate-100">
            <div class="p-4 flex flex-col items-center">
              ${printContents}
            </div>
            <script>
              window.onload = () => {
                // Ensure print wrapper styles work in the new window
                const wrapper = document.querySelector('div');
                if (wrapper) wrapper.classList.remove('hidden', 'print:block', 'fixed', 'inset-0');
              }
            </script>
          </body>
        </html>
      `);
      newWin.document.close();
      setIsPrinting(false);
    }, 500);
  };

  const ReceiptSheet = ({ data, type, idx, receiptNumber }: { data: any; type: 'summary' | 'details'; idx: number; receiptNumber: number }) => {

    const Copy = ({ copyNum }: { copyNum: number }) => (
      <div className={`flex flex-col ${type === 'summary' ? 'h-[50%]' : 'min-h-[148mm]'} p-12 relative bg-white border-b border-dashed border-slate-200 last:border-b-0 print:border-slate-300`}>
        {/* Minimalist Header */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-8">
            <img src="/logo.png" alt="Aminna" className="w-20 h-20 object-contain grayscale opacity-90" />
            <div className="text-[9px] font-medium text-slate-400 space-y-0.5 uppercase tracking-[0.2em]">
              <p>Aminna Gestão de Atendimentos</p>
              <p>CNPJ: 00.000.000/0001-00</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-900 tracking-[0.25em] mb-1">
              {type === 'summary' ? 'Recibo de Pagamento' : 'Detalhamento de Serviços'}
            </p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Via {copyNum === 1 ? 'Contabilidade' : 'Profissional'}</p>
          </div>
        </div>

        {/* Clean Info Grid */}
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
            {/* Elegant Formal Declaration */}
            <div className="mb-12 relative pl-8 border-l-2 border-slate-900">
              <p className="text-[13px] font-medium leading-relaxed text-slate-700 text-justify tracking-tight">
                Recebi de <span className="font-bold text-slate-900">AMINNA GESTÃO DE ATENDIMENTOS</span> a importância de <span className="font-black text-slate-900 border-b-2 border-indigo-500/30 pb-0.5">R$ {data.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> referente a <span className="font-bold">{data.count} serviços prestados</span> e ao repasse de comissão sobre atendimentos executados no período acima mencionado, conforme detalhamento em anexo.
              </p>
            </div>

            <div className="flex justify-end mt-4">
              <div className="flex flex-col items-end">
                <p className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Valor Líquido</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter leading-none">R$ {data.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col pt-4 overflow-visible">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Scissors size={10} className="opacity-40" /> Relatório de Atendimentos
            </p>
            <div className="flex-1 pr-2">
              <table className="w-full text-[10px] border-collapse overflow-visible">
                <thead>
                  <tr className="text-left font-black uppercase text-slate-300 tracking-widest border-b border-slate-100">
                    <th className="py-3 px-2">Data/Hora</th>
                    <th className="py-3">Serviço</th>
                    <th className="py-3">Cliente</th>
                    <th className="py-3 text-right pr-2">Valor (Repasse)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.details.length > 0 ? data.details.map((item: any, idx: number) => (
                    <tr key={idx} className="group">
                      <td className="py-4 px-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 uppercase leading-none">{new Date((item.date ? item.date.substring(0, 10) : new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                          <span className="text-[8px] font-medium text-slate-400 mt-1">{item.time}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="font-black text-slate-900 uppercase tracking-tight">{item.serviceName}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-slate-500 font-bold uppercase tracking-tight">{item.clientName}</p>
                      </td>
                      <td className="py-4 text-right pr-2 font-black text-slate-900">
                        R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-300 font-black uppercase tracking-widest opacity-50">Sem registros</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Clean Footer */}
        <div className="mt-auto pt-10 flex justify-between items-end">
          <div className="flex-1 max-w-[280px]">
            <div className="w-full border-b border-slate-900 mb-2"></div>
            <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{data.provider?.name}</p>
            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-1">Assinatura da Beneficiária</p>
          </div>

          <div className="flex-1 max-w-[280px] px-12">
            <div className="w-full border-b border-slate-100 mb-2"></div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Confirmado por Aminna</p>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-1">Autenticação: {receiptNumber}-{idx}-1</p>
          </div>
        </div>

        {/* Visual Line for Cutting */}
        <div className="absolute bottom-0 left-0 right-0 h-px border-b border-dashed border-slate-100 print:border-slate-300"></div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[6px] font-black text-slate-200 uppercase tracking-[0.3em] opacity-40 print:hidden">Linha de Corte</div>
      </div>
    );

    return (
      <div className="w-[210mm] min-h-[297mm] bg-white text-black print:break-after-page shadow-2xl mx-auto my-8 print:my-0 flex flex-col relative shrink-0" style={{ pageBreakAfter: 'always' }}>
        <Copy copyNum={1} />
        {type === 'details' && data.details.length > 15 && <div className="print:break-after-page"></div>}
        <Copy copyNum={2} />
      </div>
    );
  };

  const [whatsappModalData, setWhatsappModalData] = useState<any | null>(null);

  const generateWhatsappMessage = (data: any) => {
    const phone = data.provider?.phone?.replace(/\D/g, '') || '';
    let message = `* RECIBO DE REPASSE - AMINNA *\n`;
    message += `* Profissional:* ${data.provider.name} \n`;
    message += `* Período:* ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')} \n\n`;

    message += `* DETALHAMENTO DE SERVIÇOS:*\n`;
    data.details.forEach((item: any) => {
      message += `• ${new Date((item.date ? item.date.substring(0, 10) : new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('pt-BR')} - ${item.serviceName} (${item.clientName}): R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} \n`;
    });

    message += `\n * RESUMO FINANCEIRO:*\n`;
    message += `Minha Comissão(${(data.commissionRate * 100).toFixed(0)}%): R$ ${data.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} \n`;
    message += `\n * VALOR A RECEBER: R$ ${data.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    message += `_Gerado automaticamente pelo Sistema Aminna._`;

    return { message, phone };
  };

  const handleOpenWhatsappModal = (data: any) => {
    if (!data.provider?.phone) {
      alert('Telefone do profissional não cadastrado.');
      return;
    }
    setWhatsappModalData(data);
  };

  const handleSendToWhatsapp = () => {
    if (!whatsappModalData) return;
    const { message, phone } = generateWhatsappMessage(whatsappModalData);
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`, '_blank');
    setWhatsappModalData(null);
  };

  const handleCopyToClipboard = () => {
    if (!whatsappModalData) return;
    const { message } = generateWhatsappMessage(whatsappModalData);
    navigator.clipboard.writeText(message);
    setWhatsappModalData(null);
    alert('Relatório copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col pb-24 md:pb-8 text-slate-900 dark:text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight uppercase">Repasses Profissionais</h2><p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Cálculo de Comissões Sincronizado</p></div>
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-2 rounded-2xl border border-slate-200 shadow-sm"><Calendar size={16} className="text-slate-400" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none" /><span className="text-slate-300 font-black">-</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Total</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl text-slate-400">
            <Files size={20} />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Serviços Realizados</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{totalServices}</p>
          </div>
          <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl text-slate-400">
            <Scissors size={20} />
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total a Repassar</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">R$ {totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-slate-200 shadow-sm gap-4">
        <div className="relative flex-1 md:min-w-[250px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Buscar profissional..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border rounded-xl text-xs font-black outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={() => handleGenerateReceipts()} className="w-full lg:w-auto flex items-center justify-center gap-2 bg-slate-950 dark:bg-white text-white dark:text-black px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95">
            <Printer size={16} /> Gerar Recibos Completos
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm relative">
            <thead className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black border-b sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Profissional</th>
                <th className="px-6 py-4 text-center">Serviços</th>
                <th className="px-6 py-4 text-right">Faturamento</th>
                <th className="px-6 py-4 text-center">Comissão</th>
                <th className="px-6 py-4 text-right">A Repassar</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.map(data => (
                <tr key={data.provider?.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 font-black">{data.provider?.name}</td>
                  <td className="px-6 py-4 text-center font-bold">{data.count}</td>
                  <td className="px-6 py-4 text-right text-slate-500 font-bold">R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center font-black">{(data.commissionRate * 100).toFixed(0)}%</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-700">R$ {data.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedReceipt(data)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                        title="Ver Detalhes"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenWhatsappModal(data)}
                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle size={18} />
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight text-center mb-2">Enviar Comprovante</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">Escolha como deseja compartilhar o comprovante de repasse com {whatsappModalData.provider?.name}.</p>

            <div className="w-full space-y-3">
              <button
                onClick={handleSendToWhatsapp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Send size={16} /> Abrir WhatsApp
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="w-full py-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Copy size={16} /> Copiar Texto
              </button>
              <button
                onClick={() => setWhatsappModalData(null)}
                className="w-full py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/30">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalhamento de Repasse</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{selectedReceipt.provider?.name}</p>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="p-3 hover:bg-white dark:hover:bg-zinc-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-all shadow-sm border border-transparent hover:border-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-slate-100 dark:border-zinc-800">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Faturamento</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">R$ {selectedReceipt.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-slate-100 dark:border-zinc-800">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Comissão ({(selectedReceipt.commissionRate * 100).toFixed(0)}%)</p>
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">R$ {selectedReceipt.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">A Repassar</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">R$ {selectedReceipt.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Serviços Realizados</h4>
                <div className="space-y-2">
                  {selectedReceipt.details.map((service: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/20 border border-slate-100 dark:border-zinc-800 rounded-2xl hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 dark:border-zinc-700">
                          {new Date((service.date ? service.date.substring(0, 10) : new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{service.serviceName}</p>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{service.clientName}</p>
                        </div>
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 dark:border-zinc-800 flex gap-4 bg-slate-50/50 dark:bg-zinc-800/30">
              <button
                onClick={() => {
                  const phone = selectedReceipt.provider.phone?.replace(/\D/g, '') || '';
                  const message = `*RECIBO DE REPASSE - AMINNA*\n*Profissional:* ${selectedReceipt.provider.name}\n*Período:* ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n\n*VALOR A RECEBER: R$ ${selectedReceipt.commissionVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\nCopie os detalhes acima ou clique no botão para enviar via WhatsApp.`;
                  navigator.clipboard.writeText(message).then(() => alert('Resumo copiado para a área de transferência!'));
                }}
                className="px-6 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2"
                title="Copiar Resumo"
              >
                <Copy size={18} /> Copiar
              </button>
              <button
                onClick={() => handleOpenWhatsappModal(selectedReceipt)}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
              >
                <MessageCircle size={18} /> Enviar WhatsApp
              </button>
              <button
                onClick={() => handleGenerateReceipts(selectedReceipt)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-950 dark:bg-white text-white dark:text-black px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
              >
                <Printer size={18} /> Gerar PDF Completo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Wrapper */}
      {isPrinting && (
        <div id="print-wrapper" className="fixed inset-0 z-[99999] bg-white overflow-y-auto">
          <div id="single-print-wrapper">
            {selectedReceipt && (() => {
              const rNum = Math.floor(100000 + Math.random() * 900000);
              return (
                <React.Fragment>
                  <ReceiptSheet data={selectedReceipt} type="summary" idx={0} receiptNumber={rNum} />
                  <ReceiptSheet data={selectedReceipt} type="details" idx={0} receiptNumber={rNum} />
                </React.Fragment>
              );
            })()}
          </div>
          {!selectedReceipt && reportData.map((data, idx) => {
            const rNum = Math.floor(100000 + Math.random() * 900000);
            return (
              <React.Fragment key={idx}>
                <ReceiptSheet data={data} type="summary" idx={idx} receiptNumber={rNum} />
                <ReceiptSheet data={data} type="details" idx={idx} receiptNumber={rNum} />
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
