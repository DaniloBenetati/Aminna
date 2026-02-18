import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
  Search, Plus, MapPin, Phone, Mail, User, FileText, Check, X,
  Contact, ChevronLeft, Heart, AlertTriangle, Sparkles, Calendar,
  Smartphone, CreditCard, TrendingUp, Crown, Target, Zap, ChevronRight,
  Filter, UserPlus, History, Star, Megaphone, Ban, Users, Wallet
} from 'lucide-react';
import { Customer, Appointment, CustomerHistoryItem, Service, Provider, ViewState, UserProfile } from '../types';

interface ClientsProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  appointments?: Appointment[];
  services?: Service[];
  userProfile: UserProfile | null;
  selectedCustomerId: string | null;
  returnView?: ViewState | null;
  onNavigate?: (view: ViewState, payload?: any) => void;
  providers?: Provider[];
}

export const Clients: React.FC<ClientsProps> = ({ customers, setCustomers, appointments = [], services = [], userProfile, selectedCustomerId, returnView, onNavigate, providers = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'INFO' | 'PREFS' | 'HISTORY'>('INFO');

  // Form States
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [localRestrictions, setLocalRestrictions] = useState('');
  const [localFavServices, setLocalFavServices] = useState('');
  const [localPrefDays, setLocalPrefDays] = useState('');
  const [localPrefNotes, setLocalPrefNotes] = useState('');
  const [localAssignedProviderIds, setLocalAssignedProviderIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        handleSelectCustomer(customer);
        setIsEditing(true);
      }
    }
  }, [selectedCustomerId, customers]);

  const clientStats = useMemo(() => {
    const totalSpent = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const avgSpent = customers.length > 0 ? totalSpent / customers.length : 0;
    const vips = customers.filter(c => c.status === 'VIP').length;
    const churnRisk = customers.filter(c => c.status === 'Risco de Churn').length;
    const now = new Date();
    const newThisMonth = customers.filter(c => {
      const regDate = new Date(c.registrationDate);
      return regDate.getMonth() === now.getMonth() && regDate.getFullYear() === now.getFullYear();
    }).length;
    return { avgSpent, vips, churnRisk, newThisMonth };
  }, [customers]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const customerTimeline = useMemo(() => {
    if (!selectedCustomer) return [];

    // Convert appointments to history items
    const appointmentHistory: CustomerHistoryItem[] = appointments
      .filter(a => a.customerId === selectedCustomer.id && (a.status === 'Concluído' || a.status === 'Confirmado'))
      .map(a => {
        const service = services.find(s => s.id === a.serviceId);

        // Determine Service Description
        let description = a.combinedServiceNames;
        if (!description) {
          description = service?.name || 'Serviço';
          if (a.additionalServices && a.additionalServices.length > 0) {
            const extraNames = a.additionalServices.map(ex => services.find(s => s.id === ex.serviceId)?.name).filter(Boolean).join(' + ');
            if (extraNames) description += ` + ${extraNames}`;
          }
        }

        // Determine Price & Payment Details
        let details = '';
        if (a.status === 'Concluído') {
          const price = (a.pricePaid !== undefined && a.pricePaid !== null) ? `R$ ${a.pricePaid.toFixed(2)}` : (a.bookedPrice ? `R$ ${a.bookedPrice.toFixed(2)}` : '');
          const payment = a.payments && a.payments.length > 0
            ? a.payments.map(p => `${p.method}: R$${(p.amount || 0).toFixed(2)}`).join(', ')
            : (a.paymentMethod || 'Não informado');

          details = `Valor: ${price} | Pagamento: ${payment}`;
        } else {
          details = `Status: ${a.status}`;
        }

        // Collect Products
        const products = a.productsUsed || [];

        return {
          id: a.id,
          date: a.date,
          type: 'VISIT',
          description: description,
          providerId: a.providerId,
          details: details,
          productsUsed: products,
          rating: a.rating,
          feedback: a.feedback
        };
      });

    // Merge with manual history and sort by date descending
    const merged = [...appointmentHistory, ...(selectedCustomer.history || [])];
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomer, appointments, services]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditing(false);
    setIsNew(false);
    setFormData({
      ...customer,
      isBlocked: customer.isBlocked || false,
      blockReason: customer.blockReason || ''
    });
    setActiveTab('INFO');
    setLocalRestrictions(customer.preferences?.restrictions || '');
    setLocalFavServices((customer.preferences?.favoriteServices as any || []).join(', ') || '');
    setLocalPrefDays((customer.preferences?.preferredDays as any || []).join(', ') || '');
    setLocalPrefNotes(customer.preferences?.notes || '');
    setLocalAssignedProviderIds(customer.assignedProviderIds || (customer.assignedProviderId ? [customer.assignedProviderId] : []));
  };

  const handleNewCustomer = () => {
    setFormData({
      name: '', phone: '', email: '', address: '', birthDate: '', cpf: '', status: 'Novo', observations: '',
      acquisitionChannel: '',
      isBlocked: false,
      blockReason: '',
      preferences: { favoriteServices: [], preferredDays: [], notes: '', restrictions: '' }
    });

    setLocalRestrictions(''); setLocalFavServices(''); setLocalPrefDays(''); setLocalPrefNotes('');
    setLocalAssignedProviderIds([]);
    setSelectedCustomer(null); setIsEditing(true); setIsNew(true); setActiveTab('INFO');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert("Por favor, preencha o nome da cliente.");
      return;
    }
    if (!formData.phone) {
      alert("Por favor, preencha o telefone/WhatsApp.");
      return;
    }

    const updatedPreferences = {
      restrictions: localRestrictions,
      favoriteServices: localFavServices.split(',').map(s => s.trim()).filter(s => s !== ''),
      preferredDays: localPrefDays.split(',').map(s => s.trim()).filter(s => s !== ''),
      notes: localPrefNotes
    };

    if (isNew) {
      const newItem = {
        ...formData,
        id: Date.now().toString(),
        registrationDate: new Date().toISOString().split('T')[0],
        history: [],
        totalSpent: 0,
        preferences: updatedPreferences
      } as Customer;

      // Save to Supabase
      const { data, error } = await supabase.from('customers').insert({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        birth_date: formData.birthDate,
        address: formData.address,
        cpf: formData.cpf,
        observations: formData.observations,
        acquisition_channel: formData.acquisitionChannel,
        preferences: updatedPreferences,
        is_blocked: formData.isBlocked,
        block_reason: formData.blockReason,
        status: 'Novo',
        registration_date: newItem.registrationDate,
        total_spent: 0,
        assigned_provider_ids: localAssignedProviderIds,
        restricted_provider_ids: formData.restrictedProviderIds || [],
        is_vip: formData.isVip || false,
        vip_discount_percent: formData.vipDiscountPercent || 0
      }).select().single();

      if (error) {
        console.error('Error creating customer:', error);
        alert('Erro ao criar cliente no banco de dados.');
        return;
      }

      const clientWithId = { ...newItem, id: data.id, assignedProviderIds: localAssignedProviderIds, restrictedProviderIds: formData.restrictedProviderIds || [], isVip: formData.isVip || false, vipDiscountPercent: formData.vipDiscountPercent || 0 };
      setCustomers(prev => [...prev, clientWithId]);
      setSelectedCustomer(clientWithId);

      if (returnView && onNavigate) {
        onNavigate(returnView);
      }
    } else if (selectedCustomer) {
      const updatedCustomer = {
        ...selectedCustomer,
        ...formData,
        preferences: updatedPreferences,
        isBlocked: formData.isBlocked,
        blockReason: formData.blockReason,
        assignedProviderIds: localAssignedProviderIds,
        restrictedProviderIds: formData.restrictedProviderIds || [],
        isVip: formData.isVip || false,
        vipDiscountPercent: formData.vipDiscountPercent || 0
      } as Customer;

      // Update Supabase
      const { error } = await supabase.from('customers').update({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        birth_date: formData.birthDate,
        address: formData.address,
        cpf: formData.cpf,
        observations: formData.observations,
        acquisition_channel: formData.acquisitionChannel,
        preferences: updatedPreferences,
        is_blocked: formData.isBlocked,
        block_reason: formData.blockReason,
        assigned_provider_ids: localAssignedProviderIds,
        assigned_provider_id: localAssignedProviderIds?.[0] || null,
        is_vip: formData.isVip,
        vip_discount_percent: formData.vipDiscountPercent,
        credit_balance: formData.creditBalance || 0
      }).eq('id', selectedCustomer.id);

      if (error) {
        console.error('Error updating customer:', error);
        alert('Erro ao atualizar cliente no banco de dados.');
        return;
      }

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer);

      if (returnView && onNavigate) {
        onNavigate(returnView);
      }
    }
    setIsEditing(false); setIsNew(false);
  };

  const handleCancel = () => {
    if (isNew) {
      setSelectedCustomer(null);
    } else {
      const customer = selectedCustomer!;
      setFormData({
        ...customer,
        isBlocked: customer.isBlocked || false,
        blockReason: customer.blockReason || ''
      });
      setLocalRestrictions(customer.preferences?.restrictions || '');
      setLocalFavServices(customer.preferences?.favoriteServices?.join(', ') || '');
      setLocalPrefDays(customer.preferences?.preferredDays?.join(', ') || '');
      setLocalPrefNotes(customer.preferences?.notes || '');
      setLocalAssignedProviderIds(customer.assignedProviderIds || (customer.assignedProviderId ? [customer.assignedProviderId] : []));
    }
    setIsEditing(false);
    setIsNew(false);
  };

  const showDetail = selectedCustomer || isNew;

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col pb-20 md:pb-0 font-sans text-slate-900 dark:text-white">
      {/* Header List View */}
      {!showDetail && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight uppercase">Base de Clientes</h2>
              <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão do Clube e Fidelidade</p>
            </div>
            <button
              onClick={handleNewCustomer}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              <UserPlus size={18} /> <span className="hidden sm:inline">Nova Cliente</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Base Total', val: customers.length, icon: Users, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
              { label: 'Ticket Médio', val: `R$ ${clientStats.avgSpent.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'Membros VIP', val: clientStats.vips, icon: Crown, color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
              { label: 'Risco Churn', val: clientStats.churnRisk, icon: Target, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' },
              { label: 'Novas (Mês)', val: `+${clientStats.newThisMonth}`, icon: Zap, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' }
            ].map((kpi, i) => (
              <div key={i} className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div className={`p-2 ${kpi.bg} ${kpi.color} rounded-xl w-fit mb-2`}><kpi.icon size={18} /></div>
                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase">{kpi.label}</p>
                <p className="text-base md:text-xl font-black text-slate-950 dark:text-white leading-tight">{kpi.val}</p>
              </div>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou celular..."
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-white rounded-2xl text-sm font-black text-slate-950 dark:text-white outline-none transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">

        {/* MASTER LIST */}
        <div className={`${showDetail ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex-col overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text" placeholder="Pesquisar..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl text-xs font-black text-slate-950 dark:text-white outline-none transition-all"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800 overflow-y-auto flex-1 scrollbar-hide">
            {filteredCustomers.map(customer => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className={`w-full text-left p-4 md:p-5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] border-l-4 ${selectedCustomer?.id === customer.id ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-transparent'}`}
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-950 dark:text-white truncate leading-tight uppercase text-sm md:text-sm tracking-tight">{customer.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[9px] md:text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${customer.status === 'VIP' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800' : customer.status === 'Risco de Churn' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'}`}>
                        {customer.status === 'Novo' && (Number(customer.totalSpent || 0) > 0 || (customer.history || []).length > 0 || appointments.some(a => a.customerId === customer.id && a.status === 'Concluído')) ? 'Regular' : customer.status}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">{customer.phone}</p>
                      {customer.creditBalance !== undefined && customer.creditBalance > 0 && (
                        <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800">
                          <Wallet size={10} className="text-purple-600 dark:text-purple-400" />
                          <span className="text-[8px] font-black text-purple-700 dark:text-purple-400 uppercase">R$ {customer.creditBalance.toFixed(2)}</span>
                        </div>
                      )}
                      {customer.assignedProviderIds && customer.assignedProviderIds.length > 0 && (
                        <div className="flex -space-x-1.5 ml-2">
                          {customer.assignedProviderIds.map(pid => {
                            const p = providers?.find(pr => pr.id === pid);
                            if (!p) return null;
                            return (
                              <div key={pid} className="w-4 h-4 rounded-full border border-white dark:border-zinc-800 overflow-hidden" title={p.name}>
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[7px] font-black text-indigo-700 dark:text-indigo-300">{p.name.charAt(0)}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {customer.isBlocked && <Ban size={12} className="text-rose-600 dark:text-rose-400 ml-1" />}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-zinc-600" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* DETAIL VIEW */}
        <div className={`${showDetail ? 'flex' : 'hidden lg:flex'} w-full lg:w-2/3 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex-col overflow-hidden animate-in slide-in-from-right md:slide-in-from-none duration-300 relative`}>
          {showDetail ? (
            <form onSubmit={handleSave} className="flex flex-col h-full bg-white dark:bg-zinc-900 relative">
              {/* Profile Header */}
              <div className="p-4 md:p-8 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-20 transition-all">
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  <button type="button" onClick={() => {
                    if (returnView && onNavigate) {
                      onNavigate(returnView);
                    } else {
                      setSelectedCustomer(null);
                      setIsEditing(false);
                    }
                  }} className="p-2 -ml-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-all"><ChevronLeft size={24} /></button>
                  <div className={`w-12 h-12 md:w-14 md:h-14 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black flex-shrink-0 shadow-sm ${isEditing ? 'hidden md:flex' : 'flex'}`}>
                    <User size={24} className="md:w-7 md:h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text" required autoFocus
                        className="text-lg md:text-xl font-black text-slate-950 dark:text-white border-b-2 border-indigo-500 outline-none bg-transparent w-full uppercase py-1"
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="NOME DA CLIENTE"
                      />
                    ) : (
                      <h3 className="text-lg md:text-2xl font-black text-slate-950 dark:text-white truncate leading-tight uppercase tracking-tight">{formData.name}</h3>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-zinc-800">
                        {formData.status === 'Novo' && (Number(formData.totalSpent || 0) > 0 || (formData.history || []).length > 0 || appointments.some(a => a.customerId === formData.id && a.status === 'Concluído')) ? 'Regular' : formData.status}
                      </span>
                      {!isEditing && formData.acquisitionChannel && (
                        <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-900 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                          Via {formData.acquisitionChannel}
                        </span>
                      )}
                      {formData.assignedProviderIds && formData.assignedProviderIds.length > 0 && (
                        <div className="flex -space-x-2">
                          {formData.assignedProviderIds.map(pid => {
                            const p = providers.find(pr => pr.id === pid);
                            if (!p) return null;
                            return (
                              <div key={pid} className="w-5 h-5 rounded-full border border-white dark:border-zinc-900 overflow-hidden" title={p.name}>
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[8px] font-black">{p.name.charAt(0)}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {formData.creditBalance !== undefined && formData.creditBalance > 0 && (
                        <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase border border-purple-100 dark:border-purple-900 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center gap-1">
                          <Wallet size={10} /> {formData.creditBalance.toFixed(2)}
                        </span>
                      )}
                      {formData.isBlocked && <span className="text-[9px] font-black text-rose-500 uppercase border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/20">BLOQUEADA</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={handleCancel} className="px-3 py-2 md:px-5 md:py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">CANCELAR</button>
                      <button type="submit" className="px-3 py-2 md:px-5 md:py-2.5 bg-indigo-600 text-white rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">SALVAR</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setIsEditing(true)} className="px-5 py-2.5 md:px-8 md:py-3 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">EDITAR</button>
                  )}
                </div>
              </div>

              {/* Tabs Menu */}
              {!isNew && (
                <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto no-scrollbar flex-shrink-0 sticky top-[73px] md:top-[89px] z-10">
                  {[
                    { id: 'INFO', label: 'DADOS', icon: Contact },
                    { id: 'PREFS', label: 'PREFERÊNCIAS', icon: Sparkles },
                    { id: 'HISTORY', label: 'HISTÓRICO', icon: History }
                  ].map(tab => (
                    <button
                      key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 min-w-[100px] md:min-w-[120px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${activeTab === tab.id ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                      <tab.icon size={14} className={activeTab === tab.id ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
                      {tab.label}
                      {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-950 dark:bg-white rounded-full mx-4" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 scrollbar-hide bg-slate-50/30 dark:bg-zinc-900/50 pb-12">

                {activeTab === 'INFO' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                      {/* DADOS PESSOAIS */}
                      <div className="bg-white dark:bg-zinc-800 p-5 rounded-[1.75rem] border border-slate-200 dark:border-zinc-700 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-zinc-700 pb-2"><User size={16} className="text-indigo-600 dark:text-indigo-400" /> Dados Pessoais</h4>
                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-[9px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">Data de Nascimento</span>
                            {isEditing ? (
                              <input type="date" className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white" value={formData.birthDate || ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
                            ) : (
                              <p className="text-sm font-black text-slate-950 dark:text-white">{formData.birthDate ? new Date(formData.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</p>
                            )}
                          </label>
                          <label className="block">
                            <span className="text-[9px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">CPF</span>
                            {isEditing ? (
                              <input type="text" className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white placeholder:text-slate-400" placeholder="000.000.000-00" value={formData.cpf || ''} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                            ) : (
                              <p className="text-sm font-black text-slate-950 dark:text-white">{formData.cpf || 'Não informado'}</p>
                            )}
                          </label>
                          <label className="block">
                            <span className="text-[9px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">Passou Por</span>
                            <p className="text-sm font-black text-slate-950 dark:text-white uppercase">
                              {(() => {
                                const visits = appointments.filter(a => a.customerId === formData.id && a.status === 'Concluído').length;
                                return visits === 0 ? 'Primeira Visita' : visits === 1 ? '1 Visita' : `${visits} Visitas`;
                              })()}
                            </p>
                          </label>
                          <label className="block pt-2">
                            <span className="text-[9px] md:text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1"><Wallet size={10} /> Crédito Aminna</span>
                            {isEditing ? (
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                <input type="number" step="0.01" className="w-full bg-purple-50/50 dark:bg-purple-900/10 border-2 border-purple-100 dark:border-purple-800 rounded-xl pl-8 pr-3 py-2 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-purple-500" value={formData.creditBalance || 0} onChange={e => setFormData({ ...formData, creditBalance: parseFloat(e.target.value) || 0 })} />
                              </div>
                            ) : (
                              <p className="text-sm font-black text-purple-700 dark:text-purple-400">R$ {(formData.creditBalance || 0).toFixed(2)}</p>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* CONTATOS */}
                      <div className="bg-white dark:bg-zinc-800 p-5 rounded-[1.75rem] border border-slate-200 dark:border-zinc-700 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-zinc-700 pb-2"><Smartphone size={16} className="text-indigo-600 dark:text-indigo-400" /> Contatos</h4>
                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-[9px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">WhatsApp / Celular</span>
                            {isEditing ? (
                              <input type="tel" required className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            ) : (
                              <p className="text-sm font-black text-slate-950 dark:text-white">{formData.phone || 'N/A'}</p>
                            )}
                          </label>
                          <label className="block">
                            <span className="text-[9px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">Email</span>
                            {isEditing ? (
                              <input type="email" className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            ) : (
                              <p className="text-sm font-black text-slate-950 dark:text-white">{formData.email || 'Não informado'}</p>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* VIP SECTION */}
                      <div className={`p-5 rounded-[1.75rem] border shadow-sm space-y-4 transition-all ${formData.isVip ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'}`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b pb-2 ${formData.isVip ? 'text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900' : 'text-slate-400 dark:text-slate-500 border-slate-50 dark:border-zinc-700'}`}>
                          <Sparkles size={16} /> Cliente VIP
                        </h4>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">Status: {formData.isVip ? 'VIP ATIVO' : 'REGULAR'}</span>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isVip: !formData.isVip })}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isVip ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-zinc-700 dark:text-slate-300'}`}
                              >
                                {formData.isVip ? 'Remover VIP' : 'Tornar VIP'}
                              </button>
                            )}
                          </div>

                          {(formData.isVip || isEditing) && formData.isVip && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2">
                              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase">Desconto Automático (%)</span>
                              {isEditing ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-full bg-white dark:bg-zinc-900 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-amber-500"
                                    placeholder="0"
                                    value={formData.vipDiscountPercent || 0}
                                    onChange={e => setFormData({ ...formData, vipDiscountPercent: Number(e.target.value) })}
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-amber-500">%</span>
                                </div>
                              ) : (
                                <p className="text-xl font-black text-amber-600 dark:text-amber-400 leading-tight">
                                  {formData.vipDiscountPercent || 0}% OFF
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* LOCALIZAÇÃO */}
                      <div className="bg-white dark:bg-zinc-800 p-5 rounded-[1.75rem] border border-slate-200 dark:border-zinc-700 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-zinc-700 pb-2"><MapPin size={16} className="text-indigo-600 dark:text-indigo-400" /> Localização</h4>
                        <label className="block">
                          <span className="text-[9px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">Endereço Residencial</span>
                          {isEditing ? (
                            <textarea rows={3} className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none resize-none focus:border-zinc-950 dark:focus:border-white" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                          ) : (
                            <p className="text-sm font-black text-slate-950 dark:text-white leading-relaxed">{formData.address || 'Sem endereço cadastrado'}</p>
                          )}
                        </label>
                      </div>

                      {/* BLOQUEIO DE CLIENTE */}
                      <div className={`p-5 rounded-[1.75rem] border shadow-sm space-y-4 transition-all ${formData.isBlocked ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'}`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b pb-2 ${formData.isBlocked ? 'text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900' : 'text-slate-400 dark:text-slate-500 border-slate-50 dark:border-zinc-700'}`}>
                          <Ban size={16} /> Bloqueio de Cliente
                        </h4>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">Status: {formData.isBlocked ? 'BLOQUEADO' : 'ATIVO'}</span>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  const isAdmin = userProfile?.role === 'admin';
                                  if (formData.isBlocked && !isAdmin) {
                                    alert("Apenas administradores podem remover bloqueios.");
                                    return;
                                  }
                                  setFormData({ ...formData, isBlocked: !formData.isBlocked });
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isBlocked ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                              >
                                {formData.isBlocked ? 'Desbloquear' : 'Bloquear'}
                              </button>
                            )}
                          </div>

                          {(formData.isBlocked || isEditing) && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase">Motivo do Bloqueio</span>
                              {isEditing ? (
                                <textarea
                                  rows={2}
                                  disabled={formData.isBlocked && userProfile?.role !== 'admin'}
                                  className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-rose-500 resize-none disabled:opacity-50"
                                  placeholder="Descreva o motivo do bloqueio..."
                                  value={formData.blockReason || ''}
                                  onChange={e => setFormData({ ...formData, blockReason: e.target.value })}
                                />
                              ) : (
                                <p className="text-sm font-black text-rose-700 dark:text-rose-400 leading-tight">
                                  {formData.blockReason || 'Motivo não informado.'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PRONTUARIO */}
                      <div className="md:col-span-2 bg-zinc-950 dark:bg-zinc-900 p-6 rounded-[2rem] shadow-xl text-white border border-transparent dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><FileText size={16} className="text-indigo-400" /> Prontuário Estratégico</h4>
                        </div>
                        {isEditing ? (
                          <textarea rows={3} className="w-full bg-white/5 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 text-sm font-medium text-white outline-none resize-none placeholder:text-zinc-700" value={formData.observations || ''} onChange={e => setFormData({ ...formData, observations: e.target.value })} placeholder="Observações privadas sobre gostos e comportamento..." />
                        ) : (
                          <p className="text-sm font-medium text-zinc-300 italic">"{formData.observations || 'Nenhuma nota privada.'}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'PREFS' && (
                  <div className="space-y-5 animate-in slide-in-from-bottom-2">
                    {/* Saúde & Restrições - Match Screenshot */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-zinc-700 shadow-sm space-y-4">
                      <label className="block text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-600 dark:text-rose-500" /> ALERTAS DE SAÚDE & RESTRIÇÕES
                      </label>
                      {isEditing ? (
                        <textarea
                          rows={3}
                          className="w-full text-base md:text-sm font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 focus:border-rose-500 outline-none resize-none placeholder:text-slate-300"
                          placeholder="Diabetes, Alergias, Sensibilidade..."
                          value={localRestrictions} onChange={e => setLocalRestrictions(e.target.value)}
                        />
                      ) : (
                        <p className={`text-base font-black ${localRestrictions ? 'text-slate-950 dark:text-white' : 'text-slate-300 dark:text-slate-600 italic'}`}>
                          {localRestrictions || "Diabetes, Alergias, Sensibilidade..."}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      {/* Serviços Favoritos - Match Screenshot */}
                      <div className="bg-white dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-zinc-700 shadow-sm space-y-3">
                        <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.1em] flex items-center gap-2">
                          <Heart size={18} /> SERVIÇOS FAVORITOS
                        </h4>
                        {isEditing ? (
                          <input
                            className="w-full text-base md:text-sm font-black text-slate-950 dark:text-white bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-4 md:p-3 outline-none focus:border-indigo-500"
                            placeholder="Mão Gel, Spa..."
                            value={localFavServices} onChange={e => setLocalFavServices(e.target.value)}
                          />
                        ) : (
                          <p className="text-sm font-black text-slate-950 dark:text-white">{localFavServices || 'Não informado'}</p>
                        )}
                      </div>



                      {/* Notas de Estilo - Match Screenshot */}
                      <div className="bg-white dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-zinc-700 shadow-sm space-y-3">
                        <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.1em] flex items-center gap-2">
                          <Star size={18} /> NOTAS DE ESTILO
                        </h4>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            className="w-full text-base md:text-sm font-black text-slate-950 dark:text-white bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-4 md:p-3 outline-none focus:border-slate-500 resize-none"
                            placeholder="Cores nudes, unhas curtas..."
                            value={localPrefNotes} onChange={e => setLocalPrefNotes(e.target.value)}
                          />
                        ) : (
                          <p className="text-sm font-black text-slate-950 dark:text-white">{localPrefNotes || 'Sem notas extras'}</p>
                        )}
                      </div>
                    </div>

                    {/* PROFISSIONAIS PREFERIDOS */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-zinc-700 shadow-sm space-y-4">
                      <label className="block text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
                        <Users size={18} /> PROFISSIONAIS PREFERIDOS
                      </label>
                      {isEditing ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {providers.filter(p => p.active).map(provider => {
                            const isSelected = localAssignedProviderIds.includes(provider.id);
                            return (
                              <button
                                type="button"
                                key={provider.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setLocalAssignedProviderIds(prev => prev.filter(id => id !== provider.id));
                                  } else {
                                    setLocalAssignedProviderIds(prev => [...prev, provider.id]);
                                  }
                                }}
                                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-100 dark:border-zinc-700 hover:border-slate-300'}`}
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                                  {provider.avatar ? <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{provider.name.charAt(0)}</div>}
                                </div>
                                <div className="text-left min-w-0">
                                  <p className={`text-xs font-black uppercase truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-gray-400'}`}>{provider.name}</p>
                                  <p className="text-[9px] text-slate-500 uppercase">{provider.specialty}</p>
                                </div>
                                {isSelected && <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center ml-auto"><Check size={8} /></div>}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {localAssignedProviderIds.length > 0 ? (
                            localAssignedProviderIds.map(pid => {
                              const p = providers.find(pr => pr.id === pid);
                              if (!p) return null;
                              return (
                                <div key={pid} className="flex items-center px-4 py-1 bg-[#FF007F] rounded-full shadow-sm" title={p.name}>
                                  <span className="text-[10px] font-black uppercase text-white py-1">{p.name}</span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm font-black text-slate-400 dark:text-slate-600 italic">Nenhum profissional preferencial atribuído.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'HISTORY' && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    {customerTimeline.length > 0 ? (
                      customerTimeline.map((h, i) => (
                        <div key={h.id} className="relative pl-8">
                          {i !== customerTimeline.length - 1 && <div className="absolute left-3.5 top-6 bottom-[-16px] w-0.5 bg-slate-100 dark:bg-zinc-700" />}
                          <div className={`absolute left-0 top-1 w-7 h-7 rounded-full border-4 border-white dark:border-zinc-900 shadow-sm flex items-center justify-center ${h.type === 'VISIT' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                            <Check size={14} />
                          </div>
                          <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase">{h.description}</h5>
                              <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(h.date).toLocaleDateString()}</span>
                            </div>

                            {/* Provider Info */}
                            {(() => {
                              const pName = providers.find(p => p.id === h.providerId)?.name;
                              return pName ? (
                                <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                                  Profissional: <span className="text-indigo-600 dark:text-indigo-400">{pName}</span>
                                </p>
                              ) : null;
                            })()}

                            {h.details && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">{h.details}</p>}

                            {/* Products Used */}
                            {h.productsUsed && h.productsUsed.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {h.productsUsed.map((prod, idx) => (
                                  <span key={idx} className="text-[8px] font-bold uppercase bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                    {prod}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Feedback */}
                            {h.feedback && (
                              <div className="mt-2 text-[9px] italic text-slate-400 border-l-2 border-slate-200 pl-2">
                                "{h.feedback}" {h.rating ? `(${h.rating}⭐)` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center opacity-30">
                        <History size={48} className="mx-auto mb-2 dark:text-white" />
                        <p className="text-xs font-black uppercase dark:text-white">Nenhum registro</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 space-y-4">
              <div className="p-10 bg-slate-50 dark:bg-zinc-800 rounded-full border-2 border-dashed border-slate-200 dark:border-zinc-700">
                <Contact size={64} className="opacity-10 dark:text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">Selecione uma Cliente</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-600 mt-2 uppercase max-w-[250px] mx-auto leading-relaxed">Gerencie histórico e preferências.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
