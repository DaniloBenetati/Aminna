
import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Search,
    Clock, CheckCircle2, AlertCircle, MessageCircle, Filter, X,
    User, ZoomIn, ZoomOut, Check, Copy, CalendarRange, Loader2, Save, Ban, XCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Appointment, Customer, Service, Campaign, Provider, Lead, PaymentSetting, StockItem } from '../types';
import { ServiceModal } from './ServiceModal';
import { Avatar } from './Avatar';

interface AgendaProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    services: Service[];
    campaigns: Campaign[];
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    paymentSettings: PaymentSetting[];
    providers: Provider[];
    stock: StockItem[];
}

export const Agenda: React.FC<AgendaProps> = ({
    customers, setCustomers, appointments, setAppointments, services, campaigns, leads, setLeads, paymentSettings, providers, stock
}) => {
    // Date & View States
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('day');
    const [dateRef, setDateRef] = useState(new Date());
    const [customRange, setCustomRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
    const [visibleProviderIds, setVisibleProviderIds] = useState<string[]>([]);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // Customer Selection State for New Appointments
    const [isCustomerSelectionOpen, setIsCustomerSelectionOpen] = useState(false);
    const [draftAppointment, setDraftAppointment] = useState<Partial<Appointment> | null>(null);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    // Quick Registration State
    const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
    const [quickRegisterData, setQuickRegisterData] = useState({ name: '', phone: '' });
    const [isRegisteringClient, setIsRegisteringClient] = useState(false);

    // UI States
    const [zoomLevel, setZoomLevel] = useState(() => Number(localStorage.getItem('agenda_zoom_level')) || 1);
    const [rowHeight, setRowHeight] = useState(() => Number(localStorage.getItem('agenda_row_height')) || 100);
    const [searchTerm, setSearchTerm] = useState('');
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

    // Persistence Effects
    React.useEffect(() => {
        localStorage.setItem('agenda_zoom_level', zoomLevel.toString());
    }, [zoomLevel]);

    React.useEffect(() => {
        localStorage.setItem('agenda_row_height', rowHeight.toString());
    }, [rowHeight]);

    // Helpers
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

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

    // Calculate Range for Confirmations & filtering
    const { rangeStart, rangeEnd } = useMemo(() => {
        let start = new Date();
        let end = new Date();

        if (timeView === 'day') {
            start = new Date(dateRef);
            end = new Date(dateRef);
        } else if (timeView === 'month') {
            start = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
            end = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0);
        } else if (timeView === 'year') {
            start = new Date(dateRef.getFullYear(), 0, 1);
            end = new Date(dateRef.getFullYear(), 11, 31);
        } else if (timeView === 'custom') {
            return { rangeStart: customRange.start, rangeEnd: customRange.end };
        }

        return {
            rangeStart: start.toISOString().split('T')[0],
            rangeEnd: end.toISOString().split('T')[0]
        };
    }, [timeView, dateRef, customRange]);

    const activeProviders = useMemo(() => providers.filter(p => p.active), [providers]);

    // Filter Appointments for the GRID (Always shows dateRef day or start of custom range)
    const gridDateStr = timeView === 'custom' ? customRange.start : formatDate(dateRef);

    const gridAppointments = useMemo(() => {
        return appointments.filter(a => {
            const isDate = a.date === gridDateStr;
            const isProvider = selectedProviderId === 'all'
                ? (visibleProviderIds.length === 0 || visibleProviderIds.includes(a.providerId))
                : a.providerId === selectedProviderId;
            const isNotCancelled = a.status !== 'Cancelado';

            let isSearchMatch = true;
            if (searchTerm) {
                const customer = customers.find(c => c.id === a.customerId);
                isSearchMatch = customer ? customer.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
            }

            return isDate && isProvider && isNotCancelled && isSearchMatch;
        });
    }, [appointments, gridDateStr, selectedProviderId, visibleProviderIds, searchTerm, customers]);

    const activeVisibileProviders = useMemo(() => {
        const filtered = selectedProviderId === 'all'
            ? activeProviders.filter(p => visibleProviderIds.length === 0 || visibleProviderIds.includes(p.id))
            : activeProviders.filter(p => p.id === selectedProviderId);

        return filtered;
    }, [activeProviders, selectedProviderId, visibleProviderIds]);

    // Confirmation Logic (Uses Range)
    const generateConfirmationMessage = (customer: Customer, apps: Appointment[]) => {
        const validApps = apps.filter(a => a.status !== 'Concluído' && a.status !== 'Cancelado');
        if (validApps.length === 0) return '';

        const sortedApps = [...validApps].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        let message = `Olá, * ${customer.name.split(' ')[0]}* ! ✨\nPassando para falar sobre seus atendimentos na * Aminna *: \n`;
        let currentDayGroup = '';

        sortedApps.forEach(a => {
            const appDateBr = new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR');
            if (appDateBr !== currentDayGroup) {
                message += `\n📅 * ${appDateBr}*\n`;
                currentDayGroup = appDateBr;
            }
            const srv = services.find(s => s.id === a.serviceId);
            const p = providers.find(prov => prov.id === a.providerId);
            const providerName = p ? p.name.split(' ')[0] : 'Equipe';
            const statusLabel = a.status === 'Confirmado' ? '✅ Confirmado' : '⏳ Pendente';
            message += `📍 * ${a.time}* - ${a.combinedServiceNames || srv?.name} (Prof.${providerName}) \n   _${statusLabel} _\n`;
        });

        const hasPending = sortedApps.some(a => a.status === 'Pendente');
        if (hasPending) {
            message += `\nPodemos confirmar os pendentes ? 🥰`;
        } else {
            message += `\nEstá tudo certo! Nos vemos em breve. 🥰`;
        }
        return message;
    };

    const handleSendWhatsApp = (e: React.MouseEvent, appt: Appointment) => {
        e.stopPropagation();
        const customer = customers.find(c => c.id === appt.customerId);
        if (!customer) return;

        // Message for ONLY this specific appointment
        const msg = generateConfirmationMessage(customer, [appt]);
        if (msg) {
            const phone = customer.phone.replace(/\D/g, '');
            window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
        }
    };

    const whatsappList = useMemo(() => {
        // Filter by RANGE for the list
        const rangeApps = appointments.filter(a =>
            a.date >= rangeStart &&
            a.date <= rangeEnd &&
            a.status !== 'Cancelado' &&
            a.status !== 'Concluído' &&
            (selectedProviderId === 'all' || a.providerId === selectedProviderId)
        );

        const grouped: Record<string, Appointment[]> = {};
        rangeApps.forEach(a => {
            if (!grouped[a.customerId]) grouped[a.customerId] = [];
            grouped[a.customerId].push(a);
        });

        return grouped;
    }, [appointments, rangeStart, rangeEnd, selectedProviderId]);

    const toggleAppointmentStatus = (apptId: string) => {
        setAppointments(prev => prev.map(a => {
            if (a.id === apptId) {
                return { ...a, status: a.status === 'Confirmado' ? 'Pendente' : 'Confirmado' };
            }
            return a;
        }));
    };

    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h to 20h

    const getCellAppointments = (providerId: string, hour: number) => {
        return gridAppointments.filter(a => {
            const appHour = parseInt(a.time.split(':')[0]);
            return a.providerId === providerId && appHour === hour;
        });
    };

    const handleAppointmentClick = (appt: Appointment) => {
        setSelectedAppointment(appt);
        setIsServiceModalOpen(true);
    };

    // QUICK REGISTER NEW CUSTOMER
    const handleQuickRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickRegisterData.name || !quickRegisterData.phone) return;

        setIsRegisteringClient(true);
        try {
            // 1. Insert into Supabase
            // Note: Assuming 'customers' table auto-generates IDs or we generate one.
            // Using a timestamp-based ID to match local pattern if DB doesn't return one immediately,
            // but ideally we rely on DB return. For now, we'll try to insert and use returned data.

            const newCustomerPayload = {
                name: quickRegisterData.name,
                phone: quickRegisterData.phone,
                registration_date: new Date().toISOString().split('T')[0],
                status: 'Novo',
                total_spent: 0,
                acquisition_channel: 'Agendamento Rápido'
            };

            const { data, error } = await supabase
                .from('customers')
                .insert([newCustomerPayload])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // 2. Update Local State
                const newCustomer: Customer = {
                    id: data.id, // Use ID from Supabase
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    registrationDate: data.registration_date,
                    lastVisit: '',
                    totalSpent: 0,
                    status: 'Novo',
                    history: [],
                    preferences: { favoriteServices: [], preferredDays: [], notes: '', restrictions: '' },
                    acquisitionChannel: 'Agendamento Rápido'
                };

                setCustomers(prev => [...prev, newCustomer]);

                // 3. Select and Proceed
                handleSelectCustomerForAppointment(newCustomer);

                // 4. Reset Form
                setIsQuickRegisterOpen(false);
                setQuickRegisterData({ name: '', phone: '' });
            }

        } catch (error) {
            console.error("Error registering client:", error);
            alert("Erro ao registrar cliente. Tente novamente.");
        } finally {
            setIsRegisteringClient(false);
        }
    };

    // INITIATE NEW APPOINTMENT (Stage 1: Select Customer)
    const handleNewAppointment = (context?: Partial<Appointment>) => {
        // Set draft details based on context (from grid click) or defaults (from header button)
        setDraftAppointment({
            providerId: context?.providerId || (selectedProviderId !== 'all' ? selectedProviderId : activeProviders[0]?.id),
            serviceId: services[0]?.id || '',
            date: context?.date || gridDateStr,
            time: context?.time || '09:00',
            status: 'Pendente'
        });
        setCustomerSearchTerm('');
        setIsCustomerSelectionOpen(true);
    };

    // FINALIZE NEW APPOINTMENT (Stage 2: Create Appointment with Selected Customer)
    const handleSelectCustomerForAppointment = (customer: Customer) => {
        if (!draftAppointment) return;

        if (customer.isBlocked) {
            alert(`🚫 CLIENTE BLOQUEADA\n\nMotivo: ${customer.blockReason || 'Não informado'}\n\nNão é possível realizar agendamentos para clientes bloqueadas.`);
            return;
        }

        // --- LEAD CONVERSION LOGIC ---
        // Check if this customer corresponds to an existing Lead based on Phone
        const matchedLead = leads.find(l => {
            const leadPhone = l.phone.replace(/\D/g, '');
            const customerPhone = customer.phone.replace(/\D/g, '');
            // Check for exact match or suffix match (e.g. 5511999999999 vs 11999999999)
            // Ensure at least 8 digits to avoid matching short substrings
            const isMatch = (leadPhone === customerPhone) ||
                (leadPhone.length >= 8 && customerPhone.length >= 8 && (leadPhone.endsWith(customerPhone) || customerPhone.endsWith(leadPhone)));

            return isMatch && l.status !== 'CONVERTIDO' && l.status !== 'PERDIDO';
        });

        if (matchedLead) {
            const confirmConversion = window.confirm(`⚠️ ESTE CLIENTE É UM LEAD ATIVO DO CRM!\n\nEste agendamento irá converter o lead "${matchedLead.name}" e movê-lo para o status "CONVERTIDO".\n\nDeseja confirmar o agendamento e a conversão?`);

            if (!confirmConversion) return;

            // Automatically convert the lead
            setLeads(prev => prev.map(l =>
                l.id === matchedLead.id
                    ? { ...l, status: 'CONVERTIDO', updatedAt: new Date().toISOString() }
                    : l
            ));
        }
        // -----------------------------

        let effectiveProviderId = draftAppointment.providerId!;

        // VALIDATION: Check if provider is restricted
        if (draftAppointment.providerId && customer.restrictedProviderIds?.includes(draftAppointment.providerId)) {
            const restrictedProvider = providers.find(p => p.id === draftAppointment.providerId);
            const providerName = restrictedProvider?.name || 'Profissional';

            // Find reason in history (most recent restriction for this provider)
            const restrictionEntry = customer.history
                .filter(h => h.type === 'RESTRICTION' && h.providerId === draftAppointment.providerId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            const reason = restrictionEntry?.details || "Motivo não registrado.";

            // ALERT THE USER, BUT DO NOT BLOCK
            alert(`🚫 RESTRIÇÃO DE ATENDIMENTO\n\nA cliente possui restrição com ${providerName}.\n${reason}\n\nO sistema selecionará outra profissional disponível automaticamente.`);

            // Auto-switch to a valid provider (First active provider not in restriction list)
            const fallbackProvider = activeProviders.find(p =>
                p.id !== draftAppointment.providerId &&
                !customer.restrictedProviderIds?.includes(p.id)
            );

            if (fallbackProvider) {
                effectiveProviderId = fallbackProvider.id;
            }
        }

        const newAppt: Appointment = {
            id: Date.now().toString(),
            customerId: customer.id,
            providerId: effectiveProviderId,
            serviceId: draftAppointment.serviceId!,
            date: draftAppointment.date!,
            time: draftAppointment.time!,
            status: 'Pendente'
        };

        setSelectedAppointment(newAppt);
        setIsCustomerSelectionOpen(false);
        setIsServiceModalOpen(true);
    };

    const filteredCustomersForSelection = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        c.phone.includes(customerSearchTerm)
    );

    const MiniCalendar = () => {
        const [viewDate, setViewDate] = useState(new Date(dateRef));
        const month = viewDate.getMonth();
        const year = viewDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            const current = new Date(year, month, d);
            const isSelected = formatDate(current) === formatDate(dateRef);
            days.push(
                <button
                    key={d}
                    onClick={() => { setDateRef(current); setTimeView('day'); }}
                    className={`w-8 h-8 flex items-center justify-center text-[10px] font-black rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300'}`}
                >
                    {d}
                </button>
            );
        }

        const navigateMonth = (direction: 'prev' | 'next') => {
            const newView = new Date(viewDate);
            newView.setDate(1); // Reset to 1st to prevent month skipping logic error (e.g. Jan 31 -> Feb)
            newView.setMonth(viewDate.getMonth() + (direction === 'next' ? 1 : -1));
            setViewDate(newView);
        };

        return (
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{monthName}</span>
                    <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-[8px] font-black text-slate-400 uppercase">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };

    const ProviderFilter = () => {
        const filteredProvidersBySearch = activeProviders.filter(p =>
            p.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
            p.specialty.toLowerCase().includes(sidebarSearch.toLowerCase())
        );

        const toggleProvider = (id: string) => {
            setVisibleProviderIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
        };

        return (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden mt-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-900 dark:text-white">Profissionais</h3>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            value={sidebarSearch}
                            onChange={e => setSidebarSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={visibleProviderIds.length > 0 && visibleProviderIds.length === activeProviders.length}
                            onChange={() => setVisibleProviderIds(visibleProviderIds.length === activeProviders.length ? [] : activeProviders.map(p => p.id))}
                            className="w-4 h-4 rounded border-2 border-slate-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Todos</span>
                    </label>

                    <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-zinc-800">
                        {filteredProvidersBySearch.map(p => (
                            <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={visibleProviderIds.includes(p.id)}
                                    onChange={() => toggleProvider(p.id)}
                                    className="w-3.5 h-3.5 rounded border-2 border-slate-200 dark:border-zinc-700 text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors uppercase">{p.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full gap-6 pb-20 md:pb-0 font-sans">
            {/* Sidebar (Left) */}
            <div className={`hidden lg:flex flex-col w-72 transition-all duration-300 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-[-110%] opacity-0 absolute left-0'}`}>
                <MiniCalendar />
                <ProviderFilter />
            </div>

            <div className="flex-1 flex flex-col space-y-4 min-w-0">
                {/* Header Controls (Date & New) */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors">

                    {/* Date Filters */}
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                            {(['day', 'month', 'year', 'custom'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }}
                                    className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    {v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}
                                </button>
                            ))}
                        </div>

                        {timeView === 'custom' ? (
                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl w-full md:w-auto">
                                <CalendarRange size={16} className="text-slate-400" />
                                <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                                <span className="text-slate-300">-</span>
                                <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between md:justify-start">
                                <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                                <div className="flex flex-col items-center min-w-[140px]">
                                    <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span>
                                </div>
                                <button onClick={() => navigateDate('next')} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 md:min-w-[200px]">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={selectedProviderId}
                                onChange={(e) => setSelectedProviderId(e.target.value)}
                                className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 uppercase appearance-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="all">Todas Profissionais</option>
                                {activeProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={() => handleNewAppointment()}
                            className="flex items-center gap-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Novo</span>
                        </button>
                    </div>
                </div>

                {/* Secondary Toolbar: Search, Zoom (Horizontal), Confirmations */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-zinc-900 p-2 px-3 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors">
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filtrar cliente..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <button
                            onClick={() => setIsWhatsAppModalOpen(true)}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                        >
                            <MessageCircle size={16} /> Confirmações
                        </button>
                    </div>
                </div>

                {/* Agenda Grid */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col relative transition-colors">
                    <div className="absolute top-2 right-4 z-20 md:hidden bg-white/90 dark:bg-zinc-900/90 px-2 rounded text-[9px] font-bold text-slate-400">
                        Dia: {new Date(gridDateStr + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>

                    {/* Grid Header */}
                    <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
                        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-zinc-800 flex items-center justify-center">
                            <Clock size={14} className="text-slate-400" />
                        </div>
                        <div className="flex-1 overflow-x-auto scrollbar-hide flex">
                            {activeVisibileProviders.map(p => (
                                <div
                                    key={p.id}
                                    className="flex-shrink-0 border-r border-slate-100 dark:border-zinc-800 p-3 text-center transition-all"
                                    style={{ width: `${160 * zoomLevel}px` }}
                                >
                                    <div className="flex justify-center mb-1">
                                        <Avatar src={p.avatarUrl || p.avatar} name={p.name} size="w-8 h-8" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate px-1">{p.name.split(' ')[0]}</p>
                                </div>
                            ))}
                        </div>
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 px-3 border-l border-slate-200 dark:border-zinc-800">
                            <button
                                onClick={() => setRowHeight(prev => Math.max(40, prev - 10))}
                                className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200"
                                title="Diminuir Altura"
                            >
                                <ZoomOut size={14} />
                            </button>
                            <button
                                onClick={() => setRowHeight(prev => Math.min(200, prev + 10))}
                                className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200"
                                title="Aumentar Altura"
                            >
                                <ZoomIn size={14} />
                            </button>
                            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1"></div>
                            <button
                                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                                className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                                title="Estreitar Colunas"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
                                className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                                title="Alargar Colunas"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Annual View Grid */}
                    {timeView === 'year' ? (
                        <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-slate-50/30 dark:bg-zinc-950/20">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const year = dateRef.getFullYear();
                                    const monthDate = new Date(year, i, 1);
                                    const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'long' });

                                    const monthApps = appointments.filter(a => {
                                        const appDate = a.date.split('-');
                                        return parseInt(appDate[0]) === year && parseInt(appDate[1]) === (i + 1) && a.status !== 'Cancelado' && (selectedProviderId === 'all' || a.providerId === selectedProviderId);
                                    });

                                    const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === year;

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                const newDate = new Date(dateRef);
                                                newDate.setMonth(i);
                                                setDateRef(newDate);
                                                setTimeView('month');
                                            }}
                                            className={`bg-white dark:bg-zinc-900 border ${isCurrentMonth ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-zinc-800'} rounded-3xl p-5 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all group flex flex-col justify-between min-h-[160px]`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">{year}</h4>
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{monthName}</h3>
                                                </div>
                                                {isCurrentMonth && (
                                                    <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">Atual</span>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-end justify-between">
                                                    <div className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter">{monthApps.length}</div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Atendimentos</div>
                                                </div>

                                                <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                        style={{ width: `${Math.min(100, (monthApps.length / 50) * 100)}%` }}
                                                    ></div>
                                                </div>

                                                <div className="flex justify-between items-center text-[8px] font-bold uppercase text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                        <span>{monthApps.filter(a => a.status === 'Concluído').length} Feitos</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                                        <span>{monthApps.filter(a => a.status === 'Confirmado' || a.status === 'Pendente').length} Agendados</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : timeView === 'month' ? (
                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="grid grid-cols-7 gap-4 h-full min-h-[500px]">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="text-center font-black text-slate-400 uppercase text-xs mb-2">
                                        {day}
                                    </div>
                                ))}
                                {(() => {
                                    const year = dateRef.getFullYear();
                                    const month = dateRef.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay();
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const days = [];

                                    // Empty slots for previous month
                                    for (let i = 0; i < firstDay; i++) {
                                        days.push(<div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-zinc-800/30 rounded-2xl border border-transparent"></div>);
                                    }

                                    // Days of month
                                    for (let day = 1; day <= daysInMonth; day++) {
                                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const dayApps = appointments.filter(a =>
                                            a.date === dateStr &&
                                            a.status !== 'Cancelado' &&
                                            (selectedProviderId === 'all' || a.providerId === selectedProviderId)
                                        );

                                        const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                        days.push(
                                            <div
                                                key={day}
                                                onClick={() => {
                                                    setDateRef(new Date(year, month, day));
                                                    setTimeView('day');
                                                }}
                                                className={`relative group bg-white dark:bg-zinc-900 border ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'} rounded-2xl p-2 transition-all cursor-pointer hover:shadow-md flex flex-col gap-1 min-h-[80px]`}
                                            >
                                                <span className={`text-xs font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>

                                                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                                    {dayApps.slice(0, 3).map(app => (
                                                        <div key={app.id} className={`w-full h-1.5 rounded-full ${app.status === 'Confirmado' ? 'bg-emerald-500' : app.status === 'Concluído' ? 'bg-slate-400' : 'bg-amber-400'}`} title={`${app.time} - ${services.find(s => s.id === app.serviceId)?.name}`}></div>
                                                    ))}
                                                    {dayApps.length > 3 && (
                                                        <span className="text-[9px] font-bold text-slate-400 text-center">+{dayApps.length - 3}</span>
                                                    )}
                                                </div>

                                                {dayApps.length > 0 && (
                                                    <div className="absolute top-2 right-2 text-[9px] font-black text-slate-400">
                                                        {dayApps.length}
                                                    </div>
                                                )}

                                                {/* Hover Details Overlay */}
                                                {dayApps.length > 0 && (
                                                    <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-[150] bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900/95 dark:bg-black/95 backdrop-blur-md border border-slate-700 rounded-3xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200 hidden md:block">
                                                        <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                                                            <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{dayApps.length} Atendimentos</span>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-3">
                                                            {dayApps.sort((a, b) => a.time.localeCompare(b.time)).map(app => {
                                                                const cust = customers.find(c => c.id === app.customerId);
                                                                const srv = services.find(s => s.id === app.serviceId);
                                                                const prv = providers.find(p => p.id === app.providerId);
                                                                const price = app.bookedPrice || srv?.price || 0;
                                                                return (
                                                                    <div key={app.id} className="flex flex-col gap-0.5 border-l-2 border-indigo-500 pl-3 py-0.5">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{app.time}</span>
                                                                            <span className="text-[9px] font-black text-emerald-400">R$ {price.toFixed(0)}</span>
                                                                            <span className={`w-2 h-2 rounded-full ${app.status === 'Confirmado' ? 'bg-emerald-500' : app.status === 'Concluído' ? 'bg-slate-500' : 'bg-amber-400'}`}></span>
                                                                        </div>
                                                                        <p className="text-[11px] font-black text-white uppercase truncate">{cust?.name.split(' ')[0]}</p>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate flex-1">{app.combinedServiceNames || srv?.name}</p>
                                                                            <span className="text-[8px] font-black text-indigo-300 uppercase truncate">[{prv?.name.split(' ')[0]}]</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return days;
                                })()}
                            </div>
                        </div>
                    ) : (
                        /* Time Slots (Day View) */
                        <div className="flex-1 overflow-y-auto scrollbar-hide relative">
                            {hours.map(hour => (
                                <div
                                    key={hour}
                                    className="flex border-b border-slate-100 dark:border-zinc-800"
                                    style={{ minHeight: `${rowHeight}px` }}
                                >
                                    {/* Time Column */}
                                    <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex items-center justify-center text-[10px] font-black text-slate-400 sticky left-0 z-10">
                                        {hour}:00
                                    </div>

                                    {/* Provider Columns */}
                                    <div className="flex-1 flex">
                                        {activeVisibileProviders.map(p => {
                                            const slotAppointments = getCellAppointments(p.id, hour);
                                            return (
                                                <div
                                                    key={`${p.id}-${hour}`}
                                                    className="flex-shrink-0 border-r border-slate-50 dark:border-zinc-800 p-1 relative group hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-all duration-300"
                                                    style={{ width: `${160 * zoomLevel}px` }}
                                                >
                                                    {/* Add Button on Hover */}
                                                    <button
                                                        onClick={() => handleNewAppointment({
                                                            providerId: p.id,
                                                            date: gridDateStr,
                                                            time: `${String(hour).padStart(2, '0')}:00`
                                                        })}
                                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center z-0"
                                                    >
                                                        <div className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-1.5 rounded-full shadow-sm"><Plus size={16} /></div>
                                                    </button>

                                                    {slotAppointments.map(appt => {
                                                        const customer = customers.find(c => c.id === appt.customerId);
                                                        const service = services.find(s => s.id === appt.serviceId);

                                                        return (
                                                            <div
                                                                key={appt.id}
                                                                onClick={() => handleAppointmentClick(appt)}
                                                                className={`relative z-10 mb-1 p-2 rounded-xl border text-left cursor-pointer transition-all active:scale-95 shadow-sm ${appt.status === 'Confirmado' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300' :
                                                                    appt.status === 'Em Andamento' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300' :
                                                                        appt.status === 'Concluído' ? 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 opacity-70' :
                                                                            'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-300'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[70%]">{customer?.name.split(' ')[0]}</span>
                                                                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{appt.time.split(':')[1]}</span>
                                                                </div>
                                                                <div className="text-[9px] text-slate-600 dark:text-slate-300 font-bold truncate mt-0.5">{appt.combinedServiceNames || service?.name}</div>
                                                                <div className="flex justify-between items-center mt-1.5">
                                                                    <span className={`w-2 h-2 rounded-full ${appt.status === 'Confirmado' ? 'bg-emerald-500' :
                                                                        appt.status === 'Em Andamento' ? 'bg-blue-500' :
                                                                            appt.status === 'Concluído' ? 'bg-slate-500' :
                                                                                'bg-amber-400'
                                                                        }`}></span>
                                                                    <button onClick={(e) => handleSendWhatsApp(e, appt)} className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 p-1 rounded transition-colors"><MessageCircle size={12} /></button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* CUSTOMER SELECTION MODAL */}
                {isCustomerSelectionOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col max-h-[80vh]">
                            <div className="px-6 py-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center flex-shrink-0">
                                <h3 className="font-black text-base uppercase tracking-widest flex items-center gap-2">
                                    <User size={18} /> Selecione a Cliente
                                </h3>
                                <button onClick={() => setIsCustomerSelectionOpen(false)} className="text-white hover:text-slate-300"><X size={24} /></button>
                            </div>

                            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Buscar por nome ou telefone..."
                                        className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 bg-white dark:bg-zinc-900 uppercase placeholder:text-slate-400"
                                        value={customerSearchTerm}
                                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Quick Register Toggle / Form */}
                            {isQuickRegisterOpen ? (
                                <div className="p-4 bg-indigo-50 dark:bg-zinc-900 border-b border-indigo-100 dark:border-zinc-800 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-black text-xs uppercase text-indigo-900 dark:text-indigo-400">Novo Cadastro Rápido</h4>
                                        <button onClick={() => setIsQuickRegisterOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-bold uppercase">Cancelar</button>
                                    </div>
                                    <form onSubmit={handleQuickRegister} className="flex flex-col gap-3">
                                        <input
                                            type="text"
                                            placeholder="Nome Completo"
                                            className="w-full px-3 py-2 rounded-xl border border-indigo-100 dark:border-zinc-700 text-xs font-bold focus:outline-none focus:border-indigo-500 uppercase"
                                            value={quickRegisterData.name}
                                            onChange={e => setQuickRegisterData({ ...quickRegisterData, name: e.target.value })}
                                            autoFocus
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Telefone / WhatsApp"
                                            className="w-full px-3 py-2 rounded-xl border border-indigo-100 dark:border-zinc-700 text-xs font-bold focus:outline-none focus:border-indigo-500 uppercase"
                                            value={quickRegisterData.phone}
                                            onChange={e => setQuickRegisterData({ ...quickRegisterData, phone: e.target.value })}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!quickRegisterData.name || !quickRegisterData.phone || isRegisteringClient}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isRegisteringClient ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isRegisteringClient ? 'Salvando...' : 'Salvar e Agendar'}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="p-2 bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setIsQuickRegisterOpen(true);
                                            if (customerSearchTerm && isNaN(Number(customerSearchTerm))) {
                                                setQuickRegisterData(prev => ({ ...prev, name: customerSearchTerm }));
                                            }
                                        }}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus size={12} /> Cadastrar Nova Cliente
                                    </button>
                                </div>
                            )}

                            <div className={`flex-1 overflow-y-auto p-2 scrollbar-hide bg-white dark:bg-zinc-900 ${isQuickRegisterOpen ? 'opacity-50 pointer-events-none' : ''}`}>
                                {filteredCustomersForSelection.length > 0 ? (
                                    filteredCustomersForSelection.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleSelectCustomerForAppointment(c)}
                                            className="w-full text-left p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all border-b border-slate-50 dark:border-zinc-800 last:border-none flex items-center justify-between group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-black uppercase text-sm truncate ${c.isBlocked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{c.name}</p>
                                                    {c.isBlocked && <Ban size={14} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />}
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{c.phone}</p>
                                                {c.isBlocked && <p className="text-[9px] font-black text-rose-500 uppercase mt-0.5">BLOQUEADA: {c.blockReason || 'SEM MOTIVO'}</p>}
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${c.isBlocked ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-300' : 'bg-slate-100 dark:bg-zinc-800 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 text-slate-400 dark:text-slate-500 group-hover:text-indigo-700 dark:group-hover:text-white'}`}>
                                                {c.isBlocked ? <XCircle size={16} /> : <Plus size={16} />}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-400 dark:text-slate-600">
                                        <User size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-black uppercase">Nenhuma cliente encontrada</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* WhatsApp Confirmations Modal with Copy Option */}
                {isWhatsAppModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-slate-100 dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col max-h-[85vh]">
                            <div className="px-6 py-4 bg-slate-950 dark:bg-black text-white flex justify-between items-center flex-shrink-0">
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                        <MessageCircle size={18} className="text-emerald-400" /> Confirmações
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">
                                        {new Date(rangeStart + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(rangeEnd + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <button onClick={() => setIsWhatsAppModalOpen(false)} className="text-white hover:text-slate-300"><X size={24} /></button>
                            </div>

                            <div className="p-4 overflow-y-auto space-y-4 flex-1">
                                {Object.keys(whatsappList).length > 0 ? Object.entries(whatsappList).map(([customerId, custApps]) => {
                                    const customer = customers.find(c => c.id === customerId);
                                    if (!customer) return null;
                                    const sortedApps = (custApps as Appointment[]).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

                                    return (
                                        <div key={customerId} className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700">
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs mb-2">{customer.name}</h4>
                                            <div className="space-y-2 mb-4">
                                                {sortedApps.map(app => (
                                                    <div key={app.id} className="flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-700">
                                                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase flex items-center gap-1.5">
                                                            <span className="text-slate-900 dark:text-white font-black">{new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {app.time}</span>
                                                            - {app.combinedServiceNames || services.find(s => s.id === app.serviceId)?.name}
                                                        </div>
                                                        <button
                                                            onClick={() => toggleAppointmentStatus(app.id)}
                                                            className={`w-1.5 h-6 rounded-full transition-all ${app.status === 'Confirmado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-400 hover:bg-emerald-400'}`}
                                                            title={app.status === 'Confirmado' ? 'Confirmado' : 'Pendente'}
                                                        ></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const msg = generateConfirmationMessage(customer, sortedApps);
                                                        navigator.clipboard.writeText(msg).then(() => alert('Mensagem copiada!'));
                                                    }}
                                                    className="flex-1 py-2 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                >
                                                    <Copy size={14} /> Copiar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const msg = generateConfirmationMessage(customer, sortedApps);
                                                        const phone = customer.phone.replace(/\D/g, '');
                                                        window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                                    }}
                                                    className="flex-[2] py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                                                >
                                                    <MessageCircle size={14} /> Enviar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-10 text-slate-400 dark:text-slate-600">
                                        <CheckCircle2 size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-black uppercase">Nenhum agendamento pendente/confirmado no período</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal */}
                {isServiceModalOpen && selectedAppointment && (
                    <ServiceModal
                        appointment={selectedAppointment}
                        allAppointments={appointments}
                        customer={customers.find(c => c.id === selectedAppointment.customerId) || customers[0]}
                        onClose={() => { setIsServiceModalOpen(false); setSelectedAppointment(null); }}
                        onUpdateAppointments={setAppointments}
                        onUpdateCustomers={setCustomers}
                        onSelectAppointment={(app) => setSelectedAppointment(app)}
                        services={services}
                        campaigns={campaigns}
                        source="AGENDA"
                        paymentSettings={paymentSettings}
                        providers={providers}
                        stock={stock}
                        customers={customers}
                    />
                )}
            </div>
        </div>
    );
};