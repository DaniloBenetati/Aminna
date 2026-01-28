
import React, { useState, useMemo } from 'react';
import { Package, AlertTriangle, ShoppingBag, Plus, Minus, X, Check, DollarSign, History, TrendingUp, Edit2, Tag, User, ClipboardList, ArrowRight, FileText, Filter, Download, Printer, Sheet, FileJson, Search, Settings2, RefreshCcw, ArrowDownCircle, ArrowUpCircle, MessageCircle, Layers, Camera, Loader2 } from 'lucide-react';
import { StockItem, StockUsageLog, PriceHistoryItem, Provider } from '../types';
import Tesseract from 'tesseract.js';
import { supabase } from '../services/supabase';

interface InventoryProps {
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    providers: Provider[];
}

export const Inventory: React.FC<InventoryProps> = ({ stock, setStock, providers }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [modalType, setModalType] = useState<'ENTRY' | 'EXIT' | 'HISTORY' | 'EDIT_PRICE' | 'NEW_PRODUCT' | 'EDIT_PRODUCT' | 'INVENTORY' | 'REPORT' | 'CHOICE' | null>(null);
    const [showReportExportMenu, setShowReportExportMenu] = useState(false);

    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [physicalCount, setPhysicalCount] = useState('');
    const [inventoryJustification, setInventoryJustification] = useState('');
    const [entryCost, setEntryCost] = useState('');
    const [exitProviderId, setExitProviderId] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [priceNote, setPriceNote] = useState('');
    const [historyTab, setHistoryTab] = useState<'PRICE' | 'USAGE'>('USAGE');
    const [reportFilter, setReportFilter] = useState<'ALL' | 'EXIT' | 'ENTRY' | 'CORRECTION'>('ALL');
    const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
    const [isAddingNewSubGroup, setIsAddingNewSubGroup] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [providerSearch, setProviderSearch] = useState('');

    // Form state for products
    const [productFormData, setProductFormData] = useState({
        code: '',
        name: '',
        category: 'Uso Interno' as 'Uso Interno' | 'Venda',
        group: '',
        subGroup: '',
        minQuantity: 5,
        unit: 'unidade',
        costPrice: 0,
        price: 0
    });

    const totalStockValue = stock.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);
    const getSelectedItem = () => stock.find(i => i.id === selectedItemId);
    const getProviderName = (id?: string) => providers.find(p => p.id === id)?.name || 'N/A';

    const uniqueGroups = useMemo(() => {
        const groups = new Set<string>();
        stock.forEach(item => { if (item.group) groups.add(item.group); });
        return Array.from(groups).sort();
    }, [stock]);

    const uniqueSubGroups = useMemo(() => {
        const subGroups = new Set<string>();
        stock.forEach(item => { if (item.subGroup) subGroups.add(item.subGroup); });
        return Array.from(subGroups).sort();
    }, [stock]);

    const filteredStockOptions = useMemo(() => {
        if (!productSearch) return stock.slice(0, 100);
        const search = productSearch.toLowerCase();
        return stock.filter(item =>
            item.name.toLowerCase().includes(search) ||
            item.code.toLowerCase().includes(search)
        );
    }, [stock, productSearch]);

    const filteredProviderOptions = useMemo(() => {
        const activeProviders = providers.filter(p => p.active);
        if (!providerSearch) return activeProviders;
        const search = providerSearch.toLowerCase();
        return activeProviders.filter(p =>
            p.name.toLowerCase().includes(search)
        );
    }, [providers, providerSearch]);

    const filteredStock = useMemo(() => {
        return stock.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.group && item.group.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [stock, searchTerm]);

    const getAllMovements = useMemo(() => {
        const movements: (StockUsageLog & { productName: string; productCode: string })[] = [];
        stock.forEach(item => {
            if (item.usageHistory) {
                item.usageHistory.forEach(log => {
                    movements.push({ ...log, productName: item.name, productCode: item.code });
                });
            }
        });
        return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [stock]);

    const filteredMovements = useMemo(() => {
        return getAllMovements.filter(m => {
            if (reportFilter === 'ALL') return true;
            if (reportFilter === 'EXIT') return ['VENDA', 'USO_INTERNO', 'PERDA'].includes(m.type);
            if (reportFilter === 'ENTRY') return ['AJUSTE_ENTRADA'].includes(m.type);
            if (reportFilter === 'CORRECTION') return ['CORRECAO'].includes(m.type);
            return true;
        });
    }, [getAllMovements, reportFilter]);


    const handlePrintReport = () => {
        setShowReportExportMenu(false);
        const printContent = `
      <html>
        <head>
          <title>Relatório de Estoque - Aminna</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 0; }
            .header p { font-size: 12px; margin: 5px 0 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background-color: #f8f9fa; text-transform: uppercase; font-weight: 900; text-align: left; padding: 10px; border-bottom: 2px solid #000; }
            td { border-bottom: 1px solid #eee; padding: 10px; vertical-align: top; }
            .type-badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase; display: inline-block; }
            .positive { color: #059669; }
            .negative { color: #dc2626; }
            .summary { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Aminna Home Nail Gel</h1>
              <p>Relatório de Movimentações & Conciliação de Estoque</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <p><strong>Filtro:</strong> ${reportFilter === 'ALL' ? 'Geral' : reportFilter === 'ENTRY' ? 'Entradas' : reportFilter === 'CORRECTION' ? 'Ajustes/Inventário' : 'Saídas'}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Data</th>
                <th style="width: 25%">Produto</th>
                <th style="width: 15%">Tipo</th>
                <th style="width: 10%; text-align: center">Qtd</th>
                <th style="width: 35%">Detalhes / Justificativa</th>
              </tr>
            </thead>
            <tbody>
              ${filteredMovements.map(m => `
                <tr>
                  <td>${new Date(m.date).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <strong>${m.productName}</strong><br/>
                    <span style="color: #666; font-size: 9px;">${m.productCode}</span>
                  </td>
                  <td><span class="type-badge">${m.type.replace('_', ' ')}</span></td>
                  <td style="text-align: center;" class="${m.type === 'AJUSTE_ENTRADA' ? 'positive' : m.type === 'CORRECAO' ? 'text-amber-600' : 'negative'}">
                    ${m.type === 'AJUSTE_ENTRADA' ? '+' : ''}${m.quantity}
                  </td>
                  <td>
                    ${m.providerId ? `<strong>Profissional:</strong> ${getProviderName(m.providerId)}` : ''}
                    ${m.note ? `<div style="margin-top:2px; font-style:italic;">${m.note}</div>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            Total de Registros: ${filteredMovements.length}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(printContent); win.document.close(); }
    };

    const handleOCRField = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setOcrError(null);

        try {
            const { data: { text } } = await Tesseract.recognize(file, 'por+eng');

            // Clean and normalize text
            const normalizedText = text.toLowerCase()
                .replace(/[#*_\-\/]/g, ' ') // Remove special chars commonly misread or ignored
                .replace(/\s+/g, ' ')       // Normalize spaces
                .trim();

            console.log("Original OCR Texto:", text);
            console.log("Texto Normalizado:", normalizedText);

            // Fuzzy matching logic
            const matchedItem = stock.find(item => {
                const name = item.name.toLowerCase();
                const code = item.code.toLowerCase();

                // Direct match on code (priority)
                if (normalizedText.includes(code)) return true;

                // Direct match on full name
                if (normalizedText.includes(name)) return true;

                // Word match (for products like "Helen Color")
                const nameWords = name.split(' ').filter(word => word.length > 2);
                if (nameWords.length > 0 && nameWords.every(word => normalizedText.includes(word))) return true;

                return false;
            });

            if (matchedItem) {
                console.log("Produto Identificado:", matchedItem.name);
                setSelectedItemId(matchedItem.id);
                const item = stock.find(i => i.id === matchedItem.id);
                if (item) setEntryCost(item.costPrice.toString());
            } else {
                setOcrError("Produto não identificado. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro no OCR:", error);
            setOcrError("Erro ao ler imagem.");
        } finally {
            setIsScanning(false);
            // Reset input so same file can be selected again
            if (e.target) e.target.value = '';
        }
    };

    const handleWhatsAppReport = () => {
        setShowReportExportMenu(false);
        let message = `📦 * RELATÓRIO DE ESTOQUE - AMINNA *\n`;
        message += `📅 Data: ${new Date().toLocaleDateString('pt-BR')} \n`;
        message += `🔍 Filtro: ${reportFilter === 'ALL' ? 'Geral' : reportFilter === 'ENTRY' ? 'Entradas' : reportFilter === 'CORRECTION' ? 'Ajustes' : 'Saídas'} \n\n`;

        filteredMovements.slice(0, 30).forEach(m => {
            const icon = m.type === 'AJUSTE_ENTRADA' ? '🟢' : m.type === 'CORRECAO' ? '⚠️' : '🔴';
            message += `${icon} * ${m.productName}* (${new Date(m.date).toLocaleDateString('pt-BR')}) \n`;
            message += `   Qtd: ${m.quantity} (${m.type.replace('_', ' ')}) \n`;
            message += `   Obs: ${m.providerId ? getProviderName(m.providerId) : m.note || 'Sem justificativa'} \n\n`;
        });

        if (filteredMovements.length > 30) message += `... e mais ${filteredMovements.length - 30} registros.`;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId) return;

        try {
            if (modalType === 'INVENTORY') {
                const physicalQty = parseInt(physicalCount);
                const currentItem = stock.find(i => i.id === selectedItemId);
                if (!currentItem || isNaN(physicalQty) || physicalQty < 0) return;
                const diff = physicalQty - currentItem.quantity;
                if (diff !== 0 && !inventoryJustification.trim()) {
                    alert("⚠️ Atenção: Como há divergência no estoque, é OBRIGATÓRIO informar a justificativa no relatório.");
                    return;
                }

                // 1. Update stock_items quantity
                const { error: updateError } = await supabase.from('stock_items').update({ quantity: physicalQty }).eq('id', selectedItemId);
                if (updateError) throw updateError;

                // 2. Insert usage_log if there's a difference
                if (diff !== 0) {
                    const { error: logError } = await supabase.from('usage_logs').insert([{
                        stock_item_id: selectedItemId,
                        quantity: Math.abs(diff),
                        type: 'CORRECAO',
                        note: `Inventário: Sist(${currentItem.quantity}) vs Real(${physicalQty}) | Motivo: ${inventoryJustification}`,
                        date: new Date().toISOString()
                    }]);
                    if (logError) throw logError;
                }

                setStock(prev => prev.map(item => item.id === selectedItemId ? { ...item, quantity: physicalQty } : item));
                closeModal();
                return;
            }

            if (!quantity) return;
            if (modalType === 'EXIT' && !exitProviderId) {
                alert("É obrigatório informar a profissional responsável pela retirada.");
                return;
            }
            const qtyNum = parseInt(quantity);
            if (isNaN(qtyNum) || qtyNum <= 0) return;

            const currentItem = stock.find(i => i.id === selectedItemId);
            if (!currentItem) return;

            const newQty = modalType === 'ENTRY' ? currentItem.quantity + qtyNum : Math.max(0, currentItem.quantity - qtyNum);

            // 1. Update stock_items quantity and possibly cost price
            const updateData: any = { quantity: newQty };
            if (modalType === 'ENTRY' && entryCost) {
                updateData.cost_price = parseFloat(entryCost);
            }
            const { error: updateError } = await supabase.from('stock_items').update(updateData).eq('id', selectedItemId);
            if (updateError) throw updateError;

            // 2. Insert usage_log
            const { error: logError } = await supabase.from('usage_logs').insert([{
                stock_item_id: selectedItemId,
                quantity: qtyNum,
                type: modalType === 'ENTRY' ? 'AJUSTE_ENTRADA' : 'USO_INTERNO',
                provider_id: modalType === 'EXIT' ? exitProviderId : undefined,
                note: modalType === 'EXIT' ? 'Baixa Manual' : `Reposição - Custo: R$ ${entryCost}`,
                date: new Date().toISOString()
            }]);
            if (logError) throw logError;

            setStock(prev => prev.map(item => {
                if (item.id === selectedItemId) {
                    let updatedItem = { ...item, quantity: newQty };
                    if (modalType === 'ENTRY' && entryCost) {
                        updatedItem.costPrice = parseFloat(entryCost);
                    }
                    return updatedItem;
                }
                return item;
            }));
            closeModal();
        } catch (error) {
            console.error("Erro na transação de estoque:", error);
            alert("Erro ao salvar movimentação no banco de dados.");
        }
    };

    const handleUpdatePrice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId || !newPrice) return;
        const priceNum = parseFloat(newPrice);
        if (isNaN(priceNum)) return;

        try {
            const { error } = await supabase.from('stock_items').update({ sale_price: priceNum }).eq('id', selectedItemId);
            if (error) throw error;

            setStock(prev => prev.map(item => {
                if (item.id === selectedItemId) {
                    const hist: PriceHistoryItem = {
                        date: new Date().toISOString().split('T')[0],
                        price: item.price || 0,
                        note: priceNote || 'Alteração manual de preço'
                    };
                    return {
                        ...item,
                        price: priceNum,
                        priceHistory: [...(item.priceHistory || []), hist]
                    };
                }
                return item;
            }));
            closeModal();
        } catch (error) {
            console.error("Erro ao atualizar preço:", error);
            alert("Erro ao salvar novo preço no banco de dados.");
        }
    };

    const handleCreateOrUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const productData = {
                code: productFormData.code,
                name: productFormData.name,
                category: productFormData.category,
                group: productFormData.group,
                sub_group: productFormData.subGroup,
                min_quantity: productFormData.minQuantity,
                unit: productFormData.unit,
                cost_price: productFormData.costPrice,
                sale_price: productFormData.price,
                active: true
            };

            if (modalType === 'EDIT_PRODUCT' && selectedItemId) {
                const { error } = await supabase.from('stock_items').update(productData).eq('id', selectedItemId);
                if (error) throw error;
                setStock(prev => prev.map(item => item.id === selectedItemId ? { ...item, ...productFormData } : item));
            } else {
                const { data, error } = await supabase.from('stock_items').insert([{
                    ...productData,
                    quantity: 0
                }]).select();

                if (error) throw error;
                if (data && data[0]) {
                    const newItem: StockItem = {
                        ...productFormData,
                        id: data[0].id,
                        quantity: 0,
                        usageHistory: [],
                        priceHistory: [],
                    };
                    setStock([...stock, newItem]);
                }
            }
            closeModal();
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert("Erro ao salvar produto no banco de dados.");
        }
    };

    const closeModal = () => {
        setModalType(null); setSelectedItemId(''); setQuantity(''); setPhysicalCount(''); setInventoryJustification(''); setNewPrice(''); setPriceNote(''); setEntryCost(''); setExitProviderId(''); setShowReportExportMenu(false);
        setIsAddingNewGroup(false); setIsAddingNewSubGroup(false); setProductSearch(''); setProviderSearch('');
    };

    const openHistory = (id: string) => { setSelectedItemId(id); setModalType('HISTORY'); setHistoryTab('USAGE'); };
    const openEditPrice = (id: string, currentPrice: number) => { setSelectedItemId(id); setNewPrice(currentPrice.toString()); setPriceNote(''); setModalType('EDIT_PRICE'); };

    const openEditProduct = (item: StockItem) => {
        setSelectedItemId(item.id);
        setProductFormData({
            code: item.code,
            name: item.name,
            category: item.category,
            group: item.group || '',
            subGroup: item.subGroup || '',
            minQuantity: item.minQuantity,
            unit: item.unit,
            costPrice: item.costPrice,
            price: item.price || 0
        });
        setIsAddingNewGroup(false);
        setIsAddingNewSubGroup(false);
        setModalType('EDIT_PRODUCT');
    };

    const openNewProduct = () => {
        setProductFormData({
            code: '',
            name: '',
            category: 'Uso Interno',
            group: '',
            subGroup: '',
            minQuantity: 5,
            unit: 'unidade',
            costPrice: 0,
            price: 0
        });
        setIsAddingNewGroup(false);
        setIsAddingNewSubGroup(false);
        setModalType('NEW_PRODUCT');
    };

    return (
        <div className="space-y-4 md:space-y-6 relative pb-24 md:pb-0 text-slate-900 dark:text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight">Estoque</h2>
                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão de materiais e revenda</p>
                </div>
                <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                    <button onClick={() => { setModalType('REPORT'); setReportFilter('ALL'); }} className="flex-1 md:flex-none px-3 py-2 bg-slate-800 dark:bg-zinc-800 text-white dark:text-white rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all border border-transparent dark:border-zinc-700"><FileText size={14} /> Relatórios</button>
                    <button onClick={() => setModalType('CHOICE')} className="flex-1 md:flex-none px-3 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"><Tag size={14} /> Novo</button>
                </div>
            </div>

            {/* Action Quick Bar - Mobile Only */}
            <div className="md:hidden flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                <button onClick={() => { setModalType('INVENTORY'); setSelectedItemId(''); }} className="whitespace-nowrap px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><ClipboardList size={14} /> Inventário</button>
                <button onClick={() => { setModalType('ENTRY'); setSelectedItemId(''); }} className="whitespace-nowrap px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Plus size={14} /> Entrada</button>
                <button onClick={() => { setModalType('EXIT'); setSelectedItemId(''); }} className="whitespace-nowrap px-4 py-2.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Minus size={14} /> Saída</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 rounded-xl"><Package size={20} className="md:w-6 md:h-6" /></div>
                    <div><p className="text-[8px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase">Itens</p><p className="text-sm md:text-2xl font-black text-slate-950 dark:text-white">{stock.length}</p></div>
                </div>
                <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-400 rounded-xl"><AlertTriangle size={20} className="md:w-6 md:h-6" /></div>
                    <div><p className="text-[8px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tight">Crítico</p><p className="text-sm md:text-2xl font-black text-amber-600 dark:text-amber-400">{stock.filter(i => i.quantity <= i.minQuantity).length}</p></div>
                </div>
                <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-400 rounded-xl"><DollarSign size={20} className="md:w-6 md:h-6" /></div>
                    <div><p className="text-[8px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase">Custo</p><p className="text-sm md:text-2xl font-black text-purple-900 dark:text-purple-400">R${(totalStockValue / 1000).toFixed(1)}k</p></div>
                </div>
                <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-400 rounded-xl"><ShoppingBag size={20} className="md:w-6 md:h-6" /></div>
                    <div><p className="text-[8px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase">Venda</p><p className="text-sm md:text-2xl font-black text-emerald-900 dark:text-emerald-400">{stock.filter(i => i.category === 'Venda').length}</p></div>
                </div>
            </div>

            {/* Search Input */}
            <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-400" />
                <input
                    type="text"
                    placeholder="Pesquisar por nome ou código..."
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-xs md:text-sm font-black text-slate-950 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all shadow-sm placeholder-slate-500 dark:placeholder-slate-400"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-950 dark:text-white">Inventário Detalhado</h3>
                    <div className="flex gap-2">
                        <button onClick={() => { setModalType('INVENTORY'); setSelectedItemId(''); }} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5 shadow-sm"><ClipboardList size={14} /> Inventário</button>
                        <button onClick={() => { setModalType('ENTRY'); setSelectedItemId(''); }} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all flex items-center gap-1.5 shadow-sm"><Plus size={14} /> Entrada</button>
                        <button onClick={() => { setModalType('EXIT'); setSelectedItemId(''); }} className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white rounded-lg text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all flex items-center gap-1.5 shadow-sm"><Minus size={14} /> Saída</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-800 dark:text-slate-300 font-black uppercase bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Produto</th>
                                <th className="px-6 py-3">Classificação</th>
                                <th className="px-6 py-3 text-center">Quantidade</th>
                                <th className="px-6 py-3 text-right">Último Custo</th>
                                <th className="px-6 py-3 text-right">Preço Venda</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-700">
                            {filteredStock.map(item => {
                                const isLow = item.quantity <= item.minQuantity;
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-6 py-4 text-xs font-black text-slate-950 dark:text-white">{item.code || '-'}</td>
                                        <td className="px-6 py-4 font-black text-slate-950 dark:text-white">
                                            {item.name}
                                            <div className="md:hidden mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-300">
                                            {/* Display combined classification */}
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">{item.group || '-'}</span>
                                                {item.subGroup && <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{item.subGroup}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-black ${isLow ? 'text-rose-700 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>{item.quantity} {item.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-slate-950 dark:text-white">R$ {item.costPrice.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-slate-950 dark:text-white">R$ {(item.price || 0).toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button onClick={() => openEditProduct(item)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Editar Informações"><Settings2 size={16} /></button>
                                                <button onClick={() => openEditPrice(item.id, item.price || 0)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Alterar Preço"><Edit2 size={16} /></button>
                                                <button onClick={() => openHistory(item.id)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Ver Histórico"><History size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-3">
                {filteredStock.map(item => {
                    const isLow = item.quantity <= item.minQuantity;
                    return (
                        <div key={item.id} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">{item.code || 'S/ COD'}</p>
                                    <h4 className="text-sm font-black text-slate-950 dark:text-white leading-tight truncate">{item.name}</h4>

                                    {/* Display Classification on Mobile */}
                                    {(item.group || item.subGroup) && (
                                        <p className="text-[10px] text-indigo-800 dark:text-indigo-400 font-black uppercase mt-1 flex items-center gap-1">
                                            <Layers size={10} /> {item.group || '-'} {item.subGroup ? `/ ${item.subGroup}` : ''}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${item.category === 'Venda' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-300 border-slate-300 dark:border-zinc-700'}`}>{item.category}</span>
                                        {isLow && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Estoque Baixo</span>}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <p className={`text-xl font-black ${isLow ? 'text-rose-700 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>{item.quantity}<span className="text-[10px] text-slate-950 dark:text-slate-400 font-bold ml-1 uppercase">{item.unit}</span></p>
                                    <p className="text-[10px] font-black text-slate-950 dark:text-white mt-1">R$ {(item.price || 0).toFixed(2)}/un</p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-3">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                                    <span>Custo Unitário:</span>
                                    <span className="text-slate-950 dark:text-white">R$ {item.costPrice.toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        <button onClick={() => openEditProduct(item)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-zinc-700 flex-1 items-center justify-center gap-1.5 shadow-sm active:bg-slate-200 dark:active:bg-zinc-700"><Settings2 size={16} /><span className="text-[9px] font-black uppercase">Editar</span></button>
                                        <button onClick={() => openHistory(item.id)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-zinc-700 flex-1 items-center justify-center gap-1.5 shadow-sm active:bg-slate-100 dark:active:bg-zinc-700"><History size={16} /><span className="text-[9px] font-black uppercase">Histórico</span></button>
                                        <button onClick={() => openEditPrice(item.id, item.price || 0)} className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-white rounded-2xl border border-indigo-200 dark:border-indigo-800 flex-1 items-center justify-center gap-1.5 shadow-sm active:bg-indigo-100 dark:active:bg-indigo-900/30"><Edit2 size={16} /><span className="text-[9px] font-black uppercase">Preço</span></button>
                                    </div>
                                    <div className="flex gap-1 justify-end items-end pt-2">
                                        <button onClick={() => { setSelectedItemId(item.id); setModalType('ENTRY'); setEntryCost(item.costPrice.toString()); }} className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all flex-1 flex justify-center"><Plus size={18} /></button>
                                        <button onClick={() => { setSelectedItemId(item.id); setModalType('EXIT'); }} className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all flex-1 flex justify-center"><Minus size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODALS SECTION */}

            {/* CHOICE MODAL */}
            {modalType === 'CHOICE' && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border-2 border-black dark:border-zinc-700">
                        <div className="px-6 py-4 border-b border-black dark:border-zinc-700 flex justify-between items-center bg-zinc-950 dark:bg-black text-white">
                            <h3 className="font-black text-base uppercase tracking-widest">Nova Ação</h3>
                            <button onClick={closeModal} className="text-white hover:text-slate-300"><X size={24} /></button>
                        </div>
                        <div className="p-6 grid grid-cols-1 gap-4">
                            <button onClick={openNewProduct} className="flex flex-col items-center gap-3 p-6 border-2 border-slate-200 dark:border-zinc-700 rounded-3xl hover:border-black dark:hover:border-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all group">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={24} /></div>
                                <div className="text-center">
                                    <p className="font-black text-slate-950 dark:text-white uppercase text-sm">Cadastrar Novo Produto</p>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">Item novo no sistema</p>
                                </div>
                            </button>
                            <button onClick={() => { setModalType('ENTRY'); setSelectedItemId(''); }} className="flex flex-col items-center gap-3 p-6 border-2 border-slate-200 dark:border-zinc-700 rounded-3xl hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><RefreshCcw size={24} /></div>
                                <div className="text-center">
                                    <p className="font-black text-slate-950 dark:text-white uppercase text-sm">Reposição de Estoque</p>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">Entrada em item já cadastrado</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW/EDIT PRODUCT MODAL */}
            {(modalType === 'NEW_PRODUCT' || modalType === 'EDIT_PRODUCT') && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col max-h-[90vh] border-2 border-black dark:border-zinc-700">
                        <div className="px-5 py-4 border-b border-black dark:border-zinc-700 flex justify-between items-center bg-zinc-950 dark:bg-black text-white flex-shrink-0">
                            <h3 className="font-black text-base md:text-lg uppercase tracking-widest">{modalType === 'EDIT_PRODUCT' ? 'Editar Informações' : 'Cadastrar Produto'}</h3>
                            <button onClick={closeModal} className="text-white hover:text-zinc-300 p-1"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateOrUpdateProduct} className="p-5 md:p-6 space-y-4 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900">
                            <div>
                                <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Código de Barras / Ref</label>
                                <input type="text" required className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-3 text-xs md:text-sm font-black uppercase focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none text-slate-950 dark:text-white placeholder:text-slate-400" placeholder="Ex: ESM-001" value={productFormData.code} onChange={e => setProductFormData({ ...productFormData, code: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Nome do Produto</label>
                                <input type="text" required className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-3 text-xs md:text-sm font-black focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none text-slate-950 dark:text-white placeholder:text-slate-400" placeholder="Ex: Esmalte Risqué Vermelho" value={productFormData.name} onChange={e => setProductFormData({ ...productFormData, name: e.target.value })} />
                            </div>

                            {/* DYNAMIC FIELDS: GROUP & SUBGROUP */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Grupo (Categoria)</label>
                                    {!isAddingNewGroup ? (
                                        <select
                                            className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-3 text-xs md:text-sm font-black outline-none text-slate-950 dark:text-white"
                                            value={productFormData.group}
                                            onChange={e => {
                                                if (e.target.value === 'ADD_NEW') {
                                                    setIsAddingNewGroup(true);
                                                    setProductFormData({ ...productFormData, group: '' });
                                                } else {
                                                    setProductFormData({ ...productFormData, group: e.target.value });
                                                }
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                            <option value="ADD_NEW" className="text-indigo-600 font-bold">+ Novo Grupo...</option>
                                        </select>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                autoFocus
                                                required
                                                className="w-full bg-white dark:bg-zinc-800 border-2 border-indigo-600 rounded-2xl p-3 text-xs md:text-sm font-black outline-none text-slate-950 dark:text-white"
                                                placeholder="Nome do novo grupo"
                                                value={productFormData.group}
                                                onChange={e => setProductFormData({ ...productFormData, group: e.target.value })}
                                            />
                                            <button type="button" onClick={() => setIsAddingNewGroup(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={16} /></button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Subgrupo</label>
                                    {!isAddingNewSubGroup ? (
                                        <select
                                            className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-3 text-xs md:text-sm font-black outline-none text-slate-950 dark:text-white"
                                            value={productFormData.subGroup}
                                            onChange={e => {
                                                if (e.target.value === 'ADD_NEW') {
                                                    setIsAddingNewSubGroup(true);
                                                    setProductFormData({ ...productFormData, subGroup: '' });
                                                } else {
                                                    setProductFormData({ ...productFormData, subGroup: e.target.value });
                                                }
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            {uniqueSubGroups.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                                            <option value="ADD_NEW" className="text-indigo-600 font-bold">+ Novo Subgrupo...</option>
                                        </select>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                autoFocus
                                                required
                                                className="w-full bg-white dark:bg-zinc-800 border-2 border-indigo-600 rounded-2xl p-3 text-xs md:text-sm font-black outline-none text-slate-950 dark:text-white"
                                                placeholder="Nome do novo subgrupo"
                                                value={productFormData.subGroup}
                                                onChange={e => setProductFormData({ ...productFormData, subGroup: e.target.value })}
                                            />
                                            <button type="button" onClick={() => setIsAddingNewSubGroup(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={16} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Unid. Medida</label>
                                    <input type="text" className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-3 text-xs md:text-sm font-black outline-none text-slate-950 dark:text-white placeholder:text-slate-400" placeholder="Ex: frasco, ml, un" value={productFormData.unit} onChange={e => setProductFormData({ ...productFormData, unit: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Estoque Mínimo</label>
                                    <input type="number" className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-3 text-xs md:text-sm font-black outline-none text-slate-950 dark:text-white" value={productFormData.minQuantity} onChange={e => setProductFormData({ ...productFormData, minQuantity: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-3xl">
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Custo Pago (R$)</label>
                                    <input type="number" step="0.01" required className="w-full bg-white dark:bg-zinc-900 border-2 border-emerald-600 dark:border-emerald-800 rounded-2xl p-3 text-sm md:text-base font-black outline-none text-slate-950 dark:text-white" value={productFormData.costPrice} onChange={e => setProductFormData({ ...productFormData, costPrice: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Preço Venda (R$)</label>
                                    <input type="number" step="0.01" required className="w-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 dark:border-indigo-800 rounded-2xl p-3 text-sm md:text-base font-black outline-none text-slate-950 dark:text-white" value={productFormData.price} onChange={e => setProductFormData({ ...productFormData, price: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-4 text-slate-950 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-3xl transition-colors">Cancelar</button>
                                <button type="submit" className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Salvar Dados</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ... (Keep INVENTORY, REPORT, TRANSACTION, EDIT_PRICE, HISTORY modals as they are) ... */}

            {/* INVENTORY (CONTRE FISICA) MODAL */}
            {modalType === 'INVENTORY' && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col max-h-[95vh] border-2 border-black dark:border-zinc-700">
                        <div className="px-5 py-4 border-b border-black dark:border-zinc-700 flex justify-between items-center bg-indigo-600 text-white flex-shrink-0">
                            <h3 className="font-black text-base uppercase tracking-tight">Inventário (Contagem Física)</h3>
                            <button onClick={closeModal} className="text-white hover:text-zinc-200 p-1"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleTransaction} className="p-5 space-y-4 bg-white dark:bg-zinc-900">
                            {!selectedItemId ? (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Produto para conferir</label>
                                    <select required className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-xl md:rounded-2xl p-3 text-sm font-black outline-none text-slate-950 dark:text-white" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
                                        <option value="">Selecione o produto...</option>
                                        {stock.map(item => <option key={item.id} value={item.id} className="text-slate-950 dark:text-white font-bold">{item.name} (Sistema: {item.quantity})</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border-2 border-black dark:border-zinc-700 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">Produto Selecionado</p>
                                        <p className="text-sm font-black text-slate-950 dark:text-white truncate">{getSelectedItem()?.name}</p>
                                        <p className="text-[10px] text-slate-800 dark:text-slate-300 font-bold">Saldo atual: {getSelectedItem()?.quantity} {getSelectedItem()?.unit}</p>
                                    </div>
                                    <button type="button" onClick={() => setSelectedItemId('')} className="text-[9px] font-black text-slate-950 dark:text-white uppercase bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg ml-2 border border-black dark:border-zinc-700 shadow-sm">Trocar</button>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Contagem Real (Prateleira)</label>
                                <input type="number" min="0" required className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-xl p-3 text-2xl font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" value={physicalCount} onChange={e => setPhysicalCount(e.target.value)} />
                            </div>

                            {selectedItemId && physicalCount && parseInt(physicalCount) !== getSelectedItem()?.quantity && (
                                <div className="animate-in fade-in slide-in-from-top-1">
                                    <label className="block text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><AlertTriangle size={12} /> Justificativa da Divergência</label>
                                    <textarea required className="w-full border-2 border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-900/10 rounded-xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-rose-500" rows={2} placeholder="Ex: Quebra de frasco, erro de lançamento, produto vencido..." value={inventoryJustification} onChange={e => setInventoryJustification(e.target.value)} />
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-4 text-slate-950 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">Cancelar</button>
                                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Sincronizar Estoque</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REPORT MODAL */}
            {modalType === 'REPORT' && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col h-[90vh] md:h-[80vh] border-2 border-black dark:border-zinc-700">
                        <div className="px-6 py-4 border-b border-black dark:border-zinc-700 flex justify-between items-center bg-slate-900 dark:bg-black text-white flex-shrink-0">
                            <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2"><FileText size={20} /> Relatório de Movimentações</h3>
                            <button onClick={closeModal} className="text-white hover:text-slate-300"><X size={24} /></button>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-zinc-800 border-b border-black dark:border-zinc-700 flex flex-col md:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Filtrar Tipo</label>
                                <div className="flex p-1 bg-slate-200 dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-zinc-700">
                                    {['ALL', 'ENTRY', 'EXIT', 'CORRECTION'].map(f => (
                                        <button key={f} onClick={() => setReportFilter(f as any)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${reportFilter === f ? 'bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>{f === 'ALL' ? 'Tudo' : f === 'ENTRY' ? 'Entradas' : f === 'CORRECTION' ? 'Ajustes' : 'Saídas'}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative self-end">
                                <button
                                    onClick={() => setShowReportExportMenu(!showReportExportMenu)}
                                    className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all text-slate-950 dark:text-white"
                                >
                                    <Download size={14} /> Exportar
                                </button>
                                {showReportExportMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border-2 border-slate-200 dark:border-zinc-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                        <button onClick={handlePrintReport} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-slate-50 dark:hover:bg-zinc-700 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-700 text-slate-950 dark:text-white">
                                            <Printer size={14} /> Imprimir / PDF
                                        </button>
                                        <button onClick={handleWhatsAppReport} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                                            <MessageCircle size={14} /> WhatsApp
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-white border-b border-black dark:border-zinc-700 sticky top-0 font-black uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Data</th>
                                        <th className="px-4 py-3">Produto</th>
                                        <th className="px-4 py-3 text-center">Qtd</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                                    {filteredMovements.length > 0 ? filteredMovements.map((move, idx) => {
                                        const isEntry = move.type === 'AJUSTE_ENTRADA';
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                                                <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(move.date).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-4 py-3"><p className="font-black text-slate-950 dark:text-white leading-tight">{move.productName}</p><p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">{move.productCode}</p></td>
                                                <td className="px-4 py-3 text-center"><span className={`font-black ${isEntry ? 'text-emerald-700 dark:text-emerald-400' : move.type === 'CORRECAO' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'}`}>{isEntry ? '+' : ''}{move.quantity}</span></td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${isEntry ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400' : move.type === 'VENDA' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' : move.type === 'CORRECAO' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-300'}`}>
                                                        {move.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-300 max-w-[200px] truncate">{move.providerId ? `Prof: ${getProviderName(move.providerId)}` : move.note || '-'}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center text-slate-300 dark:text-zinc-700">
                                                    <Search size={40} className="mb-2 opacity-20" />
                                                    <p className="font-black uppercase text-[10px] text-slate-400 dark:text-slate-600">Nenhuma movimentação encontrada</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-slate-900 dark:bg-black border-t border-black dark:border-zinc-700 text-white flex justify-between items-center flex-shrink-0">
                            <p className="text-[10px] font-black uppercase opacity-60">Total registros: {filteredMovements.length}</p>
                            <button onClick={closeModal} className="px-6 py-2 bg-white dark:bg-zinc-800 text-slate-950 dark:text-white rounded-lg text-[10px] font-black uppercase border-2 border-black dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSACTION MODAL (ENTRY & EXIT) */}
            {(modalType === 'ENTRY' || modalType === 'EXIT') && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col max-h-[95vh] border-2 border-black dark:border-zinc-700">
                        <div className={`px-4 py-3 md:px-5 md:py-4 border-b border-white/10 flex justify-between items-center ${modalType === 'ENTRY' ? 'bg-emerald-600' : 'bg-rose-600'} text-white flex-shrink-0`}>
                            <h3 className="font-black text-sm md:text-base uppercase tracking-tight">{modalType === 'ENTRY' ? 'Entrada/Reposição' : 'Baixa (Saída)'}</h3>
                            <button onClick={closeModal} className="text-white hover:text-zinc-200 p-1 transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
                        </div>
                        <form onSubmit={handleTransaction} className="p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto flex-1 scrollbar-hide bg-white dark:bg-zinc-900">
                            {!selectedItemId ? (
                                <>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest">Selecionar Produto</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="ocr-scanner"
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleOCRField}
                                                disabled={isScanning}
                                            />
                                            <label
                                                htmlFor="ocr-scanner"
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer shadow-sm border ${isScanning ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-600 text-white border-indigo-700 active:scale-95'}`}
                                            >
                                                {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                                                {isScanning ? 'Lendo...' : 'Escanear'}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Digite nome ou código..."
                                            className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-xl md:rounded-2xl p-2.5 md:p-3 text-[12px] md:text-sm font-black outline-none text-slate-950 dark:text-white placeholder:text-slate-400"
                                            value={productSearch}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setProductSearch(val);

                                                // AUTO-SELECT ON EXACT MATCH (Barcode Scanner support)
                                                const exactMatch = stock.find(i => i.code?.toUpperCase() === val.toUpperCase());
                                                if (exactMatch) {
                                                    setSelectedItemId(exactMatch.id);
                                                    setProductSearch('');
                                                    setEntryCost(exactMatch.costPrice.toString());
                                                }
                                            }}
                                        />
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />

                                        {productSearch && (
                                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                                {filteredStockOptions.length > 0 ? filteredStockOptions.map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800 last:border-none flex justify-between items-center group/item"
                                                        onClick={() => {
                                                            setSelectedItemId(item.id);
                                                            setProductSearch('');
                                                            setEntryCost(item.costPrice.toString());
                                                        }}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-black text-[11px] text-slate-950 dark:text-white truncate uppercase">{item.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{item.code}</p>
                                                        </div>
                                                        <ArrowRight size={14} className="text-slate-300 group-hover/item:text-indigo-600 transition-colors" />
                                                    </button>
                                                )) : (
                                                    <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase">Nenhum produto encontrado</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {ocrError && <p className="mt-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-top-1">{ocrError}</p>}
                                </>
                            ) : (
                                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border-2 border-black dark:border-zinc-700 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">Produto Selecionado</p>
                                        <p className="text-[12px] font-black text-slate-950 dark:text-white truncate">{getSelectedItem()?.name}</p>
                                    </div>
                                    <button type="button" onClick={() => setSelectedItemId('')} className="text-[9px] font-black text-slate-950 dark:text-white uppercase bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg ml-2 border border-black dark:border-zinc-700 shadow-sm">Trocar</button>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Quantidade</label>
                                        <input type="number" min="1" required className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-xl md:rounded-2xl p-3 text-base font-black outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-slate-950 dark:text-white placeholder:text-slate-400" placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                    </div>
                                    {modalType === 'ENTRY' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Custo Pago Un.</label>
                                            <input type="number" step="0.01" required className="w-full bg-white dark:bg-zinc-800 border-2 border-emerald-600 dark:border-emerald-800 rounded-xl md:rounded-2xl p-3 text-base font-black outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-slate-950 dark:text-white" value={entryCost} onChange={e => setEntryCost(e.target.value)} />
                                        </div>
                                    )}
                                </div>

                                {modalType === 'EXIT' && (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Profissional Responsável</label>

                                        <div className="relative">
                                            {exitProviderId ? (
                                                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border-2 border-black dark:border-zinc-700 flex items-center justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[12px] font-black text-slate-950 dark:text-white truncate">{getProviderName(exitProviderId)}</p>
                                                    </div>
                                                    <button type="button" onClick={() => setExitProviderId('')} className="text-[9px] font-black text-slate-950 dark:text-white uppercase bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg ml-2 border border-black dark:border-zinc-700 shadow-sm">Trocar</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar profissional..."
                                                            className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-xl md:rounded-2xl p-3 text-sm font-black outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-slate-950 dark:text-white"
                                                            value={providerSearch}
                                                            onChange={e => setProviderSearch(e.target.value)}
                                                        />
                                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                                    </div>

                                                    {providerSearch && (
                                                        <div className="absolute z-30 w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                                            {filteredProviderOptions.length > 0 ? filteredProviderOptions.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800 last:border-none flex justify-between items-center group/item"
                                                                    onClick={() => {
                                                                        setExitProviderId(p.id);
                                                                        setProviderSearch('');
                                                                    }}
                                                                >
                                                                    <p className="font-black text-[11px] text-slate-950 dark:text-white truncate uppercase">{p.name}</p>
                                                                    <ArrowRight size={14} className="text-slate-300 group-hover/item:text-indigo-600 transition-colors" />
                                                                </button>
                                                            )) : (
                                                                <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase">Nenhum profissional encontrado</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="w-full md:flex-1 py-4 text-slate-950 dark:text-white font-black uppercase text-[11px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-3xl transition-colors">Cancelar</button>
                                <button type="submit" className={`w-full md:flex-[2] py-4 ${modalType === 'ENTRY' ? 'bg-emerald-600' : 'bg-rose-600'} text-white rounded-3xl font-black uppercase text-xs md:text-sm tracking-widest shadow-xl active:scale-95 transition-all`}>Confirmar {modalType === 'ENTRY' ? 'Entrada' : 'Baixa'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT PRICE MODAL */}
            {modalType === 'EDIT_PRICE' && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col border-2 border-black dark:border-zinc-700">
                        <div className="px-5 py-4 border-b border-black dark:border-zinc-700 flex justify-between items-center bg-indigo-600 text-white flex-shrink-0">
                            <h3 className="font-black text-base uppercase tracking-tight">Ajustar Preço de Venda</h3>
                            <button onClick={closeModal} className="text-white hover:text-zinc-200 p-1"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleUpdatePrice} className="p-5 md:p-6 space-y-4 bg-white dark:bg-zinc-900">
                            <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border-2 border-black dark:border-zinc-700">
                                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase mb-1">Produto</p>
                                <p className="text-sm font-black text-slate-950 dark:text-white">{getSelectedItem()?.name}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Novo Valor de Venda (R$)</label>
                                <input type="number" step="0.01" required autoFocus className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-4 text-2xl font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Motivo do Reajuste</label>
                                <textarea className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-2xl p-3 text-sm font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400" rows={2} placeholder="Ex: Atualização de mercado..." value={priceNote} onChange={e => setPriceNote(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-2 pb-2">
                                <button type="button" onClick={closeModal} className="flex-1 py-4 text-slate-950 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-3xl transition-colors">Voltar</button>
                                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Salvar Preço</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL (SINGLE ITEM) */}
            {modalType === 'HISTORY' && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col max-h-[85vh] border-2 border-black dark:border-zinc-700">
                        <div className="px-5 py-4 border-b border-black dark:border-zinc-700 flex justify-between items-center bg-zinc-950 dark:bg-black text-white">
                            <h3 className="font-black text-base uppercase tracking-widest">Histórico do Produto</h3>
                            <button onClick={closeModal} className="text-white hover:text-zinc-200 p-1"><X size={24} /></button>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-zinc-800 border-b border-black dark:border-zinc-700">
                            <h4 className="font-black text-slate-950 dark:text-white text-sm">{getSelectedItem()?.name}</h4>
                            <div className="flex p-1 bg-slate-200 dark:bg-zinc-900 rounded-xl mt-3 border border-black/10 dark:border-zinc-700">
                                <button onClick={() => setHistoryTab('USAGE')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${historyTab === 'USAGE' ? 'bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Movimentações</button>
                                <button onClick={() => setHistoryTab('PRICE')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${historyTab === 'PRICE' ? 'bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Preços</button>
                            </div>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-white dark:bg-zinc-900 scrollbar-hide">
                            {historyTab === 'USAGE' && (
                                <div className="space-y-2">
                                    {(getSelectedItem()?.usageHistory || []).slice().reverse().map((log, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-black/10 dark:border-zinc-700 flex justify-between items-center">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${log.type === 'AJUSTE_ENTRADA' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' : 'bg-slate-200 dark:bg-zinc-700 text-slate-950 dark:text-white'}`}>{log.type.replace('_', ' ')}</span>
                                                    <span className="text-[9px] text-slate-950 dark:text-white font-bold uppercase">{new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-950 dark:text-white truncate">{log.type === 'USO_INTERNO' && log.providerId ? `Por: ${getProviderName(log.providerId)}` : log.note || 'Lançamento Manual'}</p>
                                            </div>
                                            <p className={`text-sm font-black ${log.type === 'AJUSTE_ENTRADA' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{log.type === 'AJUSTE_ENTRADA' ? '+' : '-'}{log.quantity}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {historyTab === 'PRICE' && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 flex justify-between items-center shadow-sm">
                                        <div><p className="text-[10px] font-black text-slate-950 dark:text-white uppercase">Preço Atual</p><p className="text-xs text-slate-950 dark:text-white font-bold">Em vigor</p></div>
                                        <p className="text-lg font-black text-slate-950 dark:text-white">R$ {getSelectedItem()?.price?.toFixed(2)}</p>
                                    </div>
                                    {(getSelectedItem()?.priceHistory || []).slice().reverse().map((hist, idx) => (
                                        <div key={idx} className="p-3 bg-white dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 rounded-2xl flex justify-between items-center">
                                            <div><p className="text-xs font-black text-slate-950 dark:text-white">R$ {hist.price.toFixed(2)}</p><p className="text-[9px] text-slate-950 dark:text-white font-bold uppercase">Cadastrado em {new Date(hist.date).toLocaleDateString()}</p></div>
                                            <p className="text-[9px] font-black text-slate-950 dark:text-white italic">{hist.note}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
