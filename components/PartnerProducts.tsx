
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  Plus, Search, Edit2, Trash2, Package, Gift, Calendar, 
  MapPin, User, Smartphone, Info, CheckCircle, Clock, XCircle,
  TrendingUp, AlertCircle, ShoppingBag, Truck
} from 'lucide-react';
import { Partner, PartnerExchange, Campaign } from '../types';

interface PartnerProductsProps {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  partnerExchanges: PartnerExchange[];
  setPartnerExchanges: React.Dispatch<React.SetStateAction<PartnerExchange[]>>;
  campaigns: Campaign[];
}

export const PartnerProducts: React.FC<PartnerProductsProps> = ({ 
  partners, 
  setPartners, 
  partnerExchanges, 
  setPartnerExchanges,
  campaigns
}) => {
  const [activeView, setActiveView] = useState<'PARTNERS' | 'EXCHANGES'>('PARTNERS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editingExchange, setEditingExchange] = useState<Partial<PartnerExchange> | null>(null);

  const filteredPartners = partners.filter(p => 
    p.partnerType && // Only show if it has a type (to differentiate from legacy influencers)
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.city?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredExchanges = partnerExchanges.filter(e => {
    const partner = partners.find(p => p.id === e.partnerId);
    return (
      partner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.receivedItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.offeredItem.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const partnerData = {
      name: formData.get('name') as string,
      contact_person: formData.get('contactPerson') as string,
      phone: formData.get('phone') as string,
      social_media: formData.get('socialMedia') as string,
      partner_type: formData.get('partnerType') as string,
      city: formData.get('city') as string,
      notes: formData.get('notes') as string,
      partnership_type: 'PERMUTA', // Default for this view
      active: editingPartner ? editingPartner.active : true,
      category: 'Produto/Serviço'
    };

    try {
      if (editingPartner) {
        const { error } = await supabase.from('partners').update(partnerData).eq('id', editingPartner.id);
        if (error) throw error;
        setPartners(prev => prev.map(p => p.id === editingPartner.id ? { ...p, 
          name: partnerData.name,
          contactPerson: partnerData.contact_person,
          phone: partnerData.phone,
          socialMedia: partnerData.social_media,
          partnerType: partnerData.partner_type as any,
          city: partnerData.city,
          notes: partnerData.notes
        } : p));
      } else {
        const { data, error } = await supabase.from('partners').insert([partnerData]).select();
        if (error) throw error;
        if (data && data[0]) {
          setPartners(prev => [...prev, {
            id: data[0].id,
            name: partnerData.name,
            contactPerson: partnerData.contact_person,
            phone: partnerData.phone,
            socialMedia: partnerData.social_media,
            partnerType: partnerData.partner_type as any,
            city: partnerData.city,
            notes: partnerData.notes,
            partnershipType: 'PERMUTA',
            active: true,
            category: 'Produto/Serviço'
          } as Partner]);
        }
      }
      setIsPartnerModalOpen(false);
    } catch (err) {
      console.error('Error saving partner:', err);
      alert('Erro ao salvar parceiro');
    }
  };

  const handleSaveExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const exchangeData = {
      partner_id: formData.get('partnerId') as string,
      received_item: formData.get('receivedItem') as string,
      offered_item: formData.get('offeredItem') as string,
      estimated_value: parseFloat(formData.get('estimatedValue') as string) || 0,
      exchange_date: formData.get('exchangeDate') as string,
      campaign_id: formData.get('campaignId') as string || null,
      event_name: formData.get('eventName') as string,
      status: formData.get('status') as string,
      notes: formData.get('notes') as string
    };

    try {
      if (editingExchange && editingExchange.id) {
        const { error } = await supabase.from('partner_exchanges').update(exchangeData).eq('id', editingExchange.id);
        if (error) throw error;
        setPartnerExchanges(prev => prev.map(ex => ex.id === editingExchange.id ? { ...ex,
          partnerId: exchangeData.partner_id,
          receivedItem: exchangeData.received_item,
          offeredItem: exchangeData.offered_item,
          estimatedValue: exchangeData.estimated_value,
          exchangeDate: exchangeData.exchange_date,
          campaignId: exchangeData.campaign_id || undefined,
          eventName: exchangeData.event_name,
          status: exchangeData.status as any,
          notes: exchangeData.notes
        } : ex));
      } else {
        const { data, error } = await supabase.from('partner_exchanges').insert([exchangeData]).select();
        if (error) throw error;
        if (data && data[0]) {
          setPartnerExchanges(prev => [...prev, {
            id: data[0].id,
            partnerId: exchangeData.partner_id,
            receivedItem: exchangeData.received_item,
            offeredItem: exchangeData.offered_item,
            estimatedValue: exchangeData.estimated_value,
            exchangeDate: exchangeData.exchange_date,
            campaignId: exchangeData.campaign_id || undefined,
            eventName: exchangeData.event_name,
            status: exchangeData.status as any,
            notes: exchangeData.notes
          }]);
        }
      }
      setIsExchangeModalOpen(false);
    } catch (err) {
      console.error('Error saving exchange:', err);
      alert('Erro ao salvar permuta');
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm('Deseja excluir este parceiro?')) return;
    try {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExchange = async (id: string) => {
    if (!confirm('Deseja excluir esta permuta?')) return;
    try {
      const { error } = await supabase.from('partner_exchanges').delete().eq('id', id);
      if (error) throw error;
      setPartnerExchanges(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveView('PARTNERS')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${activeView === 'PARTNERS' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Gift size={16} /> Cadastro de Parceiros
        </button>
        <button 
          onClick={() => setActiveView('EXCHANGES')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${activeView === 'EXCHANGES' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Package size={16} /> Controle de Permutas
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={activeView === 'PARTNERS' ? "Buscar parceiro ou cidade..." : "Buscar item ou parceiro..."}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => activeView === 'PARTNERS' ? (setEditingPartner(null), setIsPartnerModalOpen(true)) : (setEditingExchange({}), setIsExchangeModalOpen(true))}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all w-full sm:w-auto"
          >
            <Plus size={18} /> {activeView === 'PARTNERS' ? 'Novo Parceiro' : 'Nova Permuta'}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-x-auto">
          {activeView === 'PARTNERS' ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-zinc-800/50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-left">Empresa / Marca</th>
                  <th className="px-6 py-4 text-left">Responsável</th>
                  <th className="px-6 py-4 text-left">Tipo</th>
                  <th className="px-6 py-4 text-left">Cidade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredPartners.length > 0 ? filteredPartners.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[10px] text-indigo-600 font-bold">{p.socialMedia}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.contactPerson || '-'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        p.partnerType === 'Produto' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        p.partnerType === 'Serviço' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        {p.partnerType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.city || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {setEditingPartner(p); setIsPartnerModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeletePartner(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic text-sm">Nenhum parceiro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-zinc-800/50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-left">Parceiro / Campanha</th>
                  <th className="px-6 py-4 text-left">Permuta</th>
                  <th className="px-6 py-4 text-left">Valor Est.</th>
                  <th className="px-6 py-4 text-left">Data</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredExchanges.length > 0 ? filteredExchanges.map(e => {
                  const partner = partners.find(p => p.id === e.partnerId);
                  const campaign = campaigns.find(c => c.id === e.campaignId);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-900 dark:text-white">{partner?.name || 'Desconhecido'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{e.eventName || campaign?.name || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Truck size={12} className="text-emerald-500" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Recebeu: {e.receivedItem}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-indigo-500" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Deu: {e.offeredItem}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-xs">
                        R$ {e.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                        {new Date(e.exchangeDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 w-fit ${
                          e.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          e.status === 'Cancelado' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          e.status === 'Em Negociação' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {e.status === 'Concluído' && <CheckCircle size={10} />}
                          {e.status === 'Em Negociação' && <Clock size={10} />}
                          {e.status === 'Cancelado' && <XCircle size={10} />}
                          {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {setEditingExchange(e); setIsExchangeModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteExchange(e.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic text-sm">Nenhuma permuta registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: PARCEIRO */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
            <div className="px-8 py-5 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tight flex items-center gap-2">
                <Gift size={20} className="text-indigo-400" />
                {editingPartner ? 'Editar Parceiro Produto' : 'Novo Parceiro Produto'}
              </h3>
              <button onClick={() => setIsPartnerModalOpen(false)}><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSavePartner} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Nome da Empresa / Marca</label>
                  <input name="name" required defaultValue={editingPartner?.name || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Responsável</label>
                  <input name="contactPerson" defaultValue={editingPartner?.contactPerson || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Zap / Telefone</label>
                  <input name="phone" required defaultValue={editingPartner?.phone || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Rede Social / Site</label>
                  <input name="socialMedia" required defaultValue={editingPartner?.socialMedia || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Cidade</label>
                  <input name="city" defaultValue={editingPartner?.city || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Tipo de Parceiro</label>
                  <div className="flex gap-2">
                    {['Produto', 'Serviço', 'Evento'].map(type => (
                      <label key={type} className="flex-1">
                        <input 
                          type="radio" 
                          name="partnerType" 
                          value={type} 
                          defaultChecked={editingPartner?.partnerType === type || (type === 'Produto' && !editingPartner)}
                          className="sr-only peer"
                        />
                        <div className="text-center py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase cursor-pointer peer-checked:bg-indigo-50 peer-checked:border-indigo-600 peer-checked:text-indigo-600 transition-all">
                          {type}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Observações</label>
                  <textarea name="notes" defaultValue={editingPartner?.notes || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 h-24 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPartnerModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-2xl">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PERMUTA */}
      {isExchangeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
            <div className="px-8 py-5 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tight flex items-center gap-2">
                <Package size={20} />
                {editingExchange?.id ? 'Editar Permuta' : 'Nova Permuta'}
              </h3>
              <button onClick={() => setIsExchangeModalOpen(false)}><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSaveExchange} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Selecionar Parceiro</label>
                  <select name="partnerId" required defaultValue={editingExchange?.partnerId || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600">
                    <option value="">Selecione um parceiro produto...</option>
                    {partners.filter(p => p.partnerType).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.partnerType})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Produto/Serviço Recebido</label>
                  <input name="receivedItem" required defaultValue={editingExchange?.receivedItem || ''} className="w-full p-4 bg-emerald-50/30 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/50 rounded-2xl text-xs font-black outline-none focus:border-emerald-500" placeholder="Ex: 50 Amaciantes" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contrapartida Oferecida</label>
                  <input name="offeredItem" required defaultValue={editingExchange?.offeredItem || ''} className="w-full p-4 bg-indigo-50/30 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-xs font-black outline-none focus:border-indigo-500" placeholder="Ex: 2 Stories + 1 Feed" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Valor Estimado (R$)</label>
                  <input name="estimatedValue" type="number" step="0.01" required defaultValue={editingExchange?.estimatedValue || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Data da Parceria</label>
                  <input name="exchangeDate" type="date" required defaultValue={editingExchange?.exchangeDate || new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Evento ou Campanha Vinculada</label>
                  <input name="eventName" defaultValue={editingExchange?.eventName || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" placeholder="Ex: Campanha de Inverno" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Status da Permuta</label>
                  <select name="status" defaultValue={editingExchange?.status || 'Pendente'} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600">
                    <option>Pendente</option>
                    <option>Em Negociação</option>
                    <option>Concluído</option>
                    <option>Cancelado</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Observações Adicionais</label>
                  <textarea name="notes" defaultValue={editingExchange?.notes || ''} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 h-20 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsExchangeModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-2xl">Descartar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-800">Registrar Permuta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
