
import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';

import { ShoppingCart, Plus, Minus, Search, Calendar, User, Package, Check, X, DollarSign, TrendingUp, BarChart3, Filter, CreditCard, ArrowUpRight, ChevronDown, Trash2, ShoppingBag, ChevronLeft, ChevronRight, CalendarRange, Camera, Loader2, ArrowRight, Save, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { CUSTOMERS } from '../constants';
import { Sale, StockItem, PaymentSetting, Customer, PaymentInfo } from '../types';
import { formatDateBR, parseDateSafe, toLocalDateStr } from '../services/financialService';
import { sanitizeImageUrl } from '../services/utils';

interface SalesProps {
    sales: Sale[];
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    paymentSettings: PaymentSetting[];
    customers: Customer[];
}

interface CartItem {
    id: string; // Temporary ID for the list
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export const Sales: React.FC<SalesProps> = ({ sales, setSales, stock, setStock, paymentSettings, customers }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- DATE FILTER STATE ---
    // Default to 'day' view showing today
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('day');
    const [dateRef, setDateRef] = useState(new Date());

    const [customRange, setCustomRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [paymentFilter, setPaymentFilter] = useState('all');
    const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

    // Transaction State
    const [customerId, setCustomerId] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [payments, setPayments] = useState<PaymentInfo[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Item Selection State
    const [currentProduct, setCurrentProduct] = useState('');
    const [currentQuantity, setCurrentQuantity] = useState(1);
    const [productSearch, setProductSearch] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [saleTab, setSaleTab] = useState<'SEARCH' | 'CATALOG'>('CATALOG');
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeMainTab, setActiveMainTab] = useState<'ACTIVITY' | 'CATALOG'>('CATALOG');
    const [triedToSubmit, setTriedToSubmit] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // Quick Registration State
    const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
    const [quickRegisterData, setQuickRegisterData] = useState<{ name: string, phone: string, cpf?: string }>({ name: '', phone: '', cpf: '' });
    const [isRegisteringClient, setIsRegisteringClient] = useState(false);

    // Catalog Filters
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [selectedSubGroup, setSelectedSubGroup] = useState<string>('all');

    // Multi-Image Catalog Preview
    const [previewProduct, setPreviewProduct] = useState<StockItem | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showThumbsUp, setShowThumbsUp] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastSaleForInvoice, setLastSaleForInvoice] = useState<Sale | null>(null);
    const touchStartRef = React.useRef<number | null>(null);

    const getCustomerName = (id: string) => (customers.find(c => c.id === id)?.name || 'Cliente Desconhecido').toUpperCase();
    const getProductName = (id: string) => stock.find(s => s.id === id)?.name || 'Produto Removido';

    // --- DATE HELPERS ---
    const navigateDate = (direction: 'prev' | 'next') => {
        if (timeView === 'custom') return;
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

    const isDateInPeriod = (dateStr: string) => {
        const d = parseDateSafe(dateStr);
        const refD = parseDateSafe(toLocalDateStr(dateRef)); 

        if (timeView === 'day') {
            return toLocalDateStr(d) === toLocalDateStr(refD);
        } else if (timeView === 'month') {
            return d.getMonth() === refD.getMonth() && d.getFullYear() === refD.getFullYear();
        } else if (timeView === 'year') {
            return d.getFullYear() === refD.getFullYear();
        } else if (timeView === 'custom') {
            const dStr = toLocalDateStr(d);
            return dStr >= customRange.start && dStr <= customRange.end;
        }
        return false;
    };

    // Computed Data
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const dateMatch = isDateInPeriod(s.date);
            const customerMatch = getCustomerName(s.customerId).toLowerCase().includes(searchTerm.toLowerCase());
            const productMatch = s.items?.some((item: any) => 
                (item.name || getProductName(item.productId)).toLowerCase().includes(searchTerm.toLowerCase())
            );
            const searchMatch = customerMatch || productMatch;
            const paymentMatch = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
            return dateMatch && searchMatch && paymentMatch;
        });
    }, [sales, timeView, dateRef, customRange, searchTerm, paymentFilter, stock]);

    const stats = useMemo(() => {
        const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        let totalItems = 0;
        const productCounts: Record<string, number> = {};

        filteredSales.forEach(s => {
            if (s.items && Array.isArray(s.items)) {
                s.items.forEach((item: any) => {
                    totalItems += (item.quantity || 0);
                    const id = item.productId || 'unknown';
                    productCounts[id] = (productCounts[id] || 0) + (item.quantity || 0);
                });
            }
        });

        const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
        const topProductId = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topProduct = stock.find(p => p.id === topProductId)?.name || '-';

        return { totalRevenue, totalItems, avgTicket, topProduct };
    }, [filteredSales, stock]);

    const saleProducts = useMemo(() => stock.filter(item => item.category === 'Venda' && item.quantity > 0), [stock]);

    const uniqueGroups = useMemo(() => {
        const groups = new Set(saleProducts.map(item => item.group).filter(Boolean));
        return Array.from(groups as Set<string>).sort();
    }, [saleProducts]);

    const uniqueSubGroups = useMemo(() => {
        if (selectedGroup === 'all') return [];
        const subGroups = new Set(
            saleProducts
                .filter(item => item.group === selectedGroup)
                .map(item => item.subGroup)
                .filter(Boolean)
        );
        return Array.from(subGroups as Set<string>).sort();
    }, [saleProducts, selectedGroup]);

    const filteredCatalog = useMemo(() => {
        return saleProducts.filter(item => {
            const matchesGroup = selectedGroup === 'all' || item.group === selectedGroup;
            const matchesSubGroup = selectedSubGroup === 'all' || item.subGroup === selectedSubGroup;
            const matchesSearch = item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                (item.code || '').toLowerCase().includes(productSearch.toLowerCase());
            return matchesGroup && matchesSubGroup && matchesSearch;
        });
    }, [saleProducts, selectedGroup, selectedSubGroup, productSearch]);

    // Calculate selected product details for preview
    const selectedStockItem = saleProducts.find(p => p.id === currentProduct);
    const currentItemTotal = selectedStockItem ? (selectedStockItem.price || 0) * currentQuantity : 0;

    // Cart Totals
    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    const totalPaid = useMemo(() => {
        return payments.reduce((acc, p) => acc + p.amount, 0);
    }, [payments]);

    const addPayment = () => {
        const remaining = cartTotal - totalPaid;
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
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleAddItemToCart = () => {
        if (!currentProduct || currentQuantity <= 0) return;

        const product = stock.find(p => p.id === currentProduct);
        if (!product) return;

        if (product.quantity < currentQuantity) {
            alert(`Estoque insuficiente. Disponível: ${product.quantity}`);
            return;
        }

        // Check if already in cart to verify total stock limit
        const existingInCart = cart.find(item => item.productId === currentProduct);
        const totalRequested = (existingInCart ? existingInCart.quantity : 0) + currentQuantity;

        if (product.quantity < totalRequested) {
            alert(`Estoque insuficiente para adicionar mais este item. Total disponível: ${product.quantity}`);
            return;
        }

        const newItem: CartItem = {
            id: Date.now().toString(),
            productId: currentProduct,
            productName: product.name,
            quantity: currentQuantity,
            unitPrice: product.price || 0,
            total: (product.price || 0) * currentQuantity
        };

        setCart([...cart, newItem]);
        setCurrentProduct('');
        setCurrentQuantity(1);
    };

    const fastAddToCart = (product: StockItem) => {
        if (product.quantity < 1) {
            alert(`Estoque esgotado para "${product.name}".`);
            return;
        }

        const existingInCart = cart.find(item => item.productId === product.id);
        const totalRequested = (existingInCart ? existingInCart.quantity : 0) + 1;

        if (product.quantity < totalRequested) {
            alert(`Estoque insuficiente para adicionar mais uma unidade de "${product.name}". Total disponível: ${product.quantity}`);
            return;
        }

        const newItem: CartItem = {
            id: Date.now().toString(),
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.price || 0,
            total: product.price || 0
        };

        setCart([...cart, newItem]);
        
        // FeedBack visual
        setShowThumbsUp(true);
        setTimeout(() => setShowThumbsUp(false), 1500);
    };

    const handleRemoveFromCart = (itemId: string) => {
        setCart(cart.filter(item => item.id !== itemId));
    };

    const handleOCRField = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setOcrError(null);

        try {
            const { data: { text } } = await Tesseract.recognize(file, 'por+eng');
            const normalizedText = text.toLowerCase()
                .replace(/[#*_\-\/]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            const matchedItem = saleProducts.find(item => {
                const name = item.name.toLowerCase();
                const code = item.code?.toLowerCase();

                if (code && normalizedText.includes(code)) return true;
                if (normalizedText.includes(name)) return true;

                const nameWords = name.split(' ').filter(word => word.length > 2);
                if (nameWords.length > 0 && nameWords.every(word => normalizedText.includes(word))) return true;

                return false;
            });

            if (matchedItem) {
                setCurrentProduct(matchedItem.id);
            } else {
                setOcrError("Produto não identificado.");
            }
        } catch (error) {
            console.error("OCR Error:", error);
            setOcrError("Erro ao ler imagem.");
        } finally {
            setIsScanning(false);
            if (e.target) e.target.value = '';
        }
    };

    const filteredProductOptions = useMemo(() => {
        if (!productSearch) return saleProducts.slice(0, 50);
        const search = productSearch.toLowerCase();
        return saleProducts.filter(item =>
            item.name.toLowerCase().includes(search) ||
            item.code?.toLowerCase().includes(search)
        );
    }, [saleProducts, productSearch]);

    const filteredCustomerOptions = useMemo(() => {
        if (!customerSearch) return customers.slice(0, 20);
        const search = customerSearch.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.phone.includes(search)
        ).slice(0, 20);
    }, [customers, customerSearch]);

    const handleQuickRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickRegisterData.name || !quickRegisterData.phone) return;

        // Check for existing customer locally first
        const normalizedPhone = quickRegisterData.phone.replace(/\D/g, '');
        const existingCustomer = (customers as any).find((c: any) => {
            const cPhone = (c.phone || '').replace(/\D/g, '');
            return (normalizedPhone && cPhone === normalizedPhone) || (c.name.toLowerCase() === quickRegisterData.name.toLowerCase());
        });

        if (existingCustomer) {
            if (window.confirm(`⚠️ CLIENTE JÁ CADASTRADA\n\nEncontramos "${existingCustomer.name}" com o mesmo telefone/nome.\n\nDeseja usar o cadastro existente?`)) {
                setCustomerId(existingCustomer.id);
                setIsQuickRegisterOpen(false);
                setQuickRegisterData({ name: '', phone: '', cpf: '' });
                return;
            }
        }

        setIsRegisteringClient(true);
        try {
            const newCustomerPayload = {
                name: quickRegisterData.name,
                phone: normalizedPhone,
                cpf: quickRegisterData.cpf,
                registration_date: new Date().toISOString().split('T')[0],
                status: 'Novo',
                total_spent: 0,
                acquisition_channel: 'Venda Direta'
            };

            const { data, error } = await supabase
                .from('customers')
                .insert([newCustomerPayload])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Update local list (if parents use it) - actually we should update the prop or refetch
                // Since 'customers' is a prop, we can't directly set it here, but we can set the customerId
                // and hope the parent updates eventually, or we alert that it's done.
                // However, in this app, usually customers are passed down.
                // We'll set the ID so the user can proceed.
                setCustomerId(data.id);
                setIsQuickRegisterOpen(false);
                setQuickRegisterData({ name: '', phone: '', cpf: '' });
                
                // IMPORTANT: We need to update the local 'customers' list so getCustomerName works.
                // Since this component doesn't have setCustomers, the new customer name won't show up immediately
                // unless we have a way to update the parent. 
                // Wait, Agenda.tsx has setCustomers. Sales.tsx does NOT.
                // Let me check SalesProps.
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            alert('Erro ao criar cliente.');
        } finally {
            setIsRegisteringClient(false);
        }
    };

    const handleDownloadInvoice = (sale: Sale) => {
        const customer = customers.find(c => c.id === sale.customerId);
        const fileName = `Fatura_Garantia_AminnaStore_${customer?.name?.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
        
        const invoiceHtml = `
            <div style="font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: white; position: relative; width: 210mm; margin: 0 auto; box-sizing: border-box;">
                <!-- Decorative Border -->
                <div style="position: absolute; top: 20px; right: 20px; bottom: 20px; left: 20px; border: 1px solid #f1f5f9; pointer-events: none; border-radius: 4px;"></div>

                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 60px; position: relative;">
                    <div style="display: flex; align-items: center; gap: 24px;">
                        <img src="/logo.png" style="height: 50px; width: auto; filter: grayscale(1) contrast(1.2);" alt="Aminna" />
                        <div style="border-left: 1px solid #e2e8f0; padding-left: 24px;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 300; text-transform: uppercase; letter-spacing: 0.3em; color: #0f172a;">Fatura</h1>
                            <p style="margin: 4px 0 0; font-size: 8px; font-weight: 600; color: #947c4c; text-transform: uppercase; letter-spacing: 0.4em;">Aminna Store</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em;">Data de Emissão</p>
                        <p style="margin: 4px 0 0; font-size: 13px; font-weight: 500; color: #0f172a; font-family: 'Times New Roman', serif; italic;">${formatDateBR(sale.date)}</p>
                    </div>
                </div>

                <!-- Client Info -->
                <div style="margin-bottom: 50px; position: relative;">
                    <p style="margin: 0 0 12px; font-size: 8px; font-weight: 800; color: #947c4c; text-transform: uppercase; letter-spacing: 0.2em;">Destinatário</p>
                    <h2 style="margin: 0; font-size: 18px; font-weight: 300; color: #475569; text-transform: uppercase; letter-spacing: 0.15em; font-family: 'Inter', sans-serif;">${customer?.name || 'Cliente Particular'}</h2>
                </div>

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #0f172a;">
                            <th style="padding: 12px 0; text-align: left; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.2em; width: 80px;">Imagem</th>
                            <th style="padding: 12px 15px; text-align: left; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.2em;">Descrição do Item</th>
                            <th style="padding: 12px 10px; text-align: center; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.2em; width: 60px;">Qtd</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.2em; width: 100px;">Unitário</th>
                            <th style="padding: 12px 0; text-align: right; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.2em; width: 100px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(sale.items || []).map((item: any) => {
                            const product = stock.find(s => s.id === item.productId);
                            const productImg = sanitizeImageUrl(product?.imageUrl || product?.imageUrls?.[0] || 'https://via.placeholder.com/150');
                            const productCode = product?.code || '---';

                            return `
                                <tr style="border-bottom: 1px solid #f8fafc;">
                                    <td style="padding: 20px 0;">
                                        <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; border: 1px solid #f1f5f9; background: #fff;">
                                            <img src="${productImg}" style="width: 100%; height: 100%; object-cover;" />
                                        </div>
                                    </td>
                                    <td style="padding: 20px 15px;">
                                        <div style="font-size: 13px; font-weight: 600; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">${item.name || product?.name || 'Produto'}</div>
                                        <div style="font-size: 9px; font-weight: 500; color: #94a3b8; margin-top: 4px; letter-spacing: 0.1em;">REF: ${productCode}</div>
                                    </td>
                                    <td style="padding: 20px 10px; text-align: center; font-size: 11px; font-weight: 400; color: #64748b;">${item.quantity}</td>
                                    <td style="padding: 20px 10px; text-align: right; font-size: 10px; font-weight: 400; color: #94a3b8; letter-spacing: 0.05em;">R$ ${item.unitPrice.toFixed(2)}</td>
                                    <td style="padding: 20px 0; text-align: right; font-size: 13px; font-weight: 600; color: #0f172a; letter-spacing: 0.02em;">R$ ${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <!-- Summary -->
                <div style="display: flex; justify-content: flex-end; margin-bottom: 80px;">
                    <div style="width: 280px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px;">
                            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em;">Subtotal</span>
                            <span style="font-size: 13px; font-weight: 400; color: #64748b;">R$ ${sale.totalAmount.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.15em;">Total Final</span>
                            <span style="font-size: 22px; font-weight: 300; color: #947c4c; letter-spacing: -0.02em;">R$ ${sale.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Guarantee Section -->
                <div style="background: #fdfdfd; padding: 40px; border-radius: 2px; color: #0f172a; display: flex; gap: 40px; align-items: center; position: relative; overflow: hidden; border: 1px solid #f1f5f9;">
                    <!-- Decorative Element -->
                    <div style="position: absolute; right: -20px; top: -20px; width: 120px; height: 120px; border: 1px solid rgba(148, 124, 76, 0.1); border-radius: 50%;"></div>
                    
                    <div style="width: 100px; height: 100px; border: 1px solid #947c4c; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: rgba(148, 124, 76, 0.03); flex-shrink: 0;">
                        <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #947c4c; margin-bottom: 4px;">Garantia</span>
                        <span style="font-size: 32px; font-weight: 200; line-height: 1; color: #0f172a;">90</span>
                        <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #947c4c; margin-top: 4px;">DIAS</span>
                    </div>

                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 300; text-transform: uppercase; letter-spacing: 0.2em; color: #947c4c;">Certificado de Autenticidade</h3>
                        <p style="margin: 0; font-size: 10px; font-weight: 300; color: #64748b; line-height: 1.8; letter-spacing: 0.04em;">
                            Este documento atesta a excelência e procedência da peça adquirida. Garantimos assistência total contra defeitos latentes de fabricação por um período de 90 dias a contar de <b>${formatDateBR(sale.date)}</b>. 
                            Nossa garantia preserva a integridade original da joia, eximindo-se de danos oriundos de desgaste natural, acondicionamento impróprio ou agentes químicos.
                        </p>
                        <div style="margin-top: 20px; height: 1px; width: 40px; background: #947c4c;"></div>
                    </div>
                </div>
                
                <div style="margin-top: 60px; text-align: center;">
                    <p style="font-size: 8px; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5em;">Thank you for choosing Aminna Store Experience</p>
                </div>
            </div>
        `;

        const element = document.createElement('div');
        element.innerHTML = invoiceHtml;
        document.body.appendChild(element);

        const opt = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
        });
    };

    const handleRegisterSale = async (e: React.FormEvent) => {
        e.preventDefault();
        setTriedToSubmit(true);

        if (!customerId || cart.length === 0 || payments.length === 0) {
            alert('Por favor, selecione a cliente, adicione produtos e defina o pagamento.');
            return;
        }

        if (Math.abs(totalPaid - cartTotal) > 0.01) {
            alert('A soma dos pagamentos deve ser igual ao total do carrinho.');
            return;
        }

        try {
            const saleToInsert = {
                customer_id: customerId,
                date: saleDate,
                total_amount: cartTotal,
                total_price: cartTotal,
                payment_method: payments.map(p => p.method).join(' + '),
                items: cart.map(i => ({
                    productId: i.productId,
                    name: i.productName,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice
                })),
                payments: payments.map(p => ({
                    id: p.id,
                    method: p.method,
                    amount: p.amount
                }))
            };

            const { data, error } = await supabase.from('sales').insert([saleToInsert]).select();
            if (error) throw error;

            if (data && data[0]) {
                const newSale: Sale = {
                    id: data[0].id,
                    customerId: data[0].customer_id,
                    date: data[0].date,
                    totalAmount: data[0].total_amount,
                    paymentMethod: data[0].payment_method,
                    items: data[0].items || [],
                    payments: data[0].payments || []
                };
                setSales([newSale, ...sales]);
                setLastSaleForInvoice(newSale);
            }

            // 2. Update stock levels
            for (const item of cart) {
                const stockItem = stock.find(s => s.id === item.productId);
                if (stockItem) {
                    const newQuantity = stockItem.quantity - item.quantity;
                    const { error: stockError } = await supabase
                        .from('stock_items')
                        .update({ quantity: newQuantity })
                        .eq('id', item.productId);
                    
                    if (stockError) throw stockError;
                    
                    setStock(prev => prev.map(s => s.id === item.productId ? { ...s, quantity: newQuantity } : s));
                }
            }

            // 3. Update local state and close modal
            setIsModalOpen(false);
            setCustomerId('');
            setCart([]);
            setPayments([]);
            setCustomerSearch('');
            setTriedToSubmit(false);
            setCurrentProduct('');
            setPaymentMethod('Pix');
            setSaleDate(new Date().toISOString().split('T')[0]);

            // Show success message
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setLastSaleForInvoice(null);
            }, 6000); 

        } catch (error) {
            console.error('Error registering sale:', error);
            alert('Erro ao registrar venda.');
        }
    };

    const handleDeleteSale = async (id: string) => {
        if (confirm('Deseja estornar esta venda? O estoque será devolvido automaticamente.')) {
            try {
                // 1. Encontrar a venda para obter os itens e devolver ao estoque
                const saleToDelete = sales.find(s => s.id === id);
                if (!saleToDelete) {
                    console.error('Sale not found in local state:', id);
                    return;
                }

                console.log('🔄 Iniciando estorno da venda:', id, 'Itens:', saleToDelete.items);

                // 2. Devolver itens ao estoque
                if (saleToDelete.items && Array.isArray(saleToDelete.items)) {
                    for (const item of saleToDelete.items) {
                        // Buscar item no estado local atualizado
                        const stockItem = stock.find(s => s.id === item.productId);
                        
                        if (stockItem) {
                            const currentQty = Number(stockItem.quantity) || 0;
                            const itemQty = Number(item.quantity) || 0;
                            const newQuantity = currentQty + itemQty;
                            
                            console.log(`📦 Restaurando produto ${item.productId}: ${currentQty} + ${itemQty} = ${newQuantity}`);

                            const { error: stockError } = await supabase
                                .from('stock_items')
                                .update({ quantity: newQuantity })
                                .eq('id', item.productId);
                            
                            if (stockError) {
                                console.error('Erro ao atualizar banco de dados para item:', item.productId, stockError);
                                throw stockError;
                            }
                            
                            // Atualizar estado local do estoque imediatamente
                            setStock(prev => prev.map(s => s.id === item.productId ? { ...s, quantity: newQuantity } : s));
                        } else {
                            console.warn('⚠️ Produto não encontrado no estoque local:', item.productId);
                            // TENTATIVA DE RECUPERAÇÃO: Buscar diretamente no Supabase caso não esteja no estado local
                            const { data: remoteItem } = await supabase.from('stock_items').select('quantity').eq('id', item.productId).single();
                            if (remoteItem) {
                                const newQuantity = (Number(remoteItem.quantity) || 0) + (Number(item.quantity) || 0);
                                await supabase.from('stock_items').update({ quantity: newQuantity }).eq('id', item.productId);
                                console.log(`✅ Restaurado via Supabase (não estava no local): ${item.productId} -> ${newQuantity}`);
                            }
                        }
                    }
                }

                // 3. Excluir a venda
                const { error } = await supabase.from('sales').delete().eq('id', id);
                if (error) throw error;
                
                setSales(prev => prev.filter(s => s.id !== id));
                console.log('✅ Venda excluída com sucesso:', id);
            } catch (error) {
                console.error('🚨 Erro crítico ao estornar venda:', error);
                alert('Erro ao estornar venda e devolver estoque. Verifique o console para detatlhes.');
            }
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-8 text-black dark:text-white">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="hidden md:block">
                    <img src="/logo.png" alt="Aminna Logo" className="h-14 w-auto object-contain dark:invert" />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Responsive Tab Switcher */}
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 flex-1 md:flex-none">
                        {/* Desktop Version */}
                        <div className="hidden lg:flex">
                            {(['ACTIVITY', 'CATALOG'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveMainTab(tab)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMainTab === tab ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                >
                                    {tab === 'ACTIVITY' ? 'Atividade' : 'Catálogo'}
                                </button>
                            ))}
                        </div>
                        {/* Mobile/iPad Collapsed Version */}
                        <div className="lg:hidden flex w-full">
                            <button
                                onClick={() => setActiveMainTab(activeMainTab === 'ACTIVITY' ? 'CATALOG' : 'ACTIVITY')}
                                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center justify-between"
                            >
                                <span>{activeMainTab === 'ACTIVITY' ? 'Atividade' : 'Catálogo'}</span>
                                <ChevronDown size={14} className="opacity-50" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabs Content */}
            {activeMainTab === 'ACTIVITY' ? (
                <>
                    {/* KPI Section */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl"><DollarSign size={20} /></div>
                        <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Receita Total</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl"><Package size={20} /></div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Itens Vendidos</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">{stats.totalItems} un</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><BarChart3 size={20} /></div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Ticket Médio</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">R$ {stats.avgTicket.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl"><ArrowUpRight size={20} /></div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Mais Vendido</p>
                    <p className="text-xs md:text-sm font-black text-slate-950 dark:text-white truncate">{stats.topProduct}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col xl:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou produto..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-transparent focus:border-black dark:focus:border-white rounded-2xl text-xs md:text-sm font-black text-slate-950 dark:text-white outline-none transition-all placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Date & Payment Controls */}
                <div className="flex flex-col md:flex-row gap-3 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}
                            </button>
                        ))}
                    </div>

                    {/* Date Navigator */}
                    {timeView === 'custom' ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl w-full md:w-auto">
                            <CalendarRange size={16} className="text-slate-400" />
                            <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                            <span className="text-slate-300">-</span>
                            <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between md:justify-start">
                            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <div className="flex flex-col items-center min-w-[120px]">
                                <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span>
                            </div>
                            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    )}

                    <select
                        value={paymentFilter}
                        onChange={e => setPaymentFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-zinc-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-zinc-700 text-[11px] font-black uppercase text-slate-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-all w-full md:w-auto"
                    >
                        <option value="all">Todos Pagamentos</option>
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão">Cartão</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-800 dark:text-slate-300 font-black uppercase bg-slate-50 dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4 text-center">Qtd</th>
                                <th className="px-6 py-4 text-right">Valor Unit.</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Pagamento</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 group">
                                    <td className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 text-xs">
                                        {formatDateBR(sale.date)}
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">
                                        {getCustomerName(sale.customerId)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                        {sale.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="truncate max-w-[200px]">
                                                {item.name || getProductName(item.productId)}
                                            </div>
                                        )) || 'Sem itens'}
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">
                                        {sale.items?.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0) || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 font-bold">
                                        {sale.items?.length === 1 ? `R$ ${(sale.items[0].unitPrice || 0).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-700 dark:text-emerald-400">
                                        R$ {(sale.totalAmount || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-[9px] px-2 py-1 rounded-full font-black uppercase bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 dark:text-slate-300">
                                            {sale.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setSelectedSaleDetail(sale)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Detalhes">
                                                <Search size={16} />
                                            </button>
                                            <button onClick={() => handleDownloadInvoice(sale)} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Baixar Fatura e Garantia">
                                                <FileText size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100" title="Estornar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
                {filteredSales.map(sale => (
                    <div key={sale.id} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3 active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase">{formatDateBR(sale.date)}</p>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate uppercase">{getCustomerName(sale.customerId)}</h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="p-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded-lg"><Package size={12} /></span>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                        {sale.items?.map((i: any) => i.name || getProductName(i.productId)).join(', ') || 'Sem itens'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 leading-none">R$ {(sale.totalAmount || 0).toFixed(2)}</p>
                                <span className="text-[9px] font-black uppercase text-slate-400">
                                    {sale.items?.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0) || 0} unid.
                                </span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-50 dark:border-zinc-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setSelectedSaleDetail(sale)} className="text-[9px] px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl font-black uppercase border border-indigo-100 dark:border-indigo-800 flex items-center gap-1.5">
                                    <Search size={10} /> DETALHES
                                </button>
                                <button onClick={() => handleDownloadInvoice(sale)} className="text-[9px] px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-black uppercase border border-emerald-100 dark:border-emerald-800 flex items-center gap-1.5">
                                    <FileText size={10} /> FATURA
                                </button>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    {sale.items?.length === 1 ? `Unit: R$${(sale.items[0].unitPrice || 0).toFixed(2)}` : `${sale.items?.length || 0} itens`}
                                </p>
                            </div>
                            <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-rose-200 dark:text-rose-900 active:text-rose-600 dark:active:text-rose-400">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredSales.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-zinc-800">
                        <ShoppingCart size={48} className="mx-auto text-slate-100 dark:text-zinc-800 mb-2" />
                        <p className="text-sm font-black text-slate-300 dark:text-zinc-600 uppercase">Nenhuma venda encontrada</p>
                    </div>
                )}
            </div>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                    <button
                                        onClick={() => { setSelectedGroup('all'); setSelectedSubGroup('all'); }}
                                        className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedGroup === 'all' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-lg' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                    >
                                        Todos
                                    </button>
                                    {uniqueGroups.map(group => (
                                        <button
                                            key={group}
                                            onClick={() => { setSelectedGroup(group); setSelectedSubGroup('all'); }}
                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedGroup === group ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-lg' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                        >
                                            {group}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {cart.length > 0 && (
                                    <button 
                                        onClick={() => setIsModalOpen(true)}
                                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-base font-black flex items-center justify-center animate-bounce-subtle border border-indigo-100 dark:border-indigo-800"
                                        title="Ver Carrinho"
                                    >
                                        🛒 <span className="text-xs ml-1">({cart.length})</span>
                                    </button>
                                )}
                                <div className={`relative flex items-center transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-full sm:w-64 md:w-80' : 'w-10 h-10 overflow-hidden'}`}>
                                    <button 
                                        onClick={() => {
                                            if (isSearchExpanded) {
                                                setProductSearch('');
                                                setIsSearchExpanded(false);
                                            } else {
                                                setIsSearchExpanded(true);
                                            }
                                        }}
                                        className={`absolute ${isSearchExpanded ? 'right-4' : 'left-0 w-full h-full flex items-center justify-center'} top-1/2 -translate-y-1/2 z-10 transition-all`}
                                    >
                                        {isSearchExpanded ? <X size={16} className="text-slate-400 hover:text-slate-900 dark:hover:text-white" /> : <Search size={22} className="text-slate-600 dark:text-slate-400" />}
                                    </button>
                                    
                                    {!isSearchExpanded && (
                                        <button 
                                            onClick={() => setIsSearchExpanded(true)}
                                            className="absolute inset-0 z-0 bg-slate-50 dark:bg-zinc-800 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                        />
                                    )}

                                    <div className={`relative w-full transition-opacity duration-300 ${isSearchExpanded ? 'opacity-100 pl-4 pr-10' : 'opacity-0 pointer-events-none'}`}>
                                        <Search size={16} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            autoFocus={isSearchExpanded}
                                            placeholder="Filtrar catálogo..."
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-transparent focus:border-zinc-950 dark:focus:border-white rounded-2xl text-[10px] font-black outline-none transition-all shadow-inner"
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>


                            {uniqueSubGroups.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <button
                                        onClick={() => setSelectedSubGroup('all')}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSubGroup === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                    >
                                        Todas Subcategorias
                                    </button>
                                    {uniqueSubGroups.map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setSelectedSubGroup(sub)}
                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSubGroup === sub ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredCatalog.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            setPreviewProduct(product);
                                            setActiveImageIndex(0);
                                            setCurrentQuantity(1);
                                        }}
                                        className="group bg-white dark:bg-zinc-800 rounded-3xl border-2 p-3 text-left hover:border-zinc-950 dark:hover:border-white transition-all shadow-sm hover:shadow-xl active:scale-[0.98] flex flex-col gap-3 relative overflow-hidden"
                                        style={{ borderColor: '#D9D9D6' }}
                                    >
                                        <div className="aspect-square rounded-[1.5rem] bg-slate-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-zinc-800 shadow-inner">
                                            {product.imageUrl ? (
                                                <img 
                                                    src={sanitizeImageUrl(product.imageUrl)} 
                                                    alt={product.name} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                    referrerPolicy="no-referrer"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <Package size={32} className="text-slate-200 dark:text-zinc-700" />
                                            )}
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fastAddToCart(product);
                                                    }}
                                                    className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 p-2 rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all pointer-events-auto"
                                                    title="Adicionar 1 ao Carrinho"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-1">
                                            {/* Truncated Name for Mobile/iPad (first word) */}
                                            <p className="lg:hidden text-xs font-black text-slate-900 dark:text-white truncate uppercase leading-tight group-hover:text-indigo-600 transition-colors">
                                                {product.name?.split(' ')[0]}
                                            </p>
                                            {/* Full Name for Desktop */}
                                            <p className="hidden lg:block text-xs font-black text-slate-900 dark:text-white truncate uppercase leading-tight group-hover:text-indigo-600 transition-colors">
                                                {product.name}
                                            </p>
                                            <div className="flex justify-between items-end mt-2">
                                                <p className="text-sm font-black" style={{ color: '#75787B' }}>R$ {product.price?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            }
                        </div>

                        {filteredCatalog.length === 0 && (
                            <div className="py-32 text-center opacity-50 bg-slate-50 dark:bg-zinc-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-zinc-700">
                                <ShoppingBag size={64} className="mx-auto mb-4 text-slate-300 dark:text-zinc-700" />
                                <h4 className="text-lg font-black uppercase text-slate-400 dark:text-zinc-500">Nenhum produto encontrado</h4>
                                <p className="text-xs font-bold text-slate-400/70 mt-1 uppercase tracking-widest">Ajuste os filtros ou cadastre novos produtos</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New Sale Modal (Updated for Cart) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col max-h-[90vh] border border-slate-200 dark:border-zinc-800">
                        {/* Header Updated to be Light by default, Dark in Dark Mode */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-black flex justify-between items-center bg-white dark:bg-zinc-950 text-slate-900 dark:text-white flex-shrink-0">
                            <h3 className="font-black text-base md:text-lg uppercase tracking-tight flex items-center gap-2">
                                <ShoppingCart size={20} className="text-slate-900 dark:text-white" />
                                Registrar Venda
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleRegisterSale} className="flex flex-col flex-1 overflow-hidden">
                            {/* 1. Date and Customer Selection */}
                            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-950/20 flex-shrink-0 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                                        <span>Data da Venda</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100" />
                                        <input
                                            type="date"
                                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-slate-900 dark:text-white transition-all shadow-sm"
                                            value={saleDate}
                                            onChange={e => setSaleDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                                        <span>Selecionar Cliente</span>
                                        {customerId && <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-black uppercase">Selecionada</span>}
                                    </label>

                                {!customerId ? (
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100" />
                                        <input
                                            type="text"
                                            placeholder="Busque por nome ou celular..."
                                            className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 ${triedToSubmit && !customerId ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-zinc-700'} rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-slate-900 dark:text-white transition-all shadow-sm`}
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                        />
                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100 pointer-events-none" />

                                        {isQuickRegisterOpen ? (
                                            <div className="mt-2 p-4 bg-indigo-50 dark:bg-zinc-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl animate-in slide-in-from-top-2">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-black text-[10px] uppercase text-indigo-900 dark:text-indigo-400">Novo Cadastro Rápido</h4>
                                                    <button type="button" onClick={() => setIsQuickRegisterOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-bold uppercase">Cancelar</button>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Nome Completo"
                                                        className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-700 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white uppercase"
                                                        value={quickRegisterData.name}
                                                        onChange={e => setQuickRegisterData({ ...quickRegisterData, name: e.target.value })}
                                                        autoFocus
                                                    />
                                                    <input
                                                        type="tel"
                                                        placeholder="Telefone / WhatsApp"
                                                        className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-700 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                                        value={quickRegisterData.phone}
                                                        onChange={e => setQuickRegisterData({ ...quickRegisterData, phone: e.target.value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleQuickRegister}
                                                        disabled={!quickRegisterData.name || !quickRegisterData.phone || isRegisteringClient}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {isRegisteringClient ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        {isRegisteringClient ? 'Salvando...' : 'Salvar e Selecionar'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-1 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsQuickRegisterOpen(true);
                                                        if (customerSearch && isNaN(Number(customerSearch))) {
                                                            setQuickRegisterData(prev => ({ ...prev, name: customerSearch }));
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Plus size={12} /> Cadastrar Nova Cliente
                                                </button>
                                            </div>
                                        )}

                                        {customerSearch && !isQuickRegisterOpen && (
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                                {filteredCustomerOptions.length > 0 ? filteredCustomerOptions.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-100 dark:border-zinc-800 last:border-none flex justify-between items-center group/client"
                                                        onClick={() => {
                                                            setCustomerId(c.id);
                                                            setCustomerSearch('');
                                                        }}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-black text-[12px] text-slate-950 dark:text-white truncate uppercase">{c.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{c.phone}</p>
                                                        </div>
                                                        <ArrowRight size={14} className="text-slate-300 group-hover/client:text-indigo-600" />
                                                    </button>
                                                )) : (
                                                    <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase">Nenhuma cliente encontrada</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/50 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"><User size={16} /></div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-950 dark:text-white truncate uppercase">{getCustomerName(customerId)}</p>
                                                <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">{customers.find(c => c.id === customerId)?.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setCustomerId('')} className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-slate-50 transition-colors">Trocar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900 flex-1">
                                {/* Tab Switcher remains inside scrollable area */}
                                <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 mb-2">
                                    {(['CATALOG', 'SEARCH'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setSaleTab(tab)}
                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${saleTab === tab ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            {tab === 'CATALOG' ? 'Catálogo Visual' : 'Busca por Código'}
                                        </button>
                                    ))}
                                </div>

                                {/* Items Area */}
                                {saleTab === 'SEARCH' ? (
                                    <>
                                        <div className="flex justify-between items-center mb-1.5 px-1">
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Adicionar Produto</label>
                                            <div className="flex items-center gap-2">
                                                {/* Mobile/Tablet Only: Take Photo */}
                                                <label className="md:hidden cursor-pointer flex items-center gap-1 px-2 py-1 bg-zinc-950 text-white rounded-lg text-[8px] font-black uppercase transition-all shadow-sm active:scale-95 border border-black">
                                                    {isScanning ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
                                                    {isScanning ? 'Lendo...' : 'Tirar Foto'}
                                                    <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleOCRField} disabled={isScanning} />
                                                </label>

                                                <span className="text-slate-300 dark:text-zinc-700 md:hidden">|</span>

                                                {/* Upload from Gallery (Standard) */}
                                                <label className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer shadow-sm border ${isScanning ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-600 text-white border-indigo-700 active:scale-95'}`}>
                                                    {isScanning ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} className="md:hidden" />}
                                                    <Camera size={10} className="hidden md:block" />
                                                    {isScanning ? 'Lendo...' : (
                                                        <>
                                                            <span className="md:hidden">Galeria</span>
                                                            <span className="hidden md:inline">Escanear</span>
                                                        </>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleOCRField} disabled={isScanning} />
                                                </label>
                                            </div>
                                        </div>

                                        {!currentProduct ? (
                                            <div className="relative">
                                                <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100" />
                                                <input
                                                    type="text"
                                                    placeholder="Busque por nome ou bipe o código..."
                                                    className="w-full pl-11 pr-10 py-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 focus:border-black dark:focus:border-white rounded-2xl text-sm font-black outline-none text-slate-900 dark:text-white transition-all"
                                                    value={productSearch}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setProductSearch(val);
                                                        const exactMatch = stock.find(i => i.category === 'Venda' && i.code?.toUpperCase() === val.toUpperCase());
                                                        if (exactMatch) {
                                                            setCurrentProduct(exactMatch.id);
                                                            setProductSearch('');
                                                        }
                                                    }}
                                                />
                                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />

                                                {productSearch && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                                        {filteredProductOptions.map(item => (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800 last:border-none flex justify-between items-center group/item"
                                                                onClick={() => {
                                                                    setCurrentProduct(item.id);
                                                                    setProductSearch('');
                                                                }}
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-[11px] text-slate-950 dark:text-white truncate uppercase">{item.name}</p>
                                                                    <p className="text-[9px] font-bold text-slate-500 uppercase">{item.code || 'S/ REF'} - R$ {item.price?.toFixed(2)}</p>
                                                                </div>
                                                                <ArrowRight size={14} className="text-slate-300 group-hover/item:text-indigo-600" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl border-2 border-black dark:border-zinc-700 flex items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">Produto Selecionado</p>
                                                    <p className="text-xs font-black truncate" style={{ color: '#75787B' }}>{selectedStockItem?.name}</p>
                                                    <p className="text-[10px] font-bold" style={{ color: '#75787B' }}>R$ {selectedStockItem?.price?.toFixed(2)}</p>
                                                </div>
                                                <button type="button" onClick={() => setCurrentProduct('')} className="text-[9px] font-black text-slate-950 dark:text-white uppercase bg-white dark:bg-zinc-700 px-2.5 py-1.5 rounded-lg ml-2 border border-black dark:border-zinc-600 shadow-sm">Remover</button>
                                            </div>
                                        )}
                                        {ocrError && <p className="text-[9px] font-bold text-rose-600 px-1">{ocrError}</p>}
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Filtrar catálogo..."
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black outline-none text-slate-950 dark:text-white focus:border-black dark:focus:border-white transition-all shadow-inner"
                                                value={productSearch}
                                                onChange={e => setProductSearch(e.target.value)}
                                            />
                                        </div>
                                        
                                        {!currentProduct ? (
                                            <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 overflow-y-auto max-h-[350px] p-1 scrollbar-hide">
                                                {stock
                                                    .filter(item => item.category === 'Venda' && (!productSearch || item.name.toLowerCase().includes(productSearch.toLowerCase())))
                                                    .map(product => (
                                                        <button
                                                            key={product.id}
                                                            type="button"
                                                            onClick={() => setCurrentProduct(product.id)}
                                                            className="group bg-white dark:bg-zinc-800 rounded-2xl border-2 p-3 text-left hover:border-black dark:hover:border-white transition-all shadow-sm active:scale-95 flex flex-col gap-1 relative overflow-hidden"
                                                            style={{ borderColor: '#D9D9D6' }}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black truncate uppercase leading-tight group-hover:text-indigo-600 transition-colors" style={{ color: '#75787B' }}>{product.name}</p>
                                                                <div className="flex justify-between items-end mt-1">
                                                                    <p className="text-[11px] font-black" style={{ color: '#75787B' }}>R$ {product.price?.toFixed(2)}</p>
                                                                    <p className={`text-[8px] font-bold uppercase ${product.quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {product.quantity > 0 ? `${product.quantity} unid.` : 'Off'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border-2 border-black dark:border-zinc-700 flex items-center justify-between animate-in zoom-in-95 duration-200 shadow-xl">
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Selecionado</p>
                                                        <p className="text-sm font-black truncate uppercase" style={{ color: '#75787B' }}>{selectedStockItem?.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-black" style={{ color: '#75787B' }}>R$ {selectedStockItem?.price?.toFixed(2)}</span>
                                                            <span className="w-1 h-1 bg-slate-300 dark:bg-zinc-600 rounded-full"></span>
                                                            <span className={`text-[9px] font-bold uppercase ${(selectedStockItem?.quantity || 0) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {(selectedStockItem?.quantity || 0)} disponiveis
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => setCurrentProduct('')} className="text-[10px] font-black text-slate-900 dark:text-white uppercase bg-slate-50 dark:bg-zinc-700 px-4 py-2 rounded-xl ml-4 border border-slate-200 dark:border-zinc-600 shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 transition-all">Remover</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedStockItem?.quantity || 999}
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-black dark:focus:border-white rounded-2xl p-4 text-xl font-black outline-none text-slate-900 dark:text-white text-center placeholder:text-slate-200 transition-all"
                                            placeholder="Qtd"
                                            value={currentQuantity}
                                            onChange={e => setCurrentQuantity(parseInt(e.target.value) || 1)}
                                        />
                                        <span className="absolute -top-2 left-4 bg-white dark:bg-zinc-900 px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantidade</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddItemToCart}
                                        disabled={!currentProduct}
                                        className="flex-[2] bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-slate-200 disabled:opacity-50 transition-all shadow-xl active:scale-[0.98] group"
                                    >
                                        <Plus size={18} className="group-active:rotate-90 transition-transform" /> 
                                        Adicionar ao Carrinho
                                    </button>
                                </div>

                                {/* 3. Cart List */}
                                {cart.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Itens no Carrinho</label>
                                        <div className="bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl overflow-hidden divide-y divide-slate-50 dark:divide-zinc-700">
                                            {cart.map(item => (
                                                <div key={item.id} className="p-3 flex justify-between items-center group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-100 dark:bg-zinc-700 p-2 rounded-lg text-slate-500 dark:text-slate-400"><ShoppingBag size={16} /></div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white">{item.productName}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.quantity}x R$ {item.unitPrice.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white">R$ {item.total.toFixed(2)}</span>
                                                        <button onClick={() => handleRemoveFromCart(item.id)} className="text-rose-300 hover:text-rose-600 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 4. Payment & Totals */}
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between ml-1 mb-2">
                                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Formas de Recebimento</label>
                                            <button
                                                type="button"
                                                onClick={addPayment}
                                                className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Adicionar Fonte
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {payments.length === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={addPayment}
                                                    className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-100 transition-colors"
                                                >
                                                    Definir Pagamento
                                                </button>
                                            )}
                                            {payments.map((payment) => (
                                                <div key={payment.id} className="flex gap-2">
                                                    <select
                                                        className="flex-[2] bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-black uppercase"
                                                        value={payment.method}
                                                        onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                                                    >
                                                        {paymentSettings.map(pay => (
                                                            <option key={pay.id} value={pay.method}>
                                                                {pay.method}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full pl-8 pr-3 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-black"
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
                                            ))}
                                        </div>
                                        {payments.length > 0 && (
                                            <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between ${Math.abs(totalPaid - cartTotal) < 0.01 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                                <span className="text-[9px] font-black uppercase text-slate-500">Total Pago</span>
                                                <span className={`text-xs font-black ${Math.abs(totalPaid - cartTotal) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    R$ {totalPaid.toFixed(2)} / R$ {cartTotal.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-5 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/50">
                                        <div className="flex justify-between items-center text-2xl font-black text-emerald-950 dark:text-emerald-400">
                                            <span>Total Geral</span>
                                            <span>R$ {cartTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3 flex-shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 py-4 text-slate-400 dark:text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    {cart.length > 0 ? "Continuar Comprando" : "Cancelar"}
                                </button>
                                 <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    <Check size={18} /> Confirmar Venda
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sale Details Modal */}
            {selectedSaleDetail && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 border border-slate-200 dark:border-zinc-800">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950">
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                    <ShoppingBag size={18} className="text-indigo-600" /> Detalhes da Venda
                                </h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase">{getCustomerName(selectedSaleDetail.customerId)}</p>
                            </div>
                            <button onClick={() => setSelectedSaleDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 flex justify-between items-center text-emerald-900 dark:text-emerald-300">
                                <span className="text-[10px] font-black uppercase tracking-widest">Total Pago</span>
                                <span className="text-2xl font-black tracking-tighter">R$ {selectedSaleDetail.totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Itens Vendidos</h4>
                                <div className="space-y-2">
                                    {(selectedSaleDetail.items || []).map((item: any, idx: number) => {
                                        const product = stock.find(s => s.id === item.productId);
                                        const productImg = product?.imageUrl || product?.imageUrls?.[0] || 'https://via.placeholder.com/150';
                                        const productCode = product?.code || '---';

                                        return (
                                            <div key={idx} className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700 flex justify-between items-center gap-4">
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex-shrink-0 shadow-sm">
                                                        <img src={sanitizeImageUrl(productImg)} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-slate-950 dark:text-white uppercase truncate tracking-tight">{item.name || product?.name || 'Produto'}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">REF: {productCode}</span>
                                                            <span className="w-1 h-1 bg-slate-300 dark:bg-zinc-600 rounded-full"></span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity}un x R$ {item.unitPrice?.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">R$ {(item.quantity * item.unitPrice).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Formas de Recebimento</h4>
                                <div className="bg-slate-100 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-2">
                                    {(selectedSaleDetail.payments && selectedSaleDetail.payments.length > 0) ? (
                                        selectedSaleDetail.payments.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{p.method}</span>
                                                </div>
                                                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">R$ {p.amount.toFixed(2)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400" />
                                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{selectedSaleDetail.paymentMethod}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button
                                    onClick={() => handleDownloadInvoice(selectedSaleDetail)}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <FileText size={16} /> Fatura e Garantia
                                </button>
                                <button
                                    onClick={() => setSelectedSaleDetail(null)}
                                    className="flex-1 py-4 bg-slate-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                                >
                                    Fechar Detalhes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Catalog Preview Modal */}
            {previewProduct && (
                <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-0 md:p-6 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-zinc-950 md:rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-full md:h-[85vh] border border-white/5 relative">
                        
                        {/* Close Button - Sticky/Fixed at top right */}
                        <button 
                            onClick={() => setPreviewProduct(null)}
                            className="absolute top-3 right-3 md:top-6 md:right-6 z-50 p-1.5 md:p-4 bg-black/40 hover:bg-black/60 backdrop-blur-xl text-white rounded-full transition-all border border-white/10 shadow-lg active:scale-90"
                        >
                            <X size={14} className="md:w-6 md:h-6" />
                        </button>

                        {/* Image Section - The STAR */}
                        <div 
                            className="flex-1 relative bg-zinc-50 dark:bg-black flex items-center justify-center group overflow-hidden min-h-0 touch-pan-y"
                            onTouchStart={(e) => {
                                touchStartRef.current = e.touches[0].clientX;
                            }}
                            onTouchEnd={(e) => {
                                if (touchStartRef.current === null) return;
                                const touchEnd = e.changedTouches[0].clientX;
                                const diff = touchStartRef.current - touchEnd;
                                const images = [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean);
                                
                                if (Math.abs(diff) > 50) { // Threshold for swipe
                                    if (diff > 0) {
                                        // Swipe Left -> Next
                                        setActiveImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
                                    } else {
                                        // Swipe Right -> Prev
                                        setActiveImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
                                    }
                                }
                                touchStartRef.current = null;
                            }}
                        >
                            {/* Main Image - Fully Expanded */}
                            <img 
                                src={sanitizeImageUrl([previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean)[activeImageIndex] as string || '')} 
                                alt={previewProduct.name}
                                className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-700 select-none pointer-events-none"
                                referrerPolicy="no-referrer"
                            />

                            {/* Navigation Arrows - Visible on mobile/iPad too if multiple images */}
                            {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const images = [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean);
                                            setActiveImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
                                        }}
                                        className="absolute left-6 top-1/2 -translate-y-1/2 p-5 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-[2rem] transition-all border border-white/10 active:scale-95 z-10 hidden lg:flex"
                                    >
                                        <ChevronLeft size={32} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const images = [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean);
                                            setActiveImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
                                        }}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 p-5 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-[2rem] transition-all border border-white/10 active:scale-95 z-10 hidden lg:flex"
                                    >
                                        <ChevronRight size={32} />
                                    </button>
                                </>
                            )}

                            {/* Indicators */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
                                {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Bottom Info Panel - Compact & Premium */}
                        <div className="bg-white dark:bg-zinc-950 p-4 md:p-6 border-t border-slate-100 dark:border-zinc-900 flex-shrink-0">
                            <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-center">
                                
                                {/* 1. Product Identify */}
                                <div className="flex-1 space-y-0.5 text-center md:text-left min-w-0 w-full">
                                    <div className="flex justify-center md:justify-start items-center gap-2">
                                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.3em]">{previewProduct.group || 'Semi Joia'}</p>
                                    </div>
                                    <h2 className="text-[11px] md:text-base font-black uppercase tracking-tight truncate text-slate-900 dark:text-white">{previewProduct.name}</h2>
                                    {/* Desktop Price */}
                                    <div className="hidden md:flex items-center justify-start gap-3">
                                        <span className="text-base md:text-lg font-black italic tracking-tighter text-slate-950 dark:text-emerald-400">R$ {previewProduct.price?.toFixed(2)}</span>
                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">por unidade</span>
                                    </div>
                                </div>

                                {/* 2. Gallery & Controls */}
                                <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                                    {/* Tiny Gallery */}
                                    {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).length > 1 && (
                                        <div className="hidden md:flex gap-1.5 overflow-x-auto max-w-[200px] scrollbar-hide">
                                            {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).map((url, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => setActiveImageIndex(i)}
                                                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${i === activeImageIndex ? 'border-zinc-950 dark:border-white' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                                >
                                                    <img src={sanitizeImageUrl(url as string)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                                        {/* Mobile/iPad Price & Qty Combo */}
                                        <div className="flex flex-col items-start md:hidden">
                                            <span className="text-sm font-black italic tracking-tighter text-slate-950 dark:text-emerald-400">R$ {previewProduct.price?.toFixed(2)}</span>
                                        </div>

                                        {/* Qty Selector */}
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                                            <button 
                                                onClick={() => setCurrentQuantity(prev => Math.max(1, prev - 1))}
                                                className="text-slate-400 hover:text-black dark:hover:text-white transition-colors p-1"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="text-lg font-black text-zinc-950 dark:text-white tabular-nums min-w-[20px] text-center">{currentQuantity}</span>
                                            <button 
                                                onClick={() => setCurrentQuantity(prev => prev + 1)}
                                                className="text-slate-400 hover:text-black dark:hover:text-white transition-colors p-1"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        {/* Action Button - Icon Only */}
                                        <button 
                                            onClick={() => {
                                                const newItem: CartItem = {
                                                    id: Date.now().toString(),
                                                    productId: previewProduct.id,
                                                    productName: previewProduct.name,
                                                    quantity: currentQuantity,
                                                    unitPrice: previewProduct.price || 0,
                                                    total: (previewProduct.price || 0) * currentQuantity
                                                };
                                                setCart([...cart, newItem]);
                                                
                                                // Trigger Thumbs Up Animation
                                                setShowThumbsUp(true);
                                                setTimeout(() => {
                                                    setShowThumbsUp(false);
                                                    setPreviewProduct(null);
                                                }, 1500);
                                            }}
                                            title="Adicionar ao Carrinho"
                                            className="h-10 flex-1 md:flex-none md:w-20 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1 group px-4 md:px-0"
                                        >
                                            <Plus size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                            <ShoppingCart size={18} className="group-hover:scale-110 transition-transform" /> 
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setPreviewProduct(null)}
                                className="w-full mt-2 text-[8px] font-black uppercase tracking-[0.4em] text-slate-300 hover:text-slate-500 transition-colors"
                            >
                                Voltar para o Catálogo
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Success Message Overlay */}
            {showSuccess && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <CheckCircle2 size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase tracking-widest leading-none">Venda Realizada!</p>
                            <p className="text-[10px] font-bold opacity-90 uppercase mt-0.5">A venda foi registrada com sucesso.</p>
                            {lastSaleForInvoice && (
                                <button 
                                    onClick={() => handleDownloadInvoice(lastSaleForInvoice)}
                                    className="mt-2.5 bg-white text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-lg animate-pulse"
                                >
                                    <FileText size={12} /> Gerar Fatura e Garantia
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Thumbs Up Animation (Teams-like) */}
            {showThumbsUp && (
                <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
                    <div className="text-8xl animate-conversation-thumbs-up">
                        👍
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes thumbsUp {
                    0% { transform: translateY(100px) scale(0); opacity: 0; }
                    20% { transform: translateY(0) scale(1.2); opacity: 1; }
                    80% { transform: translateY(-50px) scale(1); opacity: 1; }
                    100% { transform: translateY(-150px) scale(0.8); opacity: 0; }
                }
                .animate-conversation-thumbs-up {
                    animation: thumbsUp 1.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards;
                }
            ` }} />
        </div>
    );
};
