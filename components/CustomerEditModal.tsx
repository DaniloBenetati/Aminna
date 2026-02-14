
import React, { useState, useEffect } from 'react';
import { X, Save, Ban, Clock, Star, Smartphone, Mail, MapPin, FileText, Sparkles, Calendar, ChevronLeft } from 'lucide-react';
import { Customer, CustomerHistoryItem, Service, Provider } from '../types';
import { Avatar } from './Avatar';
import { supabase } from '../services/supabase';

interface CustomerEditModalProps {
    customer: Customer;
    onClose: () => void;
    onUpdateCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    services: Service[];
    providers: Provider[];
}

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
    customer,
    onClose,
    onUpdateCustomers,
    services,
    providers
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'DADOS' | 'PREFERENCIAS' | 'HISTORICO'>('DADOS');

    // Local form state
    const [localName, setLocalName] = useState(customer.name);
    const [localPhone, setLocalPhone] = useState(customer.phone);
    const [localEmail, setLocalEmail] = useState(customer.email || '');
    const [localBirthday, setLocalBirthday] = useState(customer.birthDate || '');
    const [localCpf, setLocalCpf] = useState(customer.cpf || '');
    const [localAcquisitionChannel, setLocalAcquisitionChannel] = useState(customer.acquisitionChannel || '');
    const [localAddress, setLocalAddress] = useState(customer.address || '');
    const [localObservations, setLocalObservations] = useState(customer.observations || '');
    const [localStatus, setLocalStatus] = useState(customer.status);
    const [localIsBlocked, setLocalIsBlocked] = useState(customer.isBlocked || false);
    const [localBlockReason, setLocalBlockReason] = useState(customer.blockReason || '');

    // Preferences
    const [localRestrictions, setLocalRestrictions] = useState(customer.preferences?.restrictions || '');
    const [localFavServices, setLocalFavServices] = useState(customer.preferences?.favoriteServices?.join(', ') || '');
    const [localPrefDays, setLocalPrefDays] = useState(customer.preferences?.preferredDays?.join(', ') || '');
    const [localPrefNotes, setLocalPrefNotes] = useState(customer.preferences?.notes || '');
    const [localAssignedProviderIds, setLocalAssignedProviderIds] = useState<string[]>(customer.assignedProviderIds || (customer.assignedProviderId ? [customer.assignedProviderId] : [])); // Support legacy singular field

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedPreferences = {
                favoriteServices: localFavServices.split(',').map(s => s.trim()).filter(Boolean),
                preferredDays: localPrefDays.split(',').map(s => s.trim()).filter(Boolean),
                restrictions: localRestrictions,
                notes: localPrefNotes
            };

            const updatedData = {
                name: localName,
                phone: localPhone,
                email: localEmail,
                birth_date: localBirthday || null,
                cpf: localCpf || null,
                acquisition_channel: localAcquisitionChannel || null,
                address: localAddress || null,
                observations: localObservations || null,
                status: localStatus,
                is_blocked: localIsBlocked,
                block_reason: localIsBlocked ? localBlockReason : null,
                assigned_provider_ids: localAssignedProviderIds,
                preferences: updatedPreferences
            };

            const { error } = await supabase
                .from('customers')
                .update(updatedData)
                .eq('id', customer.id);

            if (error) throw error;

            onUpdateCustomers(prev => prev.map(c => c.id === customer.id ? {
                ...c,
                name: localName,
                phone: localPhone,
                email: localEmail,
                birthDate: localBirthday,
                cpf: localCpf,
                acquisitionChannel: localAcquisitionChannel,
                address: localAddress,
                observations: localObservations,
                status: localStatus,
                isBlocked: localIsBlocked,
                blockReason: localIsBlocked ? localBlockReason : null,
                assignedProviderIds: localAssignedProviderIds,
                preferences: updatedPreferences
            } as Customer : c));

            setEditMode(false);
            alert('Dados da cliente atualizados com sucesso!');
        } catch (error) {
            console.error('Error updating customer:', error);
            alert('Erro ao atualizar dados da cliente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleBlock = async () => {
        const nextIsBlocked = !localIsBlocked;
        let reason = localBlockReason;

        if (nextIsBlocked) {
            const r = window.prompt('Informe o motivo do bloqueio:');
            if (r === null) return; // Cancelled
            reason = r;
        } else {
            reason = '';
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({ is_blocked: nextIsBlocked, block_reason: reason })
                .eq('id', customer.id);

            if (error) throw error;

            setLocalIsBlocked(nextIsBlocked);
            setLocalBlockReason(reason);
            onUpdateCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, isBlocked: nextIsBlocked, blockReason: reason } : c));
            alert(nextIsBlocked ? 'Cliente bloqueada com sucesso.' : 'Cliente desbloqueada com sucesso.');
        } catch (error) {
            console.error('Error toggling block:', error);
            alert('Erro ao alterar status de bloqueio.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border-2 border-slate-900 dark:border-zinc-800 scale-in-center">

                {/* Header Profile Area */}
                <div className="relative px-8 pt-10 pb-6 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-6">
                    <button onClick={onClose} className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>

                    <div className="relative group">
                        <Avatar name={localName} size="w-24 h-24" />
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-zinc-900 ${localStatus !== 'Risco de Churn' && !localIsBlocked ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>

                    <div className="text-center md:text-left flex-1 space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            {editMode ? (
                                <input
                                    className="text-3xl font-black text-slate-950 dark:text-white bg-white dark:bg-zinc-800 border-b-4 border-indigo-600 outline-none px-2 py-1 w-full md:w-auto"
                                    value={localName}
                                    onChange={e => setLocalName(e.target.value)}
                                />
                            ) : (
                                <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">{localName}</h2>
                            )}
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <span className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {customer.status === 'Novo' && (Number(customer.totalSpent || 0) > 0 || (customer.history || []).length > 0) ? 'CLIENTE' : (customer.status === 'Novo' ? 'NOVO' : 'CLIENTE')}
                                </span>
                                {customer.acquisitionChannel === 'Via Importação Excel' && (
                                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">VIA IMPORTAÇÃO EXCEL</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {editMode ? (
                            <>
                                <button onClick={() => setEditMode(false)} className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all">Cancelar</button>
                                <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2">
                                    <Save size={16} /> Salvar
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditMode(true)} className="px-10 py-3 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-[11px] font-black uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">Editar</button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-zinc-950 px-8 flex gap-10 border-b border-slate-100 dark:border-zinc-900">
                    {[
                        { id: 'DADOS', icon: Clock, label: 'DADOS' },
                        { id: 'PREFERENCIAS', icon: Sparkles, label: 'PREFERÊNCIAS' },
                        { id: 'HISTORICO', icon: Clock, label: 'HISTÓRICO' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-6 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase transition-all relative ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-zinc-950/50 scrollbar-hide">
                    {activeTab === 'DADOS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                            {/* Personal Data Selection */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 text-indigo-600 mb-2">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"><Smartphone size={20} /></div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest">Dados Pessoais</h4>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data de Nascimento</label>
                                        {editMode ? (
                                            <input type="date" value={localBirthday} onChange={e => setLocalBirthday(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
                                        ) : (
                                            <p className="text-sm font-black text-slate-900 dark:text-white p-1">{localBirthday ? new Date(localBirthday + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF</label>
                                        {editMode ? (
                                            <input value={localCpf} onChange={e => setLocalCpf(e.target.value)} placeholder="000.000.000-00" className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-blue-900 dark:text-blue-400 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300" />
                                        ) : (
                                            <p className="text-sm font-black text-slate-900 dark:text-white p-1">{localCpf || 'Não informado'}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Canal de Entrada</label>
                                        {editMode ? (
                                            <select value={localAcquisitionChannel} onChange={e => setLocalAcquisitionChannel(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all">
                                                <option value="">Selecione...</option>
                                                <option value="WhatsApp">WhatsApp</option>
                                                <option value="Instagram">Instagram</option>
                                                <option value="Indicação">Indicação</option>
                                                <option value="Google">Google</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        ) : (
                                            <p className="text-sm font-black text-slate-900 dark:text-white p-1">{localAcquisitionChannel || 'Não informado'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 text-indigo-600 mb-2">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"><Smartphone size={20} /></div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest">Contatos</h4>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">WhatsApp / Celular</label>
                                        {editMode ? (
                                            <input value={localPhone} onChange={e => setLocalPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
                                        ) : (
                                            <p className="text-sm font-black text-slate-900 dark:text-white p-1">{localPhone}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Email</label>
                                        {editMode ? (
                                            <input type="email" value={localEmail} onChange={e => setLocalEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" />
                                        ) : (
                                            <p className="text-sm font-black text-slate-900 dark:text-white p-1">{localEmail || 'Não informado'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 text-indigo-600 mb-2">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl"><MapPin size={20} /></div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest">Localização</h4>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Endereço Residencial</label>
                                    {editMode ? (
                                        <textarea value={localAddress} onChange={e => setLocalAddress(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all min-h-[100px] resize-none" placeholder="Rua, número, bairro..." />
                                    ) : (
                                        <p className="text-sm font-black text-slate-900 dark:text-white p-1">{localAddress || 'Sem endereço cadastrado'}</p>
                                    )}
                                </div>
                            </div>

                            {/* Block Status */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <div className="p-2 bg-slate-50 dark:bg-zinc-800 rounded-xl"><Ban size={20} /></div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest">Bloqueio de Cliente</h4>
                                    </div>
                                    {editMode && (
                                        <button onClick={handleToggleBlock} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${localIsBlocked ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}`}>
                                            {localIsBlocked ? 'DESBLOQUEAR' : 'BLOQUEAR'}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">STATUS: <span className={localIsBlocked ? 'text-rose-600' : 'text-emerald-500'}>{localIsBlocked ? 'BLOQUEADA' : localStatus.toUpperCase()}</span></p>
                                    {localIsBlocked && (
                                        <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-2xl">
                                            <label className="text-[8px] font-black text-rose-400 uppercase mb-1 block">Motivo do bloqueio</label>
                                            <p className="text-xs font-black text-rose-900 dark:text-rose-200">{localBlockReason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* observations */}
                            <div className="md:col-span-2 bg-black dark:bg-white p-6 rounded-3xl shadow-2xl space-y-6">
                                <div className="flex items-center gap-3 text-white dark:text-black">
                                    <FileText size={20} />
                                    <h4 className="text-[11px] font-black uppercase tracking-widest">Prontuário Estratégico</h4>
                                </div>
                                <div className="space-y-1">
                                    {editMode ? (
                                        <textarea value={localObservations} onChange={e => setLocalObservations(e.target.value)} className="w-full bg-zinc-900 dark:bg-slate-50 border-2 border-zinc-800 dark:border-slate-200 rounded-[1.5rem] p-6 font-black text-white dark:text-black outline-none focus:border-indigo-500 transition-all min-h-[150px] resize-none text-sm placeholder:italic placeholder:font-normal placeholder:opacity-50" placeholder="Digite notas privadas, restrições médicas ou observações importantes..." />
                                    ) : (
                                        <div className="bg-zinc-900 dark:bg-slate-50 rounded-[1.5rem] p-6 text-sm italic font-black text-white dark:text-black leading-relaxed whitespace-pre-wrap">
                                            {localObservations ? `"${localObservations}"` : '"Nenhuma nota privada."'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'PREFERENCIAS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 text-amber-600 mb-2">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl"><Sparkles size={20} /></div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest">Favoritos & Restrições</h4>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Serviços Favoritos</label>
                                            {editMode ? (
                                                <input value={localFavServices} onChange={e => setLocalFavServices(e.target.value)} placeholder="Ex: Corte, Design de Sobrancelha..." className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {localFavServices ? localFavServices.split(',').map((s, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{s.trim()}</span>
                                                    )) : <p className="text-xs text-slate-300 font-bold uppercase italic p-1">Nenhum serviço favorito</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-rose-500 uppercase ml-1 block mb-2">Restrições de Alergia/Saúde</label>
                                            {editMode ? (
                                                <textarea value={localRestrictions} onChange={e => setLocalRestrictions(e.target.value)} className="w-full bg-rose-50/30 dark:bg-rose-900/10 border-2 border-rose-100 dark:border-rose-900 rounded-xl p-4 font-black text-rose-900 dark:text-rose-200 outline-none focus:border-rose-500 min-h-[100px] resize-none" placeholder="Ex: Alergia a amônia, pele sensível..." />
                                            ) : (
                                                localRestrictions ? (
                                                    <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-800 rounded-2xl">
                                                        <p className="text-xs font-black text-rose-900 dark:text-rose-200 leading-relaxed uppercase">{localRestrictions}</p>
                                                    </div>
                                                ) : <p className="text-xs text-slate-300 font-bold uppercase italic p-1">Nenhuma restrição registrada</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl"><Clock size={20} /></div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest">Agenda & Notas</h4>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Dias Preferenciais</label>
                                            {editMode ? (
                                                <input value={localPrefDays} onChange={e => setLocalPrefDays(e.target.value)} placeholder="Ex: Terças, Quintas..." className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {localPrefDays ? localPrefDays.split(',').map((d, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-lg text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">{d.trim()}</span>
                                                    )) : <p className="text-xs text-slate-300 font-bold uppercase italic p-1">Nenhum dia preferencial</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Dias Preferenciais</label>
                                                {editMode ? (
                                                    <input value={localPrefDays} onChange={e => setLocalPrefDays(e.target.value)} placeholder="Ex: Terças, Quintas..." className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {localPrefDays ? localPrefDays.split(',').map((d, i) => (
                                                            <span key={i} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-lg text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">{d.trim()}</span>
                                                        )) : <p className="text-xs text-slate-300 font-bold uppercase italic p-1">Nenhum dia preferencial</p>}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Notas de Preferência</label>
                                                {editMode ? (
                                                    <textarea value={localPrefNotes} onChange={e => setLocalPrefNotes(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl p-4 font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-h-[100px] resize-none" placeholder="Ex: Prefere café com pouco açúcar, gosta de silêncio..." />
                                                ) : (
                                                    <p className="text-sm font-black text-slate-900 dark:text-white p-1">{localPrefNotes || 'Nenhuma nota de preferência'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* PROFISSIONAIS PREFERIDOS */}
                                <div className="mt-6 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm space-y-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Profissionais Preferidos</h4>
                                    {editMode ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {providers.filter(p => p.active).map(provider => {
                                                const isSelected = localAssignedProviderIds.includes(provider.id);
                                                return (
                                                    <div
                                                        key={provider.id}
                                                        onClick={() => {
                                                            setLocalAssignedProviderIds(prev =>
                                                                prev.includes(provider.id)
                                                                    ? prev.filter(id => id !== provider.id)
                                                                    : [...prev, provider.id]
                                                            );
                                                        }}
                                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2 ${isSelected
                                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                            : 'border-slate-100 dark:border-zinc-800 hover:border-slate-300'}`}
                                                    >
                                                        <Avatar name={provider.name} src={provider.avatar} size="w-8 h-8" />
                                                        <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>{provider.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-3">
                                            {customer.assignedProviderIds && customer.assignedProviderIds.length > 0 ? (
                                                providers.filter(p => customer.assignedProviderIds?.includes(p.id)).map(p => (
                                                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-zinc-700">
                                                        <Avatar name={p.name} src={p.avatar} size="w-6 h-6" />
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{p.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-300 font-bold uppercase italic">Nenhum profissional preferido</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'HISTORICO' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">Timeline de Atendimentos</h4>
                            </div>

                            {customer.history.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-zinc-800">
                                    <div className="bg-slate-50 dark:bg-zinc-800 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Calendar size={32} />
                                    </div>
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhum histórico disponível</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {customer.history.map((item: CustomerHistoryItem) => (
                                        <div key={item.id} className="group flex items-start gap-6">
                                            <div className="flex flex-col items-center flex-shrink-0 pt-2">
                                                <div className={`w-3 h-3 rounded-full border-2 ${item.type === 'VISIT' ? 'bg-indigo-600 border-indigo-200' :
                                                    item.type === 'PURCHASE' ? 'bg-emerald-500 border-emerald-200' :
                                                        'bg-rose-500 border-rose-200'
                                                    }`} />
                                                <div className="w-0.5 h-full min-h-[40px] bg-slate-100 dark:bg-zinc-800 mt-2 rounded-full" />
                                            </div>

                                            <div className="flex-1 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 transition-all hover:shadow-md">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-zinc-800 px-3 py-1 rounded-lg">
                                                            {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                        </span>
                                                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${item.type === 'VISIT' ? 'bg-indigo-50 text-indigo-700' :
                                                            item.type === 'PURCHASE' ? 'bg-emerald-50 text-emerald-700' :
                                                                'bg-rose-50 text-rose-700'
                                                            }`}>
                                                            {item.type === 'VISIT' ? 'VISITA' : item.type === 'PURCHASE' ? 'COMPRA' : item.type === 'CANCELLATION' ? 'CANCELAMENTO' : item.type === 'RESTRICTION' ? 'RESTRIÇÃO' : item.type}
                                                        </span>
                                                    </div>
                                                    {item.providerId && (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar size="w-5 h-5" name={providers.find(p => p.id === item.providerId)?.name || ''} src={providers.find(p => p.id === item.providerId)?.avatar} />
                                                            <span className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">{providers.find(p => p.id === item.providerId)?.name}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <h5 className="text-[13px] font-black text-slate-950 dark:text-white uppercase leading-tight mb-1">{item.description}</h5>
                                                {!!item.details && <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 leading-relaxed">{item.details}</p>}

                                                {item.rating !== undefined && item.rating !== null && item.rating > 0 && (
                                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-zinc-800">
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star key={star} size={10} className={star <= item.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-zinc-700"} />
                                                            ))}
                                                        </div>
                                                        {!!item.feedback && <span className="text-[10px] text-slate-400 italic font-medium">"{item.feedback}"</span>}
                                                    </div>
                                                )}
                                                {item.productsUsed && item.productsUsed.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-zinc-800">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.productsUsed.map((p, i) => (
                                                                <span key={i} className="px-2 py-1 bg-slate-50 dark:bg-zinc-800 text-[8px] font-black text-slate-400 uppercase rounded-lg border border-slate-100 dark:border-zinc-700">{p}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
