import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { Sale, StockItem, Customer } from '../types';
import { TrendingUp, Users, Package, Calendar, ArrowUpRight, ShoppingCart, AlertCircle, BarChart3, DollarSign, Percent } from 'lucide-react';

interface SalesAnalysesProps {
    sales?: Sale[];
    stock?: StockItem[];
    customers?: Customer[];
}

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e', '#f97316', '#eab308'];

export const SalesAnalyses: React.FC<SalesAnalysesProps> = ({ sales: propSales, stock: propStock, customers: propCustomers }) => {
    const filteredSales = propSales || [];
    const stock = propStock || [];
    const customers = propCustomers || [];

    const stockMap = useMemo(() => new Map(stock.map(p => [p.id, p])), [stock]);
    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

    // 1. Top Customers by Spending
    const topCustomersData = useMemo(() => {
        const spending: Record<string, number> = {};
        filteredSales.forEach(s => {
            spending[s.customerId] = (spending[s.customerId] || 0) + (s.totalAmount || 0);
        });

        return Object.entries(spending)
            .map(([id, value]) => ({
                name: customerMap.get(id)?.name || 'Cliente Avulso',
                value
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredSales, customerMap]);

    // 2. Best Selling Subcategories (Revenue)
    const bestSellersData = useMemo(() => {
        const revenue: Record<string, number> = {};
        filteredSales.forEach(s => {
            s.items?.forEach((item: any) => {
                const id = item.productId;
                const product = stockMap.get(id);
                const subCategory = product?.subGroup || 'Outros';
                const itemRevenue = (item.quantity || 1) * (item.unitPrice || item.price || 0);
                revenue[subCategory] = (revenue[subCategory] || 0) + itemRevenue;
            });
        });

        return Object.entries(revenue)
            .map(([name, value]) => ({
                name,
                value
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [filteredSales, stockMap]);

    // KPI Stats (Replicated from Sales.tsx)
    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalItems = 0;
        let totalCost = 0;
        let productSalesCount = 0;

        filteredSales.forEach(s => {
            let hasProduct = false;
            if (s.items && Array.isArray(s.items)) {
                s.items.forEach((item: any) => {
                    const id = item.productId || 'unknown';
                    const pInStock = stockMap.get(id);
                    
                    if (pInStock) {
                        hasProduct = true;
                        const qty = Number(item.quantity || 1);
                        const price = Number(item.unitPrice || item.price || 0);
                        const cost = Number(pInStock.costPrice || 0);

                        totalRevenue += (qty * price);
                        totalCost += (qty * cost);
                        totalItems += qty;
                    }
                });
            }
            if (hasProduct) productSalesCount++;
        });

        const netRevenue = totalRevenue - totalCost;
        const avgTicket = productSalesCount > 0 ? totalRevenue / productSalesCount : 0;
        const profitMargin = totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0;
        
        return { totalRevenue, totalItems, avgTicket, netRevenue, profitMargin };
    }, [filteredSales, stockMap]);

    // 3. Daily Sales Volume (Timeline)
    const dailyTrendData = useMemo(() => {
        const trend: Record<string, { date: string, revenue: number, units: number }> = {};
        filteredSales.forEach(s => {
            const dateStr = s.date?.split('T')[0];
            const date = dateStr && !isNaN(new Date(dateStr).getTime()) ? dateStr : 'Outros';
            if (!trend[date]) {
                trend[date] = { date, revenue: 0, units: 0 };
            }
            trend[date].revenue += (s.totalAmount || 0);
            s.items?.forEach((i: any) => {
                if (stockMap.has(i.productId)) {
                    trend[date].units += (i.quantity || 1);
                }
            });
        });

        return Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredSales, stockMap]);

    // 4. Day of Week Performance
    const dowData = useMemo(() => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const performance = days.map(d => ({ name: d, value: 0 }));
        
        filteredSales.forEach(s => {
            if (s.date) {
                const dateObj = new Date(s.date.includes('T') ? s.date : s.date + 'T12:00:00');
                const d = dateObj.getDay();
                if (!isNaN(d) && performance[d]) {
                    performance[d].value += (s.totalAmount || 0);
                }
            }
        });
        return performance;
    }, [filteredSales]);

    // 5. Replenishment Suggestions (Smart Purchasing)
    const buySuggestions = useMemo(() => {
        return stock
            .filter(p => p.category === 'Venda' && (p.quantity || 0) <= (p.minQuantity || 0))
            .map(p => ({
                ...p,
                status: p.quantity === 0 ? 'Urgent' : 'Low'
            }))
            .sort((a, b) => (a.quantity === 0 ? -1 : 1))
            .slice(0, 5);
    }, [stock]);

    // 6. Projection (Linear Trend)
    const projectionData = useMemo(() => {
        if (dailyTrendData.length < 2) return [];
        
        const last7Days = dailyTrendData.slice(-7);
        const avgDaily = last7Days.length > 0 ? last7Days.reduce((acc, curr) => acc + curr.revenue, 0) / last7Days.length : 0;
        
        const base = dailyTrendData.map(d => ({ ...d, type: 'Real' }));
        const lastPoint = dailyTrendData[dailyTrendData.length - 1];
        if (!lastPoint || !lastPoint.date) return base;

        const lastDate = new Date(lastPoint.date + 'T12:00:00');
        
        // Project 5 days
        for (let i = 1; i <= 5; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);
            
            if (!isNaN(nextDate.getTime())) {
                base.push({
                    date: nextDate.toISOString().split('T')[0],
                    revenue: avgDaily,
                    units: 0,
                    type: 'Projeção'
                } as any);
            }
        }
        return base;
    }, [dailyTrendData]);

    if (filteredSales.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-in fade-in duration-500">
                <BarChart3 size={64} className="text-slate-200" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sem dados para análise no período</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header Analytics Cards - KPIs from Sales view */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl">
                            <DollarSign size={20} />
                        </div>
                        <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Faturamento</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Receita Líquida</p>
                    <p className="text-lg md:text-xl font-black text-emerald-700 dark:text-emerald-400">R$ {stats.netRevenue.toFixed(2)}</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 ${stats.profitMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'} rounded-xl`}>
                            <Percent size={20} />
                        </div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Margem de Lucro</p>
                    <p className={`text-lg md:text-xl font-black ${stats.profitMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {stats.profitMargin >= 0 ? '+' : ''}{stats.profitMargin.toFixed(1)}%
                    </p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl">
                            <Package size={20} />
                        </div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Itens Vendidos</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">{stats.totalItems} un</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-400 rounded-xl">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Ticket Médio</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">R$ {stats.avgTicket.toFixed(2)}</p>
                </div>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                
                {/* 1. Daily Performance Area Chart */}
                <div className="bg-white dark:bg-zinc-900 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Performance Diária</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Evolução de produtos vendidos por dia</p>
                        </div>
                        <ShoppingCart size={20} className="text-slate-300" />
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyTrendData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" hide />
                                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Top Products Bar Chart */}
                <div className="bg-white dark:bg-zinc-900 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Faturamento por Subcategoria</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Ranking por faturamento total agrupado por subcategoria</p>
                        </div>
                        <Package size={20} className="text-slate-300" />
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bestSellersData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={window.innerWidth < 768 ? 7 : 9} fontWeight="900" width={window.innerWidth < 768 ? 60 : 100} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Top Spending Customers (Converted from Pie to Bar) */}
                <div className="bg-white dark:bg-zinc-900 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Maiores Compradores</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Ranking por valor total investido na loja</p>
                        </div>
                        <Users size={20} className="text-slate-300" />
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCustomersData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={window.innerWidth < 768 ? 7 : 9} fontStyle="italic" fontWeight="900" width={window.innerWidth < 768 ? 70 : 120} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                                />
                                <Bar dataKey="value" fill="#10b981" radius={[0, 10, 10, 0]} barSize={24}>
                                    {topCustomersData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Sales by Day of Week */}
                <div className="bg-white dark:bg-zinc-900 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Faturamento por Dia da Semana</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Identifique seus dias mais fortes</p>
                        </div>
                        <Calendar size={20} className="text-slate-300" />
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dowData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="name" fontSize={11} fontWeight="900" tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                                <Bar dataKey="value" fill="#f43f5e" radius={[10, 10, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Projection & Buy Suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 5. Linear Projection Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Projeção de Vendas</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Previsão baseada na média dos últimos 7 dias</p>
                        </div>
                        <ArrowUpRight size={20} className="text-slate-300" />
                    </div>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={projectionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                                <Line 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#ec4899" 
                                    strokeWidth={3} 
                                    dot={(props: any) => {
                                        if (props.payload?.type === 'Projeção') {
                                            return <circle cx={props.cx} cy={props.cy} r={4} fill="#ec4899" />;
                                        }
                                        return <circle cx={props.cx} cy={props.cy} r={2} fill="#ec4899" />;
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 6. Smart Buy Suggestions */}
                <div className="bg-white dark:bg-zinc-900 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">O que comprar?</h3>
                        <AlertCircle size={18} className="text-amber-500" />
                    </div>
                    <div className="space-y-4">
                        {buySuggestions.length > 0 ? buySuggestions.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase">{p.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Estoque: {p.quantity} {p.unit}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${p.status === 'Urgent' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    {p.status === 'Urgent' ? 'Esgotado' : 'Repor'}
                                </span>
                            </div>
                        )) : (
                            <div className="text-center py-10">
                                <Package className="mx-auto text-slate-100 mb-2" size={32} />
                                <p className="text-[10px] font-black text-slate-300 uppercase">Estoque em dia!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
