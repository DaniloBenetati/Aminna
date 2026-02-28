
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LabelList, LineChart, Line } from 'recharts';
import { Users, Calendar, AlertTriangle, DollarSign, TrendingUp, Award, Gift, Clock, ShoppingBag, Ticket, Filter, ChevronLeft, ChevronRight, X, CalendarRange, Package, Handshake, Wallet, Megaphone, BrainCircuit, Target, AlertCircle, BarChart2, Zap } from 'lucide-react';
import { ViewState, Customer, Appointment, Sale, StockItem, Service, Campaign, Provider, PaymentSetting } from '../types';
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
    paymentSettings: PaymentSetting[];
}

export const Dashboard: React.FC<DashboardProps> = ({ appointments, customers, sales, stock, services, campaigns, providers, paymentSettings }) => {
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('month');
    const [dashboardTab, setDashboardTab] = useState<'geral' | 'ocupacao' | 'profissionais' | 'servicos' | 'clientes' | 'campanhas' | 'preditivo'>('geral');
    const [predictiveTargetGrowth, setPredictiveTargetGrowth] = useState(20);
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
            // Safe month navigation
            newDate.setDate(1); // Reset to 1st of month to avoid overflow (e.g. Jan 31 -> Feb 28/29)
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

            if (app.status === 'Cancelado') return false;

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
        const customersInPeriod = new Set(filteredAppointments.map(a => a.customerId));
        let count = 0;
        customersInPeriod.forEach(cid => {
            const customer = customers.find(c => c.id === cid);
            if (customer && customer.status === 'Novo') {
                if (filterChannel !== 'all' && customer.acquisitionChannel !== filterChannel) return;
                count++;
            }
        });
        return count;
    }, [filteredAppointments, customers, filterChannel]);

    // --- CHART DATA GENERATION ---

    // 1. Dynamic Flow Chart (Adapts x-axis based on view)
    const flowData = useMemo(() => {
        const calcMetrics = (apps: Appointment[]) => {
            let total = 0;
            let commissionTotal = 0;

            apps.forEach(a => {
                const mainSvc = services.find(s => s.id === a.serviceId);
                const mainPrice = (a.pricePaid ?? a.bookedPrice ?? mainSvc?.price ?? 0);
                total += mainPrice;

                // Commission for main service
                const provider = providers.find(p => p.id === a.providerId);
                const mainCommRate = a.commissionRateSnapshot ?? (provider?.commissionRate || 0);

                commissionTotal += mainPrice * mainCommRate;

                // Add extra services
                (a.additionalServices || []).forEach(extra => {
                    const extraSvc = services.find(s => s.id === extra.serviceId);
                    const extraPrice = (extra.bookedPrice ?? extraSvc?.price ?? 0);
                    total += extraPrice;

                    const extraProvider = providers.find(p => p.id === extra.providerId);
                    const extraCommRate = extra.commissionRateSnapshot ?? (extraProvider?.commissionRate || 0);

                    commissionTotal += extraPrice * extraCommRate;
                });
            });
            return {
                faturamento: total,
                receita: total - commissionTotal
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
    }, [filteredAppointments, timeView, dateRef, customRange, services, providers]);

    // 2. Top Providers (Updated to Revenue)
    const topProviders = useMemo(() => {
        const revenue: Record<string, number> = {};
        filteredAppointments.filter(a => a.status !== 'Cancelado').forEach(a => {
            const price = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
            revenue[a.providerId] = (revenue[a.providerId] || 0) + price;

            // Extra services for the same provider or others?
            // Usually top providers bar shows revenue attributed to each professional
            (a.additionalServices || []).forEach(extra => {
                const extraPrice = (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0);
                revenue[extra.providerId] = (revenue[extra.providerId] || 0) + extraPrice;
            });
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
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, customers, services]);

    // Frequência de Clientes
    const customerFrequency = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            counts[a.customerId] = (counts[a.customerId] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([id, val]) => ({
                name: customers.find(c => c.id === id)?.name.split(' ')[0] || 'Desc.',
                value: val
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, customers]);

    // Ticket Médio Clientes
    const customerAvgTicket = useMemo(() => {
        const stats: Record<string, { faturamento: number; atendimentos: number }> = {};
        filteredAppointments.forEach(a => {
            const servicePrice = a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0;
            if (!stats[a.customerId]) stats[a.customerId] = { faturamento: 0, atendimentos: 0 };
            stats[a.customerId].faturamento += servicePrice;
            stats[a.customerId].atendimentos += 1;
        });

        return Object.entries(stats)
            .map(([id, data]) => ({
                name: customers.find(c => c.id === id)?.name.split(' ')[0] || 'Desc.',
                value: data.atendimentos > 0 ? data.faturamento / data.atendimentos : 0
            }))
            .sort((a, b) => b.value - a.value);
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
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, services, campaigns]);

    // 5. Top Services (Updated to Revenue)
    const topServices = useMemo(() => {
        const revenue: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            const price = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
            revenue[a.serviceId] = (revenue[a.serviceId] || 0) + price;

            (a.additionalServices || []).forEach(extra => {
                const extraPrice = (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0);
                revenue[extra.serviceId] = (revenue[extra.serviceId] || 0) + extraPrice;
            });
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
            if (s.items && Array.isArray(s.items)) {
                s.items.forEach((item: any) => {
                    const id = item.productId || 'unknown';
                    revenue[id] = (revenue[id] || 0) + ((item.unitPrice || 0) * (item.quantity || 0));
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
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, services, campaigns]);

    // Uso de Campanhas (Agendamentos)
    const campaignUsage = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            if (a.appliedCoupon) {
                counts[a.appliedCoupon] = (counts[a.appliedCoupon] || 0) + 1;
            }
        });

        return Object.entries(counts)
            .map(([code, val]) => {
                const camp = campaigns.find(c => c.couponCode === code);
                return { name: code, value: val, full: camp?.name };
            })
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, campaigns]);

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
            .sort((a, b) => b.value - a.value);
    }, [customers, timeView, dateRef, customRange]);

    // 9. Horários de Pico (Agendamentos)
    const topHours = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            if (a.time) {
                const hour = a.time.substring(0, 2) + 'h';
                counts[hour] = (counts[hour] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name)); // sort chronologically
    }, [filteredAppointments]);

    // 10. Dias de Pico (Agendamentos)
    const topDaysOfWeek = useMemo(() => {
        const counts: Record<string, number> = {};
        const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        filteredAppointments.forEach(a => {
            if (a.date) {
                const dateObj = new Date(a.date + 'T12:00:00'); // Ensure local timezone interpretation
                const dayStr = daysMap[dateObj.getDay()];
                counts[dayStr] = (counts[dayStr] || 0) + 1;
            }
        });
        return daysMap
            .filter(day => counts[day] !== undefined) // keep only days with appointments
            .map(day => ({ name: day, value: counts[day] || 0 })); // sort logically by week day
    }, [filteredAppointments]);

    // 11. Profissionais Mais Requisitados (Volume)
    const topProvidersVolume = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            counts[a.providerId] = (counts[a.providerId] || 0) + 1;

            (a.additionalServices || []).forEach(extra => {
                counts[extra.providerId] = (counts[extra.providerId] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([id, val]) => ({
                name: providers.find(p => p.id === id)?.name.split(' ')[0] || 'Desc.',
                value: val
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, providers]);

    // 12. Serviços Mais Agendados (Volume)
    const topServicesVolume = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            counts[a.serviceId] = (counts[a.serviceId] || 0) + 1;

            (a.additionalServices || []).forEach(extra => {
                counts[extra.serviceId] = (counts[extra.serviceId] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([id, val]) => ({
                name: services.find(s => s.id === id)?.name || 'Desc.',
                value: val
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, services]);

    // Profissionais - Receita e Ticket Médio
    const providerMetrics = useMemo(() => {
        const stats: Record<string, { faturamento: number; atendimentos: number }> = {};

        filteredAppointments.forEach(a => {
            const mainPrice = a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0;

            if (!stats[a.providerId]) stats[a.providerId] = { faturamento: 0, atendimentos: 0 };
            stats[a.providerId].faturamento += mainPrice;
            stats[a.providerId].atendimentos += 1;

            (a.additionalServices || []).forEach(extra => {
                const extraPrice = extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0;
                if (!stats[extra.providerId]) stats[extra.providerId] = { faturamento: 0, atendimentos: 0 };
                stats[extra.providerId].faturamento += extraPrice;
                stats[extra.providerId].atendimentos += 1;
            });
        });

        const arr = Object.entries(stats).map(([id, data]) => ({
            name: providers.find(p => p.id === id)?.name.split(' ')[0] || 'Desc.',
            faturamento: data.faturamento,
            ticketMedio: data.atendimentos > 0 ? data.faturamento / data.atendimentos : 0
        }));

        return {
            revenue: [...arr].sort((a, b) => b.faturamento - a.faturamento),
            ticket: [...arr].sort((a, b) => b.ticketMedio - a.ticketMedio)
        };
    }, [filteredAppointments, providers, services]);

    // Serviços - Receita e Ticket Médio
    const serviceMetrics = useMemo(() => {
        const stats: Record<string, { faturamento: number; qtd: number }> = {};

        filteredAppointments.forEach(a => {
            const mainPrice = a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0;

            if (!stats[a.serviceId]) stats[a.serviceId] = { faturamento: 0, qtd: 0 };
            stats[a.serviceId].faturamento += mainPrice;
            stats[a.serviceId].qtd += 1;

            (a.additionalServices || []).forEach(extra => {
                const extraPrice = extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0;
                if (!stats[extra.serviceId]) stats[extra.serviceId] = { faturamento: 0, qtd: 0 };
                stats[extra.serviceId].faturamento += extraPrice;
                stats[extra.serviceId].qtd += 1;
            });
        });

        const arr = Object.entries(stats).map(([id, data]) => ({
            name: services.find(s => s.id === id)?.name || 'Desc.',
            faturamento: data.faturamento,
            ticketMedio: data.qtd > 0 ? data.faturamento / data.qtd : 0
        }));

        return {
            revenue: [...arr].sort((a, b) => b.faturamento - a.faturamento),
            ticket: [...arr].sort((a, b) => b.ticketMedio - a.ticketMedio)
        };
    }, [filteredAppointments, services]);

    // 13. Tempo Médio no Salão por Dia da Semana
    const avgTimePerDay = useMemo(() => {
        const stats: Record<string, { total: number; count: number }> = {};
        const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        filteredAppointments.forEach(a => {
            if (!a.date) return;
            const dateObj = new Date(a.date + 'T12:00:00');
            const dayStr = daysMap[dateObj.getDay()];

            let duration = 0;
            const mainSvc = services.find(s => s.id === a.serviceId);
            if (mainSvc) duration += mainSvc.durationMinutes || 0;

            (a.additionalServices || []).forEach(extra => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                if (extraSvc) duration += extraSvc.durationMinutes || 0;
            });

            if (duration > 0) {
                if (!stats[dayStr]) stats[dayStr] = { total: 0, count: 0 };
                stats[dayStr].total += duration;
                stats[dayStr].count++;
            }
        });

        return daysMap
            .filter(day => stats[day])
            .map(day => ({ name: day, value: Math.round(stats[day].total / stats[day].count) }));
    }, [filteredAppointments, services]);

    // 14. Ticket Médio por Dia da Semana
    const avgTicketPerDay = useMemo(() => {
        const stats: Record<string, { faturamento: number; atendimentos: number }> = {};
        const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        filteredAppointments.forEach(a => {
            if (!a.date) return;
            const dateObj = new Date(a.date + 'T12:00:00');
            const dayStr = daysMap[dateObj.getDay()];

            const mainPrice = a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0;

            if (!stats[dayStr]) stats[dayStr] = { faturamento: 0, atendimentos: 0 };
            stats[dayStr].faturamento += mainPrice;
            stats[dayStr].atendimentos += 1;

            (a.additionalServices || []).forEach(extra => {
                const extraPrice = extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0;
                stats[dayStr].faturamento += extraPrice;
            });
        });

        return daysMap
            .filter(day => stats[day] !== undefined)
            .map(day => ({
                name: day,
                ticket: stats[day].atendimentos > 0 ? stats[day].faturamento / stats[day].atendimentos : 0
            }));
    }, [filteredAppointments, services]);

    // 15. Birthdays
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
            const mainPrice = (a.pricePaid ?? a.bookedPrice ?? services.find(s => s.id === a.serviceId)?.price ?? 0);
            const extraPrice = (a.additionalServices || []).reduce((sum, extra) => {
                return sum + (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0);
            }, 0);
            return acc + mainPrice + extraPrice;
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

    // Tooltip specifically for Appointments Count
    const CountTooltipAgendamentos = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-zinc-800 p-3 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-xl">
                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase">{label}</p>
                    <p className="text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                        {payload[0].value} Agendamentos
                    </p>
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
                            {providers.sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

            {/* --- DASHBOARD TABS --- */}
            <div className="flex gap-6 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setDashboardTab('geral')}
                    className={`font-black uppercase tracking-widest text-xs pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap ${dashboardTab === 'geral' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Visão Geral
                </button>
                <button
                    onClick={() => setDashboardTab('ocupacao')}
                    className={`font-black uppercase tracking-widest text-xs pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap ${dashboardTab === 'ocupacao' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Análise de Ocupação
                </button>
                <button
                    onClick={() => setDashboardTab('profissionais')}
                    className={`font-black uppercase tracking-widest text-xs pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap ${dashboardTab === 'profissionais' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Profissionais
                </button>
                <button
                    onClick={() => setDashboardTab('servicos')}
                    className={`font-black uppercase tracking-widest text-xs pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap ${dashboardTab === 'servicos' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Serviços
                </button>
                <button
                    onClick={() => setDashboardTab('clientes')}
                    className={`font-black uppercase tracking-widest text-xs pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap ${dashboardTab === 'clientes' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Clientes
                </button>
                <button
                    onClick={() => setDashboardTab('campanhas')}
                    className={`font-black uppercase tracking-widest text-xs pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap ${dashboardTab === 'campanhas' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Campanhas
                </button>
                <button
                    onClick={() => setDashboardTab('preditivo')}
                    className={`font-black uppercase tracking-widest text-xs pb-3 pt-1 border-b-[3px] transition-colors whitespace-nowrap flex items-center gap-2 ${dashboardTab === 'preditivo' ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <BrainCircuit size={14} className={dashboardTab === 'preditivo' ? 'text-amber-500' : ''} />
                    Estudos Preditivos
                </button>
            </div>

            {dashboardTab === 'geral' && (
                <>
                    {/* 1. KPIs Principais */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <KPICard
                            title="Atendimentos (Clientes)"
                            value={new Set(filteredAppointments.map(a => a.customerId)).size}
                            sub="No período selecionado"
                            icon={Users}
                            color="text-violet-700"
                            lightColor="bg-violet-50"
                        />
                        <KPICard
                            title="Serviços Realizados"
                            value={filteredAppointments.reduce((acc, a) => acc + 1 + (a.additionalServices?.length || 0), 0)}
                            sub="Total no período"
                            icon={TrendingUp}
                            color="text-rose-700"
                            lightColor="bg-rose-50"
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
                </>
            )}

            {dashboardTab === 'ocupacao' && (
                <div className="space-y-6">
                    {/* Top Horários de Pico */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Clock size={16} className="text-indigo-600 dark:text-indigo-400" /> Horários de Pico
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={topHours} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.1} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                    <Tooltip cursor={{ stroke: '#4f46e5', strokeWidth: 1 }} content={<CountTooltipAgendamentos />} />
                                    <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }}>
                                        <LabelList dataKey="value" position="top" fill="#64748b" fontSize={10} fontWeight={900} />
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Dias da Semana */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Calendar size={16} className="text-violet-600 dark:text-violet-400" /> Dias de Pico
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={topDaysOfWeek} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.1} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                    <Tooltip cursor={{ stroke: '#7c3aed', strokeWidth: 1 }} content={<CountTooltipAgendamentos />} />
                                    <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }}>
                                        <LabelList dataKey="value" position="top" fill="#64748b" fontSize={10} fontWeight={900} />
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>



                    {/* Tempo Médio no Salão */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Clock size={16} className="text-teal-600 dark:text-teal-400" /> Tempo Médio do Cliente no Salão (Minutos)
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={avgTimePerDay} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTempo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.1} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                    <Tooltip
                                        cursor={{ stroke: '#0d9488', strokeWidth: 1 }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`${value} min`, 'Tempo Médio']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorTempo)" dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }}>
                                        <LabelList dataKey="value" position="top" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `${v}m`} />
                                    </Area>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {dashboardTab === 'profissionais' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Profissionais por Volume */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Users size={16} className="text-sky-600 dark:text-sky-400" /> Profissionais por Volume
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, topProvidersVolume.length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProvidersVolume} layout="vertical" margin={{ left: 0, right: 30 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltipAgendamentos />} />
                                        <Bar dataKey="value" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Faturamento por Profissional */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" /> Faturamento
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, providerMetrics.revenue.length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={providerMetrics.revenue} layout="vertical" margin={{ left: 0, right: 120 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                        <Bar dataKey="faturamento" fill="#059669" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="faturamento" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Ticket Médio por Profissional */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Ticket size={16} className="text-amber-600 dark:text-amber-400" /> Ticket Médio
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, providerMetrics.ticket.length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={providerMetrics.ticket} layout="vertical" margin={{ left: 0, right: 120 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                        <Bar dataKey="ticketMedio" fill="#d97706" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="ticketMedio" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {dashboardTab === 'servicos' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Serviços por Volume */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp size={16} className="text-pink-600 dark:text-pink-400" /> Serviços por Volume
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, topServicesVolume.length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topServicesVolume} layout="vertical" margin={{ left: 0, right: 60 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltipAgendamentos />} />
                                        <Bar dataKey="value" fill="#db2777" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Faturamento por Serviço */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" /> Faturamento
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, serviceMetrics.revenue.length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={serviceMetrics.revenue} layout="vertical" margin={{ left: 0, right: 120 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                        <Bar dataKey="faturamento" fill="#059669" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="faturamento" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Ticket Médio por Serviço */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Ticket size={16} className="text-amber-600 dark:text-amber-400" /> Ticket Médio
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, serviceMetrics.ticket.length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={serviceMetrics.ticket} layout="vertical" margin={{ left: 0, right: 120 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                        <Bar dataKey="ticketMedio" fill="#d97706" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="ticketMedio" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {dashboardTab === 'clientes' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Frequência Clientes */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShoppingBag size={16} className="text-indigo-600 dark:text-indigo-400" /> Frequência
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, customerFrequency.slice(0, 10).length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={customerFrequency.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 60 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltipAgendamentos />} />
                                        <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Clientes Gasto */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" /> Gasto Total (R$)
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, topCustomers.slice(0, 10).length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topCustomers.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 120 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                        <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Ticket Médio Clientes */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Ticket size={16} className="text-amber-600 dark:text-amber-400" /> Ticket Médio
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, customerAvgTicket.slice(0, 10).length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={customerAvgTicket.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 120 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                        <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Ticket Médio Dia Semana */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" /> Ticket Médio Semanal
                            </h3>
                            <div className="h-60 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={avgTicketPerDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <Line type="monotone" dataKey="ticket" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {dashboardTab === 'campanhas' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Campanhas Uso */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Ticket size={16} className="text-amber-600" /> Uso de Cupons
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, campaignUsage.slice(0, 10).length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={campaignUsage.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 60 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltipAgendamentos />} />
                                        <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Campanhas Faturamento */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-500" /> Faturamento por Campanha
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, topCampaigns.slice(0, 10).length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topCampaigns.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 120 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Canais de Entrada */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Megaphone size={16} className="text-cyan-600" /> Canais de Entrada
                            </h3>
                            <div className="min-h-[240px]" style={{ height: `${Math.max(240, topChannels.slice(0, 10).length * 32)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topChannels.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 60 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltip />} />
                                        <Bar dataKey="value" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {dashboardTab === 'preditivo' && (
                (() => {
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

                        // We need to look up the customer for the channel filter
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
                            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-2 rounded-2xl shadow-lg text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-2 justify-between">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
                                    <BrainCircuit size={100} />
                                </div>
                                <div className="z-10 flex-1">
                                    <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 drop-shadow-sm">
                                        <BrainCircuit size={16} /> O Estrategista
                                    </h2>
                                    <p className="text-white/80 font-bold text-[11px] leading-tight max-w-4xl drop-shadow-sm mt-0.5">
                                        Analisei seus dados de {currentYear - 1} e tracei a sazonalidade do seu negócio.
                                        Acompanhe a linha de meta ajustada e veja quanto falta faturar em {currentMonthData.name}!
                                    </p>
                                </div>
                                <div className="z-10 bg-white/20 py-1.5 px-4 rounded-xl backdrop-blur-sm border border-white/20 flex flex-col items-center min-w-[150px]">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-100 flex items-center gap-1 mb-0.5"><Target size={10} /> Simulador de Meta</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setPredictiveTargetGrowth(Math.max(0, predictiveTargetGrowth - 5))} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center transition-colors font-black text-xs">-</button>
                                        <span className="text-xl font-black drop-shadow-md leading-none">+{predictiveTargetGrowth}%</span>
                                        <button onClick={() => setPredictiveTargetGrowth(predictiveTargetGrowth + 5)} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center transition-colors font-black text-xs">+</button>
                                    </div>
                                    <span className="text-[8px] font-bold text-white/70 uppercase mt-0.5">Crescimento sobre {currentYear - 1}</span>
                                </div>
                            </div>

                            {/* Core Diagnostics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2"><Target size={12} /> Cenário de {currentMonthData.name}</p>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">R$ {currentAchieved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                        <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-4 mt-4 flex relative overflow-hidden">
                                            <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, percentageAchieved)}%` }}></div>
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md">{percentageAchieved.toFixed(1)}% da Meta</div>
                                        </div>
                                    </div>
                                    <p className={`text-xs font-bold mt-4 ${gapToTarget > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                        {gapToTarget > 0 ? `Faltam R$ ${gapToTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para atingir +${predictiveTargetGrowth}%` : 'Meta superada com excelência!'}
                                    </p>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2"><BarChart2 size={12} /> Análise de Sazonalidade</p>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2">Tração no 2º Semestre</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Os dados históricos mostram que o negócio ganha uma força expressiva a partir de agosto, culminando no pico do ano em outubro.</p>
                                    </div>
                                    <p className="text-xs font-bold mt-4 text-indigo-600 flex items-center gap-1"><Zap size={14} /> Prepare o time para a alta demanda.</p>
                                </div>

                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between border-l-4 border-l-rose-500">
                                    <div>
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 mb-2"><AlertCircle size={12} /> Ponto de Atenção</p>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2">Queda pós-Fevereiro</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Fevereiro (R$223k) para Março (R$191k) apresentou uma retração considerável no ano passado.</p>
                                    </div>
                                    <p className="text-xs font-bold mt-4 text-rose-600">Programe campanhas de reativação para Março/Abril.</p>
                                </div>
                            </div>

                            {/* Predictive Chart */}
                            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-1">
                                    Modelagem de Curva Financeira
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-8">Baseline de {currentYear - 1} vs Tração Atual vs Target (+{predictiveTargetGrowth}%)</p>

                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={predictiveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorAchieved" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} tickFormatter={(v) => `R$ ${(v / 1000)}k`} />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />

                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                                labelStyle={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}
                                                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                            />

                                            <Area type="monotone" dataKey="Ano Passado" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} fill="none" />
                                            <Area type="monotone" dataKey="Meta Ajustada" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTarget)" />

                                            {/* We only draw "Ano Atual" up to the current month by using a special formatter if needed, but recharts draws 0 by default. Let's make it null for future months so it stops drawing */}
                                            <Area type="monotone" dataKey={(d) => d.monthIndex <= currentMonthIndex ? d['Ano Atual'] : null} name="Ano Atual" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorAchieved)" activeDot={{ r: 6, strokeWidth: 0 }} />

                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    );
                })()
            )}
        </div>
    );
};
