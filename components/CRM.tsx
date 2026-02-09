
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabase';

import { Users, Search, ArrowRightLeft, Star, Package, Clock, MessageSquare, AlertTriangle, Heart, Calendar, Check, ChevronLeft, Ticket, Briefcase, XCircle, Edit3, Save, X, Ban, ShieldAlert, HeartHandshake, Map, BarChart, Trophy, TrendingUp, Filter, Smartphone, UserPlus, CheckCircle2, ChevronRight, ArrowRight, MapPin, Phone, Mail, Contact, History, MessageCircle, AlertCircle, RefreshCw, PieChart as PieIcon, MousePointer2, Target, Zap, Lightbulb, FilterIcon } from 'lucide-react';
import { Customer, CustomerHistoryItem, Lead, LeadStatus, Provider, Appointment, Service } from '../types';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, Legend, FunnelChart, Funnel, LabelList } from 'recharts';

interface CRMProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    providers: Provider[];
    appointments: Appointment[];
    services: Service[];
}

export const CRM: React.FC<CRMProps> = ({ customers, setCustomers, leads, setLeads, providers, appointments, services }) => {
    // Main CRM Tab State
    const [crmView, setCrmView] = useState<'RELATIONSHIP' | 'JOURNEY' | 'REPORTS'>('JOURNEY');

    // --- RELATIONSHIP STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [activeTab, setActiveTab] = useState<'TIMELINE' | 'PREFERENCES' | 'COMPLAINTS'>('TIMELINE');
    const [showSwitchModal, setShowSwitchModal] = useState(false);
    const [providerToRestrictId, setProviderToRestrictId] = useState('');
    const [shouldAssignNew, setShouldAssignNew] = useState(false);
    const [newProviderId, setNewProviderId] = useState('');
    const [switchReason, setSwitchReason] = useState('');

    // --- JOURNEY (KANBAN) STATE ---
    const [funnelSearch, setFunnelSearch] = useState('');
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [duplicateLead, setDuplicateLead] = useState<Lead | null>(null);

    // Canais Dinâmicos
    const [channels, setChannels] = useState(['WhatsApp', 'Instagram', 'Google', 'Indicação', 'Trafego Pago', 'Outro']);
    const [isCustomChannel, setIsCustomChannel] = useState(false);

    const [newLeadForm, setNewLeadForm] = useState<Partial<Lead>>({
        name: '',
        phone: '',
        source: 'WhatsApp',
        serviceInterest: ''
    });
    const [lostReasonModal, setLostReasonModal] = useState<{ isOpen: boolean, leadId: string | null }>({ isOpen: false, leadId: null });
    const [lostReasonText, setLostReasonText] = useState('');
    const [convertModal, setConvertModal] = useState<{ isOpen: boolean, lead: Lead | null }>({ isOpen: false, lead: null });

    // --- RELATIONSHIP LOGIC ---
    const filteredCustomers = customers.filter(c =>
        (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)) && c.totalSpent > 0
    );

    const getProviderName = (id?: string) => {
        return providers.find(p => p.id === id)?.name || 'Não atribuído';
    };

    const handleManagementAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !switchReason) return;

        setCustomers(prev => prev.map(c => {
            if (c.id === selectedCustomer.id) {
                const historyEntries: CustomerHistoryItem[] = [];
                const today = new Date().toISOString().split('T')[0];
                let updatedAssignedProvider = c.assignedProviderId;
                let updatedRestricted = c.restrictedProviderIds || [];

                if (providerToRestrictId) {
                    const restrictedName = getProviderName(providerToRestrictId);
                    if (!updatedRestricted.includes(providerToRestrictId)) {
                        updatedRestricted = [...updatedRestricted, providerToRestrictId];
                    }

                    historyEntries.push({
                        id: `restr-${Date.now()}`,
                        date: today,
                        type: 'RESTRICTION',
                        description: `RESTRIÇÃO: ${restrictedName.toUpperCase()}`,
                        providerId: providerToRestrictId,
                        details: `MOTIVO: ${switchReason}`
                    });

                    if (c.assignedProviderId === providerToRestrictId && !shouldAssignNew) {
                        updatedAssignedProvider = undefined;
                    }
                }

                if (shouldAssignNew && newProviderId) {
                    const newProviderName = getProviderName(newProviderId);
                    historyEntries.push({
                        id: `switch-${Date.now()}`,
                        date: today,
                        type: 'PROVIDER_SWITCH',
                        description: `TROCA DE RESPONSÁVEL: ${newProviderName}`,
                        providerId: newProviderId,
                        details: `Motivo: ${switchReason}`
                    });
                    updatedAssignedProvider = newProviderId;
                }

                const updatedCustomer: Customer = {
                    ...c,
                    assignedProviderId: updatedAssignedProvider,
                    restrictedProviderIds: updatedRestricted,
                    history: [...historyEntries, ...c.history]
                };
                setSelectedCustomer(updatedCustomer);
                return updatedCustomer;
            }
            return c;
        }));

        setShowSwitchModal(false);
        setSwitchReason('');
        setNewProviderId('');
        setProviderToRestrictId('');
        setShouldAssignNew(false);
    };

    // --- JOURNEY LOGIC ---
    const kanbanColumns: { id: LeadStatus; label: string; color: string }[] = [
        { id: 'NOVO', label: 'Novo Lead', color: 'bg-blue-500' },
        { id: 'ATENDIMENTO', label: 'Em Atendimento', color: 'bg-indigo-500' },
        { id: 'QUALIFICADO', label: 'Qualificado', color: 'bg-purple-500' },
        { id: 'PROPOSTA', label: 'Proposta / Orçamento', color: 'bg-amber-500' },
        { id: 'CONVERTIDO', label: 'Agendamento (Convertido)', color: 'bg-emerald-500' },
        { id: 'PERDIDO', label: 'Perdido / Desistiu', color: 'bg-slate-500' },
    ];

    // State for Customer Overlap and Editing Lead
    const [existingCustomerOverlap, setExistingCustomerOverlap] = useState<Customer | null>(null);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    // New function to save Lead Details (Temperature/Notes)
    const handleSaveLeadDetails = async () => {
        if (!editingLead) return;

        const leadData = {
            temperature: editingLead.temperature,
            notes: editingLead.notes
        };

        try {
            const { error } = await supabase.from('leads').update(leadData).eq('id', editingLead.id);
            if (error) throw error;
            setLeads(prev => prev.map(l => l.id === editingLead.id ? editingLead : l));
            setEditingLead(null);
        } catch (error) {
            console.error('Error updating lead details:', error);
        }
    };

    // Effect to detect duplicate lead OR existing customer
    useEffect(() => {
        if (newLeadForm.phone && newLeadForm.phone.replace(/\D/g, '').length >= 8) {
            const cleanPhone = newLeadForm.phone.replace(/\D/g, '');

            // 1. Check Leads
            const foundLead = leads.find(l => l.phone.replace(/\D/g, '') === cleanPhone);
            if (foundLead) {
                setDuplicateLead(foundLead);
                setNewLeadForm(prev => ({ ...prev, name: foundLead.name, source: foundLead.source, serviceInterest: foundLead.serviceInterest }));
            } else {
                setDuplicateLead(null);
            }

            // 2. Check Customers
            const foundCustomer = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
            if (foundCustomer) {
                setExistingCustomerOverlap(foundCustomer);
            } else {
                setExistingCustomerOverlap(null);
            }

        } else {
            setDuplicateLead(null);
            setExistingCustomerOverlap(null);
        }
    }, [newLeadForm.phone, leads, customers]);

    const handleAddLead = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLeadForm.name || !newLeadForm.phone || !newLeadForm.source) return;

        if (isCustomChannel && !channels.includes(newLeadForm.source)) {
            setChannels(prev => [...prev, newLeadForm.source!]);
        }

        const newLead: Lead = {
            id: `lead-${Date.now()}`,
            name: newLeadForm.name!,
            phone: newLeadForm.phone!,
            source: newLeadForm.source!,
            status: 'NOVO',
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            serviceInterest: newLeadForm.serviceInterest,
            temperature: undefined, // Default
            tags: []
        };
        setLeads(prev => [newLead, ...prev]);
        setIsAddLeadModalOpen(false);
        setIsCustomChannel(false);
        setNewLeadForm({ name: '', phone: '', source: 'WhatsApp', serviceInterest: '' });
    };

    // ... (keeping existing functions: handleMoveDuplicate, moveLead, etc.)

    // Render function additions inside Key Views


    const handleMoveDuplicate = (targetStatus: LeadStatus) => {
        if (!duplicateLead) return;
        setLeads(prev => prev.map(l => l.id === duplicateLead.id ? { ...l, status: targetStatus, updatedAt: new Date().toISOString() } : l));
        setIsAddLeadModalOpen(false);
        setDuplicateLead(null);
    };

    const moveLead = (leadId: string, direction: 'next' | 'prev') => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        const currentIndex = kanbanColumns.findIndex(c => c.id === lead.status);
        if (currentIndex === -1) return;
        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0 || nextIndex >= kanbanColumns.length) return;
        const nextStatus = kanbanColumns[nextIndex].id;

        if (nextStatus === 'PERDIDO') {
            setLostReasonModal({ isOpen: true, leadId });
            return;
        }
        if (nextStatus === 'CONVERTIDO') {
            handleConvertLead(lead);
            return;
        }
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: nextStatus, updatedAt: new Date().toISOString() } : l));
    };

    const handleConfirmLost = () => {
        if (lostReasonModal.leadId && lostReasonText) {
            setLeads(prev => prev.map(l => l.id === lostReasonModal.leadId ? { ...l, status: 'PERDIDO', lostReason: lostReasonText, updatedAt: new Date().toISOString() } : l));
            setLostReasonModal({ isOpen: false, leadId: null });
            setLostReasonText('');
        }
    };

    const handleConvertLead = (lead: Lead) => {
        const existingCustomer = customers.find(c => c.phone.replace(/\D/g, '') === lead.phone.replace(/\D/g, ''));
        if (existingCustomer) {
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'CONVERTIDO', updatedAt: new Date().toISOString() } : l));
            alert(`Lead vinculado à cliente existente: ${existingCustomer.name}`);
        } else {
            setConvertModal({ isOpen: true, lead });
        }
    };

    const confirmConversion = () => {
        if (!convertModal.lead) return;
        const newCustomer: Customer = {
            id: `cust-${Date.now()}`,
            name: convertModal.lead.name,
            phone: convertModal.lead.phone,
            registrationDate: new Date().toISOString().split('T')[0],
            status: 'Novo',
            totalSpent: 0,
            lastVisit: '',
            history: [],
            acquisitionChannel: convertModal.lead.source,
            preferences: { favoriteServices: [], preferredDays: [], notes: '', restrictions: '' }
        };
        setCustomers(prev => [...prev, newCustomer]);
        setLeads(prev => prev.map(l => l.id === convertModal.lead!.id ? { ...l, status: 'CONVERTIDO', updatedAt: new Date().toISOString() } : l));
        setConvertModal({ isOpen: false, lead: null });
    };

    const openWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${name.split(' ')[0]}! Tudo bem? Vi seu interesse aqui na Aminna...`);
        window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${message}`, '_blank');
    };

    // --- EXTENDED REPORT LOGIC ---
    const reports = useMemo(() => {
        const totalLeads = leads.length;
        const convertedCount = leads.filter(l => l.status === 'CONVERTIDO').length;
        const lostCount = leads.filter(l => l.status === 'PERDIDO').length;
        const activeCount = totalLeads - convertedCount - lostCount;

        const funnelData = kanbanColumns
            .filter(col => col.id !== 'PERDIDO')
            .map(col => ({
                name: col.label,
                value: leads.filter(l => l.status === col.id).length,
                fill: col.id === 'NOVO' ? '#3b82f6' :
                    col.id === 'ATENDIMENTO' ? '#6366f1' :
                        col.id === 'QUALIFICADO' ? '#a855f7' :
                            col.id === 'PROPOSTA' ? '#f59e0b' :
                                '#10b981'
            }));

        const sourcesMap: Record<string, number> = {};
        leads.forEach(l => {
            sourcesMap[l.source] = (sourcesMap[l.source] || 0) + 1;
        });
        const sourcesData = Object.entries(sourcesMap).map(([name, value]) => ({ name, value }));

        // Dynamic Lost Reasons
        const lostReasonsMap: Record<string, number> = {};
        leads.filter(l => l.status === 'PERDIDO' && l.lostReason).forEach(l => {
            const reason = l.lostReason || 'Outros';
            lostReasonsMap[reason] = (lostReasonsMap[reason] || 0) + 1;
        });

        const lostReasons = Object.keys(lostReasonsMap).length > 0
            ? Object.entries(lostReasonsMap).map(([name, value], index) => ({
                name,
                value,
                color: ['#f43f5e', '#fb923c', '#fbbf24', '#94a3b8'][index % 4]
            }))
            : [{ name: 'Sem dados', value: 0, color: '#e2e8f0' }];


        const channelConversion = Object.keys(sourcesMap).map(source => {
            const totalChannel = leads.filter(l => l.source === source).length;
            const convertedChannel = leads.filter(l => l.source === source && l.status === 'CONVERTIDO').length;
            return {
                name: source,
                taxa: totalChannel > 0 ? (convertedChannel / totalChannel) * 100 : 0
            };
        }).sort((a, b) => b.taxa - a.taxa);

        // Leads Over Time (Last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const leadsOverTime = last7Days.map(date => {
            const dayName = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }); // Add time to avoid timezone issues
            const count = leads.filter(l => l.createdAt === date).length;
            return { name: dayName.charAt(0).toUpperCase() + dayName.slice(1), leads: count };
        });

        return {
            totalLeads, convertedCount, lostCount, activeCount,
            funnelData, sourcesData, lostReasons, channelConversion, leadsOverTime,
            convRate: totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0
        };
    }, [leads]);

    const customerTimeline = useMemo(() => {
        if (!selectedCustomer) return [];

        // Convert appointments to history items
        const appointmentHistory: CustomerHistoryItem[] = appointments
            .filter(a => a.customerId === selectedCustomer.id && (a.status === 'Concluído' || a.status === 'Confirmado'))
            .map(a => {
                const service = services.find(s => s.id === a.serviceId);
                const provider = providers.find(p => p.id === a.providerId);
                return {
                    id: a.id,
                    date: a.date,
                    type: 'VISIT',
                    description: service?.name || 'Serviço',
                    providerId: a.providerId,
                    details: `Atendimento com ${provider?.name || 'Profissional'}. Status: ${a.status}`,
                    rating: 0 // Could be connected to a rating system later
                };
            });

        // Merge with manual history and sort by date descending
        const merged = [...appointmentHistory, ...(selectedCustomer.history || [])];
        return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedCustomer, appointments, services, providers]);

    const filteredLeads = useMemo(() => {
        if (!funnelSearch) return leads;
        const search = funnelSearch.toLowerCase();
        return leads.filter(l => l.name.toLowerCase().includes(search) || l.phone.includes(search));
    }, [leads, funnelSearch]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#06b6d4'];

    return (
        <div className="space-y-4 md:space-y-6 h-full flex flex-col pb-20 md:pb-0 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col gap-4 flex-shrink-0 px-1 md:px-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">CRM</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest">Gestão de Experiência do Cliente</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {crmView === 'JOURNEY' && (
                            <div className="relative flex-1 md:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar Lead..."
                                    className="pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-950 dark:text-white outline-none focus:border-indigo-500 w-full md:w-64 transition-all shadow-sm"
                                    value={funnelSearch}
                                    onChange={e => setFunnelSearch(e.target.value)}
                                />
                            </div>
                        )}

                        {crmView === 'RELATIONSHIP' && !selectedCustomer && (
                            <div className="relative flex-1 md:flex-none">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-700 dark:text-slate-400 w-4 h-4 z-10" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar cliente..."
                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 dark:border-zinc-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:border-zinc-900 dark:focus:border-white bg-white dark:bg-zinc-800 transition-all shadow-sm md:w-80"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}

                        {crmView === 'JOURNEY' && (
                            <button
                                onClick={() => { setIsAddLeadModalOpen(true); setDuplicateLead(null); }}
                                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                            >
                                <UserPlus size={16} /> <span className="hidden sm:inline">Novo Lead</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 w-full md:w-fit overflow-x-auto no-scrollbar shadow-sm">
                    {[
                        { id: 'RELATIONSHIP', label: 'Relacionamento', icon: HeartHandshake },
                        { id: 'JOURNEY', label: 'Funil de Vendas', icon: Map },
                        { id: 'REPORTS', label: 'Relatórios', icon: BarChart }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setCrmView(tab.id as any);
                                setSelectedCustomer(null);
                            }}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${crmView === tab.id
                                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <tab.icon className="md:w-[14px] md:h-[14px] w-5 h-5" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">

                {/* === RELACIONAMENTO VIEW === */}
                {crmView === 'RELATIONSHIP' && (
                    <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden px-1 md:px-0">
                        {/* List (Left) */}
                        <div className={`${selectedCustomer ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden`}>
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex flex-col gap-2">
                                <h3 className="font-black text-slate-800 dark:text-white uppercase text-[10px] tracking-widest">Carteira de Clientes</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-zinc-800 overflow-y-auto flex-1 scrollbar-hide">
                                {filteredCustomers.map(customer => (
                                    <div
                                        key={customer.id}
                                        onClick={() => setSelectedCustomer(customer)}
                                        className={`p-4 hover:bg-indigo-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors active:bg-indigo-100 dark:active:bg-zinc-700 ${selectedCustomer?.id === customer.id ? 'bg-indigo-50 dark:bg-indigo-800 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-slate-950 dark:text-white truncate uppercase text-sm">{customer.name}</p>
                                                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-0.5 truncate uppercase">Fiel a: {getProviderName(customer.assignedProviderId)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {customer.isBlocked && <span className="bg-rose-500 text-white text-[7px] font-black px-1 py-0.5 rounded-sm uppercase tracking-tighter">BLOQUEADA</span>}
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase whitespace-nowrap border ${customer.status === 'VIP' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                                    customer.status === 'Risco de Churn' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-400 border-rose-200 dark:border-rose-800' :
                                                        'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-zinc-700'
                                                    }`}>
                                                    {customer.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detail (Right) */}
                        <div className={`${selectedCustomer ? 'flex' : 'hidden lg:flex'} w-full lg:w-2/3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden`}>
                            {selectedCustomer ? (
                                <>
                                    <div className="p-4 md:p-6 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <button
                                                onClick={() => setSelectedCustomer(null)}
                                                className="lg:hidden p-2 -ml-2 text-slate-800 dark:text-slate-200 hover:text-slate-600 dark:hover:text-white active:bg-slate-100 dark:active:bg-zinc-800 rounded-full transition-all"
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg md:text-2xl font-black text-slate-950 dark:text-white truncate leading-tight uppercase tracking-tight">{selectedCustomer.name}</h3>
                                                    {selectedCustomer.isBlocked && (
                                                        <span className="text-[8px] bg-rose-600 text-white px-2 py-0.5 rounded font-black border border-rose-400 uppercase flex items-center gap-1 shadow-sm">
                                                            <Ban size={10} /> CLIENTE BLOQUEADA
                                                        </span>
                                                    )}
                                                    {selectedCustomer.restrictedProviderIds && selectedCustomer.restrictedProviderIds.length > 0 && (
                                                        <span className="text-[8px] bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded font-black border border-rose-200 dark:border-rose-800 uppercase flex items-center gap-1">
                                                            <ShieldAlert size={10} /> BLOQUEIOS DE PROFISSIONAL
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded text-[9px] font-black border border-indigo-200 dark:border-indigo-800 uppercase">
                                                        Profissional: {getProviderName(selectedCustomer.assignedProviderId)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowSwitchModal(true);
                                                if (selectedCustomer.assignedProviderId) setProviderToRestrictId(selectedCustomer.assignedProviderId);
                                            }}
                                            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black dark:hover:bg-slate-200 transition-all shadow-md active:scale-95"
                                        >
                                            <ShieldAlert size={16} />
                                            Trocar / Restringir
                                        </button>
                                    </div>

                                    <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 overflow-x-auto no-scrollbar scroll-smooth">
                                        {[
                                            { id: 'TIMELINE', label: 'Histórico', icon: Clock },
                                            { id: 'PREFERENCES', label: 'Preferências', icon: Heart },
                                            { id: 'COMPLAINTS', label: 'Queixas', icon: AlertTriangle }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex-1 min-w-[60px] md:min-w-[120px] py-4 md:py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-950 dark:text-white bg-white dark:bg-zinc-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                <tab.icon className="md:w-[14px] md:h-[14px] w-5 h-5" />
                                                <span className="hidden sm:inline">{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30 dark:bg-zinc-900/50 scrollbar-hide">
                                        {activeTab === 'TIMELINE' && (
                                            <div className="space-y-4">
                                                {customerTimeline.length > 0 ? (
                                                    customerTimeline.map((item, idx) => (
                                                        <div key={item.id} className="relative pl-8">
                                                            {idx !== customerTimeline.length - 1 && (
                                                                <div className="absolute left-[13px] top-8 bottom-[-16px] w-[2px] bg-slate-200 dark:bg-zinc-800" />
                                                            )}
                                                            <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm ${item.type === 'VISIT' ? 'bg-indigo-600 text-white' :
                                                                item.type === 'RESTRICTION' || item.type === 'CANCELLATION' ? 'bg-rose-600 text-white' :
                                                                    'bg-amber-50 text-white'
                                                                }`}>
                                                                {item.type === 'VISIT' ? <Clock size={12} /> : item.type === 'RESTRICTION' ? <Ban size={12} /> : item.type === 'CANCELLATION' ? <XCircle size={12} /> : <Check size={12} />}
                                                            </div>
                                                            <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${item.type === 'RESTRICTION' || item.type === 'CANCELLATION' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'
                                                                        }`}>
                                                                        {item.description}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                                                                </div>

                                                                {item.rating && item.rating > 0 && (
                                                                    <div className="flex gap-0.5 mb-2 bg-slate-50 dark:bg-zinc-900/50 w-fit px-1.5 py-0.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <Star key={i} size={10} className={i < item.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-zinc-700"} />
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {item.details && <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-2">{item.details}</p>}

                                                                {item.productsUsed && item.productsUsed.length > 0 && (
                                                                    <div className="mt-2 pt-2 border-t border-slate-50 dark:border-zinc-800/50">
                                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Materiais Utilizados</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {item.productsUsed.map(p => (
                                                                                <span key={p} className="text-[8px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50 font-black uppercase">
                                                                                    {p}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-20 opacity-20">
                                                        <History size={48} className="mx-auto mb-2" />
                                                        <p className="text-xs font-black uppercase tracking-widest">Sem registros no histórico</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'PREFERENCES' && (
                                            <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                                {selectedCustomer.isBlocked && (
                                                    <div className="bg-rose-50 dark:bg-rose-950/40 p-5 rounded-[1.5rem] border-2 border-rose-200 dark:border-rose-800 shadow-sm animate-pulse-subtle">
                                                        <h4 className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Ban size={16} /> MOTIVO DO BLOQUEIO GERAL</h4>
                                                        <p className="text-sm font-black text-rose-900 dark:text-rose-200 leading-relaxed bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800/50">
                                                            {selectedCustomer.blockReason || 'Motivo não informado pelo administrador.'}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-3 uppercase">Esta cliente não pode realizar agendamentos ou atendimentos.</p>
                                                    </div>
                                                )}
                                                <div className="bg-white dark:bg-zinc-800 p-5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-700 shadow-sm">
                                                    <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Restrições & Saúde</h4>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                                        {selectedCustomer.preferences?.restrictions || 'Nenhuma restrição cadastrada.'}
                                                    </p>
                                                </div>
                                                <div className="bg-white dark:bg-zinc-800 p-5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-700 shadow-sm">
                                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Heart size={14} /> Serviços Favoritos</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedCustomer.preferences?.favoriteServices.length ? selectedCustomer.preferences.favoriteServices.map(s => <span key={s} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-indigo-100 dark:border-indigo-800">{s}</span>) : <span className="text-xs text-slate-400 italic">Nenhum serviço favorito.</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-700 shadow-sm">
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar size={14} /> Notas de Agenda</h4>
                                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        {selectedCustomer.preferences?.notes || 'Sem observações de agenda.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'COMPLAINTS' && (
                                            <div className="text-center py-20 opacity-20">
                                                <MessageSquare size={48} className="mx-auto mb-2" />
                                                <p className="text-xs font-black uppercase tracking-widest">Nenhuma queixa ou reclamação</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8">
                                    <div className="p-10 bg-slate-50 dark:bg-zinc-800 rounded-full border-2 border-dashed border-slate-200 dark:border-zinc-700 mb-6">
                                        <Users size={64} className="opacity-10" />
                                    </div>
                                    <p className="text-lg font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Selecione uma cliente</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold text-center">Para gerenciar histórico e preferências</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* === JOURNEY VIEW (KANBAN) === */}
                {crmView === 'JOURNEY' && (
                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-1 scroll-smooth">
                        <div className="flex h-full gap-4 min-w-max pb-4">
                            {kanbanColumns.map(col => {
                                const colLeads = filteredLeads.filter(l => l.status === col.id);
                                return (
                                    <div key={col.id} className="w-72 md:w-80 flex flex-col h-full bg-slate-100 dark:bg-zinc-900/50 rounded-[1.75rem] border border-slate-200 dark:border-zinc-800">
                                        <div className={`p-4 border-b border-slate-200 dark:border-zinc-700 rounded-t-[1.75rem] flex justify-between items-center ${col.id === 'PERDIDO' ? 'bg-slate-500' : col.color} bg-opacity-10 dark:bg-opacity-20`}>
                                            <h4 className={`font-black text-[11px] uppercase tracking-widest ${col.id === 'PERDIDO' ? 'text-slate-700 dark:text-slate-400' : col.color.replace('bg-', 'text-')}-700 dark:${col.id === 'PERDIDO' ? 'text-slate-400' : col.color.replace('bg-', 'text-')}-400`}>
                                                {col.label}
                                            </h4>
                                            <span className="bg-white dark:bg-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-sm border border-slate-100 dark:border-zinc-700">{colLeads.length}</span>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                                            {colLeads.map(lead => (
                                                <div
                                                    key={lead.id}
                                                    onClick={() => setEditingLead(lead)}
                                                    className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700 hover:shadow-md transition-all group relative active:scale-[0.98] cursor-pointer"
                                                >
                                                    <div className="flex justify-between items-start mb-2.5">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-black text-slate-900 dark:text-white text-xs md:text-sm truncate uppercase tracking-tight">{lead.name}</p>
                                                                {lead.temperature === 'quente' && <Zap size={12} className="text-rose-500 fill-rose-500" />}
                                                                {lead.temperature === 'frio' && <Package size={12} className="text-sky-500 fill-sky-500" />}
                                                                {lead.temperature === 'morno' && <Clock size={12} className="text-amber-500 fill-amber-500" />}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">{lead.phone}</p>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.phone, lead.name); }}
                                                                    className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                                    title="WhatsApp"
                                                                >
                                                                    <MessageCircle size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] bg-slate-50 dark:bg-zinc-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700 font-black uppercase tracking-tighter whitespace-nowrap ml-2">{lead.source}</span>
                                                    </div>

                                                    {lead.serviceInterest && (
                                                        <div className="mb-3">
                                                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 uppercase">
                                                                {lead.serviceInterest}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase mt-1">
                                                        <span>Aberto: {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                                                        <div className="flex gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {col.id !== 'NOVO' && (
                                                                <button onClick={() => moveLead(lead.id, 'prev')} className="p-1.5 bg-slate-100 dark:bg-zinc-700 rounded-lg hover:bg-slate-200" title="Voltar"><ChevronLeft size={14} /></button>
                                                            )}
                                                            {col.id !== 'CONVERTIDO' && col.id !== 'PERDIDO' && (
                                                                <button onClick={() => moveLead(lead.id, 'next')} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm" title="Avançar"><ArrowRight size={14} /></button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                            }
                                            {
                                                colLeads.length === 0 && (
                                                    <div className="py-10 text-center opacity-20 flex flex-col items-center">
                                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-400 mb-2"></div>
                                                        <p className="text-[10px] font-black uppercase">Vazio</p>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* === REPORTS VIEW === */}
                {crmView === 'REPORTS' && (
                    <div className="flex-1 p-3 md:p-6 overflow-y-auto scrollbar-hide bg-slate-50/50 dark:bg-zinc-900/50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                            <div className="bg-white dark:bg-zinc-800 p-4 md:p-5 rounded-3xl border border-slate-200 dark:border-zinc-700 shadow-sm relative overflow-hidden">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Totais</p>
                                <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1">{reports.totalLeads}</p>
                                <MousePointer2 className="absolute -right-2 -bottom-2 text-slate-100 dark:text-zinc-700/30 w-12 h-12" />
                            </div>
                            <div className="bg-white dark:bg-zinc-800 p-4 md:p-5 rounded-3xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <p className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Conversão Geral</p>
                                <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{reports.convRate.toFixed(1)}%</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-800 p-4 md:p-5 rounded-3xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">Ativos Funil</p>
                                <p className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{reports.activeCount}</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-800 p-4 md:p-5 rounded-3xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <p className="text-[9px] md:text-[10px] font-black text-rose-600 uppercase tracking-widest">Perdidos</p>
                                <p className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{reports.lostCount}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-zinc-800 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Zap className="text-emerald-500" /> Evolução de Novos Leads</h3>
                                <div className="h-48 md:h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={reports.leadsOverTime}>
                                            <defs>
                                                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                            <Area type="monotone" dataKey="leads" stroke="#6366f1" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-800 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                    <FilterIcon size={14} /> Funil de Conversão
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <FunnelChart>
                                            <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }} />
                                            <Funnel
                                                data={reports.funnelData}
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                <LabelList position="right" fill="#94a3b8" stroke="none" dataKey="name" fontSize={9} fontWeight="bold" />
                                                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={12} fontWeight="900" />
                                            </Funnel>
                                        </FunnelChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8">
                            <div className="bg-white dark:bg-zinc-800 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><PieIcon className="text-indigo-500" /> Origem de Clientes</h3>
                                <div className="h-64 flex flex-col md:flex-row items-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={reports.sourcesData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {reports.sourcesData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="w-full md:w-1/2 space-y-2 mt-6 md:mt-0 px-4 flex flex-col justify-center">
                                        {reports.sourcesData.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight py-1 border-b border-slate-50 dark:border-zinc-800 last:border-none">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div>
                                                    {s.name}
                                                </span>
                                                <span className="text-slate-400 font-bold">{((s.value / reports.totalLeads) * 100).toFixed(0)}% ({s.value})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-800 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Target className="text-rose-500" /> Motivos de Perda</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={reports.lostReasons} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="value" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={24}>
                                                {reports.lostReasons.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden mb-6">
                            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500" /> Eficiência de Conversão por Canal</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-zinc-800">
                                {reports.channelConversion.map((c, i) => (
                                    <div key={i} className="p-5 md:p-6 flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-500">{c.name}</span>
                                            <span className={`text-xs md:text-sm font-black ${c.taxa > 30 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{c.taxa.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${c.taxa > 30 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${c.taxa}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL: Add New Lead */}
            {isAddLeadModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md shadow-2xl border-t-2 md:border-2 border-slate-900 dark:border-zinc-700 animate-in slide-in-from-bottom md:zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm md:text-base flex items-center gap-2">
                                <UserPlus size={20} className="text-emerald-600" /> Cadastrar Novo Lead
                            </h3>
                            <button onClick={() => { setIsAddLeadModalOpen(false); setIsCustomChannel(false); }} className="text-slate-400 hover:text-slate-900 p-1"><X size={24} /></button>
                        </div>

                        {existingCustomerOverlap && (
                            <div className="mb-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 animate-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" size={20} />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-amber-900 dark:text-amber-200 uppercase">Cliente já Cadastrada!</p>
                                        <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase mt-1">{existingCustomerOverlap.name}</p>
                                        <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-2 leading-relaxed font-bold">Esse número já pertence a uma cliente da base Aminna.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {duplicateLead && (
                            <div className="mb-5 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 animate-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="text-indigo-600 dark:text-indigo-400 shrink-0" size={20} />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-indigo-900 dark:text-indigo-200 uppercase">Contato já existente!</p>
                                        <p className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase mt-1">Etapa Atual: <span className="text-indigo-900 dark:text-white">{duplicateLead.status}</span></p>
                                        <p className="text-[9px] text-indigo-600 dark:text-indigo-400 mt-2 leading-relaxed font-bold">Este WhatsApp já está no funil. Deseja apenas movimentar?</p>

                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            {kanbanColumns.filter(c => c.id !== duplicateLead.status && c.id !== 'CONVERTIDO' && c.id !== 'PERDIDO').map(col => (
                                                <button
                                                    key={col.id}
                                                    onClick={() => handleMoveDuplicate(col.id)}
                                                    className="px-2 py-2 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-700 rounded-lg text-[8px] font-black uppercase text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1 shadow-sm"
                                                >
                                                    <RefreshCw size={10} /> Mover p/ {col.label.split(' ')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleAddLead} className="space-y-4 mb-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp <span className="text-rose-500">*</span></label>
                                <input
                                    type="tel" required autoFocus
                                    className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl p-3.5 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-emerald-500 shadow-inner"
                                    placeholder="(11) 9...."
                                    value={newLeadForm.phone}
                                    onChange={e => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Prospect</label>
                                <input
                                    type="text" required
                                    disabled={!!duplicateLead}
                                    className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl p-3.5 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-emerald-500 disabled:opacity-50 shadow-inner"
                                    placeholder="Ex: Maria Carolina"
                                    value={newLeadForm.name}
                                    onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1.5 ml-1">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Canal</label>
                                        <button
                                            type="button"
                                            onClick={() => { setIsCustomChannel(!isCustomChannel); if (!isCustomChannel) setNewLeadForm({ ...newLeadForm, source: '' }); }}
                                            className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase hover:underline"
                                        >
                                            {isCustomChannel ? 'Lista' : 'Novo?'}
                                        </button>
                                    </div>
                                    {isCustomChannel ? (
                                        <input
                                            type="text"
                                            required
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl p-3 text-xs font-black text-slate-950 dark:text-white outline-none focus:border-indigo-500"
                                            placeholder="Nome do Canal"
                                            value={newLeadForm.source}
                                            onChange={e => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                                        />
                                    ) : (
                                        <select
                                            disabled={!!duplicateLead}
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl p-3 text-xs font-black text-slate-950 dark:text-white outline-none focus:border-emerald-500 disabled:opacity-50 appearance-none shadow-sm"
                                            value={newLeadForm.source}
                                            onChange={e => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                                        >
                                            {channels.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Interesse</label>
                                    <input
                                        type="text"
                                        disabled={!!duplicateLead}
                                        className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl p-3 text-xs font-black text-slate-950 dark:text-white outline-none focus:border-emerald-500 disabled:opacity-50 shadow-sm"
                                        placeholder="Ex: Alongamento"
                                        value={newLeadForm.serviceInterest}
                                        onChange={e => setNewLeadForm({ ...newLeadForm, serviceInterest: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => { setIsAddLeadModalOpen(false); setIsCustomChannel(false); }} className="flex-1 py-4 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
                                {!duplicateLead && (
                                    <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-emerald-700">Salvar Lead</button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Lost Reason */}
            {lostReasonModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl p-6 w-full max-w-sm shadow-xl border-t-2 md:border-2 border-rose-200 dark:border-rose-900 animate-in slide-in-from-bottom md:zoom-in duration-200">
                        <h3 className="font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle size={18} /> Motivo da Perda</h3>
                        <textarea
                            className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-500 mb-6 resize-none shadow-inner h-32"
                            placeholder="Ex: Preço alto, desistiu, fechou com concorrente..."
                            value={lostReasonText}
                            onChange={e => setLostReasonText(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setLostReasonModal({ isOpen: false, leadId: null })} className="flex-1 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={handleConfirmLost} disabled={!lostReasonText} className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase shadow-md disabled:opacity-50 transition-all hover:bg-rose-700">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Convert Lead Confirmation */}
            {convertModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl p-6 w-full max-w-md shadow-xl border-t-2 md:border-2 border-emerald-200 dark:border-emerald-900 animate-in slide-in-from-bottom md:zoom-in duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl"><CheckCircle2 size={32} /></div>
                            <div>
                                <h3 className="font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest text-sm md:text-base">Converter Lead</h3>
                                <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Este prospect será promovido à cliente.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl mb-6 border border-slate-200 dark:border-zinc-700 shadow-inner">
                            <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white leading-tight">Nome: {convertModal.lead?.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Tel: {convertModal.lead?.phone}</p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setConvertModal({ isOpen: false, lead: null })} className="flex-1 py-4 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Voltar</button>
                            <button onClick={confirmConversion} className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">Confirmar Cadastro</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Switch/Restrict Modal */}
            {showSwitchModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[110] p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom md:zoom-in duration-300 border-t-2 md:border-2 border-black dark:border-zinc-700 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-slate-950 dark:bg-black text-white rounded-t-2xl md:rounded-t-3xl flex justify-between items-center flex-shrink-0">
                            <h3 className="text-sm md:text-base font-black uppercase tracking-tight flex items-center gap-2"><ShieldAlert size={18} className="text-rose-400" /> Gestão de Vínculo</h3>
                            <button onClick={() => setShowSwitchModal(false)} className="text-white/70 hover:text-white p-1"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleManagementAction} className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold uppercase">Cliente: <span className="text-indigo-800 dark:text-indigo-400 font-black">{selectedCustomer.name}</span></p>

                            <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border-2 border-rose-100 dark:border-rose-900 shadow-sm">
                                <label className="block text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Ban size={12} /> Profissional a Restringir</label>
                                <select className="w-full border-2 border-rose-200 dark:border-rose-800 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white outline-none font-black appearance-none" value={providerToRestrictId} onChange={e => setProviderToRestrictId(e.target.value)}>
                                    <option value="">Ninguém (Apenas trocar responsável)</option>
                                    {providers.filter(p => !selectedCustomer.restrictedProviderIds?.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>)}
                                </select>
                                <p className="text-[9px] text-rose-700 dark:text-rose-300 mt-2 font-bold leading-tight uppercase">* Esta profissional será bloqueada na agenda para esta cliente.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 cursor-pointer select-none" onClick={() => setShouldAssignNew(!shouldAssignNew)}>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${shouldAssignNew ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                        {shouldAssignNew && <Check size={14} strokeWidth={4} />}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest">Definir Novo Responsável?</span>
                                </div>
                                {shouldAssignNew && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <select required={shouldAssignNew} className="w-full border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white outline-none font-black appearance-none shadow-sm" value={newProviderId} onChange={e => setNewProviderId(e.target.value)}>
                                            <option value="" className="text-slate-400">Selecione nova responsável...</option>
                                            {providers.filter(p => p.id !== selectedCustomer.assignedProviderId).filter(p => p.id !== providerToRestrictId).filter(p => !selectedCustomer.restrictedProviderIds?.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1">Motivo da Ação <span className="text-rose-600">*</span></label>
                                <textarea required className="w-full border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-bold bg-white dark:bg-zinc-800 text-slate-900 dark:text-white outline-none resize-none h-28 focus:border-indigo-500 shadow-inner" placeholder="Justifique para o histórico..." value={switchReason} onChange={e => setSwitchReason(e.target.value)}></textarea>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-black dark:hover:bg-slate-200 shadow-lg transition-all active:scale-95">Confirmar Alterações</button>
                                <button type="button" onClick={() => setShowSwitchModal(false)} className="w-full py-3 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Voltar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL: Edit Lead Details */}
            {editingLead && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2 border-slate-900 dark:border-zinc-700 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm flex items-center gap-2">
                                <Edit3 size={18} className="text-indigo-600" /> Detalhes do Lead
                            </h3>
                            <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-900 p-1"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Etapa do Funil</label>
                                <select
                                    className="w-full border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-black bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500 appearance-none shadow-sm"
                                    value={editingLead.status}
                                    onChange={(e) => setEditingLead(prev => prev ? ({ ...prev, status: e.target.value as any }) : null)}
                                >
                                    {kanbanColumns.filter(col => col.id !== 'PERDIDO').map(col => (
                                        <option key={col.id} value={col.id}>{col.label}</option>
                                    ))}
                                    <option value="PERDIDO">Perdido / Desistiu</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Temperatura do Lead</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['quente', 'morno', 'frio'].map((temp) => (
                                        <button
                                            key={temp}
                                            onClick={() => setEditingLead(prev => prev ? ({ ...prev, temperature: temp as any }) : null)}
                                            className={`py-2 px-3 rounded-xl border-2 text-[10px] font-black uppercase flex flex-col items-center gap-1 transition-all ${editingLead.temperature === temp
                                                ? (temp === 'quente' ? 'bg-rose-50 border-rose-500 text-rose-600' : temp === 'frio' ? 'bg-sky-50 border-sky-500 text-sky-600' : 'bg-amber-50 border-amber-500 text-amber-600')
                                                : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400'
                                                }`}
                                        >
                                            {temp === 'quente' && <Zap size={16} className={editingLead.temperature === temp ? 'fill-rose-600' : ''} />}
                                            {temp === 'frio' && <Package size={16} className={editingLead.temperature === temp ? 'fill-sky-600' : ''} />}
                                            {temp === 'morno' && <Clock size={16} className={editingLead.temperature === temp ? 'fill-amber-600' : ''} />}
                                            {temp}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Observações / Notas</label>
                                <textarea
                                    className="w-full h-24 border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                                    placeholder="Escreva detalhes sobre esse lead..."
                                    value={editingLead.notes || ''}
                                    onChange={e => setEditingLead(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                                />
                            </div>

                            <button
                                onClick={handleSaveLeadDetails}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
