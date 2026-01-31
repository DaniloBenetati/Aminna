
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

import { Search, Plus, Clock, DollarSign, X, Edit2, Sparkles, History, Check, Trash2, TrendingUp, Tag, ChevronDown } from 'lucide-react';
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
    const [isCustomCategory, setIsCustomCategory] = useState(false);
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
        setIsCustomCategory(false);
        setFormData({
            name: '',
            price: 0,
            durationMinutes: 60,
            category: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        // Check if category is in the known list (derived from ALL services) 
        // If it is, keep isCustomCategory false. If not (or if we want to allow editing easily), maybe checking isn't necessary?
        // Actually, if we open edit, and the category exists in the list, show dropdown.
        // If it's a new or unique category that isn't commonly used? 
        // For simplicity: If category exists, show dropdown. If not (or empty), show dropdown.
        // The user can always click "New" to switch to custom.
        setIsCustomCategory(false);
        setFormData(service);
        setIsModalOpen(true);
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.price || !formData.durationMinutes) return;

        const serviceData = {
            name: formData.name,
            price: formData.price,
            duration_minutes: formData.durationMinutes,
            required_specialty: formData.requiredSpecialty || null,
            active: formData.active !== undefined ? formData.active : true,
            category: formData.category || null
        };

        try {
            if (editingService) {
                let updatedService = { ...editingService, ...formData } as Service;

                // If price changed, save the OLD price to history (local UI handling for now, should be DB trigger/table eventually)
                if (editingService.price !== formData.price) {
                    const newHistoryItem: PriceHistoryItem = {
                        date: new Date().toISOString().split('T')[0],
                        price: editingService.price,
                        note: 'Reajuste de Tabela'
                    };
                    updatedService.priceHistory = [...(editingService.priceHistory || []), newHistoryItem];
                }

                const { error } = await supabase.from('services').update(serviceData).eq('id', editingService.id);
                if (error) throw error;

                setServices(prev => prev.map(s => s.id === editingService.id ? updatedService : s));
            } else {
                const { data, error } = await supabase.from('services').insert([serviceData]).select();
                if (error) throw error;

                if (data && data[0]) {
                    const newService = { ...formData, id: data[0].id, priceHistory: [] } as Service;
                    setServices(prev => [...prev, newService]);
                }
            }
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Error saving service:', error);
            alert(`Erro ao salvar serviço: ${error.message || JSON.stringify(error)}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este serviço? O histórico de agendamentos não será afetado.')) {
            try {
                const { error } = await supabase.from('services').delete().eq('id', id);
                if (error) throw error;
                setServices(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error('Error deleting service:', error);
                alert('Erro ao excluir serviço.');
            }
        }
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

            {/* Services List Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border-2 border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest min-w-[200px]">Serviço</th>
                                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Categoria</th>
                                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Duração</th>
                                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right min-w-[100px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredServices.map(service => {
                                const hasHistory = service.priceHistory && service.priceHistory.length > 0;
                                return (
                                    <tr key={service.id} className="group hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">{service.name}</p>
                                                    {hasHistory && (
                                                        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                                            <History size={10} /> Histórico de Preços
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            {service.category ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700">
                                                    <Tag size={10} /> {service.category}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-zinc-700 text-[20px]">-</span>
                                            )}
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                <Clock size={12} /> {service.durationMinutes} min
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className="text-base font-black text-emerald-700 dark:text-emerald-400 tracking-tighter">
                                                R$ {service.price.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(service)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                                                    title="Editar Serviço"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(service.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                                                    title="Excluir Serviço"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredServices.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-zinc-600">
                                        <div className="flex flex-col items-center gap-3">
                                            <Search size={32} className="opacity-20" />
                                            <p className="text-sm font-black uppercase tracking-widest">Nenhum serviço encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Ex: Manicure Completa"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Categoria (Opcional)</label>
                                <div className="relative">
                                    <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />

                                    {isCustomCategory ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={formData.category || ''}
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all placeholder:text-slate-400"
                                                placeholder="Digite o nome da nova categoria..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomCategory(false);
                                                    setFormData({ ...formData, category: '' });
                                                }}
                                                className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded-2xl border-2 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                                                title="Voltar para lista"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <select
                                                value={formData.category || ''}
                                                onChange={(e) => {
                                                    if (e.target.value === 'NEW_CATEGORY_PROMPT') {
                                                        setIsCustomCategory(true);
                                                        setFormData({ ...formData, category: '' });
                                                    } else {
                                                        setFormData({ ...formData, category: e.target.value });
                                                    }
                                                }}
                                                className="w-full pl-10 pr-10 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Selecione ou Crie...</option>
                                                {Array.from(new Set(services.map(s => s.category).filter(Boolean))).sort().map(cat => (
                                                    <option key={cat!} value={cat!}>{cat}</option>
                                                ))}
                                                <option value="NEW_CATEGORY_PROMPT" className="font-bold text-indigo-600 dark:text-indigo-400">+ Nova Categoria...</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
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
                                            onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
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
