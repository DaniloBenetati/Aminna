
import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Check, Star, Smartphone, Trash2, Search, CreditCard, Wallet, AlertOctagon, Edit3, Package, PencilLine, Tag, Sparkles, Calendar, AlertTriangle, Ban, Save, XCircle, ArrowRight, CheckCircle2, User, Landmark, Banknote, Ticket, ChevronDown, ChevronLeft, FileText, Clock } from 'lucide-react';
import { Appointment, Customer, CustomerHistoryItem, Service, Campaign, PaymentSetting, Provider, StockItem, PaymentInfo } from '../types';
import { Avatar } from './Avatar';
import { CustomerEditModal } from './CustomerEditModal';
import { supabase } from '../services/supabase';
import { focusNfeService } from '../services/focusNfeService';

interface ServiceLine {
    id: string;
    serviceId: string;
    providerId: string;
    products: string[];
    currentSearchTerm: string;
    discount: number;
    isCourtesy: boolean;
    showProductResults: boolean;
    rating: number;
    feedback: string;
    isEditingInCheckout?: boolean;
    unitPrice: number;
    startTime: string;
    parentAppointmentId: string;
}

interface ServiceModalProps {
    appointment: Appointment;
    allAppointments: Appointment[];
    customer: Customer;
    onClose: () => void;
    onUpdateAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    onUpdateCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    onSelectAppointment?: (appointment: Appointment) => void;
    services: Service[];
    campaigns: Campaign[];
    source?: 'AGENDA' | 'DAILY';
    paymentSettings: PaymentSetting[];
    providers: Provider[];
    stock: StockItem[];
    customers: Customer[];
    onNavigateToCustomer?: () => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
    appointment,
    allAppointments,
    customer,
    onClose,
    onUpdateAppointments,
    onUpdateCustomers,
    onSelectAppointment,
    services,
    campaigns,
    source = 'DAILY',
    paymentSettings,
    providers,
    stock,
    customers,
    onNavigateToCustomer
}) => {
    const [status, setStatus] = useState<Appointment['status']>(appointment.status);
    const [paymentMethod, setPaymentMethod] = useState(appointment.paymentMethod || 'Pix');
    const [payments, setPayments] = useState<PaymentInfo[]>(appointment.payments || []);
    const [lines, setLines] = useState<ServiceLine[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<string>(appointment.appliedCoupon || '');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
    const [recurrenceCount, setRecurrenceCount] = useState(4);

    const [appointmentTime, setAppointmentTime] = useState(appointment.time);
    const [appointmentDate, setAppointmentDate] = useState(appointment.date);

    const [couponCode, setCouponCode] = useState(appointment.appliedCoupon || '');
    const [appliedCampaign, setAppliedCampaign] = useState<Campaign | null>(() => {
        return campaigns.find(c => c.couponCode === appointment.appliedCoupon) || null;
    });

    const [isCancelling, setIsCancelling] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [includeDebt, setIncludeDebt] = useState(!!customer.outstandingBalance && customer.outstandingBalance > 0);
    const [showDebtConfirmModal, setShowDebtConfirmModal] = useState(false);

    // NFSe State
    const [nfseStatus, setNfseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [nfseError, setNfseError] = useState<string | null>(null);
    const [nfseData, setNfseData] = useState<any>(null);
    const [showCpfPrompt, setShowCpfPrompt] = useState(false);
    const [tempCpf, setTempCpf] = useState('');
    const [isCustomerEditModalOpen, setIsCustomerEditModalOpen] = useState(false);

    const [mode, setMode] = useState<'VIEW' | 'CHECKOUT' | 'CANCEL' | 'HISTORY' | 'EDIT_HISTORY'>(() => {
        if (appointment.status === 'Concluído') return 'HISTORY';
        if (appointment.status === 'Em Andamento' && source === 'DAILY') return 'CHECKOUT';
        return 'VIEW';
    });

    const futureAppointments = useMemo(() => {
        // Use local date for comparison to avoid timezone issues with toISOString()
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        return allAppointments
            .filter(a => {
                if (a.id === appointment.id) return false;
                if (a.customerId !== customer.id) return false;
                if (a.status === 'Cancelado') return false;
                if (a.status === 'Concluído') return false;
                // Consider same day appointments as "future" if they are literally later, but usually date comparison is safer
                return a.date >= todayStr;
            })
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }, [allAppointments, customer.id, appointment.id]);

    useEffect(() => {
        setStatus(appointment.status);
        setAppointmentTime(appointment.time);
        setAppointmentDate(appointment.date);
        setAppliedCoupon(appointment.appliedCoupon || '');
        setCouponCode(appointment.appliedCoupon || '');
        setAppliedCampaign(campaigns.find(c => c.couponCode === appointment.appliedCoupon) || null);
        setIsCancelling(false);
        setCancellationReason('');
        setIncludeDebt(!!customer.outstandingBalance && customer.outstandingBalance > 0);

        if (appointment.status === 'Concluído') setMode('HISTORY');
        else if (appointment.status === 'Em Andamento' && source === 'DAILY') setMode('CHECKOUT');
        else setMode('VIEW');

        // Grouping: find all appointments for this customer on this same date
        const relatedSameDay = allAppointments.filter(a =>
            a.customerId === appointment.customerId &&
            a.date === appointment.date &&
            a.status !== 'Cancelado'
        ).sort((a, b) => a.time.localeCompare(b.time));

        const initialLines: ServiceLine[] = [];

        relatedSameDay.forEach((appt) => {
            const mainService = services.find(s => s.id === appt.serviceId);
            initialLines.push({
                id: `main-${appt.id}`,
                serviceId: appt.serviceId,
                providerId: appt.providerId,
                products: appt.mainServiceProducts || [],
                currentSearchTerm: '',
                discount: appt.discountAmount || 0,
                isCourtesy: appt.isCourtesy || false,
                showProductResults: false,
                rating: 5,
                feedback: '',
                unitPrice: appt.bookedPrice || mainService?.price || 0,
                startTime: appt.time,
                parentAppointmentId: appt.id
            });

            if (appt.additionalServices) {
                appt.additionalServices.forEach((extra, idx) => {
                    initialLines.push({
                        id: `extra-${appt.id}-${idx}`,
                        serviceId: extra.serviceId,
                        providerId: extra.providerId,
                        products: extra.products || [],
                        currentSearchTerm: '',
                        discount: extra.discount,
                        isCourtesy: extra.isCourtesy,
                        showProductResults: false,
                        rating: 5,
                        feedback: '',
                        unitPrice: extra.bookedPrice || services.find(s => s.id === extra.serviceId)?.price || 0,
                        startTime: extra.startTime || appt.time,
                        parentAppointmentId: appt.id
                    });
                });
            }
        });

        setLines(initialLines);
        setPayments(appointment.payments || [{ id: '1', method: appointment.paymentMethod || 'Pix', amount: 0 }]);

        // Fetch existing NFSe
        const fetchNFSe = async () => {
            if (!appointment.id) return;
            const { data, error } = await supabase
                .from('nfse_records')
                .select('*')
                .eq('appointment_id', appointment.id)
                .maybeSingle();

            if (data) {
                setNfseData(data);
                if (data.status === 'issued') setNfseStatus('success');
                else if (data.status === 'processing') setNfseStatus('loading');
                else if (data.status === 'error') {
                    setNfseStatus('error');
                    setNfseError(data.error_message);
                }
            }
        };
        fetchNFSe();
    }, [appointment, services, campaigns, source, allAppointments, customers]);

    const totalPaid = useMemo(() => {
        return payments.reduce((acc, p) => acc + p.amount, 0);
    }, [payments]);

    const addPayment = () => {
        const remaining = totalValue - totalPaid;
        setPayments([...payments, {
            id: Date.now().toString(),
            method: paymentSettings[0]?.method || 'Pix',
            amount: Math.max(0, remaining)
        }]);
    };

    const removePayment = (id: string) => {
        if (payments.length <= 1) return;
        setPayments(payments.filter(p => p.id !== id));
    };

    const updatePayment = (id: string, field: keyof PaymentInfo, value: any) => {
        if (field === 'amount' && payments.length === 2) {
            const val = parseFloat(value) || 0;
            const otherPayment = payments.find(p => p.id !== id);
            if (otherPayment) {
                const remaining = Math.max(0, totalValue - val);
                // Update both
                setPayments(payments.map(p => {
                    if (p.id === id) return { ...p, amount: val };
                    if (p.id === otherPayment.id) return { ...p, amount: remaining };
                    return p;
                }));
                return;
            }
        }
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const totalValue = useMemo(() => {
        let total = 0;
        lines.forEach(line => {
            if (!line.isCourtesy) {
                total += line.unitPrice - (line.discount || 0);
            }
        });

        if (appliedCampaign) {
            if (appliedCampaign.discountType === 'FIXED') total -= appliedCampaign.discountValue;
            else total -= total * (appliedCampaign.discountValue / 100);
        }

        if (includeDebt && customer.outstandingBalance && customer.outstandingBalance > 0) {
            total += customer.outstandingBalance;
        }

        return Math.max(0, total);
    }, [lines, appliedCampaign, includeDebt, customer.outstandingBalance]);

    const isGrouped = useMemo(() => {
        const ids = new Set(lines.map(l => l.parentAppointmentId).filter(id => id && id !== ''));
        return ids.size > 1;
    }, [lines]);

    // Auto-fill payment amount if single payment method
    useEffect(() => {
        // "quando entrar na tela de pagamento o valor total já deve estar preenchido, só mude se eu selecionar mais de uma opção de pagamento"
        if (payments.length === 1) {
            // Only update if difference is significant to avoid infinite loops with float precision
            if (Math.abs(payments[0].amount - totalValue) > 0.01) {
                setPayments(prev => [{ ...prev[0], amount: totalValue }]);
            }
        }
    }, [totalValue, payments.length, payments]); // payments dependency is needed to check amount, but length check protects logic

    const totalBeforeCoupon = useMemo(() => {
        return lines.reduce((acc, line) => acc + (line.isCourtesy ? 0 : (line.unitPrice - line.discount)), 0);
    }, [lines]);

    const couponDiscountAmount = useMemo(() => {
        if (!appliedCampaign) return 0;
        if (appliedCampaign.discountType === 'PERCENTAGE') {
            return totalBeforeCoupon * (appliedCampaign.discountValue / 100);
        }
        return appliedCampaign.discountValue;
    }, [totalBeforeCoupon, appliedCampaign]);

    const restrictionData = useMemo(() => {
        const restrictedLine = lines.find(line => customer.restrictedProviderIds?.includes(line.providerId));

        if (restrictedLine) {
            const provider = providers.find(p => p.id === restrictedLine.providerId);
            const reasonEntry = (customer.history || [])
                .filter(h => h.type === 'RESTRICTION' && h.providerId === restrictedLine.providerId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            return {
                isRestricted: true,
                providerName: provider?.name || 'Profissional',
                reason: reasonEntry?.details || 'Motivo não registrado.'
            };
        }
        return { isRestricted: false, providerName: '', reason: '' };
    }, [lines, customer]);

    const handleCheckConflict = () => {
        const currentProviderIds = new Set(lines.map(l => l.providerId));

        const conflictingAppt = allAppointments.find(a => {
            if (a.id === appointment.id) return false;
            // Normalize time to HH:mm for comparison
            const apptTime = a.time.slice(0, 5);
            const currentTime = appointmentTime.slice(0, 5);

            if (a.date !== appointmentDate || apptTime !== currentTime) return false;
            if (a.status === 'Cancelado') return false;

            // 1. Conflict: Same professional
            const isProvBusy = currentProviderIds.has(a.providerId) ||
                a.additionalServices?.some(extra => currentProviderIds.has(extra.providerId));

            return isProvBusy;
        });

        if (conflictingAppt) {
            // Case: Professional is busy with another client
            const conflictingProvider = providers.find(p => p.id === conflictingAppt.providerId);
            alert(`⚠️ CONFLITO DE PROFISSIONAL\n\n${conflictingProvider?.name || 'A profissional'} já está ocupada neste horário.\n\nPor favor, escolha outro horário ou profissional.`);
            return true;
        }
        return false;
        return false;
    };

    const performMerge = async (targetAppt: Appointment) => {
        setIsSaving(true);
        try {
            // 1. Prepare new extras from current lines
            // Convert current lines (including main) to extras format
            const newExtras = lines.map(l => ({
                serviceId: l.serviceId,
                providerId: l.providerId,
                isCourtesy: l.isCourtesy,
                discount: l.discount,
                bookedPrice: l.unitPrice,
                products: l.products
            }));

            // 2. Combine with target's existing extras
            const updatedExtras = [
                ...(targetAppt.additionalServices || []),
                ...newExtras
            ];

            // 3. Update target appointment
            const combinedNames = [
                targetAppt.combinedServiceNames || services.find(s => s.id === targetAppt.serviceId)?.name,
                ...lines.map(l => services.find(s => s.id === l.serviceId)?.name)
            ].join(' + ');

            const { error: updateError } = await supabase.from('appointments').update({
                additional_services: updatedExtras,
                combined_service_names: combinedNames
            }).eq('id', targetAppt.id);

            if (updateError) throw updateError;

            // 4. Delete current appointment if it exists (not new)
            // Identify if current appointment is persisted
            const isPersisted = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointment.id);
            if (isPersisted) {
                const { error: delError } = await supabase.from('appointments').delete().eq('id', appointment.id);
                if (delError) throw delError;
            }

            // 5. Update local state via callback
            onUpdateAppointments(prev => {
                // Remove current if existed
                let list = isPersisted ? prev.filter(a => a.id !== appointment.id) : prev;

                // Update target
                list = list.map(a => {
                    if (a.id === targetAppt.id) {
                        return {
                            ...a,
                            additionalServices: updatedExtras,
                            combinedServiceNames: combinedNames
                        };
                    }
                    return a;
                });
                return list;
            });

            alert('Agendamentos unificados com sucesso!');
            onClose();
            return true;

        } catch (error) {
            console.error('Error merging appointments:', error);
            alert('Erro ao unir agendamentos.');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const checkForCustomerConflictAndMerge = async () => {
        const concurrentAppt = allAppointments.find(a => {
            if (a.id === appointment.id) return false;
            if (a.customerId !== customer.id) return false;

            // Normalize time
            const apptTime = a.time.slice(0, 5);
            const currentTime = appointmentTime.slice(0, 5);

            if (a.date !== appointmentDate || apptTime !== currentTime) return false;
            if (a.status === 'Cancelado' || a.status === 'Concluído') return false;

            return true;
        });

        if (concurrentAppt) {
            const providerName = providers.find(p => p.id === concurrentAppt.providerId)?.name || 'Profissional';
            const confirmMerge = window.confirm(`A cliente ${customer.name} já tem um agendamento às ${appointmentTime} com ${providerName}.\n\nDeseja JUNTAR este serviço ao agendamento existente?`);

            if (confirmMerge) {
                return await performMerge(concurrentAppt);
            }
        }
        return false; // User declined merge or no conflict, proceed with normal save
    };

    const handleApplyCoupon = () => {
        const campaign = campaigns.find(c => c.couponCode === couponCode.toUpperCase());
        if (campaign) {
            if (campaign.useCount >= campaign.maxUses) {
                alert('Este cupom atingiu o limite máximo de usos.');
                return;
            }
            setAppliedCampaign(campaign);
        } else {
            alert('Cupom inválido ou expirado.');
            setAppliedCampaign(null);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCampaign(null);
        setCouponCode('');
    };

    const handleStartService = async () => {
        if (isSaving || restrictionData.isRestricted || handleCheckConflict()) return;

        // Check for merge possibility
        if (await checkForCustomerConflictAndMerge()) return;

        setIsSaving(true);

        const combinedNames = lines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
        const extras = lines.slice(1).map(l => ({
            serviceId: l.serviceId,
            providerId: l.providerId,
            isCourtesy: l.isCourtesy,
            discount: l.discount,
            bookedPrice: l.unitPrice,
            products: l.products,
            startTime: l.startTime
        }));

        const dataToSave = {
            status: 'Em Andamento',
            time: lines[0].startTime, // Use the start time of the first service as the main appointment time
            date: appointmentDate,
            combined_service_names: combinedNames,
            service_id: lines[0].serviceId,
            provider_id: lines[0].providerId,
            booked_price: lines[0].unitPrice,
            main_service_products: lines[0].products,
            additional_services: extras,
            applied_coupon: appliedCampaign?.couponCode,
            discount_amount: couponDiscountAmount,
            customer_id: customer.id,
            payments: payments
        };

        try {
            const isNew = !/^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointment.id);
            let result;

            if (isNew) {
                result = await supabase.from('appointments').insert([dataToSave]).select().single();
            } else {
                result = await supabase.from('appointments').update(dataToSave).eq('id', appointment.id).select().single();
            }

            if (result.error) throw result.error;
            const savedAppt = result.data;

            // Auto-start next appointment for same customer on same day
            const nextAppointment = allAppointments
                .filter(a =>
                    a.id !== appointment.id &&
                    a.customerId === customer.id &&
                    a.date === appointmentDate &&
                    (a.status === 'Pendente' || a.status === 'Confirmado') &&
                    a.time > lines[0].startTime
                )
                .sort((a, b) => a.time.localeCompare(b.time))[0];

            if (nextAppointment) {
                await supabase.from('appointments').update({
                    status: 'Em Andamento'
                }).eq('id', nextAppointment.id);
            }

            onUpdateAppointments(prev => {
                const updatedAppt = {
                    ...appointment,
                    id: savedAppt.id, // Ensure we use the real DB ID
                    status: 'Em Andamento',
                    time: lines[0].startTime,
                    date: appointmentDate,
                    combinedServiceNames: combinedNames,
                    bookedPrice: lines[0].unitPrice,
                    mainServiceProducts: lines[0].products,
                    additionalServices: extras,
                    appliedCoupon: appliedCampaign?.couponCode,
                    discountAmount: couponDiscountAmount,
                    payments: payments
                } as Appointment;

                let updated = prev;

                if (!isNew) {
                    updated = prev.map(a => a.id === appointment.id ? updatedAppt : a);
                } else {
                    // Remove temp ID if it exists and add new, or just add new
                    // If isNew, the previous ID was local. We should remove the local draft if it was in the list?
                    // Usually 'Novo' appointments aren't in the list yet? 
                    // Actually handleNewAppointment sets draft, doesn't add to list. 
                    // But if checking conflict added it? No.
                    // safely add to list.
                    // Check if we need to replace a temp one:
                    const filtered = prev.filter(a => a.id !== appointment.id);
                    updated = [...filtered, updatedAppt];
                }

                // Update next appointment status if it exists
                if (nextAppointment) {
                    updated = updated.map(a =>
                        a.id === nextAppointment.id
                            ? { ...a, status: 'Em Andamento' }
                            : a
                    );
                }

                return updated;
            });
            onClose();
        } catch (error) {
            console.error('Error starting service:', error);
            alert('Erro ao iniciar atendimento no banco de dados.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinishService = async () => {
        if (isSaving || restrictionData.isRestricted || customer.isBlocked || handleCheckConflict()) return;

        if (Math.abs(totalPaid - totalValue) > 0.01) {
            alert(`⚠️ Divergência de Valores\n\nTotal a Pagar: R$ ${totalValue.toFixed(2)}\nTotal Informado: R$ ${totalPaid.toFixed(2)}\n\nPor favor, ajuste os pagamentos para igualar o total.`);
            return;
        }

        // Check merge (though unlikely in finish flow, better safe)
        if (await checkForCustomerConflictAndMerge()) return;

        setIsSaving(true);

        const dischargeDate = new Date().toISOString().split('T')[0];
        const allProductsUsed = lines.flatMap(l => l.products);

        // Group lines by parentAppointmentId
        const appointmentGroups = new Map<string, ServiceLine[]>();
        lines.forEach(line => {
            const apptId = line.parentAppointmentId || appointment.id;
            const list = appointmentGroups.get(apptId) || [];
            list.push(line);
            appointmentGroups.set(apptId, list);
        });

        try {
            // 1. Update all related appointments
            for (const [apptId, apptLines] of appointmentGroups.entries()) {
                const isMainAppt = apptId === appointment.id;
                const combinedNames = apptLines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
                const mainLine = apptLines[0];
                const extras = apptLines.slice(1).map(l => ({
                    serviceId: l.serviceId,
                    providerId: l.providerId,
                    isCourtesy: l.isCourtesy,
                    discount: l.discount,
                    bookedPrice: l.unitPrice,
                    products: l.products,
                    startTime: l.startTime
                }));

                const updatedData = {
                    status: 'Concluído',
                    price_paid: isMainAppt ? totalValue : 0,
                    payment_date: dischargeDate,
                    payment_method: isMainAppt ? (payments.length > 1 ? 'Múltiplos' : (payments[0]?.method || paymentMethod)) : 'Agrupado',
                    products_used: apptLines.flatMap(l => l.products),
                    combined_service_names: combinedNames,
                    service_id: mainLine.serviceId,
                    provider_id: mainLine.providerId,
                    booked_price: mainLine.unitPrice,
                    main_service_products: mainLine.products,
                    additional_services: extras,
                    applied_coupon: isMainAppt ? appliedCampaign?.couponCode : null,
                    discount_amount: isMainAppt ? couponDiscountAmount : 0,
                    payments: isMainAppt ? payments : []
                };

                const { error: apptError } = await supabase.from('appointments').update(updatedData).eq('id', apptId);
                if (apptError) throw apptError;
            }

            // 2. Create Sale Record REMOVED (Prevents DRE duplication)
            // The appointment record itself is sufficient for Service revenue.

            // 3. Update Customer History (handled locally for now, assuming App.tsx will refetch on next load)
            // Currently App.tsx fetches history from 'customers' table? 
            // Actually, customers table in Supabase doesn't have a 'history' JSONB yet in my plan, 
            // but the UI uses it. Let's assume we update the customer's totals in DB.
            // 3. Update Customer History and Balance
            let newOutstandingBalance = customer.outstandingBalance || 0;

            // If paying debt, reduce it (but ensure it doesn't go below zero if strict)
            if (includeDebt) {
                newOutstandingBalance = 0; // Paying off total debt
            }

            const { error: custError } = await supabase.from('customers').update({
                last_visit: dischargeDate,
                total_spent: customer.totalSpent + totalValue,
                outstanding_balance: newOutstandingBalance
            }).eq('id', customer.id);
            if (custError) throw custError;

            onUpdateAppointments(prev => {
                let updated = prev;
                for (const [apptId, apptLines] of appointmentGroups.entries()) {
                    const isMainAppt = apptId === appointment.id;
                    const combinedNames = apptLines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
                    const mainLine = apptLines[0];
                    const extras = apptLines.slice(1).map(l => ({
                        serviceId: l.serviceId,
                        providerId: l.providerId,
                        isCourtesy: l.isCourtesy,
                        discount: l.discount,
                        bookedPrice: l.unitPrice,
                        products: l.products,
                        startTime: l.startTime
                    }));

                    const updatedAppt = {
                        ...(prev.find(a => a.id === apptId) || appointment),
                        id: apptId,
                        status: 'Concluído',
                        pricePaid: isMainAppt ? totalValue : 0,
                        paymentDate: dischargeDate,
                        paymentMethod: isMainAppt ? (payments.length > 1 ? 'Múltiplos' : (payments[0]?.method || paymentMethod)) : 'Agrupado',
                        productsUsed: apptLines.flatMap(l => l.products),
                        combinedServiceNames: combinedNames,
                        bookedPrice: mainLine.unitPrice,
                        mainServiceProducts: mainLine.products,
                        additionalServices: extras,
                        appliedCoupon: isMainAppt ? appliedCampaign?.couponCode : null,
                        discountAmount: isMainAppt ? couponDiscountAmount : 0,
                        payments: isMainAppt ? payments : []
                    } as Appointment;

                    updated = updated.map(a => a.id === apptId ? updatedAppt : a);
                }
                return updated;
            });

            onUpdateCustomers(prev => prev.map(c => {
                if (c.id === customer.id) {
                    const newEntries: CustomerHistoryItem[] = lines.map(line => {
                        const s = services.find(srv => srv.id === line.serviceId);
                        const lineIsMainAppt = line.parentAppointmentId === appointment.id;
                        return {
                            id: `${Date.now()}-${line.id}`,
                            date: dischargeDate,
                            type: 'VISIT',
                            description: `Serviço: ${s?.name} ${appliedCampaign ? `(Cupom: ${appliedCampaign.couponCode})` : ''}`,
                            details: `Pagamento: ${lineIsMainAppt ? paymentMethod : 'Agrupado'}${line.feedback ? ` | Feedback: ${line.feedback}` : ''}`,
                            rating: line.rating,
                            feedback: line.feedback,
                            providerId: line.providerId,
                            productsUsed: line.products
                        };
                    });

                    return {
                        ...c,
                        lastVisit: dischargeDate,
                        totalSpent: c.totalSpent + totalValue,
                        history: [...newEntries, ...c.history]
                    };
                }
                return c;
            }));

            onClose();
        } catch (error) {
            console.error('Error finishing service:', error);
            alert('Erro ao finalizar atendimento no banco de dados.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (isSaving || restrictionData.isRestricted || customer.isBlocked || handleCheckConflict()) return;

        // Check for merge
        if (await checkForCustomerConflictAndMerge()) return;

        setIsSaving(true);

        const appointmentGroups = new Map<string, ServiceLine[]>();
        lines.forEach(line => {
            const apptId = line.parentAppointmentId || appointment.id;
            const list = appointmentGroups.get(apptId) || [];
            list.push(line);
            appointmentGroups.set(apptId, list);
        });

        try {
            let allSavedResult: any[] = [];

            for (const [apptId, apptLines] of appointmentGroups.entries()) {
                const isMainAppt = apptId === appointment.id;
                const combinedNames = apptLines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
                const mainLine = apptLines[0];
                const extras = apptLines.slice(1).map(l => ({
                    serviceId: l.serviceId,
                    providerId: l.providerId,
                    isCourtesy: l.isCourtesy,
                    discount: l.discount,
                    bookedPrice: l.unitPrice,
                    products: l.products,
                    startTime: l.startTime
                }));

                const recId = isRecurring && isMainAppt ? `rec-${Date.now()}` : (isMainAppt ? appointment.recurrenceId : null);

                const dataToSave = {
                    time: mainLine.startTime,
                    date: appointmentDate,
                    status: status,
                    combined_service_names: combinedNames,
                    service_id: mainLine.serviceId,
                    provider_id: mainLine.providerId,
                    booked_price: mainLine.unitPrice,
                    main_service_products: mainLine.products,
                    additional_services: extras,
                    applied_coupon: isMainAppt ? appliedCoupon : null,
                    discount_amount: isMainAppt ? couponDiscountAmount : 0,
                    customer_id: customer.id,
                    payments: isMainAppt ? payments : [],
                    recurrence_id: recId,
                    price_paid: isMainAppt ? totalValue : 0,
                    payment_method: isMainAppt ? (payments.length > 1 ? 'Múltiplos' : (payments[0]?.method || paymentMethod)) : 'Agrupado',
                    payment_date: isMainAppt ? (appointment.paymentDate || appointmentDate) : null
                };

                const isNew = !/^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(apptId);

                let result;
                if (isNew) {
                    result = await supabase.from('appointments').insert([dataToSave]).select();
                } else {
                    result = await supabase.from('appointments').update(dataToSave).eq('id', apptId).select();
                }

                if (result.error) throw result.error;
                if (result.data) allSavedResult = [...allSavedResult, ...result.data];
            }

            let allSaved = allSavedResult;

            // --- HANDLE RECURRENCE (Main Appt Only) ---
            const mainSaved = allSaved.find(s => s.id === appointment.id) || allSaved[0];
            const isMainNew = !/^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointment.id);

            if (isRecurring && isMainNew && mainSaved) {
                const futureDates: string[] = [];
                let current = new Date(appointmentDate + 'T12:00:00');

                for (let i = 0; i < recurrenceCount; i++) {
                    if (recurrenceFrequency === 'WEEKLY') current.setDate(current.getDate() + 7);
                    else if (recurrenceFrequency === 'BIWEEKLY') current.setDate(current.getDate() + 14);
                    else if (recurrenceFrequency === 'MONTHLY') current.setMonth(current.getMonth() + 1);
                    futureDates.push(current.toISOString().split('T')[0]);
                }

                // We use the dataToSave from the main appointment
                const mainLines = lines.filter(l => (l.parentAppointmentId || appointment.id) === appointment.id);
                const combinedNames = mainLines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
                const extras = mainLines.slice(1).map(l => ({
                    serviceId: l.serviceId,
                    providerId: l.providerId,
                    isCourtesy: l.isCourtesy,
                    discount: l.discount,
                    bookedPrice: l.unitPrice,
                    products: l.products,
                    startTime: l.startTime
                }));

                const recurrenceDataToSave = {
                    time: mainLines[0].startTime,
                    date: appointmentDate, // Will be overridden
                    status: 'Pendente',
                    combined_service_names: combinedNames,
                    service_id: mainLines[0].serviceId,
                    provider_id: mainLines[0].providerId,
                    booked_price: mainLines[0].unitPrice,
                    main_service_products: mainLines[0].products,
                    additional_services: extras,
                    applied_coupon: appliedCoupon,
                    discount_amount: couponDiscountAmount,
                    customer_id: customer.id,
                    payments: [],
                    recurrence_id: mainSaved.recurrence_id,
                    price_paid: 0,
                    payment_method: null,
                    payment_date: null
                };

                const bulkData = futureDates.map(d => ({
                    ...recurrenceDataToSave,
                    date: d
                }));

                const { data: bulkSaved, error: bulkError } = await supabase.from('appointments').insert(bulkData).select();
                if (bulkError) console.error('Error creating future appointments:', bulkError);
                if (bulkSaved) allSaved = [...allSaved, ...bulkSaved];
            }

            onUpdateAppointments(prev => {
                let updated = prev;

                allSaved.forEach(s => {
                    const exists = prev.find(a => a.id === s.id);
                    const updatedAppt = {
                        ...(exists || appointment),
                        id: s.id,
                        customerId: s.customer_id,
                        providerId: s.provider_id,
                        serviceId: s.service_id,
                        time: s.time,
                        date: s.date,
                        status: s.status as any,
                        combinedServiceNames: s.combined_service_names,
                        bookedPrice: s.booked_price,
                        mainServiceProducts: s.main_service_products,
                        additionalServices: s.additional_services,
                        appliedCoupon: s.applied_coupon,
                        discountAmount: s.discount_amount,
                        pricePaid: s.price_paid,
                        paymentMethod: s.payment_method,
                        paymentDate: s.payment_date,
                        payments: s.payments || [],
                        recurrenceId: s.recurrence_id
                    } as Appointment;

                    if (exists) {
                        updated = updated.map(a => a.id === s.id ? updatedAppt : a);
                    } else {
                        updated = [...updated, updatedAppt];
                    }
                });

                return updated;
            });

            onClose();
            if (allSaved.length > appointmentGroups.size) {
                alert(`Agendamento e ${allSaved.length - appointmentGroups.size} repetições criados com sucesso!`);
            }
        } catch (error) {
            console.error('Error saving appointment:', error);
            alert('Erro ao salvar no banco de dados.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateDebt = async (forced = false) => {
        if (isSaving || restrictionData.isRestricted || customer.isBlocked || handleCheckConflict()) return;

        if (!forced) {
            setShowDebtConfirmModal(true);
            return;
        }

        setShowDebtConfirmModal(false);
        setIsSaving(true);

        try {
            const combinedNames = lines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
            const allProductsUsed = lines.flatMap(l => l.products);
            const extras = lines.slice(1).map(l => ({
                serviceId: l.serviceId,
                providerId: l.providerId,
                isCourtesy: l.isCourtesy,
                discount: l.discount,
                bookedPrice: l.unitPrice,
                products: l.products,
                startTime: l.startTime
            }));

            const dischargeDate = new Date().toISOString().split('T')[0];

            const updatedData = {
                status: 'Concluído',
                price_paid: 0, // Paid now is 0
                payment_date: dischargeDate,
                payment_method: 'Dívida',
                products_used: allProductsUsed,
                combined_service_names: combinedNames,
                booked_price: lines[0].unitPrice,
                main_service_products: lines[0].products,
                additional_services: extras,
                applied_coupon: appliedCampaign?.couponCode,
                discount_amount: couponDiscountAmount,
                payments: [{ id: 'debt-' + Date.now(), method: 'Dívida', amount: totalValue }]
            };

            // 1. Update Appointment
            const { error: apptError } = await supabase.from('appointments').update(updatedData).eq('id', appointment.id);
            if (apptError) throw apptError;

            // 2. Create Sale Record REMOVED

            // 3. Update Customer Balance
            const currentBalance = customer.outstandingBalance || 0;
            const { error: custError } = await supabase.from('customers').update({
                last_visit: dischargeDate,
                total_spent: customer.totalSpent + totalValue,
                outstanding_balance: currentBalance + totalValue
            }).eq('id', customer.id);

            if (custError) throw custError;

            onUpdateAppointments(prev => {
                const exists = prev.find(a => a.id === appointment.id);
                const updatedAppt = {
                    ...appointment,
                    ...(exists || {}),
                    status: 'Concluído',
                    pricePaid: 0,
                    paymentDate: dischargeDate,
                    paymentMethod: 'Dívida',
                    productsUsed: allProductsUsed,
                    combinedServiceNames: combinedNames,
                    bookedPrice: lines[0].unitPrice,
                    mainServiceProducts: lines[0].products,
                    additionalServices: extras,
                    appliedCoupon: appliedCampaign?.couponCode,
                    discountAmount: couponDiscountAmount
                } as Appointment;

                if (exists) {
                    return prev.map(a => a.id === appointment.id ? updatedAppt : a);
                } else {
                    return [...prev, updatedAppt];
                }
            });

            onUpdateCustomers(prev => prev.map(c => {
                if (c.id === customer.id) {
                    const newEntries: CustomerHistoryItem[] = lines.map(line => ({
                        id: `${Date.now()}-${line.id}`,
                        date: dischargeDate,
                        type: 'VISIT',
                        description: `Serviço (Fiado): ${services.find(s => s.id === line.serviceId)?.name}`,
                        details: `Dívida Criada: R$ ${totalValue.toFixed(2)}`,
                        rating: line.rating,
                        feedback: line.feedback,
                        providerId: line.providerId
                    }));

                    return {
                        ...c,
                        lastVisit: dischargeDate,
                        totalSpent: c.totalSpent + totalValue,
                        outstandingBalance: (c.outstandingBalance || 0) + totalValue,
                        history: [...newEntries, ...c.history]
                    };
                }
                return c;
            }));

            onClose();
            alert('Dívida registrada com sucesso!');
        } catch (error: any) {
            console.error('Error creating debt:', error);
            alert(`Erro ao registrar dívida no banco de dados: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const performIssuance = async (cpfOverride?: string) => {
        try {
            setNfseStatus('loading');
            setNfseError(null);

            // Get main provider
            const mainProvider = lines[0]?.providerId;
            if (!mainProvider) throw new Error('Profissional não encontrado');

            // Get main service
            const mainService = services.find(s => s.id === lines[0]?.serviceId);
            if (!mainService) throw new Error('Serviço não encontrado');

            // Issue NFSe
            // Use override if provided, else use current customer.cpf (which might be null/empty, meaning Consumer)
            const cpfToUse = cpfOverride !== undefined ? cpfOverride : customer.cpf;

            const result = await focusNfeService.issueNFSe({
                appointmentId: appointment.id,
                customerId: customer.id,
                customerName: customer.name,
                customerCpfCnpj: cpfToUse,
                customerEmail: customer.email,
                providerId: mainProvider,
                totalValue: totalValue,
                serviceDescription: mainService.name
            });

            if (!result.success) {
                throw new Error(result.error || 'Erro ao emitir NFSe');
            }

            // Fetch the newly created record
            const { data: newRecord } = await supabase
                .from('nfse_records')
                .select('*')
                .eq('id', result.nfseRecordId)
                .single();

            if (newRecord) {
                setNfseData(newRecord);
                setNfseStatus('success');
            } else {
                setNfseStatus('success'); // Fallback
            }

            alert('NFSe emitida com sucesso! ✅');

        } catch (error: any) {
            console.error('Error issuing NFSe:', error);
            setNfseError(error.message || 'Erro ao emitir NFSe');
            setNfseStatus('error');
            alert(`Erro ao emitir NFSe: ${error.message}`);
        }
    };

    const refreshNFSeStatus = async () => {
        try {
            setNfseStatus('loading');
            // Query for NFSe record for this appointment
            const { data, error } = await supabase
                .from('nfse_records')
                .select('*')
                .eq('appointment_id', appointment.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No record found
                    setNfseStatus('idle');
                    setNfseData(null);
                } else {
                    throw error;
                }
            } else if (data) {
                setNfseData(data);
                setNfseStatus('success');
            }
        } catch (error: any) {
            console.error('Error refreshing NFSe status:', error);
            setNfseError('Erro ao atualizar status da NFSe');
            setNfseStatus('error');
        }
    };

    const handleIssueNFSe = () => {
        // If customer has no valid CPF (less than 11 chars or empty), prompt
        const hasValidCpf = customer.cpf && customer.cpf.replace(/\D/g, '').length === 11;

        if (!hasValidCpf) {
            setTempCpf('');
            setShowCpfPrompt(true);
        } else {
            performIssuance();
        }
    };

    const handleSaveCpfAndIssue = async () => {
        const cleanCpf = tempCpf.replace(/\D/g, '');
        if (cleanCpf.length !== 11) {
            alert('Por favor, informe um CPF válido com 11 dígitos.');
            return;
        }

        try {
            // 1. Update DB
            const { error } = await supabase.from('customers').update({ cpf: tempCpf }).eq('id', customer.id);
            if (error) throw error;

            // 2. Update Local State
            onUpdateCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, cpf: tempCpf } : c));

            // 3. Proceed
            setShowCpfPrompt(false);
            performIssuance(tempCpf);
        } catch (error) {
            console.error('Error updating CPF:', error);
            alert('Erro ao salvar CPF do cliente.');
        }
    };

    const handleSkipCpf = () => {
        setShowCpfPrompt(false);
        performIssuance(''); // Issue without CPF (Consumer)
    };

    const handleConfirmCancellation = async () => {
        if (!cancellationReason.trim()) {
            alert('Por favor, informe a justificativa do cancelamento.');
            return;
        }

        setIsSaving(true);

        try {
            // 1. Update Appointment Status
            const { error: apptError } = await supabase.from('appointments').update({ status: 'Cancelado' }).eq('id', appointment.id);
            if (apptError) throw apptError;

            // 2. Fetch current customer data to get existing observations
            const { data: customerData, error: fetchError } = await supabase
                .from('customers')
                .select('observations')
                .eq('id', customer.id)
                .single();

            if (fetchError) throw fetchError;

            // 3. Append cancellation to observations
            const today = new Date().toISOString().split('T')[0];
            const providerName = providers.find(p => p.id === appointment.providerId)?.name || 'Profissional não identificado';
            const serviceName = services.find(s => s.id === appointment.serviceId)?.name || 'Serviço não identificado';

            const cancellationNote = `[${today}] CANCELAMENTO: ${serviceName} com ${providerName} - Motivo: ${cancellationReason}`;
            const updatedObservations = customerData?.observations
                ? `${cancellationNote}\n\n${customerData.observations}`
                : cancellationNote;

            // 4. Update customer observations in database
            const { error: updateError } = await supabase
                .from('customers')
                .update({ observations: updatedObservations })
                .eq('id', customer.id);

            if (updateError) throw updateError;

            // 5. Update local state for appointments
            onUpdateAppointments(prev => prev.map(a =>
                a.id === appointment.id ? { ...a, status: 'Cancelado' } : a
            ));

            // 6. Update local state for customers (both observations and history)
            onUpdateCustomers(prev => prev.map(c => {
                if (c.id === customer.id) {
                    const cancelEntry: CustomerHistoryItem = {
                        id: `cancel-${Date.now()}`,
                        date: today,
                        type: 'CANCELLATION',
                        description: 'AGENDAMENTO CANCELADO',
                        details: `Motivo: ${cancellationReason}`,
                        providerId: appointment.providerId
                    };
                    return {
                        ...c,
                        observations: updatedObservations,
                        history: [cancelEntry, ...c.history]
                    };
                }
                return c;
            }));

            onClose();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            alert('Erro ao cancelar agendamento no banco de dados.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleFutureStatus = (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Confirmado' ? 'Pendente' : 'Confirmado';
        onUpdateAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as any } : a));
    };

    const addServiceLine = () => {
        setLines([...lines, {
            id: Date.now().toString(),
            serviceId: services[0].id,
            providerId: providers.filter(p => p.active)[0].id,
            products: [],
            currentSearchTerm: '',
            discount: 0,
            isCourtesy: false,
            showProductResults: false,
            rating: 5,
            feedback: '',
            unitPrice: services[0].price,
            parentAppointmentId: appointment.id
        }]);
    };

    const removeServiceLine = (id: string) => {
        if (lines.length > 1) {
            setLines(lines.filter(l => l.id !== id));
        }
    };

    const updateLine = (id: string, field: keyof ServiceLine, value: any) => {
        setLines(prev => prev.map((l, index) => {
            if (l.id === id) {
                const updated = { ...l, [field]: value };
                if (field === 'serviceId') {
                    const newService = services.find(s => s.id === value);
                    updated.unitPrice = newService?.price || 0;
                }
                if (index === 0 && field === 'startTime') {
                    setAppointmentTime(value);
                }
                return updated;
            }
            return l;
        }));
    };

    const addProductToLine = (lineId: string, productName: string) => {
        setLines(prev => prev.map(l => {
            if (l.id === lineId && !l.products.includes(productName)) {
                return { ...l, products: [...l.products, productName], currentSearchTerm: '', showProductResults: false, isEditingInCheckout: false };
            }
            return l;
        }));
    };

    const removeProductFromLine = (lineId: string, indexToRemove: number) => {
        setLines(prev => prev.map(l => {
            if (l.id === lineId) {
                return { ...l, products: l.products.filter((_, i) => i !== indexToRemove) };
            }
            return l;
        }));
    };

    const activeProviders = providers.filter(p => p.active);
    const internalStock = stock.filter(p => p.category === 'Uso Interno');
    const hasRestriction = !!customer.preferences?.restrictions;

    const isAgendaMode = source === 'AGENDA';

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
            <div className={`bg-white dark:bg-zinc-900 rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full ${mode === 'HISTORY' ? 'max-w-2xl' : 'max-w-4xl'} overflow-hidden flex flex-col max-h-[95vh] border-2 border-slate-900 dark:border-zinc-700 animate-in slide-in-from-bottom duration-300 transition-all ease-in-out`}>

                {/* Header */}
                <div className="px-5 py-4 md:px-6 md:py-5 bg-slate-950 dark:bg-black text-white flex justify-between items-center flex-shrink-0">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-black text-xs text-indigo-400 uppercase tracking-[0.2em] mb-1">
                            {mode === 'HISTORY' ? 'Detalhes do Pagamento' : mode === 'EDIT_HISTORY' ? 'Editar Pagamento' : (isAgendaMode ? 'Editar Agendamento' : 'Atendimento')}
                        </h3>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCustomerEditModalOpen(true);
                            }}
                            type="button"
                            className="flex items-center gap-2 group/name hover:opacity-80 transition-all text-left"
                        >
                            <h2 className="text-xl font-black text-white uppercase tracking-tight truncate group-hover/name:text-indigo-400 transition-colors">{customer.name}</h2>
                            <div className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 group-hover/name:bg-indigo-500/10 group-hover/name:border-indigo-500/30 transition-all flex items-center gap-1.5">
                                <Edit3 size={10} className="text-slate-500 group-hover/name:text-indigo-400" />
                                <span className="text-[8px] font-black text-slate-500 group-hover/name:text-indigo-400 uppercase tracking-widest">Editar</span>
                            </div>
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 border border-white/20 ml-4"><ChevronDown size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 bg-slate-50 dark:bg-zinc-900 scrollbar-hide">

                    {/* CUSTOMER BLOCKED WARNING */}
                    {customer.isBlocked && (
                        <div className="bg-rose-600 dark:bg-rose-700 border-2 border-rose-400 p-4 rounded-2xl flex items-start gap-4 animate-in fade-in duration-300">
                            <div className="bg-white p-2 rounded-xl text-rose-600 flex-shrink-0">
                                <Ban size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-rose-100 uppercase tracking-widest leading-none mb-1">CLIENTE BLOQUEADA</p>
                                <p className="text-sm font-black text-white uppercase leading-tight mb-2">Motivo: {customer.blockReason || 'Não informado'}</p>
                                <p className="text-[10px] font-bold text-rose-50 opacity-80 uppercase">Atendimento não permitido para clientes bloqueadas.</p>
                            </div>
                        </div>
                    )}

                    {/* PROVIDER RESTRICTION WARNING */}
                    {restrictionData.isRestricted && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 p-4 rounded-2xl flex items-start gap-4 animate-bounce-short">
                            <div className="bg-rose-600 p-2 rounded-xl text-white flex-shrink-0">
                                <Ban size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest leading-none mb-1">Ação Bloqueada</p>
                                <p className="text-sm font-black text-rose-950 dark:text-rose-300 uppercase leading-tight mb-2">Restrição de Profissional: {restrictionData.providerName}</p>
                                <div className="text-[11px] font-bold text-rose-900 dark:text-rose-200 leading-tight bg-white dark:bg-black/20 p-2 rounded-lg border border-rose-100 dark:border-rose-800/50">
                                    {restrictionData.reason}
                                </div>
                                <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 mt-2 uppercase">Por favor, selecione outra profissional para prosseguir.</p>
                            </div>
                        </div>
                    )}

                    {/* GENERAL HEALTH RESTRICTION WARNING */}
                    {hasRestriction && !restrictionData.isRestricted && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start gap-4">
                            <div className="bg-amber-500 p-2 rounded-xl text-white flex-shrink-0">
                                <AlertOctagon size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest leading-none mb-1">Aviso Importante</p>
                                <p className="text-sm font-black text-amber-950 dark:text-amber-300 uppercase leading-tight mb-1">Restrição de Saúde / Preferência</p>
                                <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 leading-tight">
                                    {customer.preferences?.restrictions}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* CUSTOMER & APPOINTMENT MINI-HEADER */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700/50 rounded-2xl shadow-sm gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={customer.name} src={customer.avatar} size="w-8 h-8" />
                            <div className="min-w-0">
                                <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[150px]">{customer.name}</h2>
                                <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${customer.status === 'Novo' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30'}`}>
                                        {customer.status}
                                    </span>
                                    {isGrouped && (
                                        <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-100">Agrupado</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isAgendaMode && (
                                <button
                                    onClick={() => setStatus(prev => prev === 'Confirmado' ? 'Pendente' : 'Confirmado')}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${status === 'Confirmado' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white dark:bg-zinc-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-600'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'Confirmado' ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-500'}`} />
                                    {status}
                                </button>
                            )}
                        </div>
                    </div>
                    {mode !== 'HISTORY' && (
                        <div className="flex items-center gap-2 w-full bg-white dark:bg-black/20 p-1.5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-slate-100 dark:border-zinc-700">
                                <Calendar size={14} className="text-indigo-600 flex-shrink-0" />
                                <input
                                    type="date"
                                    className="text-[11px] font-black text-slate-950 dark:text-white bg-transparent border-none p-0 outline-none w-full appearance-none cursor-pointer"
                                    value={appointmentDate}
                                    onChange={e => setAppointmentDate(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 flex items-center gap-2 px-3 py-2">
                                <Clock size={14} className="text-amber-600 flex-shrink-0" />
                                <input
                                    type="time"
                                    className="text-[11px] font-black text-slate-950 dark:text-white bg-transparent border-none p-0 outline-none w-full appearance-none cursor-pointer"
                                    value={appointmentTime}
                                    onChange={e => {
                                        const newTime = e.target.value;
                                        setAppointmentTime(newTime);
                                        if (lines.length > 0) {
                                            // @ts-ignore
                                            updateLine(lines[0].id, 'startTime', newTime);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    {mode === 'HISTORY' && (
                        <div className="text-right border-l border-slate-200 dark:border-zinc-700 pl-4 ml-4 flex-shrink-0">
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Data Baixa</span>
                            <span className="text-sm font-black text-slate-950 dark:text-white">
                                {(() => {
                                    const dateStr = appointment.paymentDate || appointment.date;
                                    if (!dateStr) return '-';
                                    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
                                    return isNaN(d.getTime()) ? 'Data Inválida' : d.toLocaleDateString('pt-BR');
                                })()}
                            </span>
                        </div>
                    )}
                </div>

                {mode === 'VIEW' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Procedimentos Selecionados</h4>
                            <button
                                type="button" onClick={addServiceLine}
                                className="text-[9px] font-black text-slate-950 dark:text-white flex items-center gap-1.5 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
                            >
                                <Plus size={14} /> ADICIONAR EXTRA
                            </button>
                        </div>

                        <div className="space-y-3">
                            {lines.map((line) => (
                                <div key={line.id} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm space-y-3 relative group">
                                    {lines.length > 1 && (
                                        <button onClick={() => removeServiceLine(line.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-0.5">
                                            <label className="text-[7px] font-black text-slate-400 uppercase ml-1">Serviço</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-[11px] font-black text-slate-950 dark:text-white outline-none focus:border-slate-400 dark:focus:border-zinc-500"
                                                style={{ colorScheme: 'dark' }}
                                                value={line.serviceId}
                                                onChange={e => updateLine(line.id, 'serviceId', e.target.value)}
                                            >
                                                {services
                                                    .filter(s => {
                                                        const provider = providers.find(p => p.id === line.providerId);
                                                        if (!provider) return true;
                                                        // Se não houver especialidades definidas, mostra tudo para evitar bloqueio
                                                        if (!provider.specialties || provider.specialties.length === 0) return true;
                                                        // Filtra por nome do serviço
                                                        return provider.specialties.includes(s.name);
                                                    })
                                                    .map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(0)}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-0.5 relative">
                                            <label className="text-[7px] font-black text-slate-400 uppercase ml-1">Materiais Utilizados</label>
                                            <div className="relative">
                                                <Search size={12} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    type="text"
                                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-slate-950 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none focus:border-slate-400 dark:focus:border-zinc-500"
                                                    placeholder="Adicionar produto..."
                                                    value={line.currentSearchTerm}
                                                    onFocus={() => updateLine(line.id, 'showProductResults', true)}
                                                    onChange={e => {
                                                        updateLine(line.id, 'currentSearchTerm', e.target.value);
                                                        updateLine(line.id, 'showProductResults', true);
                                                    }}
                                                />
                                                {line.showProductResults && (
                                                    <div className="absolute z-[110] left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl max-h-32 overflow-y-auto">
                                                        {/* Use stock prop instead of STOCK constant */}
                                                        {stock.filter(p => p.category === 'Uso Interno' && (p.name.toLowerCase().includes(line.currentSearchTerm.toLowerCase()) || p.code.toLowerCase().includes(line.currentSearchTerm.toLowerCase()))).map(p => (
                                                            <button
                                                                key={p.id} type="button"
                                                                onClick={() => {
                                                                    addProductToLine(line.id, `[${p.code}] ${p.name}`);
                                                                }}
                                                                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-zinc-700 text-[10px] font-black text-slate-950 dark:text-white border-b border-slate-50 dark:border-zinc-700 last:border-none"
                                                            >
                                                                <span className="text-indigo-600 dark:text-indigo-400">[{p.code}]</span> {p.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {line.products.map((prod, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 px-2 py-1 rounded-lg text-[9px] font-black uppercase">
                                                        {prod}
                                                        <button onClick={() => removeProductFromLine(line.id, idx)} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200">
                                                            <X size={10} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 md:grid-cols-12 gap-3 items-end bg-slate-50/50 dark:bg-zinc-900/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-700">
                                        <div className="flex flex-col col-span-1 md:col-span-2">
                                            <label className="text-[7px] font-black text-slate-400 uppercase ml-1">Horário</label>
                                            <input
                                                type="time"
                                                className="bg-transparent border-none text-[10px] font-black text-slate-950 dark:text-white p-1 outline-none w-full"
                                                value={line.startTime || appointmentTime}
                                                onChange={e => updateLine(line.id, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col col-span-3 md:col-span-4">
                                            <label className="text-[7px] font-black text-slate-400 uppercase ml-1">Responsável</label>
                                            <div className="flex items-center gap-1.5 w-full">
                                                <Avatar
                                                    src={providers.find(p => p.id === line.providerId)?.avatar}
                                                    name={providers.find(p => p.id === line.providerId)?.name || ''}
                                                    size="w-5 h-5 flex-shrink-0"
                                                />
                                                <select
                                                    className={`bg-white dark:bg-zinc-800 border-none text-[10px] font-black p-0 outline-none w-full rounded truncate ${customer.restrictedProviderIds?.includes(line.providerId)
                                                        ? 'text-rose-600 dark:text-rose-400 border-b-2 border-rose-500'
                                                        : 'text-slate-950 dark:text-white'
                                                        }`}
                                                    value={line.providerId}
                                                    onChange={e => updateLine(line.id, 'providerId', e.target.value)}
                                                >
                                                    {activeProviders.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-800 text-slate-950 dark:text-white">{p.name.split(' ')[0]}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex flex-col col-span-1 md:col-span-2">
                                            <label className="text-[7px] font-black text-slate-400 uppercase ml-1">Valor Unit.</label>
                                            <div className="text-[10px] font-black text-slate-950 dark:text-white p-1 truncate">R$ {line.unitPrice.toFixed(0)}</div>
                                        </div>

                                        <div className="flex flex-col col-span-1 md:col-span-2">
                                            <label className="text-[7px] font-black text-rose-500 uppercase ml-1">Desc. R$</label>
                                            <input
                                                type="number"
                                                className="bg-transparent border-none text-[10px] font-black text-rose-700 dark:text-rose-400 p-1 outline-none w-full"
                                                value={line.discount}
                                                onChange={e => updateLine(line.id, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateLine(line.id, 'isCourtesy', !line.isCourtesy)}
                                            className={`col-span-2 md:col-span-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border transition-all text-[8px] font-black uppercase h-[26px] ${line.isCourtesy ? 'bg-slate-950 dark:bg-white text-white dark:text-black border-slate-950 dark:border-white' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-slate-500'}`}
                                        >
                                            <Check size={11} /> {line.isCourtesy ? 'CORTESIA' : 'CORTESIA?'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RECURENCE OPTIONS */}
                        {mode === 'VIEW' && (
                            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                                        <h4 className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Repetir Agendamento?</h4>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsRecurring(!isRecurring)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${isRecurring ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isRecurring ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                {isRecurring && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-indigo-800 dark:text-indigo-400 uppercase ml-1">Frequência</label>
                                            <select
                                                className="w-full bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-800 rounded-xl p-2.5 text-[10px] font-black text-slate-950 dark:text-white outline-none"
                                                value={recurrenceFrequency}
                                                onChange={e => setRecurrenceFrequency(e.target.value as any)}
                                            >
                                                <option value="WEEKLY">Semanal (7 dias)</option>
                                                <option value="BIWEEKLY">Quinzenal (15 dias)</option>
                                                <option value="MONTHLY">Mensal (Mesmo dia)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-indigo-800 dark:text-indigo-400 uppercase ml-1">Repetições Adicionais</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="24"
                                                    className="w-full bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-800 rounded-xl p-2.5 text-[10px] font-black text-slate-950 dark:text-white outline-none"
                                                    value={recurrenceCount}
                                                    onChange={e => setRecurrenceCount(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                                                />
                                                <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">vezes</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                            <div className="flex justify-between items-center px-1 mb-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {isGrouped ? 'Valor Acumulado (Total no Dia)' : 'Valor Acumulado'}
                                    </p>
                                    <p className="text-xl font-black text-slate-950 dark:text-white tracking-tighter">R$ {totalValue.toFixed(2)}</p>
                                </div>
                            </div>

                            {customer.outstandingBalance && customer.outstandingBalance > 0 && (
                                <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-2">
                                    <input
                                        type="checkbox"
                                        id="payDebt"
                                        checked={includeDebt}
                                        onChange={(e) => setIncludeDebt(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <label htmlFor="payDebt" className="flex-1 text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase cursor-pointer select-none">
                                        Incluir Pagmento de Dívida Pendente
                                    </label>
                                    <span className="text-sm font-black text-rose-500">
                                        + R$ {customer.outstandingBalance.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {isAgendaMode ? (
                                    <>
                                        {isCancelling ? (
                                            <div className="space-y-3 bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border-2 border-rose-100 dark:border-rose-900 animate-in zoom-in-95 duration-200">
                                                <h4 className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                    <AlertTriangle size={12} /> Cancelamento de Agendamento
                                                </h4>
                                                <textarea
                                                    className="w-full bg-white dark:bg-zinc-900 border-2 border-rose-200 dark:border-rose-800 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-rose-500 placeholder:font-normal placeholder:text-slate-400 resize-none h-24"
                                                    placeholder="Motivo obrigatório para o histórico..."
                                                    value={cancellationReason}
                                                    onChange={e => setCancellationReason(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCancelling(false)}
                                                        className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
                                                    >
                                                        Voltar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleConfirmCancellation}
                                                        className="flex-[2] py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all hover:bg-rose-700"
                                                    >
                                                        Confirmar Cancelamento
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 w-full">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCancelling(true)}
                                                    className="py-4 px-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                                                    title="Cancelar Agendamento"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (appointment.status === 'Em Andamento') {
                                                            setMode('CHECKOUT');
                                                        } else {
                                                            handleStartService();
                                                        }
                                                    }}
                                                    className="flex-1 py-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                                >
                                                    {appointment.status === 'Em Andamento' ? <CreditCard size={16} /> : <CheckCircle2 size={16} />}
                                                    {appointment.status === 'Em Andamento' ? 'PAGAR / CHECKOUT' : 'CHECK-IN / INICIAR'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSave}
                                                    disabled={isSaving || restrictionData.isRestricted || customer.isBlocked}
                                                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaving || restrictionData.isRestricted || customer.isBlocked ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500 cursor-not-allowed' : 'bg-slate-950 dark:bg-white text-white dark:text-black'}`}
                                                >
                                                    {isSaving ? <Sparkles size={16} className="animate-spin" /> : (restrictionData.isRestricted || customer.isBlocked ? <Ban size={16} /> : <Save size={16} />)}
                                                    {isSaving ? 'GRAVANDO...' : (restrictionData.isRestricted || customer.isBlocked ? 'BLOQUEADO' : 'SALVAR')}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    (appointment.status === 'Confirmado' || appointment.status === 'Pendente') ? (
                                        <button
                                            type="button"
                                            onClick={handleStartService}
                                            disabled={isSaving || restrictionData.isRestricted || customer.isBlocked}
                                            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaving || restrictionData.isRestricted || customer.isBlocked ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500 cursor-not-allowed' : 'bg-slate-950 dark:bg-white text-white dark:text-black'}`}
                                        >
                                            {isSaving ? <Sparkles size={16} className="animate-spin" /> : (restrictionData.isRestricted || customer.isBlocked ? <Ban size={16} /> : 'INICIAR ATENDIMENTO')}
                                            {isSaving ? 'INICIANDO...' : (restrictionData.isRestricted || customer.isBlocked ? 'BLOQUEADO' : 'INICIAR ATENDIMENTO')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setMode('CHECKOUT')}
                                            disabled={restrictionData.isRestricted}
                                            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${restrictionData.isRestricted ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500 cursor-not-allowed' : 'bg-slate-950 dark:bg-white text-white dark:text-black'}`}
                                        >
                                            {restrictionData.isRestricted ? 'BLOQUEADO' : 'IR PARA PAGAMENTO'}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* FUTURE APPOINTMENTS - RESTORED BELOW ACTION BUTTONS */}
                        {futureAppointments.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800 animate-in fade-in duration-500">
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-800/50 rounded-[2rem] p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <Calendar size={18} />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest leading-none">Próximos Agendamentos</span>
                                    </div>
                                    <div className="space-y-2">
                                        {futureAppointments.slice(0, 5).map(app => {
                                            const s = services.find(serv => serv.id === app.serviceId);
                                            return (
                                                <div key={app.id} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-800 p-3 rounded-2xl border border-indigo-50 dark:border-indigo-900/50 shadow-sm transition-all hover:scale-[1.01]">
                                                    <div
                                                        className={`flex-1 flex items-center group ${onSelectAppointment ? 'cursor-pointer' : ''}`}
                                                        onClick={() => onSelectAppointment && onSelectAppointment(app)}
                                                        title={onSelectAppointment ? "Clique para editar este agendamento" : ""}
                                                    >
                                                        <div className="flex flex-col flex-1 leading-tight">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-slate-900 dark:text-white font-black text-[11px] uppercase">
                                                                    {providers.find(p => p.id === app.providerId)?.name.split(' ')[0]}
                                                                </span>
                                                                <span className="text-slate-400 dark:text-slate-500 font-bold text-[9px]">
                                                                    {(app.date ? new Date(app.date.includes('T') ? app.date : app.date + 'T12:00:00') : new Date()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {app.time}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate max-w-[200px]">
                                                                {app.combinedServiceNames || s?.name}
                                                            </span>
                                                        </div>
                                                        {onSelectAppointment && (
                                                            <ArrowRight size={14} className="ml-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => toggleFutureStatus(app.id, app.status)}
                                                        className={`w-2 h-7 rounded-full transition-all active:scale-90 ml-3 ${app.status === 'Confirmado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-400'}`}
                                                        title={app.status === 'Confirmado' ? 'Confirmado' : 'Pendente'}
                                                    ></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {(mode === 'CHECKOUT' || mode === 'EDIT_HISTORY') && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-4">
                        <div className="bg-slate-50 dark:bg-zinc-800 p-5 rounded-[2rem] border border-slate-100 dark:border-zinc-700 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total a Receber</span>
                            <div className="text-right">
                                {appliedCampaign && (
                                    <span className="block text-[10px] font-bold text-rose-500 line-through">R$ {totalBeforeCoupon.toFixed(2)}</span>
                                )}
                                <span className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter">R$ {totalValue.toFixed(2)}</span>
                            </div>
                        </div>

                        {!isAgendaMode && (
                            <div className="px-1">
                                <h4 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-1.5"><Tag size={12} /> Cupom / Parceria</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Código do cupom"
                                        className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        disabled={!!appliedCampaign}
                                    />
                                    {appliedCampaign ? (
                                        <button onClick={handleRemoveCoupon} className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-800 px-4 rounded-xl font-black text-xs uppercase flex items-center gap-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
                                            <X size={14} /> Remover
                                        </button>
                                    ) : (
                                        <button onClick={handleApplyCoupon} className="bg-slate-900 dark:bg-white text-white dark:text-black px-4 rounded-xl font-black text-xs uppercase hover:bg-black dark:hover:bg-slate-200 transition-colors">
                                            Aplicar
                                        </button>
                                    )}
                                </div>
                                {appliedCampaign && (
                                    <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase">
                                        <Check size={12} />
                                        Cupom {appliedCampaign.couponCode} applied:
                                        {appliedCampaign.discountType === 'PERCENTAGE' ? ` ${appliedCampaign.discountValue}% OFF` : ` R$ ${appliedCampaign.discountValue} OFF`}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3 px-1">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <h4 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <Sparkles size={12} /> Serviços & Avaliação
                                </h4>
                                <button
                                    type="button" onClick={addServiceLine}
                                    className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                                >
                                    <Plus size={10} /> Adicionar
                                </button>
                            </div>

                            <div className="space-y-2">
                                {lines.map((line) => {
                                    const srv = services.find(s => s.id === line.serviceId);
                                    const prv = providers.find(p => p.id === line.providerId);

                                    return (
                                        <div key={`svc-edit-${line.id}`} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm relative group">
                                            {lines.length > 1 && (
                                                <button
                                                    onClick={() => removeServiceLine(line.id)}
                                                    className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="min-w-0 flex-1">
                                                        {mode === 'EDIT_HISTORY' ? (
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block mb-1">Profissional</label>
                                                                    <select
                                                                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-xs font-black text-slate-950 dark:text-white outline-none uppercase"
                                                                        value={line.providerId}
                                                                        onChange={(e) => updateLine(line.id, 'providerId', e.target.value)}
                                                                    >
                                                                        <option value="">Selecione...</option>
                                                                        {activeProviders.map(p => (
                                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block mb-1">Serviço</label>
                                                                    <select
                                                                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-xs font-black text-slate-950 dark:text-white outline-none uppercase"
                                                                        value={line.serviceId}
                                                                        onChange={(e) => updateLine(line.id, 'serviceId', e.target.value)}
                                                                    >
                                                                        <option value="">Selecione...</option>
                                                                        {services.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase leading-none mb-1">{prv?.name}</p>
                                                                <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase truncate">{srv?.name}</h4>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => updateLine(line.id, 'rating', s)}
                                                                className="transition-transform active:scale-125"
                                                            >
                                                                <Star
                                                                    size={18}
                                                                    className={s <= line.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-zinc-800"}
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block mb-0.5">Desconto Manual</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-xs font-black text-slate-950 dark:text-white outline-none"
                                                                value={line.discount}
                                                                onChange={e => updateLine(line.id, 'discount', parseFloat(e.target.value) || 0)}
                                                                placeholder="0.00"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => updateLine(line.id, 'isCourtesy', !line.isCourtesy)}
                                                                className={`p-2 rounded-xl border transition-colors ${line.isCourtesy ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white' : 'bg-white dark:bg-zinc-800 text-slate-300 border-slate-200 dark:border-zinc-700'}`}
                                                                title="Cortesia"
                                                            >
                                                                <Check size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block mb-0.5">Feedback Opcional</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none"
                                                            placeholder="Elogios ou observações..."
                                                            value={line.feedback}
                                                            onChange={e => updateLine(line.id, 'feedback', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* NOVO: MATERIAIS UTILIZADOS NO CHECKOUT */}
                                                <div className="space-y-1 relative pt-2 border-t border-slate-50 dark:border-zinc-800/50">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Materiais Utilizados</label>
                                                    <div className="relative">
                                                        <Search size={12} className="absolute left-3 top-3 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold text-slate-950 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none focus:border-slate-400"
                                                            placeholder="Adicionar material..."
                                                            value={line.currentSearchTerm}
                                                            onFocus={() => updateLine(line.id, 'showProductResults', true)}
                                                            onChange={e => {
                                                                updateLine(line.id, 'currentSearchTerm', e.target.value);
                                                                updateLine(line.id, 'showProductResults', true);
                                                            }}
                                                        />
                                                        {line.showProductResults && (
                                                            <div className="absolute z-[110] left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl max-h-32 overflow-y-auto scrollbar-hide">
                                                                {stock.filter(p => p.category === 'Uso Interno' && (p.name.toLowerCase().includes(line.currentSearchTerm.toLowerCase()) || p.code.toLowerCase().includes(line.currentSearchTerm.toLowerCase()))).map(p => (
                                                                    <button
                                                                        key={p.id} type="button"
                                                                        onClick={() => addProductToLine(line.id, `[${p.code}] ${p.name}`)}
                                                                        className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-zinc-700 text-[9px] font-black text-slate-950 dark:text-white border-b border-slate-50 dark:border-zinc-700 last:border-none"
                                                                    >
                                                                        <span className="text-indigo-600 dark:text-indigo-400">[{p.code}]</span> {p.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {line.products.map((prod, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
                                                                {prod}
                                                                <button onClick={() => removeProductFromLine(line.id, idx)} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200">
                                                                    <X size={10} />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3 px-1">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Formas de Recebimento</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button" onClick={addPayment}
                                        className="text-[9px] font-black text-slate-950 dark:text-white flex items-center gap-1.5 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
                                    >
                                        <Plus size={14} /> ADD PAGAMENTO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('VIEW')}
                                        className="p-2 bg-slate-50 dark:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border-2 border-slate-100 dark:border-zinc-700 transition-all active:scale-95 shadow-sm"
                                        title="Voltar"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {payments.map((payment, index) => {
                                    const isCredit = payment.method.toLowerCase().includes('crédito');
                                    const isCard = payment.method.toLowerCase().includes('cartão') || payment.method.toLowerCase().includes('crédito') || payment.method.toLowerCase().includes('débito');
                                    return (
                                        <div key={payment.id} className="space-y-2 animate-in slide-in-from-left duration-200">
                                            <div className="flex gap-2">
                                                <select
                                                    className={`flex-[2] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-slate-400 dark:focus:border-zinc-500 uppercase ${isCredit ? 'rounded-r-none border-r-0' : ''}`}
                                                    value={payment.method}
                                                    onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                                                >
                                                    {paymentSettings.map(pay => (
                                                        <option key={pay.id} value={pay.method}>
                                                            {pay.method}
                                                        </option>
                                                    ))}
                                                </select>

                                                {isCredit && (
                                                    <select
                                                        className="flex-1 min-w-[60px] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl rounded-l-none p-3 text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-slate-400 dark:focus:border-zinc-500 uppercase border-l-0"
                                                        value={payment.installments || 1}
                                                        onChange={(e) => updatePayment(payment.id, 'installments', parseInt(e.target.value))}
                                                    >
                                                        {[...Array(12)].map((_, i) => (
                                                            <option key={i} value={i + 1}>{i + 1}x</option>
                                                        ))}
                                                    </select>
                                                )}

                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                                    <input
                                                        type="number"
                                                        className="w-full pl-8 pr-3 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-slate-400"
                                                        value={payment.amount || ''}
                                                        placeholder="0,00"
                                                        onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                {payments.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePayment(payment.id)}
                                                        className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Card Brand Selector */}
                                            {isCard && (
                                                <select
                                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-slate-400 dark:focus:border-zinc-500 uppercase"
                                                    value={payment.cardBrand || ''}
                                                    onChange={(e) => updatePayment(payment.id, 'cardBrand', e.target.value)}
                                                >
                                                    <option value="">Selecione a Bandeira</option>
                                                    <option value="Visa">Visa</option>
                                                    <option value="Mastercard">Mastercard</option>
                                                    <option value="Elo">Elo</option>
                                                    <option value="American Express">American Express</option>
                                                    <option value="Hipercard">Hipercard</option>
                                                    <option value="Outros">Outros</option>
                                                </select>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <div className={`flex-1 p-3 rounded-xl border flex items-center justify-between ${Math.abs(totalPaid - totalValue) < 0.01 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800'}`}>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Pago</span>
                                    <span className={`text-xs font-black ${Math.abs(totalPaid - totalValue) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        R$ {totalPaid.toFixed(2)} / R$ {totalValue.toFixed(2)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCreateDebt}
                                    disabled={isSaving || (lines.some(l => !l.serviceId || !l.providerId))}
                                    className={`px-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm flex flex-col items-center justify-center gap-1 leading-none whitespace-nowrap ${isSaving ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 border border-rose-100 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40'}`}
                                    title="Registrar como Dívida (Fiado)"
                                >
                                    <Wallet size={14} />
                                    <span>{isSaving ? '...' : 'FIADO'}</span>
                                </button>
                            </div>
                        </div>

                        {/* EXIBIÇÃO DA DÍVIDA ANTERIOR */}
                        {/* EXIBIÇÃO DA DÍVIDA ANTERIOR COM CHECKBOX */}
                        {customer.outstandingBalance && customer.outstandingBalance > 0 && (
                            <button
                                type="button"
                                onClick={() => setIncludeDebt(!includeDebt)}
                                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all border ${includeDebt ? 'bg-indigo-600 border-indigo-600 shadow-md' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 hover:border-indigo-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${includeDebt ? 'bg-white border-white text-indigo-600' : 'border-slate-300 dark:border-zinc-600'}`}>
                                        {includeDebt && <Check size={14} strokeWidth={4} />}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${includeDebt ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                            Incluir Dívida Pendente
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-sm font-black ${includeDebt ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                                    R$ {customer.outstandingBalance.toFixed(2)}
                                </span>
                            </button>
                        )}

                        <div className="pt-2 flex flex-col md:flex-row gap-3">
                            {mode === 'EDIT_HISTORY' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving || restrictionData.isRestricted || customer.isBlocked}
                                        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving || restrictionData.isRestricted || customer.isBlocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {isSaving ? 'SALVANDO...' : <><Check size={20} /> SALVAR ALTERAÇÕES</>}
                                    </button>
                                    <button onClick={() => setMode('HISTORY')} className="w-full py-1 text-slate-400 font-bold uppercase text-[9px] tracking-widest">CANCELAR</button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleFinishService}
                                        disabled={restrictionData.isRestricted || customer.isBlocked}
                                        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${restrictionData.isRestricted || customer.isBlocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                                    >
                                        {restrictionData.isRestricted || customer.isBlocked ? 'BLOQUEADO' : <><Check size={20} /> FINALIZAR ATENDIMENTO</>}
                                    </button>
                                    <button onClick={() => setMode('VIEW')} className="w-full py-1 text-slate-400 font-bold uppercase text-[9px] tracking-widest">REVISAR DADOS</button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {mode === 'HISTORY' && (
                    <div className="space-y-3 animate-in slide-in-from-right duration-300 pb-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 rounded-full"><CheckCircle2 size={16} /></div>
                                <span className="text-[10px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-widest">{appointment.paymentMethod === 'Dívida' ? 'Dívida Registrada' : 'Atendimento Finalizado'}</span>
                            </div>
                            <span className="text-xl font-black text-emerald-900 dark:text-emerald-300 tracking-tighter">R$ {((appointment.pricePaid === 0 && totalValue > 0) ? totalValue : (appointment.pricePaid || totalValue)).toFixed(2)}</span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Detalhamento dos Serviços</h4>
                            <div className="space-y-2">
                                {lines.map((line, idx) => {
                                    const srv = services.find(s => s.id === line.serviceId);
                                    const prv = providers.find(p => p.id === line.providerId);
                                    return (
                                        <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-50 dark:bg-indigo-950 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                                    <Sparkles size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight">{srv?.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Prof: {prv?.name}</p>
                                                        {line.rating > 0 && (
                                                            <div className="flex gap-0.5 ml-1">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} size={8} className={i < line.rating ? "fill-amber-400 text-amber-400" : "text-slate-100 dark:text-zinc-800"} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-900 dark:text-white">R$ {line.unitPrice.toFixed(2)}</p>
                                                {line.discount > 0 && <p className="text-[8px] font-bold text-rose-500 uppercase">- R$ {line.discount.toFixed(2)} DESC</p>}
                                                {line.isCourtesy && <span className="text-[8px] font-black bg-slate-900 text-white dark:bg-white dark:text-black px-1 rounded">CORTESIA</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-100 dark:bg-zinc-800/50 p-3 rounded-2xl border border-slate-200 dark:border-zinc-700">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Método de Pagamento</p>
                                <div className="space-y-1">
                                    {(appointment.payments && appointment.payments.length > 0) ? (
                                        appointment.payments.map((p, pIdx) => (
                                            <div key={pIdx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{p.method}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {p.amount.toFixed(2)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{appointment.paymentMethod || 'Não informado'}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">R$ {totalValue.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {appliedCampaign && (
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cupom Aplicado</p>
                                    <div className="flex items-center gap-2">
                                        <Tag size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">{appliedCampaign.couponCode}</span>
                                        <span className="text-[9px] font-bold text-slate-400">(-R$ {appointment.discountAmount?.toFixed(2)})</span>
                                    </div>
                                </div>
                            )}
                            {appointment.productsUsed && appointment.productsUsed.length > 0 && (
                                <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-zinc-700 mt-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Produtos de Uso Interno</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {appointment.productsUsed.map((p, i) => (
                                            <span key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase">{p}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* NFSe Section */}
                        <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-400 rounded-full">
                                        <FileText size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-900 dark:text-purple-300 uppercase tracking-widest">Nota Fiscal Eletrônica (NFSe)</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-purple-100 dark:border-purple-800">
                                {nfseStatus === 'success' || (nfseData && nfseData.status === 'issued') ? (
                                    <div className="space-y-3">
                                        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
                                                <CheckCircle2 size={16} /> NFSe Emitida!
                                            </p>
                                            {nfseData?.nfse_number && <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold mt-1">Número: {nfseData.nfse_number}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {nfseData?.pdf_url && (
                                                <button
                                                    onClick={() => window.open(nfseData.pdf_url, '_blank')}
                                                    className="py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <FileText size={14} /> Baixar PDF
                                                </button>
                                            )}

                                            {nfseData?.pdf_url && (
                                                <button
                                                    onClick={() => {
                                                        const msg = `Olá ${customer.name.split(' ')[0]}, aqui está sua Nota Fiscal de Serviço (NFSe) da Aminna Barbearia: ${nfseData.pdf_url}`;
                                                        const phone = customer.phone.replace(/\D/g, '');
                                                        window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                                    }}
                                                    className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Smartphone size={14} /> WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : nfseStatus === 'error' ? (
                                    <div>
                                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2">
                                            ❌ {nfseError}
                                        </p>
                                        <button
                                            onClick={handleIssueNFSe}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <FileText size={14} />
                                            TENTAR NOVAMENTE
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleIssueNFSe}
                                            disabled={nfseStatus === 'loading'}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            {nfseStatus === 'loading' ? (
                                                <>
                                                    <Sparkles size={14} className="animate-spin" />
                                                    EMITINDO...
                                                </>
                                            ) : (
                                                <>
                                                    <FileText size={14} />
                                                    EMITIR NFSE
                                                </>
                                            )}
                                        </button>
                                        {nfseStatus === 'loading' && (
                                            <button
                                                onClick={refreshNFSeStatus}
                                                className="w-full text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold underline"
                                            >
                                                Atualizar Status
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={() => setMode('EDIT_HISTORY')}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Editar
                            </button>
                            <button onClick={onClose} className="flex-1 py-4 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                                Fechar Histórico
                            </button>
                        </div>
                    </div>
                )}


                {/* CANCEL CONFIRMATION MODAL (EXISTING) */}
                {
                    isCancelling && (
                        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-900 dark:border-white/10">
                                <div className="p-8 text-center pt-10">
                                    <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-rose-50/50 dark:ring-rose-900/10">
                                        <X size={40} className="animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 leading-tight">
                                        Cancelar Atendimento?
                                    </h3>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                        Tem certeza que deseja cancelar o atendimento de <span className="text-slate-900 dark:text-white font-black">{customer.name}</span>? Esta ação não pode ser desfeita.
                                    </p>
                                    <div className="mb-6">
                                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                            Justificativa do Cancelamento *
                                        </label>
                                        <textarea
                                            value={cancellationReason}
                                            onChange={(e) => setCancellationReason(e.target.value)}
                                            placeholder="Ex: Cliente solicitou reagendamento, Profissional indisponível, etc."
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                                            rows={3}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setIsCancelling(false)}
                                            className="px-6 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                                        >
                                            Não, Manter
                                        </button>
                                        <button
                                            onClick={handleConfirmCancellation}
                                            disabled={isSaving}
                                            className="px-6 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? 'Cancelando...' : <><X size={16} /> Sim, Cancelar</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* CUSTOM DEBT CONFIRMATION MODAL ("FIADO") */}
                {
                    showDebtConfirmModal && (
                        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-900 dark:border-white/10">
                                <div className="p-8 text-center pt-10">
                                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-amber-50/50 dark:ring-amber-900/10">
                                        <AlertTriangle size={40} className="animate-pulse" />
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 leading-tight">
                                        Atenção: Registro de "Fiado"
                                    </h3>

                                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-3xl mb-8 space-y-4">
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                                            Este atendimento para <span className="text-slate-900 dark:text-white font-black">{customer.name}</span> será registrado como dívida pendente.
                                        </p>

                                        <div className="flex flex-col items-center gap-1 py-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Pendente</span>
                                            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">R$ {totalValue.toFixed(2)}</span>
                                        </div>

                                        <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-zinc-900 px-4 py-3 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 uppercase leading-normal">
                                            💡 Este valor será cobrado automaticamente no próximo atendimento desta cliente.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setShowDebtConfirmModal(false)}
                                            className="px-6 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleCreateDebt(true)}
                                            className="px-6 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Save size={16} /> Confirmar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* CPF PROMPT MODAL */}
                {
                    showCpfPrompt && (
                        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-900 dark:border-white/10">
                                <div className="p-8 text-center pt-8">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                                        <User size={32} />
                                    </div>

                                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight mb-2 leading-tight">
                                        Cliente sem CPF
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6">
                                        Deseja informar o CPF para a nota fiscal? Se informar, ele ficará salvo no cadastro.
                                    </p>

                                    <input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-center text-lg font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 mb-6"
                                        value={tempCpf}
                                        onChange={e => {
                                            // Simple mask
                                            let v = e.target.value.replace(/\D/g, '');
                                            if (v.length > 11) v = v.substring(0, 11);
                                            v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                            v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                            setTempCpf(v);
                                        }}
                                        autoFocus
                                    />

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleSaveCpfAndIssue}
                                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                        >
                                            Salvar CPF e Emitir
                                        </button>
                                        <button
                                            onClick={handleSkipCpf}
                                            className="w-full py-3 bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Emitir sem CPF (Consumidor)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Customer Edit Modal */}
                {isCustomerEditModalOpen && (
                    <CustomerEditModal
                        customer={customer}
                        onClose={() => setIsCustomerEditModalOpen(false)}
                        onUpdateCustomers={onUpdateCustomers}
                        services={services}
                        providers={providers}
                    />
                )}
            </div>
        </div>
    );
};
