
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

  const [reportPreview, setReportPreview] = useState<{ visible: boolean; data: any | null; message: string }>({ visible: false, data: null, message: '' });
  const [receiptPreviewData, setReceiptPreviewData] = useState<any | null>(null);

  const getFinancials = (providerId: string) => {
    const providerApps = appointments.filter(app => {
      const isProvider = app.providerId === providerId;
      const inRange = app.date >= startDate && app.date <= endDate;
      const validStatus = app.status === 'Concluído';
      return isProvider && inRange && validStatus;
    });

    let revenue = 0;
    const detailedServices = providerApps.map(app => {
      const service = services.find(s => s.id === app.serviceId);
      const customer = customers.find(c => c.id === app.customerId);
      const price = app.pricePaid || app.bookedPrice || service?.price || 0;
      revenue += price;
      return { date: app.date, time: app.time, serviceName: app.combinedServiceNames || service?.name || 'Serviço', clientName: customer?.name || 'Cliente Avulso', price };
    });

    const provider = providers.find(p => p.id === providerId);
    const commissionRate = provider ? (providerApps[0]?.commissionRateSnapshot ?? provider.commissionRate) : 0;
    const commissionVal = revenue * commissionRate;

    return { provider, revenue, commissionRate, commissionVal, count: providerApps.length, details: detailedServices };
  };

  const reportData = useMemo(() => {
    const activeProviders = providers.filter(p => (selectedProvider === 'all' || p.id === selectedProvider) && (p.name.toLowerCase().includes(searchTerm.toLowerCase())));
    return activeProviders.map(p => getFinancials(p.id));
  }, [providers, selectedProvider, searchTerm, startDate, endDate, services, appointments]);

  const totalToPay = reportData.reduce((acc, curr) => acc + curr.commissionVal, 0);

  const printBulkReceipts = () => {
    // Implementação de impressão em lote baseada no reportData
    window.print();
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col pb-24 md:pb-8 text-slate-900 dark:text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight uppercase">Repasses Profissionais</h2><p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Cálculo de Comissões Sincronizado</p></div>
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-2 rounded-2xl border border-slate-200 shadow-sm"><Calendar size={16} className="text-slate-400" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none" /><span className="text-slate-300 font-black">-</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none" /></div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-slate-200 shadow-sm gap-4">
        <div className="relative flex-1 md:min-w-[250px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Buscar profissional..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border rounded-xl text-xs font-black outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <div className="flex gap-2 w-full lg:w-auto"><button onClick={printBulkReceipts} className="w-full lg:w-auto flex items-center justify-center gap-2 bg-slate-950 dark:bg-white text-white dark:text-black px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Gerar Recibos</button></div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black border-b"><tr><th className="px-6 py-4">Profissional</th><th className="px-6 py-4 text-center">Serviços</th><th className="px-6 py-4 text-right">Faturamento</th><th className="px-6 py-4 text-center">Comissão</th><th className="px-6 py-4 text-right">A Repassar</th></tr></thead>
            <tbody className="divide-y">{reportData.map(data => (<tr key={data.provider?.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50"><td className="px-6 py-4 font-black">{data.provider?.name}</td><td className="px-6 py-4 text-center font-bold">{data.count}</td><td className="px-6 py-4 text-right text-slate-500 font-bold">R$ {data.revenue.toFixed(2)}</td><td className="px-6 py-4 text-center font-black">{(data.commissionRate * 100).toFixed(0)}%</td><td className="px-6 py-4 text-right font-black text-emerald-700">R$ {data.commissionVal.toFixed(2)}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
