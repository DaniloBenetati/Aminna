import React, { useState, useMemo, useEffect } from 'react';
import { Download, Upload, RefreshCw, CheckCircle2, AlertCircle, PlusCircle, X, Check, Search, Calendar, DollarSign, List, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Expense, ExpenseCategory, Supplier, Sale, Appointment } from '../types';
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
    divergenceReason?: string;
    originalLines?: string[];
}

interface BankReconciliationProps {
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    sales: Sale[];
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    categories: ExpenseCategory[];
    suppliers: Supplier[];
    paymentSettings: any[];
    financialConfigs: any[];
    onClose: () => void;
}

const REVENUE_CATEGORIES = [
    'Outras Receitas',
    'Receita de Serviços',
    'Vendas de Produtos',
    'Rendimento / Aplicação',
    'Aporte Financeiro'
];

export const BankReconciliation: React.FC<BankReconciliationProps> = ({
    expenses, setExpenses, sales, setSales, appointments, setAppointments,
    categories, suppliers, paymentSettings, financialConfigs, onClose
}) => {
    const [rawText, setRawText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [reconciledRows, setReconciledRows] = useState<ReconciledRow[]>([]);
    const [activeTab, setActiveTab] = useState<'A_CONFERIR' | 'A_LANCAR' | 'CONCILIADOS'>('A_CONFERIR');
    const [approvalQueue, setApprovalQueue] = useState<string[]>([]);

    // Filtro rápido
    const [searchTerm, setSearchTerm] = useState('');
    const [targetDate, setTargetDate] = useState<string | null>(null);
    const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL');
    const [learningMap, setLearningMap] = useState<Record<string, string>>({});

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

    const parseBankText = (text: string) => {
        setIsProcessing(true);
        try {
            const lines = text.split('\n');
            const parsedTransactions: Omit<ReconciledRow, 'id' | 'status'>[] = [];

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

                    parsedTransactions.push({
                        date: isoDate,
                        description: description,
                        document: document,
                        amount: Math.abs(amount),
                        type: amount < 0 ? 'DESPESA' : 'RECEITA',
                        originalLines: [line]
                    });
                }
            }

            // Etapa 2 e 3: Comparação e Classificação
            const processed = runReconciliationEngine(parsedTransactions);
            setReconciledRows(processed);

        } catch (err) {
            console.error(err);
            alert("Erro ao processar as linhas do extrato. Verifique o padrão copiado.");
        } finally {
            setIsProcessing(false);
        }
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
            const rowId = `bank_${index}_${bankTx.date}`;
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

                results.push({
                    ...bankTx,
                    id: rowId,
                    status: 'CONCILIADOS',
                    matchId: bestMatch.id,
                    matchType: bankTx.matchType || bankTx.type
                });
            } else {
                // A Lançar: no banco, mas não no sistema. Define sugestão.
                const descLower = bankTx.description.toLowerCase();

                // First attempt: Learn from past categorizations
                let suggestedCat = learningMap[descLower];

                if (!suggestedCat) {
                    // Second attempt: Fallback to rules and defaults
                    suggestedCat = bankTx.type === 'RECEITA' ? 'Receita de Serviços' : 'Despesas Diversas';

                    if (bankTx.type === 'RECEITA') {
                        if (descLower.includes('pix')) suggestedCat = 'Receita de Serviços';
                        else if (descLower.includes('ted')) suggestedCat = 'Receita de Serviços';
                    } else {
                        if (descLower.includes('imposto') || descLower.includes('darf') || descLower.includes('das')) suggestedCat = 'Impostos';
                        else if (descLower.includes('salario') || descLower.includes('rh')) suggestedCat = 'Pessoal';
                        else if (descLower.includes('ifood') || descLower.includes('rappi')) suggestedCat = 'Alimentação';
                        else if (descLower.includes('uber') || descLower.includes('99')) suggestedCat = 'Transporte';
                        else if (descLower.includes('facebook') || descLower.includes('google')) suggestedCat = 'Marketing';
                        else if (descLower.includes('pao de acucar') || descLower.includes('assai') || descLower.includes('atacadao')) suggestedCat = 'Insumos';
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
                if (!matchedExpenseIds.has(sysExp.id)) {
                    // It wasn't matched. Let's check if it falls within the bank statement date range
                    if (sysExp.date >= minDate && sysExp.date <= maxDate) {
                        results.push({
                            id: `sys_${sysExp.id}`,
                            date: sysExp.date,
                            description: sysExp.description,
                            amount: sysExp.amount,
                            type: 'DESPESA',
                            status: 'A_CONFERIR',
                            divergenceReason: 'Lançado no sistema, mas ausente no extrato bancário. Validar se foi pago por fora (dinheiro) ou outra conta.',
                            matchId: sysExp.id
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
        if (approvalQueue.length === 0 && reconciledRows.filter(r => r.status === 'CONCILIADOS').length === 0) return;

        setIsProcessing(true);
        // Include selected rows + ALL auto-matched CONCILIADOS rows (they should always be persisted)
        const selectedRows = reconciledRows.filter(r => approvalQueue.includes(r.id));
        const allConciliadosRows = reconciledRows.filter(r => r.status === 'CONCILIADOS');
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

        for (const row of rowsToProcess) {
            if (row.status === 'A_LANCAR') {
                // Create a new record for items found in the bank but not in the system.
                // is_reconciled=false: these are new launches, NOT reconciled matches.
                // They appear in the regular flow (Extrato/Fluxo), not in CONCILIADOS.
                if (row.type === 'DESPESA') {
                    newExpenses.push({
                        description: row.description,
                        amount: row.amount,
                        date: row.date,
                        category: row.suggestedCategory || 'Despesas Diversas',
                        dreClass: 'EXPENSE_ADM',
                        status: 'Pago',
                        paymentMethod: 'Transferência',
                        isReconciled: true  // Processed A_LANÇAR items are part of the conciliation
                    });
                } else if (row.type === 'RECEITA') {
                    newSales.push({
                        date: row.date,
                        total_price: row.amount,
                        total_amount: row.amount,
                        payment_method: 'Transferência',
                        is_reconciled: true,  // Part of conciliation once processed
                        items: [{ name: row.description, quantity: 1, price: row.amount }]
                    });
                }
            } else if (row.status === 'A_CONFERIR' || row.status === 'CONCILIADOS') {
                if (row.matchId) {
                    if (row.matchType === 'RECEITA') toUpdateSaleStatus.push(row.matchId);
                    else if (row.matchType === 'SERVICO') toUpdateAppointmentStatus.push(row.matchId);
                    else toUpdateExpenseStatus.push(row.matchId);
                }
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

            if (toUpdateExpenseStatus.length > 0) {
                const { error } = await supabase.from('expenses').update({ status: 'Pago', is_reconciled: true }).in('id', toUpdateExpenseStatus);
                if (error) {
                    console.error('Error updating expenses as reconciled:', error);
                    throw error;
                }
                setExpenses(prev => prev.map(e => toUpdateExpenseStatus.includes(e.id) ? { ...e, status: 'Pago', isReconciled: true } : e));
            }

            if (toUpdateSaleStatus.length > 0) {
                const { error } = await supabase.from('sales').update({ is_reconciled: true }).in('id', toUpdateSaleStatus);
                if (error) {
                    console.error('Error updating sales as reconciled:', error);
                    throw error;
                }
                setSales(prev => prev.map(s => toUpdateSaleStatus.includes(s.id) ? { ...s, isReconciled: true } : s));
            }

            if (toUpdateAppointmentStatus.length > 0) {
                const { error } = await supabase.from('appointments').update({ is_reconciled: true }).in('id', toUpdateAppointmentStatus);
                if (error) {
                    console.error('Error updating appointments as reconciled:', error);
                    throw error;
                }
                setAppointments(prev => prev.map(a => toUpdateAppointmentStatus.includes(a.id) ? { ...a, isReconciled: true } : a));
            }

            // Update processed items to 'CONCILIADOS' so they reflect in the success tab
            setReconciledRows(prev => prev.map(r => approvalQueue.includes(r.id) ? { ...r, status: 'CONCILIADOS' } : r));
            setApprovalQueue([]);
            alert("Lançamentos conciliados com sucesso!");

        } catch (err) {
            console.error('Conciliation Error:', err);
            alert("Erro ao salvar reconciliação. Verifique o console.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleSelect = (id: string) => {
        setApprovalQueue(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleCategoryChange = (id: string, newCategory: string) => {
        setReconciledRows(prev => prev.map(r => r.id === id ? { ...r, suggestedCategory: newCategory } : r));
    };

    const handleSelectAll = () => {
        const visibleRows = filteredRows;
        if (approvalQueue.length === visibleRows.length) {
            setApprovalQueue([]);
        } else {
            setApprovalQueue(visibleRows.map(r => r.id));
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

    const stats = {
        conciliados: reconciledRows.filter(r => r.status === 'CONCILIADOS').length,
        a_lancar: reconciledRows.filter(r => r.status === 'A_LANCAR').length,
        a_conferir: reconciledRows.filter(r => r.status === 'A_CONFERIR').length,
    };

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
                                        <div className="flex items-center px-2">
                                            {targetDate ? (
                                                <button onClick={() => setTargetDate(null)} className="text-[11px] font-black uppercase text-indigo-700 tracking-wider hover:text-rose-500 transition-colors flex items-center gap-1">
                                                    {formatDateDisplay(targetDate)}
                                                    <X className="w-3 h-3 ml-1" />
                                                </button>
                                            ) : (
                                                <button onClick={() => setTargetDate(availableDates.length > 0 ? availableDates[0] : new Date().toISOString().split('T')[0])} className="text-[10px] font-black uppercase text-slate-400 tracking-wider hover:text-indigo-600 transition-colors">
                                                    {formatDateDisplay(null)}
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => changeDate(1)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            onClick={() => setTransactionTypeFilter('ALL')}
                                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${transactionTypeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => setTransactionTypeFilter('RECEITA')}
                                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${transactionTypeFilter === 'RECEITA' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
                                        >
                                            Créditos
                                        </button>
                                        <button
                                            onClick={() => setTransactionTypeFilter('DESPESA')}
                                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${transactionTypeFilter === 'DESPESA' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-600'}`}
                                        >
                                            Débitos
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {approvalQueue.length > 0 && (
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                            {approvalQueue.length} selecionados
                                        </span>
                                    )}
                                    <button
                                        onClick={handleApproveSelected}
                                        disabled={(approvalQueue.length === 0 && reconciledRows.filter(r => r.status === 'CONCILIADOS').length === 0) || isProcessing}
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
                                                    checked={filteredRows.length > 0 && approvalQueue.length === filteredRows.length}
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
                                        {filteredRows.map((row, index) => (
                                            <tr
                                                key={row.id}
                                                className={`border-b border-slate-100 hover:bg-white transition-colors cursor-pointer ${approvalQueue.includes(row.id) ? 'bg-indigo-50/50' : ''}`}
                                                onClick={() => handleToggleSelect(row.id)}
                                            >
                                                <td className="p-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={approvalQueue.includes(row.id)}
                                                        onChange={() => handleToggleSelect(row.id)}
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
                                                    {row.status === 'A_LANCAR' && (
                                                        <div className="flex items-center gap-2">
                                                            <Filter className="w-4 h-4 text-slate-400" />
                                                            <select
                                                                value={row.suggestedCategory || (row.type === 'DESPESA' ? categories[0]?.name : REVENUE_CATEGORIES[0])}
                                                                onChange={(e) => handleCategoryChange(row.id, e.target.value)}
                                                                className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px] appearance-none cursor-pointer"
                                                            >
                                                                {row.type === 'DESPESA'
                                                                    ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                                                    : REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                                                                }
                                                            </select>
                                                        </div>
                                                    )}
                                                    {row.status === 'A_CONFERIR' && (
                                                        <p className="text-xs leading-relaxed text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100 flex gap-2 items-start">
                                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                            {row.divergenceReason}
                                                        </p>
                                                    )}
                                                    {row.status === 'CONCILIADOS' && (
                                                        <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Match Sistêmico Efetuado
                                                        </p>
                                                    )}
                                                </td>
                                                <td className={`p-4 text-right align-top font-black text-sm tabular-nums ${row.type === 'RECEITA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                    {row.type === 'DESPESA' ? '-' : '+'} R$ {row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
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
        </div>
    );
};
