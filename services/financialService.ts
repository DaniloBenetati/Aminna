import { Appointment, Service, Customer, Provider, CommissionSetting, PaymentSetting, FinancialTransaction, Sale, Expense, FinancialConfig, Supplier, Employee } from '../types';

export const toLocalDateStr = (date: Date | string) => {
    const d = typeof date === 'string' ? parseDateSafe(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const isFirstAppointment = (customerId: string, date: string, appointments: Appointment[]) => {
    const validApps = appointments.filter(a => a.customerId === customerId && a.status === 'Concluído');
    if (validApps.length === 0) return false;
    const firstDate = validApps.reduce((min, a) => (a.date < min ? a.date : min), validApps[0].date);
    return date === firstDate;
};

export const parseDateSafe = (dateStr: string | undefined | Date): Date => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    try {
        let cleanDate = dateStr;
        if (cleanDate.includes(' ')) {
            cleanDate = cleanDate.split(' ')[0];
        } else if (cleanDate.includes('T')) {
            cleanDate = cleanDate.split('T')[0];
        }

        // If format is YYYY-MM-DD, parse as LOCAL time to avoid UTC shift
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            const [y, m, d] = cleanDate.split('-').map(Number);
            return new Date(y, m - 1, d);
        }

        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
        return new Date();
    }
};

