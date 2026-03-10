import React, { useState, useMemo, useEffect } from 'react';
import { Download, Upload, RefreshCw, CheckCircle2, AlertCircle, PlusCircle, X, Check, Search, Calendar, DollarSign, List, Filter, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Expense, ExpenseCategory, Supplier, Sale, Appointment, Customer, PaymentSetting, FinancialConfig } from '../types';
import { supabase } from '../services/supabase';
import { parseDateSafe, toLocalDateStr } from '../services/financialService';

interface ReconciledRow {
    id: string; // Unique ID for table row
    date: string;
    description: string;
    amount: number;
    type: 'RECEITA' | 'DESPESA';
    document?: string;
    status: 'CONCILIADOS' | 'A_LANCAR' | 'A_CONFERIR';
    matchId?: string; // ID of the matched expense from system
    matchType?: 'RECEITA' | 'DESPESA' | 'SERVICO'; // Identifies if it matched a Sale or an Expense or Appointment
    suggestedCategory?: string;
    suggestedProvider?: string;
    divergenceReason?: string;
    originalLines?: string[];
    fingerprint?: string;
}

interface BankReconciliationProps {
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    sales: Sale[];
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    customers: Customer[];
    categories: ExpenseCategory[];
    suppliers: Supplier[];
    providers: { id: string; name: string }[];
    setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    paymentSettings: PaymentSetting[];
    financialConfigs: FinancialConfig[];
    onClose: () => void;
}

