
import React, { useState, useMemo } from 'react';
import { Coffee, Plus, Search, Minus, X, Edit2, History, Package, Clock, DollarSign, TrendingUp, Filter, AlertTriangle, CheckCircle2, ChevronRight, Tag, Save, Info, ChevronDown, ChevronUp, ClipboardList, CalendarRange, ChevronLeft, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { PantryItem, PantryLog, Appointment, Customer, Provider } from '../types';

interface CopaProps {
    pantryItems: PantryItem[];
    setPantryItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
    pantryLogs: PantryLog[];
    setPantryLogs: React.Dispatch<React.SetStateAction<PantryLog[]>>;
    appointments: Appointment[];
    customers: Customer[];
    providers: Provider[];
}

export const Copa: React.FC<CopaProps> = ({
    pantryItems, setPantryItems, pantryLogs, setPantryLogs, appointments, customers, providers
}) => {
    const [activeTab, setActiveTab] = useState<'STOCK' | 'SERVICE' | 'FINANCE' | 'PRICES'>('SERVICE');
    const [searchTerm, setSearchTerm] = useState('');

    // States for Modals
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [consumptionSelection, setConsumptionSelection] = useState<{ itemId: string, quantity: number }[]>([]);

    // State for Finance Tab Drill Down & Filters
    const [expandedCommandId, setExpandedCommandId] = useState<string | null>(null);
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('month');
    const [dateRef, setDateRef] = useState(new Date());
    const [customRange, setCustomRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [filterCustomerId, setFilterCustomerId] = useState('all');
    const [isCustomerFilterOpen, setIsCustomerFilterOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    // --- HELPERS ---
    const activeAppointments = useMemo(() => {
        // Apenas atendimentos com status "Em Andamento" (Check-in realizado)
        // Exclui "Confirmado" (Agendado mas não chegou) e "Concluído" (Checkout feito)
        const toLocalDateStr = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const today = toLocalDateStr(new Date());

        return appointments.filter(a =>
            a.date === today && a.status === 'Em Andamento'
        ).sort((a, b) => a.time.localeCompare(b.time));
    }, [appointments]);

    const filteredItems = useMemo(() => {
        return pantryItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [pantryItems, searchTerm]);

    // Filter logs for the currently selected appointment in the modal
    const currentAppointmentLogs = useMemo(() => {
        if (!selectedAppointment) return [];
        return pantryLogs.filter(log => log.appointmentId === selectedAppointment.id);
    }, [pantryLogs, selectedAppointment]);

    // Date Navigation Helpers
    const navigateDate = (direction: 'prev' | 'next') => {
        if (timeView === 'custom') return;
        const newDate = new Date(dateRef);
        const modifier = direction === 'next' ? 1 : -1;

        if (timeView === 'day') newDate.setDate(dateRef.getDate() + modifier);
        else if (timeView === 'month') newDate.setMonth(dateRef.getMonth() + modifier);
        else if (timeView === 'year') newDate.setFullYear(dateRef.getFullYear() + modifier);

        setDateRef(newDate);
    };

    const getDateLabel = () => {
        if (timeView === 'custom') return "Período Personalizado";
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return dateRef.getFullYear().toString();
    };

    const isDateInPeriod = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');

        if (timeView === 'day') {
            return d.getDate() === dateRef.getDate() &&
                d.getMonth() === dateRef.getMonth() &&
                d.getFullYear() === dateRef.getFullYear();
        } else if (timeView === 'month') {
            return d.getMonth() === dateRef.getMonth() && d.getFullYear() === dateRef.getFullYear();
        } else if (timeView === 'year') {
            return d.getFullYear() === dateRef.getFullYear();
        } else if (timeView === 'custom') {
            return dateStr >= customRange.start && dateStr <= customRange.end;
        }
        return false;
    };

    const categories = useMemo(() => {
        const defaultCats = ['Bebida', 'Alimento', 'Outro'];
        const usedCats = pantryItems.map(i => i.category);
        return Array.from(new Set([...defaultCats, ...usedCats])).sort();
    }, [pantryItems]);

    // --- ACTIONS ---

    const handleSaveItem = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = {
            name: (form.elements.namedItem('name') as HTMLInputElement).value,
            unit: (form.elements.namedItem('unit') as HTMLInputElement).value,
            category: (form.elements.namedItem('category') as HTMLInputElement | HTMLSelectElement).value as any,
            minQuantity: parseInt((form.elements.namedItem('minQuantity') as HTMLInputElement).value) || 0,
            costPrice: parseFloat((form.elements.namedItem('costPrice') as HTMLInputElement).value) || 0,
            referencePrice: parseFloat((form.elements.namedItem('referencePrice') as HTMLInputElement).value) || 0,
        };

        if (editingItem) {
            setPantryItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i));
        } else {
            const newItem: PantryItem = {
                id: Date.now().toString(),
                quantity: 0,
                ...formData
            };
            setPantryItems(prev => [...prev, newItem]);
        }
        setIsItemModalOpen(false);
        setIsCustomCategory(false);
    };

    const handleUpdateStock = (itemId: string, delta: number) => {
        setPantryItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i));
    };

    const handleAddConsumptionItem = (itemId: string) => {
        setConsumptionSelection(prev => {
            const existing = prev.find(p => p.itemId === itemId);
            if (existing) {
                return prev.map(p => p.itemId === itemId ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { itemId, quantity: 1 }];
        });
    };

    const handleRemoveConsumptionItem = (itemId: string) => {
        setConsumptionSelection(prev => {
            const existing = prev.find(p => p.itemId === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(p => p.itemId === itemId ? { ...p, quantity: p.quantity - 1 } : p);
            }
            return prev.filter(p => p.itemId !== itemId);
        });
    };

    const confirmConsumption = () => {
        if (!selectedAppointment) return;

        const newLogs: PantryLog[] = [];
        const updatedItems = [...pantryItems];

        consumptionSelection.forEach(sel => {
            const itemIndex = updatedItems.findIndex(i => i.id === sel.itemId);
            if (itemIndex >= 0) {
                const item = updatedItems[itemIndex];
                // Decrement Stock
                updatedItems[itemIndex] = { ...item, quantity: Math.max(0, item.quantity - sel.quantity) };

                // Create Log
                newLogs.push({
                    id: Date.now().toString() + Math.random(),
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    itemId: sel.itemId,
                    quantity: sel.quantity,
                    appointmentId: selectedAppointment.id,
                    customerId: selectedAppointment.customerId,
                    providerId: selectedAppointment.providerId,
                    costAtMoment: item.costPrice,
                    referenceAtMoment: item.referencePrice
                });
            }
        });

        setPantryItems(updatedItems);
        setPantryLogs(prev => [...prev, ...newLogs]);
        setIsConsumptionModalOpen(false);
        setConsumptionSelection([]);
        // Não fecha o modal imediatamente para permitir ver o histórico atualizado ou adicionar mais, 
        // ou descomente abaixo para fechar:
        setIsConsumptionModalOpen(false);
        setSelectedAppointment(null);
    };

    // --- SUB-COMPONENTS ---

    const StockTab = () => (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <h3 className="font-black uppercase text-sm tracking-widest text-slate-800 dark:text-white">Estoque de Insumos</h3>
                <button
                    onClick={() => { setEditingItem(null); setIsItemModalOpen(true); setIsCustomCategory(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                    <Plus size={14} /> Novo Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{item.category}</span>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{item.name}</h4>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Custo: R$ {item.costPrice.toFixed(2)} / {item.unit}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${item.quantity <= item.minQuantity ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {item.quantity} {item.unit}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                            <button onClick={() => { setEditingItem(item); setIsItemModalOpen(true); setIsCustomCategory(false); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleUpdateStock(item.id, -1)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors"><Minus size={16} /></button>
                                <button onClick={() => handleUpdateStock(item.id, 1)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center transition-colors"><Plus size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const ServiceTab = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-black text-indigo-900 dark:text-indigo-400 text-lg uppercase tracking-tight">Atendimentos em Andamento</h3>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mt-1">Registre o consumo da copa apenas para clientes que já fizeram check-in.</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{activeAppointments.length}</span>
                    <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase ml-2">Clientes Ativos</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeAppointments.map(app => {
                    const customer = customers.find(c => c.id === app.customerId);
                    const provider = providers.find(p => p.id === app.providerId);

                    return (
                        <div key={app.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Coffee size={64} className="text-indigo-600" /></div>

                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{app.time}</p>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase truncate">{customer?.name}</h4>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase">Prof: {provider?.name.split(' ')[0]}</p>

                                <div className="mt-6">
                                    <button
                                        onClick={() => { setSelectedAppointment(app); setConsumptionSelection([]); setIsConsumptionModalOpen(true); }}
                                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> Registrar Consumo
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {activeAppointments.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 dark:text-slate-600">
                        <Clock size={48} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-black uppercase">Nenhum atendimento em andamento no momento</p>
                        <p className="text-[10px] uppercase opacity-70 mt-1">Inicie um atendimento na Agenda ou Dashboard para registrar consumo.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const FinanceTab = () => {
        // 1. FILTER DATA
        const filteredLogs = useMemo(() => {
            return pantryLogs.filter(log => {
                // Date Filter
                const isInDate = isDateInPeriod(log.date);
                if (!isInDate) return false;

                // Customer Filter
                if (filterCustomerId !== 'all' && log.customerId !== filterCustomerId) return false;

                return true;
            });
        }, [pantryLogs, timeView, dateRef, customRange, filterCustomerId]);

        // 2. CALCULATE KPIS BASED ON FILTERED
        const totalCost = filteredLogs.reduce((acc, log) => acc + (log.quantity * log.costAtMoment), 0);
        const totalReferenceValue = filteredLogs.reduce((acc, log) => acc + (log.quantity * log.referenceAtMoment), 0);
        const uniqueClients = new Set(filteredLogs.map(l => l.customerId)).size;
        const avgCostPerClient = uniqueClients > 0 ? totalCost / uniqueClients : 0;

        // 3. RANKING
        const itemRanking = filteredLogs.reduce((acc, log) => {
            const item = pantryItems.find(i => i.id === log.itemId);
            if (!acc[log.itemId]) acc[log.itemId] = { name: item?.name || '?', quantity: 0, cost: 0 };
            acc[log.itemId].quantity += log.quantity;
            acc[log.itemId].cost += log.quantity * log.costAtMoment;
            return acc;
        }, {} as Record<string, { name: string, quantity: number, cost: number }>);

        const topItems = (Object.values(itemRanking) as { name: string, quantity: number, cost: number }[]).sort((a, b) => b.cost - a.cost).slice(0, 5);

        // 4. GROUPED LIST
        const groupedLogs = useMemo(() => {
            const groups: Record<string, {
                id: string,
                date: string,
                customerName: string,
                providerName: string,
                items: PantryLog[],
                totalCost: number,
                totalRef: number
            }> = {};

            filteredLogs.forEach(log => {
                const key = log.appointmentId || `${log.customerId}-${log.date}`;
                if (!groups[key]) {
                    const customer = customers.find(c => c.id === log.customerId);
                    const provider = providers.find(p => p.id === log.providerId);
                    groups[key] = {
                        id: key,
                        date: log.date,
                        customerName: customer?.name || 'Cliente Avulso',
                        providerName: provider?.name.split(' ')[0] || '-',
                        items: [],
                        totalCost: 0,
                        totalRef: 0
                    };
                }
                groups[key].items.push(log);
                groups[key].totalCost += (log.quantity * log.costAtMoment);
                groups[key].totalRef += (log.quantity * log.referenceAtMoment);
            });

            return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }, [filteredLogs, customers]);

        // 5. CHART DATA PREPARATION
        const chartData = useMemo(() => {
            const dataMap: Record<string, { name: string, cost: number, quantity: number, fullDate: string }> = {};

            filteredLogs.forEach(log => {
                let key = log.date;
                let name = new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                if (timeView === 'day') {
                    // Group by Hour for daily view
                    const hour = log.time.split(':')[0];
                    key = `${log.date}-${hour}`;
                    name = `${hour}h`;
                } else if (timeView === 'year') {
                    // Group by Month for yearly view
                    key = log.date.substring(0, 7); // YYYY-MM
                    name = new Date(key + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'short' });
                }

                if (!dataMap[key]) {
                    dataMap[key] = { name, cost: 0, quantity: 0, fullDate: log.date };
                }
                dataMap[key].cost += (log.quantity * log.costAtMoment);
                dataMap[key].quantity += log.quantity;
            });

            return Object.values(dataMap).sort((a, b) => {
                // Custom sort logic
                if (timeView === 'day') return parseInt(a.name) - parseInt(b.name);
                return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime();
            });
        }, [filteredLogs, timeView]);

        const ChartTooltip = ({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
                return (
                    <div className="bg-white dark:bg-zinc-800 p-3 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-xl">
                        <p className="font-black text-slate-900 dark:text-white text-xs uppercase mb-2">{label}</p>
                        <div className="space-y-1">
                            <p className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                                R$ {payload[0].value.toFixed(2)}
                            </p>
                            <p className="text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                                {payload[1].value} Itens
                            </p>
                        </div>
                    </div>
                );
            }
            return null;
        };

        return (
            <div className="space-y-6 animate-in fade-in">

                {/* FILTERS BAR */}
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4 sticky top-0 z-20">
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                            {(['day', 'month', 'year', 'custom'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }}
                                    className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    {v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}
                                </button>
                            ))}
                        </div>

                        {timeView === 'custom' ? (
                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl w-full md:w-auto">
                                <CalendarRange size={16} className="text-slate-400" />
                                <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                                <span className="text-slate-300">-</span>
                                <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between md:justify-start">
                                <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                                <div className="flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span>
                                </div>
                                <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </div>

                    <div className="w-full xl:w-auto flex items-center gap-2 relative z-50">
                        <div className="relative flex-1 xl:min-w-[250px]">
                            <button
                                onClick={() => setIsCustomerFilterOpen(!isCustomerFilterOpen)}
                                className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 uppercase flex items-center justify-between transition-all hover:border-indigo-300"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <User size={16} className="absolute left-3 text-slate-400" />
                                    <span className="truncate">
                                        {filterCustomerId === 'all'
                                            ? 'Todas Clientes'
                                            : customers.find(c => c.id === filterCustomerId)?.name || 'Cliente Desconhecido'}
                                    </span>
                                </div>
                                {isCustomerFilterOpen ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                            </button>

                            {isCustomerFilterOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsCustomerFilterOpen(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                                        <div className="p-2 border-b border-slate-50 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50">
                                            <div className="relative">
                                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Buscar cliente..."
                                                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 uppercase placeholder:text-slate-400"
                                                    value={customerSearchTerm}
                                                    onChange={e => setCustomerSearchTerm(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto p-1 space-y-1 scrollbar-hide bg-white dark:bg-zinc-800">
                                            <button
                                                onClick={() => { setFilterCustomerId('all'); setIsCustomerFilterOpen(false); setCustomerSearchTerm(''); }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-colors ${filterCustomerId === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                <span>Todas Clientes</span>
                                                {filterCustomerId === 'all' && <CheckCircle2 size={14} />}
                                            </button>
                                            {customers
                                                .filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                                                .map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => { setFilterCustomerId(c.id); setIsCustomerFilterOpen(false); setCustomerSearchTerm(''); }}
                                                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-colors ${filterCustomerId === c.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400'}`}
                                                    >
                                                        <span className="truncate">{c.name}</span>
                                                        {filterCustomerId === c.id && <CheckCircle2 size={14} />}
                                                    </button>
                                                ))}
                                            {customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase">
                                                    Nenhuma cliente encontrada
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Custo Total (Copa)</p>
                            <p className="text-2xl font-black mt-1">R$ {totalCost.toFixed(2)}</p>
                        </div>
                        <DollarSign className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white opacity-5" />
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Média por Cliente</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">R$ {avgCostPerClient.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Valor Referência (Teórico)</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">R$ {totalReferenceValue.toFixed(2)}</p>
                        <p className="text-[8px] text-slate-400 font-bold mt-1">Comparativo de valor percebido</p>
                    </div>
                </div>

                {/* TOP ITEMS & RECENT LIST */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                        <h4 className="text-xs font-black uppercase tracking-widest mb-4 text-slate-800 dark:text-white flex items-center gap-2"><TrendingUp size={14} /> Itens Mais Consumidos (Custo)</h4>
                        <div className="space-y-3">
                            {topItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs font-black text-slate-900 dark:text-white">R$ {item.cost.toFixed(2)}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{item.quantity} un</span>
                                    </div>
                                </div>
                            ))}
                            {topItems.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sem dados no período</p>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col">
                        <h4 className="text-xs font-black uppercase tracking-widest mb-4 text-slate-800 dark:text-white flex items-center gap-2"><History size={14} /> Últimos Consumos</h4>
                        <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-hide space-y-2">
                            {filteredLogs.slice().reverse().slice(0, 10).map(log => {
                                const item = pantryItems.find(i => i.id === log.itemId);
                                const customer = customers.find(c => c.id === log.customerId);
                                return (
                                    <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white">{item?.name} <span className="text-slate-400">x{log.quantity}</span></p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{customer?.name.split(' ')[0] || 'Anônimo'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-mono text-slate-400">{log.time}</p>
                                            <p className="text-[9px] font-black text-rose-400">- R$ {(log.quantity * log.costAtMoment).toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredLogs.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sem dados no período</p>}
                        </div>
                    </div>
                </div>

                {/* DETALHAMENTO DE COMANDAS */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-widest mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                        <ClipboardList size={14} /> Detalhamento de Comandas
                    </h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                        {groupedLogs.map(group => (
                            <div key={group.id} className="border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all">
                                <button
                                    onClick={() => setExpandedCommandId(expandedCommandId === group.id ? null : group.id)}
                                    className={`w-full flex justify-between items-center p-4 transition-colors ${expandedCommandId === group.id ? 'bg-slate-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                                >
                                    <div className="text-left flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${expandedCommandId === group.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                                            <Coffee size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{new Date(group.date).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{group.customerName}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{group.items.length} Itens • Prof: {group.providerName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">R$ {group.totalCost.toFixed(2)}</p>
                                        <div className="flex items-center justify-end gap-1 text-slate-400 mt-1">
                                            {expandedCommandId === group.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>
                                </button>

                                {expandedCommandId === group.id && (
                                    <div className="p-3 bg-slate-50/50 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        {group.items.map(log => {
                                            const item = pantryItems.find(i => i.id === log.itemId);
                                            return (
                                                <div key={log.id} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-700 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{item?.name}</span>
                                                        <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-500">x{log.quantity}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-mono text-[9px] text-slate-400">{log.time}</span>
                                                        <span className="block font-black text-slate-900 dark:text-white text-[10px]">R$ {(log.quantity * log.costAtMoment).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="pt-2 mt-2 border-t border-slate-200 dark:border-zinc-700 flex justify-between items-center text-[9px] uppercase font-bold text-indigo-400">
                                            <span>Valor de Referência (Venda)</span>
                                            <span>R$ {group.totalRef.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {groupedLogs.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sem comandas no período</p>}
                    </div>
                </div>

                {/* NEW CHART SECTION */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-widest mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                        <TrendingUp size={14} /> Evolução de Consumo
                    </h4>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} interval="preserveStartEnd" />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.1} />
                                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', paddingTop: '10px' }} />
                                <Area yAxisId="left" type="monotone" dataKey="cost" name="Valor Consumido (R$)" stroke="#10b981" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
                                <Area yAxisId="right" type="monotone" dataKey="quantity" name="Quantidade (Itens)" stroke="#6366f1" fillOpacity={1} fill="url(#colorQty)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const PricesTab = () => (
        <div className="space-y-4 animate-in fade-in">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" size={20} />
                <div>
                    <h4 className="text-sm font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">Regras de Valores</h4>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mt-1">
                        Os "Valores de Referência" definidos aqui <strong>não são cobrados do cliente</strong>.
                        Eles servem para análise financeira interna (Custo vs Valor Percebido).
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4 text-right">Custo Real (Compra)</th>
                                <th className="px-6 py-4 text-right">Valor Referência</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-700">
                            {pantryItems.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">{item.name}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg text-[9px] font-bold uppercase text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700">{item.category}</span></td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-500 dark:text-slate-400">R$ {item.costPrice.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">R$ {item.referencePrice.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => { setEditingItem(item); setIsItemModalOpen(true); setIsCustomCategory(false); }} className="text-slate-400 hover:text-indigo-600 transition-colors p-2"><Edit2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-8 text-slate-900 dark:text-white">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight uppercase tracking-tight">Copa & Consumo</h2>
                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão de amenidades e custos</p>
                </div>
                {/* TABS */}
                <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'SERVICE', label: 'Atendimentos', icon: Clock },
                        { id: 'STOCK', label: 'Estoque', icon: Package },
                        { id: 'PRICES', label: 'Preços', icon: Tag },
                        { id: 'FINANCE', label: 'Relatórios', icon: TrendingUp },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 min-h-0">
                {activeTab === 'STOCK' && <StockTab />}
                {activeTab === 'SERVICE' && <ServiceTab />}
                {activeTab === 'FINANCE' && <FinanceTab />}
                {activeTab === 'PRICES' && <PricesTab />}
            </div>

            {/* MODAL: EDIT ITEM (For Stock & Prices) */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col">
                        <div className="px-6 py-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Package size={18} /> {editingItem ? 'Editar Item' : 'Novo Insumo'}</h3>
                            <button onClick={() => setIsItemModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Item</label>
                                <input name="name" required defaultValue={editingItem?.name} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="Ex: Café Expresso" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Unidade</label>
                                    <input name="unit" required defaultValue={editingItem?.unit} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="un, ml, kg" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Categoria</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomCategory(!isCustomCategory)}
                                            className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase hover:underline"
                                        >
                                            {isCustomCategory ? 'Selecionar' : 'Nova'}
                                        </button>
                                    </div>
                                    {isCustomCategory ? (
                                        <input
                                            name="category"
                                            required
                                            defaultValue={editingItem?.category}
                                            className="w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                            placeholder="Nova Categoria"
                                        />
                                    ) : (
                                        <select name="category" defaultValue={editingItem?.category || 'Bebida'} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500">
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Estoque Mínimo (Alerta)</label>
                                <input name="minQuantity" type="number" defaultValue={editingItem?.minQuantity || 10} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <div>
                                    <label className="block text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase mb-1">Custo de Compra (R$)</label>
                                    <input name="costPrice" type="number" step="0.01" defaultValue={editingItem?.costPrice || 0} className="w-full bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 rounded-xl p-3 text-sm font-bold text-rose-900 dark:text-rose-100 outline-none focus:border-rose-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1">Valor Referência (R$)</label>
                                    <input name="referencePrice" type="number" step="0.01" defaultValue={editingItem?.referencePrice || 0} className="w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl p-3 text-sm font-bold text-indigo-900 dark:text-indigo-100 outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Salvar Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CONSUMPTION REGISTER */}
            {isConsumptionModalOpen && selectedAppointment && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center flex-shrink-0">
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Coffee size={18} /> Registrar Consumo</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{customers.find(c => c.id === selectedAppointment.customerId)?.name}</p>
                            </div>
                            <button onClick={() => setIsConsumptionModalOpen(false)}><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-zinc-900">

                            {/* HISTÓRICO DESTA SESSÃO (NOVO) */}
                            {currentAppointmentLogs.length > 0 && (
                                <div className="bg-slate-100 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700">
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <History size={12} /> Histórico desta sessão
                                    </h4>
                                    <div className="space-y-2">
                                        {currentAppointmentLogs.map(log => {
                                            const item = pantryItems.find(i => i.id === log.itemId);
                                            return (
                                                <div key={log.id} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-100 dark:border-zinc-700">
                                                    <span className="font-bold flex items-center gap-2">
                                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                                        {item?.name} <span className="opacity-50 text-[10px] bg-slate-100 dark:bg-zinc-700 px-1.5 rounded">x{log.quantity}</span>
                                                    </span>
                                                    <span className="font-mono text-[10px] opacity-70">{log.time}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Selected List */}
                            {consumptionSelection.length > 0 && (
                                <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm mb-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Novos Itens Selecionados</h4>
                                    <div className="space-y-2">
                                        {consumptionSelection.map(sel => {
                                            const item = pantryItems.find(i => i.id === sel.itemId);
                                            return (
                                                <div key={sel.itemId} className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                                                    <span>{item?.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded text-xs">x{sel.quantity}</span>
                                                        <button onClick={() => handleRemoveConsumptionItem(sel.itemId)} className="text-rose-500"><Minus size={14} /></button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Item Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {pantryItems.filter(i => i.quantity > 0).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleAddConsumptionItem(item.id)}
                                        className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-indigo-500 hover:shadow-md transition-all text-left group"
                                    >
                                        <p className="text-[10px] font-black text-slate-400 uppercase">{item.category}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black mt-1 group-hover:translate-x-1 transition-transform">+ Adicionar</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
                            <button
                                onClick={confirmConsumption}
                                disabled={consumptionSelection.length === 0}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> Confirmar Consumo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
