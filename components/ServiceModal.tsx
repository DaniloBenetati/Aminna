
import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Check, Star, Smartphone, Trash2, Search, CreditCard, Wallet, DollarSign, AlertOctagon, Edit3, Package, PencilLine, Tag, Sparkles, Calendar, AlertTriangle, Ban, Save, CircleX, ArrowRight, ArrowLeft, CircleCheck, User, Landmark, Banknote, Ticket, ChevronDown, ChevronLeft, FileText, RefreshCw, Play, Coins, Clock, Copy, History } from 'lucide-react';
import { Appointment, Customer, CustomerHistoryItem, Service, Campaign, PaymentSetting, Provider, StockItem, PaymentInfo, ViewState, Sale } from '../types';
import { Avatar } from './Avatar';
import { supabase } from '../services/supabase';
import { focusNfeService } from '../services/focusNfeService';
import { isFirstAppointment } from '../services/financialService';
import { ConsentForm } from './ConsentForm';
import { Toast } from './Toast';

const CARD_BRANDS = ['Visa', 'Mastercard', 'Elo', 'Hipercard', 'Amex', 'Diners', 'Outros'];

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const calculateEndTime = (startTime: string, durationMinutes: number, provider?: Provider, serviceName?: string) => {
    if (!startTime) return '';

    // Use professional-specific duration if available
    let duration = durationMinutes;
    if (provider && serviceName && provider.customDurations && provider.customDurations[serviceName]) {
        duration = provider.customDurations[serviceName];
    }

    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

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
    endTime: string;
    appointmentId?: string; // Tracks original appointment for merged services
    clientName?: string; // Companion Name
    clientPhone?: string; // Companion Phone
    isCompanion?: boolean; // Flag to identify companion services
    quantity?: number;
    tipAmount: number;
    status?: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado' | 'Aguardando';
    startTimeActual?: string;
}

