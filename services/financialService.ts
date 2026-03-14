import { Appointment, Service, Customer, Provider, CommissionSetting, PaymentSetting, FinancialTransaction, Sale, Expense, FinancialConfig, Supplier } from '../types';

export const toLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const parseDateSafe = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date();
    try {
        // 1. Handle common Supabase/Postgres formats: "YYYY-MM-DD HH:mm:ss+ZZ"
        // If there's a space followed by time, we extract just the date part to avoid timezone shifts
        let cleanDate = dateStr;
        if (cleanDate.includes(' ')) {
            cleanDate = cleanDate.split(' ')[1].includes(':') ? cleanDate.split(' ')[0] : cleanDate;
        } else if (cleanDate.includes('T')) {
            cleanDate = cleanDate.split('T')[0];
        }

        // 2. Intercept DD/MM/YYYY and convert to YYYY-MM-DD
        if (cleanDate.includes('/') && cleanDate.split('/').length === 3) {
            const parts = cleanDate.split('/');
            if (parts[0].length === 2 && parts[2].length === 4) {
                cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        // 3. Create date at midday to avoid day jumps
        const d = new Date(`${cleanDate}T12:00:00`);
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

export const generateFinancialTransactions = (
    appointments: Appointment[],
    sales: Sale[],
    expenses: Expense[],
    services: Service[],
    customers: Customer[],
    providers: Provider[],
    suppliers: Supplier[],
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

        const mainBooked = (bookedPrice || service?.price || 0) * quantity;
        const extrasList = (app.additionalServices || []).map(extra => {
            const extraRaw = extra as any;
            const extraS = services.find(s => s.id === extra.serviceId);
            const extraQty = Number(extra.quantity ?? extraRaw.quantity ?? 1);
            return {
                ...extra,
                bookedPrice: (extra.bookedPrice ?? extraRaw.booked_price ?? extraS?.price ?? 0) * extraQty,
                serviceName: extraS?.name || 'Serviço Extra'
            };
        });
        const totalBooked = mainBooked + extrasList.reduce((acc, e) => acc + e.bookedPrice, 0);

        const actualTotalRevenue = (app.status === 'Concluído' && pricePaid !== undefined && pricePaid !== null)
            ? (pricePaid - tipAmount)
            : totalBooked;

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
            isReconciled: app.isReconciled
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
                isReconciled: app.isReconciled
            });
        });

        // Price Discrepancy is now distributed into the service lines themselves
        /*
        const priceDiscrepancy = actualTotalRevenue - totalBooked;
        if (app.status === 'Concluído' && Math.abs(priceDiscrepancy) > 0.01) {
            ...
        }
        */

        // Card Fees
        if (fee > 0 && actualTotalRevenue > 0) {
            allTrans.push({
                id: `app-fee-${app.id}`,
                date: settlementDate,
                type: 'DESPESA',
                category: 'Taxas de Cartão',
                description: `Taxa ${paymentMethodName} - Ref: ${customer?.name || 'Cliente'}`,
                amount: actualTotalRevenue * (fee / 100),
                status: status,
                paymentMethod: paymentMethodName,
                origin: 'Despesa',
                providerName: provider?.name || 'Não atribuído',
                customerName: customer?.name || 'Desconhecido',
                customerOrProviderName: customer?.name || 'Desconhecido',
                appointmentDate: app.date,
                isReconciled: app.isReconciled
            });
        }

        // --- ANTICIPATION FEES ---
        // Apply anticipation for credit cards if enabled for that date
        const isCredit = paymentMethodName.toLowerCase().includes('crédito');
        const antRate = getAnticipationRate(app.date, financialConfigs);
        if (isCredit && antRate > 0 && actualTotalRevenue > 0) {
            allTrans.push({
                id: `app-ant-fee-${app.id}`,
                date: settlementDate,
                type: 'DESPESA',
                category: 'Taxas de Antecipação',
                description: `Antecipação ${paymentMethodName} (${antRate}%) - Ref: ${customer?.name || 'Cliente'}`,
                amount: actualTotalRevenue * (antRate / 100),
                status: status,
                paymentMethod: paymentMethodName,
                origin: 'Despesa',
                providerName: provider?.name || 'Não atribuído',
                customerName: customer?.name || 'Desconhecido',
                customerOrProviderName: customer?.name || 'Desconhecido',
                appointmentDate: app.date,
                isReconciled: app.isReconciled
            });
        }

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
                isReconciled: app.isReconciled
            });
        }

        // --- COMMISSIONS ---
        if (provider) {
            const commissionRateSnapshot = app.commissionRateSnapshot ?? rawApp.commission_rate_snapshot;
            const rate = commissionRateSnapshot ?? provider.commissionRate;
            
            // Calculate proportional revenue for this line
            const mainRevenueAmount = totalBooked > 0 ? (mainBooked / totalBooked) * actualTotalRevenue : 0;
            const commissionLiquidBase = mainRevenueAmount * (1 - (fee / 100));
            const commissionAmount = commissionLiquidBase * rate;
            const commissionDate = getCommissionDate(baseDate);

            allTrans.push({
                id: `comm-main-${app.id}`,
                date: commissionDate,
                type: 'DESPESA',
                category: 'Repasse Comissão',
                description: `Repasse - ${provider.name.split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                amount: commissionAmount,
                status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                paymentMethod: 'Transferência',
                origin: 'Despesa',
                customerOrProviderName: provider.name,
                providerName: provider.name,
                customerName: customer?.name || 'Desconhecido',
                serviceName: `Comissão: ${service?.name || 'Serviço'}`,
                appointmentDate: app.date
            });
        }

        // Additional Services Commissions
        if (app.additionalServices && app.additionalServices.length > 0) {
            app.additionalServices.forEach((extra, idx) => {
                const extraProvider = providers.find(p => p.id === extra.providerId);
                const extraService = services.find(s => s.id === extra.serviceId);
                if (extraProvider) {
                    const rawExtra = extra as any;
                    const extraRateSnapshot = extra.commissionRateSnapshot ?? rawExtra.commission_rate_snapshot;
                    const rate = extraRateSnapshot ?? extraProvider.commissionRate;
                    
                    // Calculate proportional revenue for this extra line
                    const extraBookedPrice = extra.bookedPrice; // Already multiplied by quantity above
                    const extraRevenueAmount = totalBooked > 0 ? (extraBookedPrice / totalBooked) * actualTotalRevenue : 0;
                    const commissionLiquidBase = extraRevenueAmount * (1 - (fee / 100));
                    const commissionAmount = commissionLiquidBase * rate;
                    const commissionDate = getCommissionDate(baseDate);

                    allTrans.push({
                        id: `comm-extra-${app.id}-${idx}`,
                        date: commissionDate,
                        type: 'DESPESA',
                        category: 'Repasse Comissão',
                        description: `Repasse Extra - ${extraProvider.name.split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                        amount: commissionAmount,
                        status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                        paymentMethod: 'Transferência',
                        origin: 'Despesa',
                        customerOrProviderName: extraProvider.name,
                        providerName: extraProvider.name,
                        customerName: customer?.name || 'Desconhecido',
                        serviceName: `Comissão: ${extraService?.name || 'Serviço'}`,
                        appointmentDate: app.date
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
            isReconciled: sale.isReconciled
        });

        // Automated Card Fee for Sales
        if (fee > 0 && grossAmount > 0) {
            allTrans.push({
                id: `sale-fee-${sale.id}`,
                date: settlementDate,
                type: 'DESPESA',
                category: 'Taxas de Cartão',
                description: `Taxa ${paymentMethodName} - Ref: Venda de Produto`,
                amount: grossAmount * (fee / 100),
                status: status,
                paymentMethod: paymentMethodName,
                origin: 'Outro',
                appointmentDate: sale.date,
                isReconciled: sale.isReconciled
            });
        }
    });

    expenses.forEach(exp => {
        const supplier = suppliers.find(s => s.id === exp.supplierId);
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
            customerOrProviderName: supplier?.name || '',
            // Use exp.id as providerName so that DB expense records with category 'Repasse Comissão'
            // are never merged together in the commission grouping step below.
            // Appointment-generated commissions use real provider names, DB expenses use UUIDs → no collision.
            providerName: exp.id,
            supplierId: exp.supplierId,
            isReconciled: exp.isReconciled
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
    const totalAnticipationFees = dailyRelTrans.filter(t => t.category === 'Taxas de Antecipação').reduce((acc, t) => acc + t.amount, 0);
    const totalRevenue = totalServices + totalProducts + totalTips + totalAjustes - totalAnticipationFees;

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
