import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { X, Search, User, Phone, Check, Loader2, Users, AlertTriangle } from 'lucide-react';
import { Customer, Appointment } from '../types';

interface LinkCustomersModalProps {
  currentCustomer: Customer;
  customers: Customer[];
  onClose: () => void;
  onMergeComplete: (updatedMainCustomer: Customer, mergedCustomerIds: string[]) => void;
}

export const LinkCustomersModal: React.FC<LinkCustomersModalProps> = ({
  currentCustomer,
  customers,
  onClose,
  onMergeComplete
}) => {
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([currentCustomer]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mainCustomerId, setMainCustomerId] = useState<string>(currentCustomer.id);
  const [isMerging, setIsMerging] = useState(false);
  const [showConfirmMerge, setShowConfirmMerge] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);

  // Filter customers for the search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const search = searchTerm.toLowerCase().trim();
    
    return customers.filter(c => {
      // Don't show already selected customers
      if (selectedCustomers.some(sc => sc.id === c.id)) return false;

      const secondaryMatch = c.secondaryPhones?.some(p => p.toLowerCase().includes(search));
      return (
        c.name.toLowerCase().includes(search) ||
        c.phone.toLowerCase().includes(search) ||
        secondaryMatch
      );
    }).slice(0, 5); // Limit to top 5 results for clean UI
  }, [customers, searchTerm, selectedCustomers]);

  const handleAddCustomer = (customer: Customer) => {
    setSelectedCustomers(prev => [...prev, customer]);
    setSearchTerm('');
  };

  const handleRemoveCustomer = (id: string) => {
    // Cannot remove the active customer if it's the only one, or keep at least one
    if (selectedCustomers.length <= 1) return;
    
    setSelectedCustomers(prev => prev.filter(c => c.id !== id));
    
    // If the removed customer was the main one, reset main to the first remaining customer
    if (mainCustomerId === id) {
      const remaining = selectedCustomers.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setMainCustomerId(remaining[0].id);
      }
    }
  };

  const handleMerge = () => {
    if (selectedCustomers.length < 2) {
      alert('Por favor, selecione pelo menos outro cadastro para realizar a vinculação.');
      return;
    }
    setShowConfirmMerge(true);
  };

  const executeMerge = async () => {
    const mainCustomer = selectedCustomers.find(c => c.id === mainCustomerId);
    if (!mainCustomer) return;

    const secondaryCustomers = selectedCustomers.filter(c => c.id !== mainCustomerId);
    const secondaryIds = secondaryCustomers.map(c => c.id);

    setIsMerging(true);

    try {
      // 1. Collect all secondary phones
      const allSecondaryPhonesSet = new Set<string>();
      
      // Add existing secondary phones from main customer
      mainCustomer.secondaryPhones?.forEach(p => {
        const clean = p.replace(/\D/g, '');
        if (clean) allSecondaryPhonesSet.add(clean);
      });

      // Add phone numbers and secondary phones from secondary customers
      secondaryCustomers.forEach(c => {
        const primaryClean = c.phone.replace(/\D/g, '');
        if (primaryClean && primaryClean !== mainCustomer.phone.replace(/\D/g, '')) {
          allSecondaryPhonesSet.add(primaryClean);
        }
        c.secondaryPhones?.forEach(p => {
          const clean = p.replace(/\D/g, '');
          if (clean && clean !== mainCustomer.phone.replace(/\D/g, '')) {
            allSecondaryPhonesSet.add(clean);
          }
        });
      });

      const finalSecondaryPhones = Array.from(allSecondaryPhonesSet);

      // 2. Consolidate history
      const combinedHistory = [
        ...(mainCustomer.history || []),
        ...secondaryCustomers.flatMap(c => c.history || [])
      ];

      // Add system entry to history about this merge
      combinedHistory.push({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        type: 'CONTACT',
        description: 'VINCULAÇÃO DE CADASTROS',
        details: `Cadastros secundários vinculados: ${secondaryCustomers.map(c => `${c.name} (${c.phone})`).join(', ')}. Histórico de agendamentos e compras unificado.`
      });

      // Sort history descending by date
      combinedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 3. Update DB: Main customer
      const { error: updateMainError } = await supabase
        .from('customers')
        .update({
          secondary_phones: finalSecondaryPhones,
          history: combinedHistory
        })
        .eq('id', mainCustomerId);

      if (updateMainError) throw new Error(`Erro ao atualizar cadastro principal: ${updateMainError.message}`);

      // 4. Update foreign keys in associated tables in parallel batches
      const updatePromises = [
        supabase.from('appointments').update({ customer_id: mainCustomerId }).in('customer_id', secondaryIds),
        supabase.from('sales').update({ customer_id: mainCustomerId }).in('customer_id', secondaryIds),
        supabase.from('pantry_logs').update({ customer_id: mainCustomerId }).in('customer_id', secondaryIds),
        supabase.from('nfse_records').update({ customer_id: mainCustomerId }).in('customer_id', secondaryIds),
        supabase.from('partners').update({ linked_customer_id: mainCustomerId }).in('linked_customer_id', secondaryIds),
        supabase.from('crm_conversations').update({ customer_id: mainCustomerId }).in('customer_id', secondaryIds),
        supabase.from('customer_consent_forms').update({ customer_id: mainCustomerId }).in('customer_id', secondaryIds)
      ];

      const results = await Promise.all(updatePromises);
      const firstFailingUpdate = results.find(r => r.error);
      if (firstFailingUpdate) {
        throw new Error(`Erro ao migrar tabelas vinculadas: ${firstFailingUpdate.error?.message}`);
      }

      // 5. Delete secondary customers
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .in('id', secondaryIds);

      if (deleteError) throw new Error(`Erro ao remover cadastros secundários: ${deleteError.message}`);

      // Build updated customer object
      const updatedMainCustomer: Customer = {
        ...mainCustomer,
        secondaryPhones: finalSecondaryPhones,
        history: combinedHistory
      };

      // 6. Complete merge callback
      onMergeComplete(updatedMainCustomer, secondaryIds);
      setMergeSuccess(true);
      
      // Close modal after 1.8 seconds of success animation
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (error: any) {
      console.error('Error during customer merge:', error);
      alert(`Ocorreu um erro ao vincular os cadastros: ${error.message || error}`);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Vincular Cadastros</h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Unificar fichas e consolidação de histórico</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isMerging}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-full transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          
          {/* Alerta explicativo */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
            <div className="text-xs leading-relaxed font-bold">
              <p className="uppercase tracking-wider font-black mb-1">Aviso Importante</p>
              Ao vincular cadastros, você escolhe um número de telefone como o <span className="underline">Principal</span>. O cadastro deste telefone será mantido e herdará todos os agendamentos, compras, conversas e termos das outras clientes. Os cadastros das outras clientes serão excluídos do sistema para evitar duplicidade.
            </div>
          </div>

          {/* Seletor/Busca para adicionar cadastros */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Buscar cliente para vincular</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquise por nome ou telefone..." 
                disabled={isMerging}
                className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              {/* Dropdown de resultados */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 dark:divide-zinc-700">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleAddCustomer(c)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-700/50 flex items-center justify-between group transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{c.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{c.phone}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full group-hover:scale-105 transition-all">SELECIONAR</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de Cadastros Selecionados */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Cadastros na Vinculação ({selectedCustomers.length})</label>
            
            <div className="space-y-2.5">
              {selectedCustomers.map(c => {
                const isCurrent = c.id === currentCustomer.id;
                const isMain = c.id === mainCustomerId;
                
                return (
                  <div 
                    key={c.id} 
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                      isMain 
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-500 dark:border-indigo-600' 
                        : 'bg-white dark:bg-zinc-800 border-slate-100 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Radio button para escolher a Principal */}
                      <label className="relative flex items-center justify-center cursor-pointer flex-shrink-0">
                        <input
                          type="radio"
                          name="main_customer"
                          checked={isMain}
                          disabled={isMerging}
                          onChange={() => setMainCustomerId(c.id)}
                          className="sr-only peer"
                        />
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-zinc-600 peer-checked:border-indigo-500 dark:peer-checked:border-indigo-400 peer-checked:bg-indigo-500 dark:peer-checked:bg-indigo-400 transition-all flex items-center justify-center">
                          {isMain && <Check size={12} className="text-white font-bold" />}
                        </div>
                      </label>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{c.name}</p>
                          {isCurrent && (
                            <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded">Ativa</span>
                          )}
                          {isMain && (
                            <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">PRINCIPAL</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" /> {c.phone}
                          {c.secondaryPhones && c.secondaryPhones.length > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              (+ {c.secondaryPhones.length} secundário{c.secondaryPhones.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Botão de excluir da lista (se não for a única ou se não for a atual) */}
                    {!isCurrent && (
                      <button
                        type="button"
                        disabled={isMerging}
                        onClick={() => handleRemoveCustomer(c.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumo da unificação */}
          {selectedCustomers.length >= 2 && (
            <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resumo da Consolidação</h4>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                <p>
                  ✅ O cadastro de <strong className="text-indigo-600 dark:text-indigo-400">{(selectedCustomers.find(c => c.id === mainCustomerId)?.name || '').toUpperCase()}</strong> será mantido.
                </p>
                <p>
                  🗑️ Os cadastros de: <strong className="text-rose-500">{selectedCustomers.filter(c => c.id !== mainCustomerId).map(c => c.name.toUpperCase()).join(', ')}</strong> serão unificados e permanentemente removidos.
                </p>
                <p>
                  🔗 Os telefones de contato secundários serão associados à cliente principal, permitindo identificá-la automaticamente.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="px-5 py-3 border-2 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleMerge}
            disabled={isMerging || selectedCustomers.length < 2}
            className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/10 active:scale-95 transition-all flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-zinc-800 disabled:text-slate-400 disabled:shadow-none"
          >
            {isMerging ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                Vinculando...
              </>
            ) : (
              <>
                <Check size={14} />
                Confirmar Vinculação
              </>
            )}
          </button>
        </div>

      </div>

      {/* Diálogo de Confirmação Customizado (Padrão Aminna) */}
      {showConfirmMerge && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.2rem] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              
              {/* Ícone de alerta */}
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              
              <div className="text-center space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Consolidar Cadastros?</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Esta ação não pode ser desfeita</p>
              </div>

              {/* Caixa de detalhes */}
              <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl p-4 text-xs font-bold text-slate-600 dark:text-slate-300 space-y-3.5 border border-slate-100 dark:border-zinc-800">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase block mb-1">Cadastro Principal (A ser mantido)</span>
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase">{selectedCustomers.find(c => c.id === mainCustomerId)?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{selectedCustomers.find(c => c.id === mainCustomerId)?.phone}</p>
                </div>

                <div className="border-t border-slate-150 dark:border-zinc-700 pt-3">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase block mb-1">Cadastros Secundários (Unificados e removidos)</span>
                  <div className="space-y-1.5 mt-1">
                    {selectedCustomers.filter(c => c.id !== mainCustomerId).map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-white dark:bg-zinc-850 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                        <span className="font-black text-slate-800 dark:text-slate-200 uppercase truncate max-w-[180px]">{c.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-bold leading-relaxed">
                Todo o histórico de agendamentos, compras, consentimentos e mensagens será transferido para o cadastro principal de <strong className="text-slate-800 dark:text-slate-200 uppercase">{(selectedCustomers.find(c => c.id === mainCustomerId)?.name || '')}</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmMerge(false)}
                className="flex-1 py-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmMerge(false);
                  executeMerge();
                }}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/10 active:scale-95 transition-all hover:bg-indigo-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tela de Sucesso Animada (Padrão Aminna) */}
      {mergeSuccess && (
        <div className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 z-40 flex flex-col items-center justify-center p-6 space-y-4 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce">
            <Check size={32} />
          </div>
          <div className="space-y-1 animate-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Cadastros Vinculados!</h4>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Históricos unificados com sucesso</p>
          </div>
        </div>
      )}
    </div>
  );
};
