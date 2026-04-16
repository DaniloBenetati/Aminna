import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CatalogReservation } from '../types';
import { Check, X, Clock, RefreshCw, Eye, Package, Trash2, ShoppingCart, ArrowRight, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { formatDateBR } from '../services/financialService';

interface ReservationsManagementProps {
    onConvertToSale?: (reservation: CatalogReservation) => void;
}

export const ReservationsManagement: React.FC<ReservationsManagementProps> = ({ onConvertToSale }) => {
    const [reservations, setReservations] = useState<CatalogReservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<CatalogReservation | null>(null);
    const [activeTab, setActiveTab] = useState<'NOVAS' | 'AGUARDANDO' | 'FINALIZADAS' | 'CANCELADAS'>('NOVAS');

    // Aminna Premium Alert State
    const [premiumAlert, setPremiumAlert] = useState<{
        isOpen: boolean;
        type: 'INFO' | 'SUCCESS' | 'ERROR' | 'CONFIRM' | 'DELETE';
        title: string;
        message: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    }>({ isOpen: false, type: 'INFO', title: '', message: '' });

    const fetchReservations = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('catalog_reservations')
                .select(`
                    *,
                    items:catalog_reservation_items(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                setReservations(data);
            }
        } catch (err) {
            console.error("Erro ao buscar reservas:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        setPremiumAlert({
            isOpen: true,
            type: 'CONFIRM',
            title: 'Confirmar Alteração',
            message: `Tem certeza que deseja mudar o status desta reserva para ${newStatus.toUpperCase()}?`,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('catalog_reservations')
                        .update({ status: newStatus, updated_at: new Date().toISOString() })
                        .eq('id', id);
                    
                    if (error) throw error;
                    
                    // Refresh local state
                    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
                    setSelectedReservation(null);
                    
                    setPremiumAlert({
                        isOpen: true,
                        type: 'SUCCESS',
                        title: 'Sucesso',
                        message: `Reserva atualizada para ${newStatus}.`
                    });
                } catch (error) {
                    console.error("Erro ao atualizar status:", error);
                    setPremiumAlert({
                        isOpen: true,
                        type: 'ERROR',
                        title: 'Erro',
                        message: "Erro ao atualizar o status da reserva."
                    });
                }
            }
        });
    };

    const deleteReservation = async (id: string) => {
        setPremiumAlert({
            isOpen: true,
            type: 'DELETE',
            title: 'Excluir Reserva',
            message: "Tem certeza que deseja excluir esta reserva permanentemente? Isto não afeta o estoque.",
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('catalog_reservations')
                        .delete()
                        .eq('id', id);
                    
                    if (error) throw error;
                    
                    setReservations(prev => prev.filter(r => r.id !== id));
                    setSelectedReservation(null);

                    setPremiumAlert({
                        isOpen: true,
                        type: 'SUCCESS',
                        title: 'Excluída',
                        message: "Reserva removida com sucesso."
                    });
                } catch (error) {
                    console.error("Erro ao excluir reserva:", error);
                    setPremiumAlert({
                        isOpen: true,
                        type: 'ERROR',
                        title: 'Erro',
                        message: "Erro ao excluir a reserva."
                    });
                }
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendente': return 'text-amber-500 bg-amber-50 border-amber-200';
            case 'Aprovada': return 'text-emerald-500 bg-emerald-50 border-emerald-200';
            case 'Concluída': return 'text-blue-500 bg-blue-50 border-blue-200';
            case 'Rejeitada': return 'text-rose-500 bg-rose-50 border-rose-200';
            default: return 'text-slate-500 bg-slate-50 border-slate-200';
        }
    };

    const filteredReservations = reservations.filter(r => {
        const normalizedStatus = (r.status || '').toUpperCase();
        if (activeTab === 'NOVAS') return normalizedStatus === 'PENDENTE';
        if (activeTab === 'AGUARDANDO') return normalizedStatus === 'APROVADA';
        if (activeTab === 'CANCELADAS') return normalizedStatus === 'REJEITADA';
        if (activeTab === 'FINALIZADAS') return normalizedStatus === 'CONCLUÍDA' || normalizedStatus === 'CONCLUIDA';
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 md:p-8 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-zinc-700 shadow-inner">
                        <Package size={24} className="text-slate-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Reservas Online</h1>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                            Gestão de pedidos do catálogo web
                        </p>
                    </div>
                </div>
                <button 
                    onClick={fetchReservations}
                    className="p-3 bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-zinc-800 rounded-xl hover:border-slate-900 transition-all font-black uppercase tracking-widest text-[10px] flex gap-2 active:scale-95 shadow-sm"
                >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Atualizar
                </button>
            </header>

            <div className="flex-1 overflow-auto p-4 md:p-8">
                {/* Tabs */}
                <div className="flex bg-white dark:bg-zinc-900 p-2 rounded-2xl border-2 border-slate-100 dark:border-zinc-800 mb-6 gap-2 overflow-x-auto scrollbar-hide shadow-sm max-w-fit">
                    {(['NOVAS', 'AGUARDANDO', 'FINALIZADAS', 'CANCELADAS'] as const).map(tab => {
                        const count = reservations.filter(r => {
                            const normalizedStatus = (r.status || '').toUpperCase();
                            if (tab === 'NOVAS') return normalizedStatus === 'PENDENTE';
                            if (tab === 'AGUARDANDO') return normalizedStatus === 'APROVADA';
                            if (tab === 'FINALIZADAS') return normalizedStatus === 'CONCLUÍDA' || normalizedStatus === 'CONCLUIDA';
                            if (tab === 'CANCELADAS') return normalizedStatus === 'REJEITADA';
                            return false;
                        }).length;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                        ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md scale-100' 
                                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-95'
                                }`}
                            >
                                {tab === 'NOVAS' ? 'Novas' : tab === 'AGUARDANDO' ? 'Aguardando' : tab === 'FINALIZADAS' ? 'Finalizadas' : 'Canceladas'}
                                <span className={`px-2 py-0.5 rounded-md text-[9px] ${
                                    activeTab === tab 
                                        ? 'bg-white/20 dark:bg-zinc-900/20 text-current' 
                                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">Carregando Reservas...</div>
                        ) : filteredReservations.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 shadow-sm">
                                <Package size={48} className="mx-auto text-slate-200 dark:text-zinc-800 mb-4" />
                                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Nenhuma reserva localizada</h3>
                                <p className="text-xs text-slate-400 font-medium mt-2">Você não tem reservas com status {activeTab}.</p>
                            </div>
                        ) : (
                            filteredReservations.map(res => (
                                <button
                                    key={res.id}
                                    onClick={() => setSelectedReservation(res)}
                                    className={`w-full text-left bg-white dark:bg-zinc-900 border-2 rounded-3xl p-5 md:p-6 transition-all hover:shadow-xl active:scale-[0.99] group ${
                                        selectedReservation?.id === res.id ? 'border-zinc-950 dark:border-white shadow-md' : 'border-slate-100 dark:border-zinc-800'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(res.status)}`}>
                                                    {res.status}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                    <Clock size={12} /> {formatDateBR(res.created_at)}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                                                {res.customer_name}
                                            </h3>
                                            <p className="text-xs font-bold text-slate-500">
                                                {res.customer_phone}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                                            <p className="text-xl font-black text-[#947c4c]">
                                                R$ {res.total_amount.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {res.items?.length || 0} Itens Requisitados
                                        </p>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Ver Detalhes <Eye size={14} />
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Detalhes Panel */}
                    <div className="lg:col-span-1">
                        {selectedReservation ? (
                            <div className="bg-white dark:bg-zinc-900 rounded-3xl border-2 border-slate-100 dark:border-zinc-800 p-6 sticky top-8 shadow-xl">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                                            Detalhes da Reserva
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                                            ID: {selectedReservation.id.split('-')[0]}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedReservation.status)}`}>
                                        {selectedReservation.status}
                                    </span>
                                </div>

                                <div className="space-y-4 mb-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedReservation.customer_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp</p>
                                        <a href={`https://wa.me/55${selectedReservation.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-600 hover:underline">
                                            {selectedReservation.customer_phone}
                                        </a>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Itens Selecionados</p>
                                    <div className="space-y-3">
                                        {selectedReservation.items?.map((item: any) => (
                                            <div key={item.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                <div className="flex-1 pr-4">
                                                    <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.product_name}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-black text-slate-700 dark:text-slate-300">{item.quantity}x</p>
                                                    <p className="font-bold text-[#947c4c]">R$ {item.unit_price.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-slate-100 dark:bg-zinc-800 p-4 rounded-xl mb-6">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Reservado</p>
                                    <p className="text-2xl font-black text-[#947c4c]">R$ {selectedReservation.total_amount.toFixed(2)}</p>
                                </div>

                                {onConvertToSale && (selectedReservation.status === 'Pendente' || selectedReservation.status === 'Aprovada') && (
                                    <button 
                                        onClick={() => onConvertToSale(selectedReservation)}
                                        className="w-full flex items-center justify-center gap-2 p-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-500/20 mb-4"
                                    >
                                        <ShoppingCart size={16} /> Pagar e Finalizar Venda
                                    </button>
                                )}

                                {/* Ações */}
                                <div className="space-y-2">
                                    {selectedReservation.status === 'Pendente' && (
                                        <>
                                            <button 
                                                onClick={() => updateStatus(selectedReservation.id, 'Aprovada')}
                                                className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                                            >
                                                <Check size={16} /> Aprovar / Aguardando
                                            </button>
                                            <button 
                                                onClick={() => updateStatus(selectedReservation.id, 'Rejeitada')}
                                                className="w-full flex items-center justify-center gap-2 p-4 bg-white border-2 border-rose-200 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-300 active:scale-95 transition-all"
                                            >
                                                <X size={16} /> Rejeitar e Devolver
                                            </button>
                                        </>
                                    )}
                                    {selectedReservation.status === 'Aprovada' && (
                                        <>
                                            <button 
                                                onClick={() => updateStatus(selectedReservation.id, 'Concluída')}
                                                className="w-full flex items-center justify-center gap-2 p-4 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all shadow-md shadow-blue-500/20"
                                            >
                                                <Check size={16} /> Marcar como Concluída
                                            </button>
                                            <button 
                                                onClick={() => updateStatus(selectedReservation.id, 'Rejeitada')}
                                                className="w-full flex items-center justify-center gap-2 p-4 bg-white border-2 border-rose-200 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-300 active:scale-95 transition-all"
                                            >
                                                <X size={16} /> Cancelar e Devolver ao Estoque
                                            </button>
                                        </>
                                    )}
                                    {selectedReservation.status === 'Rejeitada' && (
                                        <button 
                                            onClick={() => deleteReservation(selectedReservation.id)}
                                            className="w-full flex items-center justify-center gap-2 p-4 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 active:scale-95 transition-all"
                                        >
                                            <Trash2 size={14} /> Excluir permanentemente do registro
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="hidden lg:flex bg-slate-50 dark:bg-zinc-900 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl h-64 items-center justify-center p-6 text-center">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Selecione uma reserva à esquerda<br/>para ver os detalhes e gerenciar
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Aminna Premium Alert Modal */}
            {premiumAlert.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center space-y-6">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto ${
                                premiumAlert.type === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' :
                                premiumAlert.type === 'DELETE' || premiumAlert.type === 'ERROR' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' :
                                'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'
                            }`}>
                                {premiumAlert.type === 'SUCCESS' && <CheckCircle2 size={40} />}
                                {(premiumAlert.type === 'ERROR' || premiumAlert.type === 'DELETE') && <AlertCircle size={40} />}
                                {premiumAlert.type === 'CONFIRM' && <Sparkles size={40} />}
                                {premiumAlert.type === 'INFO' && <Info size={40} />}
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{premiumAlert.title}</h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {premiumAlert.message}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                {(premiumAlert.type === 'CONFIRM' || premiumAlert.type === 'DELETE') ? (
                                    <>
                                        <button 
                                            onClick={() => {
                                                premiumAlert.onCancel?.();
                                                setPremiumAlert(prev => ({ ...prev, isOpen: false }));
                                            }}
                                            className="flex-1 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={() => {
                                                premiumAlert.onConfirm?.();
                                                setPremiumAlert(prev => ({ ...prev, isOpen: false }));
                                            }}
                                            className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all ${
                                                premiumAlert.type === 'DELETE' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-indigo-600 shadow-indigo-500/20'
                                            }`}
                                        >
                                            Confirmar
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => setPremiumAlert(prev => ({ ...prev, isOpen: false }))}
                                        className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
                                    >
                                        Entendido
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
