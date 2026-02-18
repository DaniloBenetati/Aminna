import { Appointment, Service, Customer, Provider, CommissionSetting, PaymentSetting, FinancialTransaction, Sale, Expense } from '../types';

export const toLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const parseDateSafe = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date();
    try {
        const str = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
        const d = new Date(str);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
        return new Date();
    }
};

export const generateFinancialTransactions = (
    appointments: Appointment[],
    sales: Sale[],
    expenses: Expense[],
    services: Service[],
    customers: Customer[],
    providers: Provider[],
    commissionSettings: CommissionSetting[],
    paymentSettings: PaymentSetting[]
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
        const tipAmount = Number(app.tipAmount ?? rawApp.tip_amount ?? 0);

        let paymentMethodName = app.paymentMethod || rawApp.payment_method || 'Pix';
        const { fee, days } = getPaymentDetails(paymentMethodName);

        const paymentDate = app.paymentDate || rawApp.payment_date;
        const baseDate = (app.status === 'Concluído' && paymentDate) ? paymentDate : app.date;
        const settlementDate = addDays(baseDate, days);

        let status: 'Pago' | 'Previsto' | 'Atrasado' = 'Previsto';
        if (app.status === 'Concluído') {
            status = settlementDate <= todayStr ? 'Pago' : 'Previsto';
        } else if (app.date < todayStr) {
            status = 'Atrasado';
        }

        const mainBooked = bookedPrice || service?.price || 0;
        const extrasList = (app.additionalServices || []).map(extra => {
            const extraRaw = extra as any;
            const extraS = services.find(s => s.id === extra.serviceId);
            return {
                ...extra,
                bookedPrice: extra.bookedPrice ?? extraRaw.booked_price ?? extraS?.price ?? 0,
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
            amount: mainBooked,
            status: status,
            paymentMethod: app.status === 'Concluído' && mainBooked === 0 ? 'Cortesia' : paymentMethodName,
            origin: 'Serviço',
            customerOrProviderName: customer?.name || 'Cliente',
            providerName: provider?.name || 'Não atribuído',
            customerName: customer?.name || 'Desconhecido',
            serviceName: service?.name || 'Serviço',
            appointmentDate: app.date
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
                amount: extra.bookedPrice,
                status: status,
                paymentMethod: app.status === 'Concluído' && extra.bookedPrice === 0 ? 'Cortesia' : paymentMethodName,
                origin: 'Serviço',
                customerOrProviderName: customer?.name || 'Cliente',
                providerName: extraProv?.name || 'Não atribuído',
                customerName: customer?.name || 'Desconhecido',
                serviceName: extra.serviceName,
                appointmentDate: app.date
            });
        });

        // Price Discrepancy (Discount/Extra)
        const priceDiscrepancy = actualTotalRevenue - totalBooked;
        if (app.status === 'Concluído' && Math.abs(priceDiscrepancy) > 0.01) {
            allTrans.push({
                id: `app-adj-${app.id}`,
                date: settlementDate,
                type: priceDiscrepancy > 0 ? 'RECEITA' : 'DESPESA',
                category: 'Ajuste de Valor',
                description: priceDiscrepancy > 0 ? `Acréscimo - ${customer?.name}` : `Desconto - ${customer?.name}`,
                amount: Math.abs(priceDiscrepancy),
                status: status,
                paymentMethod: paymentMethodName,
                origin: 'Outro',
                customerOrProviderName: customer?.name || 'Cliente',
                providerName: provider?.name || 'Não atribuído', // Linked to main professional
                customerName: customer?.name || 'Desconhecido',
                serviceName: priceDiscrepancy > 0 ? 'Acréscimo de Valor' : 'Desconto Concedido',
                appointmentDate: app.date
            });
        }

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
                origin: 'Outro',
                providerName: provider?.name || 'Não atribuído',
                customerName: customer?.name || 'Desconhecido',
                appointmentDate: app.date
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
                appointmentDate: app.date
            });
        }

        // --- COMMISSIONS ---
        if (provider) {
            const commissionRateSnapshot = app.commissionRateSnapshot ?? rawApp.commission_rate_snapshot;
            const rate = commissionRateSnapshot ?? provider.commissionRate;
            const mainServiceBookedPrice = bookedPrice || service?.price || 0;
            const commissionLiquidBase = mainServiceBookedPrice * (1 - (fee / 100));
            const commissionAmount = commissionLiquidBase * rate;
            const commissionDate = getCommissionDate(baseDate);

            allTrans.push({
                id: `comm-main-${app.id}`,
                date: commissionDate,
                type: 'DESPESA',
                category: 'Comissão',
                description: `Repasse - ${provider.name.split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                amount: commissionAmount,
                status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                paymentMethod: 'Transferência',
                origin: 'Outro',
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
                    const extraBooked = extra.bookedPrice ?? rawExtra.booked_price;
                    const extraBookedPrice = extraBooked || extraService?.price || 0;
                    const commissionLiquidBase = extraBookedPrice * (1 - (fee / 100));
                    const commissionAmount = commissionLiquidBase * rate;
                    const commissionDate = getCommissionDate(baseDate);

                    allTrans.push({
                        id: `comm-extra-${app.id}-${idx}`,
                        date: commissionDate,
                        type: 'DESPESA',
                        category: 'Comissão',
                        description: `Repasse Extra - ${extraProvider.name.split(' ')[0]} (${(rate * 100).toFixed(0)}%) - ${customer?.name || 'Cliente'}`,
                        amount: commissionAmount,
                        status: app.status === 'Concluído' ? (commissionDate <= todayStr ? 'Pago' : 'Pendente') : 'Previsto',
                        paymentMethod: 'Transferência',
                        origin: 'Outro',
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
        const settlementDate = addDays(sale.date, days);

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
            appointmentDate: sale.date
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
                appointmentDate: sale.date
            });
        }
    });

    expenses.forEach(exp => {
        allTrans.push({
            id: exp.id,
            date: exp.date,
            type: 'DESPESA',
            category: exp.category,
            description: exp.description,
            amount: exp.amount,
            status: exp.status === 'Pago' ? 'Pago' : 'Pendente',
            paymentMethod: exp.paymentMethod || 'Dinheiro',
            origin: 'Despesa'
        });
    });

    return allTrans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const calculateDailySummary = (dailyRelTrans: FinancialTransaction[]) => {
    const totalServices = dailyRelTrans.filter(t => t.origin === 'Serviço').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
    const totalProducts = dailyRelTrans.filter(t => t.origin === 'Produto').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
    const totalAjustes = dailyRelTrans.filter(t => t.category === 'Ajuste de Valor').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
    const totalTips = dailyRelTrans.filter(t => t.category === 'Caixinha').reduce((acc, t) => acc + t.amount, 0);
    const totalRevenue = totalServices + totalProducts + totalTips + totalAjustes;

    return {
        totalServices,
        totalProducts,
        totalAjustes,
        totalTips,
        totalRevenue,
        servicesWithTips: totalServices + totalTips
    };
};

