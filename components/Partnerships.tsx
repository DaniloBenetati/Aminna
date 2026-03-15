
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

import { Plus, Search, Handshake, Tag, TrendingUp, Users, Smartphone, X, Check, ArrowUpRight, BarChart2, Mail, MapPin, FileText, CreditCard, Edit2, ToggleLeft, ToggleRight, Trash2, Calendar, CheckCircle, ChevronDown, Gift, Package } from 'lucide-react';
import { Partner, Campaign, PartnerExchange } from '../types';
import { PartnerProducts } from './PartnerProducts';

interface PartnershipsProps {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  partnerExchanges: PartnerExchange[];
  setPartnerExchanges: React.Dispatch<React.SetStateAction<PartnerExchange[]>>;
}

export const Partnerships: React.FC<PartnershipsProps> = ({ 
  partners, 
  setPartners, 
  campaigns, 
  setCampaigns,
  partnerExchanges,
  setPartnerExchanges
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'INFLUENCERS' | 'PRODUCTS'>('INFLUENCERS');
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
        
        {/* Main Tabs */}
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveSubTab('INFLUENCERS')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'INFLUENCERS' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Users size={16} /> Influenciadores
          </button>
          <button 
            onClick={() => setActiveSubTab('PRODUCTS')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'PRODUCTS' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Gift size={16} /> Parceiros Produtos
          </button>
        </div>
      </div>

      {activeSubTab === 'INFLUENCERS' ? (
        <>
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
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar parceiro..."
                      className="w-full sm:w-64 pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-slate-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button onClick={() => handleOpenPartnerModal()} className="p-2 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 transition-all shadow-md"><Plus size={18} /></button>
                </div>
              </div>
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 p-2">
                {filteredPartners.filter(p => !p.partnerType || p.partnerType === 'Influenciador').map(p => {
                  const partnerCampaigns = campaigns.filter(c => c.partnerId === p.id);
                  return (
                    <div key={p.id} className={`p-2 rounded-[2rem] transition-all flex flex-col ${!p.active ? 'opacity-40 grayscale' : ''}`}>
                      <div className="p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group bg-slate-50/30 dark:bg-zinc-800/20 border border-slate-100 dark:border-zinc-800/50">
                        <div className="flex gap-4 items-center min-w-0 w-full sm:w-auto">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-600 flex-shrink-0 border-2 ${p.active ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-700' : 'bg-slate-100 border-slate-200'}`}>
                            <Smartphone size={24} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-1">
                              <p className="font-black text-slate-950 dark:text-white text-sm leading-tight truncate">{p.name}</p>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                {p.socialMediaList && p.socialMediaList.length > 0 ? (
                                  p.socialMediaList.map((sm, idx) => (
                                    <span key={idx} className="text-[10px] text-indigo-800 font-black truncate">{sm}</span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-indigo-800 font-black truncate">{p.socialMedia}</span>
                                )}
                              </div>
                              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border whitespace-nowrap ${p.partnershipType === 'PERMUTA' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{p.partnershipType}</span>
                                <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap bg-slate-50">{p.category}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => togglePartnerStatus(p.id)} className={`p-2 rounded-xl transition-all ${p.active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}><ToggleRight size={24} /></button>
                          <button onClick={() => handleOpenPartnerModal(p)} className="p-2 text-slate-500 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeletePartner(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                      
                      {/* Coupons */}
                      <div className="mt-2 ml-4 sm:ml-12 space-y-2 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {partnerCampaigns.map(c => (
                            <div key={c.id} className="bg-white dark:bg-zinc-800/50 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm flex flex-col gap-2 group/coupon">
                              <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-900 dark:text-white text-[10px] uppercase truncate">{c.name}</h4>
                                  <div className="mt-1 inline-flex px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 font-mono font-black text-[10px] border border-indigo-200 uppercase">{c.couponCode}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/coupon:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenCampaignModal(c)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={12} /></button>
                                  <button onClick={() => handleDeleteCampaign(c.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <div className="px-2 py-1 bg-slate-50 rounded-lg text-[8px] font-black uppercase text-slate-500">Usos: {c.useCount}/{c.maxUses}</div>
                                <div className="px-2 py-1 bg-emerald-50 rounded-lg text-[8px] font-black uppercase text-emerald-700">R$ {c.totalRevenueGenerated.toFixed(0)}</div>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => { setEditingCampaign({ partnerId: p.id }); setIsCampaignModalOpen(true); }}
                            className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all group"
                          >
                            <Plus size={16} /> <span className="text-[9px] font-black uppercase tracking-widest">Novo Cupom</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <PartnerProducts 
          partners={partners} 
          setPartners={setPartners} 
          partnerExchanges={partnerExchanges} 
          setPartnerExchanges={setPartnerExchanges} 
          campaigns={campaigns}
        />
      )}

      {/* MODALS (INFLUENCER) */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-black">
            <div className="px-6 py-4 bg-zinc-950 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tight flex items-center gap-2"><Users size={20} /> {editingPartner ? 'Editar Influenciador' : 'Novo Cadastro'}</h3>
              <button onClick={() => setIsPartnerModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSavePartner} className="p-6 md:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nome Completo</label>
                  <input name="name" required defaultValue={editingPartner?.name || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Redes Sociais (Separe por vírgula)</label>
                  <input 
                    defaultValue={socialMediaInputs.join(', ')} 
                    onChange={(e) => setSocialMediaInputs(e.target.value.split(',').map(s => s.trim()))}
                    className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" 
                    placeholder="@perfil1, @perfil2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">WhatsApp</label>
                  <input name="phone" required defaultValue={editingPartner?.phone || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de Parceria</label>
                  <select name="partnershipType" defaultValue={editingPartner?.partnershipType || 'PERMUTA'} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600">
                    <option value="PERMUTA">Permuta</option>
                    <option value="PAGO">Pago</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Categoria (Influenciadora, Atleta, etc)</label>
                  <input name="category" defaultValue={editingPartner?.category || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Notas / Acordos</label>
                  <textarea name="notes" rows={3} defaultValue={editingPartner?.notes || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPartnerModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-zinc-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">Salvar Parceiro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border-2 border-black">
            <div className="px-6 py-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><Tag size={18} /> {editingCampaign?.id ? 'Atualizar Cupom' : 'Novo Cupom'}</h3>
              <button onClick={() => setIsCampaignModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveCampaign} className="p-6 md:p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Atrelar ao Parceiro</label>
                <select name="partnerId" defaultValue={editingCampaign?.partnerId || ''} required className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600">
                  <option value="">Selecione...</option>
                  {partners.filter(p => !p.partnerType || p.partnerType === 'Influenciador').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nome do Cupom</label>
                <input name="name" required defaultValue={editingCampaign?.name || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" placeholder="Ex: Campanha Março" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Código</label>
                  <input name="couponCode" required defaultValue={editingCampaign?.couponCode || ''} className="w-full p-4 bg-indigo-50 text-indigo-800 font-mono font-black rounded-2xl text-xs outline-none focus:border-indigo-600 uppercase" placeholder="CODIGO10" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Desconto</label>
                  <input name="discountValue" type="number" step="0.01" required defaultValue={editingCampaign?.discountValue || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" placeholder="10.00" />
                  <input type="hidden" name="discountType" value="PERCENTAGE" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Limite de Usos</label>
                <input name="maxUses" type="number" required defaultValue={editingCampaign?.maxUses || 100} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest">Descartar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-800 transition-all">Salvar Cupom</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