const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
    onNavigate?: (view: ViewState, payload?: any) => void;
    allSales?: Sale[];
    partners?: any[];
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
    onNavigate,
    allSales = [],
    partners = []
}) => {
    if (!appointment) return null;

    const [status, setStatus] = useState<Appointment['status']>(appointment?.status || 'Pendente');
    const [paymentMethod, setPaymentMethod] = useState(appointment?.paymentMethod || 'Pix');
    const [payments, setPayments] = useState<PaymentInfo[]>(appointment?.payments || []);
    const [lines, setLines] = useState<ServiceLine[]>([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
    const [recurrenceCount, setRecurrenceCount] = useState(4);

    const [appointmentTime, setAppointmentTime] = useState(appointment?.time || '');
    const [appointmentDate, setAppointmentDate] = useState(appointment?.date || '');

    const [couponCode, setCouponCode] = useState(appointment?.appliedCoupon || '');
    const [appliedCampaign, setAppliedCampaign] = useState<Campaign | null>(() => {
        return campaigns.find(c => c.couponCode === appointment?.appliedCoupon) || null;
    });

    const [mode, setMode] = useState<'VIEW' | 'CHECKOUT' | 'HISTORY' | 'EDIT_CUSTOMER'>((appointment?.status === 'Concluído' || appointment?.status === 'Cancelado') ? 'HISTORY' : 'VIEW');
    const [previousMode, setPreviousMode] = useState<'VIEW' | 'CHECKOUT' | 'HISTORY' | 'EDIT_CUSTOMER'>(mode);
    const [editCustomerName, setEditCustomerName] = useState(customer.name);
    const [editCustomerPhone, setEditCustomerPhone] = useState(customer.phone || '');
    
    const [adjustmentAmount, setAdjustmentAmount] = useState(appointment?.adjustmentAmount || 0);
    const [adjustmentReason, setAdjustmentReason] = useState(appointment?.adjustmentReason || '');
    const [showAdjustmentField, setShowAdjustmentField] = useState(false);
    
    const [showCpfPrompt, setShowCpfPrompt] = useState(false);
    const [tempCpf, setTempCpf] = useState(customer.cpf || '');

    const [isCancelling, setIsCancelling] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isZeroing, setIsZeroing] = useState(false);
    const [zeroOutReason, setZeroOutReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [latestAppointment, setLatestAppointment] = useState<Appointment | null>(null);
    const [whatsappResponseNeeded, setWhatsappResponseNeeded] = useState(appointment?.whatsappResponseNeeded || false);
    const [observation, setObservation] = useState(appointment?.observation || '');
    const [includeDebt, setIncludeDebt] = useState(false);
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
        show: false,
        message: '',
        type: 'success'
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setToast({ show: true, message, type });
    };

    const [restrictionAlert, setRestrictionAlert] = useState<{
        open: boolean;
        providerName: string;
        reason: string;
    }>({ open: false, providerName: '', reason: '' });
    const [showDebtConfirmModal, setShowDebtConfirmModal] = useState(false);
    const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);

    // NFSe State
    const [nfseStatus, setNfseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [nfseError, setNfseError] = useState<string | null>(null);
    const [nfseData, setNfseData] = useState<any>(null);
    const [showDebtDetails, setShowDebtDetails] = useState(false);
    const [fiscalConfigs, setFiscalConfigs] = useState<any[]>([]);
    const [showNfseManualDetail, setShowNfseManualDetail] = useState(false);
    const [showHistoryPopup, setShowHistoryPopup] = useState(false);
    const [customerHistory, setCustomerHistory] = useState<CustomerHistoryItem[]>(customer?.history || []);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [hasConsentForm, setHasConsentForm] = useState(false);
    const [showConsentFormModal, setShowConsentFormModal] = useState(false);

    useEffect(() => {
        supabase.from('professional_fiscal_config').select('*').then(({ data }) => {
            if (data) setFiscalConfigs(data);
        });
    }, []);

    const fetchFullHistory = async () => {
        if (!customer?.id && !customer?.phone) return;
        setIsLoadingHistory(true);
        try {
            let data: any = null;
            let error: any = null;

            // 1. Try by ID
            if (customer?.id && customer.id.length > 10) {
                const res = await supabase
                    .from('customers')
                    .select('history')
                    .eq('id', customer.id)
                    .maybeSingle();
                data = res.data;
                error = res.error;
            }

            // 2. Fallback to Phone if no history or error
            if ((!data || !data.history || data.history.length === 0) && customer?.phone) {
                const cleanPhone = customer.phone.replace(/\D/g, '');
                if (cleanPhone) {
                    const res = await supabase
                        .from('customers')
                        .select('history')
                        .ilike('phone', `%${cleanPhone}%`)
                        .maybeSingle();
                    if (res.data && res.data.history && res.data.history.length > 0) {
                        data = res.data;
                    }
                }
            }

            if (data && data.history) {
                setCustomerHistory(data.history);
            }
        } catch (err) {
            console.error('Error fetching customer history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (showHistoryPopup) {
            fetchFullHistory();
        }
    }, [showHistoryPopup]);

    const linesInsight = useMemo(() => {
        const productIds = lines.flatMap(l => l.products);
        if (productIds.length === 0) return null;

        // In the context of ServiceModal, we want to see history of used products
        return productIds.map(productId => {
            const stockItem = stock.find(s => s.id === productId);
            // Search in global sales for this product
            const pastSales = (allSales || []).filter(s =>
                s.items && Array.isArray(s.items) && s.items.some((si: any) => si.productId === productId)
            ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

            return {
                id: productId,
                name: stockItem?.name || 'Produto',
                priceHistory: stockItem?.priceHistory || [],
                pastSales
            };
        });
    }, [lines, stock, allSales]);

    const futureAppointments = useMemo(() => {
        if (!appointment?.id || !customer?.id) return [];
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
                return a.date >= todayStr;
            })
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }, [allAppointments, customer?.id, appointment?.id]);

    // --- REFRESH DATA ON OPEN TO PREVENT STALE STATE REGRESSIONS ---
    useEffect(() => {
        const isAptPersisted = isUUID(appointment.id);
        if (isAptPersisted && mode !== 'CHECKOUT' && mode !== 'HISTORY' && !isRefreshing) {
            const refreshData = async () => {
                setIsRefreshing(true);
                try {
                    const { data, error } = await supabase
                        .from('appointments')
                        .select('*')
                        .eq('id', appointment.id)
                        .single();

                    if (error) throw error;
                    if (data) {
                        const mapped: Appointment = {
                            id: data.id,
                            customerId: data.customer_id,
                            providerId: data.provider_id,
                            serviceId: data.service_id,
                            time: data.time,
                            date: data.date,
                            status: data.status,
                            combinedServiceNames: data.combined_service_names,
                            bookedPrice: data.booked_price,
                            mainServiceProducts: data.main_service_products,
                            additionalServices: data.additional_services,
                            appliedCoupon: data.applied_coupon,
                            discountAmount: data.discount_amount,
                            pricePaid: data.price_paid,
                            amount: data.amount,
                            paymentMethod: data.payment_method,
                            payments: data.payments || [],
                            recurrenceId: data.recurrence_id,
                            endTime: data.end_time,
                            quantity: data.quantity || 1,
                            startTimeActual: data.start_time_actual,
                            tipAmount: data.tip_amount,
                            isRemake: data.is_remake,
                            isReconciled: data.is_reconciled,
                            adjustmentAmount: data.adjustment_amount,
                            adjustmentReason: data.adjustment_reason,
                            observation: data.observation,
                            whatsappResponseNeeded: data.whatsapp_response_needed
                        };
                        setLatestAppointment(mapped);
                    }
                } catch (err) {
                    console.error('Error refreshing appointment data:', err);
                } finally {
                    setIsRefreshing(false);
                }
            };
            refreshData();
        }
    }, [appointment.id]);

    useEffect(() => {
        const apptToUse = latestAppointment || appointment;
        setStatus(apptToUse.status);
        setAppointmentTime(apptToUse.time);
        setAppointmentDate(apptToUse.date);
        setWhatsappResponseNeeded(apptToUse.whatsappResponseNeeded || false);
        setObservation(apptToUse.observation || '');
        setCouponCode(apptToUse.appliedCoupon || '');
        setAppliedCampaign(campaigns.find(c => c.couponCode === apptToUse.appliedCoupon) || null);
        setIsCancelling(false);
        setCancellationReason('');
        setIsZeroing(false);
        setZeroOutReason('');
        setIncludeDebt(false);

        if (apptToUse.status === 'Concluído') setMode('HISTORY');
        else if (apptToUse.status === 'Em Andamento' && source === 'DAILY') setMode('CHECKOUT');
        else setMode('VIEW');

        const mainService = services.find(s => s.id === apptToUse.serviceId);
        const initialLines: ServiceLine[] = [{
            id: 'main',
            serviceId: apptToUse.serviceId,
            providerId: apptToUse.providerId || customer.assignedProviderIds?.[0] || activeProviders[0]?.id || '',
            products: apptToUse.mainServiceProducts || [],
            currentSearchTerm: '',
            discount: apptToUse.discountAmount || 0,
            isCourtesy: apptToUse.isCourtesy || false,
            showProductResults: false,
            rating: 5,
            feedback: '',
            unitPrice: apptToUse.bookedPrice || mainService?.price || 0,
            startTime: apptToUse.time,
            endTime: apptToUse.endTime || (mainService ? calculateEndTime(apptToUse.time, mainService.durationMinutes, activeProviders.find(p => p.id === (apptToUse.providerId || customer.assignedProviderIds?.[0] || activeProviders[0]?.id)), mainService.name) : apptToUse.time),
            appointmentId: apptToUse.id,
            quantity: apptToUse.quantity || 1,
            tipAmount: (apptToUse.tipAmount || 0) - (apptToUse.additionalServices?.reduce((acc, s) => acc + (s.tipAmount || 0), 0) || 0),
            status: (apptToUse.status === 'Concluído' || apptToUse.status === 'Cancelado')
                ? apptToUse.status
                : (apptToUse.startTimeActual ? 'Em Andamento' :
                    (apptToUse.status === 'Aguardando' || apptToUse.status === 'Em Andamento' || apptToUse.status === 'Em atendimento' ? 'Aguardando' : 'Pendente')),
            startTimeActual: apptToUse.startTimeActual
        }];

        if (apptToUse.additionalServices) {
            const seenExtras = new Set<string>();
            seenExtras.add(`${apptToUse.serviceId}-${apptToUse.providerId}`);

            apptToUse.additionalServices.forEach((extra, idx) => {
                const key = `${extra.serviceId}-${extra.providerId}`;
                if (!seenExtras.has(key)) {
                    initialLines.push({
                        id: `extra-${idx}`,
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
                        startTime: extra.startTime || apptToUse.time,
                        endTime: extra.endTime || (() => {
                            const srv = services.find(s => s.id === extra.serviceId);
                            const prv = activeProviders.find(p => p.id === extra.providerId);
                            return srv ? calculateEndTime(extra.startTime || apptToUse.time, srv.durationMinutes, prv, srv.name) : (extra.startTime || apptToUse.time);
                        })(),
                        appointmentId: apptToUse.id,
                        clientName: extra.clientName,
                        clientPhone: extra.clientPhone,
                        isCompanion: !!extra.clientName,
                        quantity: extra.quantity || 1,
                        tipAmount: extra.tipAmount || 0,
                        status: (appointment.status === 'Concluído' || appointment.status === 'Cancelado') ? appointment.status : ((extra.status as any) || 'Pendente'),
                        startTimeActual: extra.startTimeActual
                    });
                    seenExtras.add(key);
                }
            });
        }

        const related = allAppointments.filter(a =>
            a.customerId === appointment.customerId &&
            a.date === appointment.date &&
            a.status !== 'Cancelado' &&
            a.id !== appointment.id
        );

        related.forEach((rel, rIdx) => {
            // Check if this related appointment's main service is already represented in initialLines BY ITS ID
            // Previously it checked by serviceId + providerId, which prevented identical duplicates from being merged.
            const alreadyExists = initialLines.some(l => l.appointmentId === rel.id && l.id === `rel-${rIdx}`);

            if (!alreadyExists) {
                const relService = services.find(s => s.id === rel.serviceId);
                initialLines.push({
                    id: `rel-${rIdx}`,
                    serviceId: rel.serviceId,
                    providerId: rel.providerId,
                    products: rel.mainServiceProducts || [],
                    currentSearchTerm: '',
                    discount: rel.discountAmount || 0,
                    isCourtesy: rel.isCourtesy || false,
                    showProductResults: false,
                    rating: 5,
                    feedback: '',
                    unitPrice: rel.bookedPrice || relService?.price || 0,
                    startTime: rel.time,
                    endTime: rel.endTime || (relService ? calculateEndTime(rel.time, relService.durationMinutes) : rel.time),
                    appointmentId: rel.id,
                    quantity: rel.quantity || 1,
                    tipAmount: rel.tipAmount || 0
                });
            }

            if (rel.additionalServices) {
                rel.additionalServices.forEach((extra, eIdx) => {
                    // Check if this extra service from related appointment is already in initialLines
                    const ExtraId = `rel-${rIdx}-extra-${eIdx}`;
                    const extraExists = initialLines.some(l => l.id === ExtraId);

                    if (!extraExists) {
                        initialLines.push({
                            id: ExtraId,
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
                            startTime: extra.startTime || rel.time,
                            endTime: extra.endTime || (services.find(s => s.id === extra.serviceId) ? calculateEndTime(extra.startTime || rel.time, services.find(s => s.id === extra.serviceId)!.durationMinutes) : (extra.startTime || rel.time)),
                            appointmentId: rel.id,
                            clientName: extra.clientName,
                            clientPhone: extra.clientPhone,
                            isCompanion: !!extra.clientName,
                            quantity: extra.quantity || 1,
                            tipAmount: extra.tipAmount || 0
                        });
                    }
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

        const checkConsentForm = async () => {
            if (!customer.id) return;
            const { count } = await supabase
                .from('customer_consent_forms')
                .select('id', { count: 'exact', head: true })
                .eq('customer_id', customer.id);
            
            setHasConsentForm(!!count && count > 0);
        };

        fetchNFSe();
        checkConsentForm();
    }, [appointment, latestAppointment, services, campaigns, source]);

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
        const serviceSubtotal = lines.reduce((acc, line) => {
            if (line.isCourtesy) return acc;
            const price = Number(line.unitPrice) || 0;
            const discount = Number(line.discount) || 0;
            const qty = Number(line.quantity) || 1;
            return acc + Math.max(0, (price * qty) - discount);
        }, 0);

        const totalTips = lines.reduce((acc, line) => acc + (Number(line.tipAmount) || 0), 0);

        let final = serviceSubtotal;
        let couponDiscountAmount = 0; // Initialize here for local scope

        // Apply Coupon
        if (appliedCampaign) {
            if (appliedCampaign.discountType === 'FIXED') {
                couponDiscountAmount = appliedCampaign.discountValue;
                final -= appliedCampaign.discountValue;
            } else if (appliedCampaign.discountType === 'PERCENTAGE') {
                couponDiscountAmount = serviceSubtotal * (appliedCampaign.discountValue / 100);
                final -= couponDiscountAmount;
            }
        }

        // Apply VIP Discount
        if (customer.isVip && customer.vipDiscountPercent) {
            const vipDiscount = final * (customer.vipDiscountPercent / 100);
            final -= vipDiscount;
        }

        if (includeDebt && customer.outstandingBalance && customer.outstandingBalance > 0) {
            final += customer.outstandingBalance;
        }

        // Add tips at the end (not subject to discounts)
        final += totalTips;

        // Apply Manual Adjustment
        final += adjustmentAmount;

        return Math.max(0, final);
    }, [lines, appliedCampaign, customer.isVip, customer.vipDiscountPercent, includeDebt, customer.outstandingBalance, adjustmentAmount]);

    // Auto-fill/Sync payment amount with totalValue
    useEffect(() => {
        if (payments.length === 1) {
            // We always sync the amount if there's only one payment, 
            // unless the user has manually entered a value (totalPaid !== payments[0].amount is not enough, 
            // we should probably just always sync if length is 1 for better UX in this specific app)
            // If they want to pay different, they can add another payment or we can add a 'manual' flag.
            // But based on the request, the sync should be tighter.
            setPayments(prev => [{ ...prev[0], amount: totalValue }]);
        }
    }, [totalValue, payments.length]);

    const totalBeforeCoupon = useMemo(() => {
        return lines.reduce((acc, line) => acc + (line.isCourtesy ? 0 : ((line.unitPrice * (line.quantity || 1)) - line.discount)), 0);
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
            const reasonEntry = customer.history
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
        // IDs of all appointments currently represented in this modal lines
        const currentApptIds = new Set(lines.map(l => l.appointmentId).filter(Boolean));
        if (appointment.id) currentApptIds.add(appointment.id);

        const currentCustomerId = customer.id;

        // Helper to convert time "HH:mm" to minutes from 00:00
        const toMinutes = (time: string) => {
            if (!time) return 0;
            const [h, m] = time.split(':').map(Number);
            return (h || 0) * 60 + (m || 0);
        };

        const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const modalDate = appointmentDate;

        // CHECK EACH LINE INDIVIDUALLY FOR ITS SPECIFIC PROVIDER
        for (const line of lines) {
            const providerId = line.providerId;
            if (!providerId) continue;

            const provider = providers.find(p => p.id === providerId);
            const lineStart = toMinutes(line.startTime || appointmentTime);
            const srv = services.find(s => s.id === line.serviceId);
            const lineDur = line.endTime ? (toMinutes(line.endTime) - lineStart) : (srv?.durationMinutes || 30);
            const lineEnd = lineStart + lineDur;

            // Find any overlapping appointment for THIS provider on THIS line
            const conflict = allAppointments.find(a => {
                // 1. Basic exclusions
                if (currentApptIds.has(a.id)) return false;
                if (a.date !== modalDate) return false;
                // if (a.customerId === currentCustomerId) return false; // REMOVED: Should detect if same customer is double-booked

                const isInternalBlock = a.combinedServiceNames === 'BLOQUEIO_INTERNO';
                if (a.status === 'Cancelado' && !isInternalBlock) return false;

                // 2. Determine all time windows for 'providerId' within appointment 'a'
                interface TimeWindow { start: number; end: number; }
                const windows: TimeWindow[] = [];

                if (a.providerId === providerId) {
                    const start = toMinutes(a.time);
                    const srv = services.find(s => s.id === a.serviceId);
                    const end = a.endTime ? toMinutes(a.endTime) : (start + (srv?.durationMinutes || 30));
                    windows.push({ start, end });
                }

                if (a.additionalServices) {
                    a.additionalServices.forEach((extra: any) => {
                        if (extra.providerId === providerId) {
                            const start = toMinutes(extra.startTime || a.time);
                            const srv = services.find(s => s.id === extra.serviceId);
                            const end = toMinutes(extra.endTime) || (start + (extra.durationMinutes || srv?.durationMinutes || 30));
                            windows.push({ start, end });
                        }
                    });
                }

                // If this provider isn't even in appt 'a', no conflict
                if (windows.length === 0) return false;

                // 3. Precise overlap check: (lineStart < w.end) && (lineEnd > w.start)
                const hasOverlap = windows.some(w => (lineStart < w.end) && (lineEnd > w.start));
                return hasOverlap;
            });

            if (conflict) {
                const isInternalBlock = conflict.combinedServiceNames === 'BLOQUEIO_INTERNO';
                const conflictStart = toMinutes(conflict.time);

                if (isInternalBlock) {
                    alert(`⚠️ AGENDA BLOQUEADA\n\n${provider?.name || 'A profissional'} está com a agenda bloqueada neste horário.\n\nPor favor, escolha outro horário ou profissional.`);
                    return true; // Stop
                } else if (conflictStart === lineStart) {
                    // Even if same start, we make it a warning instead of a block, unless it's a manual block
                    const proceed = window.confirm(`⚠️ CONFLITO DE HORÁRIO\n\n${provider?.name || 'A profissional'} já possui um atendimento que inicia exatamente às ${conflict.time}.\n\nDeseja agendar em duplicidade neste horário?`);
                    if (!proceed) return true;
                } else {
                    const proceed = window.confirm(`⚠️ AVISO DE INTERFERÊNCIA\n\n${provider?.name || 'A profissional'} possui um atendimento (${conflict.time}) que se sobrepõe a este horário.\n\nDeseja continuar mesmo assim?`);
                    if (!proceed) return true;
                }
            }
        }

        return false; // No conflicts found or user accepted warnings
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
                products: l.products,
                startTime: l.startTime,
                endTime: l.endTime,
                status: l.status || 'Pendente',
                startTimeActual: l.startTimeActual
            }));

            // 2. Combine and Deduplicate with target's existing extras
            // Logic: If same serviceId AND same providerId exists, don't add it again
            const existingExtras = targetAppt.additionalServices || [];
            const filteredNewExtras = newExtras.filter(ne =>
                !existingExtras.some(ee => ee.serviceId === ne.serviceId && ee.providerId === ne.providerId) &&
                !(targetAppt.serviceId === ne.serviceId && targetAppt.providerId === ne.providerId)
            );

            const updatedExtras = [
                ...existingExtras,
                ...filteredNewExtras
            ];

            // 3. Update target appointment
            const names = [
                targetAppt.combinedServiceNames || services.find(s => s.id === targetAppt.serviceId)?.name,
                ...lines.map(l => services.find(s => s.id === l.serviceId)?.name)
            ].flatMap(n => n ? n.split(' + ') : []);
            const combinedNames = Array.from(new Set(names)).filter(Boolean).join(' + ');

            const { error: updateError } = await supabase.from('appointments').update({
                additional_services: updatedExtras,
                combined_service_names: combinedNames
            }).eq('id', targetAppt.id);

            if (updateError) throw updateError;

            // 4. Delete current appointment if it exists (not new)
            // Identify if current appointment is persisted
            const isPersisted = isUUID(appointment.id);
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

    const normalizeString = (str: any) => {
        if (!str) return '';
        return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    };

    const checkForCustomerConflictAndMerge = async () => {
        const concurrentAppt = allAppointments.find(a => {
            if (a.id === appointment.id) return false;

            // Check if it's the same customer (by ID, Name, or Phone to catch duplicates)
            const isSameCustomer = a.customerId === customer.id || (() => {
                const otherCust = customers.find(c => String(c.id) === String(a.customerId));
                if (!otherCust) return false;

                const normOtherPhone = (otherCust.phone || '').replace(/\D/g, '');
                const normCurrentPhone = (customer.phone || '').replace(/\D/g, '');

                return (normCurrentPhone && normOtherPhone && normOtherPhone === normCurrentPhone) ||
                    (normalizeString(otherCust.name) === normalizeString(customer.name));
            })();

            if (!isSameCustomer) return false;

            // WIDEN WINDOW: Normalize time to minutes to check for +/- 15 min overlap
            const toMinutes = (t: string) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };

            const apptTimeMinutes = toMinutes(a.time.slice(0, 5));
            const currentTimeMinutes = toMinutes(appointmentTime.slice(0, 5));
            const diff = Math.abs(apptTimeMinutes - currentTimeMinutes);

            if (a.date !== appointmentDate) return false;
            
            // Catch exact duplicates (same date, same time) or overlaps
            if (diff > 15) return false;
            
            if (a.status === 'Cancelado') return false;
            // If it's already finished, we should probably warn or allow merging to fix duplication

            return true;
        });

        if (concurrentAppt) {
            const providerName = providers.find(p => p.id === concurrentAppt.providerId)?.name || 'Profissional';
            const statusLabel = concurrentAppt.status === 'Concluído' ? 'já CONCLUÍDO' : `agendado (${concurrentAppt.status})`;
            const confirmMerge = window.confirm(`⚠️ POSSÍVEL DUPLICIDADE\n\nA cliente ${customer.name} já tem um atendimento ${statusLabel} às ${concurrentAppt.time} com ${providerName}.\n\nPara manter a agenda organizada, deseja UNIR este novo serviço ao registro que já existe?`);

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

            // CHECK FOR ONE USE PER CUSTOMER
            // Rule applies moving forward: check if this customer already used the coupon in OTHER completed/pending appointments
            const alreadyUsed = allAppointments.some(a =>
                a.customerId === customer.id &&
                a.appliedCoupon === campaign.couponCode &&
                a.id !== appointment.id && // Don't block current appointment being edited
                a.status !== 'Cancelado'
            );

            if (alreadyUsed) {
                alert('Este cupom já foi utilizado por esta cliente.');
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

    const handleCheckIn = async () => {
        if (isSaving || restrictionData.isRestricted || handleCheckConflict()) return;

        setIsSaving(true);
        // Check for merge possibility
        if (await checkForCustomerConflictAndMerge()) {
            setIsSaving(false);
            return;
        }

        // Update all service lines to 'Aguardando' if they are 'Pendente'
        const updatedLines = lines.map(l => ({
            ...l,
            status: l.status === 'Pendente' ? 'Aguardando' : l.status
        }));

        const combinedNames = updatedLines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
        const extrasUnprocessed = updatedLines.slice(1).map(l => ({
            serviceId: l.serviceId,
            providerId: l.providerId,
            isCourtesy: l.isCourtesy,
            discount: l.discount,
            bookedPrice: l.unitPrice,
            products: l.products,
            startTime: l.startTime,
            endTime: l.endTime,
            clientName: l.clientName,
            clientPhone: l.clientPhone,
            quantity: l.quantity || 1,
            status: l.status || 'Pendente',
            startTimeActual: l.startTimeActual
        }));

        const extras = extrasUnprocessed;

        const dataToSave = {
            status: 'Aguardando',
            time: updatedLines[0].startTime,
            date: appointmentDate,
            combined_service_names: combinedNames,
            service_id: updatedLines[0].serviceId,
            provider_id: updatedLines[0].providerId,
            booked_price: updatedLines[0].unitPrice,
            main_service_products: updatedLines[0].products,
            additional_services: extras,
            applied_coupon: appliedCampaign?.couponCode,
            discount_amount: couponDiscountAmount,
            customer_id: customer.id,
            payments: payments,
            end_time: updatedLines[0].endTime,
            tip_amount: updatedLines.reduce((acc, l) => acc + (l.tipAmount || 0), 0),
            quantity: updatedLines[0].quantity || 1,
            start_time_actual: updatedLines[0].startTimeActual,
            observation: observation
        };

        try {
            // 0. Identify secondary appointments to "cancel/merge"
            const secondaryAppointmentIds = Array.from(new Set(
                updatedLines
                    .map(l => l.appointmentId)
                    .filter(id => id && id !== appointment.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
            ));

            const isNew = !/^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointment.id);
            let result;

            if (isNew) {
                result = await supabase.from('appointments').insert([dataToSave]).select().single();
            } else {
                result = await supabase.from('appointments').update(dataToSave).eq('id', appointment.id).select().single();
            }

            // 1.1 Handle Secondary Appointments (Auto-Merge)
            if (secondaryAppointmentIds.length > 0) {
                const { error: secondaryError } = await supabase
                    .from('appointments')
                    .update({
                        status: 'Cancelado',
                        combined_service_names: '[MESCLADO ATENDIMENTO PRINCIPAL]'
                    })
                    .in('id', secondaryAppointmentIds);
                if (secondaryError) console.error('Error updating secondary appointments:', secondaryError);
            }

            if (result.error) {
                if (result.error.code === '23505') {
                    alert('⚠️ OPS! JÁ EXISTE UM AGENDAMENTO NESTE HORÁRIO.\n\nEste atendimento foi duplicado ou já foi salvo em outra aba. Atualize a página e tente novamente.');
                    setIsSaving(false);
                    onClose();
                    return;
                }
                throw result.error;
            }
            const savedAppt = result.data;

            onUpdateAppointments(prev => {
                const updatedAppt = {
                    ...appointment,
                    id: savedAppt.id,
                    status: 'Aguardando',
                    providerId: updatedLines[0].providerId,
                    serviceId: updatedLines[0].serviceId,
                    time: updatedLines[0].startTime,
                    date: appointmentDate,
                    combinedServiceNames: combinedNames,
                    bookedPrice: updatedLines[0].unitPrice,
                    mainServiceProducts: updatedLines[0].products,
                    additionalServices: extras,
                    appliedCoupon: appliedCampaign?.couponCode,
                    discountAmount: couponDiscountAmount,
                    payments: payments,
                    endTime: updatedLines[0].endTime,
                    quantity: updatedLines[0].quantity || 1
                } as Appointment;

                let updated = prev;

                if (!isNew) {
                    updated = prev.map(a => {
                        if (a.id === appointment.id) return updatedAppt;
                        if (secondaryAppointmentIds.includes(a.id)) return { ...a, status: 'Cancelado' as Appointment['status'] };
                        return a;
                    });
                } else {
                    const filtered = prev.map(a => {
                        if (secondaryAppointmentIds.includes(a.id)) return { ...a, status: 'Cancelado' as Appointment['status'] };
                        return a;
                    }).filter(a => a.id !== appointment.id);
                    updated = [...filtered, updatedAppt];
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
        
        setIsSaving(true);
        
        if (totalPaid < totalValue - 0.01) {
            alert(`⚠️ Divergência de Valores\n\nTotal a Pagar: R$ ${totalValue.toFixed(2)}\nTotal Informado: R$ ${totalPaid.toFixed(2)}\n\nPor favor, o valor pago deve ser igual ou superior ao total.`);
            setIsSaving(false);
            return;
        }

        // --- VALIDATE SERVICES VS PROFESSIONALS ---
        for (const line of lines) {
            if (!isServiceAllowed(line.serviceId, line.providerId)) {
                const srv = services.find(s => s.id === line.serviceId);
                const pro = providers.find(p => p.id === line.providerId);
                alert(`⚠️ SERVIÇO INVÁLIDO\n\nO serviço "${srv?.name || 'Selecionado'}" não está habilitado para o(a) profissional "${pro?.name || 'Selecionado'}".\n\nPor favor, corrija a seleção antes de finalizar.`);
                setIsSaving(false);
                return;
            }
        }

        setIsSaving(true);

        // Check merge (though unlikely in finish flow, better safe)
        if (await checkForCustomerConflictAndMerge()) return;
        const isReFinalizing = appointment.status === 'Concluído';

        // Correct revenue calculation: only services and tips, exclude debt repayment
        const serviceTotal = totalValue - (includeDebt ? (customer.outstandingBalance || 0) : 0);
        const previousPricePaid = appointment.pricePaid || 0;
        const priceDifference = isReFinalizing ? (serviceTotal - previousPricePaid) : serviceTotal;
        const overpayment = Math.max(0, totalPaid - totalValue);

        const combinedNames = lines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
        const allProductsUsed = lines.flatMap(l => l.products);

        const extrasUnprocessed = lines.slice(1).map(l => ({
            serviceId: l.serviceId,
            providerId: l.providerId,
            isCourtesy: l.isCourtesy,
            discount: l.discount,
            bookedPrice: l.unitPrice,
            products: l.products,
            startTime: l.startTime,
            endTime: l.endTime,
            clientName: l.clientName,
            clientPhone: l.clientPhone,
            quantity: l.quantity || 1,
            status: 'Concluído',
            startTimeActual: l.startTimeActual,
            tipAmount: l.tipAmount
        }));

        const extras = extrasUnprocessed;

        const dischargeDate = appointment.date || formatLocalDate(new Date());

        const updatedData = {
            status: 'Concluído',
            price_paid: serviceTotal,
            payment_date: dischargeDate,
            payment_method: payments.length > 1 ? 'Múltiplos' : (payments[0]?.method || paymentMethod),
            products_used: allProductsUsed,
            combined_service_names: combinedNames,
            service_id: lines[0].serviceId, // CRITICAL: Update service to the one selected in checkout
            booked_price: lines[0].unitPrice,
            provider_id: lines[0].providerId, // CRITICAL: Update provider to the one selected in checkout
            is_courtesy: lines[0].isCourtesy,
            main_service_products: lines[0].products,
            additional_services: extras,
            applied_coupon: appliedCampaign?.couponCode,
            discount_amount: couponDiscountAmount,
            payments: payments,
            end_time: lines[0].endTime,
            tip_amount: lines.reduce((acc, l) => acc + (l.tipAmount || 0), 0),
            quantity: lines[0].quantity || 1,
            start_time_actual: lines[0].startTimeActual,
            observation: observation
        };

        try {
            // 0. Identify secondary appointments to "cancel/merge"
            const secondaryAppointmentIds = Array.from(new Set(
                lines
                    .map(l => l.appointmentId)
                    .filter(id => id && id !== appointment.id)
            ));

            // 1. Update Appointment
            const { error: apptError } = await supabase.from('appointments').update(updatedData).eq('id', appointment.id);
            if (apptError) throw apptError;

            // 1.1 Handle Secondary Appointments (Auto-Merge)
            if (secondaryAppointmentIds.length > 0) {
                const { error: secondaryError } = await supabase
                    .from('appointments')
                    .update({
                        status: 'Cancelado',
                        combined_service_names: '[MESCLADO ATENDIMENTO PRINCIPAL]'
                    })
                    .in('id', secondaryAppointmentIds);
                if (secondaryError) console.error('Error updating secondary appointments:', secondaryError);
            }

            // 2. Create Sale Record REMOVED (Prevents DRE duplication)
            // The appointment record itself is sufficient for Service revenue.

            // 3. Update Customer History (handled locally for now, assuming App.tsx will refetch on next load)
            // Currently App.tsx fetches history from 'customers' table?
            // Actually, customers table in Supabase doesn't have a 'history' JSONB yet in my plan,
            // but the UI uses it. Let's assume we update the customer's totals in DB.
            // 3. Update Customer History and Balance
            let newOutstandingBalance = customer.outstandingBalance || 0;
            let usedCredit = 0;
            payments.forEach(p => {
                if (p.method === 'Crédito Aminna' || p.method === 'Crédito') usedCredit += (p.amount || 0);
            });

            // If paying debt, reduce it (but ensure it doesn't go below zero if strict)
            if (includeDebt) {
                newOutstandingBalance = 0; // Paying off total debt
            }

            const { error: custError } = await supabase.from('customers').update({
                last_visit: dischargeDate,
                total_spent: customer.totalSpent + priceDifference,
                outstanding_balance: newOutstandingBalance,
                status: customer.status === 'Novo' ? 'Regular' : customer.status,
                credit_balance: (customer.creditBalance || 0) + overpayment - usedCredit
            }).eq('id', customer.id);
            if (custError) throw custError;

            // Notify about credit update
            if (overpayment > 0) {
                alert(`✅ Crédito Aminna Gerado!\n\nValor Excedente: R$ ${overpayment.toFixed(2)}\nNovo Saldo: R$ ${((customer.creditBalance || 0) + overpayment - usedCredit).toFixed(2)}`);
            }

            // Notify about credit update
            if (usedCredit > 0) {
                const finalBalance = (customer.creditBalance || 0) - usedCredit;
                alert(`✅ Crédito Aminna Utilizado!\n\nValor Debitado: R$ ${usedCredit.toFixed(2)}\nSaldo Restante: R$ ${finalBalance.toFixed(2)}`);
            }

            onUpdateAppointments(prev => {
                const exists = prev.find(a => a.id === appointment.id);
                const updatedAppt = {
                    ...appointment,
                    ...(exists || {}),
                    status: 'Concluído',
                    providerId: lines[0].providerId,
                    serviceId: lines[0].serviceId,
                    pricePaid: serviceTotal,
                    paymentDate: dischargeDate,
                    paymentMethod: payments.length > 1 ? 'Múltiplos' : (payments[0]?.method || paymentMethod),
                    productsUsed: allProductsUsed,
                    combinedServiceNames: combinedNames,
                    bookedPrice: lines[0].unitPrice,
                    mainServiceProducts: lines[0].products,
                    additionalServices: extras,
                    appliedCoupon: appliedCampaign?.couponCode,
                    discountAmount: couponDiscountAmount,
                    payments: payments,
                    endTime: lines[0].endTime,
                    tipAmount: lines.reduce((acc, l) => acc + (l.tipAmount || 0), 0),
                    quantity: lines[0].quantity || 1
                } as Appointment;

                return prev.map(a => {
                    if (a.id === appointment.id) return updatedAppt;
                    if (secondaryAppointmentIds.includes(a.id)) return { ...a, status: 'Cancelado' as Appointment['status'] };
                    return a;
                });
            });

            onUpdateCustomers(prev => prev.map(c => {
                if (c.id === customer.id) {
                    const newEntries: CustomerHistoryItem[] = lines.map(line => {
                        const s = services.find(srv => srv.id === line.serviceId);
                        const price = line.unitPrice - (line.discount || 0);
                        const paymentStr = payments.length > 0
                            ? payments.map(p => `${p.method}: R$${p.amount.toFixed(2)}`).join(', ')
                            : (paymentMethod || 'Não informado');

                        return {
                            id: `${Date.now()}-${line.id}`,
                            date: dischargeDate,
                            type: 'VISIT' as 'VISIT',
                            description: `Serviço: ${s?.name} ${appliedCampaign ? `(Cupom: ${appliedCampaign.couponCode})` : ''}`,
                            details: `Valor: R$ ${price.toFixed(2)} | Pagamento: ${paymentStr}${observation ? ` | Obs: ${observation}` : ''}`,
                            rating: line.rating,
                            feedback: line.feedback,
                            providerId: line.providerId,
                            productsUsed: line.products
                        };
                    });

                    return {
                        ...c,
                        lastVisit: dischargeDate,
                        totalSpent: c.totalSpent + priceDifference,
                        status: c.status === 'Novo' ? 'Regular' : c.status,
                        history: isReFinalizing ? c.history : [...newEntries, ...c.history],
                        creditBalance: (c.creditBalance || 0) + overpayment - usedCredit,
                        outstandingBalance: newOutstandingBalance
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

    const handleRemakeService = async () => {
        if (isSaving || restrictionData.isRestricted || customer.isBlocked) return;

        const confirmRemake = window.confirm(`⚠️ ATENÇÃO: REFAZER ATENDIMENTO\n\nAo confirmar, este atendimento será ZERADO.\n- A cliente NÃO será cobrada.\n- A profissional NÃO receberá comissão.\n\nDeseja realmente refazer este atendimento sem custos?`);
        if (!confirmRemake) return;

        setIsSaving(true);
        const combinedNames = lines.map(l => services.find(s => s.id === l.serviceId)?.name).join(' + ');
        const allProductsUsed = lines.flatMap(l => l.products);

        const extras = lines.slice(1).map(l => ({
            ...l,
            serviceId: l.serviceId,
            providerId: l.providerId,
            isCourtesy: true,
            discount: l.unitPrice,
            bookedPrice: 0,
            products: l.products,
            startTime: l.startTime,
            endTime: l.endTime,
            clientName: l.clientName,
            clientPhone: l.clientPhone,
            quantity: l.quantity || 1,
            status: 'Concluído',
            startTimeActual: l.startTimeActual
        }));

        const dischargeDate = appointment.date || formatLocalDate(new Date());
        const remakePaymentMethod = 'Refazer';

        const updatedData = {
            status: 'Concluído',
            price_paid: 0,
            payment_date: dischargeDate,
            payment_method: remakePaymentMethod,
            products_used: allProductsUsed,
            combined_service_names: combinedNames,
            service_id: lines[0].serviceId,
            booked_price: 0,
            provider_id: lines[0].providerId,
            main_service_products: lines[0].products,
            additional_services: extras,
            applied_coupon: null,
            discount_amount: lines[0].unitPrice,
            payments: [{ id: Date.now().toString(), method: remakePaymentMethod, amount: 0 }],
            end_time: lines[0].endTime,
            tip_amount: 0,
            start_time_actual: lines[0].startTimeActual,
            is_remake: true
        };

        try {
            const { error } = await supabase.from('appointments').update(updatedData).eq('id', appointment.id);
            if (error) throw error;

            onUpdateAppointments(prev => prev.map(a => a.id === appointment.id ? {
                ...appointment,
                status: 'Concluído',
                pricePaid: 0,
                paymentDate: dischargeDate,
                paymentMethod: remakePaymentMethod,
                productsUsed: allProductsUsed,
                combinedServiceNames: combinedNames,
                bookedPrice: 0,
                providerId: lines[0].providerId,
                mainServiceProducts: lines[0].products,
                additionalServices: extras as any,
                appliedCoupon: undefined,
                discountAmount: lines[0].unitPrice,
                payments: [{ id: Date.now().toString(), method: remakePaymentMethod, amount: 0 }],
                endTime: lines[0].endTime,
                tipAmount: 0,
                startTimeActual: lines[0].startTimeActual,
                isRemake: true
            } : a));

            alert('Atendimento marcado como REFAZER com sucesso.');
            onClose();
        } catch (error) {
            console.error('Error remaking service:', error);
            alert('Erro ao refazer atendimento no banco de dados.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartIndividualService = async (lineId: string) => {
        const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const updatedLines = lines.map(l => {
            if (l.id === lineId) {
                return { ...l, status: 'Em Andamento' as const, startTimeActual: now };
            }
            return l;
        });

        setLines(updatedLines);

        // Auto-save immediately, do NOT close the modal
        await handleSave(updatedLines, false);
    };

    const handleSave = async (manualLines?: ServiceLine[], closeAfter: boolean = true) => {
        if (isSaving) return;

        try {
            if (restrictionData.isRestricted) {
                alert(`⚠️ Agendamento Bloqueado\n\nMotivo: ${restrictionData.reason}`);
                return;
            }

            const linesToUse = manualLines || lines;

            // --- VALIDATE SELECTION ---
            for (const line of linesToUse) {
                if (!line.serviceId) {
                    showToast('Selecione o serviço para cada procedimento.', 'warning');
                    return;
                }
            }

            // --- VALIDATE SERVICES VS PROFESSIONALS ---
            for (const line of linesToUse) {
                if (!isServiceAllowed(line.serviceId, line.providerId)) {
                    showToast('O serviço selecionado não é permitido para este profissional.', 'error');
                    return;
                }
            }

            if (customer.isBlocked) {
                showToast('Esta cliente possui um bloqueio administrativo.', 'error');
                return;
            }

            if (handleCheckConflict()) {
                showToast('Conflito de horário detectado.', 'warning');
                return;
            }

            if (restrictionData.isRestricted) {
                setRestrictionAlert({ open: true, providerName: restrictionData.providerName, reason: restrictionData.reason });
                return;
            }

            // --- START SAVING ---
            setIsSaving(true);

            // Check for merge
            if (await checkForCustomerConflictAndMerge()) {
                console.log('Merge conflict detected or handled');
                return;
            }

            const isNew = !isUUID(appointment.id);

            // --- HARD BLOCK DUPLICATED SLOTS ---
            // Check for any non-cancelled appointment for the SAME CUSTOMER at the SAME TIME on the SAME DATE
            const existingRecord = allAppointments.find(a =>
                a.id !== appointment.id &&
                normalizeString(a.customerId) === normalizeString(customer.id) &&
                a.date === appointmentDate &&
                a.time.substring(0, 5) === appointmentTime.substring(0, 5) &&
                a.status !== 'Cancelado'
            );

            if (existingRecord && isNew) {
                // If it's the SAME provider, it's a hard duplicate
                if (String(existingRecord.providerId) === String(lines[0].providerId)) {
                    alert('⚠️ OPS! JÁ EXISTE UM AGENDAMENTO IDÊNTICO.\n\nEste atendimento para a mesma cliente, hora e profissional já existe. Vamos redirecionar você para o agendamento existente para que possa ADICIONAR os serviços lá.');
                    if (onSelectAppointment) onSelectAppointment(existingRecord);
                    return;
                } else {
                    // If it's a DIFFERENT provider but SAME time, offer to merge instead of allowing a duplicate record
                    const confirmMerge = window.confirm(`⚠️ CONFLITO DE HORÁRIO\n\n${customer.name} já possui um agendamento às ${existingRecord.time} com outro(a) profissional nesta data.\n\nDeseja MESCLAR este novo serviço no agendamento existente? (Recomendado)`);
                    if (confirmMerge) {
                        await performMerge(existingRecord);
                        return;
                    }
                }
            }

            const linesToUseForSave = manualLines || lines;
            const serviceNamesArray = linesToUseForSave.map(l => services.find(s => s.id === l.serviceId)?.name).filter(Boolean);
            const uniqueNames = Array.from(new Set(serviceNamesArray));
            const combinedNames = uniqueNames.join(' + ');
            const extrasUnprocessed = linesToUseForSave.slice(1).map(l => ({
                serviceId: l.serviceId,
                providerId: l.providerId,
                isCourtesy: l.isCourtesy,
                discount: l.discount,
                bookedPrice: l.unitPrice,
                products: l.products,
                startTime: l.startTime,
                endTime: l.endTime,
                clientName: l.clientName,
                clientPhone: l.clientPhone,
                quantity: l.quantity || 1,
                status: l.status || 'Pendente',
                startTimeActual: l.startTimeActual,
                tipAmount: l.tipAmount
            }));

            const extras = extrasUnprocessed;
            const recId = isRecurring ? `rec-${Date.now()}` : appointment.recurrenceId;

            let finalGlobalStatus = status;
            
            // If any line is in progress, the whole appointment should be "Em Andamento"
            if (linesToUseForSave.some(l => l.status === 'Em Andamento') && 
                (status === 'Aguardando' || status === 'Em atendimento' || status === 'Confirmado' || status === 'Pendente')) {
                finalGlobalStatus = 'Em Andamento';
            }

            // IMPORTANT: If global status is "Confirmado" or "Pendente", ensure no active line is "Aguardando"
            if (finalGlobalStatus === 'Confirmado' || finalGlobalStatus === 'Pendente') {
                extras.forEach(ex => {
                    if (ex.status === 'Aguardando') ex.status = 'Pendente';
                });
            }

            const dataToSave = {
                time: linesToUseForSave[0].startTime,
                date: appointmentDate,
                status: finalGlobalStatus,
                combined_service_names: combinedNames,
                service_id: linesToUseForSave[0].serviceId,
                provider_id: linesToUseForSave[0].providerId,
                booked_price: linesToUseForSave[0].unitPrice,
                main_service_products: linesToUseForSave[0].products,
                additional_services: extras,
                applied_coupon: appliedCampaign?.couponCode,
                discount_amount: couponDiscountAmount,
                adjustment_amount: adjustmentAmount,
                adjustment_reason: adjustmentReason,
                customer_id: customer.id,
                payments: payments,
                end_time: linesToUseForSave[0].endTime,
                tip_amount: linesToUseForSave.reduce((acc, l) => acc + (l.tipAmount || 0), 0),
                recurrence_id: recId,
                quantity: linesToUseForSave[0].quantity || 1,
                start_time_actual: linesToUseForSave[0].startTimeActual,
                whatsapp_response_needed: whatsappResponseNeeded,
                observation: observation
            };

            // 0. Identify secondary appointments to "cancel/merge"
            const secondaryAppointmentIds = Array.from(new Set(
                linesToUseForSave
                    .map(l => l.appointmentId)
                    .filter(id => id && id !== appointment.id && isUUID(id))
            ));

            let result;
            if (isNew) {
                result = await supabase.from('appointments').insert([dataToSave]).select();
            } else {
                result = await supabase.from('appointments').update(dataToSave).eq('id', appointment.id).select();
            }

            // 1.1 Handle Secondary Appointments (Auto-Merge)
            if (secondaryAppointmentIds.length > 0) {
                const { error: secondaryError } = await supabase
                    .from('appointments')
                    .update({
                        status: 'Cancelado',
                        combined_service_names: '[MESCLADO ATENDIMENTO PRINCIPAL]'
                    })
                    .in('id', secondaryAppointmentIds);
                if (secondaryError) console.error('Error updating secondary appointments:', secondaryError);
            }

            const { data, error } = result;
            if (error) throw error;

            const savedAppt = data?.[0];
            if (!savedAppt) throw new Error('No data returned from database');

            let allSaved = [savedAppt];

            // --- HANDLE RECURRENCE ---
            if (isRecurring && isNew) {
                const futureDates: string[] = [];
                let current = new Date(appointmentDate + 'T12:00:00');

                for (let i = 0; i < recurrenceCount; i++) {
                    if (recurrenceFrequency === 'WEEKLY') current.setDate(current.getDate() + 7);
                    else if (recurrenceFrequency === 'BIWEEKLY') current.setDate(current.getDate() + 14);
                    else if (recurrenceFrequency === 'MONTHLY') current.setMonth(current.getMonth() + 1);
                    futureDates.push(formatLocalDate(current));
                }

                const bulkData = futureDates.map(d => ({
                    ...dataToSave,
                    date: d,
                    status: 'Pendente'
                }));

                const { data: bulkSaved, error: bulkError } = await supabase.from('appointments').insert(bulkData).select();
                if (bulkError) console.error('Error creating future appointments:', bulkError);
                if (bulkSaved) allSaved = [...allSaved, ...bulkSaved];
            }

            onUpdateAppointments(prev => {
                const exists = prev.find(a => a.id === appointment.id);
                let newLocalAppts = allSaved.map(s => ({
                    ...appointment,
                    id: s.id,
                    customerId: s.customer_id,
                    providerId: s.provider_id,
                    serviceId: s.service_id,
                    time: s.time,
                    date: s.date,
                    status: s.status as Appointment['status'],
                    combinedServiceNames: s.combined_service_names,
                    bookedPrice: s.booked_price,
                    mainServiceProducts: s.main_service_products,
                    additionalServices: s.additional_services,
                    appliedCoupon: s.applied_coupon,
                    discountAmount: s.discount_amount,
                    pricePaid: s.price_paid,
                    paymentMethod: s.payment_method,
                    payments: s.payments || [],
                    recurrenceId: s.recurrence_id,
                    endTime: s.end_time,
                    quantity: s.quantity || 1,
                    startTimeActual: s.start_time_actual,
                    whatsappResponseNeeded: s.whatsapp_response_needed
                } as Appointment));

                if (exists) {
                    const mainResult = newLocalAppts[0];
                    const others = newLocalAppts.slice(1);
                    return prev.map(a => {
                        if (a.id === appointment.id) return mainResult;
                        if (secondaryAppointmentIds.includes(a.id)) return { ...a, status: 'Cancelado' as Appointment['status'] };
                        return a;
                    }).concat(others);
                } else {
                    const filtered = prev.map(a => {
                        if (secondaryAppointmentIds.includes(a.id)) return { ...a, status: 'Cancelado' as Appointment['status'] };
                        return a;
                    }).filter(a => a.id !== appointment.id);
                    return [...filtered, ...newLocalAppts];
                }
            });

            if (closeAfter) {
                onClose();
                if (allSaved.length > 1) {
                    alert(`Agendamento e ${allSaved.length - 1} repetições criados com sucesso!`);
                }
            }
        } catch (error: any) {
            console.error('Error in handleSave:', error);
            if (error.code === '23505') {
                alert('⚠️ OPS! JÁ EXISTE UM AGENDAMENTO IDÊNTICO.\n\nEste atendimento para a mesma cliente, hora e profissional já existe nesta data.\n\nPor favor, unifique os agendamentos ou use horários diferentes.');
            } else if (error.message?.includes('uuid')) {
                alert('🔴 Erro de Identificador Inválido.\n\nO sistema tentou salvar um registro com ID temporário. Por favor, feche e abra o card de novo e tente salvar novamente.');
            } else {
                alert(`Erro ao salvar no banco de dados.\n\nDetalhes: ${error.message || 'Erro desconhecido'}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCustomer = async () => {
        if (!editCustomerName.trim()) {
            alert('O nome do cliente é obrigatório');
            return;
        }

        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    name: editCustomerName.trim(),
                    phone: editCustomerPhone.trim()
                })
                .eq('id', customer.id);

            if (error) throw error;

            alert('Cliente atualizado com sucesso');

            // Update local state by calling onUpdateCustomers
            if (onUpdateCustomers) {
                onUpdateCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, name: editCustomerName.trim(), phone: editCustomerPhone.trim() } : c));
            }

            // Return to previous mode
            setMode(previousMode);
        } catch (error) {
            console.error('Error updating customer:', error);
            alert('Erro ao atualizar cliente');
        }
    };

    const handleBackFromEdit = () => {
        setMode(previousMode);
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
            const extrasUnprocessed = lines.slice(1).map(l => ({
                serviceId: l.serviceId,
                providerId: l.providerId,
                isCourtesy: l.isCourtesy,
                discount: l.discount,
                bookedPrice: l.unitPrice,
                products: l.products,
                startTime: l.startTime,
                clientName: l.clientName,
                clientPhone: l.clientPhone,
                tipAmount: l.tipAmount
            }));

            const extras = extrasUnprocessed;

            const dischargeDate = appointment.date || formatLocalDate(new Date());

            const updatedData = {
                status: 'Concluído',
                price_paid: 0, // Paid now is 0
                payment_date: dischargeDate,
                payment_method: 'Dívida',
                products_used: allProductsUsed,
                combined_service_names: combinedNames,
                service_id: lines[0].serviceId,
                booked_price: lines[0].unitPrice,
                provider_id: lines[0].providerId,
                is_courtesy: lines[0].isCourtesy,
                adjustment_amount: adjustmentAmount,
                adjustment_reason: adjustmentReason,
                main_service_products: lines[0].products,
                additional_services: extras,
                applied_coupon: appliedCampaign?.couponCode,
                discount_amount: couponDiscountAmount,
                payments: [{ id: 'debt-' + Date.now(), method: 'Dívida', amount: totalValue }],
                tip_amount: lines.reduce((acc, l) => acc + (l.tipAmount || 0), 0),
                observation: observation
            };

            // 0. Identify secondary appointments to "cancel/merge"
            const secondaryAppointmentIds = Array.from(new Set(
                lines
                    .map(l => l.appointmentId)
                    .filter(id => id && id !== appointment.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
            ));

            // 1. Update Appointment
            const { error: apptError } = await supabase.from('appointments').update(updatedData).eq('id', appointment.id);
            if (apptError) throw apptError;

            // 1.1 Handle Secondary Appointments (Auto-Merge)
            if (secondaryAppointmentIds.length > 0) {
                const { error: secondaryError } = await supabase
                    .from('appointments')
                    .update({
                        status: 'Cancelado',
                        combined_service_names: '[MESCLADO ATENDIMENTO PRINCIPAL]'
                    })
                    .in('id', secondaryAppointmentIds);
                if (secondaryError) console.error('Error updating secondary appointments:', secondaryError);
            }

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
                    providerId: lines[0].providerId,
                    serviceId: lines[0].serviceId,
                    pricePaid: 0,
                    paymentDate: dischargeDate,
                    paymentMethod: 'Dívida',
                    productsUsed: allProductsUsed,
                    combinedServiceNames: combinedNames,
                    bookedPrice: lines[0].unitPrice,
                    isCourtesy: lines[0].isCourtesy,
                    mainServiceProducts: lines[0].products,
                    additionalServices: extras,
                    appliedCoupon: appliedCampaign?.couponCode,
                    discountAmount: couponDiscountAmount,
                    tipAmount: lines[0].tipAmount
                } as Appointment;

                if (exists) {
                    return prev.map(a => {
                        if (a.id === appointment.id) return updatedAppt;
                        if (secondaryAppointmentIds.includes(a.id)) return { ...a, status: 'Cancelado' as Appointment['status'] };
                        return a;
                    });
                } else {
                    const filtered = prev.map(a => {
                        if (secondaryAppointmentIds.includes(a.id)) return { ...a, status: 'Cancelado' as Appointment['status'] };
                        return a;
                    }).filter(a => a.id !== appointment.id);
                    return [...filtered, updatedAppt];
                }
            });

            onUpdateCustomers(prev => prev.map(c => {
                if (c.id === customer.id) {
                    const newEntries: CustomerHistoryItem[] = lines.map(line => ({
                        id: `${Date.now()}-${line.id}`,
                        date: dischargeDate,
                        type: 'VISIT',
                        description: `Serviço (Fiado): ${services.find(s => s.id === line.serviceId)?.name}`,
                        details: `Dívida Criada: R$ ${totalValue.toFixed(2)}${observation ? ` | Obs: ${observation}` : ''}`,
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

            console.log('🔍 [NFSe Debug] Fetching record for appointment:', appointment.id);
            if (error) console.log('❌ [NFSe Debug] Fetch error:', error);
            if (data) console.log('✅ [NFSe Debug] Record found:', data);

            let record = data;

            if (!record && error?.code === 'PGRST116') {
                console.log('⚠️ [NFSe Debug] No record found (PGRST116)');
                setNfseStatus('idle');
                setNfseData(null);
                return;
            }

            if (record && record.status !== 'issued' && record.status !== 'cancelled') {
                try {
                    await focusNfeService.queryNFSeStatus(record.id);
                    const { data: updated } = await supabase.from('nfse_records').select('*').eq('id', record.id).single();
                    if (updated) record = updated;
                } catch (e) { console.error('Silent update failed', e); }
            }

            setNfseData(record);
            if (record && record.status === 'error') {
                setNfseError(typeof record.error_message === 'string' ? record.error_message : JSON.stringify(record.error_message) || 'Erro na emissão');
                setNfseStatus('error');
            } else {
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

    const generateFiscalDetailingText = () => {
        if (!appointment) return '';
        
        const config = fiscalConfigs.find(c => c.provider_id === appointment.providerId);
        const razSoc = config?.social_name || 'NÃO INFORMADO';
        const cnpj = config?.cnpj || 'NÃO INFORMADO';
        const perc = Number(config?.service_percentage) || 0;

        const currentMonth = appointment.date ? appointment.date.split('-')[1] : '';
        const currentYear = appointment.date ? appointment.date.split('-')[0] : '';
        const competence = `${currentMonth}/${currentYear}`;

        const provider = providers.find(p => p.id === appointment.providerId);
        const profName = provider?.name || 'NÃO INFORMADO';

        // Group services
        const serviceMap: Record<string, { total: number; qty: number }> = {};
        
        // Add main service
        const mainService = services.find(s => s.id === appointment.serviceId);
        if (mainService) {
            const name = mainService.name.toUpperCase();
            const booked = appointment.bookedPrice || mainService.price || 0;
            const qty = appointment.quantity || 1;
            const value = booked * qty * (perc / 100);
            serviceMap[name] = { total: value, qty };
        }

        // Add additional services
        (appointment.additionalServices || []).forEach(extra => {
            const extraSvc = services.find(s => s.id === extra.serviceId);
            if (extraSvc) {
                const name = extraSvc.name.toUpperCase();
                const booked = extra.bookedPrice || extraSvc.price || 0;
                const qty = extra.quantity || 1;
                const value = booked * qty * (perc / 100);
                if (serviceMap[name]) {
                    serviceMap[name].total += value;
                    serviceMap[name].qty += qty;
                } else {
                    serviceMap[name] = { total: value, qty };
                }
            }
        });

        const totalCotas = Object.values(serviceMap).reduce((sum, item) => sum + item.total, 0);

        let linesText = Object.entries(serviceMap)
            .map(([name, data]) => `• ${name}: R$ ${data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (QTD: ${data.qty})`)
            .join('\n');

        return `SERVIÇOS REALIZADOS\n\nCOMPETÊNCIA: ${competence}\nPROFISSIONAL: ${profName}\nPERCENTUAL CONTRATO: ${perc}% CONFORME LEI 13.352/2016 (ART. 1º-A):\nRAZÃO SOCIAL: ${razSoc}\nCNPJ: ${cnpj}\n\nVALORES REFERENTES À COTA-PARTE DO PROFISSIONAL PARCEIRO, SEGREGADOS NOS TERMOS DA LEI Nº 13.352/2016.\n\n${linesText}\n\nTOTAL DAS COTAS-PARTE: R$ ${totalCotas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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

    const handleConfirmZeroOut = async () => {
        if (!zeroOutReason.trim()) {
            alert('Por favor, informe a justificativa para zerar a comanda.');
            return;
        }

        setIsSaving(true);

        try {
            const dischargeDate = appointment.date || formatLocalDate(new Date());
            const zeroPaymentMethod = 'Justificativa: ' + zeroOutReason;

            // 1. Prepare data with 0 values
            const updatedLines = lines.map(l => ({
                ...l,
                unitPrice: 0,
                discount: 0,
                bookedPrice: 0,
                status: 'Concluído' as const
            }));

            const serviceNamesArray = updatedLines.map(l => services.find(s => s.id === l.serviceId)?.name).filter(Boolean);
            const uniqueNames = Array.from(new Set(serviceNamesArray));
            const combinedNames = uniqueNames.join(' + ');

            const extrasUnprocessed = updatedLines.slice(1).map(l => ({
                serviceId: l.serviceId,
                providerId: l.providerId,
                isCourtesy: l.isCourtesy,
                discount: 0,
                bookedPrice: 0,
                products: l.products,
                startTime: l.startTime,
                endTime: l.endTime,
                clientName: l.clientName,
                clientPhone: l.clientPhone,
                quantity: l.quantity || 1,
                status: 'Concluído',
                startTimeActual: l.startTimeActual
            }));

            const extras: typeof extrasUnprocessed = [];
            const seen = new Set<string>();
            seen.add(`${updatedLines[0].serviceId}-${updatedLines[0].providerId}`);

            extrasUnprocessed.forEach(e => {
                const key = `${e.serviceId}-${e.providerId}`;
                if (!seen.has(key)) {
                    extras.push(e);
                    seen.add(key);
                }
            });

            const updatedData: any = {
                status: 'Concluído',
                price_paid: 0,
                payment_date: dischargeDate,
                payment_method: zeroPaymentMethod,
                combined_service_names: combinedNames,
                service_id: updatedLines[0].serviceId,
                booked_price: 0,
                provider_id: updatedLines[0].providerId,
                main_service_products: updatedLines[0].products,
                additional_services: extras,
                applied_coupon: null,
                discount_amount: 0,
                payments: [{ id: 'zero-' + Date.now(), method: zeroPaymentMethod, amount: 0 }],
                end_time: updatedLines[0].endTime,
                tip_amount: 0,
                start_time_actual: updatedLines[0].startTimeActual,
                is_remake: true,
                observation: (observation ? observation + '\n' : '') + `JUSTIFICATIVA: ${zeroOutReason.toUpperCase()}`
            };

            // Identify secondary appointments to "cancel/merge"
            const secondaryAppointmentIds = Array.from(new Set(
                updatedLines
                    .map(l => l.appointmentId)
                    .filter(id => id && id !== appointment.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
            ));

            // 2. Update Appointment
            const { error: apptError } = await supabase.from('appointments').update(updatedData).eq('id', appointment.id);
            if (apptError) throw apptError;

            // 2.1 Handle Secondary Appointments (Auto-Merge)
            if (secondaryAppointmentIds.length > 0) {
                const { error: secondaryError } = await supabase
                    .from('appointments')
                    .update({
                        status: 'Cancelado',
                        combined_service_names: '[MESCLADO ATENDIMENTO PRINCIPAL]'
                    })
                    .in('id', secondaryAppointmentIds);
                if (secondaryError) console.error('Error updating secondary appointments:', secondaryError);
            }

            const { error: custError } = await supabase.from('customers').update({
                last_visit: dischargeDate
            }).eq('id', customer.id);
            if (custError) throw custError;

            // 4. Update local state
            onUpdateAppointments(prev => prev.map(a => {
                if (a.id === appointment.id) {
                    return {
                        ...a,
                        status: 'Concluído',
                        pricePaid: 0,
                        paymentDate: dischargeDate,
                        paymentMethod: zeroPaymentMethod,
                        combinedServiceNames: combinedNames,
                        bookedPrice: 0,
                        providerId: updatedLines[0].providerId,
                        mainServiceProducts: updatedLines[0].products,
                        additionalServices: extras as any,
                        appliedCoupon: undefined,
                        discountAmount: 0,
                        payments: [{ id: 'zero-' + Date.now().toString(), method: zeroPaymentMethod, amount: 0 }],
                        endTime: updatedLines[0].endTime,
                        tipAmount: 0,
                        startTimeActual: updatedLines[0].startTimeActual,
                        isRemake: true,
                        observation: updatedData.observation
                    } as Appointment;
                }
                if (secondaryAppointmentIds.includes(a.id)) {
                    return { ...a, status: 'Cancelado' as Appointment['status'] };
                }
                return a;
            }));

            onUpdateCustomers(prev => prev.map(c => c.id === customer.id ? {
                ...c,
                lastVisit: dischargeDate
            } : c));

            alert('Comanda zerada com sucesso.');
            onClose();
        } catch (error) {
            console.error('Error zeroing out comanda:', error);
            alert('Erro ao zerar comanda no banco de dados.');
        } finally {
            setIsSaving(false);
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

            const today = formatLocalDate(new Date());

            // 2. Update local state for appointments
            const secondaryAppointmentIds = Array.from(new Set(
                lines
                    .map(l => l.appointmentId)
                    .filter(id => id && id !== appointment.id)
            ));

            if (secondaryAppointmentIds.length > 0) {
                await supabase
                    .from('appointments')
                    .update({ status: 'Cancelado' })
                    .in('id', secondaryAppointmentIds);
            }

            onUpdateAppointments(prev => prev.map(a =>
                (a.id === appointment.id || secondaryAppointmentIds.includes(a.id))
                    ? { ...a, status: 'Cancelado' }
                    : a
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
                    const updatedHistory = [cancelEntry, ...(c.history || [])];

                    // Update database
                    supabase.from('customers').update({
                        history: updatedHistory
                    }).eq('id', customer.id).then(({ error }) => {
                        if (error) console.error('Error updating customer history in DB:', error);
                    });

                    return {
                        ...c,
                        history: updatedHistory
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

    const handleDeleteAppointment = async () => {
        const confirmDelete = window.confirm('⚠️ ATENÇÃO: EXCLUIR AGENDAMENTO\n\nEsta ação excluirá PERMANENTEMENTE este agendamento do banco de dados.\nNão será possível recuperar os dados.\n\nDeseja realmente excluir este agendamento?');
        if (!confirmDelete) return;

        setIsSaving(true);

        try {
            // 1. Identify all appointment IDs to delete (main + merged ones)
            const allAppointmentIdsToDelete = Array.from(new Set(
                lines
                    .map(l => l.appointmentId)
                    .filter(id => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
            ));

            if (appointment.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointment.id)) {
                allAppointmentIdsToDelete.push(appointment.id);
            }

            if (allAppointmentIdsToDelete.length === 0) {
                // Draft appointment, just close
                onClose();
                return;
            }

            // 2. Delete from Supabase
            const { error: deleteError } = await supabase
                .from('appointments')
                .delete()
                .in('id', allAppointmentIdsToDelete);

            if (deleteError) throw deleteError;

            // 3. Update local state
            onUpdateAppointments(prev => prev.filter(a => !allAppointmentIdsToDelete.includes(a.id)));

            onClose();
        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert('Erro ao excluir agendamento do banco de dados.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleFutureStatus = (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Confirmado' ? 'Pendente' : 'Confirmado';
        onUpdateAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as Appointment['status'] } : a));
    };
    const toggleFavoriteProvider = async (providerId: string) => {
        if (!providerId) return;
        const isFavorite = customer.assignedProviderIds?.includes(providerId);
        const newFavorites = isFavorite
            ? (customer.assignedProviderIds || []).filter(id => id !== providerId)
            : [...(customer.assignedProviderIds || []), providerId];

        try {
            const { error } = await supabase
                .from('customers')
                .update({ assigned_provider_ids: newFavorites })
                .eq('id', customer.id);

            if (error) throw error;

            onUpdateCustomers(prev => prev.map(c =>
                c.id === customer.id
                    ? { ...c, assignedProviderIds: newFavorites }
                    : c
            ));
        } catch (error) {
            console.error('Error toggling favorite provider:', error);
        }
    };

    const addServiceLine = () => {
        const defaultProviderId = customer.assignedProviderIds?.[0] || providers.filter(p => p.active)[0].id;

        setLines([...lines, {
            id: Date.now().toString(),
            serviceId: '',
            providerId: defaultProviderId,
            products: [],
            currentSearchTerm: '',
            discount: 0,
            isCourtesy: false,
            showProductResults: false,
            rating: 5,
            feedback: '',
            unitPrice: 0,
            startTime: appointment.time,
            endTime: appointment.time,
            isCompanion: false,
            quantity: 1,
            tipAmount: 0,
            status: (appointment.status === 'Em Andamento' || appointment.status === 'Em atendimento') ? 'Aguardando' : 'Pendente'
        }]);
    };

    const addCompanionLine = () => {
        setLines([...lines, {
            id: Date.now().toString(),
            serviceId: '',
            providerId: customer.assignedProviderIds?.[0] || providers.filter(p => p.active)[0].id,
            products: [],
            currentSearchTerm: '',
            discount: 0,
            isCourtesy: false,
            showProductResults: false,
            rating: 5,
            feedback: '',
            unitPrice: 0,
            startTime: appointment.time, // Default to main time (parallel)
            endTime: appointment.time,
            isCompanion: true,
            clientName: '',
            clientPhone: '',
            quantity: 1,
            tipAmount: 0 // Initialize tipAmount
        }]);
    };

    const removeServiceLine = (id: string) => {
        if (lines.length > 1) {
            setLines(lines.filter(l => l.id !== id));
        }
    };

    const isServiceAllowed = (serviceId: string | undefined, providerId: string | undefined) => {
        if (!serviceId || !providerId) return true;
        const pro = providers.find(p => p.id === providerId);
        const srv = services.find(s => s.id === serviceId);
        if (!pro || !srv) return true;

        // If professional has NO specialties defined, assume they can do everything (default behavior)
        if (!pro.specialties || pro.specialties.length === 0) return true;

        // Match by name (case insensitive for safety)
        const srvNameNormalized = srv.name.trim().toLowerCase();
        return pro.specialties.some(spec => spec.trim().toLowerCase() === srvNameNormalized);
    };

    const updateLine = (id: string, field: keyof ServiceLine, value: any) => {
        setLines(lines.map(line => {
            if (line.id !== id) return line;
            const updated = { ...line, [field]: value };

            // AUTO-RECALCULATE END TIME if Service, Provider, or StartTime changes
            if (field === 'serviceId' || field === 'providerId' || field === 'startTime') {
                const srv = services.find(s => s.id === (field === 'serviceId' ? value : line.serviceId));
                const prv = activeProviders.find(p => p.id === (field === 'providerId' ? value : line.providerId));
                const start = field === 'startTime' ? value : line.startTime;

                if (srv) {
                    updated.endTime = calculateEndTime(start, srv.durationMinutes, prv, srv.name);
                    // Only reset price if SERVICE changes
                    if (field === 'serviceId') {
                        updated.unitPrice = srv.price;
                    }
                } else if (field === 'serviceId') {
                    updated.endTime = start;
                    updated.unitPrice = 0;
                }

                if (field === 'startTime' && line.id === 'main') {
                    setAppointmentTime(value);
                }
            }
            return updated;
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

    const handleWhatsAppReminder = (action: 'COPY' | 'OPEN') => {
        if (!customer.phone) {
            alert('Cliente sem telefone cadastrado.');
            return;
        }

        const cleanPhone = customer.phone.replace(/\D/g, '');
        const whatsappPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        // Greeting based on current time
        const now = new Date();
        const hoursNow = now.getHours();
        let greeting = 'Bom dia';
        if (hoursNow >= 12 && hoursNow < 18) greeting = 'Boa tarde';
        else if (hoursNow >= 18) greeting = 'Boa noite';

        // Date formatting: QUARTA-FEIRA 15 ABRIL
        const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
        const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
        
        // Ensure date is parsed correctly regardless of timezone
        const dateObj = new Date(appointmentDate + 'T12:00:00');
        const formattedDate = `${weekdays[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

        const prefIds = (customer.assignedProviderIds || (customer.assignedProviderId ? [customer.assignedProviderId] : [])).map(id => String(id).trim().toLowerCase());

        // Service details list
        const serviceDetails = lines.map(line => {
            const service = services.find(s => s.id === line.serviceId);
            const provider = providers.find(p => p.id === line.providerId);
            const time = line.startTime || appointmentTime;
            const [hour, minute] = time.split(':');
            const displayTime = minute === '00' ? `${hour}H` : `${hour}H${minute}h`;
            
            const pid = String(line.providerId).trim().toLowerCase();
            const isPref = prefIds.includes(pid);
            const nameToUse = (isPref && provider) ? (provider.nickname || provider.name.split(' ')[0]) : 'Equipe';
            
            let labelLine = '';
            if (isPref) {
                labelLine = `*Agendamento com preferência | ${nameToUse}*`;
            } else {
                labelLine = `*Agendamento confirmado | Equipe*`;
            }

            return `${displayTime} | ${service?.name || 'Serviço'}\n${labelLine}`;
        }).join('\n\n');

        const message = `${greeting}, ${customer.name.split(' ')[0]}! 👋\n\nSua visita está agendada para:\n\n*${customer.name}*\n${formattedDate}\n${serviceDetails}\n\nConfirma ?\n\nEstamos ansiosos para atendê-la. Se um meteoro cair e não puder vir, fique tranquila e reagendamos.`;

        if (action === 'COPY') {
            navigator.clipboard.writeText(message).then(() => {
                showToast('Mensagem copiada com sucesso!');
            }).catch(err => {
                console.error('Erro ao copiar mensagem:', err);
                showToast('Erro ao copiar mensagem.', 'error');
            });
        } else {
            // Open WhatsApp (and copy for safety)
            navigator.clipboard.writeText(message).catch(() => {});
            const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }
        
        setShowWhatsAppOptions(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full md:max-w-4xl overflow-hidden flex flex-col max-h-[95vh] border-2 border-slate-900 dark:border-zinc-700 animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="px-6 py-5 bg-slate-950 dark:bg-black text-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
                            <Sparkles size={18} className="text-indigo-400" />
                            {mode === 'HISTORY' ? 'Detalhes do Pagamento' : (isAgendaMode ? 'Editar Agendamento' : 'Atendimento')}
                        </h3>
                        <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{customer.name}</p>
                            <div className="flex items-center gap-1">
                                {onNavigate && (
                                    <button
                                        onClick={() => {
                                            if (onNavigate) {
                                                const returnView = source === 'DAILY' ? ViewState.DAILY_APPOINTMENTS : ViewState.AGENDA;
                                                onNavigate(ViewState.CLIENTES, { id: customer.id, returnTo: returnView });
                                            }
                                        }}
                                        className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                        title="Editar Cliente"
                                    >
                                        <PencilLine size={12} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => setShowHistoryPopup(true)}
                                    className="ml-1 flex items-center gap-1 px-2.5 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[8px] font-black text-indigo-300 uppercase transition-all active:scale-95 shadow-sm"
                                >
                                    <History size={10} /> Ver Histórico
                                </button>
                                
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowWhatsAppOptions(!showWhatsAppOptions)}
                                        className="ml-2 flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 rounded-lg text-[8px] font-black text-white uppercase transition-all active:scale-95 shadow-md shadow-emerald-500/20"
                                        title="Lembrete WhatsApp"
                                    >
                                        <span className="text-xs">📲</span> Lembrete
                                    </button>
                                    {showWhatsAppOptions && (
                                        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 p-2 z-[200] flex flex-col gap-1 min-w-[160px] animate-in slide-in-from-top-2 duration-200">
                                            <button 
                                                onClick={() => handleWhatsAppReminder('COPY')}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                                            >
                                                <Copy size={12} /> Copiar Mensagem
                                            </button>
                                            <button 
                                                onClick={() => handleWhatsAppReminder('OPEN')}
                                                className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-2 transition-colors"
                                            >
                                                <Smartphone size={12} /> Ir para WhatsApp
                                            </button>
                                            <div className="border-t border-slate-100 dark:border-zinc-700 my-1"></div>
                                            <button 
                                                onClick={() => setShowWhatsAppOptions(false)}
                                                className="w-full text-center py-1 text-[8px] font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                                            >
                                                Fechar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setShowConsentFormModal(true)}
                                    className={`ml-2 flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[8px] font-black text-white uppercase transition-all active:scale-95 shadow-md ${
                                        hasConsentForm 
                                        ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/20' 
                                        : 'bg-rose-500 border-rose-400 shadow-rose-500/20'
                                    }`}
                                    title={hasConsentForm ? "Termo Assinado" : "Termo Não Assinado"}
                                >
                                    <FileText size={10} /> {hasConsentForm ? 'Termo Assinado' : 'Termo Pendente'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 border border-white/20"><ChevronDown size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 bg-slate-50 dark:bg-zinc-900 scrollbar-hide">

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

                    {mode === 'EDIT_CUSTOMER' ? (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="bg-white dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-slate-900 dark:border-white/10 shadow-2xl">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nome do Cliente</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                            value={editCustomerName}
                                            onChange={(e) => setEditCustomerName(e.target.value)}
                                            placeholder="Nome completo"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                            value={editCustomerPhone}
                                            onChange={(e) => setEditCustomerPhone(e.target.value)}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        <button
                                            onClick={handleBackFromEdit}
                                            className="py-4 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleUpdateCustomer}
                                            className="py-4 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save size={16} /> Salvar Alterações
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 gap-4">
                                <div className="flex flex-col">
                                    {customer?.id && isFirstAppointment(customer.id, appointmentDate, allAppointments) && (
                                        <div className="mb-2">
                                            <span className="bg-indigo-600 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase shadow-sm">1º Agendamento</span>
                                        </div>
                                    )}
                                    <h2 className="text-lg font-black text-slate-950 dark:text-white leading-tight uppercase truncate">{customer.name}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{customer.phone} • {customer.status}</p>
                                        {customer.isVip && (
                                            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                                <Sparkles size={10} />
                                                VIP {customer.vipDiscountPercent}% OFF
                                            </div>
                                        )}
                                        {isAgendaMode && (
                                            <button
                                                onClick={() => setStatus(prev => prev === 'Confirmado' ? 'Pendente' : 'Confirmado')}
                                                className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border transition-colors ${status === 'Confirmado' ? 'bg-indigo-100 text-[#01A4C6] border-indigo-200' : status === 'Aguardando' ? 'bg-[#F7E8C9] text-amber-950 border-amber-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}
                                            >
                                                {status === 'Aguardando' ? 'Aguardando Recepção' : status}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Resposta Whatsapp Button Aligned to Side */}
                                <div className="hidden sm:flex items-center ml-auto">
                                    <button
                                        onClick={() => setWhatsappResponseNeeded(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm active:scale-95 border-2 ${
                                            whatsappResponseNeeded 
                                            ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-amber-200' 
                                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-slate-300 dark:hover:border-zinc-600'
                                        }`}
                                    >
                                        <Smartphone size={12} className={whatsappResponseNeeded ? 'animate-pulse' : ''} />
                                        Resposta WhatsApp
                                    </button>
                                </div>

                                <div className="flex sm:hidden w-full justify-center -mt-2 mb-2">
                                    <button
                                        onClick={() => setWhatsappResponseNeeded(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm active:scale-95 border-2 ${
                                            whatsappResponseNeeded 
                                            ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-amber-200' 
                                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:border-slate-300 dark:hover:border-zinc-600'
                                        }`}
                                    >
                                        <Smartphone size={12} className={whatsappResponseNeeded ? 'animate-pulse' : ''} />
                                        Resposta WhatsApp
                                    </button>
                                </div>

                                {mode !== 'HISTORY' && (
                                    <div className="flex items-center justify-end gap-6 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-200 dark:border-zinc-700 pt-3 md:pt-0 md:pl-6">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Data</span>
                                            <input
                                                type="date"
                                                className="text-base font-black text-slate-950 dark:text-white bg-transparent border-none p-0 outline-none text-right appearance-none cursor-pointer min-w-[130px]"
                                                value={appointmentDate}
                                                onChange={e => setAppointmentDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Horário</span>
                                            <input
                                                type="time"
                                                className="text-base font-black text-slate-950 dark:text-white bg-transparent border-none p-0 outline-none text-right appearance-none cursor-pointer min-w-[85px]"
                                                value={appointmentTime}
                                                onChange={e => {
                                                    const newTime = e.target.value;
                                                    setAppointmentTime(newTime);
                                                    if (lines.length > 0) {
                                                        updateLine(lines[0].id, 'startTime', newTime);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {mode === 'HISTORY' && (
                                    <div className="text-right border-l border-slate-200 dark:border-zinc-700 pl-4 ml-4 flex-shrink-0">
                                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Data Atendimento</span>
                                        <span className="text-sm font-black text-slate-950 dark:text-white">
                                            {(() => {
                                                const dateStr = appointment.date || appointment.paymentDate;
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
                                        <div>
                                            <button
                                                type="button" onClick={addServiceLine}
                                                className="mr-2 text-[9px] font-black text-slate-950 dark:text-white inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
                                            >
                                                <Plus size={14} /> ADICIONAR EXTRA
                                            </button>
                                            <button
                                                type="button" onClick={addCompanionLine}
                                                className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800/50 px-3 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
                                            >
                                                <User size={14} /> ADICIONAR ACOMPANHANTE
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {lines.map((line) => (
                                            <div key={line.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm space-y-4 relative group">
                                                {lines.length > 1 && (
                                                    <button onClick={() => removeServiceLine(line.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                                                )}

                                                {line.isCompanion && (
                                                    <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl relative">
                                                        <div className="absolute -top-2 left-3 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                                            <User size={10} /> Acompanhante
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                                            <div className="space-y-0.5">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Nome da Acompanhante"
                                                                    className="w-full bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                                                    value={line.clientName || ''}
                                                                    onChange={e => updateLine(line.id, 'clientName', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <input
                                                                    type="text"
                                                                    placeholder="WhatsApp (Opcional)"
                                                                    className="w-full bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                                                    value={line.clientPhone || ''}
                                                                    onChange={e => updateLine(line.id, 'clientPhone', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="space-y-0.5">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Serviço</label>
                                                        <select
                                                            className={`w-full bg-slate-50 dark:bg-zinc-900 border rounded-xl p-3 text-xs font-black uppercase outline-none transition-all appearance-none cursor-pointer ${!isServiceAllowed(line.serviceId, line.providerId)
                                                                    ? 'border-rose-400 dark:border-rose-900 text-rose-700 dark:text-rose-400'
                                                                    : 'border-slate-200 dark:border-zinc-700 text-slate-950 dark:text-white focus:border-slate-400 dark:focus:border-zinc-500'
                                                                }`}
                                                            style={{ colorScheme: 'dark' }}
                                                            value={line.serviceId}
                                                            onChange={e => updateLine(line.id, 'serviceId', e.target.value)}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {(() => {
                                                                const filtered = services
                                                                    .filter(s => {
                                                                        const provider = providers.find(p => p.id === line.providerId);
                                                                        if (!provider) return true;
                                                                        if (!provider.specialties || provider.specialties.length === 0) return true;
                                                                        const sNameLower = s.name.trim().toLowerCase();
                                                                        return provider.specialties.some(spec => spec.trim().toLowerCase() === sNameLower);
                                                                    });

                                                                // Removed the unshift(currentSrv) to maintain strict filtering as requested.
                                                                return filtered.map(s => (
                                                                    <option key={s.id} value={s.id}>
                                                                        {s.name} - R$ {s.price.toFixed(0)}
                                                                    </option>
                                                                ));
                                                            })()}
                                                        </select>
                                                    </div>

                                                    <div className="space-y-0.5">
                                                        <div className="flex justify-between items-center ml-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase">Responsável</label>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleFavoriteProvider(line.providerId);
                                                                }}
                                                                className={`text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 transition-all outline-none ${customer.assignedProviderIds?.includes(line.providerId)
                                                                    ? 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30'
                                                                    : 'text-slate-400 bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:bg-zinc-800'
                                                                    }`}
                                                                title={customer.assignedProviderIds?.includes(line.providerId) ? "Remover favorito" : "Adicionar favorito"}
                                                            >
                                                                <Star opacity={0.8} strokeWidth={3} size={10} fill={customer.assignedProviderIds?.includes(line.providerId) ? 'currentColor' : 'none'} /> PR
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5">
                                                            <Avatar
                                                                src={providers.find(p => p.id === line.providerId)?.avatar}
                                                                name={providers.find(p => p.id === line.providerId)?.name.trim() || ''}
                                                                size="w-6 h-6"
                                                            />
                                                            <select
                                                                className={`bg-transparent border-none text-[11px] font-black outline-none w-full ${customer.restrictedProviderIds?.includes(line.providerId)
                                                                    ? 'text-rose-600 dark:text-rose-400'
                                                                    : 'text-slate-950 dark:text-white'
                                                                    }`}
                                                                value={line.providerId}
                                                                onChange={e => updateLine(line.id, 'providerId', e.target.value)}
                                                            >
                                                                {activeProviders.map(p => {
                                                                    const isVacationPeriod = !!(p.vacationStart && p.vacationEnd && appointmentDate >= p.vacationStart && appointmentDate <= p.vacationEnd);
                                                                    const isDayOff = p.daysOff?.includes(appointmentDate) || false;
                                                                    const isOnVacation = isVacationPeriod || isDayOff;
                                                                    return (
                                                                        <option
                                                                            key={p.id}
                                                                            value={p.id}
                                                                            disabled={isOnVacation}
                                                                            className={`${isOnVacation ? 'text-slate-300 bg-slate-50' : 'text-slate-950 dark:text-white bg-white dark:bg-zinc-800'}`}
                                                                        >
                                                                            {p.name.trim().split(' ')[0]} {isOnVacation ? (isDayOff ? '- FOLGA' : '- EM FÉRIAS') : ''}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-0.5 relative">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Materiais Utilizados</label>
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

                                                <div className={`grid grid-cols-2 md:grid-cols-5 ${((mode as string) === 'CHECKOUT' || (mode as string) === 'HISTORY') ? 'lg:grid-cols-7' : 'lg:grid-cols-5'} gap-3 items-center bg-slate-50/50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-700`}>
                                                    <div className="flex flex-col">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Horário</label>
                                                        <input
                                                            type="time"
                                                            className="bg-transparent border-none text-[11px] font-black text-slate-950 dark:text-white p-1 outline-none w-full"
                                                            value={line.startTime || appointmentTime}
                                                            onChange={e => updateLine(line.id, 'startTime', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Término</label>
                                                        <input
                                                            type="time"
                                                            className="bg-transparent border-none text-[11px] font-black text-indigo-600 dark:text-indigo-400 p-1 outline-none w-full font-black"
                                                            value={line.endTime}
                                                            onChange={e => updateLine(line.id, 'endTime', e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Valor Unit.</label>
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg text-[11px] font-black text-slate-950 dark:text-white pl-6 pr-1 py-1 outline-none w-20 focus:border-indigo-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                value={line.unitPrice}
                                                                onChange={e => updateLine(line.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Qtd.</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="bg-transparent border border-slate-200 dark:border-zinc-700 rounded-lg text-[11px] font-black text-slate-950 dark:text-white px-2 py-1 outline-none w-16 focus:border-indigo-500 transition-colors"
                                                                value={line.quantity || 1}
                                                                onChange={e => updateLine(line.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-center">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase">Status</label>
                                                        <div className="flex items-center justify-center flex-wrap gap-1 mt-1">
                                                            <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase ${line.status === 'Em Andamento' ? 'bg-emerald-100 text-emerald-700' :
    line.status === 'Concluído' ? 'bg-blue-100 text-blue-700' :
    line.status === 'Aguardando' ? 'bg-[#F7E8C9] text-amber-950 border border-amber-200' :
        'bg-slate-100 text-slate-600'
    }`}>
    {line.status === 'Aguardando' ? 'Aguardando Recepção' : (line.status || 'Pendente')}
</span>
                                                            {(line.status === 'Aguardando' || line.status === 'Pendente') && (appointment.status === 'Aguardando' || appointment.status === 'Em Andamento') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartIndividualService(line.id)}
                                                                    className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1 active:scale-95 transition-all shadow-sm shadow-indigo-200"
                                                                >
                                                                    <Play size={10} fill="currentColor" /> Iniciar
                                                                </button>
                                                            )}
                                                            {line.startTimeActual && (
                                                                <span className="text-[9px] font-black text-slate-400">
                                                                    {line.startTimeActual}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {((mode as string) === 'CHECKOUT' || (mode as string) === 'HISTORY') && (
                                                        <>
                                                            <div className="flex flex-col">
                                                                <label className="text-[8px] font-black text-rose-500 dark:text-rose-400 uppercase ml-1">Caixinha</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-400">R$</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        className="bg-transparent border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] font-black text-rose-600 dark:text-rose-400 pl-6 pr-1 py-1 outline-none w-20 focus:border-rose-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        value={line.tipAmount}
                                                                        onChange={e => updateLine(line.id, 'tipAmount', Math.max(0, parseFloat(e.target.value) || 0))}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => updateLine(line.id, 'isCourtesy', !line.isCourtesy)}
                                                                className={`col-span-1 flex items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all text-[9px] font-black uppercase ${line.isCourtesy ? 'bg-slate-950 dark:bg-white text-white dark:text-black border-slate-950 dark:border-white' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-slate-500'}`}
                                                            >
                                                                <Check size={12} /> {line.isCourtesy ? 'CORTESIA' : 'CORTESIA?'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* RECURENCE & COUPON OPTIONS */}
                                    {mode === 'VIEW' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 flex flex-col justify-between">
                                                <div className="flex items-center justify-between mb-2">
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

                                                {isRecurring ? (
                                                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-indigo-800 dark:text-indigo-400 uppercase ml-1">Freq.</label>
                                                            <select
                                                                className="w-full bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-800 rounded-xl p-2 text-[10px] font-black text-slate-950 dark:text-white outline-none"
                                                                value={recurrenceFrequency}
                                                                onChange={e => setRecurrenceFrequency(e.target.value as any)}
                                                            >
                                                                <option value="WEEKLY">Semanal</option>
                                                                <option value="BIWEEKLY">Quinzenal</option>
                                                                <option value="MONTHLY">Mensal</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-indigo-800 dark:text-indigo-400 uppercase ml-1">Repetições</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="24"
                                                                className="w-full bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-800 rounded-xl p-2 text-[10px] font-black text-slate-950 dark:text-white outline-none"
                                                                value={recurrenceCount}
                                                                onChange={e => setRecurrenceCount(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-[44px] flex items-center justify-center border border-dashed border-indigo-100 dark:border-indigo-800/20 rounded-xl">
                                                        <span className="text-[9px] font-bold text-indigo-300 dark:text-indigo-800 uppercase">Não recorrente</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800 flex flex-col justify-between">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Tag size={14} className="text-slate-400" />
                                                    <h4 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cupom de Desconto</h4>
                                                </div>
                                                {appliedCampaign ? (
                                                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <CircleCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">{appliedCampaign.couponCode}</span>
                                                        </div>
                                                        <button type="button" onClick={handleRemoveCoupon} className="p-1 text-rose-400 hover:text-rose-600 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Código..."
                                                            value={couponCode}
                                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                                            className="flex-1 min-w-0 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-[10px] font-black uppercase placeholder-slate-400 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleApplyCoupon}
                                                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                                                        >
                                                            APLICAR
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                                        <div className="flex justify-between items-center px-1 mb-4">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Valor Acumulado</p>
                                                <p className="text-xl font-black text-slate-950 dark:text-white tracking-tighter">R$ {(totalValue || 0).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {customer.outstandingBalance !== undefined && customer.outstandingBalance > 0 && (
                                            <div className="flex flex-col gap-2 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="payDebt"
                                                        checked={includeDebt}
                                                        onChange={(e) => setIncludeDebt(e.target.checked)}
                                                        className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 border-rose-300"
                                                    />
                                                    <label htmlFor="payDebt" className="flex-1 text-xs font-bold text-rose-900 dark:text-rose-300 uppercase cursor-pointer select-none">
                                                        Incluir Pagamento de Dívida Pendente
                                                    </label>
                                                    <span className="text-sm font-black text-rose-500">
                                                        + R$ {(customer.outstandingBalance || 0).toFixed(2)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setShowDebtDetails(!showDebtDetails); }}
                                                        className="ml-2 px-2 py-1 bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors"
                                                    >
                                                        {showDebtDetails ? 'OCULTAR' : 'DETALHES'}
                                                    </button>
                                                </div>

                                                {showDebtDetails && (
                                                    <div className="mt-2 pt-2 border-t border-rose-100 dark:border-rose-800/50 animate-in slide-in-from-top-2">
                                                        <p className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                            Origem do Saldo Devedor:
                                                        </p>
                                                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                                            {(() => {
                                                                const unpaidAppointments = allAppointments?.filter(app =>
                                                                    app.customerId === customer.id &&
                                                                    (app.paymentMethod?.toLowerCase() === 'fiado' || app.paymentMethod?.toLowerCase() === 'dívida' || app.payments?.some(p => p.method.toLowerCase() === 'fiado' || p.method.toLowerCase() === 'dívida'))
                                                                ) || [];

                                                                const unpaidSales = allSales?.filter(sale =>
                                                                    sale.customerId === customer.id &&
                                                                    (sale.paymentMethod?.toLowerCase() === 'fiado' || sale.paymentMethod?.toLowerCase() === 'dívida' || sale.payments?.some(p => p.method.toLowerCase() === 'fiado' || p.method.toLowerCase() === 'dívida'))
                                                                ) || [];

                                                                const unpaidItems = [
                                                                    ...unpaidAppointments.map(app => {
                                                                        let amt = 0;
                                                                        if (app.payments && app.payments.length > 0) {
                                                                            amt = app.payments.filter(p => p.method.toLowerCase() === 'fiado' || p.method.toLowerCase() === 'dívida').reduce((acc, p) => acc + (p.amount || 0), 0);
                                                                        }
                                                                        if (amt === 0) amt = app.pricePaid || app.bookedPrice || 0;
                                                                        return {
                                                                            id: app.id,
                                                                            date: app.date || app.paymentDate,
                                                                            description: app.combinedServiceNames || (app.serviceId ? (services.find(s => s.id === app.serviceId)?.name || 'Serviço') : 'Agendamento'),
                                                                            amount: amt,
                                                                            type: 'Serviço'
                                                                        };
                                                                    }),
                                                                    ...unpaidSales.map(sale => {
                                                                        let amt = 0;
                                                                        if (sale.payments && sale.payments.length > 0) {
                                                                            amt = sale.payments.filter(p => p.method.toLowerCase() === 'fiado' || p.method.toLowerCase() === 'dívida').reduce((acc, p) => acc + (p.amount || 0), 0);
                                                                        }
                                                                        if (amt === 0) amt = sale.totalPrice || sale.totalAmount || 0;
                                                                        return {
                                                                            id: sale.id,
                                                                            date: sale.date,
                                                                            description: sale.items?.map((i: any) => i.name).join(', ') || 'Produto',
                                                                            amount: amt,
                                                                            type: 'Produto'
                                                                        };
                                                                    })
                                                                ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

                                                                if (unpaidItems.length === 0) {
                                                                    return (
                                                                        <div className="text-[10px] text-slate-500 italic p-2 bg-white dark:bg-zinc-800 rounded-lg">
                                                                            Este saldo é oriundo de compras pendentes ou anteriores ao novo histórico.
                                                                        </div>
                                                                    );
                                                                }

                                                                return unpaidItems.map((item, i) => (
                                                                    <div key={item.id + '-' + i} className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-rose-100 dark:border-zinc-800 flex justify-between items-center text-[10px]">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-900 dark:text-white">
                                                                                {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}
                                                                                <span className="ml-2 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded text-[7px] uppercase">{item.type}</span>
                                                                            </span>
                                                                            <span className="text-slate-500 truncate max-w-[200px]" title={item.description}>{item.description}</span>
                                                                        </div>
                                                                        <span className="font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">R$ {item.amount.toFixed(2)}</span>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                        <p className="text-[9px] text-rose-500/70 dark:text-rose-400/50 mt-2 text-center uppercase font-bold">
                                                            * Acima constam apenas os últimos registros de criação da dívida
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2">
                                            {isAgendaMode ? (
                                                <>
                                                    {isZeroing ? (
                                                        <div className="space-y-3 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border-2 border-amber-100 dark:border-amber-900 animate-in zoom-in-95 duration-200">
                                                            <h4 className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                                                <Coins size={12} /> Zerar Comanda (Justificativa)
                                                            </h4>
                                                            <textarea
                                                                className="w-full bg-white dark:bg-zinc-900 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-400 resize-none h-24"
                                                                placeholder="Descreva o motivo para zerar esta comanda..."
                                                                value={zeroOutReason}
                                                                onChange={e => setZeroOutReason(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsZeroing(false)}
                                                                    className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
                                                                >
                                                                    Voltar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleConfirmZeroOut}
                                                                    className="flex-[2] py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all hover:bg-amber-700"
                                                                >
                                                                    Confirmar e Zerar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : isCancelling ? (
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
                                                                onClick={handleDeleteAppointment}
                                                                className="py-4 px-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                                                                title="Excluir Permanentemente (Sumir da Agenda)"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsCancelling(true)}
                                                                className="py-4 px-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700"
                                                                title="Cancelar Agendamento (Fica no Histórico)"
                                                            >
                                                                <CircleX size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsZeroing(true)}
                                                                className="py-4 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                                                title="Zerar Comanda (Justificativa)"
                                                            >
                                                                <Coins size={16} />
                                                            </button>
                                                            {(!appointment.isRemake && appointment.paymentMethod !== 'Refazer') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleRemakeService}
                                                                    className="py-4 px-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                                                                    title="Transformar em Refazer (Zerar)"
                                                                >
                                                                    <RefreshCw size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (appointment.status === 'Concluído' || appointment.status === 'Em Andamento' || appointment.status === 'Em atendimento' || appointment.status === 'Aguardando') {
                                                                        setMode('CHECKOUT');
                                                                    } else {
                                                                        handleCheckIn();
                                                                    }
                                                                }}
                                                                className="flex-1 py-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                                            >
                                                                {appointment.status === 'Concluído' ? <CreditCard size={16} /> : ((appointment.status === 'Em Andamento' || appointment.status === 'Em atendimento' || appointment.status === 'Aguardando') ? <CreditCard size={16} /> : <CircleCheck size={16} />)}
                                                                {appointment.status === 'Concluído' ? 'ATUALIZAR PAGAMENTO' : ((appointment.status === 'Em Andamento' || appointment.status === 'Em atendimento' || appointment.status === 'Aguardando') ? 'PAGAR / CHECKOUT' : 'REALIZAR CHECK-IN')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={appointment.status === 'Concluído' ? () => setMode('HISTORY') : () => handleSave()}
                                                                disabled={isSaving || restrictionData.isRestricted || customer.isBlocked}
                                                                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaving || restrictionData.isRestricted || customer.isBlocked ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500 cursor-not-allowed' : 'bg-slate-950 dark:bg-white text-white dark:text-black'}`}
                                                            >
                                                                {appointment.status === 'Concluído' ? <ArrowLeft size={16} /> : (isSaving ? <Sparkles size={16} className="animate-spin" /> : (restrictionData.isRestricted || customer.isBlocked ? <Ban size={16} /> : <Save size={16} />))}
                                                                {appointment.status === 'Concluído' ? 'VOLTAR HISTÓRICO' : (isSaving ? 'GRAVANDO...' : (restrictionData.isRestricted || customer.isBlocked ? 'BLOQUEADO' : 'SALVAR'))}
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                (appointment.status === 'Confirmado' || appointment.status === 'Pendente') ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleCheckIn}
                                                        disabled={isSaving || restrictionData.isRestricted || customer.isBlocked}
                                                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaving || restrictionData.isRestricted || customer.isBlocked ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500 cursor-not-allowed' : 'bg-slate-950 dark:bg-white text-white dark:text-black'}`}
                                                    >
                                                        {isSaving ? <Sparkles size={16} className="animate-spin" /> : (restrictionData.isRestricted || customer.isBlocked ? <Ban size={16} /> : <CircleCheck size={16} />)}
                                                        {isSaving ? 'PROCESSANDO...' : (restrictionData.isRestricted || customer.isBlocked ? 'BLOQUEADO' : 'REALIZAR CHECK-IN')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setMode('CHECKOUT')}
                                                        disabled={restrictionData.isRestricted}
                                                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${restrictionData.isRestricted ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500 cursor-not-allowed' : 'bg-slate-950 dark:bg-white text-white dark:text-black'}`}
                                                    >
                                                        {restrictionData.isRestricted ? 'BLOQUEADO' : (appointment.status === 'Concluído' ? 'ATUALIZAR PAGAMENTO' : 'IR PARA PAGAMENTO')}
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
                                                                                {providers.find(p => p.id === app.providerId)?.name.trim().split(' ')[0]}
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
                        </>
                    )}

                    {mode === 'CHECKOUT' && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-4">
                            <div className="bg-slate-50 dark:bg-zinc-800 p-5 rounded-[2rem] border border-slate-100 dark:border-zinc-700 flex justify-between items-center group relative overflow-hidden">
                                <div className="flex flex-col z-10">
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total a Receber</span>
                                    {customer.isVip && (
                                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mt-1">
                                            VIP {customer.vipDiscountPercent}% OFF
                                        </span>
                                    )}
                                    {customer.creditBalance !== undefined && customer.creditBalance > 0 && (
                                        <div className="mt-2 flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-800">
                                            <Wallet size={12} className="text-purple-600 dark:text-purple-400" />
                                            <span className="text-[9px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-tight">Crédito Aminna: R$ {customer.creditBalance.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right z-10">
                                    {customer.isVip && (
                                        <span className="block text-[10px] font-bold text-slate-400 line-through">R$ {totalBeforeCoupon.toFixed(2)}</span>
                                    )}
                                    {appliedCampaign && (
                                        <span className="block text-[10px] font-bold text-rose-500 line-through">
                                            {customer.isVip ? '' : `R$ ${totalBeforeCoupon.toFixed(2)}`}
                                        </span>
                                    )}
                                    <span className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter">R$ {totalValue.toFixed(2)}</span>
                                </div>
                                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
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
                                                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase leading-none mb-1">{prv?.name}</p>
                                                            <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase truncate">{srv?.name}</h4>
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

                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block mb-1">Caixinha para o Profissional</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-500">R$</span>
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl py-2.5 pl-8 pr-3 text-xs font-black text-rose-500 dark:text-rose-400 outline-none focus:border-rose-400 transition-colors shadow-sm"
                                                                    value={line.tipAmount}
                                                                    onChange={e => updateLine(line.id, 'tipAmount', parseFloat(e.target.value) || 0)}
                                                                    placeholder="0,00"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block mb-1">Desconto no Serviço</label>
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                                                    <input
                                                                        type="number"
                                                                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl py-2.5 pl-8 pr-3 text-xs font-black text-slate-950 dark:text-white outline-none focus:border-indigo-400 transition-colors shadow-sm"
                                                                        value={line.discount}
                                                                        onChange={e => updateLine(line.id, 'discount', parseFloat(e.target.value) || 0)}
                                                                        placeholder="0,00"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateLine(line.id, 'isCourtesy', !line.isCourtesy)}
                                                                    className={`px-4 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${line.isCourtesy ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-zinc-800 text-slate-400 border-slate-200 dark:border-zinc-700 hover:border-slate-300'}`}
                                                                    title="Marcar como Cortesia"
                                                                >
                                                                    <Check size={14} className={line.isCourtesy ? "stroke-[3px]" : ""} />
                                                                    <span>Cortesia</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block mb-1">Feedback do Atendimento</label>
                                                            <input
                                                                type="text"
                                                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-400 transition-colors shadow-sm"
                                                                placeholder="Elogios ou observações sobre o serviço prestado por este profissional..."
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
                                    <div className="flex flex-col">
                                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Formas de Recebimento</label>
                                        {customer.creditBalance && customer.creditBalance > 0 ? (
                                            <div className="mt-1 flex items-center gap-2 bg-purple-50 dark:bg-zinc-800/50 border border-purple-100 dark:border-purple-900 shadow-sm rounded-lg px-3 py-1.5 animate-in fade-in zoom-in duration-300">
                                                <Wallet size={12} className="text-purple-600 dark:text-purple-400" />
                                                <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase">
                                                    R$ {customer.creditBalance.toFixed(2)} DISPONÍVEL
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
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
                                        return (
                                            <div key={payment.id} className="flex gap-2 animate-in slide-in-from-left duration-200">
                                                <select
                                                    className={`flex-[2] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-slate-400 dark:focus:border-zinc-500 uppercase ${isCredit && payment.method !== 'Crédito Aminna' ? 'rounded-r-none border-r-0' : ''}`}
                                                    value={payment.method}
                                                    onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                                                >
                                                    {[...paymentSettings, { id: 'virtual-credit', method: 'Crédito Aminna' }].filter((v, i, a) => a.findIndex(t => t.method === v.method) === i).map(pay => (
                                                        <option key={pay.id} value={pay.method}>
                                                            {pay.method}
                                                        </option>
                                                    ))}
                                                </select>

                                                {isCredit && payment.method !== 'Crédito Aminna' && (
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

                                                {(payment.method.toLowerCase().includes('cartão') || payment.method.toLowerCase().includes('crédito') || payment.method.toLowerCase().includes('débito')) && payment.method !== 'Crédito Aminna' && (
                                                    <select
                                                        className="flex-1 min-w-[100px] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-slate-400 dark:focus:border-zinc-500 uppercase"
                                                        value={payment.cardBrand || ''}
                                                        onChange={(e) => updatePayment(payment.id, 'cardBrand', e.target.value)}
                                                    >
                                                        <option value="">BANDEIRA</option>
                                                        {CARD_BRANDS.map(brand => (
                                                            <option key={brand} value={brand}>{brand}</option>
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
                                        );
                                    })}
                                </div>

                                {/* Adjustment Tool */}
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdjustmentField(!showAdjustmentField)}
                                        className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${adjustmentAmount !== 0 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-zinc-800'}`}
                                    >
                                        <DollarSign size={12} />
                                        Ajustar Valor Final {adjustmentAmount !== 0 && `(R$ ${adjustmentAmount.toFixed(2)})`}
                                    </button>

                                    {showAdjustmentField && (
                                        <div className="mt-3 p-4 bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl animate-in slide-in-from-top-2">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Valor do Ajuste (+ ou -)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full pl-8 pr-3 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-black"
                                                            placeholder="+10.00 ou -10.00"
                                                            value={adjustmentAmount || ''}
                                                            onChange={e => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-[2]">
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Motivo do Ajuste</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-black uppercase"
                                                        placeholder="Ex: Taxa extra, Desconto especial..."
                                                        value={adjustmentReason}
                                                        onChange={e => setAdjustmentReason(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Contextual Insights */}
                                            {linesInsight && linesInsight.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                                                    <header className="flex items-center gap-2 mb-3">
                                                        <Clock size={12} className="text-indigo-500" />
                                                        <h5 className="text-[9px] font-black text-slate-950 dark:text-white uppercase tracking-widest">Histórico de Produtos Utilizados</h5>
                                                    </header>
                                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                                        {linesInsight.map((insight, iIdx) => (
                                                            <div key={`${insight.id}-${iIdx}`} className="space-y-2">
                                                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{insight.name}</p>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    <div className="space-y-1">
                                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Últimas Vendas</p>
                                                                        {insight.pastSales.length > 0 ? insight.pastSales.map((ps, idx) => {
                                                                            const customer = customers.find(c => c.id === ps.customerId);
                                                                            const itemInfo = (ps.items as any[]).find(i => i.productId === insight.id);
                                                                            return (
                                                                                <div key={idx} className="p-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl flex justify-between items-center">
                                                                                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{customer?.name || 'Cliente'}</span>
                                                                                    <span className="text-[10px] font-black text-slate-900 dark:text-white">R$ {itemInfo?.unitPrice?.toFixed(2) || '0.00'}</span>
                                                                                </div>
                                                                            );
                                                                        }) : <p className="text-[8px] text-slate-400 italic">Sem vendas anteriores</p>}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Histórico de Preços</p>
                                                                        {insight.priceHistory.length > 0 ? (insight.priceHistory as any[]).slice(-2).reverse().map((ph, idx) => (
                                                                            <div key={idx} className="p-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl flex justify-between items-center">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[10px] font-black text-slate-900 dark:text-white">R$ {ph.price.toFixed(2)}</span>
                                                                                    <span className="text-[7px] text-slate-400 uppercase font-black">{new Date(ph.date).toLocaleDateString()}</span>
                                                                                </div>
                                                                                <span className="text-[8px] font-bold text-slate-500 italic truncate max-w-[80px]">{ph.note || 'Alteração'}</span>
                                                                            </div>
                                                                        )) : <p className="text-[8px] text-slate-400 italic">Sem reajustes</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Observation Field */}
                                <div className="mt-4">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observações do Agendamento</label>
                                    <textarea
                                        value={observation}
                                        onChange={(e) => setObservation(e.target.value)}
                                        placeholder="Adicione observações importantes sobre este atendimento..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 placeholder-slate-300 resize-none transition-all"
                                    />
                                </div>

                                {/* Coupon / Campaign Input */}
                                <div className="mt-3">
                                    {appliedCampaign ? (
                                        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Tag size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">{appliedCampaign.couponCode}</span>
                                                <span className="text-[9px] font-bold text-slate-400">
                                                    {appliedCampaign.discountType === 'PERCENTAGE'
                                                        ? `-${appliedCampaign.discountValue}% OFF`
                                                        : ` R$ ${couponDiscountAmount.toFixed(2)} OFF`}
                                                </span>
                                            </div>
                                            <button type="button" onClick={handleRemoveCoupon} className="p-1 text-rose-400 hover:text-rose-600 rounded">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Código do cupom..."
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                                className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase placeholder-slate-300 text-slate-900 dark:text-white outline-none focus:border-slate-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyCoupon}
                                                className="px-3 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                            >
                                                APLICAR
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <div className={`flex-1 p-3 rounded-xl border flex flex-col justify-center ${totalPaid >= totalValue - 0.01 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800'}`}>
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Pago</span>
                                            <span className={`text-xs font-black ${totalPaid >= totalValue - 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                R$ {totalPaid.toFixed(2)} / R$ {totalValue.toFixed(2)}
                                            </span>
                                        </div>
                                        {totalPaid > totalValue + 0.01 && (
                                            <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-emerald-100/50 dark:border-emerald-800/50">
                                                <span className="text-[8px] font-black uppercase text-emerald-600/70 dark:text-emerald-400/70">Crédito a Gerar</span>
                                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                                                    + R$ {(totalPaid - totalValue).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCreateDebt()}
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
                            {customer.outstandingBalance !== undefined && customer.outstandingBalance > 0 && (
                                <div className="flex flex-col gap-2 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="payDebtCheckout"
                                            checked={includeDebt}
                                            onChange={(e) => setIncludeDebt(e.target.checked)}
                                            className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 border-rose-300"
                                        />
                                        <label htmlFor="payDebtCheckout" className="flex-1 text-xs font-bold text-rose-900 dark:text-rose-300 uppercase cursor-pointer select-none">
                                            Incluir Pagamento de Dívida Pendente
                                        </label>
                                        <span className="text-sm font-black text-rose-500">
                                            R$ {customer.outstandingBalance.toFixed(2)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setShowDebtDetails(!showDebtDetails); }}
                                            className="ml-2 px-2 py-1 bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors"
                                        >
                                            {showDebtDetails ? 'OCULTAR' : 'DETALHES'}
                                        </button>
                                    </div>

                                    {showDebtDetails && (
                                        <div className="mt-2 pt-2 border-t border-rose-100 dark:border-rose-800/50 animate-in slide-in-from-top-2">
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                                {customer.history?.filter(h => h.details?.includes('Dívida Criada') || h.description?.toLowerCase().includes('fiado')).slice(0, 10).map((h, i) => (
                                                    <div key={i} className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-rose-100 dark:border-zinc-800 flex justify-between items-center text-[10px]">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                                                            <span className="text-slate-500 truncate max-w-[150px]" title={h.description}>{h.description}</span>
                                                        </div>
                                                        <span className="font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">{h.details?.split(' | ')[0] || h.details}</span>
                                                    </div>
                                                ))}
                                                {(customer.history?.filter(h => h.details?.includes('Dívida Criada') || h.description?.toLowerCase().includes('fiado'))?.length || 0) === 0 && (
                                                    <div className="text-[10px] text-slate-500 italic p-2 bg-white dark:bg-zinc-800 rounded-lg">
                                                        Este saldo é oriundo de compras pendentes ou anteriores ao novo histórico.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={handleFinishService}
                                    disabled={isSaving || restrictionData.isRestricted || customer.isBlocked}
                                    className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving || restrictionData.isRestricted || customer.isBlocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                                >
                                    {isSaving ? 'PROCESSANDO...' : (restrictionData.isRestricted || customer.isBlocked ? 'BLOQUEADO' : (appointment.status === 'Concluído' ? <><Save size={20} /> ATUALIZAR ATENDIMENTO</> : <><Check size={20} /> FINALIZAR ATENDIMENTO</>))}
                                </button>


                                <button onClick={() => setMode(appointment.status === 'Concluído' ? 'HISTORY' : 'VIEW')} className="w-full py-1 text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                                    {appointment.status === 'Concluído' ? 'CANCELAR EDIÇÃO' : 'REVISAR DADOS'}
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'HISTORY' && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 rounded-full"><CircleCheck size={20} /></div>
                                    <span className="text-[10px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-widest">{appointment.paymentMethod === 'Dívida' ? 'Dívida Registrada' : 'Atendimento Finalizado'}</span>
                                </div>
                                <span className="text-2xl font-black text-emerald-900 dark:text-emerald-300 tracking-tighter">R$ {((appointment.pricePaid === 0 && totalValue > 0) ? totalValue : (appointment.pricePaid || totalValue)).toFixed(2)}</span>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Detalhamento dos Serviços</h4>
                                <div className="space-y-2">
                                    {lines.map((line, idx) => {
                                        const srv = services.find(s => s.id === line.serviceId);
                                        const prv = providers.find(p => p.id === line.providerId);
                                        return (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm flex justify-between items-center">
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
                                                    {line.tipAmount > 0 && <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">+ R$ {line.tipAmount.toFixed(2)} CAIXINHA</p>}
                                                    {line.isCourtesy && <span className="text-[8px] font-black bg-slate-900 text-white dark:bg-white dark:text-black px-1 rounded">CORTESIA</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Método de Pagamento</p>
                                    <div className="space-y-1">
                                        {(appointment.payments && appointment.payments.length > 0) ? (
                                            appointment.payments.map((p, pIdx) => (
                                                <div key={pIdx} className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2 flex-1">
                                                        <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-[2px]" />
                                                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight break-words">{p.method} {p.cardBrand && p.method !== 'Crédito Aminna' ? `(${p.cardBrand})` : ''}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 mt-[3px]">R$ {p.amount.toFixed(2)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2 flex-1">
                                                    <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-[2px]" />
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight break-words">{appointment.paymentMethod || 'Não informado'}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 mt-[3px]">R$ {totalValue.toFixed(2)}</span>
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
                            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-4">
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
                                            <div className={`text-center p-2 rounded-xl border ${nfseData?.status === 'issued'
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                                                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
                                                }`}>
                                                <p className={`text-xs font-black flex items-center justify-center gap-2 ${nfseData?.status === 'issued' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                                    }`}>
                                                    {nfseData?.status === 'issued' ? <><CircleCheck size={16} /> NFSe Emitida!</> : <><Sparkles size={16} className="animate-spin" /> Em Processamento...</>}
                                                </p>
                                                {nfseData?.nfse_number && <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold mt-1">Número: {nfseData.nfse_number}</p>}
                                            </div>

                                            {/* Show refresh button if processing */}
                                            {nfseData?.status !== 'issued' && (
                                                <button
                                                    onClick={refreshNFSeStatus}
                                                    disabled={nfseStatus === 'loading'}
                                                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                                                >
                                                    <RefreshCw size={14} className={nfseStatus === 'loading' ? 'animate-spin' : ''} />
                                                    {nfseStatus === 'loading' ? 'Verificando...' : 'Atualizar Status'}
                                                </button>
                                            )}

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
                                    ) : (
                                        <div className="space-y-2">
                                            {nfseStatus === 'error' && (
                                                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2 text-center">
                                                    ❌ {nfseError}
                                                </p>
                                            )}
                                            <button
                                                onClick={() => setShowNfseManualDetail(true)}
                                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <FileText size={14} />
                                                GERAR TEXTO DA NOTA
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMode('VIEW')}
                                    className="w-full py-4 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-slate-200 dark:border-zinc-700"
                                >
                                    <Edit3 size={18} /> EDITAR ATENDIMENTO
                                </button>


                                <button onClick={onClose} className="w-full py-4 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                                    Fechar Histórico
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div >
            {/* CANCEL CONFIRMATION MODAL (EXISTING) */}
            {
                isCancelling && (
                    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-900 dark:border-white/10">
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
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-900 dark:border-white/10">
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
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-900 dark:border-white/10">
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
            {
                showNfseManualDetail && (
                    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full md:max-w-2xl overflow-hidden border-2 border-slate-900 dark:border-white/10">
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Texto Detalhado da Nota</h3>
                                    <button onClick={() => setShowNfseManualDetail(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800 p-6 rounded-2xl mb-6 font-mono text-xs whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-slate-200 dark:border-zinc-700 leading-relaxed text-slate-700 dark:text-slate-300">
                                    {generateFiscalDetailingText()}
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(generateFiscalDetailingText());
                                            alert('Texto copiado com sucesso! ✅');
                                        }}
                                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Copy size={18} /> COPIAR TEXTO
                                    </button>
                                    <button 
                                        onClick={() => setShowNfseManualDetail(false)}
                                        className="px-8 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
                                    >
                                        FECHAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showHistoryPopup && (
                    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border-2 border-slate-900 dark:border-zinc-800 scale-in-center">
                            <div className="px-8 py-6 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <History size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Histórico da Cliente</h3>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{customer.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowHistoryPopup(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-zinc-950 scrollbar-hide">
                                {isLoadingHistory ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <RefreshCw size={32} className="text-indigo-500 animate-spin" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando histórico...</p>
                                    </div>
                                ) : customerHistory.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800">
                                        <div className="bg-white dark:bg-zinc-800 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                            <Calendar size={32} />
                                        </div>
                                        <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhum histórico disponível</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {customerHistory.map((item: CustomerHistoryItem) => (
                                            <div key={item.id} className="group flex items-start gap-6">
                                                <div className="flex flex-col items-center flex-shrink-0 pt-2">
                                                    <div className={`w-3 h-3 rounded-full border-2 ${item.type === 'VISIT' ? 'bg-indigo-600 border-indigo-200' :
                                                        item.type === 'PURCHASE' ? 'bg-emerald-500 border-emerald-200' :
                                                            'bg-rose-500 border-rose-200'
                                                        }`} />
                                                    <div className="w-0.5 h-full min-h-[40px] bg-slate-100 dark:bg-zinc-800 mt-2 rounded-full" />
                                                </div>

                                                <div className="flex-1 bg-slate-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all hover:shadow-md">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-zinc-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-zinc-700">
                                                                {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                            </span>
                                                            <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${item.type === 'VISIT' ? 'bg-indigo-50 text-indigo-700' :
                                                                item.type === 'PURCHASE' ? 'bg-emerald-50 text-emerald-700' :
                                                                    'bg-rose-50 text-rose-700'
                                                                }`}>
                                                                {item.type === 'VISIT' ? 'VISITA' : item.type === 'PURCHASE' ? 'COMPRA' : item.type === 'CANCELLATION' ? 'CANCELAMENTO' : item.type === 'RESTRICTION' ? 'RESTRIÇÃO' : item.type}
                                                            </span>
                                                        </div>
                                                        {item.providerId && (
                                                            <div className="flex items-center gap-2">
                                                                <Avatar size="w-5 h-5" name={providers.find(p => p.id === item.providerId)?.name || ''} src={providers.find(p => p.id === item.providerId)?.avatar} />
                                                                <span className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">{providers.find(p => p.id === item.providerId)?.name}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h5 className="text-[13px] font-black text-slate-950 dark:text-white uppercase leading-tight mb-1">{item.description}</h5>
                                                    {!!item.details && <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 leading-relaxed">{item.details}</p>}

                                                    {item.rating !== undefined && item.rating !== null && item.rating > 0 && (
                                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                                                            <div className="flex gap-0.5">
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <Star key={star} size={10} className={star <= item.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-zinc-700"} />
                                                                ))}
                                                            </div>
                                                            {!!item.feedback && <span className="text-[10px] text-slate-400 italic font-medium">"{item.feedback}"</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
                                <button 
                                    onClick={() => setShowHistoryPopup(false)}
                                    className="w-full py-4 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                                >
                                    FECHAR HISTÓRICO
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Histórico Pop-up Overlay */}
            {showHistoryPopup && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 border-2 border-slate-900 dark:border-zinc-800">
                        <div className="p-8 border-b border-slate-100 dark:border-zinc-900 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-inner"><History size={24} /></div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight">Histórico da Cliente</h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1.5">{customer.name.toUpperCase()}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistoryPopup(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-all"><X size={20} className="text-slate-400" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-white dark:bg-zinc-950 scrollbar-hide">
                            {(() => {
                                // Combinar Histórico JSON (DB) com Atendimentos Reais (allAppointments)
                                const appointmentsHistory = (allAppointments || [])
                                    .filter(a => a.customerId === customer.id)
                                    .map(a => {
                                        const svc = services.find(s => s.id === a.serviceId);
                                        const prov = providers.find(p => p.id === a.providerId);
                                        
                                        let details = '';
                                        if (a.status === 'Concluído') {
                                            details = `R$ ${(a.pricePaid || a.amount || 0).toFixed(2)} | ${a.paymentMethod || 'A Confirmar'}`;
                                        } else if (a.status === 'Cancelado') {
                                            details = `STATUS: CANCELADO${a.observation ? ` | JUSTIFICATIVA: ${a.observation}` : ''}`;
                                        } else {
                                            details = `STATUS: ${a.status.toUpperCase()} | HORÁRIO: ${a.time}${a.observation ? ` | Obs: ${a.observation}` : ''}`;
                                        }

                                        return {
                                            id: a.id,
                                            date: a.date,
                                            description: a.combinedServiceNames || svc?.name || 'Serviço',
                                            details: details,
                                            type: (a.status === 'Cancelado' ? 'CANCELLATION' : 'VISIT') as any,
                                            price: a.pricePaid || a.amount || 0,
                                            method: a.paymentMethod || 'Não informado',
                                            feedback: a.feedback,
                                            providerName: prov?.name || a.providerName || 'Não informado'
                                        };
                                    });

                                const dbHistoryItems = (customerHistory || []).map(h => ({
                                    ...h,
                                    isDb: true
                                }));

                                const combined = [...appointmentsHistory, ...dbHistoryItems].sort((a,b) => 
                                    new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - 
                                    new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime()
                                );

                                if (combined.length === 0 && !isLoadingHistory) {
                                    return (
                                        <div className="text-center py-20 bg-slate-50/50 dark:bg-zinc-900/10 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-zinc-800">
                                            <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm"><Calendar size={32} /></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum histórico disponível</p>
                                        </div>
                                    );
                                }

                                if (isLoadingHistory && combined.length === 0) {
                                    return <div className="text-center py-20 text-slate-400 font-black animate-pulse uppercase text-[10px]">Carregando histórico...</div>;
                                }

                                return (
                                    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-zinc-800 before:to-transparent">
                                        {combined.map((item: any, idx) => (
                                            <div key={idx} className="relative flex items-start gap-6 group">
                                                {/* Timeline Circle Overlay */}
                                                <div className="absolute left-0 mt-1.5 w-10 flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-950 border-2 border-indigo-500 flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                                        <CircleCheck size={18} className="text-indigo-500" />
                                                    </div>
                                                </div>

                                                {/* Card Content */}
                                                <div className="flex-1 ml-12 p-6 rounded-[2rem] border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all duration-300 shadow-sm group-hover:shadow-md">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1.5 flex-1 pr-4">
                                                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{new Date(item.date + (item.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                            <h4 className="text-[13px] font-black text-slate-950 dark:text-white uppercase leading-tight group-hover:text-indigo-600 transition-colors">{item.description}</h4>
                                                            
                                                            {(item.providerName || item.provider) && (
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                                                    PROFISSIONAL: <span className="text-indigo-600 dark:text-indigo-400">{item.providerName || item.provider}</span>
                                                                </p>
                                                            )}

                                                            <p className="text-[10px] font-bold text-slate-500 mt-2">
                                                                Valor: R$ {(item.price || 0).toFixed(2)} | Pagamento: {item.method || 'Não informado'}
                                                            </p>

                                                            {(item.feedback) && <p className="text-[10px] text-slate-500 italic mt-2 dark:text-slate-400 border-l-2 border-slate-100 dark:border-zinc-800 pl-3">"{item.feedback}"</p>}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[8px] font-black bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg uppercase truncate max-w-[80px] inline-block shadow-sm">
                                                                {item.isDb ? 'REGISTRO' : 'SISTEMA'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/50">
                            <button 
                                onClick={() => { setShowHistoryPopup(false); setMode('EDIT_CUSTOMER'); }}
                                className="w-full py-5 bg-slate-950 dark:bg-zinc-800 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl hover:bg-slate-900 dark:hover:bg-zinc-700"
                            >
                                <User size={18} /> Gerenciar Cliente Completo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConsentFormModal && (
                <ConsentForm 
                    customer={customer}
                    appointments={[appointment, ...allAppointments.filter(a => a.customerId === customer.id && a.id !== appointment.id)]}
                    services={services}
                    providers={providers}
                    onClose={() => setShowConsentFormModal(false)}
                    onSaved={() => {
                        setHasConsentForm(true);
                        setShowConsentFormModal(false);
                    }}
                    partners={partners}
                />
            )}
            {/* Custom Restriction Alert Modal */}
            {restrictionAlert.open && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-white/20 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldAlert size={40} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            
                            <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tighter mb-2">
                                Bloqueio de Segurança
                            </h3>
                            
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-6">
                                Profissional Restrito: <span className="text-rose-600 dark:text-rose-400 font-black">{restrictionAlert.providerName}</span>
                            </p>
                            
                            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-100 dark:border-zinc-800 mb-6 text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalhes da Restrição:</p>
                                <p className="text-xs font-black text-slate-800 dark:text-slate-200 italic leading-relaxed">
                                    "{restrictionAlert.reason}"
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2 justify-center py-3 px-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-900/50 mb-8 text-center">
                                <Ban size={14} className="text-rose-600" />
                                <p className="text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest leading-tight">
                                    Ação bloqueada. Altere o profissional para salvar o registro.
                                </p>
                            </div>
                            
                            <button
                                onClick={() => setRestrictionAlert({ ...restrictionAlert, open: false })}
                                className="w-full py-4 bg-slate-950 dark:bg-zinc-100 text-white dark:text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-950/10 active:scale-[0.98] transition-all"
                            >
                                Entendi e vou ajustar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast 
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
        </div>
    );
};
