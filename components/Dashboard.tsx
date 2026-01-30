
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Calendar, AlertTriangle, DollarSign, TrendingUp, Award, Gift, Clock, ShoppingBag, Ticket, Filter, ChevronLeft, ChevronRight, X, CalendarRange, Package, Handshake, Wallet, Megaphone } from 'lucide-react';
import { ViewState, Customer, Appointment, Sale, StockItem, Service, Campaign, Provider } from '../types';
import { PARTNERS } from '../constants';

const KPICard = ({ title, value, sub, icon: Icon, color, lightColor }: any) => (
    <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default gap-3 h-full">
        <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{title}</p>
                <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-2xl flex-shrink-0 w-fit ${lightColor} dark:bg-opacity-20`}>
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${color} dark:text-current`} />
            </div>
        </div>
        <p className={`text-[10px] md:text-xs font-bold truncate flex items-center gap-1 ${sub.includes('+') ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {sub.includes('+') ? <TrendingUp size={12} /> : <AlertTriangle size={12} />}
            {sub}
        </p>
    </div>
);

interface DashboardProps {
    onNavigate: (view: ViewState) => void;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    sales: Sale[];
    stock: StockItem[];
    services: Service[];
    campaigns: Campaign[];
    providers: Provider[];
}

export const Dashboard: React.FC<DashboardProps> = ({ appointments, customers, sales, stock, services, campaigns, providers }) => {
    // --- FILTER STATES ---
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('month');
    const [dateRef, setDateRef] = useState(new Date()); // Default to Today

    // Custom Range State
    const [customRange, setCustomRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [filterProvider, setFilterProvider] = useState('all');
    const [filterService, setFilterService] = useState('all');
    const [filterCampaign, setFilterCampaign] = useState('all');
    const [filterProduct, setFilterProduct] = useState('all');
    const [filterPartner, setFilterPartner] = useState('all');
    const [filterChannel, setFilterChannel] = useState('all'); // New Channel Filter
    const [showFilters, setShowFilters] = useState(false);

    // --- HELPERS ---
    const navigateDate = (direction: 'prev' | 'next') => {
        if (timeView === 'custom') return; // Navigation disabled for custom range
        const newDate = new Date(dateRef);
        if (timeView === 'day') {
            newDate.setDate(dateRef.getDate() + (direction === 'next' ? 1 : -1));
        } else if (timeView === 'month') {
            newDate.setMonth(dateRef.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            newDate.setFullYear(dateRef.getFullYear() + (direction === 'next' ? 1 : -1));
        }
        setDateRef(newDate);
    };

    const getDateLabel = () => {
        if (timeView === 'custom') return "Período Personalizado";
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return dateRef.getFullYear().toString();
    };

    // --- FILTERING HELPER FUNCTION ---
    // Improved logic to handle local date comparisons correctly
    const isDateInPeriod = (dateStr: string) => {
        // Force dateStr (YYYY-MM-DD) to be interpreted as noon local time for consistent component extraction
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

    // --- DATA FILTERING ---
    const filteredAppointments = useMemo(() => {
        // If product filter is active, we (mostly) hide appointments as they aren't directly linked to product sales in this view
        if (filterProduct !== 'all') return [];

        return appointments.filter(app => {
            if (!isDateInPeriod(app.date)) return false;

            // Context Filters
            if (filterProvider !== 'all' && app.providerId !== filterProvider) return false;
            if (filterService !== 'all' && app.serviceId !== filterService) return false;

            if (filterCampaign !== 'all') {
                const campaign = campaigns.find(c => c.id === filterCampaign);
                if (!campaign || app.appliedCoupon !== campaign.couponCode) return false;
            }

            if (filterPartner !== 'all') {
                // Find campaigns associated with this partner
                const partnerCampaignCodes = campaigns
                    .filter(c => c.partnerId === filterPartner)
                    .map(c => c.couponCode);

                // Check if appointment used one of these codes
                if (!app.appliedCoupon || !partnerCampaignCodes.includes(app.appliedCoupon)) return false;
            }

            if (filterChannel !== 'all') {
                const customer = customers.find(c => c.id === app.customerId);
                if (!customer || customer.acquisitionChannel !== filterChannel) return false;
            }

            return true;
        });
    }, [appointments, timeView, dateRef, customRange, filterProvider, filterService, filterCampaign, filterProduct, filterPartner, filterChannel, campaigns, customers]);

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            // 1. Date Check
            if (!isDateInPeriod(s.date)) return false;

            // 2. Product Filter
            if (filterProduct !== 'all' && s.productId !== filterProduct) return false;

            // 3. Provider Filter (Link via Customer)
            const customer = customers.find(c => c.id === s.customerId);

            if (filterProvider !== 'all') {
                if (!customer || customer.assignedProviderId !== filterProvider) return false;
            }

            if (filterChannel !== 'all') {
                if (!customer || customer.acquisitionChannel !== filterChannel) return false;
            }

            // Sales don't typically have campaigns/services/partners directly attached in this model
            if (filterService !== 'all' || filterCampaign !== 'all' || filterPartner !== 'all') return false;

            return true;
        });
    }, [sales, timeView, dateRef, customRange, filterProvider, filterService, filterCampaign, filterProduct, filterPartner, filterChannel, customers]);

    const newCustomersCount = useMemo(() => {
        // Ensure we count registration dates within the period
        return customers.filter(c => {
            const inDate = c.registrationDate && isDateInPeriod(c.registrationDate);
            if (!inDate) return false;

            if (filterChannel !== 'all' && c.acquisitionChannel !== filterChannel) return false;
            // Apply other customer filters if logic permits

            return true;
        }).length;
    }, [customers, timeView, dateRef, customRange, filterChannel]);

    // --- CHART DATA GENERATION ---

    // 1. Dynamic Flow Chart (Adapts x-axis based on view)
    const flowData = useMemo(() => {
        // Helper to calc metrics for a list of apps
        const calcMetrics = (apps: Appointment[]) => {
            let gross = 0;
            let commission = 0;
            apps.forEach(a => {
                const price = a.pricePaid || services.find(s => s.id === a.serviceId)?.price || 0;
                gross += price;

                // Find provider to calculate commission
                const provider = providers.find(p => p.id === a.providerId);
                if (provider) {
                    commission += price * provider.commissionRate;
                }
            });
            return {
                faturamento: gross,
                receita: gross - commission
            };
        };

        if (timeView === 'day') {
            // Hourly flow
            const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h
            return hours.map(h => {
                const label = `${h}h`;
                const hourApps = filteredAppointments.filter(a => parseInt(a.time.split(':')[0]) === h);
                const metrics = calcMetrics(hourApps);
                return {
                    name: label,
                    atendimentos: hourApps.length,
                    faturamento: metrics.faturamento,
                    receita: metrics.receita
                };
            });
        } else if (timeView === 'month' || timeView === 'custom') {
            // Daily flow
            let startD, endD;
            if (timeView === 'month') {
                startD = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
                endD = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0);
            } else {
                startD = new Date(customRange.start + 'T12:00:00');
                endD = new Date(customRange.end + 'T12:00:00');
            }

            const days = [];
            for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                days.push(new Date(d));
            }

            return days.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                const dayApps = filteredAppointments.filter(a => a.date === dateStr);
                const metrics = calcMetrics(dayApps);
                return {
                    name: d.getDate().toString(),
                    fullDate: dateStr,
                    atendimentos: dayApps.length,
                    faturamento: metrics.faturamento,
                    receita: metrics.receita
                };
            });
        } else {
            // Monthly flow
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return months.map((m, i) => {
                const monthApps = filteredAppointments.filter(a => new Date(a.date).getMonth() === i);
                const metrics = calcMetrics(monthApps);
                return {
                    name: m,
                    atendimentos: monthApps.length,
                    faturamento: metrics.faturamento,
                    receita: metrics.receita
                };
            });
        }
    }, [filteredAppointments, timeView, dateRef, customRange, services]);

    // 2. Top Providers (Updated to Revenue)
    const topProviders = useMemo(() => {
        const revenue: Record<string, number> = {};
        filteredAppointments.filter(a => a.status === 'Concluído').forEach(a => {
            const price = a.pricePaid || services.find(s => s.id === a.serviceId)?.price || 0;
            revenue[a.providerId] = (revenue[a.providerId] || 0) + price;
        });
        return Object.entries(revenue)
            .map(([id, val]) => ({
                name: providers.find(p => p.id === id)?.name.split(' ')[0] || 'Desc.',
                full: providers.find(p => p.id === id)?.name,
                value: val,
                avatar: providers.find(p => p.id === id)?.avatar
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredAppointments, services, providers]);

    // 3. Top Customers (Spenders) - Already Revenue
    const topCustomers = useMemo(() => {
        const spending: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            const servicePrice = services.find(s => s.id === a.serviceId)?.price || 0;
            spending[a.customerId] = (spending[a.customerId] || 0) + (a.pricePaid || servicePrice);
        });

        return Object.entries(spending)
            .map(([id, val]) => ({
                name: customers.find(c => c.id === id)?.name.split(' ')[0] || 'Desc.',
                full: customers.find(c => c.id === id)?.name,
                value: val
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredAppointments, customers, services]);

    // 4. Top Partners - Already Revenue
    const topPartners = useMemo(() => {
        const partnerRevenue: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            if (a.appliedCoupon) {
                const campaign = campaigns.find(c => c.couponCode === a.appliedCoupon);
                if (campaign) {
                    const servicePrice = services.find(s => s.id === a.serviceId)?.price || 0;
                    partnerRevenue[campaign.partnerId] = (partnerRevenue[campaign.partnerId] || 0) + servicePrice;
                }
            }
        });

        return Object.entries(partnerRevenue)
            .map(([id, val]) => ({
                name: PARTNERS.find((p: any) => p.id === id)?.name || 'Desc.',
                value: val
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredAppointments, services, campaigns]);

    // 5. Top Services (Updated to Revenue)
    const topServices = useMemo(() => {
        const revenue: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            const price = a.pricePaid || services.find(s => s.id === a.serviceId)?.price || 0;
            revenue[a.serviceId] = (revenue[a.serviceId] || 0) + price;
        });
        return Object.entries(revenue)
            .map(([id, val]) => ({
                name: services.find(s => s.id === id)?.name || 'Desc.',
                value: val
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredAppointments, services]);

    // 6. Top Products (Sales) (Updated to Revenue)
    const topProducts = useMemo(() => {
        const revenue: Record<string, number> = {};
        filteredSales.forEach(s => {
            if (s.items) {
                s.items.forEach((item: any) => {
                    const id = item.productId || 'unknown';
                    revenue[id] = (revenue[id] || 0) + (item.unitPrice * item.quantity);
                });
            }
        });
        return Object.entries(revenue)
            .map(([id, val]) => ({
                name: stock.find(p => p.id === id)?.name || 'Prod. Removido',
                value: val
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredSales, stock]);

    // 7. Top Campaigns - Already Revenue
    const topCampaigns = useMemo(() => {
        const campaignRevenue: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            if (a.appliedCoupon) {
                const servicePrice = services.find(s => s.id === a.serviceId)?.price || 0;
                campaignRevenue[a.appliedCoupon] = (campaignRevenue[a.appliedCoupon] || 0) + servicePrice;
            }
        });

        return Object.entries(campaignRevenue)
            .map(([code, val]) => {
                const camp = campaigns.find(c => c.couponCode === code);
                return { name: code, value: val, full: camp?.name };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredAppointments, services, campaigns]);

    // 8. Top Channels (NEW - Based on New Customers Count in Period)
    const topChannels = useMemo(() => {
        const channelCounts: Record<string, number> = {};
        // Filter customers registered in the selected period to make it reactive to the date
        const relevantCustomers = customers.filter(c => isDateInPeriod(c.registrationDate));

        relevantCustomers.forEach(c => {
            const channel = c.acquisitionChannel || 'Não Informado';
            channelCounts[channel] = (channelCounts[channel] || 0) + 1;
        });

        return Object.entries(channelCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [customers, timeView, dateRef, customRange]);

    // 9. Birthdays
    const currentMonthIdx = timeView === 'month' ? dateRef.getMonth() : new Date().getMonth();
    const displayMonthName = new Date(0, currentMonthIdx).toLocaleString('pt-BR', { month: 'long' });

    const customerBirthdays = useMemo(() => {
        return customers.filter(c => {
            if (!c.birthDate) return false;
            const [y, m, d] = c.birthDate.split('-').map(Number);
            if (timeView === 'day') return m === dateRef.getMonth() + 1 && d === dateRef.getDate();
            if (timeView === 'custom') return false;
            return m === currentMonthIdx + 1;
        });
    }, [customers, currentMonthIdx, timeView, dateRef]);

    const providerBirthdays = useMemo(() => {
        return providers.filter(p => {
            if (!p.birthDate) return false;
            const [y, m, d] = p.birthDate.split('-').map(Number);
            if (timeView === 'day') return m === dateRef.getMonth() + 1 && d === dateRef.getDate();
            if (timeView === 'custom') return false;
            return m === currentMonthIdx + 1;
        });
    }, [providers, currentMonthIdx, timeView, dateRef]);

    // KPI Calculations
    const totalRevenue = useMemo(() => {
        const serviceRevenue = filteredAppointments.reduce((acc, a) => {
            const price = services.find(s => s.id === a.serviceId)?.price || 0;
            return acc + (a.pricePaid || price);
        }, 0);
        const salesRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        return serviceRevenue + salesRevenue;
    }, [filteredAppointments, filteredSales, services]);

    const activeFiltersCount = (filterProvider !== 'all' ? 1 : 0) + (filterService !== 'all' ? 1 : 0) + (filterCampaign !== 'all' ? 1 : 0) + (filterProduct !== 'all' ? 1 : 0) + (filterPartner !== 'all' ? 1 : 0) + (filterChannel !== 'all' ? 1 : 0);

    // Common Tooltip for Currency
    const CurrencyTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-zinc-800 p-3 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-xl">
                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase">{label}</p>
                    <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        R$ {payload[0].value.toFixed(2)}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Tooltip for Count
    const CountTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-zinc-800 p-3 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-xl">
                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase">{label}</p>
                    <p className="text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                        {payload[0].value} Clientes
                    </p>
                </div>
            );
        }
        return null;
    };

    // Custom Tooltip for the main Flow Chart (AreaChart)
    const CustomFlowTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Extract data from the first payload item
            const data = payload[0].payload;

            let prefix = '';
            if (timeView === 'month' || timeView === 'custom') prefix = 'Dia:';
            else if (timeView === 'day') prefix = 'Horário:';
            else if (timeView === 'year') prefix = 'Mês:';

            return (
                <div className="bg-white dark:bg-zinc-800 p-4 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-2xl min-w-[150px]">
                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase mb-3 border-b border-slate-50 dark:border-zinc-700 pb-2">
                        {prefix} {label}
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1"><Users size={10} /> Atendimentos:</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{data.atendimentos}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1"><DollarSign size={10} /> Faturamento:</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {data.faturamento.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1"><Wallet size={10} /> Receita Líq.:</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {data.receita.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 relative pb-20 md:pb-0">

            {/* Header Title */}
            <div className="flex flex-col justify-between items-start gap-1">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Painel Gerencial</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest">Visão Geral do Negócio</p>
            </div>

            {/* --- CONTROL BAR --- */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col xl:flex-row items-center justify-between gap-4 sticky top-0 z-20">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}
                            </button>
                        ))}
                    </div>

                    {timeView === 'custom' ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl w-full md:w-auto">
                            <CalendarRange size={16} className="text-slate-400" />
                            <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} className="text-xs font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                            <span className="text-slate-300">-</span>
                            <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} className="text-xs font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between md:justify-start">
                            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                            <div className="flex flex-col items-center min-w-[140px]">
                                <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Período Selecionado</span>
                            </div>
                            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={20} /></button>
                        </div>
                    )}
                </div>

                {/* Filters Trigger & Active Filters */}
                <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                    >
                        <Filter size={16} />
                        Filtros {activeFiltersCount > 0 && <span className="bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px] ml-1">{activeFiltersCount}</span>}
                    </button>
                </div>
            </div>

            {/* --- EXPANDABLE FILTERS --- */}
            {showFilters && (
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] shadow-lg border border-slate-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-4 relative z-10">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Profissional</label>
                        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-slate-300 uppercase">
                            <option value="all">Todas</option>
                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Serviço</label>
                        <select value={filterService} onChange={e => setFilterService(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-slate-300 uppercase">
                            <option value="all">Todos</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Campanha</label>
                        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-slate-300 uppercase">
                            <option value="all">Todas</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.couponCode})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Parceiro</label>
                        <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-slate-300 uppercase">
                            <option value="all">Todos</option>
                            {PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Produto</label>
                        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-slate-300 uppercase">
                            <option value="all">Todos</option>
                            {stock.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Canal de Entrada</label>
                        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-3 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-slate-300 uppercase">
                            <option value="all">Todos</option>
                            {['Instagram', 'Facebook', 'TikTok', 'Google', 'Indicação', 'WhatsApp', 'Passante'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {activeFiltersCount > 0 && (
                        <div className="md:col-span-3 lg:col-span-5 flex justify-end">
                            <button
                                onClick={() => { setFilterProvider('all'); setFilterService('all'); setFilterCampaign('all'); setFilterProduct('all'); setFilterPartner('all'); setFilterChannel('all'); }}
                                className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:text-rose-800 flex items-center gap-1"
                            >
                                <X size={12} /> Limpar Filtros
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 1. KPIs Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KPICard
                    title="Faturamento Global"
                    value={`R$ ${(totalRevenue / 1000).toFixed(1)}k`}
                    sub="Serviços + Produtos"
                    icon={DollarSign}
                    color="text-emerald-700"
                    lightColor="bg-emerald-50"
                />
                <KPICard
                    title="Atendimentos"
                    value={filteredAppointments.length}
                    sub="No período selecionado"
                    icon={Calendar}
                    color="text-violet-700"
                    lightColor="bg-violet-50"
                />
                <KPICard
                    title="Novos Clientes"
                    value={newCustomersCount}
                    sub="Cadastrados no período"
                    icon={Users}
                    color="text-blue-700"
                    lightColor="bg-blue-50"
                />
                <KPICard
                    title="Produtos Vendidos"
                    value={filteredSales.reduce((acc, s) => acc + s.quantity, 0)}
                    sub="Venda direta"
                    icon={Package}
                    color="text-amber-700"
                    lightColor="bg-amber-50"
                />
            </div>

            {/* 2. Fluxo Dinâmico (Big Chart) */}
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                {/* ... (Chart content remains the same) ... */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Clock size={20} className="text-indigo-600 dark:text-indigo-400" /> Fluxo {timeView === 'day' ? 'Horário' : timeView === 'month' || timeView === 'custom' ? 'Diário' : 'Mensal'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Distribuição de atendimentos no período</p>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={flowData}>
                            <defs>
                                <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.1} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} interval={timeView === 'day' ? 0 : 'preserveStartEnd'} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 800, fill: '#64748b' }} />
                            <Tooltip
                                content={<CustomFlowTooltip />}
                                cursor={{ stroke: '#4f46e5', strokeWidth: 2 }}
                            />
                            <Area type="monotone" dataKey="atendimentos" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorFlow)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Rankings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Top Profissionais (Revenue) */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Award size={16} className="text-purple-600 dark:text-purple-400" /> TOP 5 Profissionais (R$)
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProviders} layout="vertical" margin={{ left: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Clientes */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ShoppingBag size={16} className="text-emerald-600 dark:text-emerald-400" /> TOP 5 Clientes (Gasto)
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCustomers} layout="vertical" margin={{ left: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Serviços (Revenue) */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp size={16} className="text-rose-600 dark:text-rose-400" /> TOP 5 Serviços (R$)
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topServices} layout="vertical" margin={{ left: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                <Bar dataKey="value" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Produtos (Revenue) */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Package size={16} className="text-amber-500" /> TOP 5 Produtos (Venda R$)
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Canais de Entrada (NEW) */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Megaphone size={16} className="text-cyan-600" /> TOP 5 Canais de Entrada
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topChannels} layout="vertical" margin={{ left: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltip />} />
                                <Bar dataKey="value" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Campanhas */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Ticket size={16} className="text-amber-600" /> TOP 5 Campanhas (R$)
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCampaigns} layout="vertical" margin={{ left: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 4. Aniversariantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                        <Gift size={20} className="text-indigo-600 dark:text-indigo-400" /> Clientes Aniversariantes ({displayMonthName})
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                        {customerBirthdays.length > 0 ? customerBirthdays.map(c => (
                            <div key={c.id} className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                <div>
                                    <p className="font-black text-sm text-slate-900 dark:text-white">{c.name}</p>
                                    <p className="text-[10px] font-bold opacity-70 uppercase text-slate-600 dark:text-slate-400">{c.phone}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg">{c.birthDate?.split('-').reverse().join('/')}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm font-medium opacity-60 italic text-slate-500 dark:text-slate-400">Nenhum aniversário de cliente neste período.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                        <Gift size={20} className="text-rose-600 dark:text-rose-400" /> Equipe Aniversariante ({displayMonthName})
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                        {providerBirthdays.length > 0 ? providerBirthdays.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                <div className="flex items-center gap-3">
                                    <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-600" />
                                    <div>
                                        <p className="font-black text-sm text-slate-900 dark:text-white">{p.name}</p>
                                        <p className="text-[10px] font-bold opacity-70 uppercase text-slate-600 dark:text-slate-400">{p.specialty}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg">{p.birthDate?.split('-').reverse().join('/')}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm font-medium opacity-60 italic text-slate-500 dark:text-slate-400">Nenhum aniversário na equipe neste período.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