// --- OPTIMIZED SUB-COMPONENT ---
const ReconciliationRow = React.memo(({
    row,
    index,
    isSelected,
    onToggle,
    onCategoryChange,
    onProviderChange,
    categoryOptions,
    entityOptions,
    onQuickCreateCategory,
    onQuickCreateEntity,
    onManualConfirm,
    onAdjustDate,
    onStartLinking,
    onCompleteLinking,
    isLinkingSource,
    isLinkingActive
}: {
    row: ReconciledRow,
    index: number,
    isSelected: boolean,
    onToggle: (id: string) => void,
    onCategoryChange: (id: string, cat: string) => void,
    onProviderChange: (id: string, prov: string) => void,
    categoryOptions: React.ReactNode,
    entityOptions: React.ReactNode,
    onQuickCreateCategory: (rowId: string, type: 'RECEITA' | 'DESPESA') => void,
    onQuickCreateEntity: (rowId: string, type: 'RECEITA' | 'DESPESA') => void,
    onManualConfirm?: (id: string) => void,
    onAdjustDate?: (id: string) => void,
    onStartLinking?: (id: string) => void,
    onCompleteLinking?: (id: string) => void,
    isLinkingSource?: boolean,
    isLinkingActive?: boolean
}) => {
    return (
        <tr
            className={`border-b border-slate-100 hover:bg-white transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''} ${isLinkingSource ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
            onClick={() => onToggle(row.id)}
        >
            <td className="p-4 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(row.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 focus:ring-offset-1"
                />
            </td>
            <td className="p-4 align-top">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                    {parseDateSafe(row.date).toLocaleDateString('pt-BR')}
                </div>
            </td>
            <td className="p-4 align-top">
                <p className="text-sm font-bold text-slate-800 uppercase leading-snug">{row.description}</p>
                {row.document && (
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Doc/Aut: {row.document}</p>
                )}
                {row.type === 'RECEITA' && (
                    <span className="inline-flex items-center gap-1.5 mt-2 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-200">
                        <DollarSign className="w-3 h-3 stroke-[3]" />
                        Recebimento em Conta
                    </span>
                )}
            </td>
            <td className="p-4 align-top">
                {(row.status === 'A_LANCAR' || row.status === 'CONCILIADOS') && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={row.suggestedCategory || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => onCategoryChange(row.id, e.target.value)}
                                className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-l-md border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px] appearance-none cursor-pointer"
                            >
                                {categoryOptions}
                            </select>
                            <button
                                onClick={(e) => { e.stopPropagation(); onQuickCreateCategory(row.id, row.type); }}
                                className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-r-md border-y border-r border-indigo-100 transition-colors"
                                title="Criar Nova Categoria"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <List className="w-4 h-4 text-slate-400" />
                            <select
                                value={row.suggestedProvider || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => onProviderChange(row.id, e.target.value)}
                                className="text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-l-md border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400 min-w-[140px] appearance-none cursor-pointer"
                                title={row.type === 'DESPESA' ? 'Selecionar Fornecedor' : 'Selecionar Cliente'}
                            >
                                <option value="">Favorecido (Opcional)</option>
                                {entityOptions}
                            </select>
                            <button
                                onClick={(e) => { e.stopPropagation(); onQuickCreateEntity(row.id, row.type); }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-r-md border-y border-r border-slate-200 transition-colors"
                                title={row.type === 'DESPESA' ? 'Criar Novo Fornecedor' : 'Criar Novo Cliente'}
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
                {row.status === 'A_CONFERIR' && (
                    <div className="flex flex-col gap-2">
                        <p className="text-xs leading-relaxed text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100 flex gap-2 items-start">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            {row.divergenceReason}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onAdjustDate?.(row.id); }}
                                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-md border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                                title="Mover para outro mês ou ajustar sistema"
                            >
                                <Calendar className="w-3 h-3" />
                                Ajustar
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onStartLinking?.(row.id); }}
                                className="px-2 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-black uppercase rounded-md border border-indigo-200 transition-all flex items-center justify-center gap-1.5"
                                title="Vincular este lançamento com uma linha do extrato"
                            >
                                <Upload className="w-3 h-3" />
                                Vincular
                            </button>
                        </div>
                    </div>
                )}
                {row.status === 'A_LANCAR' && isLinkingActive && (
                    <div className="mt-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onCompleteLinking?.(row.id); }}
                            className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 animate-pulse"
                        >
                            <Check className="w-4 h-4" />
                            Confirmar Vínculo aqui
                        </button>
                    </div>
                )}
                {row.status === 'CONCILIADOS' && (
                    <p className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Match Sistêmico Efetuado
                    </p>
                )}
            </td>
            <td className={`p-4 text-right align-top font-black text-sm tabular-nums ${row.type === 'RECEITA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                {row.type === 'DESPESA' ? '-' : '+'} R$ {row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
        </tr>
    );
});
ReconciliationRow.displayName = 'ReconciliationRow';

export const BankReconciliation: React.FC<BankReconciliationProps> = ({
    expenses, setExpenses, sales, setSales, appointments, setAppointments,
    customers, setCustomers, categories, setExpenseCategories, suppliers, setSuppliers,
    providers,
    paymentSettings, financialConfigs, onClose
}) => {
    const [rawText, setRawText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [reconciledRows, setReconciledRows] = useState<ReconciledRow[]>([]);
    const [activeTab, setActiveTab] = useState<'A_CONFERIR' | 'A_LANCAR' | 'CONCILIADOS'>('A_CONFERIR');
    const [approvalQueue, setApprovalQueue] = useState<Set<string>>(new Set());

    const [quickCreateType, setQuickCreateType] = useState<'CATEGORY' | 'ENTITY' | null>(null);
    const [quickCreatePayload, setQuickCreatePayload] = useState<{ id: string, type: 'RECEITA' | 'DESPESA' } | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [isSavingNewItem, setIsSavingNewItem] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [targetDate, setTargetDate] = useState<string | null>(null);
    const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL');
    const [learningMap, setLearningMap] = useState<Record<string, string>>({});
    const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);

    // MEMOIZE CALLBACKS TO PREVENT ROW RE-RENDERS
    const handleToggleSelect = React.useCallback((id: string) => {
        setApprovalQueue(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleCategoryChange = React.useCallback((id: string, newCategory: string) => {
        const row = reconciledRows.find(r => r.id === id);
        if (!row) return;

        const sameDescRows = reconciledRows.filter(r => r.id !== id && r.description === row.description && r.status === row.status);
        let updateAll = false;

        if (sameDescRows.length > 0) {
            updateAll = window.confirm(`Atenção: Existem outros ${sameDescRows.length} lançamentos EXATAMENTE com a mesma descrição "${row.description}". \n\nDeseja aplicar "${newCategory}" a TODOS eles de uma vez? \n\n(Clique em Cancelar se quiser alterar apenas este item específico)`);
        }

        setReconciledRows(prev => prev.map(r => {
            if (r.id === id || (updateAll && r.description === row.description && r.status === row.status)) {
                return { ...r, suggestedCategory: newCategory };
            }
            return r;
        }));
    }, [reconciledRows]);

    const handleProviderChange = React.useCallback((id: string, newProvider: string) => {
        const row = reconciledRows.find(r => r.id === id);
        if (!row) return;

        const sameDescRows = reconciledRows.filter(r => r.id !== id && r.description === row.description && r.status === row.status);
        let updateAll = false;

        if (sameDescRows.length > 0) {
            updateAll = window.confirm(`Atenção: Existem outros ${sameDescRows.length} lançamentos EXATAMENTE com a mesma descrição "${row.description}". \n\nDeseja aplicar este favorecido a TODOS eles de uma vez? \n\n(Clique em Cancelar se quiser alterar apenas este item específico)`);
        }

        setReconciledRows(prev => prev.map(r => {
            if (r.id === id || (updateAll && r.description === row.description && r.status === row.status)) {
                return { ...r, suggestedProvider: newProvider };
            }
            return r;
        }));
    }, [reconciledRows]);

    const handleQuickCreateCategory = React.useCallback((rowId: string, type: 'RECEITA' | 'DESPESA') => {
        setQuickCreatePayload({ id: rowId, type });
        setQuickCreateType('CATEGORY');
        setNewItemName('');
    }, []);

    const handleQuickCreateEntity = React.useCallback((rowId: string, type: 'RECEITA' | 'DESPESA') => {
        setQuickCreatePayload({ id: rowId, type });
        setQuickCreateType('ENTITY');
        setNewItemName('');
    }, []);

    const handleManualConfirm = React.useCallback((id: string) => {
        setReconciledRows(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'CONCILIADOS' as const } : r
        ));
    }, []);

    const handleAdjustDate = React.useCallback((id: string) => {
        const row = reconciledRows.find(r => r.id === id);
        if (!row) return;
        const newDate = prompt("Para qual data (AAAA-MM-DD) deseja mover este lançamento?", row.date);
        if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
            setReconciledRows(prev => prev.map(r =>
                r.id === id ? { ...r, date: newDate } : r
            ));
        } else if (newDate) {
            alert("Formato de data inválido. Use AAAA-MM-DD.");
        }
    }, [reconciledRows]);

    const handleStartLinking = React.useCallback((id: string) => {
        setLinkingSourceId(id);
        setActiveTab('A_LANCAR');
        alert("Agora encontre a linha correspondente no Extrato (A Lançar) e clique em 'Confirmar Vínculo aqui'.");
    }, []);

    const handleCancelLinking = React.useCallback(() => {
        setLinkingSourceId(null);
    }, []);

    const handleCompleteLinking = React.useCallback((bankRowId: string) => {
        setReconciledRows(prev => {
            const sourceRow = prev.find(r => r.id === linkingSourceId);
            if (!sourceRow) return prev;

            const mType = sourceRow.matchType || (sourceRow.type === 'DESPESA' ? 'DESPESA' : 'RECEITA');
            let sysCat = sourceRow.suggestedCategory;
            let sysProv = sourceRow.suggestedProvider;

            if (mType === 'DESPESA') {
                const e = expenses.find(x => x.id === sourceRow.matchId);
                if (e) {
                    sysCat = sysCat || e.category;
                    sysProv = sysProv || e.supplierId;
                }
            } else if (mType === 'RECEITA') {
                const s = sales.find(x => x.id === sourceRow.matchId);
                if (s) {
                    sysCat = sysCat || 'Produto';
                    sysProv = sysProv || s.customerId;
                }
            } else if (mType === 'SERVICO') {
                const a = appointments.find(x => x.id === sourceRow.matchId);
                if (a) {
                    sysCat = sysCat || 'Serviço';
                    sysProv = sysProv || a.customerId;
                }
            }

            return prev
                .filter(r => r.id !== linkingSourceId) // Remove the divergence source
                .map(r => r.id === bankRowId ? {
                    ...r,
                    status: 'CONCILIADOS' as const,
                    matchId: sourceRow.matchId,
                    matchType: mType,
                    suggestedCategory: sysCat,
                    suggestedProvider: sysProv
                } : r);
        });
        setLinkingSourceId(null);
    }, [linkingSourceId, expenses, sales, appointments]);

    const executeQuickCreate = async () => {
        if (!newItemName.trim() || !quickCreatePayload || !quickCreateType) return;
        setIsSavingNewItem(true);
        try {
            if (quickCreateType === 'CATEGORY') {
                const dreClass = quickCreatePayload.type === 'RECEITA' ? 'REVENUE' : 'EXPENSE';
                const { data, error } = await supabase.from('expense_categories').insert({
                    name: newItemName.trim(),
                    dre_class: dreClass,
                    is_system: false
                }).select().single();

                if (error) throw error;
                if (data) {
                    const newCat = { id: data.id, name: data.name, dreClass: data.dre_class, isSystem: data.is_system };
                    setExpenseCategories(prev => [...prev, newCat]);
                    handleCategoryChange(quickCreatePayload.id, data.name);
                }
            } else {
                if (quickCreatePayload.type === 'DESPESA') {
                    const { data, error } = await supabase.from('suppliers').insert({
                        name: newItemName.trim()
                    }).select().single();

                    if (error) throw error;
                    if (data) {
                        setSuppliers(prev => [...prev, data]);
                        handleProviderChange(quickCreatePayload.id, data.id);
                    }
                } else {
                    const { data, error } = await supabase.from('customers').insert({
                        name: newItemName.trim(),
                        status: 'Ativo'
                    }).select().single();

                    if (error) throw error;
                    if (data) {
                        const newCust = {
                            id: data.id,
                            name: data.name,
                            phone: '',
                            email: '',
                            registrationDate: data.created_at,
                            status: 'Novo',
                            lastVisit: null,
                            totalSpent: 0,
                            history: []
                        } as Customer;
                        setCustomers(prev => [...prev, newCust]);
                        handleProviderChange(quickCreatePayload.id, data.id);
                    }
                }
            }
            setQuickCreateType(null);
            setQuickCreatePayload(null);
        } catch (err) {
            console.error('Quick Create Error:', err);
            alert("Erro ao criar item. Verifique se já existe um item com esse nome.");
        } finally {
            setIsSavingNewItem(false);
        }
    };

    useEffect(() => {
        const fetchLearningData = async () => {
            try {
                const map: Record<string, string> = {};

                // Fetch recent expenses
                const { data: expData } = await supabase.from('expenses').select('description, category').order('date', { ascending: false }).limit(1000);
                if (expData) {
                    // Iterate backwards so newer ones overwrite older ones if duplicates exist
                    for (let i = expData.length - 1; i >= 0; i--) {
                        if (expData[i].description && expData[i].category) {
                            map[expData[i].description.toLowerCase()] = expData[i].category;
                        }
                    }
                }

                // Fetch recent sales for revenue mapping
                const { data: salesData } = await supabase.from('sales').select('items').order('date', { ascending: false }).limit(1000);
                if (salesData) {
                    for (let i = salesData.length - 1; i >= 0; i--) {
                        const items = salesData[i].items || [];
                        items.forEach((item: any) => {
                            if (item.name && item.source) {
                                map[item.name.toLowerCase()] = item.source;
                            }
                        });
                    }
                }

                setLearningMap(map);
            } catch (err) {
                console.error("Error fetching learning data for reconciliation:", err);
            }
        };
        fetchLearningData();
    }, []);

    const availableDates = useMemo(() => {
        const dates = new Set(reconciledRows.map(r => r.date));
        return Array.from(dates).sort();
    }, [reconciledRows]);

    const changeDate = (direction: number) => {
        if (availableDates.length === 0) return;

        let currentIndex = targetDate ? availableDates.indexOf(targetDate) : -1;

        if (currentIndex === -1) {
            currentIndex = direction > 0 ? 0 : availableDates.length - 1;
        } else {
            currentIndex += direction;
        }

        if (currentIndex < 0) currentIndex = 0;
        if (currentIndex >= availableDates.length) currentIndex = availableDates.length - 1;

        setTargetDate(availableDates[currentIndex]);
    };

    const formatDateDisplay = (dateStr: string | null) => {
        if (!dateStr) return 'FILTRAR POR DATA';
        const d = new Date(dateStr + 'T12:00:00');
        const day = d.getDate();
        const month = d.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
        const year = d.getFullYear();
        return `${day} DE ${month} DE ${year}`;
    };

    const parseBankText = async (text: string) => {
        setIsProcessing(true);
        try {
            const lines = text.split('\n');
            const parsedTransactions: Omit<ReconciledRow, 'id' | 'status'>[] = [];
            const counts: Record<string, number> = {};

            // Sicredi PDF-to-text pattern matcher
            // Matches: 02/01/2026 COMPRAS NACIONAIS TOULOUSE SAO PAULO BR VE0621684 -49,68 101.130,30
            const regex = /^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const match = line.match(regex);
                if (match) {
                    const [_, dateStr, descRaw, valueStr] = match;

                    // Convert dates like 02/01/2026 -> 2026-01-02
                    const [day, month, year] = dateStr.split('/');
                    const isoDate = `${year}-${month}-${day}`;

                    // Parse Brazilian currency format
                    const cleanValStr = valueStr.replace(/\./g, '').replace(',', '.');
                    const amount = parseFloat(cleanValStr);

                    if (isNaN(amount) || amount === 0) continue;

                    // Extract document code (typically the last alphanumeric string block)
                    const descParts = descRaw.trim().split(' ');
                    let document = '';
                    if (descParts.length > 1) {
                        const lastPart = descParts[descParts.length - 1];
                        // Document codes usually are alphanumeric and at least 5 chars long
                        if (/^[A-Z0-9]{5,}$/i.test(lastPart) && !['PAULO', 'MARKETPLACE'].includes(lastPart.toUpperCase())) {
                            document = lastPart;
                            descParts.pop();
                        }
                    }

                    // Clean descriptions
                    let description = descParts.join(' ').trim();
                    description = description.replace(/VE\d{7}.*$/, '').trim(); // Remove Sicredi Document code
                    description = description.replace(/PIX_CRED|PIX_DEB|CAPITA/, '').trim(); // Remove tags

                    const txType = amount < 0 ? 'DESPESA' : 'RECEITA';
                    const baseHash = `${isoDate}_${description}_${Math.abs(amount)}_${txType}_${document}`;
                    counts[baseHash] = (counts[baseHash] || 0) + 1;
                    const fingerprint = `${baseHash}_${counts[baseHash]}`;

                    parsedTransactions.push({
                        date: isoDate,
                        description: description,
                        document: document,
                        amount: Math.abs(amount),
                        type: txType,
                        fingerprint: fingerprint,
                        originalLines: [line]
                    });
                }
            }

            // Consultar DB para ver quais fingerprints já existem
            const fingerprints = parsedTransactions.map(t => t.fingerprint).filter(Boolean) as string[];
            let existingFingerprints: string[] = [];

            if (fingerprints.length > 0) {
                // Chunk queries to avoid URI too long errors from Supabase/PostgREST
                const chunkSize = 100;
                for (let i = 0; i < fingerprints.length; i += chunkSize) {
                    const chunk = fingerprints.slice(i, i + chunkSize);
                    const { data, error } = await supabase
                        .from('bank_transactions')
                        .select('fingerprint')
                        .in('fingerprint', chunk);

                    if (!error && data) {
                        existingFingerprints.push(...data.map(d => d.fingerprint));
                    }
                }
            }

            // Filtrar as transações que já existem no banco
            const existingMatches = parsedTransactions.filter(t => existingFingerprints.includes(t.fingerprint || ''));
            let newTransactions = parsedTransactions.filter(t => !existingFingerprints.includes(t.fingerprint || ''));

            // Se houver duplicatas, oferecer re-processamento
            if (existingMatches.length > 0) {
                const confirmReprocess = window.confirm(`Foram encontrados ${existingMatches.length} itens que já foram processados anteriormente. Deseja re-processá-los para realizar ajustes?`);
                if (confirmReprocess) {
                    newTransactions = parsedTransactions; // Process everything
                }
            }

            // Se não sobrar nada, avisar o usuário
            if (newTransactions.length === 0 && parsedTransactions.length > 0) {
                alert("Todos os lançamentos deste extrato já foram conciliados anteriormente!");
                setIsProcessing(false);
                return;
            }

            // Etapa 2 e 3: Comparação e Classificação apenas para os novos
            const processed = runReconciliationEngine(newTransactions);
            setReconciledRows(processed);

        } catch (err) {
            console.error(err);
            alert("Erro ao processar as linhas do extrato. Verifique o padrão copiado.");
        } finally {
            setIsProcessing(false);
        }
    };

    const normalize = (str: string) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const runReconciliationEngine = (rawRows: Omit<ReconciledRow, 'id' | 'status'>[]): ReconciledRow[] => {
        const results: ReconciledRow[] = [];
        const systemExpenses = [...expenses]; // Somente válidas
        const systemSales = [...sales];

        // System expenses track matches to find "A Conferir" (in system but not in bank)
        const matchedExpenseIds = new Set<string>();
        const matchedSaleIds = new Set<string>();
        const matchedAppointmentIds = new Set<string>();

        // 1. Map Bank Transactions
        rawRows.forEach((bankTx, index) => {
            const rowId = `bank_${index}_${bankTx.date}_${bankTx.amount}_${bankTx.description.substring(0, 10)}`;
            const bankDate = parseDateSafe(bankTx.date);

            // 2-day tolerance (before and after) — keeps matches tight and avoids cross-month false positives
            const dStart = new Date(bankDate); dStart.setDate(dStart.getDate() - 2);
            const dEnd = new Date(bankDate); dEnd.setDate(dEnd.getDate() + 2);
            const systemAppointments = [...appointments];

            let bestMatch: any = null;
            let matchConfidence = 0; // The higher, the better

            if (bankTx.type === 'DESPESA') {
                const candidates = systemExpenses.filter(e => {
                    if (matchedExpenseIds.has(e.id)) return false;
                    const expDate = parseDateSafe(e.date);
                    return expDate >= dStart && expDate <= dEnd && Math.abs(e.amount - bankTx.amount) < 0.01;
                });

                if (candidates.length > 0) {
                    bestMatch = candidates.find(c => {
                        const bDesc = bankTx.description.toLowerCase();
                        const cDesc = c.description.toLowerCase();
                        const supName = suppliers.find(s => s.id === c.supplierId)?.name.toLowerCase() || '';
                        return bDesc.includes(cDesc.substring(0, 5)) || (supName && bDesc.includes(supName.substring(0, 5)));
                    }) || candidates[0];
                    bankTx.matchType = 'DESPESA';
                }
            } else if (bankTx.type === 'RECEITA') {
                // Try Sales first
                const saleCandidates = systemSales.filter(s => {
                    if (matchedSaleIds.has(s.id)) return false;
                    const saleDate = parseDateSafe(s.date);
                    if (!(saleDate >= dStart && saleDate <= dEnd)) return false;

                    if (Math.abs(s.totalAmount - bankTx.amount) < 0.01) return true;

                    if (s.paymentMethod === 'Cartão de Crédito') {
                        const method = paymentSettings.find(p => p.method === 'Cartão de Crédito');
                        const fee = method?.fee || 0;
                        const anticipation = financialConfigs.find(c => c.validFrom <= s.date && c.anticipationEnabled)?.anticipationRate || 0;
                        const expectedNet = s.totalAmount * (1 - (fee / 100)) * (1 - (anticipation / 100));
                        return Math.abs(expectedNet - bankTx.amount) < 0.05;
                    }
                    return false;
                });

                if (saleCandidates.length > 0) {
                    bestMatch = saleCandidates[0];
                    bankTx.matchType = 'RECEITA';
                } else {
                    // Try Appointments
                    const appCandidates = systemAppointments.filter(app => {
                        if (matchedAppointmentIds.has(app.id)) return false;
                        const appDate = parseDateSafe(app.date);
                        if (!(appDate >= dStart && appDate <= dEnd)) return false;

                        const amount = app.pricePaid || app.amount || 0;
                        if (Math.abs(amount - bankTx.amount) < 0.01) return true;

                        if (app.paymentMethod === 'Cartão de Crédito') {
                            const method = paymentSettings.find(p => p.method === 'Cartão de Crédito');
                            const fee = method?.fee || 0;
                            const anticipation = financialConfigs.find(c => c.validFrom <= app.date && c.anticipationEnabled)?.anticipationRate || 0;
                            const expectedNet = amount * (1 - (fee / 100)) * (1 - (anticipation / 100));
                            return Math.abs(expectedNet - bankTx.amount) < 0.05;
                        }
                        return false;
                    });

                    if (appCandidates.length > 0) {
                        bestMatch = appCandidates[0];
                        bankTx.matchType = 'SERVICO';
                    }
                }
            }

            if (bestMatch) {
                if (bankTx.type === 'DESPESA') matchedExpenseIds.add(bestMatch.id);
                else {
                    if (bankTx.matchType === 'SERVICO') matchedAppointmentIds.add(bestMatch.id);
                    else matchedSaleIds.add(bestMatch.id);
                }

                let sysCat = undefined;
                let sysProv = undefined;
                const mType = bankTx.matchType || (bankTx.type === 'DESPESA' ? 'DESPESA' : 'RECEITA');

                if (mType === 'DESPESA') {
                    sysCat = bestMatch.category;
                    sysProv = bestMatch.supplierId;
                } else if (mType === 'RECEITA') {
                    sysCat = 'Produto';
                    sysProv = bestMatch.customerId;
                } else if (mType === 'SERVICO') {
                    sysCat = 'Serviço';
                    sysProv = bestMatch.customerId;
                }

                results.push({
                    ...bankTx,
                    id: rowId,
                    status: 'CONCILIADOS',
                    matchId: bestMatch.id,
                    matchType: mType,
                    suggestedCategory: sysCat,
                    suggestedProvider: sysProv
                });
            } else {
                // A Lançar: no banco, mas não no sistema. Define sugestão.
                const descLower = bankTx.description.toLowerCase();
                const descNorm = normalize(bankTx.description);

                // Priority 1: Explicit hardcoded rules (User preference overrides learning)
                let suggestedCat = null;

                if (bankTx.type === 'RECEITA') {
                    // Tenta identificar se é uma receita de serviço/venda/cartão
                    const isCardOrBankOrService =
                        descNorm.includes('pix') ||
                        descNorm.includes('ted') ||
                        descNorm.includes('debito') ||
                        descNorm.includes('credito') ||
                        descNorm.includes('visa') ||
                        descNorm.includes('master') ||
                        descNorm.includes('maquina') ||
                        descNorm.includes('ante') || // antecipação
                        descNorm.includes('venda') ||
                        descNorm.includes('serv') ||
                        descNorm.includes('receb');

                    if (isCardOrBankOrService) {
                        // Encontra a melhor categoria de receita no sistema
                        const revenueCats = categories.filter(c => c.dreClass === 'REVENUE');
                        const candidate =
                            revenueCats.find(c => normalize(c.name).includes('servico'))?.name ||
                            revenueCats.find(c => normalize(c.name).includes('venda'))?.name ||
                            revenueCats.find(c => normalize(c.name).includes('receita'))?.name ||
                            revenueCats[0]?.name;

                        suggestedCat = candidate || 'Receita de Serviços';
                    }
                } else {
                    if (descNorm.includes('uber') || descNorm.includes('99')) suggestedCat = 'Transporte por Aplicativo';
                    else if (descNorm.includes('ifood') || descNorm.includes('rappi')) suggestedCat = 'Alimentação';
                    else if (descNorm.includes('imposto') || descNorm.includes('darf') || descNorm.includes('das')) suggestedCat = 'Impostos';
                    else if (descNorm.includes('salario') || descNorm.includes('rh')) suggestedCat = 'Pessoal';
                    else if (descNorm.includes('facebook') || descNorm.includes('google')) suggestedCat = 'Marketing';
                    else if (descNorm.includes('pao de acucar') || descNorm.includes('assai') || descNorm.includes('atacadao')) suggestedCat = 'Insumos';
                }

                // Priority 2: Learn from past categorizations
                if (!suggestedCat) {
                    suggestedCat = learningMap[descLower];
                }

                // Priority 3: Fallback defaults
                if (!suggestedCat) {
                    if (bankTx.type === 'RECEITA') {
                        const revenueCats = categories.filter(c => c.dreClass === 'REVENUE');
                        suggestedCat = revenueCats[0]?.name || 'Receita de Serviços';
                    } else {
                        suggestedCat = 'Despesas Diversas';
                    }
                }

                results.push({
                    ...bankTx,
                    id: rowId,
                    status: 'A_LANCAR',
                    suggestedCategory: suggestedCat
                });
            }
        });

        // 2. Map System Transactions that didn't appear in the Bank (A CONFERIR)
        // Find expenses that happened around the exact period of the bank statement
        if (rawRows.length > 0) {
            // Sort to find min/max dates to define the statement "window"
            const sortedDates = rawRows.map(r => r.date).sort();
            const minDate = sortedDates[0];
            const maxDate = sortedDates[sortedDates.length - 1];

            systemExpenses.forEach(sysExp => {
                if (!matchedExpenseIds.has(sysExp.id) && !sysExp.isReconciled) {
                    if (sysExp.date >= minDate && sysExp.date <= maxDate) {
                        results.push({
                            id: `sys_${sysExp.id}`,
                            date: sysExp.date,
                            description: sysExp.description,
                            amount: sysExp.amount,
                            type: 'DESPESA',
                            status: 'A_CONFERIR',
                            divergenceReason: 'Lançado no sistema, mas ausente no extrato bancário. Validar se foi pago por fora (dinheiro) ou outra conta.',
                            matchId: sysExp.id,
                            matchType: 'DESPESA'
                        });
                    }
                }
            });

            sales.forEach(sysSale => {
                const method = sysSale.paymentMethod?.toLowerCase() || '';
                // Only sync Pix and Cash (Dinheiro) as requested. Exclude Cards/Boleto.
                const isSyncMethod = method.includes('pix') || method.includes('dinheiro') || method.includes('transferência') || method.includes('doc') || method.includes('ted');

                if (!matchedSaleIds.has(sysSale.id) && !sysSale.isReconciled && isSyncMethod) {
                    if (sysSale.date >= minDate && sysSale.date <= maxDate) {
                        results.push({
                            id: `sys_sale_${sysSale.id}`,
                            date: sysSale.date,
                            description: `Venda #${sysSale.id.substring(0, 5)}`,
                            amount: sysSale.totalAmount,
                            type: 'RECEITA',
                            status: 'A_CONFERIR',
                            divergenceReason: 'Venda lançada no sistema (Pix/Transf), mas não identificada no extrato.',
                            matchId: sysSale.id,
                            matchType: 'RECEITA'
                        });
                    }
                }
            });

            appointments.forEach(app => {
                const method = app.paymentMethod?.toLowerCase() || '';
                // Only sync Pix and Cash (Dinheiro) as requested. Exclude Cards/Boleto.
                const isSyncMethod = method.includes('pix') || method.includes('dinheiro') || method.includes('transferência') || method.includes('doc') || method.includes('ted');

                if (!matchedAppointmentIds.has(app.id) && !app.isReconciled && isSyncMethod) {
                    if (app.date >= minDate && app.date <= maxDate) {
                        const custName = customers.find(c => c.id === app.customerId)?.name || 'Cliente';
                        results.push({
                            id: `sys_app_${app.id}`,
                            date: app.date,
                            description: `Agendamento: ${custName}`,
                            amount: app.pricePaid || app.amount || 0,
                            type: 'RECEITA',
                            status: 'A_CONFERIR',
                            divergenceReason: 'Serviço lançado no sistema (Pix/Transf), mas não identificado no extrato.',
                            matchId: app.id,
                            matchType: 'SERVICO'
                        });
                    }
                }
            });
        }

        // Sort results by date
        return results.sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            return db - da; // Descending
        });
    };

    const handleApproveSelected = async () => {
        const queueSize = approvalQueue.size;
        const conciliadosRows = reconciledRows.filter(r => r.status === 'CONCILIADOS');
        if (queueSize === 0 && conciliadosRows.length === 0) return;

        setIsProcessing(true);
        // Include selected rows + ALL auto-matched CONCILIADOS rows (they should always be persisted)
        const selectedRows = reconciledRows.filter(r => approvalQueue.has(r.id));
        const allConciliadosRows = conciliadosRows;
        // Merge unique rows (selectedRows may also have CONCILIADOS status)
        const rowsToProcess = [...selectedRows];
        for (const row of allConciliadosRows) {
            if (!rowsToProcess.find(r => r.id === row.id)) rowsToProcess.push(row);
        }

        const newExpenses: Partial<Expense>[] = [];
        const newSales: any[] = [];
        const toUpdateExpenseStatus: string[] = [];
        const toUpdateSaleStatus: string[] = [];
        const toUpdateAppointmentStatus: string[] = [];
        const updatesToExecute: { type: 'EXPENSE' | 'SALE' | 'APPOINTMENT', id: string, date: string }[] = [];

        for (const row of rowsToProcess) {
            if (row.status === 'A_LANCAR') {
                // Create a new record for items found in the bank but not in the system.
                // is_reconciled=false: these are new launches, NOT reconciled matches.
                // They appear in the regular flow (Extrato/Fluxo), not in CONCILIADOS.
                if (row.type === 'DESPESA') {
                    // PREVENÇÃO DE DUPLICADOS: Antes de lançar como novo, verifica se já não existe uma despesa idêntica manualmente no sistema
                    // que o motor de busca pode ter perdido por causa da janela de 2 dias.
                    const existingExp = expenses.find(e =>
                        e.description === row.description &&
                        Math.abs(e.amount - row.amount) < 0.01 &&
                        e.date === row.date
                    );

                    if (existingExp) {
                        toUpdateExpenseStatus.push(existingExp.id);
                        updatesToExecute.push({ type: 'EXPENSE', id: existingExp.id, date: row.date });
                    } else {
                        newExpenses.push({
                            description: row.description,
                            amount: row.amount,
                            date: row.date,
                            supplierId: row.suggestedProvider || null,
                            category: row.suggestedCategory || 'Despesas Diversas',
                            dreClass: 'EXPENSE_ADM',
                            status: 'Pago',
                            paymentMethod: 'Transferência',
                            isReconciled: true  // Processed A_LANÇAR items are part of the conciliation
                        });
                    }
                } else if (row.type === 'RECEITA') {
                    // PREVENÇÃO DE DUPLICADOS PARA RECEITA: Evita criar duplicatas de entradas manuais ou re-processamento
                    const existingExp = expenses.find(e =>
                        e.description === row.description &&
                        Math.abs(e.amount - row.amount) < 0.01 &&
                        e.date === row.date
                    );

                    if (existingExp) {
                        toUpdateExpenseStatus.push(existingExp.id);
                        updatesToExecute.push({ type: 'EXPENSE', id: existingExp.id, date: row.date });
                    } else {
                        // Determina o dreClass com base na categoria selecionada:
                        // REVENUE = receita de serviços (Receita Bruta), OTHER_INCOME = devoluções/reembolsos (Outras Receitas)
                        const selectedCat = categories.find(c => c.name === row.suggestedCategory);
                        const revDreClass = selectedCat?.dreClass === 'OTHER_INCOME' ? 'OTHER_INCOME' : 'REVENUE';
                        const fallbackCat = categories.find(c => c.dreClass === 'REVENUE');
                        const entityForRevenue = row.suggestedProvider
                            ? (customers.find(x => x.id === row.suggestedProvider)?.name ||
                                providers.find(x => x.id === row.suggestedProvider)?.name ||
                                null)
                            : null;
                        newExpenses.push({
                            description: row.description,
                            amount: row.amount,
                            date: row.date,
                            category: row.suggestedCategory || fallbackCat?.name || 'Outras Receitas',
                            dreClass: revDreClass,
                            status: 'Pago',
                            paymentMethod: 'Transferência',
                            isReconciled: true,
                            ...(entityForRevenue ? { notes: entityForRevenue } : {})
                        } as any);
                    }
                }
            } else if (row.status === 'A_CONFERIR' || row.status === 'CONCILIADOS') {
                if (row.matchId) {
                    if (row.matchType === 'RECEITA') {
                        toUpdateSaleStatus.push(row.matchId);
                        updatesToExecute.push({ type: 'SALE', id: row.matchId, date: row.date });
                    } else if (row.matchType === 'SERVICO') {
                        toUpdateAppointmentStatus.push(row.matchId);
                        updatesToExecute.push({ type: 'APPOINTMENT', id: row.matchId, date: row.date });
                    } else {
                        toUpdateExpenseStatus.push(row.matchId);
                        updatesToExecute.push({ type: 'EXPENSE', id: row.matchId, date: row.date });
                    }
                }
            }
        }

        const newBankTransactions: any[] = [];

        for (const row of rowsToProcess) {
            if (row.id.startsWith('bank_')) {
                let systemCategory = row.suggestedCategory || null;
                let systemEntityName = null;
                let systemPaymentMethod = null;

                if (row.status === 'CONCILIADOS' && row.matchId) {
                    if (row.matchType === 'RECEITA') {
                        const s = sales.find(x => x.id === row.matchId);
                        systemCategory = row.suggestedCategory || 'Produto';
                        const c = customers.find(x => x.id === row.suggestedProvider || x.id === s?.customerId);
                        systemEntityName = c?.name || 'Fluxo de Loja';
                        systemPaymentMethod = s?.paymentMethod;
                    } else if (row.matchType === 'SERVICO') {
                        const a = appointments.find(x => x.id === row.matchId);
                        systemCategory = row.suggestedCategory || 'Serviço';
                        const c = customers.find(x => x.id === row.suggestedProvider || x.id === a?.customerId);
                        systemEntityName = c?.name;
                        systemPaymentMethod = a?.paymentMethod;
                    } else if (row.matchType === 'DESPESA') {
                        const e = expenses.find(x => x.id === row.matchId);
                        systemCategory = row.suggestedCategory || e?.category;
                        const sup = suppliers.find(x => x.id === row.suggestedProvider || x.id === e?.supplierId);
                        systemEntityName = sup?.name;
                        systemPaymentMethod = e?.paymentMethod;
                    }
                } else if (row.status === 'A_LANCAR') {
                    systemCategory = row.suggestedCategory || (row.type === 'DESPESA' ? categories[0]?.name : 'Serviço');
                    if (row.type === 'DESPESA') {
                        const entity = suppliers.find(x => x.id === row.suggestedProvider);
                        systemEntityName = entity?.name || null;
                    } else {
                        // Para receitas, busca tanto em clientes quanto em profissionais
                        const customerEntity = customers.find(x => x.id === row.suggestedProvider);
                        const providerEntity = providers.find(x => x.id === row.suggestedProvider);
                        systemEntityName = customerEntity?.name || providerEntity?.name || null;
                    }
                    systemPaymentMethod = 'Transferência';
                }

                newBankTransactions.push({
                    date: row.date,
                    description: row.description,
                    document: row.document || null,
                    amount: Math.abs(row.amount),
                    type: row.type,
                    fingerprint: row.fingerprint,
                    system_category: systemCategory,
                    system_entity_name: systemEntityName,
                    system_payment_method: systemPaymentMethod
                });
            }
        }

        try {
            console.log('Starting Batch Approval:', {
                toUpdateExpenseStatus: toUpdateExpenseStatus.length,
                toUpdateSaleStatus: toUpdateSaleStatus.length,
                toUpdateAppointmentStatus: toUpdateAppointmentStatus.length
            });

            if (newExpenses.length > 0) {
                const mappedInserts = newExpenses.map(e => ({
                    description: e.description,
                    amount: e.amount,
                    date: e.date,
                    category: e.category,
                    dre_class: e.dreClass,
                    status: e.status,
                    payment_method: e.paymentMethod,
                    is_reconciled: e.isReconciled ?? true
                }));
                const { data, error } = await supabase.from('expenses').insert(mappedInserts).select();
                if (error) {
                    console.error('Error inserting new expenses:', error);
                    throw error;
                }
                if (data) {
                    setExpenses(prev => [...prev, ...data.map(d => ({
                        id: d.id, description: d.description, amount: d.amount, date: d.date,
                        category: d.category, dreClass: d.dre_class, status: d.status, paymentMethod: d.payment_method, isReconciled: true
                    } as Expense))]);
                }
            }

            if (newSales.length > 0) {
                const { data, error } = await supabase.from('sales').insert(newSales).select();
                if (error) {
                    console.error("Error inserting sales:", error);
                    throw error;
                }

                if (data) {
                    setSales(prev => [...prev, ...data.map(s => ({
                        id: s.id,
                        customerId: s.customer_id,
                        date: s.date,
                        totalAmount: s.total_amount,
                        paymentMethod: s.payment_method,
                        items: s.items || [],
                        status: s.status,
                        isReconciled: s.is_reconciled
                    } as Sale))]);
                }
            }

            if (updatesToExecute.length > 0) {
                const updatePromises = updatesToExecute.map(u => {
                    if (u.type === 'SALE') {
                        return supabase.from('sales').update({ is_reconciled: true, date: u.date }).eq('id', u.id);
                    } else if (u.type === 'APPOINTMENT') {
                        return supabase.from('appointments').update({ is_reconciled: true, payment_date: u.date }).eq('id', u.id);
                    } else {
                        return supabase.from('expenses').update({ status: 'Pago', is_reconciled: true, date: u.date }).eq('id', u.id);
                    }
                });

                await Promise.all(updatePromises);

                setExpenses(prev => prev.map(e => {
                    const update = updatesToExecute.find(u => u.type === 'EXPENSE' && u.id === e.id);
                    return update ? { ...e, status: 'Pago', isReconciled: true, date: update.date } : e;
                }));

                setSales(prev => prev.map(s => {
                    const update = updatesToExecute.find(u => u.type === 'SALE' && u.id === s.id);
                    return update ? { ...s, isReconciled: true, date: update.date } : s;
                }));

                setAppointments(prev => prev.map(a => {
                    const update = updatesToExecute.find(u => u.type === 'APPOINTMENT' && u.id === a.id);
                    return update ? { ...a, isReconciled: true, paymentDate: update.date } : a;
                }));
            }

            if (newBankTransactions.length > 0) {
                const { error } = await supabase.from('bank_transactions').upsert(newBankTransactions, { onConflict: 'fingerprint', ignoreDuplicates: true });
                if (error) {
                    console.error('Error inserting bank_transactions:', error);
                    throw error;
                }
            }

            // Update processed items to 'CONCILIADOS' so they reflect in the success tab
            setReconciledRows(prev => prev.map(r => approvalQueue.has(r.id) ? { ...r, status: 'CONCILIADOS' } : r));
            setApprovalQueue(new Set());
            alert("Lançamentos conciliados com sucesso!");

        } catch (err) {
            console.error('Conciliation Error:', err);
            alert("Erro ao salvar reconciliação. Verifique o console.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResetMonth = async () => {
        if (!targetDate) {
            alert("Por favor, selecione um dia no mês que deseja limpar usando o filtro de data.");
            return;
        }
        const [year, month] = targetDate.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        if (!window.confirm(`⚠️ ATENÇÃO: Isso irá remover TODA a conciliação de ${monthName}. \n\nIsso desmarcará despesas, vendas e agendamentos como conciliados para que você possa refazer o processo do zero. \n\nDeseja continuar?`)) {
            return;
        }

        setIsCleaning(true);
        try {
            // Get first and last day of month
            const start = `${year}-${month}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const end = `${year}-${month}-${lastDay}`;

            console.log(`Resetting month: ${start} to ${end}`);

            // 1. Reset entries
            const { error: err1 } = await supabase.from('expenses').update({ is_reconciled: false }).gte('date', start).lte('date', end);
            const { error: err2 } = await supabase.from('sales').update({ is_reconciled: false }).gte('date', start).lte('date', end);
            const { error: err3 } = await supabase.from('appointments').update({ is_reconciled: false }).gte('payment_date', start).lte('payment_date', end);

            // 2. Delete bank transactions fingerprints for this month to allow re-entry
            const { error: err4 } = await supabase.from('bank_transactions').delete().gte('date', start).lte('date', end);

            if (err1 || err2 || err3 || err4) {
                console.error('Error resetting month:', { err1, err2, err3, err4 });
                alert("Ocorreu um problema ao limpar alguns registros. Verifique o console.");
            } else {
                alert("Conciliação mensal limpa com sucesso! Feche e abra a tela para atualizar os dados.");
                onClose();
            }
        } catch (err) {
            console.error('General Error resetting month:', err);
            alert("Erro ao limpar conciliação.");
        } finally {
            setIsCleaning(false);
        }
    };

    const filteredRows = useMemo(() => {
        return reconciledRows.filter(r => {
            if (r.status !== activeTab) return false;
            if (searchTerm && !r.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;

            if (targetDate) {
                if (r.date !== targetDate) return false;
            }

            if (transactionTypeFilter !== 'ALL') {
                if (r.type !== transactionTypeFilter) return false;
            }

            return true;
        });
    }, [reconciledRows, activeTab, searchTerm, targetDate, transactionTypeFilter]);

    const handleSelectAll = React.useCallback(() => {
        const visibleRows = filteredRows;
        setApprovalQueue(prev => {
            if (prev.size >= visibleRows.length && visibleRows.every(r => prev.has(r.id))) {
                return new Set();
            } else {
                return new Set(visibleRows.map(r => r.id));
            }
        });
    }, [filteredRows]);

    const stats = useMemo(() => ({
        conciliados: reconciledRows.filter(r => r.status === 'CONCILIADOS').length,
        a_lancar: reconciledRows.filter(r => r.status === 'A_LANCAR').length,
        a_conferir: reconciledRows.filter(r => r.status === 'A_CONFERIR').length,
    }), [reconciledRows]);

    // PRE-RENDER OPTIONS FOR PERFORMANCE
    const expenseCategoryOptions = useMemo(() =>
        categories.filter(c => c.dreClass !== 'REVENUE' && c.dreClass !== 'OTHER_INCOME').map(c => <option key={c.id} value={c.name}>{c.name}</option>)
        , [categories]);

    // Revenue categories: REVENUE (Receita Bruta) + OTHER_INCOME (Devolução/Reembolso/Aporte → Outras Receitas)
    const revenueCategoryOptions = useMemo(() =>
        categories.filter(c => c.dreClass === 'REVENUE' || c.dreClass === 'OTHER_INCOME').map(c => <option key={c.id} value={c.name}>{c.name}</option>)
        , [categories]);

    const supplierOptions = useMemo(() =>
        suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
        , [suppliers]);

    const customerOptions = useMemo(() =>
        customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
        , [customers]);

    // Receitas podem ter como favorecido tanto clientes quanto profissionais (para repasses etc)
    const revenueEntityOptions = useMemo(() => [
        ...customers.map(c => <option key={`cust-${c.id}`} value={c.id}>{c.name}</option>),
        ...providers.map(p => <option key={`prov-${p.id}`} value={p.id}>[💇] {p.name}</option>)
    ], [customers, providers]);

    // Despesas podem ter como favorecido fornecedores E profissionais (ex: Repasse Comissão)
    const expenseEntityOptions = useMemo(() => [
        ...suppliers.map(s => <option key={`sup-${s.id}`} value={s.id}>{s.name}</option>),
        ...providers.map(p => <option key={`prov-${p.id}`} value={p.id}>[💇] {p.name}</option>)
    ], [suppliers, providers]);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center py-10 overflow-y-auto">
            <div className="bg-white max-w-6xl w-full rounded-2xl shadow-xl border border-slate-200 flex flex-col m-auto min-h-[600px] h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl">
                            <RefreshCw className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Conciliação Bancária Inteligente</h2>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Sincronize extratos (PDF/Texto) em segundos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {reconciledRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Importar Extrato Bancário</h3>
                            <p className="text-sm text-slate-500 max-w-md text-center">Cole abaixo o texto extraído do seu extrato bancário em PDF do Sicredi (ou outro padrão). A inteligência Aminna cruzará os dados com seu sistema para encontrar furos.</p>

                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Cole o texto do extrato aqui..."
                                className="w-full max-w-2xl h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-inner"
                            />

                            <button
                                onClick={() => parseBankText(rawText)}
                                disabled={!rawText || isProcessing}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Iniciar Cruzamento de Dados
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
                                <button onClick={() => setActiveTab('A_LANCAR')} className={`p-4 rounded-xl border flex flex-col gap-1 text-left transition-all ${activeTab === 'A_LANCAR' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                                        <PlusCircle className="w-5 h-5" />
                                        <span className="font-bold uppercase text-[10px] tracking-widest">A Lançar (Novo no Banco)</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-800">{stats.a_lancar}</span>
                                    <span className="text-xs font-semibold text-slate-500">Encontrados no extrato</span>
                                </button>

                                <button onClick={() => setActiveTab('A_CONFERIR')} className={`p-4 rounded-xl border flex flex-col gap-1 text-left transition-all ${activeTab === 'A_CONFERIR' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-rose-300'}`}>
                                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="font-bold uppercase text-[10px] tracking-widest">A Conferir (Divergência)</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-800">{stats.a_conferir}</span>
                                    <span className="text-xs font-semibold text-slate-500">Lançados, mas sumiram</span>
                                </button>

                                <button onClick={() => setActiveTab('CONCILIADOS')} className={`p-4 rounded-xl border flex flex-col gap-1 text-left transition-all ${activeTab === 'CONCILIADOS' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="font-bold uppercase text-[10px] tracking-widest">Já Conciliados (Batem)</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-800">{stats.conciliados}</span>
                                    <span className="text-xs font-semibold text-slate-500">Despesas validadas no extrato</span>
                                </button>
                            </div>

                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar histórico..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold w-64 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                                        <button
                                            onClick={() => changeDate(-1)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center px-2 min-w-[150px] justify-center">
                                            {targetDate ? (
                                                <button onClick={() => setTargetDate(null)} className="text-[11px] font-black uppercase text-indigo-700 tracking-wider hover:text-rose-500 transition-colors flex items-center gap-1">
                                                    {formatDateDisplay(targetDate)}
                                                    <X className="w-3 h-3 ml-1" />
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-1 group">
                                                    <select
                                                        className="bg-slate-100 dark:bg-zinc-800 border-none text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 outline-none px-2 py-1 rounded-md cursor-pointer hover:bg-slate-200"
                                                        onChange={(e) => {
                                                            const month = e.target.value;
                                                            if (month) {
                                                                const year = (document.getElementById('reset-year-select') as HTMLSelectElement)?.value || '2026';
                                                                setTargetDate(`${year}-${month}-01`);
                                                            }
                                                        }}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>MÊS</option>
                                                        <option value="01">JANEIRO</option>
                                                        <option value="02">FEVEREIRO</option>
                                                        <option value="03">MARÇO</option>
                                                        <option value="04">ABRIL</option>
                                                        <option value="05">MAIO</option>
                                                        <option value="06">JUNHO</option>
                                                        <option value="07">JULHO</option>
                                                        <option value="08">AGOSTO</option>
                                                        <option value="09">SETEMBRO</option>
                                                        <option value="10">OUTUBRO</option>
                                                        <option value="11">NOVEMBRO</option>
                                                        <option value="12">DEZEMBRO</option>
                                                    </select>
                                                    <select
                                                        id="reset-year-select"
                                                        className="bg-slate-100 dark:bg-zinc-800 border-none text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 outline-none px-2 py-1 rounded-md cursor-pointer hover:bg-slate-200"
                                                        onChange={(e) => {
                                                            const year = e.target.value;
                                                            const month = (document.querySelector('select:has(option[value="01"])') as HTMLSelectElement)?.value;
                                                            if (year && month) {
                                                                setTargetDate(`${year}-${month}-01`);
                                                            }
                                                        }}
                                                        defaultValue="2026"
                                                    >
                                                        <option value="2025">2025</option>
                                                        <option value="2026">2026</option>
                                                        <option value="2027">2027</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => changeDate(1)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                                        <button
                                            onClick={() => setTransactionTypeFilter('ALL')}
                                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all ${transactionTypeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => setTransactionTypeFilter('RECEITA')}
                                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all ${transactionTypeFilter === 'RECEITA' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600'}`}
                                        >
                                            Receitas
                                        </button>
                                        <button
                                            onClick={() => setTransactionTypeFilter('DESPESA')}
                                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all ${transactionTypeFilter === 'DESPESA' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-rose-600'}`}
                                        >
                                            Despesas
                                        </button>
                                    </div>

                                    {linkingSourceId && (
                                        <button
                                            onClick={handleCancelLinking}
                                            className="px-3 py-1.5 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg border border-rose-200 hover:bg-rose-200 transition-all flex items-center gap-2"
                                        >
                                            <X className="w-3 h-3" />
                                            Cancelar Vínculo Manual
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {approvalQueue.size > 0 && (
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                            {approvalQueue.size} selecionados
                                        </span>
                                    )}
                                    <button
                                        onClick={handleResetMonth}
                                        disabled={isProcessing || isCleaning || !targetDate}
                                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-sm border border-rose-200 transition-all flex items-center gap-2"
                                        title="Limpar toda a conciliação deste mês para refazer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Limpar Mês
                                    </button>
                                    <button
                                        onClick={handleApproveSelected}
                                        disabled={(approvalQueue.size === 0 && reconciledRows.filter(r => r.status === 'CONCILIADOS').length === 0) || isProcessing}
                                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        Processar Lançamentos
                                    </button>
                                </div>
                            </div>

                            {/* List Component inside Container */}
                            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 relative">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                        <tr>
                                            <th className="p-4 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredRows.length > 0 && filteredRows.every(fr => approvalQueue.has(fr.id))}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 focus:ring-offset-1"
                                                />
                                            </th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Data do Extrato</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Histórico / Descrição</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Classificação Sugerida / Info</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Valor Extrato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.slice(0, 50).map((row, index) => (
                                            <ReconciliationRow
                                                key={row.id}
                                                row={row}
                                                index={index}
                                                isSelected={approvalQueue.has(row.id)}
                                                onToggle={handleToggleSelect}
                                                onCategoryChange={handleCategoryChange}
                                                onProviderChange={handleProviderChange}
                                                categoryOptions={row.type === 'DESPESA' ? expenseCategoryOptions : revenueCategoryOptions}
                                                entityOptions={row.type === 'DESPESA' ? expenseEntityOptions : revenueEntityOptions}
                                                onQuickCreateCategory={handleQuickCreateCategory}
                                                onQuickCreateEntity={handleQuickCreateEntity}
                                                onManualConfirm={handleManualConfirm}
                                                onAdjustDate={handleAdjustDate}
                                                onStartLinking={handleStartLinking}
                                                onCompleteLinking={handleCompleteLinking}
                                                isLinkingSource={linkingSourceId === row.id}
                                                isLinkingActive={!!linkingSourceId}
                                            />
                                        ))}
                                        {filteredRows.length > 50 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-slate-500 font-medium bg-slate-50 italic">
                                                    Exibindo os primeiros 50 resultados de {filteredRows.length}. Refine sua busca ou utilize o filtro de data se necessário.
                                                </td>
                                            </tr>
                                        )}
                                        {filteredRows.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm bg-white">
                                                    Nenhum resultado encontrado nesta categoria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* QUICK CREATE MODAL OVERLAY */}
            {quickCreateType && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-100">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                                <PlusCircle className="w-5 h-5 text-indigo-600" />
                                {quickCreateType === 'CATEGORY' ? 'Nova Categoria' : (quickCreatePayload?.type === 'DESPESA' ? 'Novo Fornecedor' : 'Novo Cliente')}
                            </h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium uppercase tracking-wider">Nome do Registro</p>

                            <input
                                autoFocus
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && executeQuickCreate()}
                                placeholder="Digite o nome..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all mb-6"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setQuickCreateType(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executeQuickCreate}
                                    disabled={!newItemName.trim() || isSavingNewItem}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSavingNewItem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
