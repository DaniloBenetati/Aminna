
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

import { Plus, Search, Handshake, Tag, TrendingUp, Users, Smartphone, X, Check, ArrowUpRight, BarChart2, Mail, MapPin, FileText, CreditCard, Edit2, ToggleLeft, ToggleRight, Trash2, Calendar, CircleCheck, ChevronDown, Gift, Package, DollarSign, Share2 } from 'lucide-react';
import { Partner, Campaign, PartnerExchange, Appointment, Customer, Service } from '../types';
import { PartnerProducts } from './PartnerProducts';

interface PartnershipsProps {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  partnerExchanges: PartnerExchange[];
  setPartnerExchanges: React.Dispatch<React.SetStateAction<PartnerExchange[]>>;
  appointments: Appointment[];
  customers: Customer[];
  services: Service[];
}

export const Partnerships: React.FC<PartnershipsProps> = ({ 
  partners, 
  setPartners, 
  campaigns, 
  setCampaigns,
  partnerExchanges,
  setPartnerExchanges,
  appointments,
  customers,
  services
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'INFLUENCERS' | 'PRODUCTS' | 'ANALYSIS'>('INFLUENCERS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [agendaFilter, setAgendaFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [customerSearch, setCustomerSearch] = useState('');
  const [analysisDateRange, setAnalysisDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Drill Down State for Mobile
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // Modals State
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Dynamic social media tags
  const [socialMediaInputs, setSocialMediaInputs] = useState<string[]>(['']);
  const [thermometerValue, setThermometerValue] = useState<'QUENTE' | 'FRIO' | 'MORNO'>('MORNO');

  // Calculate dynamic stats per campaign
  const campaignsWithStats = campaigns.map(c => {
    const matchingAppts = appointments.filter(a => 
      a.appliedCoupon === c.couponCode && 
      a.status === 'Concluído' &&
      a.date >= analysisDateRange.start &&
      a.date <= analysisDateRange.end
    );
    const dynamicUseCount = matchingAppts.length;
    const dynamicRevenue = matchingAppts.reduce((acc, a) => acc + (a.pricePaid || 0), 0);
    
    // Calculate Investment from Linked Customer (Permuta)
    const partner = partners.find(p => p.id === c.partnerId);
    let linkedInvestment = 0;
    if (partner?.linkedCustomerId) {
      linkedInvestment = appointments
        .filter(a => a.customerId === partner.linkedCustomerId && a.status === 'Concluído')
        .reduce((acc, a) => acc + (a.bookedPrice || a.amount || 0), 0);
    }
    
    return {
      ...c,
      useCount: dynamicUseCount,
      totalRevenueGenerated: dynamicRevenue,
      investmentValue: (c.investmentValue || 0) + linkedInvestment
    };
  });

  // Stats
  const totalPartnerRevenue = campaignsWithStats.reduce((acc, c) => acc + c.totalRevenueGenerated, 0);
  const totalPartnerAppointments = campaignsWithStats.reduce((acc, c) => acc + c.useCount, 0);
  const totalInvestment = campaignsWithStats.reduce((acc, c) => acc + (c.investmentValue || 0), 0);
  const topCampaign = [...campaignsWithStats].sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated)[0];
  const uniqueCouponCustomers = new Set(
    appointments
      .filter(a => a.appliedCoupon && a.status === 'Concluído' && a.date >= analysisDateRange.start && a.date <= analysisDateRange.end)
      .map(a => a.customerId)
  ).size;

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const monthlyImpact = appointments
    .filter(a => a.appliedCoupon && a.status === 'Concluído' && a.date.startsWith(currentMonthStr))
    .reduce((acc, a) => acc + (a.pricePaid || 0), 0);

  const handleOpenPartnerModal = (partner: Partner | null = null) => {
    setEditingPartner(partner);
    setCustomerSearch('');
    setIsCustomerDropdownOpen(false);
    setSelectedCustomerId(partner?.linkedCustomerId || null);
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
    
    const getVal = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || '';
    
    const partnerData = {
      name: getVal('name'),
      social_media: finalSocialMediaList[0] || '',
      social_media_secondary: finalSocialMediaList[1] || '',
      social_media_list: finalSocialMediaList,
      thermometer: thermometerValue,
      category: getVal('category'),
      phone: getVal('phone'),
      email: getVal('email'),
      document: getVal('document'),
      address: getVal('address'),
      partnership_type: getVal('partnershipType'),
      pix_key: getVal('pixKey'),
      contract_scope: getVal('contractScope'),
      contract_url: getVal('contractUrl'),
      notes: getVal('notes'),
      partner_type: 'Influenciador',
      active: editingPartner ? editingPartner.active : true,
      linked_customer_id: selectedCustomerId // Use state directly
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
          partnerType: 'Influenciador',
          active: partnerData.active,
          linkedCustomerId: partnerData.linked_customer_id
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
            active: partnerData.active,
            linkedCustomerId: partnerData.linked_customer_id
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
      investment_value: parseFloat((form.elements.namedItem('investmentValue') as HTMLInputElement).value) || 0,
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
          maxUses: campaignData.max_uses,
          investmentValue: campaignData.investment_value
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
            investmentValue: campaignData.investment_value,
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

  const handleVideomakerReport = () => {
    const reportData = partners
      .filter(p => p.active && p.linkedCustomerId)
      .map(p => {
        const pAppts = appointments
          .filter(a => 
            a.customerId === p.linkedCustomerId && 
            a.date >= new Date().toISOString().split('T')[0] && 
            (a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'Em atendimento')
          )
          .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        return { partner: p, appts: pAppts };
      })
      .filter(item => item.appts.length > 0)
      .sort((a, b) => {
        const firstA = a.appts[0].date + a.appts[0].time;
        const firstB = b.appts[0].date + b.appts[0].time;
        return firstA.localeCompare(firstB);
      });

    if (reportData.length === 0) {
      alert("Nenhum agendamento futuro encontrado para influenciadoras ativas.");
      return;
    }

    const printContent = `
      <html>
        <head>
          <title>Relatório para Videomaker - Aminna</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
            .header p { margin: 5px 0 0; color: #666; font-weight: 700; font-size: 12px; }
            .influencer-section { margin-bottom: 30px; page-break-inside: avoid; }
            .name { font-size: 16px; font-weight: 900; color: #4f46e5; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid #4f46e5; padding-left: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #999; padding: 8px 12px; border-bottom: 1px solid #eee; }
            td { padding: 12px; border-bottom: 1px solid #f9f9f9; font-size: 12px; font-weight: 700; }
            .status { font-size: 10px; text-transform: uppercase; padding: 2px 8px; rounded: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Gravações (Influencers)</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          ${reportData.map(item => `
            <div class="influencer-section">
              <div class="name">${item.partner.name}</div>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Serviço</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${item.appts.map(appt => {
                    const srv = services.find(s => s.id === appt.serviceId);
                    const dateFormatted = new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR');
                    return `
                      <tr>
                        <td>${dateFormatted}</td>
                        <td>${appt.time}</td>
                        <td>${srv?.name || '---'}</td>
                        <td><span class="status">${appt.status}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
    }
  };

  const handleWhatsappReport = () => {
    const reportData = partners
      .filter(p => p.active && p.linkedCustomerId)
      .map(p => {
        const pAppts = appointments
          .filter(a => 
            a.customerId === p.linkedCustomerId && 
            a.date >= new Date().toISOString().split('T')[0] && 
            (a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'Em atendimento')
          )
          .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        return { partner: p, appts: pAppts };
      })
      .filter(item => item.appts.length > 0)
      .sort((a, b) => {
        const firstA = a.appts[0].date + a.appts[0].time;
        const firstB = b.appts[0].date + b.appts[0].time;
        return firstA.localeCompare(firstB);
      });

    if (reportData.length === 0) {
      alert("Nenhum agendamento futuro encontrado para influenciadoras ativas.");
      return;
    }

    let message = `*RELATÓRIO DE GRAVAÇÕES - AMINNA*\n`;
    message += `_Gerado em: ${new Date().toLocaleString('pt-BR')}_\n\n`;

    reportData.forEach(item => {
      message += `\n*INFLUENCIADORA: ${item.partner.name.toUpperCase()}*\n`;
      item.appts.forEach(appt => {
        const srv = services.find(s => s.id === appt.serviceId);
        const dateFormatted = new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR');
        message += `[AGENDA]: ${dateFormatted} às ${appt.time}\n`;
        message += `[SERVIÇO]: ${srv?.name || '---'}\n`;
      });
      message += `----------------------------\n`;
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.socialMedia.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' ? true : 
                         statusFilter === 'ACTIVE' ? p.active : !p.active;

    const partnerAppts = appointments.filter(a => 
      a.customerId === p.linkedCustomerId && 
      a.date >= new Date().toISOString().split('T')[0] && 
      (a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'Em atendimento')
    );

    const hasAgenda = partnerAppts.length > 0;
    const matchesAgenda = agendaFilter === 'ALL' ? true :
                         agendaFilter === 'YES' ? hasAgenda : !hasAgenda;
    
    return matchesSearch && matchesStatus && matchesAgenda;
  });

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
          <button 
            onClick={() => setActiveSubTab('ANALYSIS')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'ANALYSIS' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <BarChart2 size={16} /> Análises
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
              <div className="p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-2xl shadow-inner flex-shrink-0"><CircleCheck size={24} className="w-5 h-5 md:w-6 md:h-6" /></div>
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
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {/* Status Filter Toggle */}
                  <div className="flex bg-white dark:bg-zinc-800 p-1 rounded-xl border-2 border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden min-w-fit">
                    <button
                      onClick={() => setStatusFilter('ACTIVE')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${statusFilter === 'ACTIVE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
                    >
                      Ativos
                    </button>
                    <button
                      onClick={() => setStatusFilter('INACTIVE')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
                    >
                      Inativos
                    </button>
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${statusFilter === 'ALL' ? 'bg-slate-900 dark:bg-white dark:text-black text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
                    >
                      Todos
                    </button>
                  </div>

                  {/* Agenda Filter Toggle */}
                  <div className="flex bg-white dark:bg-zinc-800 p-1 rounded-xl border-2 border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden min-w-fit">
                    <span className="px-2 py-1.5 text-[8px] font-black text-slate-400 uppercase self-center border-r-2 border-slate-100 dark:border-zinc-700 mr-1">Agenda</span>
                    <button
                      onClick={() => setAgendaFilter('YES')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${agendaFilter === 'YES' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setAgendaFilter('NO')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${agendaFilter === 'NO' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
                    >
                      Não
                    </button>
                    <button
                      onClick={() => setAgendaFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${agendaFilter === 'ALL' ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-700'}`}
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar parceiro..."
                      className="w-full sm:w-48 pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-slate-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Report Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleWhatsappReport}
                      title="Enviar por WhatsApp"
                      className="p-2 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-green-600 hover:border-green-600 transition-all flex items-center gap-2"
                    >
                      <Share2 size={18} />
                      <span className="text-[9px] font-black uppercase hidden lg:inline">Relatório WhatsApp</span>
                    </button>
                  </div>

                  <button onClick={() => handleOpenPartnerModal()} className="p-2 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 transition-all shadow-md"><Plus size={18} /></button>
                </div>
              </div>
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 p-2">
                {filteredPartners.filter(p => !p.partnerType || p.partnerType === 'Influenciador').map(p => {
                  const partnerCampaigns = campaignsWithStats.filter(c => c.partnerId === p.id);
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
                              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border whitespace-nowrap ${p.partnershipType === 'PERMUTA' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{p.partnershipType}</span>
                                <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap bg-slate-50">{p.category}</span>
                                {p.thermometer && (
                                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border whitespace-nowrap ${
                                    p.thermometer === 'QUENTE' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                    p.thermometer === 'MORNO' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    'bg-blue-50 text-blue-600 border-blue-200'
                                  }`}>
                                    {p.thermometer}
                                  </span>
                                )}
                              </div>
                            </div>
                            {(p.contractScope || p.contractUrl) && (
                              <div className="mt-2 flex flex-col gap-1 px-1">
                                {p.contractScope && (
                                  <div className="flex items-start gap-2">
                                    <FileText size={12} className="text-slate-400 mt-0.5" />
                                    <p className="text-[10px] text-slate-500 font-bold leading-tight line-clamp-2">{p.contractScope}</p>
                                  </div>
                                )}
                                {p.contractUrl && (
                                  <a 
                                    href={p.contractUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-[10px] text-indigo-600 font-black hover:underline w-fit"
                                  >
                                    <ArrowUpRight size={12} /> Ver Contrato (Drive)
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Agenda Section */}
                        {p.linkedCustomerId && (
                          <div className="flex-1 min-w-[140px] border-l border-slate-100 dark:border-zinc-800/50 pl-4 hidden md:block">
                            <div className="flex items-center gap-1 mb-1.5 uppercase tracking-widest text-slate-400 font-black text-[8px]">
                              <Calendar size={12} className="text-indigo-600" />
                              <span>Agenda</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {appointments
                                .filter(a => a.customerId === p.linkedCustomerId && (a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'Em atendimento'))
                                .filter(a => a.date >= new Date().toISOString().split('T')[0])
                                .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
                                .slice(0, 3)
                                .map(appt => {
                                  const srv = services.find(s => s.id === appt.serviceId);
                                  const dateObj = new Date(appt.date + 'T12:00:00');
                                  return (
                                    <div key={appt.id} className="inline-flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-700/50 shadow-sm relative pr-3">
                                      <div className="flex flex-col items-center justify-center w-7 h-7 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                        <span className="text-[7px] font-black leading-none text-indigo-400">{dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')}</span>
                                        <span className="text-xs font-black leading-none text-indigo-700 dark:text-indigo-300">{dateObj.getDate()}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[9px] font-black text-slate-950 dark:text-white truncate uppercase max-w-[80px] leading-none mb-1">{srv?.name || 'Serviço'}</p>
                                        <p className="text-[8px] font-bold text-slate-500 leading-none">{appt.time}</p>
                                      </div>
                                      <div className={`w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-0.5 ${appt.status === 'Confirmado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    </div>
                                  );
                                })}
                              {appointments.filter(a => a.customerId === p.linkedCustomerId && a.date >= new Date().toISOString().split('T')[0] && (a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'Em atendimento')).length === 0 && (
                                <p className="text-[8px] font-black text-slate-400 italic uppercase">Sem agendamentos</p>
                              )}
                            </div>
                          </div>
                        )}

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
                              <div className="flex flex-wrap gap-2">
                                <div className="px-2 py-1 bg-slate-50 dark:bg-zinc-800 rounded-lg text-[8px] font-black uppercase text-slate-500 whitespace-nowrap">Usos: {c.useCount}/{c.maxUses}</div>
                                <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-[8px] font-black uppercase text-emerald-700 dark:text-emerald-400 whitespace-nowrap" title="Faturamento Gerado">Fat: R$ {c.totalRevenueGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                                <div className="px-2 py-1 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-[8px] font-black uppercase text-rose-700 dark:text-rose-400 whitespace-nowrap" title="Investimento (Fixo + Permuta)">Inv: R$ {(c.investmentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
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
      ) : activeSubTab === 'ANALYSIS' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
             <div className="flex items-center gap-2 px-2">
               <Calendar size={18} className="text-indigo-600" />
               <input 
                 type="date" 
                 value={analysisDateRange.start} 
                 onChange={(e) => setAnalysisDateRange(prev => ({ ...prev, start: e.target.value }))}
                 className="bg-transparent text-[10px] font-black uppercase outline-none focus:text-indigo-600 dark:text-white cursor-pointer"
               />
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">até</span>
               <input 
                 type="date" 
                 value={analysisDateRange.end} 
                 onChange={(e) => setAnalysisDateRange(prev => ({ ...prev, end: e.target.value }))}
                 className="bg-transparent text-[10px] font-black uppercase outline-none focus:text-indigo-600 dark:text-white cursor-pointer"
               />
             </div>
             <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 mx-2 hidden sm:block"></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               Filtrando <span className="text-indigo-600">{campaignsWithStats.reduce((acc, c) => acc + c.useCount, 0)}</span> atendimentos no período
             </p>
          </div>

          {/* Analysis KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-3">
                <TrendingUp size={20} />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Faturamento Campanha</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">R$ {totalPartnerRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Impacto Total</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mb-3">
                <Users size={20} />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Clientes Únicos</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{uniqueCouponCustomers}</p>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Novos & Recorrentes</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 mb-3">
                <Calendar size={20} />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Impacto Mensal</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">R$ {monthlyImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">Mês Atual</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 mb-3">
                <ArrowUpRight size={20} />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ROI Real</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {totalInvestment > 0 ? ((totalPartnerRevenue - totalInvestment) / totalInvestment).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'x' : '0.0x'}
              </p>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Lucro / Invest.</span>
              </div>
            </div>
          </div>

          {/* New row for more metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl"><Smartphone size={20} /></div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">CPA (Custo Aquisição)</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">R$ {totalPartnerAppointments > 0 ? (totalInvestment / totalPartnerAppointments).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl"><DollarSign size={20} /></div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Investimento Total</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">R$ {totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><BarChart2 size={20} /></div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Ticket Médio Geral</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">R$ {totalPartnerAppointments > 0 ? (totalPartnerRevenue / totalPartnerAppointments).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
              </div>
            </div>
          </div>

          {/* Detailed Performance List */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-600" /> Desempenho por Campanha
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/50">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Campanha / Parceiro</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">Atendimentos</th>
                     <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Faturamento</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Investimento</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Ticket Médio</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">ROI</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {campaignsWithStats.sort((a,b) => b.totalRevenueGenerated - a.totalRevenueGenerated).map(c => {
                    const partner = partners.find(p => p.id === c.partnerId);
                    const avgTicket = c.useCount > 0 ? c.totalRevenueGenerated / c.useCount : 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{c.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{partner?.name || '---'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">{c.useCount}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">R$ {c.totalRevenueGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">R$ {(c.investmentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end">
                            <span className={`text-[10px] font-black tracking-tighter px-2 py-0.5 rounded-full ${
                              (c.investmentValue || 0) > 0 && c.totalRevenueGenerated > (c.investmentValue || 0)
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'
                                : 'bg-slate-50 text-slate-500 dark:bg-zinc-800'
                            }`}>
                              {(c.investmentValue || 0) > 0 
                                ? ((c.totalRevenueGenerated - (c.investmentValue || 0)) / (c.investmentValue || 0)).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'x'
                                : '0.0x'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${c.useCount >= c.maxUses ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                            {c.useCount >= c.maxUses ? 'Esgotado' : 'Ativo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Status da Parceria (Termômetro)</label>
                  <div className="flex gap-2">
                    {(['QUENTE', 'MORNO', 'FRIO'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setThermometerValue(value)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                          thermometerValue === value 
                            ? (value === 'QUENTE' ? 'bg-orange-50 border-orange-600 text-orange-600' : value === 'MORNO' ? 'bg-amber-50 border-amber-600 text-amber-600' : 'bg-blue-50 border-blue-600 text-blue-600')
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Vincular Cliente (Para cálculo de Permuta/Custo)</label>
                  <div className="relative group/searchable">
                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Digite o nome ou celular para buscar..." 
                        value={customerSearch}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 transition-all shadow-sm"
                      />
                    </div>
                    
                    {isCustomerDropdownOpen && customerSearch.length > 0 && (
                      <div className="absolute z-[110] left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border-2 border-black rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                        <div className="sticky top-0 bg-slate-50 dark:bg-zinc-800 p-2 border-b border-slate-100 dark:border-zinc-700 text-[8px] font-black uppercase text-slate-400 tracking-widest flex justify-between items-center">
                          <span>Resultados da busca</span>
                          <button type="button" onClick={() => setIsCustomerDropdownOpen(false)} className="text-rose-500 hover:text-rose-600"><X size={12} /></button>
                        </div>
                        {customers
                          .filter(c => 
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                            (c.phone && c.phone.includes(customerSearch))
                          )
                          .sort((a,b) => a.name.localeCompare(b.name))
                          .slice(0, 50)
                          .map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCustomerSearch(c.name);
                                setSelectedCustomerId(c.id);
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between border-b border-slate-50 dark:border-zinc-800 last:border-0 group/item"
                            >
                              <div>
                                <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 group-hover/item:text-indigo-600 transition-colors">{c.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 font-mono">{c.phone || 'Sem celular'}</p>
                              </div>
                              <CircleCheck size={14} className="text-emerald-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </button>
                          ))
                        }
                        {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))).length === 0 && (
                          <div className="p-8 text-center">
                            <Users size={24} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum cliente encontrado</p>
                          </div>
                        )}
                      </div>
                    )}
                    <input type="hidden" name="linkedCustomerId" value={selectedCustomerId || ''} />
                    
                    {(!isCustomerDropdownOpen || !customerSearch) && (
                      <div className="mt-2 flex flex-col gap-2">
                        {selectedCustomerId ? (
                          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <CircleCheck size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">
                              Vinculado: {customers.find(c => c.id === selectedCustomerId)?.name || 'Cliente Selecionado'}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => {
                                setCustomerSearch('');
                                setSelectedCustomerId(null);
                              }}
                              className="ml-auto text-rose-500 hover:text-rose-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic px-2">Nenhum cliente vinculado</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Categoria (Influenciadora, Atleta, etc)</label>
                  <input name="category" defaultValue={editingPartner?.category || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Escopo do Contrato</label>
                  <textarea name="contractScope" rows={2} defaultValue={editingPartner?.contractScope || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 resize-none" placeholder="O que foi acordado? (Ex: 2 Stories/semana)" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Link do Contrato (Drive)</label>
                  <input name="contractUrl" defaultValue={editingPartner?.contractUrl || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" placeholder="https://drive.google.com/..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Observações Gerais</label>
                  <textarea name="notes" rows={2} defaultValue={editingPartner?.notes || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 resize-none" />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Limite de Usos</label>
                  <input name="maxUses" type="number" required defaultValue={editingCampaign?.maxUses || 100} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Investimento (R$)</label>
                  <input name="investmentValue" type="number" step="0.01" required defaultValue={editingCampaign?.investmentValue || 0} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" placeholder="0.00" />
                </div>
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
