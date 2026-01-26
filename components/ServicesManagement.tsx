
import React, { useState } from 'react';
import { Search, Plus, Clock, DollarSign, X, Edit2, Sparkles, History, Check, Trash2, TrendingUp } from 'lucide-react';
import { Service, PriceHistoryItem } from '../types';

interface ServicesManagementProps {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
}

export const ServicesManagement: React.FC<ServicesManagementProps> = ({ services, setServices }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    price: 0,
    durationMinutes: 30
  });

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({
        name: '',
        price: 0,
        durationMinutes: 60
    });
    setIsModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData(service);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (confirm('Tem certeza que deseja excluir este serviço? O histórico de agendamentos não será afetado.')) {
          setServices(prev => prev.filter(s => s.id !== id));
      }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.durationMinutes) return;

    if (editingService) {
        let updatedService = { ...editingService, ...formData } as Service;
        
        // If price changed, save the OLD price to history
        if (editingService.price !== formData.price) {
            const newHistoryItem: PriceHistoryItem = {
                date: new Date().toISOString().split('T')[0],
                price: editingService.price,
                note: 'Reajuste de Tabela'
            };
            updatedService.priceHistory = [...(editingService.priceHistory || []), newHistoryItem];
        }

        setServices(prev => prev.map(s => s.id === editingService.id ? updatedService : s));
    } else {
        const newService = { ...formData, id: Date.now().toString(), priceHistory: [] } as Service;
        setServices(prev => [...prev, newService]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-8 text-slate-900 dark:text-white">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight">Catálogo de Serviços</h2>
            <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão de preços e tempos</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      {/* Search Input */}
      <div className="relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-400" />
          <input 
            type="text" 
            placeholder="Pesquisar serviço..." 
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs md:text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
      </div>

      {/* Services List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => {
              const hasHistory = service.priceHistory && service.priceHistory.length > 0;
              
              return (
                <div key={service.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between group hover:border-slate-300 dark:hover:border-zinc-600 transition-all relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Sparkles size={64} />
                    </div>

                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-black text-slate-950 dark:text-white text-base uppercase tracking-tight truncate leading-tight">{service.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-zinc-700">
                                    <Clock size={12} /> {service.durationMinutes} min
                                </span>
                                {hasHistory && (
                                    <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800" title="Possui histórico de preços">
                                        <History size={12} /> Histórico
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleEdit(service)} className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(service.id)} className="p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-800">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-slate-100 dark:border-zinc-800 pt-3 mt-1 relative z-10">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Valor Vigente</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tighter">R$ {service.price.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
              );
          })}
          
          {filteredServices.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 dark:text-zinc-600 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl">
                  <p className="text-sm font-black uppercase tracking-widest">Nenhum serviço encontrado</p>
              </div>
          )}
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 border-2 border-black dark:border-zinc-700 max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-950 dark:bg-black text-white flex-shrink-0">
                    <h3 className="font-black text-base md:text-lg uppercase tracking-tight flex items-center gap-2">
                        {editingService ? <Edit2 size={20} className="text-indigo-400" /> : <Plus size={20} className="text-indigo-400" />}
                        {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors p-1"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 bg-white dark:bg-zinc-900 overflow-y-auto scrollbar-hide">
                    <div>
                        <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Nome do Serviço</label>
                        <input 
                            type="text" 
                            required autoFocus
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-400"
                            placeholder="Ex: Manicure Completa"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Preço Atual (R$)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    value={formData.price}
                                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                                    className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-lg font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Duração (Min)</label>
                            <div className="relative">
                                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="number" 
                                    step="5"
                                    required
                                    value={formData.durationMinutes}
                                    onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
                                    className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-lg font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* HISTORY SECTION - ONLY VISIBLE IF HISTORY EXISTS */}
                    {editingService && editingService.priceHistory && editingService.priceHistory.length > 0 && (
                        <div className="bg-slate-50 dark:bg-zinc-800 p-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-zinc-700">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <History size={14} className="text-indigo-500" /> Histórico de Preços Anteriores
                            </h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-hide">
                                {editingService.priceHistory.slice().reverse().map((h, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-700 shadow-sm">
                                        <div>
                                            <p className="font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                                                <TrendingUp size={12} className="text-rose-500" />
                                                R$ {h.price.toFixed(2)}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{h.note || 'Alteração de preço'}</p>
                                        </div>
                                        <span className="font-bold text-slate-500 text-[10px] bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-zinc-700">
                                            {new Date(h.date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)} 
                            className="flex-1 py-4 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={18} /> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
