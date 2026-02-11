
import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';

import { Search, Plus, User, DollarSign, X, Edit2, Smartphone, CreditCard, ToggleLeft, ToggleRight, CheckCircle2, XCircle, Briefcase, Phone, TrendingUp, Award, Star, Filter, Calendar, AlertTriangle, ArrowRight, Sparkles, ChevronDown, History, ArrowUp, ArrowDown, Layers, Clock } from 'lucide-react';

import { PROVIDERS } from '../constants';
import { Provider, Appointment, Customer, Service, CommissionHistoryItem } from '../types';
import { Avatar } from './Avatar';

interface ProfessionalsProps {
    providers: Provider[];
    setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    customers: Customer[];
    services: Service[];
}

export const Professionals: React.FC<ProfessionalsProps> = ({ providers, setProviders, appointments, setAppointments, customers, services }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [serviceAddSearch, setServiceAddSearch] = useState(''); // New state for service search
    const [filterCategory, setFilterCategory] = useState('');

    // States for Edit/Add Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

    // State for Commission Change Justification
    const [commissionChangeReason, setCommissionChangeReason] = useState('');

    // States for Inactivation Conflict
    const [inactivationData, setInactivationData] = useState<{
        providerId: string;
        appointments: Appointment[];
    } | null>(null);

    // Alterado: Mapa de substituições individuais (ID Agendamento -> ID Novo Profissional)
    const [replacementMap, setReplacementMap] = useState<Record<string, string>>({});

    // Form State
    const [formData, setFormData] = useState<Partial<Provider> & {
        fiscalCnpj?: string;
        fiscalMunicipalRegistration?: string;
        fiscalSocialName?: string;
        fiscalFantasyName?: string;
        fiscalVerified?: boolean;
        customDurations?: Record<string, number>;
    }>({
        name: '',
        phone: '',
        specialty: '', // Legacy/Main label
        specialties: [], // New multi-select list
        commissionRate: 0.4, // 40% profissional, 60% salão
        pixKey: '',
        birthDate: '',
        active: true,
        workDays: [1, 2, 3, 4, 5, 6], // Default Mon-Sat
        customDurations: {},
        // Fiscal data
        fiscalCnpj: '',
        fiscalMunicipalRegistration: '',
        fiscalSocialName: '',
        fiscalFantasyName: '',
        fiscalVerified: false
    });

    // ... (rest of code)

    // Extract unique required specialties from services - STRICTLY derived from services names
    const availableServices = useMemo(() => {
        return services.map(s => s.name).sort();
    }, [services]);

    const uniqueCategories = useMemo(() => {
        return Array.from(new Set(services.map(s => s.category).filter(Boolean))) as string[];
    }, [services]);

    // Helper for weekdays
    const weekDays = [
        { id: 0, label: 'D', full: 'Domingo' },
        { id: 1, label: 'S', full: 'Segunda' },
        { id: 2, label: 'T', full: 'Terça' },
        { id: 3, label: 'Q', full: 'Quarta' },
        { id: 4, label: 'Q', full: 'Quinta' },
        { id: 5, label: 'S', full: 'Sexta' },
        { id: 6, label: 'S', full: 'Sábado' }
    ];

    const toggleWorkDay = (dayId: number) => {
        const currentDays = formData.workDays || [];
        if (currentDays.includes(dayId)) {
            setFormData({ ...formData, workDays: currentDays.filter(d => d !== dayId) });
        } else {
            setFormData({ ...formData, workDays: [...currentDays, dayId].sort() });
        }
    };

    const addSpecialty = (spec: string) => {
        if (!spec) return;

        const currentSpecs = formData.specialties || [];
        if (!currentSpecs.includes(spec)) {
            const added = [...currentSpecs, spec];
            // Only set specialty (Title) if it's currently empty
            const newTitle = formData.specialty ? formData.specialty : spec;
            setFormData({ ...formData, specialties: added, specialty: newTitle });
        }
        setServiceAddSearch(''); // Reset search after adding
    };

    const removeSpecialty = (spec: string) => {
        const currentSpecs = formData.specialties || [];
        const filtered = currentSpecs.filter(s => s !== spec);

        // Also remove custom duration if it exists
        const newDurations = { ...(formData.customDurations || {}) };
        delete newDurations[spec];

        // Do NOT change the Title (specialty) when removing a service
        setFormData({ ...formData, specialties: filtered, customDurations: newDurations });
    };

    const handleAddGroup = (category: string) => {
        if (!category) return;
        const servicesInGroup = services
            .filter(s => s.category === category)
            .map(s => s.name);

        const currentSpecs = formData.specialties || [];
        // Add only ones not already present
        const newSpecs = [...new Set([...currentSpecs, ...servicesInGroup])];

        setFormData({ ...formData, specialties: newSpecs });
    };

    // Performance Calculations
    const stats = useMemo(() => {
        const activeCount = providers.filter(p => p.active).length;

        // Calculate performance per pro
        const performanceMap: Record<string, { count: number; rating: number; ratingCount: number }> = {};

        appointments.forEach(appt => {
            if (appt.status === 'Concluído') {
                if (!performanceMap[appt.providerId]) {
                    performanceMap[appt.providerId] = { count: 0, rating: 0, ratingCount: 0 };
                }
                performanceMap[appt.providerId].count++;
            }
        });

        const topProId = Object.entries(performanceMap).sort((a, b) => b[1].count - a[1].count)[0]?.[0];
        const topPro = providers.find(p => p.id === topProId)?.name || 'N/A';
        const totalCompleted = appointments.filter(a => a.status === 'Concluído').length;

        return {
            total: providers.length,
            active: activeCount,
            inactive: providers.length - activeCount,
            topPro,
            totalCompleted
        };
    }, [providers, appointments]);

    const filteredProviders = providers
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.specialty.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && p.active) ||
                (statusFilter === 'inactive' && !p.active);
            return matchesSearch && matchesStatus;
        });

    // Helper to ensure all providers have an order
    const normalizeOrders = async (currentList: Provider[]) => {
        const updates = currentList.map((p, index) => ({
            ...p,
            order: index
        }));

        setProviders(prev => {
            const map = new Map(updates.map(u => [u.id, u]));
            return prev.map(p => map.get(p.id) || p);
        });

        const dbUpdates = updates.map(p => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            specialty: p.specialty,
            specialties: p.specialties,
            commission_rate: p.commissionRate,
            commission_history: p.commissionHistory,
            pix_key: p.pixKey,
            birth_date: p.birthDate,
            active: p.active,
            work_days: p.workDays,
            avatar: p.avatar,
            order: p.order
        }));
        const { error } = await supabase.from('providers').upsert(dbUpdates);
        if (error) console.error('Error normalizing orders:', error);
        return updates;
    };

    const handleMoveUp = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (index === 0) return;

        const needsNormalization = filteredProviders.some(p => p.order === undefined || p.order === null);
        let workingList = [...filteredProviders];

        if (needsNormalization) {
            workingList = workingList.map((p, idx) => ({ ...p, order: idx }));
        }

        const currentParams = workingList[index];
        const prevParams = workingList[index - 1];

        const currentOrder = currentParams.order!;
        const prevOrder = prevParams.order!;

        const updatedCurrent = { ...currentParams, order: prevOrder };
        const updatedPrev = { ...prevParams, order: currentOrder };

        setProviders(prev => prev.map(p => {
            if (p.id === currentParams.id) return updatedCurrent;
            if (p.id === prevParams.id) return updatedPrev;
            if (needsNormalization) {
                const found = workingList.find(w => w.id === p.id);
                if (found) return found.id === currentParams.id ? updatedCurrent : found.id === prevParams.id ? updatedPrev : found;
            }
            return p;
        }));

        if (needsNormalization) {
            const finalList = workingList.map(p => {
                if (p.id === currentParams.id) return updatedCurrent;
                if (p.id === prevParams.id) return updatedPrev;
                return p;
            });

            const dbUpdates = finalList.map(p => ({
                id: p.id,
                name: p.name,
                phone: p.phone,
                specialty: p.specialty,
                specialties: p.specialties,
                commission_rate: p.commissionRate,
                commission_history: p.commissionHistory,
                pix_key: p.pixKey,
                birth_date: p.birthDate,
                active: p.active,
                work_days: p.workDays,
                avatar: p.avatar,
                order: p.order
            }));
            await supabase.from('providers').upsert(dbUpdates);
        } else {
            await supabase.from('providers').update({ order: prevOrder }).eq('id', currentParams.id);
            await supabase.from('providers').update({ order: currentOrder }).eq('id', prevParams.id);
        }
    };

    const handleMoveDown = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (index === filteredProviders.length - 1) return;

        const needsNormalization = filteredProviders.some(p => p.order === undefined || p.order === null);
        let workingList = [...filteredProviders];

        if (needsNormalization) {
            workingList = workingList.map((p, idx) => ({ ...p, order: idx }));
        }

        const currentParams = workingList[index];
        const nextParams = workingList[index + 1];

        const currentOrder = currentParams.order!;
        const nextOrder = nextParams.order!;

        const updatedCurrent = { ...currentParams, order: nextOrder };
        const updatedNext = { ...nextParams, order: currentOrder };

        setProviders(prev => prev.map(p => {
            if (p.id === currentParams.id) return updatedCurrent;
            if (p.id === nextParams.id) return updatedNext;
            if (needsNormalization) {
                const found = workingList.find(w => w.id === p.id);
                if (found) return found.id === currentParams.id ? updatedCurrent : found.id === nextParams.id ? updatedNext : found;
            }
            return p;
        }));

        if (needsNormalization) {
            const finalList = workingList.map(p => {
                if (p.id === currentParams.id) return updatedCurrent;
                if (p.id === nextParams.id) return updatedNext;
                return p;
            });
            const dbUpdates = finalList.map(p => ({
                id: p.id,
                name: p.name,
                phone: p.phone,
                specialty: p.specialty,
                specialties: p.specialties,
                commission_rate: p.commissionRate,
                commission_history: p.commissionHistory,
                pix_key: p.pixKey,
                birth_date: p.birthDate,
                active: p.active,
                work_days: p.workDays,
                avatar: p.avatar,
                order: p.order,
                custom_durations: p.customDurations || {}
            }));
            await supabase.from('providers').upsert(dbUpdates);
        } else {
            await supabase.from('providers').update({ order: nextOrder }).eq('id', currentParams.id);
            await supabase.from('providers').update({ order: currentOrder }).eq('id', nextParams.id);
        }
    };

    const handleAddNew = () => {
        setEditingProvider(null);
        setCommissionChangeReason(''); // Reset reason
        setServiceAddSearch(''); // Reset search
        setFormData({
            name: '',
            phone: '',
            specialty: '',
            specialties: [],
            commissionRate: 0.4,
            commissionHistory: [],
            pixKey: '',
            birthDate: '',
            active: true,
            avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
            workDays: [1, 2, 3, 4, 5, 6],
            fiscalCnpj: '',
            fiscalMunicipalRegistration: '',
            fiscalSocialName: '',
            fiscalFantasyName: '',
            customDurations: {}
        });
        setIsModalOpen(true);
    };

    const handleToggleActive = () => {
        // If currently Active (true) and we are clicking to turn it OFF
        if (formData.active) {
            const pid = editingProvider?.id;

            // Only check if it's an existing provider (pid exists)
            if (pid) {
                const todayStr = new Date().toISOString().split('T')[0];
                const futureApps = appointments.filter(a =>
                    a.providerId === pid &&
                    a.status !== 'Cancelado' &&
                    a.status !== 'Concluído' &&
                    a.date >= todayStr
                );

                if (futureApps.length > 0) {
                    // Found conflicts: Show Modal immediately and DO NOT toggle yet
                    setInactivationData({
                        providerId: pid,
                        appointments: futureApps
                    });
                    setReplacementMap({}); // Reset map

                    return; // Stop here, wait for user to resolve in modal
                }
            }
        }

        // If no conflicts or we are activating, just toggle
        setFormData({ ...formData, active: !formData.active });
    };

    // Load fiscal data when editing
    const loadFiscalData = async (providerId: string) => {
        try {
            const { data, error } = await supabase
                .from('professional_fiscal_config')
                .select('*')
                .eq('provider_id', providerId)
                .single();

            if (data) {
                setFormData(prev => ({
                    ...prev,
                    fiscalCnpj: data.cnpj,
                    fiscalMunicipalRegistration: data.municipal_registration || '',
                    fiscalSocialName: data.social_name || '',
                    fiscalFantasyName: data.fantasy_name || '',
                    fiscalVerified: !!data.verified
                }));
            }
        } catch (error) {
            console.error('Error loading fiscal data:', error);
        }
    };

    // ...

    const handleEdit = (provider: Provider) => {
        setEditingProvider(provider);
        setCommissionChangeReason(''); // Reset reason
        setFormData({
            ...provider,
            workDays: provider.workDays || [1, 2, 3, 4, 5, 6], // Fallback if legacy data missing
            specialties: provider.specialties || [provider.specialty], // Fallback
            fiscalCnpj: '', // Reset first
            fiscalMunicipalRegistration: '',
            fiscalSocialName: '',
            fiscalFantasyName: '',
            customDurations: provider.customDurations || {}
        });

        // Fetch specific fiscal data
        loadFiscalData(provider.id);

        setIsModalOpen(true);
    };

    // ...

    // Save fiscal data to professional_fiscal_config table
    const saveFiscalData = async (providerId: string) => {
        try {
            // Convert commission rate (0.4) to percentage (40)
            const servicePercentage = (formData.commissionRate || 0.4) * 100;

            const fiscalData = {
                provider_id: providerId,
                cnpj: formData.fiscalCnpj,
                municipal_registration: formData.fiscalMunicipalRegistration || null,
                social_name: formData.fiscalSocialName || null,
                fantasy_name: formData.fiscalFantasyName || null,
                service_percentage: servicePercentage,
                active: true,
                verified: formData.fiscalVerified || false, // User can now verify
            };

            // Check if fiscal config already exists for this provider
            const { data: existing } = await supabase
                .from('professional_fiscal_config')
                .select('id')
                .eq('provider_id', providerId)
                .single();

            if (existing) {
                // Update existing
                const { error } = await supabase
                    .from('professional_fiscal_config')
                    .update(fiscalData)
                    .eq('provider_id', providerId);

                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('professional_fiscal_config')
                    .insert([fiscalData]);

                if (error) throw error;
            }
        } catch (error) {
            console.error('Error saving fiscal data:', error);
            alert('Erro ao salvar dados fiscais. Verifique e tente novamente.');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const providerData = {
            name: formData.name,
            phone: formData.phone,
            specialty: formData.specialty,
            specialties: formData.specialties || [],
            commission_rate: formData.commissionRate,
            pix_key: formData.pixKey,
            birth_date: formData.birthDate || null,
            active: formData.active,
            work_days: formData.workDays || [],
            avatar: formData.avatar,
            custom_durations: formData.customDurations || {},
            order: editingProvider ? undefined : providers.length // Set last order for new items (undefined for updates to ignore)
        };

        try {
            if (editingProvider) {
                // Check for commission change
                let updatedCommissionHistory = editingProvider.commissionHistory || [];

                if (editingProvider.commissionRate !== formData.commissionRate) {
                    if (!commissionChangeReason.trim()) {
                        alert("Por favor, informe o motivo da alteração de comissão (promoção, reajuste, etc).");
                        return;
                    }

                    // Add OLD rate to history
                    const historyItem: CommissionHistoryItem = {
                        date: new Date().toISOString(),
                        rate: editingProvider.commissionRate,
                        note: commissionChangeReason
                    };
                    updatedCommissionHistory = [historyItem, ...updatedCommissionHistory];
                }

                const { error } = await supabase.from('providers').update({
                    ...providerData,
                    commission_history: updatedCommissionHistory
                }).eq('id', editingProvider.id);
                if (error) throw error;

                const updatedProvider = {
                    ...editingProvider,
                    ...formData,
                    commissionHistory: updatedCommissionHistory
                } as Provider;

                setProviders(prev => prev.map(p => p.id === editingProvider.id ? updatedProvider : p));

                // Save fiscal data if provided
                if (formData.fiscalCnpj) {
                    await saveFiscalData(editingProvider.id);
                }
            } else {
                const { data, error } = await supabase.from('providers').insert([providerData]).select();
                if (error) throw error;
                if (data && data[0]) {
                    const newProvider = { ...formData, id: data[0].id, commissionHistory: [], order: providers.length } as Provider;
                    setProviders(prev => [...prev, newProvider]);

                    // Save fiscal data if provided
                    if (formData.fiscalCnpj) {
                        await saveFiscalData(data[0].id);
                    }
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving provider:', error);
            alert('Erro ao salvar profissional.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja desativar este profissional? Os agendamentos históricos serão mantidos.')) {
            try {
                const { error } = await supabase
                    .from('providers')
                    .update({ active: false })
                    .eq('id', id);
                if (error) throw error;

                setProviders(prev => prev.map(p => p.id === id ? { ...p, active: false } : p));
            } catch (error) {
                console.error('Error deactivating provider:', error);
                alert('Erro ao desativar profissional.');
            }
        }
    };

    const confirmInactivation = () => {
        if (!inactivationData) return;

        // Validate if ALL appointments have a replacement selected
        const allSelected = inactivationData.appointments.every(app => replacementMap[app.id]);
        if (!allSelected) return;

        // 1. Transfer Appointments Individually
        setAppointments(prev => prev.map(a => {
            const newProviderId = replacementMap[a.id];
            // If this appointment is in the conflict list AND has a replacement selected
            if (newProviderId && inactivationData.appointments.some(ia => ia.id === a.id)) {
                return { ...a, providerId: newProviderId };
            }
            return a;
        }));

        // 2. Set the form state to Inactive (Visual Feedback)
        setFormData(prev => ({ ...prev, active: false }));

        // 3. Close Conflict Modal & Cleanup
        setInactivationData(null);
        setReplacementMap({});
    };

    // Helper to get available replacement providers (active and NOT the current one being inactivated)
    const availableReplacements = providers.filter(p => p.active && p.id !== inactivationData?.providerId);
    const isAllReplacementsSelected = inactivationData ? inactivationData.appointments.every(app => replacementMap[app.id]) : false;

    // Check if commission changed in form to show extra input
    const isCommissionChanged = editingProvider && formData.commissionRate !== editingProvider.commissionRate;

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-8">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight uppercase">Equipe Profissional</h2>
                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão de talentos e performance</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    <Plus size={18} /> Nova Profissional
                </button>
            </div>

            {/* Indicators / Performance Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl w-fit mb-3"><Briefcase size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Total Equipe</p>
                    <p className="text-xl md:text-2xl font-black text-slate-950 dark:text-white">{stats.total}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl w-fit mb-3"><TrendingUp size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Taxa Atividade</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-800 dark:text-emerald-400">{((stats.active / stats.total) * 100).toFixed(0)}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl w-fit mb-3"><Award size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Destaque Produção</p>
                    <p className="text-sm md:text-base font-black text-slate-950 dark:text-white truncate leading-tight mt-1">{stats.topPro}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl w-fit mb-3"><Star size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Atendimentos Mês</p>
                    <p className="text-xl md:text-2xl font-black text-purple-900 dark:text-purple-400">{stats.totalCompleted}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou especialidade..."
                        className="w-full pl-11 pr-4 py-3 outline-none text-sm font-black text-slate-950 dark:text-white placeholder-slate-500 bg-slate-50/50 dark:bg-zinc-800 rounded-2xl border-2 border-transparent focus:border-zinc-950 dark:focus:border-white transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === f ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Table Layout (Hidden on Mobile) */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-[10px] text-slate-800 dark:text-slate-300 font-black uppercase bg-slate-50/80 dark:bg-zinc-800/80 border-b border-slate-100 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-5">Profissional</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Serviços Habilitados</th>
                                <th className="px-6 py-5 text-center">Celular</th>
                                <th className="px-6 py-5 text-center">Dias Ativos</th>
                                <th className="px-6 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-700">
                            {filteredProviders.map((provider) => {
                                // const proStats = appointments.filter(a => a.providerId === provider.id && a.status === 'Concluído').length;
                                return (
                                    <tr key={provider.id} className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors group ${!provider.active ? 'opacity-60 bg-slate-50/30 dark:bg-zinc-800/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={provider.avatar}
                                                    name={provider.name}
                                                    size="w-10 h-10"
                                                    className={`border-2 ${provider.active ? 'border-indigo-100 dark:border-indigo-900 shadow-sm' : 'border-slate-200 dark:border-zinc-700 grayscale'}`}
                                                />
                                                <span className={`font-black text-base ${!provider.active ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-950 dark:text-white'}`}>{provider.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${provider.active
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-zinc-600'
                                                }`}>
                                                {provider.active ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativa</> : 'Inativa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                {(provider.specialties || [provider.specialty]).slice(0, 3).map((spec, i) => (
                                                    <span key={i} className="bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-slate-300 dark:border-zinc-600">
                                                        {spec}
                                                    </span>
                                                ))}
                                                {(provider.specialties?.length || 0) > 3 && (
                                                    <span className="text-[9px] font-bold text-slate-400">+{provider.specialties.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-slate-800 dark:text-slate-300 text-xs">
                                            {provider.phone || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-0.5">
                                                {weekDays.map(day => (
                                                    <div
                                                        key={day.id}
                                                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${provider.workDays?.includes(day.id)
                                                            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-300 dark:text-zinc-600'
                                                            }`}
                                                    >
                                                        {day.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-xl overflow-hidden mr-2">
                                                    <button
                                                        onClick={(e) => handleMoveUp(filteredProviders.indexOf(provider), e)}
                                                        disabled={filteredProviders.indexOf(provider) === 0}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 dark:text-slate-400"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleMoveDown(filteredProviders.indexOf(provider), e)}
                                                        disabled={filteredProviders.indexOf(provider) === filteredProviders.length - 1}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 dark:text-slate-400"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleEdit(provider)}
                                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all active:scale-90"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
                {filteredProviders.map((provider) => {
                    const proStats = appointments.filter(a => a.providerId === provider.id && a.status === 'Concluído').length;
                    return (
                        <div
                            key={provider.id}
                            onClick={() => handleEdit(provider)}
                            className={`bg-white dark:bg-zinc-900 p-4 rounded-3xl border shadow-sm transition-all active:scale-[0.98] flex flex-col gap-4 ${provider.active ? 'border-slate-200 dark:border-zinc-800' : 'border-slate-100 dark:border-zinc-800 opacity-70 bg-slate-50/50 dark:bg-zinc-800/50'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        src={provider.avatar}
                                        name={provider.name}
                                        size="w-14 h-14"
                                        className={`rounded-2xl border-2 ${provider.active ? 'border-indigo-100 dark:border-indigo-900 shadow-md' : 'border-slate-200 dark:border-zinc-700 grayscale'}`}
                                    />
                                    <div className="min-w-0">
                                        <h4 className={`font-black text-base truncate ${!provider.active ? 'text-slate-600 dark:text-slate-500 line-through' : 'text-slate-950 dark:text-white'}`}>{provider.name}</h4>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {(provider.specialties || [provider.specialty]).slice(0, 2).map(spec => (
                                                <span key={spec} className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-slate-300 dark:border-zinc-600">{spec}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-300">{provider.phone || 'N/A'}</p>
                                    <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contato</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 dark:border-zinc-800">
                                <div className="bg-slate-50 dark:bg-zinc-800 p-2 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                    <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none">Produção Total</p>
                                    <p className="text-xs font-black text-slate-950 dark:text-white mt-1">{proStats} Atendimentos</p>
                                </div>
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-center">
                                    <div className="flex gap-1 mr-2 bg-white dark:bg-zinc-900 rounded-lg">
                                        <button
                                            onClick={(e) => handleMoveUp(filteredProviders.indexOf(provider), e)}
                                            disabled={filteredProviders.indexOf(provider) === 0}
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-slate-500 dark:text-slate-400"
                                        >
                                            <ArrowUp size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => handleMoveDown(filteredProviders.indexOf(provider), e)}
                                            disabled={filteredProviders.indexOf(provider) === filteredProviders.length - 1}
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-slate-500 dark:text-slate-400"
                                        >
                                            <ArrowDown size={12} />
                                        </button>
                                    </div>
                                    <button className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-300">
                                        <Edit2 size={14} /> Editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredProviders.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-zinc-800">
                        <Briefcase size={48} className="mx-auto text-slate-200 dark:text-zinc-700 mb-2" />
                        <p className="text-sm font-black text-slate-400 dark:text-zinc-600 uppercase">Nenhum talento encontrado</p>
                    </div>
                )}
            </div>

            {/* Edit/Add Modal - Adapted for Mobile as Bottom Sheet */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col border-2 border-black dark:border-zinc-700 max-h-[95vh]">
                        <div className="px-6 py-4 md:py-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-950 dark:bg-black text-white flex-shrink-0">
                            <h3 className="font-black text-base md:text-lg uppercase tracking-tight flex items-center gap-2">
                                <User size={20} className="text-indigo-400" />
                                {editingProvider ? 'Editar Talentos' : 'Admitir Profissional'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900">
                            <div className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${formData.active ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 opacity-60'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${formData.active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                                        {formData.active ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-black uppercase ${formData.active ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-950 dark:text-white'}`}>Status: {formData.active ? 'Ativa' : 'Inativa'}</p>
                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Impacta na visibilidade da agenda</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleActive}
                                    className={`p-1 transition-transform active:scale-90 ${formData.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    {formData.active ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                                </button>
                            </div>

                            <div className="flex justify-center -mt-6 mb-4 relative z-10">
                                <div className="relative group">
                                    <Avatar
                                        src={formData.avatar}
                                        name={formData.name || '?'}
                                        size="w-24 h-24"
                                        className="border-4 border-white dark:border-zinc-900 shadow-2xl"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm" onClick={() => document.getElementById('avatar-url-input')?.focus()}>
                                        <Edit2 size={24} className="text-white drop-shadow-md" />
                                    </div>
                                </div>
                            </div>

                            {/* AVATAR PRESETS */}
                            <div className="mb-6 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Escolha um Avatar</label>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {[
                                        // Females (Micah style is very clean/modern)
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Annie',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Bella',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Caitlyn',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Donna',
                                        // Males
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Felix',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=George',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Jack',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Leo',
                                    ].map((presetUrl, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, avatar: presetUrl })}
                                            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95 ${formData.avatar === presetUrl ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 dark:border-zinc-600 hover:border-indigo-400'}`}
                                        >
                                            <img src={presetUrl} alt="Avatar Preset" className="w-full h-full object-cover bg-white" />
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const randomSeed = Math.random().toString(36).substring(7);
                                            setFormData({ ...formData, avatar: `https://api.dicebear.com/7.x/micah/svg?seed=${randomSeed}` });
                                        }}
                                        className="w-10 h-10 rounded-full border-2 border-dashed border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                                        title="Gerar Novo Avatar"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="Ex: Maria Carolina Silva"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Função Principal / Especialidade</label>
                                    <div className="relative">
                                        <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="text"
                                            list="categories-list"
                                            required
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Ex: Cabeleireira, Manicure, Esteticista..."
                                        />
                                        <datalist id="categories-list">
                                            {uniqueCategories.map(cat => (
                                                <option key={cat} value={cat} />
                                            ))}
                                        </datalist>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1.5 ml-1">
                                            💡 Dica: Use o nome da Categoria do serviço (ex: Cabeleireira) para agrupar melhor na agenda.
                                        </p>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-2 flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" /> Serviços Habilitados</span>
                                        {/* Original Dropdown removed in favor of integrated filter */}
                                    </label>

                                    <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-4">
                                        {/* Search & Select Interface */}
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                {/* Filter Dropdown */}
                                                <div className="relative min-w-[120px]">
                                                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <select
                                                        value={filterCategory}
                                                        onChange={e => setFilterCategory(e.target.value)}
                                                        className="w-full pl-9 pr-8 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 appearance-none cursor-pointer transition-all"
                                                    >
                                                        <option value="">Todas</option>
                                                        {uniqueCategories.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>

                                                {/* Search Input */}
                                                <div className="relative flex-1">
                                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar serviço..."
                                                        className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all placeholder:text-slate-400"
                                                        value={serviceAddSearch}
                                                        onChange={e => setServiceAddSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Bulk Add Button for Filtered Category */}
                                            {filterCategory && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddGroup(filterCategory)}
                                                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Layers size={12} /> Adicionar Todos de {filterCategory}
                                                </button>
                                            )}

                                            {/* Scrollable List of Available Services */}
                                            <div className="max-h-40 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl p-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {availableServices
                                                        .filter(s => !formData.specialties?.includes(s))
                                                        .filter(s => {
                                                            // Filter by Name
                                                            const nameMatch = s.toLowerCase().includes(serviceAddSearch.toLowerCase());
                                                            // Filter by Category
                                                            const serviceObj = services.find(serv => serv.name === s);
                                                            const categoryMatch = filterCategory ? serviceObj?.category === filterCategory : true;

                                                            return nameMatch && categoryMatch;
                                                        })
                                                        .map(spec => (
                                                            <button
                                                                key={spec}
                                                                type="button"
                                                                onClick={() => addSpecialty(spec)}
                                                                className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-zinc-700 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 group"
                                                            >
                                                                <Plus size={12} className="opacity-0 group-hover:opacity-100 -ml-1 transition-opacity" />
                                                                {spec}
                                                            </button>
                                                        ))}
                                                    {/* Empty State Logic Check */}
                                                    {availableServices.filter(s => !formData.specialties?.includes(s) &&
                                                        s.toLowerCase().includes(serviceAddSearch.toLowerCase()) &&
                                                        (filterCategory ? services.find(serv => serv.name === s)?.category === filterCategory : true)
                                                    ).length === 0 && (
                                                            <p className="w-full text-center text-[10px] text-slate-400 py-2 italic">
                                                                Nenhum serviço disponível com este filtro.
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Selecionados ({formData.specialties?.length || 0})</label>
                                            <div className="flex flex-col gap-2">
                                                {formData.specialties && formData.specialties.length > 0 ? formData.specialties.map(spec => {
                                                    const service = services.find(s => s.name === spec);
                                                    const defaultDur = service?.durationMinutes || 30;
                                                    const customDur = formData.customDurations?.[spec];

                                                    return (
                                                        <div key={spec} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2.5 rounded-xl animate-in zoom-in duration-200 shadow-sm">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeSpecialty(spec)}
                                                                    className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg hover:bg-rose-100 transition-colors flex-shrink-0"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{spec}</span>
                                                            </div>

                                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                                <div className="relative">
                                                                    <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                    <input
                                                                        type="number"
                                                                        placeholder={defaultDur.toString()}
                                                                        value={customDur || ''}
                                                                        onChange={e => {
                                                                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                                                                            const newDurs = { ...(formData.customDurations || {}) };
                                                                            if (val === undefined) delete newDurs[spec];
                                                                            else newDurs[spec] = val;
                                                                            setFormData({ ...formData, customDurations: newDurs });
                                                                        }}
                                                                        className="w-20 pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-lg text-[10px] font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all"
                                                                        title="Duração personalizada (minutos)"
                                                                    />
                                                                </div>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase">min</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }) : (
                                                    <span className="text-sm font-bold text-slate-400 italic py-2">Nenhum serviço vinculado.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1.5 ml-1">Selecione quais serviços esta profissional está apta a realizar.</p>
                                </div>

                                {/* New Birth Date Field */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Data de Nascimento</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="date"
                                            required
                                            value={formData.birthDate || ''}
                                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* WORK DAYS SELECTOR */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-2">Dias de Atendimento (Agenda Aberta)</label>
                                    <div className="flex gap-2">
                                        {weekDays.map(day => {
                                            const isSelected = formData.workDays?.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => toggleWorkDay(day.id)}
                                                    className={`flex-1 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-slate-300 dark:hover:border-zinc-600'
                                                        }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">WhatsApp</label>
                                    <div className="relative">
                                        <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all"
                                            placeholder="(11) 9...."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1.5">
                                        % Profissional (Repasse + NFSe)
                                    </label>
                                    <div className="relative">
                                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" />
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="1"
                                            required
                                            value={formData.commissionRate}
                                            onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                                            className="w-full pl-11 pr-4 py-4 bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl text-sm font-black text-indigo-950 dark:text-indigo-300 focus:border-indigo-600 focus:ring-0 outline-none transition-all"
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold text-indigo-600 dark:text-indigo-500 mt-1">
                                        Ex: 0.4 = 40% profissional / 60% salão. Usado para repasses e NFSe.
                                    </p>
                                </div>

                                {/* COMMISSION CHANGE REASON (Visible only if rate changed) */}
                                {isCommissionChanged && (
                                    <div className="md:col-span-2 animate-in slide-in-from-top-2">
                                        <label className="block text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <History size={12} /> Motivo da Alteração de Comissão
                                        </label>
                                        <textarea
                                            className="w-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-amber-500 outline-none transition-all placeholder:text-amber-300 resize-none h-20"
                                            placeholder="Ex: Promoção de cargo, reajuste anual..."
                                            value={commissionChangeReason}
                                            onChange={e => setCommissionChangeReason(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Chave Pix para Repasses</label>
                                    <div className="relative">
                                        <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="text"
                                            value={formData.pixKey}
                                            onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="CPF, Celular ou E-mail"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FISCAL DATA SECTION - NFSe / Salão Parceiro */}
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5 rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 mt-6">
                                <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Briefcase size={14} /> Dados Fiscais - NFSe (Salão Parceiro SP)
                                </h4>
                                <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-500 mb-4">
                                    Obrigatório para emissão de Nota Fiscal com segregação de valores
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                            CNPJ da Profissional *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.fiscalCnpj || ''}
                                            onChange={e => setFormData({ ...formData, fiscalCnpj: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                            placeholder="XX.XXX.XXX/XXXX-XX"
                                            maxLength={18}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                            Inscrição Municipal
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.fiscalMunicipalRegistration || ''}
                                            onChange={e => setFormData({ ...formData, fiscalMunicipalRegistration: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                            placeholder="Ex: 12345678"
                                        />
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                                Razão Social (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.fiscalSocialName || ''}
                                                onChange={e => setFormData({ ...formData, fiscalSocialName: e.target.value })}
                                                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                                placeholder="Se vazio, usa o nome do perfil"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                                Nome Fantasia (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.fiscalFantasyName || ''}
                                                onChange={e => setFormData({ ...formData, fiscalFantasyName: e.target.value })}
                                                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                                placeholder="Nome comercial da profissional"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                                            💡 O percentual da profissional será o mesmo do campo "% Comissão" acima ({((formData.commissionRate || 0.4) * 100).toFixed(0)}%)
                                        </p>
                                    </div>
                                    <div className="md:col-span-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.fiscalVerified || false}
                                                    onChange={e => setFormData({ ...formData, fiscalVerified: e.target.checked })}
                                                    className="sr-only"
                                                />
                                                <div className={`w-10 h-6 rounded-full transition-colors ${formData.fiscalVerified ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
                                                <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.fiscalVerified ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest">
                                                    Dados Fiscais Verificados pelo Administrador
                                                </p>
                                                <p className="text-[9px] font-bold text-emerald-700/60 dark:text-emerald-500/60">
                                                    Marque para liberar a emissão de nota fiscal para esta profissional.
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {formData.fiscalCnpj && (
                                    <div className="mt-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                        <p className="text-[9px] font-black text-emerald-800 dark:text-emerald-400 uppercase mb-1">
                                            ✓ Dados fiscais serão salvos para emissão de NFSe
                                        </p>
                                        <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500">
                                            O CNPJ aparecerá na NFSe conforme legislação "Salão Parceiro" de São Paulo
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Display Commission History if available */}
                            {editingProvider && editingProvider.commissionHistory && editingProvider.commissionHistory.length > 0 && (
                                <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-zinc-700 mt-2">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <History size={12} /> Histórico de Comissões
                                    </h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-hide">
                                        {editingProvider.commissionHistory.map((hist, idx) => (
                                            <div key={idx} className="flex justify-between items-start text-xs bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-100 dark:border-zinc-700">
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white">{(hist.rate * 100).toFixed(0)}%</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">{hist.note}</p>
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-400">{new Date(hist.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 pb-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 text-slate-800 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} /> Salvar Cadastro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INACTIVATION CONFLICT MODAL */}
            {inactivationData && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-amber-400 text-amber-950 flex justify-between items-center flex-shrink-0 gap-4">
                            <h3 className="font-black text-[11px] md:text-sm uppercase tracking-widest flex items-center gap-2 min-w-0">
                                <AlertTriangle size={18} className="flex-shrink-0" />
                                <span className="truncate">Atenção: Agenda Pendente</span>
                            </h3>
                            <button onClick={() => setInactivationData(null)} className="flex-shrink-0"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto bg-white dark:bg-zinc-900">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                O profissional <span className="text-black dark:text-white font-black uppercase">{editingProvider?.name}</span> possui <span className="text-rose-600 dark:text-rose-400 font-black">{inactivationData.appointments.length} agendamentos futuros</span>.
                            </p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">Defina quem assumirá cada atendimento:</p>

                            <div className="space-y-3">
                                {inactivationData.appointments.map(app => (
                                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                                    {new Date(app.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    <span className="text-slate-400 font-bold">•</span>
                                                    {app.time}
                                                </div>
                                                <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase mt-0.5">{customers.find(c => c.id === app.customerId)?.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate font-medium">{app.combinedServiceNames || 'Serviço'}</div>

                                        <div className="relative mt-1">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 rounded-xl py-2 pl-9 pr-4 text-[10px] font-black uppercase text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 appearance-none transition-all"
                                                value={replacementMap[app.id] || ''}
                                                onChange={e => setReplacementMap(prev => ({ ...prev, [app.id]: e.target.value }))}
                                            >
                                                <option value="">Selecione substituto...</option>
                                                {availableReplacements.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ArrowRight size={12} className="text-slate-300" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex-shrink-0">
                            <button
                                onClick={confirmInactivation}
                                disabled={!isAllReplacementsSelected}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            >
                                {isAllReplacementsSelected ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                Confirmar Substituição e Inativar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
