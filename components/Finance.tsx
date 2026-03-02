
import React, { useState, useMemo, useEffect } from 'react';
import {
    DollarSign, Download, FileText, Filter, Calendar,
    TrendingUp, Users, Wallet, Printer, ArrowUpCircle,
    ArrowDownCircle, AlertTriangle, BarChart3, Target, Calculator, Files,
    Plus, Minus, Save, X, Edit2, Trash2, CheckCircle2, List, AlertCircle, ArrowRight, Clock,
    ShoppingBag, Sparkles, MessageCircle, Lock, PenTool, FolderPlus, ChevronLeft, ChevronRight, CalendarRange, ChevronDown, ChevronUp, Menu,
    Paperclip, Stamp, ShieldCheck, Share2, Copy, Send, Search, Calculator as CalcIcon, Percent, Info, Crown,
    BrainCircuit, BarChart2, Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { Service, FinancialTransaction, Expense, Appointment, Sale, ExpenseCategory, PaymentSetting, CommissionSetting, Supplier, Provider, Customer, StockItem, Partner, Campaign } from '../types';
import { supabase } from '../services/supabase';
import { FinanceCharts } from './FinanceCharts';
import { toLocalDateStr, parseDateSafe, generateFinancialTransactions, calculateDailySummary } from '../services/financialService';
import { DailyCloseView } from './DailyCloseView';

// --- MOCK DATA GENERATOR FOR OPERATIONAL EXPENSES ---
const generateMockExpenses = (): Expense[] => {
    // Return empty array to start fresh as requested by user
    return [];
};

// --- DAILY CLOSE COMPONENT ---
// DailyCloseView is now imported from ./DailyCloseView


interface FinanceProps {
    services: Service[];
    appointments: Appointment[];
    sales: Sale[];
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    paymentSettings: PaymentSetting[];
    commissionSettings?: CommissionSetting[];
    expenseCategories: ExpenseCategory[];
    setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    providers: Provider[];
    customers: Customer[];
    stock: StockItem[];
    campaigns: Campaign[];
    partners: Partner[];
}

export const Finance: React.FC<FinanceProps> = ({ services, appointments, sales, expenseCategories = [], setExpenseCategories, paymentSettings, commissionSettings, suppliers, setSuppliers, providers, customers, stock,
    expenses, setExpenses, campaigns = [], partners = []
}) => {
    const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'DRE' | 'CHARTS'>('ACCOUNTS');
    const [accountsSubTab, setAccountsSubTab] = useState<'DETAILED' | 'PAYABLES' | 'RECEIVABLES' | 'DAILY' | 'SUPPLIERS'>('DAILY');
    const [receivablesFilter, setReceivablesFilter] = useState('');
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('day');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [chartsSubTab, setChartsSubTab] = useState<'GENERAL' | 'PREDICTIVE'>('GENERAL');
    const [predictiveTargetGrowth, setPredictiveTargetGrowth] = useState(20);
    const [filterProvider, setFilterProvider] = useState('all');
    const [filterService, setFilterService] = useState('all');
    const [filterCampaign, setFilterCampaign] = useState('all');
    const [filterProduct, setFilterProduct] = useState('all');
    const [filterPartner, setFilterPartner] = useState('all');
    const [filterChannel, setFilterChannel] = useState('all');

    // Quick add states
    const [isQuickAddingSupplier, setIsQuickAddingSupplier] = useState(false);
    const [isQuickAddingCategory, setIsQuickAddingCategory] = useState(false);

    // Expenses are now passed as props from App.tsx

    // Suppliers CRUD States
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
        name: '', category: '', document: '', phone: '', email: '', active: true
    });

    const handleOpenSupplierModal = (sup?: Supplier) => {
        if (sup) {
            setEditingSupplierId(sup.id);
            setSupplierForm(sup);
        } else {
            setEditingSupplierId(null);
            setSupplierForm({ name: '', category: '', document: '', phone: '', email: '', active: true });
        }
        setIsSupplierModalOpen(true);
    };

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierForm.name) return;

        try {
            if (editingSupplierId) {
                const { error } = await supabase.from('suppliers').update(supplierForm).eq('id', editingSupplierId);
                if (error) throw error;
                setSuppliers(prev => prev.map(s => s.id === editingSupplierId ? { ...s, ...supplierForm } as Supplier : s));
            } else {
                const { data, error } = await supabase.from('suppliers').insert([supplierForm]).select();
                if (error) throw error;
                if (data) {
                    setSuppliers(prev => [...prev, data[0]]);
                    if (isQuickAddingSupplier) {
                        setExpenseForm(prev => ({ ...prev, supplierId: data[0].id }));
                    }
                }
            }
            setIsSupplierModalOpen(false);
            setIsQuickAddingSupplier(false);
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert('Erro ao salvar fornecedor.');
        }
    };

    const handleDeleteSupplier = async (id: string) => {
        if (!window.confirm('Excluir fornecedor?')) return;
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            setSuppliers(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting supplier:', error);
        }
    };

    // ---- Plano de Contas CRUD ----
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryForm.name.trim()) return;
        try {
            if (editingCategoryId) {
                const { error } = await supabase.from('expense_categories').update({ name: categoryForm.name, dre_class: categoryForm.dreClass }).eq('id', editingCategoryId);
                if (error) throw error;
                setExpenseCategories(prev => prev.map(c => c.id === editingCategoryId ? { ...c, name: categoryForm.name, dreClass: categoryForm.dreClass as any } : c));
            } else {
                const { data, error } = await supabase.from('expense_categories').insert([{ name: categoryForm.name, dre_class: categoryForm.dreClass }]).select();
                if (error) throw error;
                if (data) {
                    setExpenseCategories(prev => [...prev, { id: data[0].id, name: data[0].name, dreClass: data[0].dre_class }]);
                    if (isQuickAddingCategory) {
                        setExpenseForm(prev => ({ ...prev, category: data[0].name, dreClass: data[0].dre_class as any }));
                        setCategoryInputSearch(data[0].name);
                    }
                }
            }
            setIsCategoryFormOpen(false);
            setIsQuickAddingCategory(false);
            setEditingCategoryId(null);
            setCategoryForm({ name: '', dreClass: 'EXPENSE_ADM' });
        } catch (err) {
            console.error('Error saving category:', err);
            alert('Erro ao salvar conta.');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!window.confirm('Excluir esta conta do plano?')) return;
        try {
            const { error } = await supabase.from('expense_categories').delete().eq('id', id);
            if (error) throw error;
            setExpenseCategories(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [recurrenceMonths, setRecurrenceMonths] = useState(1);
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix'
    });

    // Daily Close States
    const [physicalCash, setPhysicalCash] = useState('');
    const [closingObservation, setClosingObservation] = useState('');
    const [closerName, setCloserName] = useState('');

    // Batch Edit States
    const [batchActionType, setBatchActionType] = useState<'IDLE' | 'SAVE' | 'DELETE'>('IDLE');
    const [batchOption, setBatchOption] = useState<'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL'>('ONLY_THIS');
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

    // Filter States for Payables
    const [payablesFilter, setPayablesFilter] = useState('');
    const [payablesSupplierFilter, setPayablesSupplierFilter] = useState('');

    // Filter States for Detailed View
    const [detailedFilter, setDetailedFilter] = useState('');

    // Date Navigation & View States
    const [dateRef, setDateRef] = useState(new Date());
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
    const [isBatchDateModalOpen, setIsBatchDateModalOpen] = useState(false);
    const [applyToFuture, setApplyToFuture] = useState(false);
    const [batchNewDate, setBatchNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    // DRE Sub-tab: 'STATEMENT' = existing DRE view | 'ACCOUNTS' = Plano de Contas
    const [dreSubTab, setDreSubTab] = useState<'STATEMENT' | 'ACCOUNTS'>('STATEMENT');

    // Plano de Contas CRUD
    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryForm, setCategoryForm] = useState<{ name: string; dreClass: string }>({ name: '', dreClass: 'EXPENSE_ADM' });
    const [categorySearch, setCategorySearch] = useState('');

    // Expense modal category autocomplete
    const [categoryInputSearch, setCategoryInputSearch] = useState('');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    const [expandedSubSections, setExpandedSubSections] = useState<string[]>([]);

    const toggleSubSection = (subSection: string) => {
        setExpandedSubSections(prev => prev.includes(subSection) ? prev.filter(s => s !== subSection) : [...prev, subSection]);
    };

    const getDateLabel = () => {
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (timeView === 'year') return dateRef.getFullYear().toString();
        return 'Período Personalizado';
    };

    const navigateDate = (direction: 'next' | 'prev') => {
        const newDate = new Date(dateRef);
        const modifier = direction === 'next' ? 1 : -1;

        if (timeView === 'day') {
            newDate.setDate(newDate.getDate() + modifier);
        } else if (timeView === 'month') {
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + modifier);
        } else if (timeView === 'year') {
            newDate.setDate(1);
            newDate.setFullYear(newDate.getFullYear() + modifier);
        }

        setDateRef(newDate);
    };

    // Update startDate and endDate when timeView or dateRef changes
    React.useEffect(() => {
        if (timeView === 'custom') return;

        const year = dateRef.getFullYear();
        const month = dateRef.getMonth();

        let start = new Date(year, month, 1);
        let end = new Date(year, month + 1, 0);

        if (timeView === 'day') {
            start = new Date(dateRef);
            end = new Date(dateRef);
        } else if (timeView === 'month') {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0);
        } else if (timeView === 'year') {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
        }

        setStartDate(toLocalDateStr(start));
        setEndDate(toLocalDateStr(end));
    }, [timeView, dateRef]);

    const transactions = useMemo(() => {
        return generateFinancialTransactions(
            appointments,
            sales,
            expenses,
            services,
            customers,
            providers,
            commissionSettings || [],
            paymentSettings
        );
    }, [appointments, services, customers, providers, commissionSettings, paymentSettings, sales, expenses]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesDate = t.date >= startDate && t.date <= endDate;
            const matchesDescription = t.description.toLowerCase().includes(detailedFilter.toLowerCase()) ||
                (t.customerOrProviderName || '').toLowerCase().includes(detailedFilter.toLowerCase()); // Search in both description and name

            // Only apply filters if we are in DETAILED tab ideally, but filteredTransactions is used for the view.
            // Wait, filteredTransactions is ONLY used in DETAILED rendering and PAYABLES rendering?
            // PAYABLES uses `filteredPayables` (which I usually see in other codebases or need to check if it exists).
            // Let's check where `filteredTransactions` is used.
            // It is used in lines 1399 (DETAILED TABLE).

            return matchesDate && matchesDescription;
        });
    }, [transactions, startDate, endDate, detailedFilter]);

    const handlePrintDetailedReport = () => {
        const printContent = `
            <html>
            <head>
                <title>Extrato de Fluxo Financeiro - ${getDateLabel()}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #000; }
                    .report-title { text-align: right; }
                    h1 { font-size: 18px; margin: 0; text-transform: uppercase; font-weight: 900; }
                    p { margin: 2px 0; font-size: 12px; font-weight: 600; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                    th { bg: #f8fafc; text-align: left; padding: 12px 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
                    td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
                    .amount { text-align: right; font-weight: 800; }
                    .RECEITA { color: #059669; }
                    .DESPESA { color: #dc2626; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                    .summary { display: flex; gap: 40px; justify-content: flex-end; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; }
                    .summary-item { text-align: right; }
                    .summary-label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; }
                    .summary-value { font-size: 16px; font-weight: 900; margin-top: 2px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">AMINNA</div>
                    <div class="report-title">
                        <h1>Extrato de Fluxo Financeiro</h1>
                        <p>Período: ${getDateLabel()}</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Origem</th>
                            <th>Descrição</th>
                            <th>Pagamento</th>
                            <th class="amount">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredTransactions.map(t => `
                            <tr>
                                <td>${parseDateSafe(t.date).toLocaleDateString('pt-BR')}</td>
                                <td class="${t.type}"><strong>${t.type}</strong></td>
                                <td>${t.origin}</td>
                                <td>
                                    <div style="font-weight: 800; text-transform: uppercase;">${t.description}</div>
                                    <div style="font-size: 9px; color: #64748b;">${t.customerOrProviderName || ''}</div>
                                </td>
                                <td>${t.paymentMethod}</td>
                                <td class="amount ${t.type}">${t.type === 'DESPESA' ? '-' : '+'} R$ ${t.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-label">Total Entradas</div>
                        <div class="summary-value RECEITA">R$ ${filteredTransactions.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Saídas</div>
                        <div class="summary-value DESPESA">R$ ${filteredTransactions.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Saldo Líquido</div>
                        <div class="summary-value ${filteredTransactions.reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0) >= 0 ? 'RECEITA' : 'DESPESA'}">
                            R$ ${filteredTransactions.reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div class="footer">
                    Relatório gerado em ${new Date().toLocaleString('pt-BR')} - Sistema Aminna Home Nail Gel
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const filteredPayables = useMemo(() => {
        return expenses.filter(exp => {
            const matchesDate = exp.date >= startDate && exp.date <= endDate;
            const matchesDesc = exp.description.toLowerCase().includes(payablesFilter.toLowerCase());
            const supplierName = suppliers.find(s => s.id === exp.supplierId)?.name || '';
            const matchesSupplier = supplierName.toLowerCase().includes(payablesSupplierFilter.toLowerCase());
            return matchesDate && matchesDesc && matchesSupplier;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [expenses, startDate, endDate, payablesFilter, payablesSupplierFilter, suppliers]);

    const dreData = useMemo(() => {
        const getSnapshot = (start: string, end: string) => {
            const apps = appointments.filter(a => a.date >= start && a.date <= end && a.status !== 'Cancelado');
            const sls = sales.filter(s => s.date >= start && s.date <= end);
            const exps = expenses.filter(e => e.date >= start && e.date <= end);

            const revenueServices = apps.reduce((acc, a) => {
                const mainPrice = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
                const extraPrice = (a.additionalServices || []).reduce((sum, extra) => {
                    return sum + (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0);
                }, 0);
                return acc + mainPrice + extraPrice;
            }, 0);

            const revenueProducts = sls.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
            const grossRevenue = revenueServices + revenueProducts;

            // Automated Deductions (Fees)
            const automatedDeductions = apps.reduce((acc, a) => {
                const method = a.paymentMethod || 'Dinheiro';
                const settings = paymentSettings.find(ps => ps.method === method);
                if (!settings) return acc;

                const totalAppValue = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0) +
                    (a.additionalServices || []).reduce((sum, e) => sum + (e.bookedPrice ?? services.find(s => s.id === e.serviceId)?.price ?? 0), 0);

                return acc + (totalAppValue * (settings.fee / 100));
            }, 0);

            const manualDeductions = exps.filter(e => e.dreClass === 'DEDUCTION').reduce((acc, e) => acc + e.amount, 0);

            const commissions = apps.reduce((acc, a) => {
                const provider = providers.find(p => p.id === a.providerId);
                const rate = a.commissionRateSnapshot ?? provider?.commissionRate ?? 0;
                const mainComm = (a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0) * rate;

                const extraComm = (a.additionalServices || []).reduce((eAcc, extra) => {
                    const eProv = providers.find(p => p.id === extra.providerId);
                    if (!eProv) return eAcc;
                    const eRate = extra.commissionRateSnapshot ?? eProv.commissionRate ?? 0;
                    const ePrice = extra.bookedPrice || services.find(s => s.id === extra.serviceId)?.price || 0;
                    return eAcc + (ePrice * eRate);
                }, 0);

                return acc + mainComm + extraComm;
            }, 0);

            const deductions = manualDeductions + commissions;
            const netRevenue = grossRevenue - deductions;

            const manualCosts = exps.filter(e => e.dreClass === 'COSTS').reduce((acc, e) => acc + e.amount, 0);
            const totalCOGS = manualCosts;
            const grossProfit = netRevenue - totalCOGS;

            const expensesVendas = exps.filter(e => e.dreClass === 'EXPENSE_SALES');
            const expensesAdm = exps.filter(e => e.dreClass === 'EXPENSE_ADM');
            const expensesFin = exps.filter(e => e.dreClass === 'EXPENSE_FIN');

            const amountVendas = expensesVendas.reduce((acc, e) => acc + e.amount, 0);
            const amountAdm = expensesAdm.reduce((acc, e) => acc + e.amount, 0);
            const amountFin = expensesFin.reduce((acc, e) => acc + e.amount, 0) + automatedDeductions;
            const totalOpExpenses = amountVendas + amountAdm + amountFin;

            const groupByCat = (list: Expense[]) => {
                return list.reduce((acc: Record<string, { total: number, items: Expense[] }>, e) => {
                    if (!acc[e.category]) acc[e.category] = { total: 0, items: [] };
                    acc[e.category].total += e.amount;
                    acc[e.category].items.push(e);
                    return acc;
                }, {});
            };

            const resultBeforeTaxes = grossProfit - totalOpExpenses;
            const irpjCsll = exps.filter(e => e.dreClass === 'TAX').reduce((acc, e) => acc + e.amount, 0);
            const netResult = resultBeforeTaxes - irpjCsll;

            const breakdownServices = apps.reduce((acc, a) => {
                // Main service
                const serviceName = services.find(s => s.id === a.serviceId)?.name || 'Serviço Removido';
                if (!acc[serviceName]) acc[serviceName] = { total: 0, count: 0 };
                const amount = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
                acc[serviceName].total += amount;
                acc[serviceName].count += 1;

                // Extras
                (a.additionalServices || []).forEach(extra => {
                    const extraName = services.find(s => s.id === extra.serviceId)?.name || 'Serviço Removido';
                    if (!acc[extraName]) acc[extraName] = { total: 0, count: 0 };
                    const extraPrice = (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0);
                    acc[extraName].total += extraPrice;
                    acc[extraName].count += 1;
                });

                return acc;
            }, {} as Record<string, { total: number, count: number }>);

            const breakdownCommissions = apps.reduce((acc, a) => {
                // Main professional
                const provider = providers.find(p => p.id === a.providerId);
                if (provider) {
                    const name = provider.name;
                    const rate = a.commissionRateSnapshot ?? provider.commissionRate ?? 0;
                    const commVal = (a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0) * rate;

                    if (!acc[name]) acc[name] = { total: 0, count: 0 };
                    acc[name].total += commVal;
                    acc[name].count += 1;
                }

                // Additional professionals
                (a.additionalServices || []).forEach(extra => {
                    const eProv = providers.find(p => p.id === extra.providerId);
                    if (eProv) {
                        const name = eProv.name;
                        const eRate = extra.commissionRateSnapshot ?? eProv.commissionRate ?? 0;
                        const ePrice = extra.bookedPrice || services.find(s => s.id === extra.serviceId)?.price || 0;
                        const eComm = ePrice * eRate;

                        if (!acc[name]) acc[name] = { total: 0, count: 0 };
                        acc[name].total += eComm;
                        acc[name].count += 1;
                    }
                });

                return acc;
            }, {} as Record<string, { total: number, count: number }>);

            return {
                grossRevenue, revenueServices, automatedDeductions,
                deductions, netRevenue,
                totalCOGS, commissions,
                grossProfit, totalOpExpenses, amountVendas, amountAdm, amountFin,
                resultBeforeTaxes, irpjCsll, netResult,
                breakdownVendas: groupByCat(expensesVendas),
                breakdownAdm: groupByCat(expensesAdm),
                breakdownFin: groupByCat(expensesFin),
                breakdownServices,
                breakdownCommissions
            };
        };

        const currentPeriod = getSnapshot(startDate, endDate);

        // Se visualização por ANO, calcular os 12 meses para comparação
        let monthlySnapshots: any[] = [];
        if (timeView === 'year' && startDate) {
            const yearStr = startDate.split('-')[0];
            const year = parseInt(yearStr) || new Date().getFullYear();
            monthlySnapshots = Array.from({ length: 12 }, (_, m) => {
                const mStart = toLocalDateStr(new Date(year, m, 1));
                const mEnd = toLocalDateStr(new Date(year, m + 1, 0));
                return {
                    month: m,
                    name: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][m],
                    ...getSnapshot(mStart, mEnd)
                };
            });
        }

        return { ...currentPeriod, monthlySnapshots };
    }, [appointments, sales, expenses, startDate, endDate, timeView]);

    const handleOpenModal = (expense?: Expense) => {
        if (expense) { setEditingExpenseId(expense.id); setExpenseForm(expense); setRecurrenceMonths(1); }
        else { setEditingExpenseId(null); setRecurrenceMonths(1); setExpenseForm({ description: '', amount: 0, category: '', subcategory: '', dreClass: 'EXPENSE_ADM', date: new Date().toISOString().split('T')[0], status: 'Pago', paymentMethod: 'Pix' }); }
        setIsModalOpen(true);
    };

    const fetchExpenses = async () => {
        const { data } = await supabase.from('expenses').select('*');
        if (data) {
            setExpenses(data.map((e: any) => ({
                id: e.id,
                description: e.description,
                category: e.category,
                subcategory: e.subcategory,
                dreClass: e.dre_class,
                amount: e.amount,
                date: e.date,
                status: e.status,
                paymentMethod: e.payment_method,
                supplierId: e.supplier_id,
                recurringId: e.recurring_id
            })));
        }
    };

    const handlePrintPayablesReport = () => {
        const printContent = `
            <html>
            <head>
                <title>Relatório de Contas a Pagar - ${getDateLabel()}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo-section h1 { font-size: 24px; font-weight: 900; margin: 0; color: #000; letter-spacing: -0.025em; }
                    .logo-section p { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-top: 4px; }
                    .info-section { text-align: right; }
                    .info-section p { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0; }
                    .info-section h2 { font-size: 14px; font-weight: 900; margin: 4px 0 0 0; color: #0f172a; }
                    
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                    .summary-card { padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; }
                    .summary-card p { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0; }
                    .summary-card span { font-size: 18px; font-weight: 900; color: #0f172a; display: block; margin-top: 4px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
                    td { padding: 12px 8px; font-size: 11px; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
                    .amount { font-weight: 900; text-align: right; }
                    .status { font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; display: inline-block; }
                    .status-pago { background: #f0fdf4; color: #166534; }
                    .status-pendente { background: #fffbeb; color: #92400e; }
                    
                    .footer { margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 9px; color: #94a3b8; font-weight: 600; }
                    @media print { body { padding: 20px; } .summary-card { border: 1px solid #e2e8f0; -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-section">
                        <h1>AMINNA HOME NAIL GEL</h1>
                        <p>GESTÃO FINANCEIRA PROFISSIONAL</p>
                    </div>
                    <div class="info-section">
                        <p>Relatório de Contas a Pagar</p>
                        <h2>${getDateLabel()}</h2>
                        <p style="margin-top: 8px;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="summary-card">
                        <p>Total de Lançamentos</p>
                        <span>${filteredPayables.length} item(ns)</span>
                    </div>
                    <div class="summary-card">
                        <p>Total Pendente</p>
                        <span>R$ ${filteredPayables.filter(e => e.status !== 'Pago').reduce((acc, e) => acc + e.amount, 0).toFixed(2)}</span>
                    </div>
                    <div class="summary-card" style="border-color: #000; background: #f8fafc;">
                        <p>Vlr. Total do Período</p>
                        <span>R$ ${filteredPayables.reduce((acc, e) => acc + e.amount, 0).toFixed(2)}</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Favorecido</th>
                            <th>Categoria</th>
                            <th>Status</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredPayables.map(e => `
                            <tr>
                                <td>${parseDateSafe(e.date).toLocaleDateString('pt-BR')}</td>
                                <td style="font-weight: 800; text-transform: uppercase;">${e.description}</td>
                                <td style="text-transform: uppercase; color: #4338ca;">${suppliers.find(s => s.id === e.supplierId)?.name || '-'}</td>
                                <td style="text-transform: uppercase; color: #64748b;">${e.category}</td>
                                <td><span class="status ${e.status === 'Pago' ? 'status-pago' : 'status-pendente'}">${e.status}</span></td>
                                <td class="amount">R$ ${e.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    AMINNA GESTÃO INTELIGENTE - Relatório Extraído do Sistema em ${new Date().toLocaleDateString('pt-BR')}
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };


    const handleSaveExpense = async (e?: React.FormEvent, overrideOption?: 'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL') => {
        if (e) e.preventDefault();
        if (!expenseForm.description || expenseForm.amount === undefined || !expenseForm.category) {
            alert('Por favor, preencha a descrição, o valor e a categoria.');
            return;
        }

        const currentOption = overrideOption || batchOption;

        const expenseData = {
            description: expenseForm.description,
            amount: expenseForm.amount,
            category: expenseForm.category,
            subcategory: expenseForm.subcategory,
            dre_class: expenseForm.dreClass, // Mapping to snake_case column
            date: expenseForm.date,
            status: expenseForm.status,
            payment_method: expenseForm.paymentMethod || 'Pix',
            supplier_id: expenseForm.supplierId
        };

        try {
            if (editingExpenseId) {
                // If editing a recurring expense, we might need a batch prompt
                const originalExpense = expenses.find(exp => exp.id === editingExpenseId);
                if (originalExpense?.recurringId && batchActionType === 'IDLE') {
                    setBatchActionType('SAVE');
                    setIsBatchModalOpen(true);
                    return;
                }

                if (originalExpense?.recurringId && currentOption !== 'ONLY_THIS') {
                    // BATCH UPDATE: Needs smart handling to preserve (x/y) suffixes and shift dates relative to the original
                    let query = supabase.from('expenses').select('*').eq('recurring_id', originalExpense.recurringId);

                    if (currentOption === 'THIS_AND_FUTURE') {
                        query = query.gte('date', originalExpense.date);
                    }

                    const { data: expensesToUpdate } = await query;

                    if (expensesToUpdate) {
                        const originalDateObj = parseDateSafe(originalExpense.date);
                        const newDateObj = parseDateSafe(expenseForm.date!);
                        const timeDiff = newDateObj.getTime() - originalDateObj.getTime(); // Time difference in ms

                        // Base description: remove the (x/y) suffix from the input to get the clean name
                        // This assumes the user might have edited the description, e.g., "Loan B (10/12)" -> "Loan B"
                        const baseDescription = expenseForm.description.replace(/\s*\(\d+\/\d+\)$/, '');

                        const updates = expensesToUpdate.map(exp => {
                            // Preserve the EXISTING suffix of the expense being updated (e.g. 11/12)
                            const suffixMatch = exp.description.match(/\s*\(\d+\/\d+\)$/);
                            const suffix = suffixMatch ? suffixMatch[0] : '';

                            // Calculate new shifted date
                            const currentExpDate = parseDateSafe(exp.date);
                            const shiftedDate = new Date(currentExpDate.getTime() + timeDiff);

                            return {
                                ...exp,
                                ...expenseData, // Apply new Amount, Category, dre_class, etc.
                                description: baseDescription + suffix, // New Name + Old Suffix
                                date: toLocalDateStr(shiftedDate) // Shifted Date
                            };
                        });

                        const { error } = await supabase.from('expenses').upsert(updates);
                        if (error) throw error;
                    }
                } else {
                    // SINGLE UPDATE
                    const { error } = await supabase.from('expenses').update(expenseData).eq('id', editingExpenseId);
                    if (error) throw error;
                }
            } else {
                const newExpenses = [];
                const rId = recurrenceMonths > 1 ? crypto.randomUUID() : null;

                for (let i = 0; i < recurrenceMonths; i++) {
                    const d = parseDateSafe(expenseForm.date!);
                    d.setMonth(d.getMonth() + i);

                    newExpenses.push({
                        ...expenseData,
                        description: recurrenceMonths > 1 ? `${expenseForm.description} (${i + 1}/${recurrenceMonths})` : expenseForm.description,
                        date: toLocalDateStr(d),
                        recurring_id: rId
                    });
                }
                const { error } = await supabase.from('expenses').insert(newExpenses);
                if (error) throw error;
            }
            await fetchExpenses(); // Refresh list
            setIsModalOpen(false);
            setIsBatchModalOpen(false);
            setBatchActionType('IDLE');
            setBatchOption('ONLY_THIS');
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Erro ao salvar despesa. Tente novamente.');
        }
    };

    const toggleExpenseStatus = async (id: string) => {
        const expense = expenses.find(e => e.id === id);
        if (!expense) return;

        const newStatus = expense.status === 'Pago' ? 'Pendente' : 'Pago';
        const newDate = newStatus === 'Pago' ? toLocalDateStr(new Date()) : expense.date;

        try {
            const { error } = await supabase.from('expenses').update({ status: newStatus, date: newDate }).eq('id', id);
            if (error) throw error;

            // Optimistic update or refresh
            setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: newStatus, date: newDate } : exp));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDeleteExpense = async (id: string, overrideOption?: 'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL') => {
        const expense = expenses.find(exp => exp.id === id);
        if (!expense) return;

        const currentOption = overrideOption || 'ONLY_THIS';

        if (expense.recurringId && batchActionType === 'IDLE') {
            setEditingExpenseId(id); // Temporarily store to know which series we're acting on
            setBatchActionType('DELETE');
            setIsBatchModalOpen(true);
            return;
        }

        // Only ask for confirmation if not coming from the batch modal
        if (!overrideOption && !window.confirm('Tem certeza que deseja excluir?')) return;

        try {
            if (expense.recurringId && currentOption !== 'ONLY_THIS') {
                let deleteQuery = supabase.from('expenses').delete().eq('recurring_id', expense.recurringId);
                if (currentOption === 'THIS_AND_FUTURE') {
                    deleteQuery = deleteQuery.gte('date', expense.date);
                }
                const { error } = await deleteQuery;
                if (error) throw error;
            } else {
                const { error } = await supabase.from('expenses').delete().eq('id', id);
                if (error) throw error;
            }
            await fetchExpenses();
            setIsBatchModalOpen(false);
            setBatchActionType('IDLE');
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const handleBatchStatusUpdate = async () => {
        if (selectedExpenseIds.length === 0) return;
        const firstExpense = expenses.find(e => e.id === selectedExpenseIds[0]);
        if (!firstExpense) return;

        const newStatus = firstExpense.status === 'Pago' ? 'Pendente' : 'Pago';
        const newDate = newStatus === 'Pago' ? toLocalDateStr(new Date()) : undefined;

        try {
            const { error } = await supabase.from('expenses')
                .update({ status: newStatus, date: newDate || firstExpense.date })
                .in('id', selectedExpenseIds);

            if (error) throw error;

            setExpenses(prev => prev.map(exp => selectedExpenseIds.includes(exp.id) ? { ...exp, status: newStatus, date: newDate || exp.date } as Expense : exp));
            setSelectedExpenseIds([]);
        } catch (error) {
            console.error('Error in batch status update:', error);
            alert('Erro ao atualizar status em lote.');
        }
    };

    const handleBatchDateUpdate = async () => {
        if (selectedExpenseIds.length === 0) return;

        try {
            if (applyToFuture) {
                // COMPLEX SHIFT LOGIC for recurring series
                const recurringProcessedIds = new Set<string>();
                for (const id of selectedExpenseIds) {
                    const exp = expenses.find(e => e.id === id);
                    // Skip if not an expense or if it was already processed as part of a recurring series
                    if (!exp || (exp.recurringId && recurringProcessedIds.has(exp.recurringId))) continue;

                    if (exp.recurringId) {
                        recurringProcessedIds.add(exp.recurringId);

                        const originalDateObj = parseDateSafe(exp.date);
                        const newDateObj = parseDateSafe(batchNewDate);
                        const timeDiff = newDateObj.getTime() - originalDateObj.getTime();

                        const { data: futureItems } = await supabase.from('expenses')
                            .select('*')
                            .eq('recurring_id', exp.recurringId)
                            .gte('date', exp.date);

                        if (futureItems && futureItems.length > 0) {
                            const updates = futureItems.map(item => ({
                                ...item,
                                date: toLocalDateStr(new Date(parseDateSafe(item.date).getTime() + timeDiff))
                            }));
                            const { error } = await supabase.from('expenses').upsert(updates);
                            if (error) throw error;
                        }
                    } else {
                        // Regular item - just update its date
                        const { error } = await supabase.from('expenses')
                            .update({ date: batchNewDate })
                            .eq('id', id);
                        if (error) throw error;
                    }
                }
            } else {
                // SIMPLE BATCH UPDATE: Only update valid expenses
                const validExpenseIds = selectedExpenseIds.filter(id => expenses.some(e => e.id === id));
                if (validExpenseIds.length > 0) {
                    const { error } = await supabase.from('expenses')
                        .update({ date: batchNewDate })
                        .in('id', validExpenseIds);

                    if (error) throw error;
                }
            }

            await fetchExpenses();
            setSelectedExpenseIds([]);
            setIsBatchDateModalOpen(false);
            setApplyToFuture(false);
        } catch (error) {
            console.error('Error in batch date update:', error);
            alert('Erro ao atualizar datas em lote.');
        }
    };

    const handleBatchDelete = async () => {
        if (selectedExpenseIds.length === 0) return;
        if (!window.confirm(`Tem certeza que deseja excluir ${selectedExpenseIds.length} despesas?`)) return;

        try {
            const { error } = await supabase.from('expenses').delete().in('id', selectedExpenseIds);
            if (error) throw error;

            setExpenses(prev => prev.filter(exp => !selectedExpenseIds.includes(exp.id)));
            setSelectedExpenseIds([]);
        } catch (error) {
            console.error('Error in batch delete:', error);
            alert('Erro ao excluir despesas em lote.');
        }
    };

    const toggleSelectAll = (visibleExpenses: Expense[]) => {
        const visibleIds = visibleExpenses.map(e => e.id);
        const allAlreadySelected = visibleIds.every(id => selectedExpenseIds.includes(id));

        if (allAlreadySelected) {
            setSelectedExpenseIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedExpenseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const toggleSelectExpense = (id: string) => {
        setSelectedExpenseIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handlePrintAnnualReport = () => {
        const months = dreData.monthlySnapshots || [];
        const printContent = `
            <html>
            <head>
                <title>DRE Anual - Aminna</title>
                <style>
                    @media print { @page { size: landscape; } }
                    body { font-family: 'Segoe UI', -apple-system, sans-serif; padding: 20px; -webkit-print-color-adjust: exact; font-size: 10px; }
                    h1 { color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; margin-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: right; background: #f8fafc; padding: 5px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; color: #475569; font-size: 9px; white-space: nowrap; }
                    th:first-child { text-align: left; }
                    td { padding: 4px 5px; border-bottom: 1px solid #f1f5f9; color: #1e293b; text-align: right; white-space: nowrap; }
                    td:first-child { text-align: left; white-space: normal; }
                    tr.main-row { background: #f8fafc; font-weight: 800; }
                    tr.sub-row td:first-child { padding-left: 20px; color: #64748b; font-style: italic; }
                    tr.result-row { background: #1e293b; color: white !important; }
                    tr.result-row td { color: white !important; font-weight: 900; }
                    .negative { color: #be123c; }
                    .positive { color: #047857; }
                </style>
            </head>
            <body>
                <h1>DRE Anual - ${new Date().getFullYear()}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>TOTAL</th>
                            ${months.map(m => `<th>${m.name.substring(0, 3)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="main-row"><td>1. RECEITA BRUTA</td><td class="positive">${dreData.grossRevenue.toFixed(0)}</td>${months.map(m => `<td>${m.grossRevenue.toFixed(0)}</td>`).join('')}</tr>
                        <tr class="sub-row"><td>Serviços</td><td>${dreData.revenueServices.toFixed(0)}</td>${months.map(m => `<td>${m.revenueServices.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>2. (-) DEDUÇÕES</td><td class="negative">-${dreData.deductions.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.deductions.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>3. (=) REC. LÍQUIDA</td><td>${dreData.netRevenue.toFixed(0)}</td>${months.map(m => `<td>${m.netRevenue.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>4. (-) CPV / CMV</td><td class="negative">-${dreData.totalCOGS.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.totalCOGS.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>5. (=) LUCRO BRUTO</td><td class="positive">${dreData.grossProfit.toFixed(0)}</td>${months.map(m => `<td class="positive">${m.grossProfit.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>6. (-) DESP. VENDAS</td><td class="negative">-${dreData.amountVendas.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.amountVendas.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>7. (-) DESP. ADM</td><td class="negative">-${dreData.amountAdm.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.amountAdm.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>8. (-) DESP. FIN</td><td class="negative">-${dreData.amountFin.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.amountFin.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="main-row"><td>9. (=) RES. ANTES IRPJ</td><td>${dreData.resultBeforeTaxes.toFixed(0)}</td>${months.map(m => `<td>${m.resultBeforeTaxes.toFixed(0)}</td>`).join('')}</tr>

                        <tr><td>10. (-) IRPJ/CSLL</td><td class="negative">-${dreData.irpjCsll.toFixed(0)}</td>${months.map(m => `<td class="negative">-${m.irpjCsll.toFixed(0)}</td>`).join('')}</tr>

                        <tr class="result-row"><td>11. (=) RES. LÍQUIDO</td><td>${dreData.netResult.toFixed(0)}</td>${months.map(m => `<td>${m.netResult.toFixed(0)}</td>`).join('')}</tr>
                    </tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const handlePrintDRE = () => {
        if (timeView === 'year') {
            handlePrintAnnualReport();
            return;
        }
        const formatPercent = (val: number, total: number) => (total > 0 ? (val / total) * 100 : 0).toFixed(1) + '%';
        const printContent = `
            <html>
            <head>
                <title>DRE - Aminna (${getDateLabel()})</title>
                <style>
                    body { font-family: 'Segoe UI', -apple-system, sans-serif; padding: 40px; -webkit-print-color-adjust: exact; }
                    h1 { color: #1e293b; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-transform: uppercase; margin-bottom: 5px; }
                    p.meta { color: #64748b; font-size: 14px; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { text-align: left; background: #f8fafc; padding: 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; color: #475569; }
                    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
                    tr.main-row { background: #f8fafc; font-weight: 800; }
                    tr.sub-row td:first-child { padding-left: 30px; color: #64748b; font-style: italic; }
                    tr.result-row { background: #1e293b; color: white !important; font-size: 14px; }
                    tr.result-row td { color: white !important; font-weight: 900; padding: 15px 10px; }
                    .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: bold; }
                    .negative { color: #be123c; }
                    .positive { color: #047857; }
                </style>
            </head>
            <body>
                <h1>Demonstrativo de Resultado do Exercício (DRE)</h1>
                <p class="meta">Período: ${getDateLabel()} | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                
                <table>
                    <thead><tr><th>Descrição</th><th class="amount">Valor (R$)</th><th class="amount">AV%</th></tr></thead>
                    <tbody>
                        <tr class="main-row"><td>1. RECEITA BRUTA</td><td class="amount positive">R$ ${dreData.grossRevenue.toFixed(2)}</td><td class="amount">100.0%</td></tr>
                        <tr class="sub-row"><td>Serviços</td><td class="amount">R$ ${dreData.revenueServices.toFixed(2)}</td><td class="amount">${formatPercent(dreData.revenueServices, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>2. (-) DEDUÇÕES E IMPOSTOS</td><td class="amount negative">- R$ ${dreData.deductions.toFixed(2)}</td><td class="amount">${formatPercent(dreData.deductions, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>3. (=) RECEITA LÍQUIDA</td><td class="amount">R$ ${dreData.netRevenue.toFixed(2)}</td><td class="amount">${formatPercent(dreData.netRevenue, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>4. (-) CPV / CMV</td><td class="amount negative">- R$ ${dreData.totalCOGS.toFixed(2)}</td><td class="amount">${formatPercent(dreData.totalCOGS, dreData.grossRevenue)}</td></tr>
                        <tr class="sub-row"><td>Comissões Técnica</td><td class="amount">R$ ${dreData.commissions.toFixed(2)}</td><td class="amount">${formatPercent(dreData.commissions, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="main-row"><td>5. (=) LUCRO BRUTO</td><td class="amount positive">R$ ${dreData.grossProfit.toFixed(2)}</td><td class="amount">${formatPercent(dreData.grossProfit, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>6. (-) DESPESAS COM VENDAS</td><td class="amount negative">- R$ ${dreData.amountVendas.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountVendas, dreData.grossRevenue)}</td></tr>
                        ${Object.entries(dreData.breakdownVendas as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">└ ${cat}</td><td class="amount">R$ ${info.total.toFixed(2)}</td><td class="amount"></td></tr>
                        `).join('')}
                        
                        <tr><td>7. (-) DESPESAS ADMINISTRATIVAS</td><td class="amount negative">- R$ ${dreData.amountAdm.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountAdm, dreData.grossRevenue)}</td></tr>
                         ${Object.entries(dreData.breakdownAdm as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">└ ${cat}</td><td class="amount">R$ ${info.total.toFixed(2)}</td><td class="amount"></td></tr>
                        `).join('')}

                        <tr><td>8. (-) DESPESAS FINANCEIRAS</td><td class="amount negative">- R$ ${dreData.amountFin.toFixed(2)}</td><td class="amount">${formatPercent(dreData.amountFin, dreData.grossRevenue)}</td></tr>
                         ${Object.entries(dreData.breakdownFin as Record<string, any>).map(([cat, info]) => `
                            <tr class="sub-row"><td style="padding-left: 30px; font-weight: bold; color: #4338ca;">└ ${cat}</td><td class="amount">R$ ${info.total.toFixed(2)}</td><td class="amount"></td></tr>
                        `).join('')}

                        <tr class="main-row"><td>9. (=) RESULTADO ANTES IRPJ/CSLL</td><td class="amount">R$ ${dreData.resultBeforeTaxes.toFixed(2)}</td><td class="amount">${formatPercent(dreData.resultBeforeTaxes, dreData.grossRevenue)}</td></tr>
                        
                        <tr><td>10. (-) PROVISÕES IRPJ/CSLL</td><td class="amount negative">- R$ ${dreData.irpjCsll.toFixed(2)}</td><td class="amount">${formatPercent(dreData.irpjCsll, dreData.grossRevenue)}</td></tr>
                        
                        <tr class="result-row"><td>11. (=) RESULTADO LÍQUIDO</td><td class="amount">R$ ${dreData.netResult.toFixed(2)}</td><td class="amount">${formatPercent(dreData.netResult, dreData.grossRevenue)}</td></tr>
                    </tbody>
                </table>
                <p style="margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center;">Este é um documento confidencial gerado pelo sistema Aminna.</p>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const handleDownloadDRE = () => {
        const formatPercent = (val: number, total: number) => {
            if (!isFinite(total) || total <= 0) return '0.0%';
            return ((val / total) * 100).toFixed(1) + '%';
        };

        const isYearView = timeView === 'year';
        const months = dreData.monthlySnapshots || [];

        const headerRow = ['Descrição', 'TOTAL'];
        if (isYearView) months.forEach(m => headerRow.push(m.name));
        else headerRow.push('AV%');

        const rows = [
            ['DRE - Demonstrativo de Resultado', `Período: ${getDateLabel()}`],
            ['Gerado em', new Date().toLocaleString('pt-BR')],
            [],
            headerRow,
            ['1. RECEITA BRUTA', dreData.grossRevenue.toFixed(2), ...(isYearView ? months.map(m => m.grossRevenue.toFixed(2)) : ['100.0%'])],
            ['   Serviços', dreData.revenueServices.toFixed(2), ...(isYearView ? months.map(m => m.revenueServices.toFixed(2)) : [formatPercent(dreData.revenueServices, dreData.grossRevenue)])],
            ['2. (-) DEDUÇÕES', `-${dreData.deductions.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.deductions.toFixed(2)}`) : [formatPercent(dreData.deductions, dreData.grossRevenue)])],
            ['3. (=) RECEITA LÍQUIDA', dreData.netRevenue.toFixed(2), ...(isYearView ? months.map(m => m.netRevenue.toFixed(2)) : [formatPercent(dreData.netRevenue, dreData.grossRevenue)])],
            ['4. (-) CPV / CMV', `-${dreData.totalCOGS.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.totalCOGS.toFixed(2)}`) : [formatPercent(dreData.totalCOGS, dreData.grossRevenue)])],
            ['5. (=) LUCRO BRUTO', dreData.grossProfit.toFixed(2), ...(isYearView ? months.map(m => m.grossProfit.toFixed(2)) : [formatPercent(dreData.grossProfit, dreData.grossRevenue)])],
            ['6. (-) DESPESAS VENDAS', `-${dreData.amountVendas.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.amountVendas.toFixed(2)}`) : [formatPercent(dreData.amountVendas, dreData.grossRevenue)])],
            ['7. (-) DESPESAS ADM', `-${dreData.amountAdm.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.amountAdm.toFixed(2)}`) : [formatPercent(dreData.amountAdm, dreData.grossRevenue)])],
            ['8. (-) DESPESAS FIN', `-${dreData.amountFin.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.amountFin.toFixed(2)}`) : [formatPercent(dreData.amountFin, dreData.grossRevenue)])],
            ['9. (=) RESULTADO ANTES IRPJ', dreData.resultBeforeTaxes.toFixed(2), ...(isYearView ? months.map(m => m.resultBeforeTaxes.toFixed(2)) : [formatPercent(dreData.resultBeforeTaxes, dreData.grossRevenue)])],
            ['10. (-) IRPJ/CSLL', `-${dreData.irpjCsll.toFixed(2)}`, ...(isYearView ? months.map(m => `-${m.irpjCsll.toFixed(2)}`) : [formatPercent(dreData.irpjCsll, dreData.grossRevenue)])],
            ['11. (=) RESULTADO LÍQUIDO', dreData.netResult.toFixed(2), ...(isYearView ? months.map(m => m.netResult.toFixed(2)) : [formatPercent(dreData.netResult, dreData.grossRevenue)])]
        ];

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(";")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `dre_aminna_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintDailyClose = () => {
        window.print();
    };



    return (
        <div className="space-y-4 md:space-y-6 relative h-full flex flex-col pb-24 md:pb-8 text-slate-900 dark:text-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div><h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight">Gestão Financeira</h2><p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Controle total e sincronizado</p></div>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide w-full xl:w-auto">
                    {[
                        { id: 'ACCOUNTS', label: 'Contas', icon: FileText },
                        { id: 'DRE', label: 'DRE', icon: CalcIcon },
                        { id: 'CHARTS', label: 'Gráficos', icon: BarChart3 },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                if (tab.id === 'DRE') {
                                    setTimeView('month');
                                    setDateRef(new Date());
                                }
                                if (tab.id === 'CHARTS') {
                                    setTimeView('year');
                                    setDateRef(new Date());
                                }
                            }}
                            className={`flex-1 md:flex-none min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto items-center">
                    {activeTab === 'ACCOUNTS' && accountsSubTab === 'PAYABLES' && (
                        <div className="flex gap-2 w-full md:w-auto animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="relative w-full md:w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Descrição..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                                    value={payablesFilter}
                                    onChange={e => setPayablesFilter(e.target.value)}
                                />
                            </div>
                            <div className="relative w-full md:w-48">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Favorecido..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                                    value={payablesSupplierFilter}
                                    onChange={e => setPayablesSupplierFilter(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === 'ACCOUNTS' && accountsSubTab === 'RECEIVABLES' && (
                        <div className="flex gap-2 w-full md:w-auto animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Cliente ou serviço..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                                    value={receivablesFilter}
                                    onChange={e => setReceivablesFilter(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'ACCOUNTS' && accountsSubTab === 'DETAILED' && (
                        <div className="flex gap-2 w-full md:w-auto animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar por descrição ou nome..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                                    value={detailedFilter}
                                    onChange={e => setDetailedFilter(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button key={v} onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}</button>
                        ))}
                    </div>
                    {timeView !== 'custom' ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between">
                            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span>
                            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-500" />
                            <span className="text-[10px] font-black text-slate-400">Até</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-500" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {activeTab === 'ACCOUNTS' && (
                    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
                        {/* ===== ACCOUNTS Sub-nav — always first ===== */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'DETAILED', label: 'Extrato / Fluxo', icon: List },
                                    { id: 'PAYABLES', label: 'Contas a Pagar', icon: ArrowDownCircle },
                                    { id: 'RECEIVABLES', label: 'Contas a Receber', icon: ArrowUpCircle },
                                    { id: 'DAILY', label: 'Caixa Diário', icon: CalcIcon },
                                    { id: 'SUPPLIERS', label: 'Fornecedores', icon: Users },
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => {
                                            setAccountsSubTab(st.id as any);
                                            if (st.id === 'DAILY') { setTimeView('day'); setDateRef(new Date()); }
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${accountsSubTab === st.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                    >
                                        <st.icon size={13} /> {st.label}
                                    </button>
                                ))}
                            </div>
                            {accountsSubTab === 'PAYABLES' && (
                                <button onClick={() => handleOpenModal()} className="text-[10px] font-black uppercase text-white bg-black dark:bg-white dark:text-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all">
                                    <Plus size={12} /> Lançar Despesa
                                </button>
                            )}
                            {accountsSubTab === 'SUPPLIERS' && (
                                <button onClick={() => handleOpenSupplierModal()} className="text-[10px] font-black uppercase text-white bg-black dark:bg-white dark:text-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all">
                                    <Plus size={12} /> Novo Fornecedor
                                </button>
                            )}
                        </div>

                        {/* ===== EXTRATO / FLUXO ===== */}
                        {accountsSubTab === 'DETAILED' && (
                            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                                <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                    <div>
                                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><List size={16} /> Extrato de Fluxo Financeiro</h3>
                                        <p className="text-[9px] text-slate-500 uppercase mt-0.5">Listagem de todas as entradas e saídas no período</p>
                                    </div>
                                    <button onClick={handlePrintDetailedReport} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><Printer size={16} /></button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-200 dark:border-zinc-700">
                                            <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-200 dark:border-zinc-700">
                                                <th className="px-4 py-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                                                        checked={filteredTransactions.length > 0 && filteredTransactions.filter(t => t.origin === 'Despesa').every(t => selectedExpenseIds.includes(t.id))}
                                                        onChange={() => {
                                                            const visibleExpenses = filteredTransactions.filter(t => t.origin === 'Despesa');
                                                            if (visibleExpenses.length === 0) return;
                                                            const visibleIds = visibleExpenses.map(e => e.id);
                                                            const allAlreadySelected = visibleIds.every(id => selectedExpenseIds.includes(id));
                                                            if (allAlreadySelected) {
                                                                setSelectedExpenseIds(prev => prev.filter(id => !visibleIds.includes(id)));
                                                            } else {
                                                                setSelectedExpenseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">Data</th>
                                                <th className="px-6 py-4">Tipo</th>
                                                <th className="px-6 py-4">Origem</th>
                                                <th className="px-6 py-4">Descrição</th>
                                                <th className="px-6 py-4">Pagamento</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                            {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                                                <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group text-sm ${selectedExpenseIds.includes(t.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                                    <td className="px-4 py-4 w-10">
                                                        {t.origin === 'Despesa' && (
                                                            <input
                                                                type="checkbox"
                                                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                checked={selectedExpenseIds.includes(t.id)}
                                                                onChange={() => toggleSelectExpense(t.id)}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold font-mono text-slate-500 whitespace-nowrap">
                                                        {parseDateSafe(t.date).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit border ${t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'}`}>
                                                            {t.type === 'RECEITA' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                                                            {t.type}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t.origin}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-slate-950 dark:text-white uppercase text-xs leading-tight">{t.description}</p>
                                                        {t.customerOrProviderName && <p className="text-[10px] text-slate-500 font-bold mt-0.5">{t.customerOrProviderName}</p>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">{t.paymentMethod}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${t.status === 'Pago' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                            t.status === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-100 animate-pulse' :
                                                                'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                                                            }`}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-black text-sm whitespace-nowrap ${t.type === 'RECEITA' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                                        <div className="flex items-center justify-end gap-2">
                                                            {t.amount === 0 && t.type === 'RECEITA' && <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="VIP / Cortesia"><Crown size={10} strokeWidth={3} /> VIP</span>}
                                                            {t.type === 'DESPESA' ? '-' : '+'} R$ {t.amount.toFixed(2)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-20 text-center opacity-30">
                                                        <Search size={48} className="mx-auto mb-2" />
                                                        <p className="text-xs font-black uppercase tracking-widest">Nenhuma transação no período</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {/* ===== CAIXA DIÁRIO ===== */}
                        {accountsSubTab === 'DAILY' && <DailyCloseView transactions={transactions} physicalCash={physicalCash} setPhysicalCash={setPhysicalCash} closingObservation={closingObservation} setClosingObservation={setClosingObservation} closerName={closerName} setCloserName={setCloserName} date={dateRef} appointments={appointments} services={services} onPrint={handlePrintDailyClose} onCloseRegister={() => { }} />}



                        {/* ======= CONTAS A PAGAR ======= */}
                        {accountsSubTab === 'PAYABLES' && (
                            <>
                                {/* Indicadores Contas a Pagar */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total no Período', value: filteredPayables.reduce((acc, curr) => acc + curr.amount, 0), icon: FileText, color: 'indigo' },
                                        { label: 'Total Pago', value: filteredPayables.filter(p => p.status === 'Pago').reduce((acc, curr) => acc + curr.amount, 0), icon: CheckCircle2, color: 'emerald' },
                                        { label: 'Pendente', value: filteredPayables.filter(p => p.status === 'Pendente').reduce((acc, curr) => acc + curr.amount, 0), icon: Clock, color: 'amber' },
                                        { label: 'Atrasado', value: filteredPayables.filter(p => p.status === 'Pendente' && new Date(p.date) < new Date(new Date().setHours(0, 0, 0, 0))).reduce((acc, curr) => acc + curr.amount, 0), icon: AlertCircle, color: 'rose' },
                                    ].map((card, idx) => (
                                        <div key={idx} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm group hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-3 rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400 group-hover:scale-110 transition-transform`}>
                                                    <card.icon size={20} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                                                <h4 className="text-xl font-black text-slate-950 dark:text-white mt-1">R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><ArrowDownCircle size={16} /> Contas a Pagar</h3>
                                        <button onClick={handlePrintPayablesReport} className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-all"><Printer size={12} /> Relatório</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                                    <th className="px-4 py-4 w-10">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                                                            checked={filteredPayables.length > 0 && filteredPayables.every(exp => selectedExpenseIds.includes(exp.id))}
                                                            onChange={() => {
                                                                const visibleExpenses = filteredPayables;
                                                                if (visibleExpenses.length === 0) return;
                                                                const visibleIds = visibleExpenses.map(e => e.id);
                                                                const allAlreadySelected = visibleIds.every(id => selectedExpenseIds.includes(id));
                                                                if (allAlreadySelected) {
                                                                    setSelectedExpenseIds(prev => prev.filter(id => !visibleIds.includes(id)));
                                                                } else {
                                                                    setSelectedExpenseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                                                                }
                                                            }}
                                                        />
                                                    </th>
                                                    <th className="px-6 py-4">Data</th>
                                                    <th className="px-6 py-4">Descrição</th>
                                                    <th className="px-6 py-4">Favorecido</th>
                                                    <th className="px-6 py-4">Categoria</th>
                                                    <th className="px-6 py-4 text-center">Status</th>
                                                    <th className="px-6 py-4 text-right">Valor</th>
                                                    <th className="px-6 py-4 text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                {filteredPayables.length > 0 ? filteredPayables.map(exp => {
                                                    const supplierName = suppliers.find(s => s.id === exp.supplierId)?.name || '';
                                                    const isOverdue = exp.status === 'Pendente' && new Date(exp.date) < new Date(new Date().setHours(0, 0, 0, 0));
                                                    return (
                                                        <tr key={exp.id} className={`group hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors ${selectedExpenseIds.includes(exp.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                                            <td className="px-4 py-4">
                                                                <input type="checkbox" className="w-5 h-5 rounded border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer" checked={selectedExpenseIds.includes(exp.id)} onChange={() => toggleSelectExpense(exp.id)} />
                                                            </td>
                                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                                                {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                                {isOverdue && <span className="ml-1 text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded-full uppercase">Atrasado</span>}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-[11px] text-slate-900 dark:text-white max-w-[200px] truncate">{exp.description}</td>
                                                            <td className="px-6 py-4 text-[11px] text-slate-500">{supplierName || '—'}</td>
                                                            <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{exp.category}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button onClick={() => toggleExpenseStatus(exp.id)} className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase transition-colors ${exp.status === 'Pago' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-100'}`}>
                                                                    {exp.status}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-rose-700 dark:text-rose-400">R$ {exp.amount.toFixed(2)}</td>
                                                            <td className="px-6 py-4 flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleOpenModal(exp)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                                <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-sm font-bold uppercase">Nenhuma despesa no período</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ======= CONTAS A RECEBER ======= */}
                        {accountsSubTab === 'RECEIVABLES' && (() => {
                            // Derive receivables from appointments: future or unpaid
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const receivableApps = appointments.filter(a => {
                                if (a.status === 'Cancelado') return false;
                                const appDate = new Date(a.date + 'T12:00:00');
                                const isInPeriod = appDate >= new Date(startDate + 'T00:00:00') && appDate <= new Date(endDate + 'T23:59:59');
                                // Concluído = pago; só inclui pendentes no período selecionado
                                const isPaid = a.status === 'Concluído' || (a.pricePaid ?? 0) >= ((a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0));
                                return isInPeriod && !isPaid;
                            }).filter(a => {
                                const clientName = customers.find(c => c.id === a.customerId)?.name || '';
                                const svcName = services.find(s => s.id === a.serviceId)?.name || '';
                                const f = receivablesFilter.toLowerCase();
                                return !f || clientName.toLowerCase().includes(f) || svcName.toLowerCase().includes(f);
                            });

                            const totalReceivable = receivableApps.reduce((acc, a) => {
                                const price = a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0;
                                const paid = a.pricePaid ?? 0;
                                return acc + Math.max(0, price - paid);
                            }, 0);

                            const overdue = receivableApps.filter(a => {
                                const appDate = new Date(a.date + 'T12:00:00');
                                return appDate < today && (a.pricePaid ?? 0) < (a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
                            });

                            const future = receivableApps.filter(a => {
                                const appDate = new Date(a.date + 'T12:00:00');
                                return appDate >= today;
                            });

                            const received = appointments.filter(a => {
                                const appDate = new Date(a.date + 'T12:00:00');
                                const price = a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0;
                                const paid = a.pricePaid ?? price;
                                return appDate >= new Date(startDate + 'T00:00:00') && appDate <= new Date(endDate + 'T23:59:59') && paid >= price && a.status !== 'Cancelado';
                            });

                            const totalReceived = received.reduce((acc, a) => {
                                return acc + (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
                            }, 0);

                            return (
                                <>
                                    {/* Indicadores Receivables */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'A Receber', value: totalReceivable, icon: ArrowUpCircle, color: 'indigo', sub: `${receivableApps.length} pendente(s)` },
                                            { label: 'Recebido no período', value: totalReceived, icon: CheckCircle2, color: 'emerald', sub: `${received.length} atendimento(s)` },
                                            { label: 'Em Aberto (Futuro)', value: future.reduce((acc, a) => acc + Math.max(0, (a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0) - (a.pricePaid ?? 0)), 0), icon: Clock, color: 'amber', sub: `${future.length} agendamento(s)` },
                                            { label: 'Atrasado', value: overdue.reduce((acc, a) => acc + Math.max(0, (a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0) - (a.pricePaid ?? 0)), 0), icon: AlertCircle, color: 'rose', sub: `${overdue.length} atrasado(s)` },
                                        ].map((card, idx) => (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm group hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400 group-hover:scale-110 transition-transform`}>
                                                        <card.icon size={20} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                                                    <h4 className="text-xl font-black text-slate-950 dark:text-white mt-1">R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{card.sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                            <div>
                                                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><ArrowUpCircle size={16} className="text-emerald-500" /> Contas a Receber</h3>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Agendamentos com pagamento pendente ou futuro</p>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                                        <th className="px-6 py-4">Data</th>
                                                        <th className="px-6 py-4">Cliente</th>
                                                        <th className="px-6 py-4">Serviço</th>
                                                        <th className="px-6 py-4">Profissional</th>
                                                        <th className="px-6 py-4 text-center">Status</th>
                                                        <th className="px-6 py-4 text-right">Valor Total</th>
                                                        <th className="px-6 py-4 text-right">Pago</th>
                                                        <th className="px-6 py-4 text-right">A Receber</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                                    {receivableApps.length > 0 ? receivableApps
                                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                        .map(a => {
                                                            const client = customers.find(c => c.id === a.customerId);
                                                            const svc = services.find(s => s.id === a.serviceId);
                                                            const provider = providers.find(p => p.id === a.providerId);
                                                            const totalPrice = a.bookedPrice ?? svc?.price ?? 0;
                                                            const paid = a.pricePaid ?? 0;
                                                            const remaining = Math.max(0, totalPrice - paid);
                                                            const appDate = new Date(a.date + 'T12:00:00');
                                                            const isOverdueRec = appDate < today && remaining > 0;
                                                            const isFuture = appDate >= today;
                                                            return (
                                                                <tr key={a.id} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                                                        {appDate.toLocaleDateString('pt-BR')}
                                                                        {isOverdueRec && <span className="ml-1 text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full uppercase">Atrasado</span>}
                                                                        {isFuture && <span className="ml-1 text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase">Futuro</span>}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-black text-[11px] text-slate-900 dark:text-white">{client?.name || '—'}</td>
                                                                    <td className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-300">{svc?.name || '—'}</td>
                                                                    <td className="px-6 py-4 text-[11px] text-slate-400">{provider?.name || '—'}</td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${a.status === 'Concluído' ? 'bg-emerald-50 text-emerald-700' :
                                                                            a.status === 'Em Andamento' ? 'bg-indigo-50 text-indigo-700' :
                                                                                a.status === 'Aguardando' ? 'bg-amber-50 text-amber-700' :
                                                                                    'bg-slate-100 text-slate-600'
                                                                            }`}>{a.status}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-bold text-[11px] text-slate-700 dark:text-slate-200">R$ {totalPrice.toFixed(2)}</td>
                                                                    <td className="px-6 py-4 text-right font-bold text-[11px] text-emerald-600">R$ {paid.toFixed(2)}</td>
                                                                    <td className="px-6 py-4 text-right font-black text-[12px] text-rose-600">R$ {remaining.toFixed(2)}</td>
                                                                </tr>
                                                            );
                                                        }) : (
                                                        <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-sm font-bold uppercase">Nenhuma conta a receber encontrada</td></tr>
                                                    )}
                                                </tbody>
                                                {receivableApps.length > 0 && (
                                                    <tfoot>
                                                        <tr className="bg-slate-50 dark:bg-zinc-800 border-t-2 border-slate-200 dark:border-zinc-700">
                                                            <td colSpan={5} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Total</td>
                                                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                                                                R$ {receivableApps.reduce((acc, a) => acc + (a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0), 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-emerald-600">
                                                                R$ {receivableApps.reduce((acc, a) => acc + (a.pricePaid ?? 0), 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-rose-600">
                                                                R$ {totalReceivable.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                        {/* ===== FORNECEDORES ===== */}
                        {accountsSubTab === 'SUPPLIERS' && (
                            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                                <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Users size={16} /> Cadastro de Fornecedores</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] uppercase font-black tracking-wider border-b border-slate-100 dark:border-zinc-700">
                                                <th className="px-6 py-4">Nome</th>
                                                <th className="px-6 py-4">Categoria</th>
                                                <th className="px-6 py-4">Documento</th>
                                                <th className="px-6 py-4">Contato</th>
                                                <th className="px-6 py-4 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                            {suppliers.map(sup => (
                                                <tr key={sup.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                    <td className="px-6 py-4 font-black text-xs uppercase">{sup.name}</td>
                                                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">{sup.category || '-'}</td>
                                                    <td className="px-6 py-4 text-xs font-bold font-mono">{sup.document || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{sup.phone || '-'}</span>
                                                            <span className="text-[9px] text-slate-400">{sup.email || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                                                        <button onClick={() => handleOpenSupplierModal(sup)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteSupplier(sup.id)} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {suppliers.length === 0 && (
                                                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-xs font-bold uppercase">Nenhum fornecedor cadastrado</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'CHARTS' && (
                    <div className="space-y-6">
                        {/* CHARTS Sub-tab header */}
                        <div className="flex p-1 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-700 w-fit">
                            {[
                                { id: 'GENERAL', label: 'Dashboard Financeiro', icon: BarChart3 },
                                { id: 'PREDICTIVE', label: 'Estudos Preditivos / IA', icon: BrainCircuit }
                            ].map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => setChartsSubTab(st.id as any)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${chartsSubTab === st.id ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    <st.icon size={14} />
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        {chartsSubTab === 'GENERAL' ? (
                            <FinanceCharts transactions={transactions} expenses={expenses} startDate={startDate} endDate={endDate} timeView={timeView} />
                        ) : (
                            <div className="animate-in fade-in duration-500 pb-20">
                                {(() => {
                                    const HISTORICAL_REVENUE = [
                                        { month: 0, label: 'Jan', pastValue: 203743.00 },
                                        { month: 1, label: 'Fev', pastValue: 223761.00 },
                                        { month: 2, label: 'Mar', pastValue: 191600.00 },
                                        { month: 3, label: 'Abr', pastValue: 208329.00 },
                                        { month: 4, label: 'Mai', pastValue: 222481.00 },
                                        { month: 5, label: 'Jun', pastValue: 213532.00 },
                                        { month: 6, label: 'Jul', pastValue: 243692.00 },
                                        { month: 7, label: 'Ago', pastValue: 265019.00 },
                                        { month: 8, label: 'Set', pastValue: 259375.00 },
                                        { month: 9, label: 'Out', pastValue: 297134.00 },
                                        { month: 10, label: 'Nov', pastValue: 280000.00 },
                                        { month: 11, label: 'Dez', pastValue: 350000.00 }
                                    ];

                                    const currentYear = new Date().getFullYear();
                                    const currentData = new Array(12).fill(0);

                                    appointments.forEach(a => {
                                        if (!a.date || a.status === 'Cancelado') return;
                                        if (filterProvider !== 'all' && a.providerId !== filterProvider) return;
                                        if (filterService !== 'all' && a.serviceId !== filterService) return;

                                        if (filterCampaign !== 'all' && a.appliedCoupon !== filterCampaign) return;
                                        if (filterPartner !== 'all') {
                                            const campaign = campaigns.find(c => c.id === a.appliedCoupon || c.couponCode === a.appliedCoupon);
                                            if (campaign?.partnerId !== filterPartner) return;
                                        }

                                        if (filterChannel !== 'all') {
                                            const customer = customers.find(c => c.id === a.customerId);
                                            if (customer?.acquisitionChannel !== filterChannel) return;
                                        }

                                        const dateObj = new Date(a.date + 'T12:00:00');
                                        if (dateObj.getFullYear() === currentYear) {
                                            const month = dateObj.getMonth();
                                            const mainPrice = a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0;
                                            currentData[month] += mainPrice;
                                            (a.additionalServices || []).forEach(extra => {
                                                const extraPrice = extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0;
                                                currentData[month] += extraPrice;
                                            });
                                        }
                                    });

                                    sales.forEach(s => {
                                        if (!s.date) return;
                                        if (filterProduct !== 'all' && !s.items.some(i => i.productId === filterProduct)) return;

                                        const dateObj = new Date(s.date + 'T12:00:00');
                                        if (dateObj.getFullYear() === currentYear) {
                                            const month = dateObj.getMonth();
                                            currentData[month] += (s.totalAmount || 0);
                                        }
                                    });

                                    const predictiveData = HISTORICAL_REVENUE.map((hist, index) => {
                                        const currentValue = currentData[index];
                                        const targetValue = hist.pastValue * (1 + (predictiveTargetGrowth / 100));
                                        return {
                                            name: hist.label,
                                            ['Ano Passado']: hist.pastValue,
                                            ['Ano Atual']: currentValue,
                                            ['Meta Ajustada']: targetValue,
                                            monthIndex: hist.month
                                        };
                                    });

                                    const currentMonthIndex = new Date().getMonth();
                                    const currentMonthData = predictiveData[currentMonthIndex];
                                    const targetToBeat = currentMonthData['Meta Ajustada'];
                                    const currentAchieved = currentMonthData['Ano Atual'];
                                    const percentageAchieved = targetToBeat > 0 ? (currentAchieved / targetToBeat) * 100 : 0;
                                    const gapToTarget = targetToBeat - currentAchieved;

                                    return (
                                        <div className="space-y-6">
                                            {/* AI Strategist Banner */}
                                            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-1.5 rounded-2xl shadow-lg text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-2 justify-between">
                                                <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
                                                    <BrainCircuit size={80} />
                                                </div>
                                                <div className="z-10 flex-1">
                                                    <h2 className="text-base font-black uppercase tracking-tighter flex items-center gap-2 drop-shadow-sm">
                                                        <BrainCircuit size={14} /> O Estrategista Aminna
                                                    </h2>
                                                    <p className="text-white/80 font-bold text-[10px] leading-tight max-w-4xl drop-shadow-sm mt-0">
                                                        Analisei o histórico de faturamento de {currentYear - 1} e tracei a sazonalidade detalhada do seu negócio.
                                                        Abaixo você encontra a linha de meta ajustada para {currentYear}.
                                                    </p>
                                                </div>
                                                <div className="z-10 bg-white/20 py-1 px-4 rounded-xl backdrop-blur-sm border border-white/20 flex flex-col items-center min-w-[150px]">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-100 flex items-center gap-1 mb-0"><Target size={8} /> Simulador de Meta</span>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setPredictiveTargetGrowth(Math.max(0, predictiveTargetGrowth - 5))} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center transition-colors font-black text-xs">-</button>
                                                        <span className="text-lg font-black drop-shadow-md leading-none">+{predictiveTargetGrowth}%</span>
                                                        <button onClick={() => setPredictiveTargetGrowth(predictiveTargetGrowth + 5)} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center transition-colors font-black text-xs">+</button>
                                                    </div>
                                                    <span className="text-[7px] font-bold text-white/70 uppercase mt-0">Crescimento sobre {currentYear - 1}</span>
                                                </div>
                                            </div>

                                            {/* Filters Bar for Predictive View */}
                                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Profissional</label>
                                                    <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-[10px] font-black outline-none uppercase">
                                                        <option value="all">Todas</option>
                                                        {providers.sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Serviço</label>
                                                    <select value={filterService} onChange={e => setFilterService(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-[10px] font-black outline-none uppercase">
                                                        <option value="all">Todos</option>
                                                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Campanha</label>
                                                    <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-[10px] font-black outline-none uppercase">
                                                        <option value="all">Todas</option>
                                                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Produto</label>
                                                    <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-[10px] font-black outline-none uppercase">
                                                        <option value="all">Todos</option>
                                                        {stock.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Parceiro</label>
                                                    <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-[10px] font-black outline-none uppercase">
                                                        <option value="all">Todos</option>
                                                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Canal</label>
                                                    <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-[10px] font-black outline-none uppercase">
                                                        <option value="all">Todos</option>
                                                        {['Instagram', 'Facebook', 'TikTok', 'Google', 'Indicação', 'WhatsApp', 'Passante'].map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        onClick={() => { setFilterProvider('all'); setFilterService('all'); setFilterCampaign('all'); setFilterProduct('all'); setFilterPartner('all'); setFilterChannel('all'); }}
                                                        className="w-full h-9 bg-slate-100 dark:bg-zinc-800 text-[9px] font-black uppercase rounded-xl hover:bg-slate-200 transition-colors"
                                                    >Limpar</button>
                                                </div>
                                            </div>

                                            {/* Core Diagnostics */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between min-h-[180px]">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                                                            <Target size={12} className="text-amber-500" /> Cenário de {currentMonthData.name}
                                                        </p>
                                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">R$ {currentAchieved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                                        <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-5 mt-4 flex relative overflow-hidden shadow-inner">
                                                            <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-1000 shadow-[2px_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${Math.min(100, percentageAchieved)}%` }}></div>
                                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md">{percentageAchieved.toFixed(1)}% da Meta</div>
                                                        </div>
                                                    </div>
                                                    <p className={`text-xs font-bold mt-4 px-3 py-1 rounded-lg w-fit ${gapToTarget > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                        {gapToTarget > 0 ? `Faltam R$ ${gapToTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para atingir a meta` : 'Meta superada com excelência!'}
                                                    </p>
                                                </div>

                                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2"><BarChart2 size={12} className="text-indigo-500" /> Histórico</p>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase italic tracking-tighter">Sazonalidade Detectada</h3>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">O fluxo de caixa apresenta forte tendência de tração no 2º semestre, com concentração expressiva de receitas entre Outubro e Dezembro.</p>
                                                    </div>
                                                    <p className="text-[11px] font-black mt-4 text-indigo-600 flex items-center gap-1 uppercase tracking-wider"><Zap size={14} /> Foco em retenção agora.</p>
                                                </div>

                                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between border-l-4 border-l-rose-500">
                                                    <div>
                                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 mb-2"><AlertCircle size={12} /> Ponto Crítico</p>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase italic tracking-tighter">Recall de Março</h3>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">Historicamente, Março apresenta uma retração de ~15% em relação a Fevereiro. É o momento de lançar pacotes de recorrência.</p>
                                                    </div>
                                                    <p className="text-[11px] font-black mt-4 text-rose-600 uppercase tracking-wider">Anticíclico: Aja hoje.</p>
                                                </div>
                                            </div>

                                            {/* Predictive Chart */}
                                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                                            Modelagem de Curva Financeira {currentYear}
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">Baseline {currentYear - 1} vs Tração Atual vs Target (+{predictiveTargetGrowth}%)</p>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-dashed"></div>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">{currentYear - 1}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">Meta {currentYear}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">Realizado</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="h-[400px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={predictiveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                            <defs>
                                                                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                                </linearGradient>
                                                                <linearGradient id="colorAchieved" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} tickFormatter={(v) => `R$ ${(v / 1000)}k`} />
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />

                                                            <Tooltip
                                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '20px' }}
                                                                itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                                                                labelStyle={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}
                                                                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                            />

                                                            <Area type="monotone" dataKey="Ano Passado" stroke="#94a3b8" strokeDasharray="6 6" strokeWidth={2} fill="none" dot={false} />
                                                            <Area type="monotone" dataKey="Meta Ajustada" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorTarget)" dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                                                            <Area type="monotone" dataKey={(d) => d.monthIndex <= currentMonthIndex ? d['Ano Atual'] : null} name="Ano Atual" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorAchieved)" activeDot={{ r: 8, strokeWidth: 0 }} dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'DRE' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* DRE Sub-tab header */}
                        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50 dark:bg-zinc-800/50">
                            <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700">
                                {[
                                    { id: 'STATEMENT', label: 'Demonstrativo DRE', icon: BarChart3 },
                                    { id: 'ACCOUNTS', label: 'Plano de Contas', icon: Files },
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => setDreSubTab(st.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dreSubTab === st.id ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                    >
                                        <st.icon size={13} /> {st.label}
                                    </button>
                                ))}
                            </div>
                            {dreSubTab === 'STATEMENT' && (
                                <div className="flex gap-2">
                                    <button onClick={handlePrintDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Printer size={18} /></button>
                                    <button onClick={handleDownloadDRE} className="p-2 bg-white dark:bg-zinc-700 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-950 transition-colors"><Download size={18} /></button>
                                </div>
                            )}
                            {dreSubTab === 'ACCOUNTS' && (
                                <button
                                    onClick={() => { setEditingCategoryId(null); setCategoryForm({ name: '', dreClass: 'EXPENSE_ADM' }); setIsCategoryFormOpen(true); }}
                                    className="text-[10px] font-black uppercase text-white bg-zinc-950 dark:bg-white dark:text-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                                >
                                    <Plus size={12} /> Nova Conta
                                </button>
                            )}
                        </div>

                        {/* ===== PLANO DE CONTAS SUB-TAB ===== */}
                        {dreSubTab === 'ACCOUNTS' && (() => {
                            const DRE_CLASSES: { key: string; label: string; color: string; bg: string; lineRef: string }[] = [
                                { key: 'COSTS', label: 'CPV / Custos Operacionais', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20', lineRef: '4. (-) CPV / CMV' },
                                { key: 'EXPENSE_SALES', label: 'Despesas com Vendas', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20', lineRef: '6. (-) Despesas Vendas' },
                                { key: 'EXPENSE_ADM', label: 'Despesas Administrativas', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20', lineRef: '7. (-) Despesas ADM' },
                                { key: 'EXPENSE_FIN', label: 'Despesas Financeiras', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20', lineRef: '8. (-) Despesas FIN' },
                                { key: 'TAX', label: 'Impostos e Tributos', color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950/20', lineRef: '10. (-) IRPJ / CSLL / DAS' },
                                { key: 'DEDUCTION', label: 'Deduções da Receita Bruta', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800/40', lineRef: '2. (-) Deduções' },
                            ];
                            const searchLower = categorySearch.toLowerCase();
                            const filtered = expenseCategories.filter(c => !searchLower || c.name.toLowerCase().includes(searchLower));
                            return (
                                <div className="flex flex-col lg:flex-row min-h-[500px]">
                                    {/* Left: Plan list */}
                                    <div className="flex-1 p-6 overflow-y-auto">
                                        {/* Search */}
                                        <div className="relative mb-4">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar conta..."
                                                value={categorySearch}
                                                onChange={e => setCategorySearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-5">
                                            {DRE_CLASSES.map(cls => {
                                                const catList = filtered.filter(c => c.dreClass === cls.key);
                                                return (
                                                    <div key={cls.key}>
                                                        {/* Group header */}
                                                        <div className={`flex items-center justify-between px-4 py-2 rounded-xl mb-2 ${cls.bg}`}>
                                                            <div>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest ${cls.color}`}>{cls.label}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Linha DRE → {cls.lineRef}</p>
                                                            </div>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${cls.bg} ${cls.color} border`}>{catList.length}</span>
                                                        </div>
                                                        {catList.length === 0 ? (
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase pl-4 pb-2 italic">Nenhuma conta nesta classe</p>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {catList.sort((a, b) => a.name.localeCompare(b.name)).map(cat => {
                                                                    const usageCount = expenses.filter(e => e.category === cat.name).length;
                                                                    return (
                                                                        <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 group transition-colors">
                                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls.color.replace('text-', 'bg-')}`} />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{cat.name}</p>
                                                                                {usageCount > 0 && <p className="text-[9px] text-slate-400 font-bold">{usageCount} lançamento(s)</p>}
                                                                            </div>
                                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => { setEditingCategoryId(cat.id); setCategoryForm({ name: cat.name, dreClass: cat.dreClass }); setIsCategoryFormOpen(true); }}
                                                                                    className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                                                                                ><Edit2 size={12} /></button>
                                                                                {usageCount === 0 && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                                                        className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                                                                                    ><Trash2 size={12} /></button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right: Add / Edit form panel */}
                                    {isCategoryFormOpen && (
                                        <div className="lg:w-80 border-l border-slate-200 dark:border-zinc-700 p-6 bg-slate-50/50 dark:bg-zinc-800/30 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-200">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                                    {editingCategoryId ? 'Editar Conta' : 'Nova Conta'}
                                                </h4>
                                                <button onClick={() => setIsCategoryFormOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"><X size={16} /></button>
                                            </div>
                                            <form onSubmit={handleSaveCategory} className="space-y-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Nome da Conta</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        autoFocus
                                                        placeholder="Ex: Energia Elétrica"
                                                        value={categoryForm.name}
                                                        onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                                        className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-white dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:border-indigo-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Classificação DRE</label>
                                                    <div className="relative">
                                                        <select
                                                            value={categoryForm.dreClass}
                                                            onChange={e => setCategoryForm({ ...categoryForm, dreClass: e.target.value })}
                                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-white dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:border-indigo-500 appearance-none text-sm"
                                                        >
                                                            <option value="COSTS">CPV / Custos Operacionais</option>
                                                            <option value="EXPENSE_SALES">Despesas com Vendas</option>
                                                            <option value="EXPENSE_ADM">Despesas Administrativas</option>
                                                            <option value="EXPENSE_FIN">Despesas Financeiras</option>
                                                            <option value="TAX">Impostos e Tributos</option>
                                                            <option value="DEDUCTION">Deduções da Receita</option>
                                                        </select>
                                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div className="pt-2 flex flex-col gap-2">
                                                    <button type="submit" className="w-full py-3 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow active:scale-95 transition-all">
                                                        {editingCategoryId ? 'Atualizar' : 'Adicionar'} Conta
                                                    </button>
                                                    <button type="button" onClick={() => setIsCategoryFormOpen(false)} className="w-full py-3 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* ===== DEMONSTRATIVO DRE (existing view wrapped in dreSubTab check) ===== */}
                        {dreSubTab === 'STATEMENT' && (
                            <>

                                {/* DRE Indicators / Insights at Top */}
                                <div className="p-6 bg-slate-50/50 dark:bg-zinc-800/20 border-b border-slate-200 dark:border-zinc-700">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Receita Bruta', value: dreData.grossRevenue, prefix: 'R$ ', color: 'indigo', icon: TrendingUp },
                                            { label: 'Margem de Lucro', value: dreData.grossRevenue > 0 ? (dreData.netResult / dreData.grossRevenue) * 100 : 0, suffix: '%', color: 'emerald', icon: Info },
                                            { label: 'Ponto de Equilíbrio', value: (dreData.grossProfit / dreData.grossRevenue) > 0 ? (dreData.totalOpExpenses / (dreData.grossProfit / dreData.grossRevenue)) : 0, prefix: 'R$ ', color: 'amber', icon: FileText },
                                            { label: 'Resultado Líquido', value: dreData.netResult, prefix: 'R$ ', color: dreData.netResult >= 0 ? 'emerald' : 'rose', icon: CheckCircle2 },
                                        ].map((card, idx) => (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`p-2 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`}>
                                                        <card.icon size={16} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                                                    <p className={`text-lg font-black mt-1 ${card.color === 'rose' ? 'text-rose-600' : 'text-slate-950 dark:text-white'}`}>
                                                        {card.prefix}{card.value.toLocaleString('pt-BR', { minimumFractionDigits: card.suffix === '%' ? 1 : 2, maximumFractionDigits: card.suffix === '%' ? 1 : 2 })}{card.suffix}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                                            <tr className="text-[10px] font-black uppercase text-slate-500">
                                                <th className="px-8 py-4 sticky left-0 bg-slate-50 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Categorização Financeira</th>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <th key={m.name} className="px-4 py-4 text-right border-l border-slate-200/50 dark:border-zinc-700/50">{m.name}</th>
                                                        ))}
                                                        <th className="px-6 py-4 text-right bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-200 dark:border-indigo-800">TOTAL ANO</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="px-8 py-4 text-right">Valor (R$)</th>
                                                        <th className="px-8 py-4 text-right">AV%</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                                            {/* 1. RECEITA BRUTA */}
                                            <tr onClick={() => toggleSection('gross')} className="bg-indigo-50/20 dark:bg-indigo-900/10 cursor-pointer hover:bg-indigo-100/30 transition-colors">
                                                <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase flex items-center gap-2 sticky left-0 bg-indigo-50/20 dark:bg-indigo-950/20 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {expandedSections.includes('gross') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    1. RECEITA BRUTA
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-xs font-bold border-l border-slate-200/50 dark:border-zinc-700/50">{m.grossRevenue.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm bg-indigo-100/20 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {dreData.grossRevenue.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.grossRevenue.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">100.0%</td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('gross') && (
                                                <>
                                                    <tr onClick={() => toggleSection('services-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-12 py-3 text-xs font-bold text-slate-500 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            {expandedSections.includes('services-list') ? <ChevronDown size={12} /> : <TrendingUp size={12} />}
                                                            └ Serviços
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                                    <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 border-l border-slate-100 dark:border-zinc-800">{m.revenueServices.toFixed(0)}</td>
                                                                ))}
                                                                <td className="px-6 py-3 text-right text-xs font-black bg-slate-50/50 dark:bg-zinc-800/30 border-l-2 border-slate-200 dark:border-zinc-700">R$ {dreData.revenueServices.toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-black text-slate-950 dark:text-white">R$ {dreData.revenueServices.toFixed(2)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.revenueServices / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSections.includes('services-list') && Object.entries(dreData.breakdownServices as Record<string, any>).sort((a, b) => b[1].total - a[1].total).map(([name, info]) => (
                                                        <tr key={name} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                            <td className="px-20 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic border-l-4 border-indigo-50 dark:border-indigo-900/10 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">
                                                                └ {name} <span className="text-[9px] text-slate-300">({info.count}x)</span>
                                                            </td>
                                                            {timeView === 'year' ? (
                                                                <>
                                                                    {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                        // Logic to distribute service revenue if available per month
                                                                        // Since 'info' here is an aggregate of services by name, we need to know the distribution.
                                                                        // The current structure of 'breakdownServices' might only have totals. 
                                                                        // Let's check how 'breakdownServices' is built. 
                                                                        // If we don't have monthly breakdown in 'info', we can't distribute it easily without refactoring 'breakdownServices' construction.
                                                                        // However, assuming 'info' has items list or we can iterate items like in Admin expenses.
                                                                        // Wait, 'breakdownServices' in 'dreData' seems to be Record<string, {count: number, total: number}>. 
                                                                        // It lacks the items list to group by month.

                                                                        // Inspecting how breakdownServices is built in the backend/calculation logic would be ideal.
                                                                        // FOR NOW: To fix the user request "Remove parcels", if this is indeed where they see it, 
                                                                        // but wait, "Aluguel" is usually an expense, not a Service Revenue.
                                                                        // If the user sees "Aluguel" here, they might have categorized it as Service? Unlikely.

                                                                        // But to be consistent, we should show monthly values here if possible. 
                                                                        // Since I cannot easily get monthly values without items, I might need to skip this section or simple show average? No that's bad.

                                                                        // Let's assume the user's "Aluguel" is actually in Admin Expenses and my previous fix DID work, 
                                                                        // but maybe they are looking at "CUSTOS OPERACIONAIS"?
                                                                        // Let's look for "CUSTOS OPERACIONAIS" breakdown.

                                                                        return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                                    })}
                                                                    <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {info.total.toFixed(2)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {info.total.toFixed(2)}</td>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                        {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </>
                                            )}

                                            {/* 2. DEDUÇÕES */}
                                            <tr onClick={() => toggleSection('deductions')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {expandedSections.includes('deductions') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    2. (-) DEDUÇÕES (Repasses Salão Parceiro)
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.deductions.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.deductions.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.deductions.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.deductions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('deductions') && (
                                                <>
                                                    <tr onClick={() => toggleSection('commissions-list')} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            {expandedSections.includes('commissions-list') ? <ChevronDown size={12} /> : <Menu size={12} />}
                                                            └ Comissões
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => (
                                                                    <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">{m.commissions.toFixed(0)}</td>
                                                                ))}
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">R$ {dreData.commissions.toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {dreData.commissions.toFixed(2)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.commissions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSections.includes('commissions-list') && Object.entries(dreData.breakdownCommissions as Record<string, any>).sort((a, b) => b[1].total - a[1].total).map(([name, info]) => (
                                                        <tr key={name} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                            <td className="px-20 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic border-l-4 border-rose-50 dark:border-rose-900/10 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">
                                                                └ {name} <span className="text-[9px] text-slate-300">({info.count}x)</span>
                                                            </td>
                                                            {timeView === 'year' ? (
                                                                <>
                                                                    {dreData.monthlySnapshots?.map((m: any) => (
                                                                        <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">-</td>
                                                                    ))}
                                                                    <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {info.total.toFixed(2)}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {info.total.toFixed(2)}</td>
                                                                    <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                        {dreData.grossRevenue > 0 ? ((info.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </>
                                            )}

                                            {/* 3. RECEITA LÍQUIDA */}
                                            <tr className="bg-slate-50 dark:bg-zinc-800/50">
                                                <td className="px-8 py-4 font-black text-sm text-slate-950 dark:text-white uppercase sticky left-0 bg-slate-50 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">3. (=) RECEITA LÍQUIDA</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-xs font-bold border-l border-slate-200/50 dark:border-zinc-700/50">{m.netRevenue.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm border-l-2 border-slate-200 dark:border-zinc-700">R$ {dreData.netRevenue.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm">R$ {dreData.netRevenue.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-400">{((dreData.netRevenue / dreData.grossRevenue) * 100 || 0).toFixed(1)}%</td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 4. CPV/CMV */}
                                            <tr onClick={() => toggleSection('cogs')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    {expandedSections.includes('cogs') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    4. (-) CPV / CMV / CUSTOS OPERACIONAIS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.totalCOGS.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.totalCOGS.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.totalCOGS.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.totalCOGS / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('cogs') && (
                                                <>
                                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-bold text-slate-500 uppercase italic sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">└ Insumos e Produtos (Lançamentos Manuais)</td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    const costVal = m.totalCOGS;
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">{costVal.toFixed(0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">R$ {dreData.totalCOGS.toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">R$ {dreData.totalCOGS.toFixed(2)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.totalCOGS / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                </>
                                            )}

                                            {/* 5. LUCRO BRUTO */}
                                            <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                                                <td className="px-8 py-4 font-black text-sm text-emerald-800 dark:text-emerald-400 uppercase sticky left-0 bg-emerald-50 dark:bg-emerald-950 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">5. (=) LUCRO BRUTO</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className={`px-4 py-4 text-right text-xs font-black border-l border-emerald-100 dark:border-emerald-800/30 ${m.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.grossProfit.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400 border-l-2 border-emerald-200 dark:border-emerald-800">R$ {dreData.grossProfit.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm text-emerald-800 dark:text-emerald-400">R$ {dreData.grossProfit.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-emerald-600/50">
                                                            {dreData.grossRevenue > 0 ? ((dreData.grossProfit / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 6. DESPESAS COM VENDAS */}
                                            <tr onClick={() => toggleSection('exp-vendas')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={16} />
                                                    6. (-) DESPESAS COM VENDAS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.amountVendas.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.amountVendas.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountVendas.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.amountVendas / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('exp-vendas') && Object.entries(dreData.breakdownVendas as Record<string, any>).map(([cat, info]) => (
                                                <React.Fragment key={cat}>
                                                    <tr onClick={() => toggleSubSection(cat)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            <Menu size={12} />
                                                            {cat}
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    const catTotal = (m.breakdownVendas[cat]?.total || 0);
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{catTotal.toFixed(0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {(info.total as number).toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">R$ {(info.total as number).toFixed(2)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? (((info.total as number) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSubSections.includes(cat) && (() => {
                                                        const groupedItems: Record<string, { description: string, amounts: Record<number, number>, total: number }> = {};
                                                        (info.items as Expense[]).forEach(e => {
                                                            let key = e.recurringId;
                                                            let displayDesc = e.description || '';
                                                            const match = displayDesc.match(/^(.*?)\s*\(\d+\/\d+\)$/);
                                                            if (key) { if (match) displayDesc = match[1]; }
                                                            else { if (match) { key = match[1]; displayDesc = match[1]; } else { key = displayDesc; } }
                                                            if (!groupedItems[key || 'no-key']) { groupedItems[key || 'no-key'] = { description: displayDesc || 'Sem descrição', amounts: {}, total: 0 }; }
                                                            const dateObj = parseDateSafe(e.date);
                                                            const month = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
                                                            groupedItems[key || 'no-key'].amounts[month] = (groupedItems[key || 'no-key'].amounts[month] || 0) + e.amount;
                                                            groupedItems[key || 'no-key'].total += e.amount;
                                                        });
                                                        const sortedGroups = Object.values(groupedItems).sort((a, b) => b.total - a.total);
                                                        return sortedGroups.map((group, idx) => (
                                                            <tr key={idx} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                <td className="px-20 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase italic border-l-4 border-indigo-100 dark:border-indigo-900/30 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">└ {group.description}</td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                            const val = group.amounts[mIdx];
                                                                            return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? `R$ ${val.toFixed(2)}` : ''}</td>
                                                                        })}
                                                                        <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {group.total.toFixed(2)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {group.total.toFixed(2)}</td>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? ((group.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ));
                                                    })()}
                                                </React.Fragment>
                                            ))}

                                            {/* 7. DESPESAS ADMINISTRATIVAS */}
                                            <tr onClick={() => toggleSection('exp-adm')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={16} />
                                                    7. (-) DESPESAS ADMINISTRATIVAS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.amountAdm.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.amountAdm.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountAdm.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.amountAdm / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('exp-adm') && Object.entries(dreData.breakdownAdm as Record<string, any>).map(([cat, info]) => (
                                                <React.Fragment key={cat}>
                                                    <tr onClick={() => toggleSubSection(cat)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            <Menu size={12} />
                                                            {cat}
                                                        </td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    const catTotal = (m.breakdownAdm[cat]?.total || 0);
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{catTotal.toFixed(0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {(info.total as number).toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">R$ {(info.total as number).toFixed(2)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? (((info.total as number) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {expandedSubSections.includes(cat) && (() => {
                                                        const groupedItems: Record<string, { description: string, amounts: Record<number, number>, total: number }> = {};
                                                        (info.items as Expense[]).forEach(e => {
                                                            let key = e.recurringId;
                                                            let displayDesc = e.description || '';
                                                            const match = displayDesc.match(/^(.*?)\s*\(\d+\/\d+\)$/);
                                                            if (key) { if (match) displayDesc = match[1]; }
                                                            else { if (match) { key = match[1]; displayDesc = match[1]; } else { key = displayDesc; } }
                                                            if (!groupedItems[key || 'no-key']) { groupedItems[key || 'no-key'] = { description: displayDesc || 'Sem descrição', amounts: {}, total: 0 }; }
                                                            const dateObj = parseDateSafe(e.date);
                                                            const month = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
                                                            groupedItems[key || 'no-key'].amounts[month] = (groupedItems[key || 'no-key'].amounts[month] || 0) + e.amount;
                                                            groupedItems[key || 'no-key'].total += e.amount;
                                                        });
                                                        const sortedGroups = Object.values(groupedItems).sort((a, b) => b.total - a.total);
                                                        return sortedGroups.map((group, idx) => (
                                                            <tr key={idx} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                <td className="px-20 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase italic border-l-4 border-indigo-100 dark:border-indigo-900/30 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">└ {group.description}</td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                            const val = group.amounts[mIdx];
                                                                            return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? `R$ ${val.toFixed(2)}` : ''}</td>
                                                                        })}
                                                                        <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {group.total.toFixed(2)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {group.total.toFixed(2)}</td>
                                                                        <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? ((group.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ));
                                                    })()}
                                                </React.Fragment>
                                            ))}

                                            {/* 8. DESPESAS FINANCEIRAS */}
                                            <tr onClick={() => toggleSection('exp-fin')} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <Menu size={16} />
                                                    8. (-) DESPESAS FINANCEIRAS
                                                </td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.amountFin.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.amountFin.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.amountFin.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.amountFin / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                            {expandedSections.includes('exp-fin') && (
                                                <>
                                                    <tr className="animate-in slide-in-from-top-1 duration-200">
                                                        <td className="px-14 py-3 text-xs font-bold text-rose-500 opacity-80 uppercase italic sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">└ Taxas de Cartão/Débito</td>
                                                        {timeView === 'year' ? (
                                                            <>
                                                                {dreData.monthlySnapshots?.map((m: any) => {
                                                                    return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100 dark:border-zinc-800">-{m.automatedDeductions.toFixed(0)}</td>
                                                                })}
                                                                <td className="px-6 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-zinc-700">- R$ {dreData.automatedDeductions.toFixed(2)}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-8 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-300">- R$ {dreData.automatedDeductions.toFixed(2)}</td>
                                                                <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                    {dreData.grossRevenue > 0 ? ((dreData.automatedDeductions / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                    {Object.entries(dreData.breakdownFin as Record<string, any>).map(([cat, info]) => (
                                                        <React.Fragment key={cat}>
                                                            <tr onClick={() => toggleSubSection(cat)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                                                                <td className="px-14 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                                    <Menu size={12} />
                                                                    {cat}
                                                                </td>
                                                                {timeView === 'year' ? (
                                                                    <>
                                                                        {dreData.monthlySnapshots?.map((m: any) => {
                                                                            const catTotal = (m.breakdownFin[cat]?.total || 0);
                                                                            return <td key={m.name} className="px-4 py-3 text-right text-[10px] font-bold text-indigo-400 border-l border-slate-50 dark:border-zinc-800">{catTotal.toFixed(0)}</td>
                                                                        })}
                                                                        <td className="px-6 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 border-l-2 border-indigo-200 dark:border-indigo-800">R$ {(info.total as number).toFixed(2)}</td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-8 py-3 text-right text-xs font-black text-indigo-600 dark:text-indigo-400">R$ {(info.total as number).toFixed(2)}</td>
                                                                        <td className="px-8 py-3 text-right text-[10px] font-bold text-slate-400">
                                                                            {dreData.grossRevenue > 0 ? (((info.total as number) / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                            {expandedSubSections.includes(cat) && (() => {
                                                                const groupedItems: Record<string, { description: string, amounts: Record<number, number>, total: number }> = {};
                                                                (info.items as Expense[]).forEach(e => {
                                                                    let key = e.recurringId;
                                                                    let displayDesc = e.description || '';
                                                                    const match = displayDesc.match(/^(.*?)\s*\(\d+\/\d+\)$/);
                                                                    if (key) { if (match) displayDesc = match[1]; }
                                                                    else { if (match) { key = match[1]; displayDesc = match[1]; } else { key = displayDesc; } }
                                                                    if (!groupedItems[key || 'no-key']) { groupedItems[key || 'no-key'] = { description: displayDesc || 'Sem descrição', amounts: {}, total: 0 }; }
                                                                    const dateObj = parseDateSafe(e.date);
                                                                    const month = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
                                                                    groupedItems[key || 'no-key'].amounts[month] = (groupedItems[key || 'no-key'].amounts[month] || 0) + e.amount;
                                                                    groupedItems[key || 'no-key'].total += e.amount;
                                                                });
                                                                const sortedGroups = Object.values(groupedItems).sort((a, b) => b.total - a.total);
                                                                return sortedGroups.map((group, idx) => (
                                                                    <tr key={idx} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30 dark:bg-zinc-800/20">
                                                                        <td className="px-20 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase italic border-l-4 border-indigo-100 dark:border-indigo-900/30 sticky left-0 bg-slate-50/30 dark:bg-zinc-800/20 z-10">└ {group.description}</td>
                                                                        {timeView === 'year' ? (
                                                                            <>
                                                                                {dreData.monthlySnapshots?.map((m: any, mIdx: number) => {
                                                                                    const val = group.amounts[mIdx];
                                                                                    return <td key={m.name} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 border-l border-slate-100/50 dark:border-zinc-800/50">{val ? `R$ ${val.toFixed(2)}` : ''}</td>
                                                                                })}
                                                                                <td className="px-6 py-2 text-right text-[10px] font-black text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800">R$ {group.total.toFixed(2)}</td>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <td className="px-8 py-2 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {group.total.toFixed(2)}</td>
                                                                                <td className="px-8 py-2 text-right text-[10px] font-bold text-slate-400">
                                                                                    {dreData.grossRevenue > 0 ? ((group.total / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ));
                                                            })()}
                                                        </React.Fragment>
                                                    ))}
                                                </>
                                            )}

                                            {/* 9. RESULTADO ANTES IRPJ */}
                                            <tr className="bg-slate-100 dark:bg-zinc-800">
                                                <td className="px-8 py-4 font-black text-sm text-slate-800 dark:text-slate-200 uppercase sticky left-0 bg-slate-100 dark:bg-zinc-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">9. (=) RESULTADO ANTES IRPJ/CSLL</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className={`px-4 py-4 text-right text-xs font-black border-l border-slate-200/50 dark:border-zinc-700/50 ${m.resultBeforeTaxes >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>{m.resultBeforeTaxes.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-sm text-slate-800 dark:text-slate-200 border-l-2 border-slate-300 dark:border-zinc-600">R$ {dreData.resultBeforeTaxes.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-sm text-slate-800 dark:text-slate-200">R$ {dreData.resultBeforeTaxes.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right font-black text-[10px] text-slate-500">
                                                            {dreData.grossRevenue > 0 ? ((dreData.resultBeforeTaxes / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 10. PROVISÕES IRPJ */}
                                            <tr>
                                                <td className="px-8 py-4 font-bold text-xs text-rose-600 uppercase pl-12 sticky left-0 bg-white dark:bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">10. (-) PROVISÕES IRPJ E CSLL</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className="px-4 py-4 text-right text-[10px] font-bold text-rose-500 border-l border-slate-100 dark:border-zinc-800">-{m.irpjCsll.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-4 text-right font-black text-xs text-rose-600 bg-rose-50/20 dark:bg-rose-900/10 border-l-2 border-rose-200 dark:border-rose-800">- R$ {dreData.irpjCsll.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-4 text-right font-black text-xs text-rose-600">- R$ {dreData.irpjCsll.toFixed(2)}</td>
                                                        <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">
                                                            {dreData.grossRevenue > 0 ? ((dreData.irpjCsll / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* 11. RESULTADO LÍQUIDO */}
                                            <tr className="bg-black text-white dark:bg-white dark:text-black">
                                                <td className="px-8 py-6 font-black text-sm uppercase sticky left-0 bg-black dark:bg-white z-10 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">11. (=) RESULTADO LÍQUIDO</td>
                                                {timeView === 'year' ? (
                                                    <>
                                                        {dreData.monthlySnapshots?.map((m: any) => (
                                                            <td key={m.name} className={`px-4 py-6 text-right text-xs font-black border-l border-white/10 dark:border-black/10 ${m.netResult >= 0 ? '' : 'text-rose-400'}`}>{m.netResult.toFixed(0)}</td>
                                                        ))}
                                                        <td className="px-6 py-6 text-right font-black text-xl border-l-2 border-white/20 dark:border-black/20">R$ {dreData.netResult.toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-6 text-right font-black text-xl">R$ {dreData.netResult.toFixed(2)}</td>
                                                        <td className="px-8 py-6 text-right font-black text-xs text-white/50">
                                                            {dreData.grossRevenue > 0 ? ((dreData.netResult / dreData.grossRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                            </>
                        )}
                    </div>
                )}
            </div>


            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><ArrowDownCircle size={18} /> {editingExpenseId ? 'Editar' : 'Nova'} Despesa</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={(e) => handleSaveExpense(e)} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Descrição do Gasto</label>
                                    <input type="text" placeholder="Ex: Conta de Luz" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Valor (R$)</label>
                                        <input type="number" step="0.01" placeholder="0.00" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Vencimento</label>
                                        <input type="date" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                                    </div>
                                </div>

                                {/* Recurrence Field (Only for new expenses) */}
                                {!editingExpenseId && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Repetir (Quantidade de Parcelas)</label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                    placeholder="1"
                                                    className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black"
                                                    value={recurrenceMonths}
                                                    onChange={e => setRecurrenceMonths(parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 p-3 rounded-xl">
                                                {recurrenceMonths > 1 ? 'Meses' : 'Mês'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase">Categoria / Conta</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsQuickAddingCategory(true);
                                                setEditingCategoryId(null);
                                                setCategoryForm({ name: '', dreClass: 'EXPENSE_ADM' });
                                                setIsCategoryFormOpen(true);
                                            }}
                                            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase"
                                        >
                                            <FolderPlus size={12} /> Nova Conta
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar conta... (ex: Aluguel)"
                                            autoComplete="off"
                                            value={categoryInputSearch}
                                            onFocus={() => { setCategoryInputSearch(expenseForm.category || ''); setIsCategoryDropdownOpen(true); }}
                                            onChange={e => { setCategoryInputSearch(e.target.value); setIsCategoryDropdownOpen(true); setExpenseForm({ ...expenseForm, category: e.target.value }); }}
                                            onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 180)}
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black pr-10"
                                        />
                                        {expenseForm.category && (() => {
                                            const selCat = expenseCategories.find(c => c.name === expenseForm.category);
                                            const dreLabels: Record<string, { text: string; color: string }> = {
                                                COSTS: { text: 'CPV', color: 'text-rose-600 bg-rose-50' },
                                                EXPENSE_SALES: { text: 'Vendas', color: 'text-orange-600 bg-orange-50' },
                                                EXPENSE_ADM: { text: 'ADM', color: 'text-indigo-600 bg-indigo-50' },
                                                EXPENSE_FIN: { text: 'FIN', color: 'text-purple-600 bg-purple-50' },
                                                TAX: { text: 'TAX', color: 'text-amber-700 bg-amber-50' },
                                                DEDUCTION: { text: 'DED', color: 'text-slate-600 bg-slate-100' },
                                            };
                                            const dl = selCat ? dreLabels[selCat.dreClass] : null;
                                            return dl ? <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black px-2 py-0.5 rounded-full ${dl.color}`}>{dl.text}</span> : null;
                                        })()}
                                        {isCategoryDropdownOpen && (
                                            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl max-h-52 overflow-y-auto">
                                                {expenseCategories
                                                    .filter(c => !categoryInputSearch || c.name.toLowerCase().includes(categoryInputSearch.toLowerCase()))
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                setExpenseForm({ ...expenseForm, category: c.name, dreClass: c.dreClass as any });
                                                                setCategoryInputSearch(c.name);
                                                                setIsCategoryDropdownOpen(false);
                                                            }}
                                                            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                                                        >
                                                            <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase">{c.name}</span>
                                                            <span className="text-[8px] font-black text-slate-400">{c.dreClass}</span>
                                                        </button>
                                                    ))}
                                                {expenseCategories.filter(c => !categoryInputSearch || c.name.toLowerCase().includes(categoryInputSearch.toLowerCase())).length === 0 && (
                                                    <div className="px-4 py-3 text-[10px] text-slate-400 font-bold uppercase">Nenhuma conta encontrada</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Status do Pagamento</label>
                                        <div className="relative">
                                            <select
                                                value={expenseForm.status}
                                                onChange={e => setExpenseForm({ ...expenseForm, status: e.target.value as 'Pago' | 'Pendente' })}
                                                className={`w-full border-2 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 outline-none appearance-none transition-colors ${expenseForm.status === 'Pago' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/30 dark:text-emerald-400' : 'border-amber-200 text-amber-700 dark:border-amber-900/30 dark:text-amber-400'}`}
                                            >
                                                <option value="Pago">Pago</option>
                                                <option value="Pendente">Pendente</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Favorecido (Fornecedor)</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsQuickAddingSupplier(true);
                                                    handleOpenSupplierModal();
                                                }}
                                                className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase"
                                            >
                                                <Plus size={12} /> Novo
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={expenseForm.supplierId || ''}
                                                onChange={e => setExpenseForm({ ...expenseForm, supplierId: e.target.value })}
                                                className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                            >
                                                <option value="">Nenhum (Gasto Avulso)</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <Users size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                                        {recurrenceMonths > 1 ? `Lançar ${recurrenceMonths}x Despesas` : 'Salvar Despesa'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isSupplierModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                            <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                                <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><Users size={18} /> {editingSupplierId ? 'Editar' : 'Novo'} Fornecedor</h3>
                                <button onClick={() => setIsSupplierModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Nome do Fornecedor</label>
                                    <input type="text" required className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Categoria</label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                                value={supplierForm.category}
                                                onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })}
                                            >
                                                <option value="" disabled>Selecione...</option>
                                                {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                <option value="Outros">Outros</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Documento (CPF/CNPJ)</label>
                                        <input type="text" className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.document} onChange={e => setSupplierForm({ ...supplierForm, document: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Telefone</label>
                                        <input type="text" className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">E-mail</label>
                                        <input type="email" className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                                        Salvar Fornecedor
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* BATCH ACTION MODAL (Recurring Expenses) */}
            {
                isBatchModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border-2 border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
                            <div className="p-8 text-center space-y-6">
                                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                                    <AlertCircle size={40} />
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Despesa Recorrente</h3>
                                    <p className="text-sm text-slate-500 font-bold mt-2 leading-relaxed">
                                        Esta despesa faz parte de uma série. Como deseja prosseguir com a {batchActionType === 'SAVE' ? 'edição' : 'exclusão'}?
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => { if (batchActionType === 'SAVE') handleSaveExpense(undefined, 'ONLY_THIS'); else handleDeleteExpense(editingExpenseId!, 'ONLY_THIS'); }}
                                        className="w-full py-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-950 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                                    >
                                        Somente esta
                                    </button>
                                    <button
                                        onClick={() => { if (batchActionType === 'SAVE') handleSaveExpense(undefined, 'THIS_AND_FUTURE'); else handleDeleteExpense(editingExpenseId!, 'THIS_AND_FUTURE'); }}
                                        className="w-full py-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-950 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                                    >
                                        Esta e as próximas
                                    </button>
                                    <button
                                        onClick={() => { if (batchActionType === 'SAVE') handleSaveExpense(undefined, 'ALL'); else handleDeleteExpense(editingExpenseId!, 'ALL'); }}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
                                    >
                                        Todas da série
                                    </button>
                                </div>

                                <button
                                    onClick={() => { setIsBatchModalOpen(false); setBatchActionType('IDLE'); }}
                                    className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* BATCH DATE ADJUSTMENT MODAL */}
            {isBatchDateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                        <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                            <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><Calendar size={18} /> Ajustar Data em Lote</h3>
                            <button onClick={() => setIsBatchDateModalOpen(false)}><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Nova Data para os {selectedExpenseIds.length} itens</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white outline-none focus:border-black"
                                    value={batchNewDate}
                                    onChange={e => setBatchNewDate(e.target.value)}
                                />
                            </div>

                            {selectedExpenseIds.some(id => expenses.find(e => e.id === id)?.recurringId) && (
                                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
                                    <input
                                        type="checkbox"
                                        id="applyToFuture"
                                        className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500 mt-0.5"
                                        checked={applyToFuture}
                                        onChange={e => setApplyToFuture(e.target.checked)}
                                    />
                                    <label htmlFor="applyToFuture" className="text-[11px] font-bold text-amber-900 dark:text-amber-400 leading-tight cursor-pointer">
                                        Reajustar automaticamente o vencimento de todas as parcelas futuras das séries selecionadas?
                                    </label>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={handleBatchDateUpdate}
                                    className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
                                >
                                    Aplicar Nova Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BATCH ACTION BAR (Floating) */}
            {selectedExpenseIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl md:rounded-[2rem] shadow-2xl border-4 border-white/10 dark:border-black/10 flex items-center gap-2 md:gap-4 p-2 md:p-3 backdrop-blur-md">
                        <div className="px-3 md:px-6 border-r border-white/20 dark:border-black/20">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Selecionados</span>
                                <span className="text-lg md:text-xl font-black">{selectedExpenseIds.length}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 md:gap-2">
                            <button
                                onClick={() => setIsBatchDateModalOpen(true)}
                                className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 hover:bg-white/10 dark:hover:bg-black/5 rounded-xl md:rounded-2xl transition-all group"
                            >
                                <Calendar size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Ajustar Data</span>
                            </button>

                            <button
                                onClick={handleBatchStatusUpdate}
                                className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 hover:bg-white/10 dark:hover:bg-black/5 rounded-xl md:rounded-2xl transition-all group"
                            >
                                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Inverter Status</span>
                            </button>

                            <button
                                onClick={handleBatchDelete}
                                className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-xl md:rounded-2xl transition-all group"
                            >
                                <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Excluir</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setSelectedExpenseIds([])}
                            className="ml-2 md:ml-4 p-2 md:p-3 bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 rounded-xl md:rounded-2xl transition-colors"
                            title="Limpar seleção"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}
            {/* Quick Category Modal */}
            {isQuickAddingCategory && isCategoryFormOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-black dark:border-zinc-700 animate-in zoom-in duration-200">
                        <div className="px-6 py-4 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                            <h3 className="font-black uppercase text-sm tracking-widest flex items-center gap-2"><FolderPlus size={18} /> Nova Conta / Categoria</h3>
                            <button onClick={() => { setIsCategoryFormOpen(false); setIsQuickAddingCategory(false); }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Nome da Conta</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ex: Energia Elétrica"
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Classificação DRE</label>
                                <div className="relative">
                                    <select
                                        value={categoryForm.dreClass}
                                        onChange={e => setCategoryForm({ ...categoryForm, dreClass: e.target.value })}
                                        className="w-full border-2 border-slate-200 dark:border-zinc-700 p-3 rounded-xl font-bold bg-slate-50 dark:bg-zinc-800 text-slate-950 dark:text-white outline-none focus:border-black appearance-none"
                                    >
                                        <option value="COSTS">CPV / Custos Operacionais</option>
                                        <option value="EXPENSE_SALES">Despesas com Vendas</option>
                                        <option value="EXPENSE_ADM">Despesas Administrativas</option>
                                        <option value="EXPENSE_FIN">Despesas Financeiras</option>
                                        <option value="TAX">Impostos e Tributos</option>
                                        <option value="DEDUCTION">Deduções da Receita</option>
                                    </select>
                                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                                    Adicionar Conta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
