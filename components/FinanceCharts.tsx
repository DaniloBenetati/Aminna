import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { FinancialTransaction, Expense } from '../types';

interface FinanceChartsProps {
    transactions: FinancialTransaction[];
    expenses: Expense[];
    startDate: string;
    endDate: string;
    timeView: 'day' | 'month' | 'year' | 'custom';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export const FinanceCharts: React.FC<FinanceChartsProps> = ({ transactions, expenses, startDate, endDate, timeView }) => {

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => t.date >= startDate && t.date <= endDate);
    }, [transactions, startDate, endDate]);

    // 1. Revenue vs Expenses (Daily/Monthly Trend)
    const trendData = useMemo(() => {
        const data: Record<string, { date: string; rawDate: string; revenue: number; expense: number }> = {};

        filteredTransactions.forEach(t => {
            let key = t.date; // Default by day
            let label = new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            if (timeView === 'year') {
                key = t.date.substring(0, 7); // YYYY-MM
                const dateObj = new Date(key + '-02'); // Safe date for month extraction
                label = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
            }

            if (!data[key]) {
                data[key] = { date: label, rawDate: key, revenue: 0, expense: 0 };
            }
            if (t.type === 'RECEITA') {
                data[key].revenue += t.amount;
            } else {
                data[key].expense += t.amount;
            }
        });

        return Object.values(data).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    }, [filteredTransactions, timeView]);


    // 2. Revenue Breakdown (Services vs Products)
    const revenueBreakdown = useMemo(() => {
        const services = filteredTransactions.filter(t => t.type === 'RECEITA' && t.origin === 'Serviço').reduce((acc, t) => acc + t.amount, 0);
        const products = filteredTransactions.filter(t => t.type === 'RECEITA' && t.origin === 'Produto').reduce((acc, t) => acc + t.amount, 0);

        return [
            { name: 'Serviços', value: services },
            { name: 'Produtos', value: products }
        ].filter(i => i.value > 0);
    }, [filteredTransactions]);

    // 3. Expense Breakdown by Category
    const expenseBreakdown = useMemo(() => {
        const catMap: Record<string, number> = {};
        filteredTransactions.filter(t => t.type === 'DESPESA').forEach(t => {
            const cat = t.category || 'Outros';
            catMap[cat] = (catMap[cat] || 0) + t.amount;
        });

        return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    // 4. Payment Methods Volume
    const paymentMethodData = useMemo(() => {
        const methodMap: Record<string, number> = {};
        filteredTransactions.filter(t => t.type === 'RECEITA').forEach(t => {
            const method = t.paymentMethod || 'Outros';
            methodMap[method] = (methodMap[method] || 0) + t.amount;
        });

        return Object.entries(methodMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Row 1: Trend & Revenue Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Fluxo de Caixa (Receita x Despesa)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" dataKey="expense" name="Despesa" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Origem da Receita</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenueBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {revenueBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Expense Breakdown & Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Despesas por Categoria</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={expenseBreakdown.slice(0, 8)}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" name="Valor" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Métodos de Pagamento (Receita)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={paymentMethodData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                                <Bar dataKey="value" name="Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
