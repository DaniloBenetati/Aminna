
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
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);

  // Dynamic social media tags
  const [socialMediaInputs, setSocialMediaInputs] = useState<string[]>(['']);
  const [thermometerValue, setThermometerValue] = useState<'QUENTE' | 'FRIO' | 'MORNO'>('MORNO');

  // Stats
  const totalPartnerRevenue = campaigns.reduce((acc, c) => acc + c.totalRevenueGenerated, 0);
  const totalPartnerAppointments = campaigns.reduce((acc, c) => acc + c.useCount, 0);
  const topCampaign = [...campaigns].sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated)[0];

  const handleOpenPartnerModal = (partner: Partner | null = null) => {
    setEditingPartner(partner);
    // Initialize social media list: try new list first, then legacy fields, then default empty
    if (partner) {
      if (partner.socialMediaList && partner.socialMediaList.length > 0) {
        setSocialMediaInputs(partner.socialMediaList);
      } else {
        const legacy = [partner.socialMedia];
        if (partner.socialMediaSecondary) legacy.push(partner.socialMediaSecondary);
        setSocialMediaInputs(legacy.filter(s => s && s.trim() !== ''));
      }
      setThermometerValue(partner.thermometer || 'MORNO');
    } else {
      setSocialMediaInputs(['']);
      setThermometerValue('MORNO');
    }
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
    const finalSocialMediaList = socialMediaInputs.filter(s => s.trim() !== '');
    
    const partnerData = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      social_media: finalSocialMediaList[0] || '',
      social_media_secondary: finalSocialMediaList[1] || '',
      social_media_list: finalSocialMediaList,
      thermometer: thermometerValue,
      category: (form.elements.namedItem('category') as HTMLSelectElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      document: (form.elements.namedItem('document') as HTMLInputElement).value,
      address: (form.elements.namedItem('address') as HTMLInputElement).value,
      partnership_type: (form.elements.namedItem('partnershipType') as HTMLSelectElement).value,
      pix_key: (form.elements.namedItem('pixKey') as HTMLInputElement).value,
      contract_scope: (form.elements.namedItem('contractScope') as HTMLTextAreaElement).value,
      contract_url: (form.elements.namedItem('contractUrl') as HTMLInputElement).value,
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
          socialMediaSecondary: partnerData.social_media_secondary,
          socialMediaList: partnerData.social_media_list,
          thermometer: partnerData.thermometer,
          category: partnerData.category,
          phone: partnerData.phone,
          email: partnerData.email,
          document: partnerData.document,
          address: partnerData.address,
          partnershipType: partnerData.partnership_type as any,
          pixKey: partnerData.pix_key,
          contractScope: partnerData.contract_scope,
          contractUrl: partnerData.contract_url,
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
            socialMediaSecondary: partnerData.social_media_secondary,
            socialMediaList: partnerData.social_media_list,
            thermometer: partnerData.thermometer,
            category: partnerData.category,
            phone: partnerData.phone,
            email: partnerData.email,
            document: partnerData.document,
            address: partnerData.address,
            partnershipType: partnerData.partnership_type as any,
            pixKey: partnerData.pix_key,
            contractScope: partnerData.contract_scope,
            contractUrl: partnerData.contract_url,
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
      if (editingCampaign && editingCampaign.id) {
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
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Parcerias Aminna</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleOpenPartnerModal()}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all w-full sm:w-auto"
          >
            <Plus size={16} /> <span className="sm:inline">Novo Parceiro</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-3 md:gap-4 transition-all">
          <div className="p-3 md:p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl shadow-inner flex-shrink-0"><TrendingUp size={24} className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">Receita Gerada</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">R$ {totalPartnerRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-3 md:gap-4 transition-all">
          <div className="p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-2xl shadow-inner flex-shrink-0"><CheckCircle size={24} className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">Atendimentos</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">{totalPartnerAppointments}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-3 md:gap-4 transition-all sm:col-span-2 lg:col-span-1">
          <div className="p-3 md:p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl shadow-inner flex-shrink-0"><Handshake size={24} className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">Top Parceiro</p>
            <p className="text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
              {partners.find(p => p.id === topCampaign?.partnerId)?.name || 'Nenhum'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Unified Partners & Coupons List */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="font-black text-slate-800 dark:text-white uppercase text-[10px] tracking-widest flex items-center gap-2"><Users size={16} /> Parceiros e Campanhas</h3>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar parceiro..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 p-2">
            {filteredPartners.map(p => {
              const partnerCampaigns = campaigns.filter(c => c.partnerId === p.id);
              
              return (
                <div key={p.id} className={`p-2 rounded-[2rem] transition-all flex flex-col ${!p.active ? 'opacity-40 grayscale' : ''}`}>
                  <div className="p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group bg-slate-50/30 dark:bg-zinc-800/20 border border-slate-100 dark:border-zinc-800/50">
                    <div className="flex gap-4 items-center min-w-0 w-full sm:w-auto">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400 flex-shrink-0 border-2 ${p.active ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'}`}>
                        <Smartphone size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-1">
                          <p className="font-black text-slate-950 dark:text-white text-sm leading-tight truncate">{p.name}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                            {p.socialMediaList && p.socialMediaList.length > 0 ? (
                              p.socialMediaList.map((sm, idx) => (
                                <span key={idx} className="text-[10px] text-indigo-800 dark:text-indigo-400 font-black truncate">
                                  {sm}
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="text-[10px] text-indigo-800 dark:text-indigo-400 font-black truncate">{p.socialMedia}</span>
                                {p.socialMediaSecondary && <span className="text-slate-400 font-bold ml-1 text-[10px]">• {p.socialMediaSecondary}</span>}
                              </>
                            )}
                          </div>
                          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border whitespace-nowrap ${p.partnershipType === 'PERMUTA' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                              {p.partnershipType}
                            </span>
                            <span className="text-[8px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-tighter border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full whitespace-nowrap bg-slate-50 dark:bg-zinc-800">{p.category}</span>
                            {p.thermometer && (
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${p.thermometer === 'QUENTE' ? 'bg-rose-50 text-rose-700 border-rose-200' : p.thermometer === 'FRIO' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                <TrendingUp size={8} /> {p.thermometer}
                              </span>
                            )}
                          </div>
                        </div>
                        {p.contractScope && (
                          <div className="mt-2 p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
                            <div className="flex items-start gap-1.5 mb-1">
                              <FileText size={12} className="text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                              <p className="text-[10px] text-slate-950 dark:text-white font-black uppercase tracking-tight">Escopo do Contrato</p>
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic line-clamp-2 pl-4">
                              {p.contractScope}
                            </p>
                            {p.contractUrl && (
                              <a 
                                href={p.contractUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-indigo-700 dark:text-indigo-400 hover:underline uppercase tracking-widest pl-4"
                              >
                                <ArrowUpRight size={10} /> Abrir Contrato Digital
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/50 pt-3 sm:pt-0 mt-1 sm:mt-0">
                      <button
                        onClick={() => togglePartnerStatus(p.id)}
                        className={`p-2.5 sm:p-2 rounded-xl transition-all ${p.active ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800'}`}
                        title={p.active ? "Desativar" : "Ativar"}
                      >
                        {p.active ? <ToggleRight size={24} className="w-6 h-6 sm:w-5 sm:h-5" /> : <ToggleLeft size={24} className="w-6 h-6 sm:w-5 sm:h-5" />}
                      </button>
                      <button
                        onClick={() => handleOpenPartnerModal(p)}
                        className="p-2.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-800 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePartner(p.id)}
                        className="p-2.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Coupons for this Partner */}
                  {partnerCampaigns.length > 0 ? (
                    <div className="mt-2 ml-4 sm:ml-12 space-y-2 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cupons e Campanhas Ativas</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {partnerCampaigns.map(c => {
                          const isFull = c.useCount >= c.maxUses;
                          return (
                            <div
                              key={c.id}
                              className="bg-white dark:bg-zinc-800/50 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm flex flex-col gap-2 relative group/coupon"
                            >
                              <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-900 dark:text-white text-[10px] uppercase truncate">{c.name}</h4>
                                  <div className={`mt-1 inline-flex px-2 py-0.5 rounded-lg font-mono font-black text-[10px] border ${isFull ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'}`}>
                                    {c.couponCode}
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/coupon:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenCampaignModal(c)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={12} /></button>
                                  <button onClick={() => handleDeleteCampaign(c.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 mt-1">
                                <div className="p-1.5 bg-slate-50 dark:bg-zinc-800 rounded-xl">
                                  <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Usos</p>
                                  <p className="text-[10px] font-black text-slate-700 dark:text-slate-300">{c.useCount}/{c.maxUses}</p>
                                </div>
                                <div className="p-1.5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl">
                                  <p className="text-[7px] font-black text-indigo-400 uppercase leading-none mb-1">Off</p>
                                  <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400">{c.discountValue}{c.discountType === 'PERCENTAGE' ? '%' : 'R$'}</p>
                                </div>
                                <div className="p-1.5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl">
                                  <p className="text-[7px] font-black text-emerald-400 uppercase leading-none mb-1">Receita</p>
                                  <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">R${c.totalRevenueGenerated.toFixed(0)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => {
                            setEditingCampaign({ partnerId: p.id });
                            setIsCampaignModalOpen(true);
                          }}
                          className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all group"
                        >
                          <Plus size={16} className="group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Novo Cupom</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 ml-4 sm:ml-12 pb-4">
                      <button
                        onClick={() => {
                          setEditingCampaign({ partnerId: p.id });
                          setIsCampaignModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-[9px] font-black text-slate-400 hover:text-indigo-500 uppercase tracking-widest transition-colors"
                      >
                        <Plus size={14} /> Adicionar primeiro cupom
                      </button>
                    </div>
                  )}
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
            <form onSubmit={handleSavePartner} className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Nome Completo / Fantasia</label>
                  <input name="name" required defaultValue={editingPartner?.name || ''} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="Ex: Maria Clara Influencer" />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest">Canais / Redes Sociais</label>
                    <button 
                      type="button" 
                      onClick={() => setSocialMediaInputs([...socialMediaInputs, ''])}
                      className="p-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 transition-all shadow-md"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {socialMediaInputs.map((value, index) => (
                      <div key={index} className="relative group">
                        <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                        <input 
                          value={value}
                          onChange={(e) => {
                            const newInputs = [...socialMediaInputs];
                            newInputs[index] = e.target.value;
                            setSocialMediaInputs(newInputs);
                          }}
                          className="w-full pl-11 pr-10 py-3 sm:py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" 
                          placeholder="@seu_perfil" 
                        />
                        {socialMediaInputs.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => setSocialMediaInputs(socialMediaInputs.filter((_, i) => i !== index))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Termômetro do Parceiro</label>
                  <div className="flex gap-2">
                    {(['QUENTE', 'MORNO', 'FRIO'] as const).map((temp) => (
                      <button
                        key={temp}
                        type="button"
                        onClick={() => setThermometerValue(temp)}
                        className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] flex flex-col items-center justify-center gap-1 transition-all ${
                          thermometerValue === temp 
                            ? temp === 'QUENTE' ? 'bg-rose-50 border-rose-600 text-rose-700 ring-2 ring-rose-600/20' : 
                              temp === 'MORNO' ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20' :
                              'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400'
                        }`}
                      >
                        <TrendingUp size={14} className={thermometerValue === temp ? 'animate-pulse' : ''} />
                        {temp}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">CPF / CNPJ</label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="document" defaultValue={editingPartner?.document || ''} className="w-full pl-11 pr-4 py-3 sm:py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="000.000.000-00" />
                  </div>
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800 pt-5">
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">WhatsApp</label>
                  <input name="phone" required defaultValue={editingPartner?.phone || ''} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="(11) 9...." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="email" type="email" defaultValue={editingPartner?.email || ''} className="w-full pl-11 pr-4 py-3 sm:py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="contato@parceiro.com" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Endereço de Correspondência</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="address" defaultValue={editingPartner?.address || ''} className="w-full pl-11 pr-4 py-3 sm:py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="Rua, Número, Bairro - Cidade" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800 pt-5 bg-indigo-50/30 dark:bg-indigo-900/10 -mx-6 px-6 pb-6 rounded-b-[2rem]">
                <div>
                  <label className="block text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Modelo de Negócio</label>
                  <select name="partnershipType" defaultValue={editingPartner?.partnershipType || 'PERMUTA'} required className="w-full bg-white dark:bg-zinc-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all">
                    <option value="PERMUTA">🔄 Permuta (Serviços)</option>
                    <option value="PAGO">💰 Pago (Verba Directa)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5">Categoria</label>
                  <select name="category" defaultValue={editingPartner?.category || 'Influenciadora'} className="w-full bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all">
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
                    <input name="pixKey" defaultValue={editingPartner?.pixKey || ''} className="w-full pl-11 pr-4 py-3 sm:py-4 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="CPF, Celular ou Email" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Link do Contrato (Drive/OneDrive)</label>
                  <div className="relative">
                    <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input name="contractUrl" type="url" defaultValue={editingPartner?.contractUrl || ''} className="w-full pl-11 pr-4 py-3 sm:py-4 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500" placeholder="https://drive.google.com/..." />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Escopo de Contrato / O que deve ser feito</label>
                  <textarea name="contractScope" rows={3} defaultValue={editingPartner?.contractScope || ''} className="w-full bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500 resize-none" placeholder="Ex: 2 stories por semana + 1 collab no feed mensal."></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Notas / Acordos Verbais</label>
                  <textarea name="notes" rows={3} defaultValue={editingPartner?.notes || ''} className="w-full bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-500 resize-none" placeholder="Ex: 1 post semanal em troca de Spa dos Pés completo."></textarea>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button type="button" onClick={() => setIsPartnerModalOpen(false)} className="flex-1 py-3 sm:py-4 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all order-1 sm:order-2">Salvar Parceiro</button>
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
                <select name="partnerId" defaultValue={editingCampaign?.partnerId || ''} required className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all">
                  <option value="">Selecione o influenciador...</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.socialMedia})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5">Nome da Ação</label>
                <input name="name" required defaultValue={editingCampaign?.name || ''} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-500" placeholder="Ex: Lançamento Outono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Código Único</label>
                  <input name="couponCode" required defaultValue={editingCampaign?.couponCode || ''} className="w-full bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 sm:p-4 text-sm font-mono font-black uppercase text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400" placeholder="EX: AMINNA10" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5">Tipo de Bônus</label>
                  <select name="discountType" defaultValue={editingCampaign?.discountType || 'PERCENTAGE'} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all">
                    <option value="PERCENTAGE">Percentual (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-emerald-50/50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-3xl">
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Valor Off</label>
                  <input name="discountValue" type="number" step="0.01" required defaultValue={editingCampaign?.discountValue || ''} className="w-full bg-white dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-3 sm:p-4 text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-400 outline-none placeholder:text-emerald-300" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Limite de Usos</label>
                  <input name="maxUses" type="number" required defaultValue={editingCampaign?.maxUses || 100} min="1" className="w-full bg-white dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-3 sm:p-4 text-base sm:text-lg font-black text-slate-950 dark:text-white outline-none" placeholder="100" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-4">
                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="flex-1 py-3 sm:py-4 text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest order-2 sm:order-1">Descartar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all order-1 sm:order-2">
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
