import React, { useState, useMemo } from 'react';
import { Wallet, X, AlertTriangle, TrendingUp, TrendingDown, Edit2 } from 'lucide-react';
import { Customer, CustomerLedgerEntry } from '../types';
import { supabase } from '../services/supabase';

interface FinancialExtractModalProps {
  customer: Customer;
  onClose: () => void;
  onUpdateCustomer: (updatedCustomer: Customer) => void;
  userProfile?: { id: string, name?: string };
  legacyCreditTransactions?: any[];
}

export function FinancialExtractModal({ customer, onClose, onUpdateCustomer, userProfile, legacyCreditTransactions = [] }: FinancialExtractModalProps) {
  const [activeTab, setActiveTab] = useState<'CREDIT' | 'DEBT'>('CREDIT');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mergedCreditHistory = useMemo(() => {
    const legacyEntries: CustomerLedgerEntry[] = legacyCreditTransactions.flatMap(lt => {
      const entries: CustomerLedgerEntry[] = [];
      if (lt.creditGenerated > 0) {
        entries.push({
          id: `${lt.id}-gen`,
          date: lt.date,
          action: 'ADD',
          amount: lt.creditGenerated,
          balanceAfter: -1, // Hidden for legacy
          reason: `Gerado (Atendimento Legado) - ${lt.serviceDescription || ''}`.trim()
        });
      }
      if (lt.creditUsed > 0) {
        entries.push({
          id: `${lt.id}-use`,
          date: lt.date,
          action: 'USE',
          amount: -lt.creditUsed,
          balanceAfter: -1, // Hidden for legacy
          reason: `Utilizado (Atendimento Legado) - ${lt.serviceDescription || ''}`.trim()
        });
      }
      return entries;
    });

    let allEntries = [...(customer.creditHistory || []), ...legacyEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Calculate discrepancy (e.g. manually edited balance before the new system)
    const historySum = allEntries.reduce((sum, t) => sum + t.amount, 0);
    const discrepancy = (customer.creditBalance || 0) - historySum;
    
    // Using a tolerance of 0.01 for floating point issues
    if (Math.abs(discrepancy) > 0.01) {
      allEntries.push({
        id: 'legacy-discrepancy',
        date: new Date(2000, 0, 1).toISOString(), // Push to the very bottom
        action: discrepancy > 0 ? 'ADD' : 'USE',
        amount: discrepancy,
        balanceAfter: -1,
        reason: 'Saldo Inicial (Sistema Antigo)'
      });
    }

    return allEntries;
  }, [customer.creditBalance, customer.creditHistory, legacyCreditTransactions]);

  const mergedDebtHistory = useMemo(() => {
    let allEntries = [...(customer.debtHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const historySum = allEntries.reduce((sum, t) => sum + t.amount, 0);
    const discrepancy = (customer.outstandingBalance || 0) - historySum;
    
    if (Math.abs(discrepancy) > 0.01) {
      allEntries.push({
        id: 'legacy-debt-discrepancy',
        date: new Date(2000, 0, 1).toISOString(), // Push to the very bottom
        action: discrepancy > 0 ? 'ADD' : 'PAY',
        amount: discrepancy,
        balanceAfter: -1,
        reason: 'Dívida Inicial (Sistema Antigo)'
      });
    }
    
    return allEntries;
  }, [customer.outstandingBalance, customer.debtHistory]);

  const creditHistory = mergedCreditHistory;
  const debtHistory = mergedDebtHistory;

  const creditSummary = useMemo(() => {
    let generated = 0;
    let used = 0;
    creditHistory.forEach(t => {
      if (t.amount > 0) generated += t.amount;
      if (t.amount < 0) used += Math.abs(t.amount);
    });
    return { generated, used };
  }, [creditHistory]);

  const debtSummary = useMemo(() => {
    let generated = 0;
    let paid = 0;
    debtHistory.forEach(t => {
      if (t.amount > 0) generated += t.amount;
      if (t.amount < 0) paid += Math.abs(t.amount);
    });
    return { generated, paid };
  }, [debtHistory]);

  const handleManualAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustAmount || Number(adjustAmount) === 0 || !adjustReason.trim()) return;

    setIsSubmitting(true);
    try {
      const amount = Number(adjustAmount);
      const isCredit = activeTab === 'CREDIT';
      
      const newEntry: CustomerLedgerEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        action: 'MANUAL_ADJUSTMENT',
        amount: amount,
        balanceAfter: isCredit 
          ? Math.max(0, (customer.creditBalance || 0) + amount)
          : Math.max(0, (customer.outstandingBalance || 0) + amount),
        reason: adjustReason.trim(),
        userId: userProfile?.id,
      };

      const updatedCustomer = { ...customer };
      
      if (isCredit) {
        updatedCustomer.creditBalance = newEntry.balanceAfter;
        updatedCustomer.creditHistory = [newEntry, ...creditHistory];
      } else {
        updatedCustomer.outstandingBalance = newEntry.balanceAfter;
        updatedCustomer.debtHistory = [newEntry, ...debtHistory];
      }

      const { error } = await supabase.from('customers').update({
        credit_balance: updatedCustomer.creditBalance,
        credit_history: updatedCustomer.creditHistory,
        outstanding_balance: updatedCustomer.outstandingBalance,
        debt_history: updatedCustomer.debtHistory,
      }).eq('id', customer.id);

      if (error) throw error;

      onUpdateCustomer(updatedCustomer);
      setIsAdjusting(false);
      setAdjustAmount('');
      setAdjustReason('');
    } catch (error) {
      console.error('Error saving adjustment:', error);
      alert('Erro ao salvar ajuste manual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimelineDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const historyToDisplay = activeTab === 'CREDIT' ? creditHistory : debtHistory;
  const currentBalance = activeTab === 'CREDIT' ? (customer.creditBalance || 0) : (customer.outstandingBalance || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-sm shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Wallet className="text-indigo-600 dark:text-indigo-400" size={18} /> Extrato Financeiro
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                Cliente: {customer.name}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-400 dark:text-zinc-500 hover:text-slate-600 transition-all">
              <X size={18} />
            </button>
          </div>

          <div className="flex bg-slate-100 dark:bg-zinc-800/50 rounded-sm p-1">
            <button
              onClick={() => { setActiveTab('CREDIT'); setIsAdjusting(false); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'CREDIT' ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <TrendingUp size={14} /> Créditos
            </button>
            <button
              onClick={() => { setActiveTab('DEBT'); setIsAdjusting(false); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'DEBT' ? 'bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <AlertTriangle size={14} /> Débitos (Fiado)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <div className="grid grid-cols-3 gap-3">
            <div className={`border p-3 rounded-sm text-center ${activeTab === 'CREDIT' ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900'}`}>
              <span className={`text-[8px] font-black uppercase tracking-wider block ${activeTab === 'CREDIT' ? 'text-purple-600' : 'text-rose-600'}`}>Saldo Atual</span>
              <span className={`text-sm font-black mt-1 block ${activeTab === 'CREDIT' ? 'text-purple-700' : 'text-rose-700'}`}>
                R$ {currentBalance.toFixed(2)}
              </span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-3 rounded-sm text-center">
              <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Gerado</span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                + R$ {(activeTab === 'CREDIT' ? creditSummary.generated : debtSummary.generated).toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700 p-3 rounded-sm text-center">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">{activeTab === 'CREDIT' ? 'Utilizado' : 'Pago'}</span>
              <span className="text-sm font-black text-slate-700 dark:text-slate-300 mt-1 block">
                - R$ {(activeTab === 'CREDIT' ? creditSummary.used : debtSummary.paid).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Histórico de Lançamentos</h4>
            <button
              onClick={() => setIsAdjusting(!isAdjusting)}
              className="text-[9px] font-black text-indigo-600 flex items-center gap-1 uppercase hover:underline"
            >
              <Edit2 size={12} /> Lançamento Manual
            </button>
          </div>

          {isAdjusting && (
            <form onSubmit={handleManualAdjustment} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-sm border border-indigo-100 dark:border-indigo-900 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Valor (R$)</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-sm p-2 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    placeholder="Ex: 50.00 ou -20.00"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                  <p className="text-[8px] text-slate-400 mt-1">Use valores negativos para reduzir o saldo.</p>
                </label>
                <label className="block">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Motivo / Observação</span>
                  <input
                    type="text"
                    required
                    className="w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-sm p-2 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    placeholder="Ex: Bônus de indicação..."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAdjusting(false)} className="px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase hover:bg-slate-100 rounded-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 text-[9px] font-black bg-indigo-600 text-white uppercase rounded-sm hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {historyToDisplay.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-zinc-800/40 rounded-sm border border-slate-100 dark:border-zinc-800">
                <p className="text-xs text-slate-400 font-bold uppercase">Nenhum lançamento registrado.</p>
              </div>
            ) : (
              historyToDisplay.map((t, idx) => (
                <div key={t.id || idx} className="p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/60 rounded-sm flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase">
                        {formatTimelineDate(t.date)}
                      </span>
                      {t.action === 'MANUAL_ADJUSTMENT' && (
                        <span className="text-[8px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded-sm uppercase">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-1 uppercase truncate">
                      {t.reason || (t.action === 'ADD' ? 'Gerado' : t.action === 'USE' ? 'Utilizado' : t.action === 'PAY' ? 'Pago' : t.action)}
                    </p>
                    {t.notes && <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase truncate">{t.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-black uppercase ${t.amount > 0 ? (activeTab === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600') : (activeTab === 'CREDIT' ? 'text-rose-600' : 'text-emerald-600')}`}>
                      {t.amount > 0 ? '+' : '-'} R$ {Math.abs(t.amount).toFixed(2)}
                    </p>
                    {t.balanceAfter !== -1 && (
                      <p className="text-[8px] font-black text-slate-400 uppercase mt-1">
                        Saldo: R$ {t.balanceAfter.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