export const formatDateBR = (dateStr: string | undefined): string => {
    if (!dateStr) return "-";
    const d = parseDateSafe(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export const getAnticipationRate = (dateStr: string, financialConfigs: FinancialConfig[]) => {
    // financialConfigs must be sorted by validFrom DESC (as done in App.tsx)
    const config = financialConfigs.find(c => c.validFrom <= dateStr);
    if (!config || !config.anticipationEnabled) return 0;
    return config.anticipationRate;
};

/**
 * Shared logic for 100% synchronization with Professional Closures.
 * Only counts 'Concluído', only if professional assigned, excludes remakes.
 */
export const calculateAppointmentProduction = (app: any, services: Service[]): number => {
    // 1. FILTER: Only "Concluído" (Production Standard)
    if (app.status?.toUpperCase() !== 'CONCLUÍDO') return 0;

    // 2. FILTER: Exclude remakes
    const paymentMethod = app.paymentMethod || app.payment_method;
    const isRemake = app.isRemake || app.is_remake || paymentMethod === 'Refazer' || paymentMethod?.startsWith('Justificativa');
    if (isRemake) return 0;

    let total = 0;

    // 3. Main Service (Only if professional assigned)
    if (app.providerId || app.provider_id) {
        const serviceId = app.serviceId || app.service_id;
        const mainS = services.find(s => s.id === serviceId);
        const booked = Number(app.bookedPrice ?? app.booked_price ?? mainS?.price ?? 0);
        const qty = Number(app.quantity ?? 1);
        total += (booked * qty);
    }

    // 4. Additional Services (Only if professional assigned)
    const extras = app.additionalServices || app.additional_services || [];
    extras.forEach((extra: any) => {
        if (extra.providerId || extra.provider_id) {
            const extraSId = extra.serviceId || extra.service_id;
            const extraS = services.find(s => s.id === extraSId);
            const eBooked = Number(extra.bookedPrice ?? extra.booked_price ?? extraS?.price ?? 0);
            const eQty = Number(extra.quantity ?? 1);
            total += (eBooked * eQty);
        }
    });

    return total;
};

export const calculateProductionRevenue = (appointments: any[], services: Service[], startDate?: string, endDate?: string): number => {
    return appointments.reduce((sum, app) => {
        if (startDate || endDate) {
            const d = app.date?.substring(0, 10);
            if (!d) return sum;
            if (startDate && d < startDate) return sum;
            if (endDate && d > endDate) return sum;
        }
        return sum + calculateAppointmentProduction(app, services);
    }, 0);
};

export const generateFinancialTransactions = (
    appointments: Appointment[],
    sales: Sale[],
    expenses: Expense[],
    services: Service[],
    customers: Customer[],
    providers: Provider[],
    suppliers: Supplier[],
    employees: Employee[],
    commissionSettings: CommissionSetting[],
    paymentSettings: PaymentSetting[],
    financialConfigs: FinancialConfig[] = []
): FinancialTransaction[] => {
    const allTrans: FinancialTransaction[] = [];
    const today = new Date();
    const todayStr = toLocalDateStr(today);

    // Helper to find commission payment date
    const getCommissionDate = (dateStr: string) => {
        if (!commissionSettings || commissionSettings.length === 0) return dateStr;
        const date = parseDateSafe(dateStr);
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        const setting = commissionSettings.find(s => {
            if (s.endDay === 'last') return day >= s.startDay;
            return day >= s.startDay && day <= (s.endDay as number);
        });

        if (!setting) return dateStr;

        let targetMonth = month;
        let targetYear = year;

        if (setting.paymentDay < setting.startDay) {
            targetMonth++;
            if (targetMonth > 11) { targetMonth = 0; targetYear++; }
        }

        const targetDate = new Date(targetYear, targetMonth, setting.paymentDay);
        return toLocalDateStr(targetDate);
    };

    const getPaymentDetails = (methodName: string) => {
        const method = paymentSettings.find(p => p.method === methodName);
        return {
            fee: (method ? method.fee : 0) || 0,
            days: (method ? method.days : 0) || 0
        };
    };

    const addDays = (dateStr: string, days: number) => {
        const d = parseDateSafe(dateStr);
        d.setDate(d.getDate() + days);
        return toLocalDateStr(d);
    };

    appointments.forEach(app => {
        if (app.status === 'Cancelado') return;
        const service = services.find(s => s.id === app.serviceId);
        const customer = customers.find(c => c.id === app.customerId);
        const provider = providers.find(p => p.id === app.providerId);

        const rawApp = app as any;
        const pricePaid = Number(app.pricePaid ?? rawApp.price_paid ?? 0);
        const bookedPrice = Number(app.bookedPrice ?? rawApp.booked_price ?? 0);
        const quantity = Number(app.quantity ?? rawApp.quantity ?? 1);
        const tipAmount = Number(app.tipAmount ?? rawApp.tip_amount ?? 0);

        let paymentMethodName = app.paymentMethod || rawApp.payment_method || 'Pix';
        const { fee, days } = getPaymentDetails(paymentMethodName);

        const paymentDate = app.paymentDate || rawApp.payment_date;
        const baseDate = (app.status === 'Concluído' && paymentDate) ? paymentDate : app.date;
        // If it's reconciled, it means the money actually hit the bank around this date, so we ignore the theoretical 'days' delay
        const settlementDate = app.isReconciled ? baseDate : addDays(baseDate, days);

        let status: 'Pago' | 'Previsto' | 'Atrasado' = 'Previsto';
        if (app.status === 'Concluído') {
            status = settlementDate <= todayStr ? 'Pago' : 'Previsto';
        } else if (app.date < todayStr) {
            status = 'Atrasado';
        }

        // SYNCED: Use the unified production calculation logic
        const actualTotalRevenue = calculateAppointmentProduction(app, services);
        
        // We still need mainBooked and extrasList for proportional distribution in DRE transactions
        const mainSvcId = app.serviceId || rawApp.service_id;
        const mainS = services.find(s => s.id === mainSvcId);
        const hasMainProvider = !!(app.providerId || rawApp.provider_id);
        const mainBookedRaw = Number(app.bookedPrice ?? rawApp.booked_price ?? mainS?.price ?? 0);
        const mainBooked = hasMainProvider ? (mainBookedRaw * quantity) : 0;

        const extrasList = (app.additionalServices || rawApp.additional_services || []).map((extra: any) => {
            const extraSvcId = extra.serviceId || extra.service_id;
            const extraS = services.find(s => s.id === extraSvcId);
            const hasExtraProv = !!(extra.providerId || extra.provider_id);
            const eBookedRaw = Number(extra.bookedPrice ?? extra.booked_price ?? extraS?.price ?? 0);
            const eQty = Number(extra.quantity ?? 1);
            return {
                ...extra,
                bookedPrice: hasExtraProv ? (eBookedRaw * eQty) : 0,
                serviceName: extraS?.name || 'Serviço Extra'
            };
        });

        // totalBooked here is just for proportion calculation
        const totalBooked = mainBooked + extrasList.reduce((acc: number, e: any) => acc + e.bookedPrice, 0);

        // Filter: If actualTotalRevenue is 0 (due to status or remake), we skip the revenue lines but might still have expenses
        if (actualTotalRevenue > 0) {

        // Main Service Transaction
        allTrans.push({
            id: `app-main-${app.id}`,
            date: settlementDate,
            type: 'RECEITA',
            category: 'Serviço',
            description: `${service?.name || 'Serviço'} - ${customer?.name}`,
            amount: totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0,
            status: status,
            paymentMethod: app.status === 'Concluído' && mainBooked === 0 ? 'Cortesia' : paymentMethodName,
            origin: 'Serviço',
            customerOrProviderName: customer?.name || 'Cliente',
            providerName: provider?.name || 'Não atribuído',
            customerName: customer?.name || 'Desconhecido',
            serviceName: service?.name || 'Serviço',
            appointmentDate: app.date,
            isReconciled: app.isReconciled,
            customerId: app.customerId
        });

        // Extras Transactions
        extrasList.forEach((extra, idx) => {
            const extraProv = providers.find(p => p.id === extra.providerId);
            allTrans.push({
                id: `app-extra-rev-${app.id}-${idx}`,
                date: settlementDate,
                type: 'RECEITA',
                category: 'Serviço',
                description: `${extra.serviceName} - ${customer?.name}`,
                amount: totalBooked > 0 ? (extra.bookedPrice / totalBooked) * actualTotalRevenue : 0,
                status: status,
                paymentMethod: app.status === 'Concluído' && extra.bookedPrice === 0 ? 'Cortesia' : paymentMethodName,
                origin: 'Serviço',
                customerOrProviderName: customer?.name || 'Cliente',
                providerName: extraProv?.name || 'Não atribuído',
                customerName: customer?.name || 'Desconhecido',
                serviceName: extra.serviceName,
                appointmentDate: app.date,
                isReconciled: app.isReconciled,
                customerId: app.customerId
            });
        });
    }

        // Price Discrepancy is now distributed into the service lines themselves
        /*
        const priceDiscrepancy = actualTotalRevenue - totalBooked;
        if (app.status === 'Concluído' && Math.abs(priceDiscrepancy) > 0.01) {
            ...
        }
        */

        // --- AUTO-GENERATED CARD/ANTICIPATION FEES REMOVED BY USER REQUEST ---
        /*
        if (fee > 0 && actualTotalRevenue > 0) { ... }
        ...
        */

        // Caixinha (Tip)
        if (app.status === 'Concluído' && tipAmount > 0) {
            allTrans.push({
                id: `app-tip-${app.id}`,
                date: settlementDate,
                type: 'RECEITA',
                category: 'Caixinha',
                description: `Caixinha - ${customer?.name}`,
                amount: tipAmount,
                status: status,
                paymentMethod: paymentMethodName,
                origin: 'Outro',
                customerOrProviderName: customer?.name || 'Cliente',
                providerName: provider?.name || 'Vários',
                customerName: customer?.name || 'Desconhecido',
                serviceName: 'Caixinha / Gorjeta',
                appointmentDate: app.date,
                isReconciled: app.isReconciled,
                customerId: app.customerId
            });
        }

        // --- COMMISSIONS ---
        if (provider) {
            const commissionRateSnapshot = app.commissionRateSnapshot ?? rawApp.commission_rate_snapshot;
            const rate = commissionRateSnapshot ?? provider.commissionRate;
            
            // Calculate proportional revenue for this line
            const mainRevenueAmount = totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0;
            const isRemake = app.isRemake || rawApp.is_remake || paymentMethodName === 'Refazer' || paymentMethodName?.startsWith('Justificativa');

            // Base commission on FULL price if coupon is applied (company absorbs the discount)
            // UNLESS it's a remake/justification where commission must be zero
            let commissionBase = 0;
            if (!isRemake) {
                commissionBase = (app.appliedCoupon && mainBooked > 0) ? mainBooked : mainRevenueAmount;
            }
            
            const commissionLiquidBase = commissionBase * (1 - (fee / 100));
            const commissionAmount = commissionLiquidBase * rate;
            const commissionDate = getCommissionDate(baseDate);

            allTrans.push({
                id: `comm-main-${app.id}`,
                date: commissionDate,
                type: 'DESPESA',
                category: 'Repasse Comissão',
                description: `Repasse - ${(provider.name || 'Pró').split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                amount: commissionAmount,
                status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                paymentMethod: 'Transferência',
                origin: 'Despesa',
                customerOrProviderName: provider.name,
                providerName: provider.name,
                customerName: customer?.name || 'Desconhecido',
                serviceName: `Comissão: ${service?.name || 'Serviço'}`,
                appointmentDate: app.date,
                customerId: app.customerId
            });
        }

        // Additional Services Commissions
        if (extrasList && extrasList.length > 0) {
            extrasList.forEach((extra, idx) => {
                const extraProvider = providers.find(p => p.id === extra.providerId);
                const extraService = services.find(s => s.id === extra.serviceId);
                if (extraProvider) {
                    const rawExtra = extra as any;
                    const extraRateSnapshot = extra.commissionRateSnapshot ?? rawExtra.commission_rate_snapshot;
                    const rate = extraRateSnapshot ?? extraProvider.commissionRate;
                    
                    // Calculate proportional revenue for this extra line
                    const extraBookedPrice = extra.bookedPrice; // Already multiplied by quantity in extrasList mapping
                    const extraRevenueAmount = totalBooked > 0 ? (extraBookedPrice / totalBooked) * actualTotalRevenue : 0;
                    const isRemake = app.isRemake || rawApp.is_remake || paymentMethodName === 'Refazer' || paymentMethodName?.startsWith('Justificativa');

                    // Base commission on FULL price if coupon is applied
                    // UNLESS it's a remake/justification where commission must be zero
                    let extraCommBase = 0;
                    if (!isRemake) {
                        extraCommBase = (app.appliedCoupon && extraBookedPrice > 0) ? extraBookedPrice : extraRevenueAmount;
                    }

                    const commissionLiquidBase = extraCommBase * (1 - (fee / 100));
                    const commissionAmount = commissionLiquidBase * rate;
                    const commissionDate = getCommissionDate(baseDate);

                    allTrans.push({
                        id: `comm-extra-${app.id}-${idx}`,
                        date: commissionDate,
                        type: 'DESPESA',
                        category: 'Repasse Comissão',
                        description: `Repasse Extra - ${(extraProvider.name || 'Pró').split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                        amount: commissionAmount,
                        status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                        paymentMethod: 'Transferência',
                        origin: 'Despesa',
                        customerOrProviderName: extraProvider.name,
                        providerName: extraProvider.name,
                        customerName: customer?.name || 'Desconhecido',
                        serviceName: `Comissão: ${extraService?.name || 'Serviço'}`,
                        appointmentDate: app.date,
                        customerId: app.customerId
                    });
                }
            });
        }
    });

    sales.forEach(sale => {
        const paymentMethodName = sale.paymentMethod || 'Dinheiro';
        const { fee, days } = getPaymentDetails(paymentMethodName);
        const grossAmount = sale.totalAmount || 0;
        // Reconciled items are already in the bank statement near `sale.date`, ignore theoretical delay
        const settlementDate = sale.isReconciled ? sale.date : addDays(sale.date, days);

        const status = settlementDate <= todayStr ? 'Pago' : 'Previsto';

        allTrans.push({
            id: `sale-${sale.id}`,
            date: settlementDate,
            type: 'RECEITA',
            category: 'Produto',
            description: 'Venda de Produto',
            amount: grossAmount,
            status: status,
            paymentMethod: paymentMethodName,
            origin: 'Produto',
            customerOrProviderName: 'Cliente Balcão',
            providerName: 'Venda Direta',
            customerName: 'Cliente Balcão',
            serviceName: 'Venda de Produto',
            appointmentDate: sale.date,
            isReconciled: sale.isReconciled,
            customerId: sale.customerId
        });

        // --- AUTO-GENERATED CARD FEE FOR SALES REMOVED BY USER REQUEST ---
        /*
        if (fee > 0 && grossAmount > 0) {
            allTrans.push({ ... });
        }
        */
    });

    expenses.forEach(exp => {
        const supplier = suppliers.find(s => s.id === exp.supplierId);
        const provider = providers.find(p => p.id === exp.providerId);
        const employee = employees.find(e => e.id === exp.employeeId);
        
        allTrans.push({
            id: exp.id,
            date: exp.date,
            type: 'DESPESA',
            category: exp.category,
            description: exp.description,
            amount: exp.amount,
            status: exp.status === 'Pago' ? 'Pago' : 'Pendente',
            paymentMethod: exp.paymentMethod || 'Dinheiro',
            origin: 'Despesa',
            customerOrProviderName: supplier?.name || provider?.name || employee?.name || '',
            // Use exp.id as providerName so that DB expense records with category 'Repasse Comissão'
            // are never merged together in the commission grouping step below.
            providerName: exp.id,
            supplierId: exp.supplierId,
            providerId: exp.providerId,
            employeeId: exp.employeeId,
            isReconciled: exp.isReconciled,
            invoiceNumber: exp.invoiceNumber
        });
    });

    // --- AGGREGATE COMMISSIONS ---
    const nonCommissions = allTrans.filter(t => t.category !== 'Repasse Comissão');
    const commissions = allTrans.filter(t => t.category === 'Repasse Comissão');

    const groupedCommissions = commissions.reduce((acc, curr) => {
        const key = `${curr.providerName}_${curr.date}`;
        if (!acc[key]) {
            acc[key] = { ...curr, amount: 0, id: `comm-grouped-${curr.providerName}-${curr.date}` };
        }
        acc[key].amount += curr.amount;
        return acc;
    }, {} as Record<string, FinancialTransaction>);

    const finalTrans = [...nonCommissions, ...Object.values(groupedCommissions)];

    return finalTrans.sort((a, b) => parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime());
};

export const calculateDailySummary = (dailyRelTrans: FinancialTransaction[]) => {
    const totalServices = dailyRelTrans.filter(t => t.origin === 'Serviço').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
    const totalProducts = dailyRelTrans.filter(t => t.origin === 'Produto').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
    const totalAjustes = dailyRelTrans.filter(t => t.category === 'Ajuste de Valor').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
    const totalTips = dailyRelTrans.filter(t => t.category === 'Caixinha').reduce((acc, t) => acc + t.amount, 0);
    const totalAnticipationFees = 0;
    const totalRevenue = totalServices + totalProducts + totalTips + totalAjustes;

    return {
        totalServices,
        totalProducts,
        totalAjustes,
        totalTips,
        totalAnticipationFees,
        totalRevenue,
        servicesWithTips: totalServices + totalTips
    };
};
