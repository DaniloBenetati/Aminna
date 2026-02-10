
import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Search, MessageCircle,
  ChevronLeft, ChevronRight, AlertTriangle, Clock, Fingerprint, RefreshCw, CheckCircle2, Loader2, AlertCircle, Play, Check
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ViewState, Appointment, Customer, Service, Campaign, PaymentSetting, Provider, StockItem, NFSeRecord } from '../types';
import { ServiceModal } from './ServiceModal';
import { issueNFSe } from '../services/focusNfeService';

interface DailyAppointmentsProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  services: Service[];
  campaigns: Campaign[];
  paymentSettings: PaymentSetting[];
  providers: Provider[];
  stock: StockItem[];
  nfseRecords: NFSeRecord[];
  isLoadingData?: boolean;
  onNavigate?: (view: ViewState, payload?: any) => void;
}

export const DailyAppointments: React.FC<DailyAppointmentsProps> = ({ customers, setCustomers, appointments, setAppointments, services, campaigns, paymentSettings, providers, stock, nfseRecords, isLoadingData, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppointmentForService, setSelectedAppointmentForService] = useState<Appointment | null>(null);
  const [isIssuingBatch, setIsIssuingBatch] = useState(false);
  const [selectedApptIds, setSelectedApptIds] = useState<Set<string>>(new Set());
  const [batchResults, setBatchResults] = useState<{ success: number, failed: number } | null>(null);

  const formatDateForFilter = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const filteredAppointments = useMemo(() => {
    const dateStr = formatDateForFilter(selectedDate);
    return appointments
      .filter(a => {
        const isDateMatch = a.date === dateStr && a.status !== 'Cancelado';
        const customer = customers.find(c => c.id === a.customerId);
        const isSearchMatch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const isStatusMatch = statusFilter === 'all' || a.status === statusFilter;
        return isDateMatch && isSearchMatch && isStatusMatch;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate, searchTerm, statusFilter, customers]);

  const eligibleForBatch = useMemo(() => {
    return filteredAppointments.filter(appt =>
      appt.status === 'Concluído' &&
      !nfseRecords.some(r => r.appointmentId === appt.id && r.status === 'issued')
    );
  }, [filteredAppointments, nfseRecords]);

  const toggleAllSelection = () => {
    if (selectedApptIds.size === eligibleForBatch.length) {
      setSelectedApptIds(new Set());
    } else {
      setSelectedApptIds(new Set(eligibleForBatch.map(a => a.id)));
    }
  };

  const toggleApptSelection = (id: string) => {
    const newSet = new Set(selectedApptIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedApptIds(newSet);
  };

  const handleBatchIssue = async () => {
    const appsToIssue = eligibleForBatch.filter(a => selectedApptIds.has(a.id));

    if (appsToIssue.length === 0) {
      alert('Selecione pelo menos um atendimento para emitir nota fiscal.');
      return;
    }

    if (!confirm(`Deseja emitir nota fiscal para os ${appsToIssue.length} atendimentos selecionados?`)) {
      return;
    }

    setIsIssuingBatch(true);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const appt of appsToIssue) {
      const customer = customers.find(c => c.id === appt.customerId);
      const service = services.find(s => s.id === appt.serviceId);

      if (!customer || !service) {
        failedCount++;
        continue;
      }

      try {
        const result = await issueNFSe({
          appointmentId: appt.id,
          customerId: appt.customerId,
          customerName: customer.name,
          customerCpfCnpj: customer.cpf,
          customerEmail: customer.email,
          providerId: appt.providerId,
          totalValue: appt.pricePaid || appt.price || service.price,
          serviceDescription: appt.combinedServiceNames || service.name
        });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
          errors.push(`${customer.name}: ${result.error || 'Erro desconhecido'}`);
        }
      } catch (error: any) {
        console.error(`Error issuing batch NFSe for appt ${appt.id}:`, error);
        failedCount++;
        errors.push(`${customer.name}: ${error.message || 'Erro desconhecido'}`);
      }
    }

    setIsIssuingBatch(false);
    setBatchResults({ success: successCount, failed: failedCount });
    setSelectedApptIds(new Set());

    let resultMessage = `Processamento concluído!\nSucesso: ${successCount}\nFalhas: ${failedCount}`;
    if (errors.length > 0) {
      resultMessage += `\n\nErros:\n${errors.join('\n')}`;
    }
    alert(resultMessage);
  };


  const stats = useMemo(() => {
    const dateStr = formatDateForFilter(selectedDate);
    const dayApps = appointments.filter(a => a.date === dateStr && a.status !== 'Cancelado');
    return {
      total: dayApps.length,
      confirmed: dayApps.filter(a => a.status === 'Confirmado').length,
      inProgress: dayApps.filter(a => a.status === 'Em Andamento').length,
      concluded: dayApps.filter(a => a.status === 'Concluído').length,
    };
  }, [appointments, selectedDate]);

  const handleSendWhatsApp = (appt: Appointment) => {
    const customer = customers.find(c => c.id === appt.customerId);
    const service = services.find(s => s.id === appt.serviceId);
    if (!customer || !service) return;

    const provider = providers.find(p => p.id === appt.providerId);
    const providerName = provider ? provider.name.split(' ')[0] : 'Equipe';

    const getClockEmoji = (time: string) => {
      try {
        const [hourStr, minStr] = time.split(':');
        const hour = parseInt(hourStr) % 12 || 12;
        const min = parseInt(minStr);
        const clocks: Record<number, string[]> = {
          1: ['🕐', '🕜'], 2: ['🕑', '🕝'], 3: ['🕒', '🕞'],
          4: ['🕓', '🕟'], 5: ['🕔', '🕠'], 6: ['🕕', '🕡'],
          7: ['🕖', '🕢'], 8: ['🕗', '🕣'], 9: ['🕘', '🕤'],
          10: ['🕙', '🕥'], 11: ['🕚', '🕦'], 12: ['🕛', '🕧']
        };
        return clocks[hour][min >= 30 ? 1 : 0];
      } catch { return '⏰'; }
    };

    const clock = getClockEmoji(appt.time);
    const appDateBr = new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR');
    const firstName = customer.name.split(' ')[0];

    // Clean time display (e.g., 18:00 -> 18h)
    const displayTime = appt.time.endsWith(':00') ? appt.time.split(':')[0] + 'h' : appt.time.replace(':', 'h');

    const hasMultipleServices = appt.combinedServiceNames?.includes(',') || appt.combinedServiceNames?.includes(' e ');

    const message = `Olá, ${firstName}! ✨\n` +
      `${hasMultipleServices ? 'Seus atendimentos na Aminna estão confirmados' : 'Seu atendimento na Aminna está confirmado'}:\n\n` +
      `📅 ${appDateBr}\n` +
      `${clock} ${displayTime} - ${appt.combinedServiceNames || service.name} (profissional ${providerName})\n\n` +
      `Estamos te aguardando com carinho. 🥰\n` +
      `Se não puder comparecer, por favor nos avise com antecedência.\n\n` +
      `Obrigada! 😊`;

    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-700';
      case 'Em Andamento':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'Confirmado':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    }
  };

  // Loading skeleton
  if (isLoadingData && appointments.length === 0) {
    return (
      <div className="space-y-4 h-full flex flex-col pb-24 md:pb-0 font-sans text-slate-900 dark:text-white">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm animate-pulse">
          <div className="h-12 bg-slate-200 dark:bg-zinc-800 rounded-2xl w-full"></div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-100 dark:bg-zinc-800 p-3 rounded-2xl h-16 animate-pulse"></div>
          ))}
        </div>
        <div className="flex-1 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-zinc-800 rounded-2xl animate-pulse"></div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-slate-500">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              Carregando atendimentos...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col pb-24 md:pb-0 font-sans text-slate-900 dark:text-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center">
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight uppercase">Atendimentos Agrupados</h2>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Controle de Fluxo Diário</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-zinc-900 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-zinc-800">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"><ChevronLeft size={18} className="text-slate-400" /></button>
            <div className="relative px-4 flex items-center gap-3 cursor-pointer">
              <CalendarIcon size={14} className="text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-black text-slate-950 dark:text-white">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <input type="date" value={formatDateForFilter(selectedDate)} onChange={(e) => { if (e.target.value) { const [y, m, d] = e.target.value.split('-').map(Number); setSelectedDate(new Date(y, m - 1, d)); } }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"><ChevronRight size={18} className="text-slate-400" /></button>
          </div>
          <div className="flex flex-col items-end">
            <button
              onClick={handleBatchIssue}
              disabled={isIssuingBatch || selectedApptIds.size === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-black text-[10px] uppercase transition-all shadow-sm
                ${isIssuingBatch || selectedApptIds.size === 0
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700 active:scale-95'
                }`}
            >
              {isIssuingBatch ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              {isIssuingBatch ? 'Processando...' : `Emitir ${selectedApptIds.size} Notas`}
            </button>
            {eligibleForBatch.length > 0 && (
              <button
                onClick={toggleAllSelection}
                className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 mt-1 hover:underline"
              >
                {selectedApptIds.size === eligibleForBatch.length ? 'Desmarcar Todos' : 'Selecionar Todos do Dia'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-950 dark:text-white', bg: 'bg-white dark:bg-zinc-900' },
          { label: 'Conf.', value: stats.confirmed, color: 'text-emerald-800 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-900/20' },
          { label: 'Aber.', value: stats.confirmed + stats.inProgress, color: 'text-blue-800 dark:text-blue-400', bg: 'bg-blue-50/50 dark:bg-blue-900/20' },
          { label: 'Conc.', value: stats.concluded, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100/50 dark:bg-zinc-800/50' }
        ].map((s, i) => (
          <div key={i} className={`${s.bg} p-3 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center`}>
            <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 mb-0.5">{s.label}</span>
            <span className={`text-sm font-black ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide pt-2">
        <div className="relative mb-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar cliente..."
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-[1.5rem] outline-none font-black text-sm focus:border-slate-300 dark:focus:border-zinc-600 transition-all text-slate-950 dark:text-white placeholder:text-slate-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredAppointments.length > 0 ? filteredAppointments.map(appt => {
          const customer = customers.find(c => c.id === appt.customerId);
          const service = services.find(s => s.id === appt.serviceId);
          const hasRestriction = !!customer?.preferences?.restrictions;

          // Logic to determine if appointment is late
          const now = new Date();
          const appointmentDateTime = new Date(`${appt.date}T${appt.time}`);
          const isLate = (appt.status === 'Confirmado' || appt.status === 'Pendente') && now > appointmentDateTime;

          const isEligible = appt.status === 'Concluído' && !nfseRecords.some(r => r.appointmentId === appt.id && r.status === 'issued');

          return (
            <div
              key={appt.id}
              onClick={() => setSelectedAppointmentForService(appt)}
              className={`group p-4 rounded-[1.5rem] border shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4 
                  ${isLate
                  ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900 hover:border-rose-300 dark:hover:border-rose-700'
                  : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600'
                } active:scale-[0.98]`}
            >
              {isEligible && (
                <div
                  onClick={(e) => { e.stopPropagation(); toggleApptSelection(appt.id); }}
                  className="flex-shrink-0"
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedApptIds.has(appt.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 dark:border-zinc-700 bg-transparent'}`}>
                    {selectedApptIds.has(appt.id) && <Check size={14} className="text-white" />}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className={`flex-shrink-0 w-16 text-center py-2.5 rounded-2xl border font-mono 
                  ${isLate ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white border-slate-200 dark:border-zinc-700'}`}>
                  <span className="text-[12px] font-black">{appt.time}</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-black text-sm truncate uppercase tracking-tight ${isLate ? 'text-rose-900 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>{customer?.name}</h4>
                    {hasRestriction && <AlertTriangle size={14} className="text-amber-500" />}
                    {isLate && (
                      <span className="flex items-center gap-1 text-[8px] font-black bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 px-1.5 py-0.5 rounded-md uppercase animate-pulse">
                        <Clock size={10} /> Atrasado
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] font-bold uppercase truncate max-w-full ${isLate ? 'text-rose-700/70 dark:text-rose-400/70' : 'text-slate-500 dark:text-slate-400'}`}>
                    {appt.combinedServiceNames || service?.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border whitespace-nowrap ${getStatusStyle(appt.status)}`}>
                    {appt.status}
                  </span>
                  {appt.status === 'Concluído' && (
                    (() => {
                      const record = nfseRecords.find(r => r.appointmentId === appt.id);
                      if (record?.status === 'issued') return <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase"><CheckCircle2 size={10} /> NFSe OK</span>;
                      if (record?.status === 'processing') return <span className="flex items-center gap-1 text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase"><Loader2 size={10} className="animate-spin" /> Emitindo</span>;
                      if (record?.status === 'error') return <span className="flex items-center gap-1 text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase"><AlertCircle size={10} /> Erro Fiscal</span>;
                      return <span className="text-[8px] font-black text-slate-400 uppercase">Sem Nota</span>;
                    })()
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSendWhatsApp(appt); }}
                  className={`p-2 rounded-xl transition-colors border ${isLate ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 border-transparent hover:border-rose-200' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-transparent hover:border-emerald-100 dark:hover:border-emerald-800'}`}
                >
                  <MessageCircle size={20} />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="py-20 text-center text-slate-300 dark:text-slate-600"><CalendarIcon size={48} className="mx-auto mb-2 opacity-20" /><p className="text-xs font-black uppercase tracking-widest">Sem agendamentos no período</p></div>
        )}
      </div>

      {selectedAppointmentForService && (
        <ServiceModal
          appointment={selectedAppointmentForService}
          allAppointments={appointments}
          customer={customers.find(c => c.id === selectedAppointmentForService.customerId)!}
          onClose={() => setSelectedAppointmentForService(null)}
          onUpdateAppointments={setAppointments}
          onUpdateCustomers={setCustomers}
          onSelectAppointment={(app) => setSelectedAppointmentForService(app)}
          services={services}
          campaigns={campaigns}
          source="DAILY"
          paymentSettings={paymentSettings}
          providers={providers}
          stock={stock}
          customers={customers}
          onNavigate={onNavigate}
          onNavigateToCustomer={() => {
            setSelectedAppointmentForService(null);
            if (onNavigate) onNavigate(ViewState.CLIENTES, selectedAppointmentForService.customerId);
          }}
        />
      )}
    </div>
  );
};
