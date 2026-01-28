
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

import { Plus, Search, Handshake, Tag, TrendingUp, Users, Smartphone, X, Check, ArrowUpRight, BarChart2, Mail, MapPin, FileText, CreditCard, Edit2, ToggleLeft, ToggleRight, Trash2, Calendar, CheckCircle, ChevronDown } from 'lucide-react';
import { PARTNERS as INITIAL_PARTNERS } from '../constants';
import { Partner, Campaign } from '../types';

interface PartnershipsProps {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
}

export const Partnerships: React.FC<PartnershipsProps> = ({ partners, setPartners, campaigns, setCampaigns }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Drill Down State for Mobile
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // Modals State
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Stats
  const totalPartnerRevenue = campaigns.reduce((acc, c) => acc + c.totalRevenueGenerated, 0);
  const totalPartnerAppointments = campaigns.reduce((acc, c) => acc + c.useCount, 0);
  const topCampaign = [...campaigns].sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated)[0];

  const handleOpenPartnerModal = (partner: Partner | null = null) => {
    setEditingPartner(partner);
    setIsPartnerModalOpen(true);
  };

  const handleOpenCampaignModal = (campaign: Campaign | null = null) => {
    setEditingCampaign(campaign);
    setIsCampaignModalOpen(true);
  };

  const togglePartnerStatus = async (id: string) => {
    const partner = partners.find(p => p.id === id);
    if (!partner) return;
    const newStatus = !partner.active;
    try {
      const { error } = await supabase.from('partners').update({ active: newStatus }).eq('id', id);
      if (error) throw error;
      setPartners(prev => prev.map(p => p.id === id ? { ...p, active: newStatus } : p));
    } catch (error) {
      console.error('Error toggling partner status:', error);
    }
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const partnerData = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      social_media: (form.elements.namedItem('socialMedia') as HTMLInputElement).value,
      category: (form.elements.namedItem('category') as HTMLSelectElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      document: (form.elements.namedItem('document') as HTMLInputElement).value,
      address: (form.elements.namedItem('address') as HTMLInputElement).value,
      partnership_type: (form.elements.namedItem('partnershipType') as HTMLSelectElement).value,
      pix_key: (form.elements.namedItem('pixKey') as HTMLInputElement).value,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
      active: editingPartner ? editingPartner.active : true
    };

    try {
      if (editingPartner) {
        const { error } = await supabase.from('partners').update(partnerData).eq('id', editingPartner.id);
        if (error) throw error;
        setPartners(prev => prev.map(p => p.id === editingPartner.id ? {
          ...p,
          name: partnerData.name,
          socialMedia: partnerData.social_media,
          category: partnerData.category,
          phone: partnerData.phone,
          email: partnerData.email,
          document: partnerData.document,
          address: partnerData.address,
          partnershipType: partnerData.partnership_type as any,
          pixKey: partnerData.pix_key,
          notes: partnerData.notes,
          active: partnerData.active
        } : p));
      } else {
        const { data, error } = await supabase.from('partners').insert([partnerData]).select();
        if (error) throw error;
        if (data && data[0]) {
          setPartners(prev => [...prev, {
            id: data[0].id,
            name: partnerData.name,
            socialMedia: partnerData.social_media,
            category: partnerData.category,
            phone: partnerData.phone,
            email: partnerData.email,
            document: partnerData.document,
            address: partnerData.address,
            partnershipType: partnerData.partnership_type as any,
            pixKey: partnerData.pix_key,
            notes: partnerData.notes,
            active: partnerData.active
          } as Partner]);
        }
      }
      setIsPartnerModalOpen(false);
    } catch (error) {
      console.error('Error saving partner:', error);
      alert('Erro ao salvar parceiro.');
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const campaignData = {
      partner_id: (form.elements.namedItem('partnerId') as HTMLSelectElement).value,
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      coupon_code: (form.elements.namedItem('couponCode') as HTMLInputElement).value.toUpperCase(),
      discount_type: (form.elements.namedItem('discountType') as HTMLSelectElement).value as 'PERCENTAGE' | 'FIXED',
      discount_value: parseFloat((form.elements.namedItem('discountValue') as HTMLInputElement).value),
      max_uses: parseInt((form.elements.namedItem('maxUses') as HTMLInputElement).value) || 100,
    };

    try {
      if (editingCampaign) {
        const { error } = await supabase.from('campaigns').update(campaignData).eq('id', editingCampaign.id);
        if (error) throw error;
        setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? {
          ...c,
          partnerId: campaignData.partner_id,
          name: campaignData.name,
          couponCode: campaignData.coupon_code,
          discountType: campaignData.discount_type,
          discountValue: campaignData.discount_value,
          maxUses: campaignData.max_uses
        } : c));
      } else {
        const newCampaignInsert = {
          ...campaignData,
          start_date: new Date().toISOString().split('T')[0]
        };
        const { data, error } = await supabase.from('campaigns').insert([newCampaignInsert]).select();
        if (error) throw error;
        if (data && data[0]) {
          setCampaigns(prev => [...prev, {
            id: data[0].id,
            partnerId: campaignData.partner_id,
            name: campaignData.name,
            couponCode: campaignData.coupon_code,
            discountType: campaignData.discount_type,
            discountValue: campaignData.discount_value,
            maxUses: campaignData.max_uses,
            startDate: data[0].start_date,
            useCount: 0,
            totalRevenueGenerated: 0
          } as Campaign]);
        }
      }
      setIsCampaignModalOpen(false);
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Erro ao salvar campanha.');
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm('Deseja excluir este parceiro permanentemente?')) return;
    try {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Deseja excluir esta campanha permanentemente?')) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const toggleCampaignExpand = (id: string) => {
    setExpandedCampaignId(expandedCampaignId === id ? null : id);
  };

  const filteredPartners = partners.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.socialMedia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-8 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Parcerias & Cupons</h2>
          <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão de influenciadores e campanhas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleOpenCampaignModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            <Tag size={16} /> Nova Campanha
          </button>
          <button
            onClick={() => handleOpenPartnerModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            <Plus size={16} /> Novo Parceiro
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl shadow-inner"><TrendingUp size={24} /></div>
          <div>
            <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">Receita Gerada</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">R$ {totalPartnerRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-2xl shadow-inner"><CheckCircle size={24} /></div>
          <div>
            <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">Atendimentos</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{totalPartnerAppointments}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="p-3 md:p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl shadow-inner"><Handshake size={24} /></div>
          <div>
            <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">Top Parceiro</p>
            <p className="text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
              {partners.find(p => p.id === topCampaign?.partnerId)?.name || 'Nenhum'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List of Partners */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="font-black text-slate-800 dark:text-white uppercase text-[10px] tracking-widest flex items-center gap-2"><Users size={16} /> Parceiros Cadastrados</h3>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar parceiro..."
                className="w-full sm:w-48 pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 p-2">
            {filteredPartners.map(p => (
              <div key={p.id} className={`p-4 rounded-3xl transition-all hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex items-center justify-between group ${!p.active ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex gap-4 items-center min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400 flex-shrink-0 border-2 ${p.active ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-950 dark:text-white text-sm leading-tight truncate">{p.name}</p>
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-400 font-black mb-1 truncate">{p.socialMedia}</p>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border whitespace-nowrap ${p.partnershipType === 'PERMUTA' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                        {p.partnershipType}
                      </span>
                      <span className="text-[8px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-tighter border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full whitespace-nowrap bg-slate-50 dark:bg-zinc-800">{p.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePartnerStatus(p.id)}
                    className={`p-2 rounded-xl transition-all ${p.active ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800'}`}
                    title={p.active ? "Desativar" : "Ativar"}
                  >
                    {p.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                  <button
                    onClick={() => handleOpenPartnerModal(p)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-800 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* List of Active Campaigns with DRILL DOWN */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 dark:text-white uppercase text-[10px] tracking-widest flex items-center gap-2"><Tag size={16} /> Cupons Ativos</h3>
            <span className="text-[8px] font-black text-slate-400 uppercase hidden md:inline">Clique para ver detalhes</span>
          </div>
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 p-2">
            {campaigns.map(c => {
              const partner = partners.find(p => p.id === c.partnerId);
              const isFull = c.useCount >= c.maxUses;
              const isExpanded = expandedCampaignId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => toggleCampaignExpand(c.id)}
                  className={`p-4 rounded-3xl transition-all flex flex-col gap-3 group relative cursor-pointer ${isExpanded ? 'bg-slate-50 dark:bg-zinc-800 ring-1 ring-slate-200 dark:ring-zinc-700' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-950 dark:text-white text-sm uppercase leading-tight truncate flex items-center gap-2">
                        {c.name}
                        <ChevronDown size={14} className={`text-slate-400 transition-transform md:hidden ${isExpanded ? 'rotate-180' : ''}`} />
                      </h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider truncate">{partner?.name || 'Desconhecido'}</p>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <div className={`px-3 py-1 rounded-xl font-mono font-black text-xs border ${isFull ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'}`}>
                        {c.couponCode}
                      </div>
                      <button
                        onClick={() => handleOpenCampaignModal(c)}
                        className="p-1.5 text-slate-400 hover:text-indigo-800 dark:hover:text-white transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid - Controlled by Drill Down on Mobile */}
                  <div className={`grid grid-cols-3 gap-2 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0 md:max-h-40 md:opacity-100 md:mt-0'}`}>
                    <div className="bg-white dark:bg-zinc-900 md:bg-slate-50 dark:md:bg-zinc-800 p-2 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm md:shadow-none">
                      <p className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase leading-none mb-1">Utilizados</p>
                      <p className={`text-xs font-black ${isFull ? 'text-rose-700 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>{c.useCount} <span className="text-[8px] text-slate-500">/ {c.maxUses}</span></p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm md:shadow-none">
                      <p className="text-[8px] font-black text-indigo-700 dark:text-indigo-400 uppercase leading-none mb-1">Desconto</p>
                      <p className="text-xs font-black text-indigo-900 dark:text-indigo-300">{c.discountValue}{c.discountType === 'PERCENTAGE' ? '%' : 'R$'}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm md:shadow-none">
                      <p className="text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase leading-none mb-1">Receita</p>
                      <p className="text-xs font-black text-emerald-900 dark:text-emerald-300">R${c.totalRevenueGenerated.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PARTNER MODAL - ADD/EDIT */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col border-2 border-black dark:border-zinc-700 max-h-[95vh]">
            <div className="px-6 py-4 md:py-5 border-b border-black dark:border-zinc-700 flex justify-between items-center bg-zinc-950 dark:bg-black text-white flex-shrink-0">
              <h3 className="font-black text-base md:text-lg uppercase tracking-tight flex items-center gap-2">
                <Users size={20} className="text-indigo-400" />
                {editingPartner ? 'Editar Influenciador' : 'Novo Cadastro de Parceiro'}
              </h3>
              <button onClick={() => setIsPartnerModalOpen(false)} className="text-white hover:text-slate-300 transition-colors p-1"><X size={24} /></button>
            </div>
            <form onSubmit={handleSavePartner} className="p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Nome Completo / Fantasia</label>
                  <input name="name" required defaultValue={editingPartner?.name || ''} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="Ex: Maria Clara Influencer" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Instagram / Rede Social</label>
                  <div className="relative">
                    <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="socialMedia" required defaultValue={editingPartner?.socialMedia || ''} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="@perfil" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">CPF / CNPJ</label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="document" defaultValue={editingPartner?.document || ''} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="000.000.000-00" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800 pt-5">
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">WhatsApp</label>
                  <input name="phone" required defaultValue={editingPartner?.phone || ''} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="(11) 9...." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="email" type="email" defaultValue={editingPartner?.email || ''} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="contato@parceiro.com" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Endereço de Correspondência</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="address" defaultValue={editingPartner?.address || ''} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="Rua, Número, Bairro - Cidade" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800 pt-5 bg-indigo-50/30 dark:bg-indigo-900/10 -mx-6 px-6 pb-6 rounded-b-[2rem]">
                <div>
                  <label className="block text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Modelo de Negócio</label>
                  <select name="partnershipType" defaultValue={editingPartner?.partnershipType || 'PERMUTA'} required className="w-full bg-white dark:bg-zinc-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all">
                    <option value="PERMUTA">🔄 Permuta (Serviços)</option>
                    <option value="PAGO">💰 Pago (Verba Directa)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Categoria</label>
                  <select name="category" defaultValue={editingPartner?.category || 'Influenciadora'} className="w-full bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all">
                    <option>Influenciadora</option>
                    <option>Estabelecimento Local</option>
                    <option>Blog/Mídia</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Chave Pix para Repasses</label>
                  <div className="relative">
                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="pixKey" defaultValue={editingPartner?.pixKey || ''} className="w-full pl-11 pr-4 py-4 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="CPF, Celular ou Email" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Notas / Acordos Verbais</label>
                  <textarea name="notes" rows={3} defaultValue={editingPartner?.notes || ''} className="w-full bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500 resize-none" placeholder="Ex: 1 post semanal em troca de Spa dos Pés completo."></textarea>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPartnerModalOpen(false)} className="flex-1 py-4 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">Salvar Parceiro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMPAIGN MODAL - ADD/EDIT */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col border-2 border-black dark:border-zinc-700 max-h-[95vh]">
            <div className="px-6 py-4 md:py-5 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                <Tag size={18} /> {editingCampaign ? 'Ajustar Campanha' : 'Configurar Cupom'}
              </h3>
              <button onClick={() => setIsCampaignModalOpen(false)} className="p-1"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveCampaign} className="p-6 md:p-8 space-y-5 bg-white dark:bg-zinc-900 overflow-y-auto scrollbar-hide">
              <div>
                <label className="block text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5">Atrelar ao Parceiro</label>
                <select name="partnerId" defaultValue={editingCampaign?.partnerId || ''} required className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all">
                  <option value="">Selecione o influenciador...</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.socialMedia})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5">Nome da Ação</label>
                <input name="name" required defaultValue={editingCampaign?.name || ''} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-500" placeholder="Ex: Lançamento Outono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Código Único</label>
                  <input name="couponCode" required defaultValue={editingCampaign?.couponCode || ''} className="w-full bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 text-sm font-mono font-black uppercase text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400" placeholder="EX: AMINNA10" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5">Tipo de Bônus</label>
                  <select name="discountType" defaultValue={editingCampaign?.discountType || 'PERCENTAGE'} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all">
                    <option value="PERCENTAGE">Percentual (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-3xl">
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Valor Off</label>
                  <input name="discountValue" type="number" step="0.01" required defaultValue={editingCampaign?.discountValue || ''} className="w-full bg-white dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-4 text-lg font-black text-emerald-800 dark:text-emerald-400 outline-none placeholder:text-emerald-300" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Limite de Usos</label>
                  <input name="maxUses" type="number" required defaultValue={editingCampaign?.maxUses || 100} min="1" className="w-full bg-white dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-4 text-lg font-black text-slate-950 dark:text-white outline-none" placeholder="100" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 pb-4">
                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="flex-1 py-4 text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest">Descartar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                  {editingCampaign ? 'Atualizar Cupom' : 'Ativar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
