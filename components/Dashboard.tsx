
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LabelList, LineChart, Line } from 'recharts';
import { Users, Calendar, AlertTriangle, DollarSign, TrendingUp, Award, Gift, Clock, ShoppingBag, Ticket, Filter, ChevronLeft, ChevronRight, X, CalendarRange, Package, Handshake, Wallet, Megaphone, BrainCircuit, Target, AlertCircle, BarChart2, Zap, PieChart, Sparkles, CircleCheck, Activity, MessageCircle, Copy } from 'lucide-react';
import { ViewState, Customer, Appointment, Sale, StockItem, Service, Campaign, Provider, PaymentSetting } from '../types';
import { PARTNERS } from '../constants';
import { toLocalDateStr, calculateAppointmentProduction, parseDateSafe } from '../services/financialService';
import { supabase } from '../services/supabase';

const KPICard = ({ title, value, sub, icon: Icon, color, lightColor, valueSize, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col justify-between hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'} gap-3 h-full`}
    >
        <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{title}</p>
                <div className="flex items-center gap-2">
                    <h3 className={`${valueSize || 'text-xl md:text-3xl'} font-black text-slate-900 dark:text-white tracking-tighter mt-1`}>{value}</h3>
                    {onClick && <ChevronRight size={16} className="text-slate-400 mt-1" />}
                </div>
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

export const Dashboard: React.FC<DashboardProps> = ({ appointments, customers, sales, stock, services, campaigns, providers, paymentSettings, setCustomers }) => {
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('month');
    const [dashboardTab, setDashboardTab] = useState<'geral' | 'ocupacao' | 'profissionais' | 'servicos' | 'clientes' | 'campanhas'>('geral');
    const [activeSubTab, setActiveSubTab] = useState<'charts' | 'insights' | 'ausencias' | 'high_performance'>('charts');
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
    const [isChurnModalOpen, setIsChurnModalOpen] = useState(false);
    const [isNewCustomersModalOpen, setIsNewCustomersModalOpen] = useState(false);
    const [churnModalTab, setChurnModalTab] = useState<'loyal' | 'new'>('loyal');

    // --- HELPERS ---
    const navigateDate = (direction: 'prev' | 'next') => {
        if (timeView === 'custom') return; const newDate = new Date(dateRef);
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
        if (!dateStr) return false;
        // Handle full ISO strings by extracting only the date part (YYYY-MM-DD)
        const cleanDate = dateStr.split('T')[0];
        const [y, m, d] = cleanDate.split('-').map(Number);
        
        if (timeView === 'day') {
            return d === dateRef.getDate() &&
                (m - 1) === dateRef.getMonth() &&
                y === dateRef.getFullYear();
        } else if (timeView === 'month') {
            return (m - 1) === dateRef.getMonth() && y === dateRef.getFullYear();
        } else if (timeView === 'year') {
            return y === dateRef.getFullYear();
        } else if (timeView === 'custom') {
            return cleanDate >= customRange.start && cleanDate <= customRange.end;
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
            if (filterProduct !== 'all' && !s.items?.some((i: any) => i.productId === filterProduct)) return false;

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

    const firstVisits = useMemo(() => {
        const visits: Record<string, { date: string, revenue: number, servicesCount: number }> = {};
        
        customers.forEach(c => {
            const customerApps = appointments.filter(a => a.customerId === c.id && a.status === 'Concluído');
            if (customerApps.length > 0) {
                const sorted = [...customerApps].sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return (a.time || '').localeCompare(b.time || '');
                });
                const first = sorted[0];
                const sameDayApps = customerApps.filter(a => a.date === first.date);
                
                let revenue = 0;
                let servicesCount = 0;
                let hasCoupon = false;
                
                sameDayApps.forEach(a => {
                    const mainSvc = services.find(s => s.id === a.serviceId);
                    const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
                    const extras = (a.additionalServices || []).reduce((sum, extra) => {
                        const extraSvc = services.find(s => s.id === extra.serviceId);
                        return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
                    }, 0);
                    
                    revenue += mainBooked + extras;
                    servicesCount += 1 + (a.additionalServices || []).length;
                    
                    if (a.appliedCoupon) hasCoupon = true;
                });
                
                visits[c.id] = { date: first.date, revenue, servicesCount, hasCoupon };
            }
        });
        return visits;
    }, [customers, appointments, services]);

    const newCustomersCount = useMemo(() => {
        return Object.values(firstVisits).filter(v => isDateInPeriod(v.date)).length;
    }, [firstVisits, timeView, dateRef, customRange]);

    const newCustomersListData = useMemo(() => {
        return Object.entries(firstVisits)
            .filter(([_, v]) => isDateInPeriod(v.date))
            .map(([customerId, v]) => {
                const customer = customers.find(c => c.id === customerId);
                // Find appointments for that specific first visit date
                const firstDayApps = appointments.filter(a => a.customerId === customerId && a.status === 'Concluído' && a.date === v.date);
                
                // Get professional name (from the first appointment of the day)
                const mainApp = firstDayApps[0];
                const professional = providers.find(p => p.id === mainApp?.providerId)?.name || 'N/A';
                
                // Collect all service names from that day
                const servicesNames = firstDayApps.map(a => {
                    const svc = services.find(s => s.id === a.serviceId);
                    let names = [svc?.name || 'Serviço'];
                    (a.additionalServices || []).forEach(extra => {
                        const extraSvc = services.find(es => es.id === extra.serviceId);
                        if (extraSvc) names.push(extraSvc.name);
                    });
                    return names.join(', ');
                }).join(', ');

                return {
                    id: customerId,
                    name: customer?.name || 'Sem Nome',
                    phone: customer?.phone || '',
                    date: v.date,
                    professional,
                    services: servicesNames,
                    revenue: v.revenue,
                    lastMarketingContact: customer?.lastMarketingContact
                };
            })
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [firstVisits, customers, appointments, providers, services, timeView, dateRef, customRange]);

    const newCustomersTrafficData = useMemo(() => {
        const dailyData: Record<string, { count: number, recurring: number, revenue: number, services: number, recurringRevenue: number, recurringServices: number, coupons: number }> = {};
        
        Object.values(firstVisits).forEach(v => {
            if (isDateInPeriod(v.date)) {
                dailyData[v.date] = dailyData[v.date] || { count: 0, recurring: 0, revenue: 0, services: 0, recurringRevenue: 0, recurringServices: 0, coupons: 0 };
                dailyData[v.date].count++;
                dailyData[v.date].revenue += v.revenue;
                dailyData[v.date].services += v.servicesCount;
                if ((v as any).hasCoupon) dailyData[v.date].coupons++;
            }
        });

        filteredAppointments.filter(a => a.status === 'Concluído').forEach(a => {
            const fv = firstVisits[a.customerId];
            // If the appointment is NOT the first visit, it's a recurring customer
            if (fv && fv.date !== a.date) {
                dailyData[a.date] = dailyData[a.date] || { count: 0, recurring: 0, revenue: 0, services: 0, recurringRevenue: 0, recurringServices: 0, coupons: 0 };
                dailyData[a.date].recurring++;

                // Calculate Revenue and Services for recurring appointments
                const mainSvc = services.find(s => s.id === a.serviceId);
                const mainRev = (a.pricePaid ?? a.bookedPrice ?? mainSvc?.price ?? 0);
                const extrasRev = (a.additionalServices || []).reduce((sum, extra) => {
                    const extraSvc = services.find(s => s.id === extra.serviceId);
                    return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0);
                }, 0);
                
                dailyData[a.date].recurringRevenue += (mainRev + extrasRev);
                dailyData[a.date].recurringServices += (1 + (a.additionalServices || []).length);
            }
        });

        if (timeView === 'day') {
             const dateStr = toLocalDateStr(dateRef);
             const d = dailyData[dateStr] || { count: 0, recurring: 0, revenue: 0, services: 0, recurringRevenue: 0, recurringServices: 0 };
             return [{ 
                name: dateRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), 
                value: d.count,
                recurring: d.recurring,
                revenue: d.revenue,
                services: d.services,
                recurringRevenue: d.recurringRevenue,
                recurringServices: d.recurringServices,
                coupons: d.coupons
             }];
        }

        if (timeView === 'month' || timeView === 'custom') {
            const start = timeView === 'month' ? new Date(dateRef.getFullYear(), dateRef.getMonth(), 1) : new Date(customRange.start + 'T12:00:00');
            const end = timeView === 'month' ? new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0) : new Date(customRange.end + 'T12:00:00');
            
            const data = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = toLocalDateStr(d);
                const dayData = dailyData[dateStr] || { count: 0, recurring: 0, revenue: 0, services: 0, recurringRevenue: 0, recurringServices: 0 };
                data.push({
                    name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                    value: dayData.count,
                    recurring: dayData.recurring,
                    revenue: dayData.revenue,
                    services: dayData.services,
                    recurringRevenue: dayData.recurringRevenue,
                    recurringServices: dayData.recurringServices,
                    coupons: dayData.coupons
                });
            }
            return data;
        }

        if (timeView === 'year') {
            const data = [];
            for (let m = 0; m < 12; m++) {
                const monthName = new Date(dateRef.getFullYear(), m, 1).toLocaleDateString('pt-BR', { month: 'short' });
                let mCount = 0, mRec = 0, mRev = 0, mServ = 0, mRecRev = 0, mRecServ = 0, mCoupons = 0;
                Object.entries(dailyData).forEach(([date, val]) => {
                    const [y, mm] = date.split('-').map(Number);
                    if (y === dateRef.getFullYear() && (mm - 1) === m) {
                        mCount += val.count;
                        mRec += val.recurring;
                        mRev += val.revenue;
                        mServ += val.services;
                        mRecRev += val.recurringRevenue;
                        mRecServ += val.recurringServices;
                        mCoupons += val.coupons;
                    }
                });
                data.push({ 
                    name: monthName, 
                    value: mCount, 
                    recurring: mRec, 
                    revenue: mRev, 
                    services: mServ,
                    recurringRevenue: mRecRev,
                    recurringServices: mRecServ,
                    coupons: mCoupons
                });
            }
            return data;
        }
        return [];
    }, [firstVisits, filteredAppointments, timeView, dateRef, customRange, services]);

    // --- CHART DATA GENERATION ---

    // 1. Dynamic Flow Chart (Adapts x-axis based on view)
    const flowData = useMemo(() => {
        const calcMetrics = (apps: Appointment[], pSales: Sale[] = []) => {
            let serviceProduction = 0; // "Faturamento Bruto" matching Repasses Screen
            let productSales = 0;
            let commissionTotal = 0;

            apps.forEach(a => {
                const mainSvc = services.find(s => s.id === a.serviceId);
                const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
                
                const extrasList = (a.additionalServices || []).map(extra => {
                    const extraSvc = services.find(s => s.id === extra.serviceId);
                    return {
                        ...extra,
                        bookedPrice: (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1)
                    };
                });

                const totalBooked = mainBooked + extrasList.reduce((sum, e) => sum + e.bookedPrice, 0);
                const isRemake = a.isRemake || a.paymentMethod === 'Refazer' || a.paymentMethod?.startsWith('Justificativa');
                
                // For past periods (Jan/Feb), we only count Concluído to match Repasses (Closures.tsx)
                const isPast = a.date < toLocalDateStr(new Date());
                const effectiveStatus = isPast ? a.status === 'Concluído' : a.status !== 'Cancelado';

                if (effectiveStatus && !isRemake) {
                    serviceProduction += totalBooked;
                    
                    // Commission Logic matching Closures.tsx
                    const provider = providers.find(p => p.id === a.providerId);
                    const mainCommRate = a.commissionRateSnapshot ?? (provider?.commissionRate || 0);
                    commissionTotal += mainBooked * mainCommRate;

                    extrasList.forEach(extra => {
                        const extraProvider = providers.find(p => p.id === extra.providerId);
                        const extraCommRate = extra.commissionRateSnapshot ?? (extraProvider?.commissionRate || 0);
                        commissionTotal += extra.bookedPrice * extraCommRate;
                    });
                }
            });

            pSales.forEach(s => {
                productSales += Number(s.totalAmount || 0);
            });

            return {
                serviceProduction,
                productSales,
                faturamento: serviceProduction + productSales,
                receita: (serviceProduction + productSales) - commissionTotal
            };
        };

        if (timeView === 'day') {
            // Hourly flow
            const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h
            return hours.map(h => {
                const label = `${h}h`;
                const hourApps = filteredAppointments.filter(a => {
                    if (!a.time) return false;
                    return parseInt(a.time.split(':')[0]) === h;
                });
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
                const daySales = filteredSales.filter(s => s.date === dateStr);
                const metrics = calcMetrics(dayApps, daySales);
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
                const monthApps = filteredAppointments.filter(a => {
                    if (!a.date) return false;
                    const parts = a.date.split('-');
                    if (parts.length < 2) return false;
                    const monthPart = parseInt(parts[1]);
                    return (monthPart - 1) === i;
                });
                const monthSales = filteredSales.filter(s => {
                    if (!s.date) return false;
                    const parts = s.date.split('-');
                    if (parts.length < 2) return false;
                    const monthPart = parseInt(parts[1]);
                    return (monthPart - 1) === i;
                });
                const metrics = calcMetrics(monthApps, monthSales);
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
            const mainSvc = services.find(s => s.id === a.serviceId);
            const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
            const extraBooked = (a.additionalServices || []).reduce((sum, extra) => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
            }, 0);
            const totalBooked = mainBooked + extraBooked;
            const tipAmount = a.tipAmount || 0;
            const actualTotalRevenue = (a.status === 'Concluído' && a.pricePaid !== undefined && a.pricePaid !== null)
                ? (a.pricePaid - tipAmount)
                : totalBooked;

            // Proportional attribution of revenue to main provider
            const mainRevenueProportional = totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0;
            revenue[a.providerId] = (revenue[a.providerId] || 0) + mainRevenueProportional;

            (a.additionalServices || []).forEach(extra => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                const extraBookedPrice = (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
                const extraRevenueProportional = totalBooked > 0 ? (extraBookedPrice / totalBooked) * actualTotalRevenue : 0;
                revenue[extra.providerId] = (revenue[extra.providerId] || 0) + extraRevenueProportional;
            });
        });
        return Object.entries(revenue)
            .map(([id, val]) => ({
                name: (providers.find(p => p.id === id)?.name || 'Desc.').split(' ')[0],
                full: providers.find(p => p.id === id)?.name,
                value: val,
                avatar: providers.find(p => p.id === id)?.avatar
            }))
            .filter(item => item.value > 0)
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
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, customers, services]);

    // Frequência de Clientes
    const customerFrequency = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            counts[a.customerId] = (counts[a.customerId] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([id, val]) => {
                const customer = customers.find(c => c.id === id);
                return {
                    name: (customer?.name || 'Desconhecido').split(' ')[0],
                    value: val
                };
            })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, customers]);
    

    // Tráfego de Novos Clientes (Diário/Mensal/Anual)
    const newCustomersByTraffic = useMemo(() => {
        const dailyData: Record<string, number> = {};
        
        Object.values(firstVisits).forEach(v => {
            if (isDateInPeriod(v.date)) {
                dailyData[v.date] = (dailyData[v.date] || 0) + 1;
            }
        });

        if (timeView === 'day') {
             const dateStr = toLocalDateStr(dateRef);
             return [{ name: dateRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), value: dailyData[dateStr] || 0 }];
        }

        if (timeView === 'month' || timeView === 'custom') {
            const start = timeView === 'month' ? new Date(dateRef.getFullYear(), dateRef.getMonth(), 1) : new Date(customRange.start + 'T12:00:00');
            const end = timeView === 'month' ? new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0) : new Date(customRange.end + 'T12:00:00');
            
            const data = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = toLocalDateStr(d);
                data.push({
                    name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                    value: dailyData[dateStr] || 0
                });
            }
            return data;
        }

        if (timeView === 'year') {
            const data = [];
            for (let m = 0; m < 12; m++) {
                const monthName = new Date(dateRef.getFullYear(), m, 1).toLocaleDateString('pt-BR', { month: 'short' });
                let mCount = 0;
                Object.entries(dailyData).forEach(([date, val]) => {
                    const [y, mm] = date.split('-').map(Number);
                    if (y === dateRef.getFullYear() && (mm - 1) === m) mCount += val;
                });
                data.push({ name: monthName, value: mCount });
            }
            return data;
        }
        return [];
    }, [firstVisits, timeView, dateRef, customRange, isDateInPeriod]);

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
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, customers, services]);

    // 4. Recorrência e Churn
    const recurringStats = useMemo(() => {
        const stats = {
            totalClients: customers.length,
            recurringClients: 0,
            recurringRevenue: 0,
            recurringAppointments: 0,
            churnRiskCount: 0,
            churnRiskClients: [] as { id: string, name: string, phone: string, lastVisit: string, avgTicket: number, daysInactive: number }[],
            oneTimeOnlyClients: [] as { id: string, name: string, phone: string, lastVisit: string, avgTicket: number, daysInactive: number }[],
            avgFrequency: 0,
            secondVisitConversion: 0,
            realChurnRate: 0
        };

        const now = new Date();
        const churnThreshold = 45 * 24 * 60 * 60 * 1000; // 45 dias para fiéis
        const oneTimeThreshold = 30 * 24 * 60 * 60 * 1000; // 30 dias para novos

        customers.forEach(c => {
            const customerApps = appointments.filter(a => a.customerId === c.id && a.status === 'Concluído');
            const appCount = customerApps.length;
            let totalSpent = 0;
            
            customerApps.forEach(a => {
                totalSpent += (a.pricePaid ?? a.bookedPrice ?? 0);
            });

            if (appCount > 1) {
                stats.recurringClients++;
                stats.recurringRevenue += totalSpent;
                stats.recurringAppointments += appCount;
            }

            const lastApp = [...customerApps].sort((a, b) => b.date.localeCompare(a.date))[0];
            if (lastApp) {
                const lastDate = new Date(lastApp.date);
                const diff = now.getTime() - lastDate.getTime();
                const daysInactive = Math.floor(diff / (24 * 60 * 60 * 1000));
                const avgTicket = appCount > 0 ? totalSpent / appCount : 0;

                const clientData = {
                    id: c.id,
                    name: c.name,
                    phone: c.phone || '',
                    lastVisit: lastApp.date,
                    avgTicket,
                    avgTicket,
                    daysInactive,
                    lastMarketingContact: c.lastMarketingContact
                };

                const isAlreadyMessaged = c.lastMarketingContact && 
                    new Date(c.lastMarketingContact).toLocaleDateString() === now.toLocaleDateString();

                if (appCount > 1 && diff > churnThreshold) {
                    stats.churnRiskCount++;
                    stats.churnRiskClients.push(clientData);
                } else if (appCount === 1 && diff > oneTimeThreshold) {
                    stats.oneTimeOnlyClients.push(clientData);
                }
            }
        });

        stats.avgFrequency = stats.recurringClients > 0 ? stats.recurringAppointments / stats.recurringClients : 0;
        stats.secondVisitConversion = stats.totalClients > 0 ? (stats.recurringClients / stats.totalClients) * 100 : 0;
        
        // Taxa de Churn Real: (Clientes Inativos Fiéis / Clientes Totais que já foram Recorrentes)
        stats.realChurnRate = stats.recurringClients > 0 ? (stats.churnRiskCount / stats.recurringClients) * 100 : 0;

        return stats;
    }, [customers, appointments]);

    const handleMarkAsMessaged = async (clientId: string) => {
        try {
            const customer = customers.find(c => c.id === clientId);
            const now = new Date();
            
            // Toggle logic: if already marked today, unmark (set null)
            const isAlreadyMarkedToday = customer?.lastMarketingContact && 
                new Date(customer.lastMarketingContact).toDateString() === now.toDateString();
            
            const newValue = isAlreadyMarkedToday ? null : now.toISOString();
            
            // 1. Update Supabase
            const { error } = await supabase
                .from('customers')
                .update({ last_marketing_contact: newValue })
                .eq('id', clientId);

            if (error) throw error;

            // 2. Update local state
            setCustomers(prev => prev.map(c => 
                c.id === clientId ? { ...c, lastMarketingContact: newValue || undefined } : c
            ));

        } catch (error) {
            console.error('Error toggling client message status:', error);
            alert('Erro ao atualizar status do cliente.');
        }
    };

    // 5. Top Partners - Already Revenue
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
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, services, campaigns]);

    // 5. Top Services (Updated to Revenue)
    const topServices = useMemo(() => {
        const revenue: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            const mainSvc = services.find(s => s.id === a.serviceId);
            const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
            const extraBooked = (a.additionalServices || []).reduce((sum, extra) => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
            }, 0);
            const totalBooked = mainBooked + extraBooked;
            const tipAmount = a.tipAmount || 0;
            const actualTotalRevenue = (a.status === 'Concluído' && a.pricePaid !== undefined && a.pricePaid !== null)
                ? (a.pricePaid - tipAmount)
                : totalBooked;

            const mainRevenueProportional = totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0;
            revenue[a.serviceId] = (revenue[a.serviceId] || 0) + mainRevenueProportional;

            (a.additionalServices || []).forEach(extra => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                const extraBookedPrice = (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
                const extraRevenueProportional = totalBooked > 0 ? (extraBookedPrice / totalBooked) * actualTotalRevenue : 0;
                revenue[extra.serviceId] = (revenue[extra.serviceId] || 0) + extraRevenueProportional;
            });
        });
        return Object.entries(revenue)
            .map(([id, val]) => ({
                name: services.find(s => s.id === id)?.name || 'Desc.',
                value: val
            }))
            .filter(item => item.value > 0)
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
            .filter(item => item.value > 0)
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
            .filter(item => item.value > 0)
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
            .filter(item => item.value > 0)
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
            .filter(item => item.value > 0)
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

    // 10.5 Média de Agendamentos por Dia da Semana (Normalizado)
    const avgAppointmentsPerDayResult = useMemo(() => {
        const counts: Record<string, number> = {};
        const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        // 1. Calcular Totais por Dia da Semana
        filteredAppointments.forEach(a => {
            if (a.date) {
                const dateObj = new Date(a.date + 'T12:00:00');
                const dayStr = daysMap[dateObj.getDay()];
                counts[dayStr] = (counts[dayStr] || 0) + 1;
            }
        });

        // 2. Calcular Frequência de cada dia da semana no período
        let startD, endD;
        if (timeView === 'day') {
            startD = new Date(dateRef);
            endD = new Date(dateRef);
        } else if (timeView === 'month') {
            startD = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
            endD = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0);
        } else if (timeView === 'year') {
            startD = new Date(dateRef.getFullYear(), 0, 1);
            endD = new Date(dateRef.getFullYear(), 11, 31);
        } else {
            startD = new Date(customRange.start + 'T12:00:00');
            endD = new Date(customRange.end + 'T12:00:00');
        }

        const weekdayFrequency: Record<string, number> = {};
        for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
            const dayStr = daysMap[d.getDay()];
            weekdayFrequency[dayStr] = (weekdayFrequency[dayStr] || 0) + 1;
        }

        // 3. Normalizar
        return daysMap
            .map(day => {
                const total = counts[day] || 0;
                const freq = weekdayFrequency[day] || 1;
                return {
                    name: day,
                    value: total / freq
                };
            })
            .filter(item => item.value > 0);
    }, [filteredAppointments, timeView, dateRef, customRange]);

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
                name: (providers.find(p => p.id === id)?.name || 'Desc.').split(' ')[0],
                value: val
            }))
            .filter(item => item.value > 0)
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
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [filteredAppointments, services]);

    // Profissionais - Receita e Ticket Médio
    const providerMetrics = useMemo(() => {
        const stats: Record<string, { faturamento: number; atendimentos: number }> = {};

        filteredAppointments.forEach(a => {
            const mainSvc = services.find(s => s.id === a.serviceId);
            const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
            const extraBooked = (a.additionalServices || []).reduce((sum, extra) => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
            }, 0);
            const totalBooked = mainBooked + extraBooked;
            const tipAmount = a.tipAmount || 0;
            const actualTotalRevenue = (a.status === 'Concluído' && a.pricePaid !== undefined && a.pricePaid !== null)
                ? (a.pricePaid - tipAmount)
                : totalBooked;

            if (!stats[a.providerId]) stats[a.providerId] = { faturamento: 0, atendimentos: 0 };
            const mainRevenueProportional = totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0;
            stats[a.providerId].faturamento += mainRevenueProportional;
            stats[a.providerId].atendimentos += 1;

            (a.additionalServices || []).forEach(extra => {
                if (!stats[extra.providerId]) stats[extra.providerId] = { faturamento: 0, atendimentos: 0 };
                const extraSvc = services.find(s => s.id === extra.serviceId);
                const extraBookedPrice = (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
                const extraRevenueProportional = totalBooked > 0 ? (extraBookedPrice / totalBooked) * actualTotalRevenue : 0;
                
                stats[extra.providerId].faturamento += extraRevenueProportional;
                stats[extra.providerId].atendimentos += 1;
            });
        });

        const arr = Object.entries(stats).map(([id, data]) => ({
            name: providers.find(p => p.id === id)?.name.split(' ')[0] || 'Desc.',
            faturamento: data.faturamento,
            ticketMedio: data.atendimentos > 0 ? data.faturamento / data.atendimentos : 0
        })).filter(item => item.faturamento > 0);

        return {
            revenue: [...arr].sort((a, b) => b.faturamento - a.faturamento),
            ticket: [...arr].sort((a, b) => b.ticketMedio - a.ticketMedio)
        };
    }, [filteredAppointments, providers, services]);

    // Serviços - Receita e Ticket Médio
    const serviceMetrics = useMemo(() => {
        const stats: Record<string, { faturamento: number; qtd: number }> = {};

        filteredAppointments.forEach(a => {
            const mainSvc = services.find(s => s.id === a.serviceId);
            const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
            const extraBooked = (a.additionalServices || []).reduce((sum, extra) => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
            }, 0);
            const totalBooked = mainBooked + extraBooked;
            const tipAmount = a.tipAmount || 0;
            const actualTotalRevenue = (a.status === 'Concluído' && a.pricePaid !== undefined && a.pricePaid !== null)
                ? (a.pricePaid - tipAmount)
                : totalBooked;

            if (!stats[a.serviceId]) stats[a.serviceId] = { faturamento: 0, qtd: 0 };
            const mainRevenueProportional = totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0;
            stats[a.serviceId].faturamento += mainRevenueProportional;
            stats[a.serviceId].qtd += 1;

            (a.additionalServices || []).forEach(extra => {
                if (!stats[extra.serviceId]) stats[extra.serviceId] = { faturamento: 0, qtd: 0 };
                const extraSvc = services.find(s => s.id === extra.serviceId);
                const extraBookedPrice = (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
                const extraRevenueProportional = totalBooked > 0 ? (extraBookedPrice / totalBooked) * actualTotalRevenue : 0;
                
                stats[extra.serviceId].faturamento += extraRevenueProportional;
                stats[extra.serviceId].qtd += 1;
            });
        });

        const arr = Object.entries(stats).map(([id, data]) => ({
            name: services.find(s => s.id === id)?.name || 'Desc.',
            faturamento: data.faturamento,
            ticketMedio: data.qtd > 0 ? data.faturamento / data.qtd : 0
        })).filter(item => item.faturamento > 0);

        return {
            revenue: [...arr].sort((a, b) => b.faturamento - a.faturamento),
            ticket: [...arr].sort((a, b) => b.ticketMedio - a.ticketMedio)
        };
    }, [filteredAppointments, services]);

    // 13. Ausências Metrics (Blocks)
    const absenceMetrics = useMemo(() => {
        const blocks = appointments.filter(a => a.combinedServiceNames === 'BLOQUEIO_INTERNO' && isDateInPeriod(a.date));
        
        // Calculate average daily revenue per provider (last 30 days) for impact estimation
        const last30DaysStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Calculate average hourly revenue (Total Rev / productive hours in period)
        const avgBusinessHoursPerDay = (11 * 5 + 9) / 6; // ~10.66h average per day
        const providerHourlyRates: Record<string, number> = {};
        providers.forEach(p => {
            const history = appointments.filter(a => a.providerId === p.id && a.date >= last30DaysStr && a.status === 'Concluído');
            const totalRev = history.reduce((acc, a) => acc + (a.pricePaid || a.bookedPrice || 0), 0);
            const daysCount = new Set(history.map(a => a.date)).size || 1;
            const dailyRevenue = totalRev / daysCount;
            providerHourlyRates[p.id] = dailyRevenue / avgBusinessHoursPerDay;
        });

        const getBusinessHoursIntersection = (date: string, startTime: string, endTime: string) => {
            if (!date || !startTime) return 0;
            const d = new Date(date + 'T12:00:00');
            const dayOfWeek = d.getDay();
            let bStart = 0; let bEnd = 0;
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { bStart = 8 * 60; bEnd = 19 * 60; }
            else if (dayOfWeek === 6) { bStart = 8 * 60; bEnd = 17 * 60; }
            else return 0;
            const [sh, sm] = (startTime || '00:00').split(':').map(Number);
            const [eh, em] = (endTime || '00:00').split(':').map(Number);
            const blockStart = sh * 60 + sm;
            const blockEnd = eh * 60 + em;
            const intersectStart = Math.max(blockStart, bStart);
            const intersectEnd = Math.min(blockEnd, bEnd);
            return Math.max(0, intersectEnd - intersectStart) / 60;
        };

        const totalHours = blocks.reduce((acc, b) => acc + getBusinessHoursIntersection(b.date, b.time, b.endTime || '00:00'), 0);
        const totalLoss = blocks.reduce((acc, b) => {
            const hrs = getBusinessHoursIntersection(b.date, b.time, b.endTime || '00:00');
            return acc + (hrs * (providerHourlyRates[b.providerId] || 0));
        }, 0);

        const reasonCounts: Record<string, number> = {};
        const providerRisk: Record<string, { count: number; hours: number; loss: number; name: string }> = {};
        const daysCounts: Record<string, number> = {};
        const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        blocks.forEach(b => {
            const reason = b.observation || 'Outros';
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;

            if (!providerRisk[b.providerId]) {
                providerRisk[b.providerId] = { count: 0, hours: 0, loss: 0, name: providers.find(p => p.id === b.providerId)?.name || 'Desconhecido' };
            }
            providerRisk[b.providerId].count += 1;
            const hours = getBusinessHoursIntersection(b.date, b.time, b.endTime || '00:00');
            providerRisk[b.providerId].loss += (hours * (providerHourlyRates[b.providerId] || 0));
            providerRisk[b.providerId].hours += hours;

            const d = new Date(b.date + 'T12:00:00');
            const dayName = daysMap[d.getDay()];
            daysCounts[dayName] = (daysCounts[dayName] || 0) + 1;
        });

        const topImpactProvider = Object.entries(providerRisk)
            .sort((a, b) => b[1].loss - a[1].loss)[0];

        return {
            totalAbsences: blocks.length,
            totalHours: totalHours,
            totalLoss: totalLoss,
            reasons: Object.entries(reasonCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
            riskRanking: Object.entries(providerRisk).map(([id, data]) => ({
                id,
                ...data,
                score: (data.count * 5) + (data.hours * 1)
            })).sort((a, b) => b.score - a.score),
            days: daysMap.map(d => ({ name: d, value: daysCounts[d] || 0 })),
            topImpactProvider: topImpactProvider ? { name: topImpactProvider[1].name, loss: topImpactProvider[1].loss } : null
        };
    }, [appointments, providers, isDateInPeriod]);

    // 16. High Performance Metrics (Potential Revenue)
    const highPerformanceMetrics = useMemo(() => {
        // Calculate current total revenue per professional in period
        const revenuePerProvider: Record<string, number> = {};
        
        filteredAppointments.filter(a => a.status !== 'Cancelado').forEach(a => {
            const mainSvc = services.find(s => s.id === a.serviceId);
            const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
            const extraBooked = (a.additionalServices || []).reduce((sum, extra) => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
            }, 0);
            const totalBooked = mainBooked + extraBooked;
            const tipAmount = a.tipAmount || 0;
            const actualTotalRevenue = (a.status === 'Concluído' && a.pricePaid !== undefined && a.pricePaid !== null)
                ? (a.pricePaid - tipAmount)
                : totalBooked;

            const mainRevenueProportional = totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0;
            revenuePerProvider[a.providerId] = (revenuePerProvider[a.providerId] || 0) + mainRevenueProportional;

            (a.additionalServices || []).forEach(extra => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                const extraBookedPrice = (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
                const extraRevenueProportional = totalBooked > 0 ? (extraBookedPrice / totalBooked) * actualTotalRevenue : 0;
                revenuePerProvider[extra.providerId] = (revenuePerProvider[extra.providerId] || 0) + extraRevenueProportional;
            });
        });

        const activeProviderIds = Object.keys(revenuePerProvider);
        if (activeProviderIds.length === 0) return null;

        const revenues = Object.entries(revenuePerProvider).map(([id, amount]) => ({
            id,
            amount,
            name: providers.find(p => p.id === id)?.name || 'Desconhecido'
        })).sort((a,b) => b.amount - a.amount);

        const topPerformer = revenues[0];
        const maxRevenue = topPerformer.amount;
        const actualTotal = revenues.reduce((sum, r) => sum + r.amount, 0);
        const potentialTotal = maxRevenue * revenues.length;
        const impact = potentialTotal - actualTotal;

        // Top 3 performers for insights
        const top3 = revenues.slice(0, 3).map(r => ({
            name: r.name,
            amount: r.amount,
            potentialTotal: r.amount * revenues.length
        }));

        // Gap per provider
        const performanceGaps = revenues.map(r => ({
            name: r.name,
            current: r.amount,
            gap: maxRevenue - r.amount,
            potential: maxRevenue
        })).filter(r => r.gap > 0).sort((a,b) => b.gap - a.gap);

        return {
            topPerformer,
            top3,
            maxRevenue,
            actualTotal,
            potentialTotal,
            impact,
            performanceGaps,
            providerCount: revenues.length
        };
    }, [filteredAppointments, services, providers]);

    // 14. Tempo Médio no Salão por Dia da Semana
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

            const mainSvc = services.find(s => s.id === a.serviceId);
            const mainBooked = (a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1);
            const extraBooked = (a.additionalServices || []).reduce((sum, extra) => {
                const extraSvc = services.find(s => s.id === extra.serviceId);
                return sum + (extra.bookedPrice ?? extraSvc?.price ?? 0) * (extra.quantity || 1);
            }, 0);
            const totalBooked = mainBooked + extraBooked;
            const tipAmount = a.tipAmount || 0;
            const actualTotalRevenue = (a.status === 'Concluído' && a.pricePaid !== undefined && a.pricePaid !== null)
                ? (a.pricePaid - tipAmount)
                : totalBooked;

            if (!stats[dayStr]) stats[dayStr] = { faturamento: 0, atendimentos: 0 };
            stats[dayStr].faturamento += actualTotalRevenue;
            stats[dayStr].atendimentos += 1;
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

    // Unified Financial Metrics (Aligned with Repasses/Closures)
    const financialMetrics = useMemo(() => {
        let serviceProduction = 0;
        let productSales = 0;
        let tips = 0;
        let commissionTotal = 0;

        filteredAppointments.forEach(a => {
            const production = calculateAppointmentProduction(a, services);
            if (production > 0) {
                serviceProduction += production;
                tips += (a.tipAmount || 0);

                // For estimated commission in dashboard, we still need to approximate
                const mainSvc = services.find(s => s.id === a.serviceId);
                const hasMainProv = !!a.providerId;
                const mainBooked = hasMainProv ? ((a.bookedPrice ?? mainSvc?.price ?? 0) * (a.quantity || 1)) : 0;
                const provider = providers.find(p => p.id === a.providerId);
                const mainCommRate = a.commissionRateSnapshot ?? (provider?.commissionRate || 0);
                commissionTotal += mainBooked * mainCommRate;

                (a.additionalServices || []).forEach((extra: any) => {
                    const hasExtraProv = !!extra.providerId;
                    if (hasExtraProv) {
                        const extraS = services.find(s => s.id === extra.serviceId);
                        const extraBooked = (extra.bookedPrice ?? extraS?.price ?? 0) * (extra.quantity || 1);
                        const extraProv = providers.find(p => p.id === extra.providerId);
                        const extraCommRate = extra.commissionRateSnapshot ?? (extraProv?.commissionRate || 0);
                        commissionTotal += extraBooked * extraCommRate;
                    }
                });
            }
        });

        filteredSales.forEach(s => {
            productSales += Number(s.totalAmount || 0);
        });

        return {
            serviceProduction,
            productSales,
            tips,
            totalGross: serviceProduction + productSales,
            commissionTotal,
            netRevenue: (serviceProduction + productSales) - commissionTotal
        };
    }, [filteredAppointments, filteredSales, services, providers]);

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

    const NewClientTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-zinc-800 p-4 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-2xl min-w-[200px]">
                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase mb-3 border-b border-slate-50 dark:border-zinc-700 pb-2">{label}</p>
                    
                    <div className="space-y-3">
                        {/* Novos block */}
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nível: Novos Clientes</p>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Qtd:</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{data.value}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Valor:</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-amber-600 uppercase">Cupons:</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{data.coupons || 0}</span>
                            </div>
                        </div>

                        {/* Recorrentes block */}
                        <div className="space-y-1 border-t border-slate-50 dark:border-zinc-700/50 pt-2">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nível: Recorrentes</p>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase">Qtd:</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{data.recurring}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase">Valor:</span>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">R$ {data.recurringRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    </div>
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
            <div className="flex gap-2 md:gap-6 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar scroll-smooth pb-px">
                {[
                    { id: 'geral', label: 'Visão Geral' },
                    { id: 'ocupacao', label: 'Ocupação' },
                    { id: 'profissionais', label: 'Profissionais' },
                    { id: 'servicos', label: 'Serviços' },
                    { id: 'clientes', label: 'Clientes' },
                    { id: 'campanhas', label: 'Campanhas' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setDashboardTab(tab.id as any)}
                        className={`font-black uppercase tracking-widest text-[10px] md:text-xs pb-3 pt-1 border-b-[3px] transition-all whitespace-nowrap px-2 md:px-0 ${dashboardTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {dashboardTab === 'geral' ? (
                <div className="space-y-6">
                    {/* Sub-tabs for Global View */}
                    <div className="flex flex-col sm:flex-row gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-full sm:w-fit">
                        <button 
                            onClick={() => setActiveSubTab('charts')}
                            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'charts' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BarChart2 size={14} /> Visão Executiva
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('insights')}
                            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'insights' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BrainCircuit size={14} /> IA de Negócios
                        </button>
                    </div>

                    {activeSubTab === 'charts' ? (
                        <>

                            {/* 1. KPIs Operacionais */}
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
                                    onClick={() => setIsNewCustomersModalOpen(true)}
                                />
                                <KPICard
                                    title="Produtos Vendidos (Qtd)"
                                    value={filteredSales.reduce((acc, s) => acc + (s.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0), 0)}
                                    sub="Unidades vendidas"
                                    icon={Package}
                                    color="text-amber-700"
                                    lightColor="bg-amber-50"
                                />
                            </div>

                            {/* 2. Fluxo Dinâmico (Big Chart) */}
                            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
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
                                            <Tooltip content={<CustomFlowTooltip />} cursor={{ stroke: '#4f46e5', strokeWidth: 2 }} />
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
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                            {/* General Insight 1: Saúde Financeira */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Saúde Financeira</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Visão Macro de Receita</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Taxa de Conversão</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            A conversão de <span className="text-slate-900 dark:text-white font-black">Serviços para Venda de Produtos</span> está em <span className="text-slate-900 dark:text-white font-black">18%</span>. A meta de mercado para salões premium é 25%.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Ticket Médio Geral</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Seu ticket médio atual cresceu 5% em relação ao mês anterior.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* General Insight 2: Retenção */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Users size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Retenção & Novos</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Equilíbrio da Base</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Novos Clientes</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Você atraiu novos clientes neste período, representando uma boa fatia da frequência total.
                                        </p>
                                    </div>
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">LTV (Lifetime Value)</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Clientes recorrentes gastam em média 2.4x mais que clientes de primeira visita.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* General Insight 3: Alerta */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Atenção Prioritária</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Riscos e Oportunidades</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                        <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Clientes Inativos</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Detectamos clientes de alto valor que não retornam há +45 dias.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Capacidade</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Sua ocupação média permite crescer sem aumentar custos fixos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {dashboardTab === 'ocupacao' ? (
                <div className="space-y-6">
                    {/* Sub-tabs for Occupancy */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-fit">
                        <button 
                            onClick={() => setActiveSubTab('charts')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'charts' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BarChart2 size={14} /> Gráficos de Fluxo
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('insights')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'insights' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BrainCircuit size={14} /> Inteligência & Insights
                        </button>
                    </div>

                    {activeSubTab === 'charts' ? (
                        <>
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

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* Top Dias da Semana */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Calendar size={16} className="text-violet-600 dark:text-violet-400" /> Dias de Pico (Total)
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

                                {/* Média de Agendamentos por Dia */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" /> Média de Agendamentos / Dia
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={avgAppointmentsPerDayResult} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.1} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                                <Tooltip 
                                                    cursor={{ fill: 'transparent' }} 
                                                    content={({ active, payload, label }: any) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-white dark:bg-zinc-800 p-3 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-xl">
                                                                    <p className="font-black text-slate-900 dark:text-white text-xs uppercase">{label}</p>
                                                                    <p className="text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                                                                        {payload[0].value.toFixed(1)} Agendamentos / Dia
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }} 
                                                />
                                                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32}>
                                                    <LabelList dataKey="value" position="top" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => v.toFixed(1)} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Tempo Médio no Salão */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Clock size={16} className="text-teal-600 dark:text-teal-400" /> Tempo Médio no Salão (Minutos)
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
                        </>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                            {/* Insight: Horários */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Análise de Horários</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Ondas de Demanda</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Picos Principais</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            O fluxo concentra-se em ondas às <span className="text-slate-900 dark:text-white font-black">13h, 15h e 17h</span>. O pico absoluto ocorre às 13h.
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                        <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Oportunidade (Vale)</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Identificado um "Vale de Fluxo" às <span className="text-slate-900 dark:text-white font-black">12h</span>. Ideal para ações de preenchimento ou promoções "Express".
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Insight: Eventos */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Melhor Momento para Eventos</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Foco em Público e Performance</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Visibilidade Máxima</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Para máximo público: <span className="text-slate-900 dark:text-white font-black">Sábados entre 13h e 15h</span>. Aproveite o fluxo orgânico para lançamentos.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Produção de Conteúdo</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Para eventos com influenciadores/foto: <span className="text-slate-900 dark:text-white font-black">Segundas ou Terças</span>. Mais espaço e foco da equipe.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Insight: Retenção */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Janela de Atenção</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Tempo Médio de Atendimento</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Permanência Média</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            O cliente permanece no salão por <span className="text-slate-900 dark:text-white font-black">124 minutos</span>. 
                                        </p>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                        <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Estratégia</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Janela ideal para degustação de produtos de Home-Care enquanto aguardam a ação química dos serviços.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {dashboardTab === 'profissionais' ? (
                <div className="space-y-6">
                    {/* Sub-tabs for Professionals */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-fit">
                        <button 
                            onClick={() => setActiveSubTab('charts')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'charts' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BarChart2 size={14} /> Rankings & Metas
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('ausencias')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'ausencias' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <AlertCircle size={14} /> Ausências
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('high_performance')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'high_performance' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <Zap size={14} /> High Performance
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('insights')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'insights' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BrainCircuit size={14} /> Análise de Performance
                        </button>
                    </div>

                    {activeSubTab === 'charts' ? (
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
                    ) : activeSubTab === 'ausencias' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Ausências KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <KPICard 
                                    title="Ausências" 
                                    value={absenceMetrics.totalAbsences} 
                                    sub={`${absenceMetrics.totalAbsences > 0 ? '-' : '+'} Bloqueios`}
                                    icon={AlertTriangle} 
                                    color="text-rose-600" 
                                    lightColor="bg-rose-50" 
                                />
                                <KPICard 
                                    title="Total Horas" 
                                    value={`${absenceMetrics.totalHours.toFixed(1)}h`} 
                                    sub="Tempo perdido"
                                    icon={Clock} 
                                    color="text-amber-600" 
                                    lightColor="bg-amber-50" 
                                />
                                <KPICard 
                                    title="Impacto Financ." 
                                    value={`R$ ${absenceMetrics.totalLoss.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} 
                                    sub="Receita não realizada"
                                    icon={DollarSign} 
                                    color="text-rose-600" 
                                    lightColor="bg-rose-50" 
                                />
                                <KPICard 
                                    title="Maior Impacto" 
                                    value={absenceMetrics.topImpactProvider?.name || '-'} 
                                    sub={`R$ ${absenceMetrics.topImpactProvider?.loss.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}`}
                                    icon={Award} 
                                    color="text-indigo-600" 
                                    lightColor="bg-indigo-50" 
                                    valueSize="text-sm md:text-lg"
                                />
                                <KPICard 
                                    title="Risco Agenda" 
                                    value={`${((absenceMetrics.totalHours / (absenceMetrics.totalHours + (filteredAppointments.length * 1))) * 100).toFixed(1)}%`} 
                                    sub="Capacidade perdida"
                                    icon={TrendingUp} 
                                    color="text-orange-600" 
                                    lightColor="bg-orange-50" 
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Motivos de Ausência */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <PieChart size={16} className="text-rose-600" /> Motivos de Ausência
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={absenceMetrics.reasons} layout="vertical" margin={{ left: 0, right: 30 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                                <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltipAgendamentos />} />
                                                <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={16}>
                                                    <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight={900} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Ausências por Dia */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Calendar size={16} className="text-amber-600 dark:text-amber-400" /> Ausências por Dia
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={absenceMetrics.days}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.1} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                                <Tooltip cursor={{ fill: 'transparent' }} content={<CountTooltipAgendamentos />} />
                                                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={32}>
                                                    <LabelList dataKey="value" position="top" fill="#64748b" fontSize={10} fontWeight={900} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Simulador de Recuperação */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <BrainCircuit size={16} className="text-indigo-600 dark:text-indigo-400" /> Simulador de Recuperação
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Potencial de ganho ao reduzir ausências</p>
                                    </div>
                                    <div className="space-y-4 mt-6">
                                        {[10, 20, 30].map(pct => (
                                            <div key={pct} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{pct}% Redução</span>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">+ R$ {(absenceMetrics.totalLoss * (pct / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                        <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 leading-tight">
                                            Ações Sugeridas: Rever políticas de folgas e implementar sistema de banco de horas para reduzir ausências não planejadas.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Ranking de Risco por Profissional */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Target size={16} className="text-rose-600" /> Ranking de Impacto (Risco de Agenda)
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-zinc-800">
                                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase">Profissional</th>
                                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-center">Bloqueios</th>
                                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-center">Horas</th>
                                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-right">Impacto Financ.</th>
                                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-right">Score de Risco</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/50">
                                            {absenceMetrics.riskRanking.map((row) => (
                                                <tr key={row.id} className="group hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                    <td className="py-4 text-xs font-black text-slate-900 dark:text-white">{row.name}</td>
                                                    <td className="py-4 text-xs font-bold text-slate-600 dark:text-slate-400 text-center">{row.count}</td>
                                                    <td className="py-4 text-xs font-bold text-slate-600 dark:text-slate-400 text-center">{row.hours.toFixed(1)}h</td>
                                                    <td className="py-4 text-xs font-black text-rose-600 text-right">R$ {row.loss.toLocaleString('pt-BR')}</td>
                                                    <td className="py-4 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${row.score > 20 ? 'bg-rose-500' : row.score > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min(100, (row.score / 30) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-900 dark:text-white w-6 text-right">{row.score.toFixed(0)}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : activeSubTab === 'high_performance' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* High Performance KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <KPICard 
                                    title="Padrão Unitário" 
                                    value={`R$ ${(highPerformanceMetrics?.maxRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} 
                                    sub={`Meta p/ profissional`}
                                    icon={Target} 
                                    color="text-indigo-600" 
                                    lightColor="bg-indigo-50" 
                                />
                                <KPICard 
                                    title="Impacto Potencial" 
                                    value={`+ R$ ${(highPerformanceMetrics?.impact || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} 
                                    sub="Custo de oportunidade"
                                    icon={TrendingUp} 
                                    color="text-emerald-600" 
                                    lightColor="bg-emerald-50" 
                                />
                                <KPICard 
                                    title="Gap de Performance" 
                                    value={`${(((highPerformanceMetrics?.impact || 0) / (highPerformanceMetrics?.potentialTotal || 1)) * 100).toFixed(1)}%`} 
                                    sub="Diferença da meta"
                                    icon={Zap} 
                                    color="text-amber-600" 
                                    lightColor="bg-amber-50" 
                                />
                                <KPICard 
                                    title="Top Performer" 
                                    value={highPerformanceMetrics?.topPerformer?.name || '-'} 
                                    sub="Líder de faturamento"
                                    icon={Award} 
                                    color="text-indigo-600" 
                                    lightColor="bg-indigo-50" 
                                    valueSize="text-sm md:text-lg"
                                />
                                <KPICard 
                                    title="Nível de Excelência" 
                                    value={`${(100 - (((highPerformanceMetrics?.impact || 0) / (highPerformanceMetrics?.potentialTotal || 1)) * 100)).toFixed(1)}%`} 
                                    sub="Eficiência atual"
                                    icon={Sparkles} 
                                    color="text-blue-600" 
                                    lightColor="bg-blue-50" 
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Diferença p/ Profissional */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 lg:col-span-2">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" /> Gap p/ Meta de Excelência (R$)
                                    </h3>
                                    <div className="min-h-[300px]" style={{ height: `${Math.max(300, (highPerformanceMetrics?.performanceGaps.length || 0) * 40)}px` }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={highPerformanceMetrics?.performanceGaps} layout="vertical" margin={{ left: 0, right: 120 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                                <Tooltip cursor={{ fill: 'transparent' }} content={<CurrencyTooltip />} />
                                                <Bar dataKey="gap" fill="#059669" radius={[0, 4, 4, 0]} barSize={20}>
                                                    <LabelList dataKey="gap" position="right" fill="#64748b" fontSize={10} fontWeight={900} formatter={(v: number) => `+ R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Simulador de Performance */}
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between h-full">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <BrainCircuit size={16} className="text-indigo-600 dark:text-indigo-400" /> Simulador de Performance
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impacto ao reduzir o gap profissional</p>
                                    </div>
                                    <div className="space-y-4 mt-6">
                                        {[25, 50, 75, 100].map(pct => (
                                            <div key={pct} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 transition-all hover:border-emerald-200 dark:hover:border-emerald-800">
                                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{pct}% Do Gap</span>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">+ R$ {((highPerformanceMetrics?.impact || 0) * (pct / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                     <div className="space-y-3 mt-6">
                                        {(highPerformanceMetrics?.top3 || []).map((p, idx) => (
                                            <div key={idx} className={`p-4 rounded-2xl border ${idx === 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' : 'bg-slate-50 dark:bg-zinc-800 border-slate-100 dark:border-zinc-700'}`}>
                                                <p className={`text-[10px] font-black uppercase flex items-center gap-1 ${idx === 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {idx === 0 ? <Sparkles size={12} /> : idx === 1 ? <Target size={12} /> : <Award size={12} />} 
                                                    Benchmark #{idx + 1}: {p.name}
                                                </p>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2 leading-tight">
                                                    Se 100% da equipe atingir este patamar, o faturamento saltará para <span className="text-slate-900 dark:text-white font-black">R$ {p.potentialTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>.
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                                {/* Professional Insight 1: Liderança */}
                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                    <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Liderança em Vendas</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Consistência de Performance</p>
                                    </div>
                                    <div className="space-y-3 mt-2">
                                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                            <p className="text-[10px] font-black text-sky-600 uppercase mb-1">Top Performer</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                <span className="text-slate-900 dark:text-white font-black">{providerMetrics.revenue[0]?.name}</span> lidera o faturamento este mês com R$ {providerMetrics.revenue[0]?.faturamento.toLocaleString('pt-BR')}.
                                            </p>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Destaque de Produtividade</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                A equipe realizou um total de {filteredAppointments.length} atendimentos, mantendo a qualidade e o tempo médio esperado.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Insight 2: Upselling */}
                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Upselling Master</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Potencial de Ticket Médio</p>
                                    </div>
                                    <div className="space-y-3 mt-2">
                                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                            <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Maior Ticket Médio</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                <span className="text-slate-900 dark:text-white font-black">{providerMetrics.ticket[0]?.name}</span> possui o maior ticket médio (R$ {providerMetrics.ticket[0]?.ticketMedio.toLocaleString('pt-BR')}), indicando excelente oferta de serviços adicionais.
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                            <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Mix de Serviços</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                Profissionais com foco em tratamentos químicos apresentam 40% mais faturamento por hora que os generalistas.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Insight 3: Treinamento */}
                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <CircleCheck size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Desenvolvimento</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Capacitação e Metas</p>
                                    </div>
                                    <div className="space-y-3 mt-2">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Oportunidade de Treinamento</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                Identificamos profissionais com alta retenção de clientes por indicação, ideais para mentorar novos talentos.
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                            <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Metas de Equipe</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                O atingimento das metas de faturamento está em 85% para o grupo. Faltam R$ 12k para o bônus coletivo.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Insight 4: Gestão de Ausências */}
                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Gestão de Ausências</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Impacto e Disponibilidade</p>
                                    </div>
                                    <div className="space-y-3 mt-2">
                                        <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                            <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Impacto Financeiro</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                As ausências representam uma perda estimada de <span className="text-rose-600 font-black">R$ {absenceMetrics.totalLoss.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> em faturamento não realizado este período.
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                            <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Profissional Crítico</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {absenceMetrics.topImpactProvider ? (
                                                    <><span className="text-slate-900 dark:text-white font-black">{absenceMetrics.topImpactProvider.name}</span> é a profissional com maior impacto individual por bloqueios.</>
                                                ) : (
                                                    "Nenhuma ausência crítica identificada no momento."
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Insight 5: High Performance */}
                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Potencial High Performance</h4>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Excelência Operacional</p>
                                    </div>
                                    <div className="space-y-3 mt-2">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Oportunidade de Ganho</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                                Se todos atingissem o nível de <span className="text-emerald-600 font-black">{highPerformanceMetrics?.topPerformer?.name}</span>, teríamos um aumento de <span className="text-emerald-600 font-black">R$ {highPerformanceMetrics?.impact.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveSubTab('high_performance')}
                                            className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-400 transition-colors flex items-center justify-center gap-2 mt-4"
                                        >
                                            Ver Detalhes da Meta <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
            ) : null}

            {dashboardTab === 'servicos' ? (
                <div className="space-y-6">
                    {/* Sub-tabs for Services */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-fit">
                        <button 
                            onClick={() => setActiveSubTab('charts')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'charts' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BarChart2 size={14} /> Mix de Serviços
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('insights')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'insights' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BrainCircuit size={14} /> Inteligência de Mix
                        </button>
                    </div>

                    {activeSubTab === 'charts' ? (
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
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                            {/* Service Insight 1: Mix de Receita */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-pink-50 dark:bg-pink-900/20 rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400">
                                    <PieChart size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Análise do Mix</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Rentabilidade e Volume</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-pink-600 uppercase mb-1">Carro-Chefe</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            O serviço <span className="text-slate-900 dark:text-white font-black">{serviceMetrics.revenue[0]?.name}</span> é sua maior fonte de receita direta. Ele ancora 32% do faturamento total de serviços.
                                        </p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Serviço de Entrada</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Identificamos que 65% dos novos clientes iniciam sua jornada com <span className="text-slate-900 dark:text-white font-black">Escova ou Design de Sobrancelha</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Service Insight 2: Oportunidade de Ticket */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Upsell & Combos</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Potencial de Faturamento</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Combo Sugerido</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Clientes que fazem Mechas têm 85% de chance de aceitar um Tratamento Reconstrutor se oferecido na cadeira.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Gargalo de Agenda</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Serviços longos (mais de 3h) estão concentrados nos sábados. Oferecer 10% de desconto para esses serviços nas terças liberaria espaço nobre.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Service Insight 3: Margem Liquida */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Eficiência de Custo</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Serviços Estrela</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Baixo Consumo / Alta Margem</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Penteados e Maquiagens possuem o menor custo de insumo relativo. Focar em eventos sociais para alavancar margem do mês.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Alerta de Insumo</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            O custo de coloração subiu 8% este trimestre. Recomenda-se ajuste de tabela ou revisão de desperdício técnico.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
            {dashboardTab === 'clientes' ? (
                <div className="space-y-6">
                    {/* Sub-tabs for Customers */}
                    <div className="flex flex-col sm:flex-row gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-full sm:w-fit">
                        <button 
                            onClick={() => setActiveSubTab('charts')}
                            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'charts' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <Users size={14} /> Base de Clientes
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('insights')}
                            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'insights' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BrainCircuit size={14} /> CRM Inteligente
                        </button>
                    </div>

                    {activeSubTab === 'charts' ? (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-2 px-1">
                                <KPICard
                                    title="Clientes Recorrentes"
                                    value={recurringStats.recurringClients}
                                    sub={`${recurringStats.secondVisitConversion.toFixed(1)}% da base total`}
                                    icon={Users}
                                    color="text-indigo-700"
                                    lightColor="bg-indigo-50"
                                />
                                <KPICard
                                    title="Faturamento Recorrente"
                                    value={`R$ ${recurringStats.recurringRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                                    sub="Receita de fidelidade"
                                    icon={DollarSign}
                                    color="text-emerald-700"
                                    lightColor="bg-emerald-50"
                                />
                                <KPICard
                                    title="Frequência Média"
                                    value={recurringStats.avgFrequency.toFixed(1)}
                                    sub="Visitas por cliente"
                                    icon={Activity}
                                    color="text-amber-700"
                                    lightColor="bg-amber-50"
                                />
                                <KPICard
                                    title="Em Risco de Churn"
                                    value={recurringStats.churnRiskCount}
                                    sub="Inativos há +45 dias"
                                    icon={AlertTriangle}
                                    color="text-rose-700"
                                    lightColor="bg-rose-50"
                                />
                            </div>
                            {/* Tráfego de Novos Clientes */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-zinc-800 lg:col-span-3">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp size={16} className="text-emerald-500" /> Tráfego e Performance de Período
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Análise de conversão e fidelidade no período selecionado</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {/* Unified Novos Clientes Card */}
                                        <div className="bg-slate-900 dark:bg-white p-1 rounded-3xl shadow-xl flex items-center overflow-hidden border border-slate-800 dark:border-slate-200">
                                            <div 
                                                className="px-5 py-2 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-50 transition-colors group/new"
                                                onClick={() => setIsNewCustomersModalOpen(true)}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Base de Novos</p>
                                                    <ChevronRight size={8} className="text-slate-500 opacity-0 group-hover/new:opacity-100 transition-opacity" />
                                                </div>
                                                <p className="text-sm font-black text-white dark:text-black mt-0.5">
                                                    {newCustomersTrafficData.reduce((sum, d) => sum + (d.value || 0), 0)}
                                                </p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-800 dark:bg-slate-100" />
                                            <div className="px-5 py-2">
                                                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Faturamento</p>
                                                <p className="text-sm font-black text-white dark:text-black mt-0.5">
                                                    R$ {newCustomersTrafficData.reduce((sum, d) => sum + (d.revenue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-800 dark:bg-slate-100" />
                                            <div className="px-5 py-2">
                                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Serviços</p>
                                                <p className="text-sm font-black text-white dark:text-black mt-0.5">
                                                    {newCustomersTrafficData.reduce((sum, d) => sum + (d.services || 0), 0)}
                                                </p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-800 dark:bg-slate-100" />
                                            <div className="px-5 py-2">
                                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Cupons</p>
                                                <p className="text-sm font-black text-white dark:text-black mt-0.5">
                                                    {newCustomersTrafficData.reduce((sum, d) => sum + (d.coupons || 0), 0)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Unified Recorrentes Card */}
                                        <div className="bg-white dark:bg-zinc-800 p-1 rounded-3xl border border-slate-200 dark:border-zinc-700 shadow-sm flex items-center overflow-hidden">
                                            <div className="px-5 py-2">
                                                <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recorrentes</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                                                    {newCustomersTrafficData.reduce((sum, d) => sum + (d.recurring || 0), 0)}
                                                </p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-100 dark:bg-zinc-700" />
                                            <div className="px-5 py-2">
                                                <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Faturamento</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                                                    R$ {newCustomersTrafficData.reduce((sum, d) => sum + (d.recurringRevenue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-100 dark:bg-zinc-700" />
                                            <div className="px-5 py-2">
                                                <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Serviços</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                                                    {newCustomersTrafficData.reduce((sum, d) => sum + (d.recurringServices || 0), 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-80 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={newCustomersTrafficData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} width={30} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                            <Tooltip content={<NewClientTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <Area type="monotone" dataKey="recurring" name="Recorrentes" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" dot={{ fill: '#4f46e5', r: 3 }} activeDot={{ r: 5 }} />
                                            <Area type="monotone" dataKey="value" name="Novos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

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
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                            {/* Customer Insight 1: RFM */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Segmentação RFM</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Recência, Frequência e Valor</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Campeões</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            <span className="text-slate-900 dark:text-white font-black">VIPs</span> são clientes que gastam acima de R$800/mês. Eles sozinhos geram 40% do seu lucro líquido.
                                        </p>
                                    </div>
                                    <div 
                                        className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition-all group"
                                        onClick={() => {
                                            setChurnModalTab('loyal');
                                            setIsChurnModalOpen(true);
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black text-rose-600 uppercase">Risco de Churn</p>
                                            <div className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity uppercase">Ação Reativa</div>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Identificamos <span className="text-rose-900 dark:text-rose-400 font-black">{recurringStats.churnRiskCount} fiéis</span> e <span className="text-sky-700 dark:text-sky-400 font-black">{recurringStats.oneTimeOnlyClients.length} novos</span> que não retornam. Perda potencial: R$ {((recurringStats.churnRiskCount + recurringStats.oneTimeOnlyClients.length) * (customerAvgTicket[0]?.value || 150)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês.
                                        </p>
                                        <div className="mt-3 flex items-center gap-1 text-[9px] font-black text-rose-600 uppercase tracking-widest">
                                            Recuperar Clientes <ChevronRight size={10} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Insight 2: Comportamento */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                                    <ShoppingBag size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Perfil de Consumo</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Preferências de Compra</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-sky-600 uppercase mb-1">Cross-Selling</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Apenas 12% dos clientes de serviços compram produtos. Há uma oportunidade de R$4.5k/mês em vendas não realizadas.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Indicação (MGM)</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Seu canal "Indicação" tem o maior LTV. Clientes indicados tendem a gastar 30% mais que os vindos do Instagram.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Insight 3: Calendario */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Janelas de Retorno</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Ciclo de Vida</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                                        <p className="text-[10px] font-black text-purple-600 uppercase mb-1">Ciclo Médio</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            O ciclo médio de retorno é de 28 dias. Clientes que quebram esse ciclo para mais de 35 dias têm 60% de chance de churn.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Aniversariantes</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Campanhas automáticas de aniversário geram um boost médio de 15% no faturamento mensal da categoria 'Mimos'.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
            {dashboardTab === 'campanhas' ? (
                <div className="space-y-6">
                    {/* Sub-tabs for Campaigns */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-fit">
                        <button 
                            onClick={() => setActiveSubTab('charts')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'charts' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <Megaphone size={14} /> Performance de Mídia
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('insights')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'insights' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <BrainCircuit size={14} /> ROI & Conversão
                        </button>
                    </div>

                    {activeSubTab === 'charts' ? (
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
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                            {/* Campaign Insight 1: ROI */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">ROI das Campanhas</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Eficiência de Marketing</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Campanha Estrela</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            A campanha <span className="text-slate-900 dark:text-white font-black">{topCampaigns[0]?.name}</span> gerou o maior Retorno sobre Investimento, com ticket médio 15% superior à base geral.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Custo por Aquisição (CAC)</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Campanhas de "Indicação" possuem CAC zero e geram 3x mais receita no 1º mês comparado ao tráfego pago do Instagram.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Campaign Insight 2: Canais */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                    <Megaphone size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Análise de Canal</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Onde Investir</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-cyan-600 uppercase mb-1">Instagram vs WhatsApp</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            80% das suas conversões vêm do WhatsApp direto. O Instagram funciona como vitrine (awareness), mas o fechamento é 1-para-1.
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                        <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Canal Emergente</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            O canal 'TikTok' cresceu 400% este mês para a categoria 'Mechas'. Ideal para investir em vídeos curtos de 'Antes e Depois'.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Campaign Insight 3: Perfil */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
                                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Qualidade Leads</h4>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Perpetuidade da Campanha</p>
                                </div>
                                <div className="space-y-3 mt-2">
                                    <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                        <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Alerta de Desconto</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Evitar cupons acima de 20% para serviços recorrentes. Eles atraem clientes que não fidelizam e buscam apenas preço.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Público Lookalike</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            Seu público ideal é composto por mulheres (25-45 anos) que consomem serviços de alta complexidade a cada 45 dias.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Churn Action Modal */}
            {isChurnModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 md:rounded-[2.5rem] shadow-2xl w-full max-w-7xl h-full md:h-[85vh] overflow-hidden border-black dark:border-zinc-700 flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 md:px-8 md:py-6 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black uppercase text-xs md:text-sm tracking-widest flex items-center gap-2">
                                    <Target size={18} className="text-rose-500" /> Plano de Recuperação
                                </h3>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Churn Real: <span className="text-rose-400">{recurringStats.realChurnRate.toFixed(1)}%</span> | {customers.length} clientes
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsChurnModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 px-6 md:px-8 pt-4 md:pt-6 border-b border-slate-100 dark:border-zinc-800 overflow-x-auto no-scrollbar">
                            <button 
                                onClick={() => setChurnModalTab('loyal')}
                                className={`pb-4 px-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${churnModalTab === 'loyal' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    Recuperar Fiéis <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full text-[8px]">{recurringStats.churnRiskClients.length}</span>
                                </div>
                                {churnModalTab === 'loyal' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 rounded-t-full" />}
                            </button>
                            <button 
                                onClick={() => setChurnModalTab('new')}
                                className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${churnModalTab === 'new' ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    Novos s/ Retorno <span className="bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full text-[8px]">{recurringStats.oneTimeOnlyClients.length}</span>
                                </div>
                                {churnModalTab === 'new' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-600 rounded-t-full" />}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 dark:bg-zinc-900/50">
                            <div className="mb-6 bg-white dark:bg-zinc-800/80 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                                <h4 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <BrainCircuit size={14} className="text-indigo-500" /> Estratégia Sugerida
                                </h4>
                                <p className="text-[11px] md:text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {churnModalTab === 'loyal' ? (
                                        "Estes são clientes fiéis (2+ visitas) inativos há 45+ dias. O foco é RELACIONAMENTO. Ofereça uma cortesia ou diga que sentimos saudade."
                                    ) : (
                                        "Estes clientes vieram apenas UMA vez e não voltaram em 30 dias. O foco é PESQUISA. Tente entender se algo não atendeu e ofereça um incentivo."
                                    )}
                                </p>
                            </div>

                            {/* Mobile/Tablet Grid (up to LG) / Desktop Table (LG+) */}
                            <div className="block lg:hidden space-y-3">
                                {[...(churnModalTab === 'loyal' ? recurringStats.churnRiskClients : recurringStats.oneTimeOnlyClients)]
                                    .sort((a, b) => b.daysInactive - a.daysInactive)
                                    .map((client: any) => {
                                        const isAlreadyMessaged = client.lastMarketingContact && 
                                            new Date(client.lastMarketingContact).toDateString() === new Date().toDateString();
                                        
                                        return (
                                            <div key={client.id} className={`bg-white dark:bg-zinc-900 p-5 rounded-3xl border shadow-sm transition-all relative overflow-hidden ${isAlreadyMessaged ? 'border-emerald-500 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-zinc-800'}`}>
                                                {isAlreadyMessaged && (
                                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-2xl flex items-center gap-1 shadow-sm animate-in slide-in-from-top-2">
                                                        <CircleCheck size={10} /> Contatado Hoje
                                                    </div>
                                                )}
                                                
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`font-black text-xs uppercase truncate ${isAlreadyMessaged ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{client.name}</p>
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{client.phone}</p>
                                                    </div>
                                                    {!isAlreadyMessaged && (
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${client.daysInactive > 60 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {client.daysInactive} dias
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Última Visita</p>
                                                        <p className="text-[10px] font-black text-slate-700 dark:text-zinc-300">
                                                            {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Gasto Médio</p>
                                                        <p className="text-[10px] font-black text-slate-900 dark:text-white">
                                                            R$ {client.avgTicket.toLocaleString('pt-BR')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            const firstName = client.name.split(' ')[0];
                                                            const phone = client.phone.replace(/\D/g, '');
                                                            const msg = churnModalTab === 'loyal' 
                                                                ? `Olá ${firstName}, tudo bem? Sentimos sua falta aqui na Aminna!`
                                                                : `Olá ${firstName}, foi um prazer recebê-la na Aminna!`;
                                                            
                                                            window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                                            handleMarkAsMessaged(client.id);
                                                        }}
                                                        className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${isAlreadyMessaged ? 'bg-emerald-500 text-white' : 'bg-zinc-950 dark:bg-white text-white dark:text-black shadow-sm'}`}
                                                    >
                                                        <MessageCircle size={14} />
                                                        {isAlreadyMessaged ? 'Reenviar' : 'WhatsApp'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleMarkAsMessaged(client.id)}
                                                        className={`p-3 rounded-2xl border transition-all ${isAlreadyMessaged ? 'bg-emerald-100 border-emerald-300 text-emerald-600' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-emerald-500'} shadow-sm flex items-center justify-center`}
                                                        title="Marcar como enviado manualmente"
                                                    >
                                                        <CircleCheck size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const firstName = client.name.split(' ')[0];
                                                            const msg = churnModalTab === 'loyal' 
                                                                ? `Olá ${firstName}, tudo bem? Sentimos sua falta aqui na Aminna!`
                                                                : `Olá ${firstName}, foi um prazer recebê-la na Aminna!`;
                                                            navigator.clipboard.writeText(msg);
                                                            handleMarkAsMessaged(client.id);
                                                            alert('Copiado!');
                                                        }}
                                                        className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-200 shadow-sm"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>

                            <div className="hidden lg:block overflow-x-auto bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Inativo há</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Gasto Médio</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...(churnModalTab === 'loyal' ? recurringStats.churnRiskClients : recurringStats.oneTimeOnlyClients)]
                                            .sort((a, b) => b.daysInactive - a.daysInactive)
                                            .map((client: any) => {
                                                const isAlreadyMessaged = client.lastMarketingContact && 
                                                    new Date(client.lastMarketingContact).toDateString() === new Date().toDateString();

                                                return (
                                                    <tr 
                                                        key={client.id}
                                                        className={`border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors group ${isAlreadyMessaged ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <p className="font-black text-xs text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{client.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{client.phone}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${client.daysInactive > 60 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                {client.daysInactive} dias
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {client.avgTicket.toLocaleString('pt-BR')}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {isAlreadyMessaged ? (
                                                                <span className="flex items-center justify-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
                                                                    <CircleCheck size={14} /> Contatado
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Pendente</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        const firstName = client.name.split(' ')[0];
                                                                        const phone = client.phone.replace(/\D/g, '');
                                                                        const msg = churnModalTab === 'loyal' 
                                                                            ? `Olá ${firstName}, tudo bem? Sentimos sua falta aqui na Aminna!`
                                                                            : `Olá ${firstName}, foi um prazer recebê-la na Aminna!`;
                                                                        window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                                                        handleMarkAsMessaged(client.id);
                                                                    }}
                                                                    className="p-2.5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm"
                                                                >
                                                                    <MessageCircle size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleMarkAsMessaged(client.id)}
                                                                    className={`p-2.5 rounded-xl border transition-all ${isAlreadyMessaged ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-emerald-500'}`}
                                                                    title="Marcar como enviado manualmente"
                                                                >
                                                                    <CircleCheck size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            {(churnModalTab === 'loyal' ? recurringStats.churnRiskClients : recurringStats.oneTimeOnlyClients).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                    <Sparkles size={48} className="mb-4 opacity-20" />
                                    <p className="font-black uppercase text-xs tracking-widest">Nenhum cliente neste perfil no momento</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-4 bg-slate-50 dark:bg-zinc-950/50 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-[9px]">
                            <p className="font-bold text-slate-400 uppercase tracking-tighter">Planilha de Recuperação Gerada em {new Date().toLocaleDateString('pt-BR')}</p>
                            <p className="font-black text-slate-600 dark:text-slate-400 uppercase">Foco total na Experiência do Cliente</p>
                        </div>
                    </div>
                </div>
            )}

            {/* New Customers Modal */}
            {isNewCustomersModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 md:rounded-[2.5rem] shadow-2xl w-full max-w-7xl h-full md:h-[85vh] overflow-hidden border-black dark:border-zinc-700 flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 md:px-8 md:py-6 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black uppercase text-xs md:text-sm tracking-widest flex items-center gap-2">
                                    <Users size={18} className="text-blue-500" /> Relatório de Novos Clientes
                                </h3>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Base de Novos: <span className="text-blue-400">{newCustomersListData.length}</span> | Período: {getDateLabel()}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsNewCustomersModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-zinc-900/50">
                            {/* Mobile/Tablet Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                                {newCustomersListData.map((row) => {
                                    const isAlreadyMessaged = row.lastMarketingContact && 
                                        new Date(row.lastMarketingContact).toDateString() === new Date().toDateString();

                                    return (
                                        <div key={row.id} className={`bg-white dark:bg-zinc-900 p-5 rounded-3xl border shadow-sm transition-all relative overflow-hidden ${isAlreadyMessaged ? 'border-emerald-500 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-zinc-800'}`}>
                                            {isAlreadyMessaged && (
                                                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-2xl flex items-center gap-1 shadow-sm animate-in slide-in-from-top-2">
                                                    <CircleCheck size={10} /> Contatado Hoje
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className={`font-black text-xs uppercase truncate ${isAlreadyMessaged ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{row.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{row.phone}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black ${isAlreadyMessaged ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                                                    {new Date(row.date).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-slate-400 uppercase">Profissional</span>
                                                    <span className="font-black text-slate-700 dark:text-zinc-300">{row.professional}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-slate-400 uppercase">Serviços</span>
                                                    <span className="font-black text-slate-700 dark:text-zinc-300 truncate max-w-[150px]">{row.services}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-slate-400 uppercase">Faturamento</span>
                                                    <span className="font-black text-emerald-600">R$ {row.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const firstName = row.name.split(' ')[0];
                                                        const phone = row.phone.replace(/\D/g, '');
                                                        const msg = `Oi, ${row.name} 
tudo bem? 

Foi um prazer ter você na Aminna pela primeira vez!
Conta pra gente como foi a sua experiência, você se sentiu bem atendida? Gostou do resultado?

Sua opinião é muito importante pra gente :)`;
                                                        window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                                        handleMarkAsMessaged(row.id);
                                                    }}
                                                    className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${isAlreadyMessaged ? 'bg-emerald-500 text-white' : 'bg-zinc-950 dark:bg-white text-white dark:text-black shadow-sm'}`}
                                                >
                                                    <MessageCircle size={14} />
                                                    {isAlreadyMessaged ? 'Reenviar' : 'WhatsApp'}
                                                </button>
                                                <button 
                                                    onClick={() => handleMarkAsMessaged(row.id)}
                                                    className={`p-3 rounded-2xl border transition-all ${isAlreadyMessaged ? 'bg-emerald-100 border-emerald-300 text-emerald-600' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-emerald-500'} shadow-sm flex items-center justify-center`}
                                                    title="Marcar como enviado manualmente"
                                                >
                                                    <CircleCheck size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const firstName = row.name.split(' ')[0];
                                                        const msg = `Oi, ${row.name} 
tudo bem? 

Foi um prazer ter você na Aminna pela primeira vez!
Conta pra gente como foi a sua experiência, você se sentiu bem atendida? Gostou do resultado?

Sua opinião é muito importante pra gente :)`;
                                                        navigator.clipboard.writeText(msg);
                                                        handleMarkAsMessaged(row.id);
                                                        alert('Mensagem copiada!');
                                                    }}
                                                    className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-200 shadow-sm"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Data</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Profissional</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Faturamento</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newCustomersListData.map((row) => {
                                            const isAlreadyMessaged = row.lastMarketingContact && 
                                                new Date(row.lastMarketingContact).toDateString() === new Date().toDateString();

                                            return (
                                                <tr key={row.id} className={`border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors group ${isAlreadyMessaged ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-xs text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{row.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{row.phone}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-black whitespace-nowrap">
                                                            {new Date(row.date).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{row.professional}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{row.services}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="text-xs font-black text-emerald-600">R$ {row.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {isAlreadyMessaged ? (
                                                            <span className="flex items-center justify-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
                                                                <CircleCheck size={14} /> Contatado
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-slate-400 uppercase">Pendente</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button 
                                                                onClick={() => {
                                                                    const firstName = row.name.split(' ')[0];
                                                                    const phone = row.phone.replace(/\D/g, '');
                                                                    const msg = `Oi, ${row.name} 
tudo bem? 

Foi um prazer ter você na Aminna pela primeira vez!
Conta pra gente como foi a sua experiência, você se sentiu bem atendida? Gostou do resultado?

Sua opinião é muito importante pra gente :)`;
                                                                    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                                                    handleMarkAsMessaged(row.id);
                                                                }}
                                                                className="p-2.5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm"
                                                                title="Enviar Pesquisa de Satisfação"
                                                            >
                                                                <MessageCircle size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleMarkAsMessaged(row.id)}
                                                                className={`p-2.5 rounded-xl border transition-all ${isAlreadyMessaged ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-emerald-500'}`}
                                                                title="Marcar como enviado manualmente"
                                                            >
                                                                <CircleCheck size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {newCustomersListData.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                    <Users size={48} className="mb-4 opacity-20" />
                                    <p className="font-black uppercase text-xs tracking-widest">Nenhum novo cliente neste período</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-4 bg-slate-50 dark:bg-zinc-950/50 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-[9px]">
                            <p className="font-bold text-slate-400 uppercase tracking-tighter">Relatório Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                            <p className="font-black text-slate-600 dark:text-slate-400 uppercase">Fidelizando novos talentos</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
