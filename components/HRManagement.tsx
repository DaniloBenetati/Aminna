
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Users, 
    DollarSign, 
    CreditCard, 
    Plus, 
    Search, 
    Filter, 
    UserPlus, 
    Calendar,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    UserCheck,
    Briefcase,
    Phone,
    Mail,
    Wallet,
    Trash2,
    Edit3,
    ArrowUpRight,
    ArrowDownRight,
    History,
    FileText,
    Receipt,
    Printer
} from 'lucide-react';
import { Employee, PayrollRecord, EmployeeLoan, ViewState } from '../types';
import { Avatar } from './Avatar';
import { supabase } from '../services/supabase';

interface HRManagementProps {
    employees: Employee[];
    onUpdateEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    payroll: PayrollRecord[];
    onUpdatePayroll: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
    loans: EmployeeLoan[];
    onUpdateLoans: React.Dispatch<React.SetStateAction<EmployeeLoan[]>>;
    expenses: any[]; // New: receive global expenses to filter
}

export const HRManagement: React.FC<HRManagementProps> = ({
    employees,
    onUpdateEmployees,
    payroll,
    onUpdatePayroll,
    loans,
    onUpdateLoans,
    expenses
}) => {
    const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'taxes' | 'loans' | 'history'>('employees');
    const [searchTerm, setSearchTerm] = useState('');
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState<EmployeeLoan | null>(null);
    const [loanForm, setLoanForm] = useState({
        employeeId: '',
        totalAmount: 0,
        installments: 1,
        installmentAmount: 0,
        date: new Date().toISOString().split('T')[0],
        reason: ''
    });

    useEffect(() => {
        if (loanForm.totalAmount > 0 && (loanForm.installments || 1) > 0) {
            setLoanForm(prev => ({ 
                ...prev, 
                installmentAmount: Number((prev.totalAmount / (prev.installments || 1)).toFixed(2)) 
            }));
        }
    }, [loanForm.totalAmount, loanForm.installments]);
    const [showDebtDocument, setShowDebtDocument] = useState<{ open: boolean, loan?: any }>({ open: false });

    // Date Navigation & View States (Same as Finance)
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('month');
    const [dateRef, setDateRef] = useState(new Date());
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const getDateLabel = () => {
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (timeView === 'year') return dateRef.getFullYear().toString();
        return 'Período Personalizado';
    };

    const navigateDate = (direction: 'next' | 'prev') => {
        const newDate = new Date(dateRef);
        const modifier = direction === 'next' ? 1 : -1;

        if (timeView === 'day') {
            newDate.setDate(newDate.getDate() + modifier);
        } else if (timeView === 'month') {
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + modifier);
        } else if (timeView === 'year') {
            newDate.setFullYear(newDate.getFullYear() + modifier);
        }

        setDateRef(newDate);
    };

    // Update startDate and endDate when timeView or dateRef changes
    useEffect(() => {
        if (timeView === 'custom') return;

        const year = dateRef.getFullYear();
        const month = dateRef.getMonth();

        let start = new Date(year, month, 1);
        let end = new Date(year, month + 1, 0);

        if (timeView === 'day') {
            start = new Date(dateRef);
            end = new Date(dateRef);
        } else if (timeView === 'month') {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0);
        } else if (timeView === 'year') {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
        }

        const toLocalDateStr = (d: Date) => d.toISOString().split('T')[0];
        setStartDate(toLocalDateStr(start));
        setEndDate(toLocalDateStr(end));
    }, [timeView, dateRef]);

    // Derived filtered payroll
    const filteredPayroll = useMemo(() => {
        return payroll.filter(p => {
            const dateStr = `${p.year}-${String(p.month).padStart(2, '0')}-01`;
            return dateStr >= startDate && dateStr <= endDate && dateStr >= "2026-01-01";
        });
    }, [payroll, startDate, endDate]);

    // Initial Employee Form State
    const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({
        name: '',
        role: '',
        baseSalary: 0,
        admissionDate: new Date().toISOString().split('T')[0],
        active: true,
        phone: '',
        email: '',
        pixKey: ''
    });

    const filteredEmployees = employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = useMemo(() => {
        const activeEmployees = employees.filter(e => e.active).length;
        
        // Filter by the selected period (startDate/endDate)
        const periodPayroll = payroll.filter(p => {
            const dateStr = `${p.year}-${String(p.month).padStart(1, '0')}-01`;
            const Jan2026 = "2026-01-01";
            const currentPeriodMatch = `${p.year}-${String(p.month).padStart(2, '0')}-01` >= startDate && `${p.year}-${String(p.month).padStart(2, '0')}-01` <= endDate;
            return currentPeriodMatch && dateStr >= Jan2026;
        });

        const totalPayroll = periodPayroll.reduce((acc, p) => acc + p.netSalary, 0);
        const totalBaseSalary = employees.filter(e => e.active).reduce((acc, e) => acc + (e.baseSalary || 0), 0);
        
        const activeLoans = loans.filter(l => l.status === 'ATIVO').reduce((acc, l) => acc + l.remainingAmount, 0);

        return {
            activeEmployees,
            totalPayroll,
            totalBaseSalary,
            activeLoans,
            totalCount: employees.length
        };
    }, [employees, payroll, loans, startDate, endDate]);

    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                const { error } = await supabase
                    .from('employees')
                    .update({
                        name: employeeForm.name,
                        role: employeeForm.role,
                        base_salary: employeeForm.baseSalary,
                        admission_date: employeeForm.admissionDate,
                        active: employeeForm.active,
                        phone: employeeForm.phone,
                        email: employeeForm.email,
                        pix_key: employeeForm.pixKey
                    })
                    .eq('id', editingEmployee.id);
                
                if (error) throw error;
                
                onUpdateEmployees(prev => prev.map(emp => 
                    emp.id === editingEmployee.id ? { ...emp, ...employeeForm } as Employee : emp
                ));
            } else {
                const { data, error } = await supabase
                    .from('employees')
                    .insert([{
                        name: employeeForm.name,
                        role: employeeForm.role,
                        base_salary: employeeForm.baseSalary,
                        admission_date: employeeForm.admissionDate,
                        active: employeeForm.active,
                        phone: employeeForm.phone,
                        email: employeeForm.email,
                        pix_key: employeeForm.pixKey
                    }])
                    .select();
                
                if (error) throw error;
                if (data) {
                    const newEmp = {
                        id: data[0].id,
                        name: data[0].name,
                        role: data[0].role,
                        baseSalary: data[0].base_salary,
                        admissionDate: data[0].admission_date,
                        active: data[0].active,
                        phone: data[0].phone,
                        email: data[0].email,
                        pixKey: data[0].pix_key
                    } as Employee;
                    onUpdateEmployees(prev => [...prev, newEmp]);
                }
            }
            setIsEmployeeModalOpen(false);
            setEditingEmployee(null);
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('Erro ao salvar funcionário.');
        }
    };

    const openEditEmployee = (emp: Employee) => {
        setEditingEmployee(emp);
        setEmployeeForm(emp);
        setIsEmployeeModalOpen(true);
    };

    const openNewEmployee = () => {
        setEditingEmployee(null);
        setEmployeeForm({
            name: '',
            role: '',
            baseSalary: 0,
            admissionDate: new Date().toISOString().split('T')[0],
            active: true,
            phone: '',
            email: '',
            pixKey: ''
        });
        setIsEmployeeModalOpen(true);
    };

    const handleUpdatePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayroll) return;

        const netSalary = (Number(editingPayroll.baseSalary) || 0) + 
                          (Number(editingPayroll.commissions) || 0) + 
                          (Number(editingPayroll.bonus) || 0) - 
                          (Number(editingPayroll.deductions) || 0) - 
                          (Number(editingPayroll.loanDeduction) || 0) -
                          (Number(editingPayroll.otherDeductions) || 0);
        
        const updatedRecord = { ...editingPayroll, netSalary };

        try {
            const { error } = await supabase
                .from('payroll')
                .update({
                    base_salary: updatedRecord.baseSalary,
                    commissions: updatedRecord.commissions,
                    bonus: updatedRecord.bonus,
                    deductions: updatedRecord.deductions,
                    loan_deduction: updatedRecord.loanDeduction,
                    other_deductions: Number(updatedRecord.otherDeductions) || 0,
                    other_deductions_reason: updatedRecord.otherDeductionsReason,
                    net_salary: updatedRecord.netSalary
                })
                .eq('id', updatedRecord.id);

            if (error) throw error;

            // Also update the linked expense in financial module if it exists and is PENDING
            const employee = employees.find(emp => emp.id === updatedRecord.employeeId);
            const monthNames = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const refMonth = monthNames[updatedRecord.month];
            
            // Heuristic to find the synced expense
            const searchTerms = [
                refMonth.toUpperCase(),
                employee?.name.split(' ')[0].toUpperCase() || ''
            ];

            const expenseToUpdate = (expenses || []).find(ex => 
                ex.status === 'PENDING' && 
                searchTerms.every(term => ex.description?.toUpperCase().includes(term))
            );

            if (expenseToUpdate) {
                await supabase.from('expenses').update({ amount: updatedRecord.netSalary }).eq('id', expenseToUpdate.id);
            }

            onUpdatePayroll(prev => prev.map(p => p.id === updatedRecord.id ? updatedRecord : p));
            setIsPayrollModalOpen(false);
            setEditingPayroll(null);
        } catch (err) {
            console.error("Erro ao atualizar folha:", err);
            alert("Erro ao salvar alterações na folha.");
        }
    };

    const handleProcessPayroll = async () => {
        const targetMonth = dateRef.getMonth() + 1;
        const targetYear = dateRef.getFullYear();
        const monthNames = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const refMonth = monthNames[targetMonth];

        // Get list of active employees
        const activeEmployees = employees.filter(e => e.active);
        
        try {
            const updatedPayroll: PayrollRecord[] = [];
            
            for (const emp of activeEmployees) {
                // 1. Check for existing record
                const existing = payroll.find(p => p.employeeId === emp.id && p.month === targetMonth && p.year === targetYear);
                
                // 2. Identify active loans for this employee
                const employeeLoans = loans.filter(l => 
                    l.employeeId === emp.id && 
                    l.status === 'ATIVO' && 
                    (l.remainingAmount || 0) > 0
                );
                
                let loanDeduction = 0;
                for (const loan of employeeLoans) {
                    // PARSE VIRTUAL SCHEDULE
                    let schedule: any[] = [];
                    try {
                        if (loan.reason && (loan.reason.startsWith('[') || loan.reason.startsWith('{'))) {
                            schedule = JSON.parse(loan.reason);
                        }
                    } catch (e) {
                        console.warn("Could not parse schedule for loan:", loan.id);
                    }

                    if (schedule.length > 0) {
                        // Find installment for target period
                        const inst = schedule.find(i => i.month === targetMonth && i.year === targetYear);
                        if (inst && inst.status !== 'CANCELADO') {
                            loanDeduction += (Number(inst.amount) || 0);
                        }
                    } else {
                        // FALLBACK TO AUTO-CALCULATION
                        const loanDate = new Date(loan.date + "T12:00:00");
                        const loanM = loanDate.getMonth() + 1;
                        const loanY = loanDate.getFullYear();
                        const monthsDiff = (targetYear - loanY) * 12 + (targetMonth - loanM);
                        if (monthsDiff >= 0 && monthsDiff < (loan.installments || 1)) {
                            loanDeduction += (loan.installmentAmount || 0);
                        }
                    }
                }

                if (!existing) {
                    // Create new payroll
                    const netSalary = (emp.baseSalary || 0) - loanDeduction;
                    const { data, error } = await supabase
                        .from('payroll')
                        .insert([{
                            employee_id: emp.id,
                            month: targetMonth,
                            year: targetYear,
                            base_salary: emp.baseSalary || 0,
                            loan_deduction: loanDeduction,
                            net_salary: netSalary,
                            status: 'PENDENTE'
                        }])
                        .select();
                    
                    if (error) throw error;
                    if (data && data[0]) {
                        updatedPayroll.push({
                            id: data[0].id,
                            employeeId: emp.id,
                            month: targetMonth,
                            year: targetYear,
                            baseSalary: data[0].base_salary,
                            loanDeduction: data[0].loan_deduction,
                            otherDeductions: 0,
                            netSalary: data[0].net_salary,
                            status: 'PENDENTE'
                        } as PayrollRecord);
                    }
                } else if (existing.loanDeduction !== loanDeduction) {
                    // Force update if the loan deduction differs from our calculation
                    const diff = loanDeduction - (existing.loanDeduction || 0);
                    const newNet = (existing.netSalary || 0) - diff;

                    const { error } = await supabase
                        .from('payroll')
                        .update({ 
                            loan_deduction: loanDeduction,
                            net_salary: newNet 
                        })
                        .eq('id', existing.id);
                    
                    if (error) throw error;
                    updatedPayroll.push({ 
                        ...existing, 
                        loanDeduction, 
                        netSalary: newNet 
                    });
                }
            }

            if (updatedPayroll.length > 0) {
                onUpdatePayroll(prev => {
                    const next = [...prev];
                    updatedPayroll.forEach(upd => {
                        const idx = next.findIndex(n => n.id === upd.id);
                        if (idx >= 0) next[idx] = upd;
                        else next.push(upd);
                    });
                    return next;
                });
            }
            
            alert(`Processamento de ${refMonth}/${targetYear} concluído com sucesso!`);
        } catch (err) {
            console.error("Erro ao processar folha:", err);
            alert("Erro ao processar folha de pagamento.");
        }
    };

    const handleSaveLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Generate initial schedule
            const insts = loanForm.installments || 1;
            const installmentValue = Number((loanForm.totalAmount / insts).toFixed(2));
            const startDate = new Date(loanForm.date + "T12:00:00");
            
            const initialSchedule = [];
            for (let i = 0; i < insts; i++) {
                const targetDate = new Date(startDate);
                targetDate.setMonth(targetDate.getMonth() + i);
                initialSchedule.push({
                    id: i + 1,
                    month: targetDate.getMonth() + 1,
                    year: targetDate.getFullYear(),
                    amount: installmentValue,
                    status: 'PENDENTE'
                });
            }

            const scheduleJson = JSON.stringify(initialSchedule);

            if (editingLoan) {
                // UPDATE LOAN
                const { error: loanError } = await supabase
                    .from('employee_loans')
                    .update({
                        employee_id: loanForm.employeeId,
                        total_amount: loanForm.totalAmount,
                        installment_amount: installmentValue,
                        remaining_amount: loanForm.totalAmount,
                        date: loanForm.date,
                        reason: scheduleJson, // Store schedule in reason field
                        status: 'ATIVO',
                        installments: loanForm.installments
                    })
                    .eq('id', editingLoan.id);

                if (loanError) throw loanError;

                onUpdateLoans(prev => prev.map(l => l.id === editingLoan.id ? {
                    ...l,
                    employeeId: loanForm.employeeId,
                    totalAmount: loanForm.totalAmount,
                    installmentAmount: installmentValue,
                    remainingAmount: loanForm.totalAmount,
                    date: loanForm.date,
                    reason: scheduleJson,
                    installments: loanForm.installments
                } : l));

            } else {
                // INSERT NEW LOAN
                const { data, error } = await supabase
                    .from('employee_loans')
                    .insert([{
                        employee_id: loanForm.employeeId,
                        total_amount: loanForm.totalAmount,
                        installment_amount: installmentValue,
                        remaining_amount: loanForm.totalAmount,
                        date: loanForm.date,
                        reason: scheduleJson,
                        status: 'ATIVO',
                        installments: loanForm.installments
                    }])
                    .select();

                if (error) throw error;

                if (data && data[0]) {
                    const mappedLoan: EmployeeLoan = {
                        id: data[0].id,
                        employeeId: data[0].employee_id,
                        totalAmount: data[0].total_amount,
                        installmentAmount: data[0].installment_amount,
                        remainingAmount: data[0].remaining_amount,
                        date: data[0].date,
                        reason: data[0].reason,
                        status: data[0].status,
                        installments: data[0].installments
                    };

                    onUpdateLoans(prev => [...prev, mappedLoan]);
                    setShowDebtDocument({ open: true, loan: mappedLoan });
                }
            }

            setIsLoanModalOpen(false);
            setEditingLoan(null);
            setLoanForm({
                employeeId: '',
                totalAmount: 0,
                installments: 1,
                installmentAmount: 0,
                date: new Date().toISOString().split('T')[0],
                reason: ''
            });
            alert("Empréstimo e Cronograma salvos com sucesso!");
        } catch (err) {
            console.error("Erro ao salvar empréstimo:", err);
            alert("Erro ao salvar empréstimo.");
        }
    };

    const handleDeleteLoan = async (loanId: string) => {
        const loanToDelete = loans.find(l => l.id === loanId);
        if (!loanToDelete) return;

        if (!confirm(`Tem certeza que deseja excluir este empréstimo? Isso removerá automaticamente as deduções de R$ ${loanToDelete.installmentAmount} vinculadas na folha de pagamento dos meses correspondentes.`)) return;
        
        try {
            // 1. Delete the loan record
            const { error: loanError } = await supabase
                .from('employee_loans')
                .delete()
                .eq('id', loanId);

            if (loanError) throw loanError;

            // 2. Identify and update all affected payroll records
            const startDate = new Date(loanToDelete.date);
            const insts = loanToDelete.installments || 1;
            
            for (let i = 0; i < insts; i++) {
                const targetDate = new Date(startDate);
                targetDate.setMonth(targetDate.getMonth() + i);
                const m = targetDate.getMonth() + 1;
                const y = targetDate.getFullYear();

                const payRec = payroll.find(p => p.employeeId === loanToDelete.employeeId && p.month === m && p.year === y);
                if (payRec) {
                    const deduction = loanToDelete.installmentAmount || 0;
                    const newVal = Math.max(0, (payRec.loanDeduction || 0) - deduction);
                    const newNet = (payRec.netSalary || 0) + deduction;
                    
                    await supabase.from('payroll')
                        .update({ loan_deduction: newVal, net_salary: newNet })
                        .eq('id', payRec.id);
                        
                    onUpdatePayroll(prev => prev.map(p => p.id === payRec.id ? {
                        ...p,
                        loanDeduction: newVal,
                        netSalary: newNet
                    } : p));
                }
            }

            onUpdateLoans(prev => prev.filter(l => l.id !== loanId));
        } catch (err) {
            console.error("Erro ao excluir empréstimo:", err);
            alert("Erro ao excluir empréstimo.");
        }
    };

    const handleDeletePayroll = async (payrollId: string) => {
        if (!confirm("Tem certeza que deseja remover este registro da folha?")) return;
        
        try {
            const { error } = await supabase
                .from('payroll')
                .delete()
                .eq('id', payrollId);

            if (error) throw error;
            onUpdatePayroll(prev => prev.filter(p => p.id !== payrollId));
        } catch (err) {
            console.error("Erro ao excluir registro de folha:", err);
            alert("Erro ao excluir registro.");
        }
    };



    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight uppercase flex items-center gap-3">
                        <Users className="text-zinc-950 dark:text-zinc-500" size={32} />
                        Recursos Humanos
                    </h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] ml-11">Gestão de Pessoas e Folha</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={openNewEmployee}
                        className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        Novo Funcionário
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaboradores Ativos</p>
                        <p className="text-2xl font-black text-slate-950 dark:text-white">{stats.activeEmployees} / {stats.totalCount}</p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Projeção Folha (Mês)</p>
                        <p className="text-2xl font-black text-slate-950 dark:text-white">R$ {stats.totalPayroll.toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Empréstimos</p>
                        <p className="text-2xl font-black text-slate-950 dark:text-white">R$ {stats.activeLoans.toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 w-full lg:w-fit shadow-sm overflow-x-auto scrollbar-hide flex-nowrap shrink-0">
                    <button 
                        onClick={() => setActiveTab('employees')}
                        className={`flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'employees' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'}`}
                    >
                        Funcionários
                    </button>
                    <button 
                        onClick={() => setActiveTab('payroll')}
                        className={`flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'payroll' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'}`}
                    >
                        Folha de Pagamento
                    </button>
                    <button 
                        onClick={() => setActiveTab('taxes')}
                        className={`flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'taxes' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'}`}
                    >
                        Encargos
                    </button>
                    <button 
                        onClick={() => setActiveTab('loans')}
                        className={`flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'loans' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'}`}
                    >
                        Empréstimos
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'}`}
                    >
                        Histórico Fin.
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-stretch md:items-center">
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto overflow-x-auto scrollbar-hide flex-nowrap shadow-sm">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button 
                                key={v} 
                                onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }} 
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}
                            </button>
                        ))}
                    </div>

                    {timeView !== 'custom' ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between shadow-sm">
                            <button onClick={() => navigateDate('prev')} className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight whitespace-nowrap px-3">
                                {getDateLabel()}
                            </span>
                            <button onClick={() => navigateDate('next')} className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-500 shadow-sm" />
                            <span className="text-[10px] font-black text-slate-400 px-1">Até</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-500 shadow-sm" />
                        </div>
                    )}

                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-zinc-950 dark:group-focus-within:text-white transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar..."
                            className="w-full bg-white dark:bg-zinc-900 pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all text-xs font-bold text-slate-950 dark:text-white shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'employees' && (
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50/50 dark:bg-zinc-800/30">
                                <tr>
                                    <th className="px-8 py-5">Colaborador</th>
                                    <th className="px-8 py-5">Cargo</th>
                                    <th className="px-8 py-5">Salário Base</th>
                                    <th className="px-8 py-5">Admissão</th>
                                    <th className="px-8 py-5">PIX / Contato</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <Users size={48} />
                                                <p className="text-sm font-black uppercase tracking-widest">Nenhum colaborador encontrado</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map(employee => (
                                        <tr key={employee.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <Avatar name={employee.name} size="w-10 h-10" className="rounded-xl shadow-sm" />
                                                    <span className="font-extrabold text-slate-950 dark:text-white uppercase truncate max-w-[200px]">{employee.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                                                    {employee.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 font-black text-slate-950 dark:text-white">R$ {(employee.baseSalary || 0).toLocaleString('pt-BR')}</td>
                                            <td className="px-8 py-5 font-bold text-slate-500 text-xs">{employee.admissionDate ? new Date(employee.admissionDate).toLocaleDateString() : 'N/A'}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[10px] font-black text-slate-950 dark:text-white truncate max-w-[120px]">{employee.pixKey || 'Sem PIX'}</p>
                                                    <p className="text-[9px] font-bold text-slate-400">{employee.phone || 'Sem contato'}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${employee.active 
                                                    ? 'bg-emerald-50 text-emerald-700' 
                                                    : 'bg-rose-50 text-rose-700'}`}>
                                                    {employee.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <button 
                                                        onClick={() => openEditEmployee(employee)}
                                                        className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl text-slate-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
                                                        title="Editar Cadastro"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button 
                                                        className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl text-slate-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                                                        title="Ver Histórico"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Footnote for New Employee */}
                    <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 text-center">
                         <button 
                            onClick={openNewEmployee}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                         >
                            + Contratar Novo Colaborador
                         </button>
                    </div>
                </div>
            )}

            {activeTab === 'payroll' && (
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Folha de Pagamento</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-loose">Listagem consolidada mensal por período</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleProcessPayroll}
                                className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                            >
                                Processar Mês Selecionado
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50/50 dark:bg-zinc-800/30">
                                <tr>
                                    <th className="px-8 py-5">Colaborador</th>
                                    <th className="px-8 py-5">Mês Ref.</th>
                                    <th className="px-8 py-5">Base (R$)</th>
                                    <th className="px-8 py-5">Comissões</th>
                                    <th className="px-8 py-5">Extra/Bônus</th>
                                    <th className="px-8 py-5">Dedução Empr.</th>
                                    <th className="px-8 py-5">Outros Desc.</th>
                                    <th className="px-8 py-5">Líquido (R$)</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {filteredPayroll.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <DollarSign size={48} />
                                                <p className="text-sm font-black uppercase tracking-widest">Nenhum registro para este período</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayroll.map(rec => {
                                        const monthNames = ["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
                                        return (
                                            <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-8 py-5 font-black text-slate-950 dark:text-white uppercase">{employees.find(e => e.id === rec.employeeId)?.name || 'N/A'}</td>
                                                <td className="px-8 py-5">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300">
                                                        {monthNames[rec.month]} / {rec.year}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 font-bold text-slate-600 dark:text-slate-400">{(rec.baseSalary || 0).toLocaleString('pt-BR')}</td>
                                                <td className="px-8 py-5 font-bold text-indigo-600 dark:text-indigo-400">{(rec.commissions || 0) > 0 ? `+${(rec.commissions || 0).toLocaleString('pt-BR')}` : '0,00'}</td>
                                                <td className="px-8 py-5 font-bold text-emerald-600 dark:text-emerald-400">{(rec.bonus || 0) > 0 ? `+${(rec.bonus || 0).toLocaleString('pt-BR')}` : '0,00'}</td>
                                                <td className="px-8 py-5 font-bold text-rose-500">{(rec.loanDeduction || 0) > 0 ? `-${(rec.loanDeduction || 0).toLocaleString('pt-BR')}` : '0,00'}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-rose-600">{(rec.otherDeductions || 0) > 0 ? `-${(rec.otherDeductions || 0).toLocaleString('pt-BR')}` : '0,00'}</span>
                                                        {rec.otherDeductionsReason && (
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[80px]">{rec.otherDeductionsReason}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 font-black text-slate-950 dark:text-white text-base">R$ {(rec.netSalary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${rec.status === 'PAGO' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                        {rec.status || 'PENDENTE'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        {rec.status === 'PENDENTE' && (
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingPayroll(rec);
                                                                    setIsPayrollModalOpen(true);
                                                                }}
                                                                className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase hover:underline"
                                                            >
                                                                Editar
                                                            </button>
                                                        )}
                                                        {rec.status === 'PENDENTE' && (
                                                            <button 
                                                                onClick={() => handleDeletePayroll(rec.id)}
                                                                className="text-rose-500 font-black text-[10px] uppercase hover:underline"
                                                            >
                                                                Limpar
                                                            </button>
                                                        )}
                                                        <button className="text-zinc-950 dark:text-zinc-400 font-black text-[10px] uppercase hover:underline">Baixar</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'loans' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Loans */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm p-8">
                            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter uppercase mb-6 flex items-center justify-between">
                                Empréstimos Ativos
                                <button 
                                    onClick={() => setIsLoanModalOpen(true)}
                                    className="p-3 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl hover:scale-110 transition-all shadow-xl"
                                >
                                    <Plus size={20} />
                                </button>
                                              <div className="space-y-6">
                                {(() => {
                                    const targetMonth = dateRef.getMonth() + 1;
                                    const targetYear = dateRef.getFullYear();
                                    
                                    const filteredLoans = loans.filter(loan => {
                                        let schedule = [];
                                        try {
                                            if (loan.reason && (loan.reason.startsWith('[') || loan.reason.startsWith('{'))) {
                                                schedule = JSON.parse(loan.reason);
                                            } else {
                                                // Fallback
                                                const startDate = new Date(loan.date + "T12:00:00");
                                                const loanM = startDate.getMonth() + 1;
                                                const loanY = startDate.getFullYear();
                                                const monthsDiff = (targetYear - loanY) * 12 + (targetMonth - loanM);
                                                return monthsDiff >= 0 && monthsDiff < (loan.installments || 1);
                                            }
                                        } catch(e) {}
                                        return schedule.some((inst: any) => inst.month === targetMonth && inst.year === targetYear);
                                    });

                                    if (filteredLoans.length === 0) {
                                        return (
                                            <div className="py-20 text-center opacity-30">
                                                <Wallet size={48} className="mx-auto mb-4" />
                                                <p className="text-sm font-black uppercase tracking-widest">Nenhum empréstimo ativo para {getDateLabel()}</p>
                                            </div>
                                        );
                                    }

                                    return filteredLoans.map(loan => {
                                        const targetMonth = dateRef.getMonth() + 1;
                                        const targetYear = dateRef.getFullYear();
                                        let schedule: any[] = [];
                                        try {
                                            if (loan.reason && (loan.reason.startsWith('[') || loan.reason.startsWith('{'))) {
                                                schedule = JSON.parse(loan.reason);
                                            }
                                        } catch(e) {}
                                        
                                        const currentInst = schedule.find(i => i.month === targetMonth && i.year === targetYear);
                                        const instIdx = schedule.findIndex(i => i.month === targetMonth && i.year === targetYear);

                                        return (
                                        <div key={loan.id} className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-3xl border border-slate-100 dark:border-zinc-800">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-black text-slate-950 dark:text-white uppercase">{employees.find(e => e.id === loan.employeeId)?.name || 'N/A'}</h4>
                                                        {instIdx !== -1 && (
                                                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                                                                Parcela {instIdx + 1} de {schedule.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Início: {loan.date ? new Date(loan.date).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                                <div className="flex items-center gap-3">     <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingLoan(loan);
                                                            setLoanForm({
                                                                employeeId: loan.employeeId,
                                                                totalAmount: loan.totalAmount,
                                                                installments: loan.installments || 1,
                                                                installmentAmount: loan.installmentAmount,
                                                                date: loan.date,
                                                                reason: loan.reason || ''
                                                            });
                                                            setIsLoanModalOpen(true);
                                                        }}
                                                        className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl text-slate-400 hover:text-zinc-950 dark:hover:text-white transition-all shadow-sm"
                                                        title="Editar Empréstimo"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setShowDebtDocument({ open: true, loan })}
                                                        className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl text-slate-400 hover:text-zinc-950 dark:hover:text-white transition-all shadow-sm"
                                                        title="Imprimir Confissão de Dívida"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteLoan(loan.id)}
                                                        className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl text-rose-400 hover:text-rose-600 transition-all shadow-sm"
                                                        title="Apagar Empréstimo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-slate-950 dark:text-white">R$ {(loan.remainingAmount || 0).toLocaleString('pt-BR')}</p>
                                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Saldo Devedor</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="w-full bg-slate-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden mb-4">
                                                <div 
                                                    className="bg-zinc-950 dark:bg-white h-full transition-all duration-500" 
                                                    style={{ width: `${loan.totalAmount > 0 ? (1 - (loan.remainingAmount || 0) / loan.totalAmount) * 100 : 0}%` }}
                                                />
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mt-6">
                                                <span className="text-slate-500">Parcelas: {loan.installments || 0} lançamento(s) ativo(s)</span>
                                                <span className="text-slate-950 dark:text-white">Total: R$ {(loan.totalAmount || 0).toLocaleString('pt-BR')}</span>
                                            </div>

                                            {/* Virtual Installment Schedule */}
                                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cronograma de Lançamentos</p>
                                                <div className="space-y-2">
                                                    {(() => {
                                                        let schedule = [];
                                                        try {
                                                            if (loan.reason && (loan.reason.startsWith('[') || loan.reason.startsWith('{'))) {
                                                                schedule = JSON.parse(loan.reason);
                                                            } else {
                                                                // Display auto-calculated preview if no schedule saved yet
                                                                const startDate = new Date(loan.date + "T12:00:00");
                                                                for(let i=0; i<(loan.installments || 1); i++) {
                                                                    const d = new Date(startDate);
                                                                    d.setMonth(d.getMonth() + i);
                                                                    schedule.push({ month: d.getMonth()+1, year: d.getFullYear(), amount: loan.installmentAmount });
                                                                }
                                                            }
                                                        } catch(e) { schedule = []; }

                                                        return schedule.map((inst: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                                        {idx + 1}º
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase">
                                                                        {["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][inst.month]}/{inst.year}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-xs font-black text-rose-500">R$ {inst.amount.toLocaleString('pt-BR')}</span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const newMonth = prompt("Novo mês (1-12):", inst.month.toString());
                                                                            const newYear = prompt("Novo ano:", inst.year.toString());
                                                                            if (newMonth && newYear) {
                                                                                const updatedSchedule = [...schedule];
                                                                                updatedSchedule[idx] = { ...inst, month: Number(newMonth), year: Number(newYear) };
                                                                                supabase.from('employee_loans').update({ reason: JSON.stringify(updatedSchedule) }).eq('id', loan.id)
                                                                                    .then(() => {
                                                                                        onUpdateLoans(prev => prev.map(l => l.id === loan.id ? { ...l, reason: JSON.stringify(updatedSchedule) } : l));
                                                                                        alert("Parcela atualizada! Clique em 'Processar Mês' na folha para refletir a mudança.");
                                                                                    });
                                                                            }
                                                                        }}
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-500 transition-all"
                                                                    >
                                                                        <Calendar size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-zinc-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                                <TrendingUp size={80} />
                           </div>
                           <h3 className="text-lg font-black uppercase tracking-tight mb-8">Fluxo RH</h3>
                           
                           <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Folha Líquida</p>
                                    <p className="font-black">R$ {stats.totalPayroll.toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Encargos/Deduções</p>
                                    <p className="font-black text-rose-400">- R$ 0,00</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Próximo Vecto</p>
                                    <p className="font-black">05/04</p>
                                </div>
                           </div>
                           
                           <button className="w-full mt-10 py-4 bg-white text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-2xl transition-all">
                                Gerar Relatório PDF
                           </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'taxes' && (
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden p-8">
                     <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Encargos e Impostos</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-loose">Provisão e pagamentos de impostos sobre folha (FGTS, INSS, etc)</p>
                        </div>
                        <button className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                            Gerar Lançamentos 2026
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                             <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">FGTS (8%)</p>
                             <p className="text-xl font-black text-slate-950 dark:text-white">R$ {(stats.totalBaseSalary * 0.08).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês</p>
                        </div>
                        <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                             <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">INSS Patronal (Est.)</p>
                             <p className="text-xl font-black text-slate-950 dark:text-white">R$ {(stats.totalBaseSalary * 0.20 + stats.totalBaseSalary * 0.078).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês</p>
                        </div>
                        <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                             <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Provisionamento 13º/Férias</p>
                             <p className="text-xl font-black text-slate-950 dark:text-white">R$ {(stats.totalBaseSalary * 0.222).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês</p>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-3xl border border-slate-200 dark:border-zinc-700">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Encargos</p>
                             <p className="text-xl font-black text-slate-950 dark:text-white">R$ {(stats.totalBaseSalary * (0.08 + 0.278 + 0.222)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {expenses.filter((ex: any) => 
                            (ex.category === 'ENCARGOS SOCIAIS' || 
                             ex.category === 'IMPOSTOS SOBRE FOLHA') &&
                             ex.date >= startDate && ex.date <= endDate
                        ).length === 0 ? (
                            <div className="py-20 text-center opacity-30">
                                <Receipt size={48} className="mx-auto mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">Nenhum encargo lançado para este período</p>
                            </div>
                        ) : (
                            expenses
                            .filter((ex: any) => 
                                (ex.category === 'ENCARGOS SOCIAIS' || 
                                 ex.category === 'IMPOSTOS SOBRE FOLHA') &&
                                 ex.date >= startDate && ex.date <= endDate
                            )
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map((ex: any) => (
                                <div key={ex.id} className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 flex justify-between items-center group hover:border-zinc-950 dark:hover:border-zinc-500 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ex.category === 'ENCARGOS SOCIAIS' ? 'bg-indigo-50/50 text-indigo-500' : 'bg-emerald-50/50 text-emerald-500'}`}>
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-950 dark:text-white uppercase">{ex.description}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(ex.date).toLocaleDateString()} • {ex.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-950 dark:text-white">R$ {ex.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${ex.status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {ex.status === 'PAID' ? 'Pago' : 'Pendente'}
                                            </span>
                                            <button className="opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-zinc-800 rounded-md text-slate-400 hover:text-zinc-950 transition-all">
                                                <ArrowUpRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden p-8">
                     <div className="mb-6">
                        <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Lançamentos Financeiros</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-loose">Gastos administrativos vinculados diretamente</p>
                    </div>

                    <div className="space-y-4">
                        {expenses.filter((ex: any) => 
                            (employees.some(emp => ex.description?.toUpperCase().includes(emp.name.split(' ')[0].toUpperCase())) ||
                             ex.category === 'PESSOAL ADMINISTRATIVO') &&
                             ex.date >= startDate && ex.date <= endDate
                        ).length === 0 ? (
                            <div className="py-20 text-center opacity-30">
                                <Receipt size={48} className="mx-auto mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">Nenhum lançamento identificado</p>
                            </div>
                        ) : (
                            expenses
                            .filter((ex: any) => 
                                (employees.some(emp => ex.description?.toUpperCase().includes(emp.name.split(' ')[0].toUpperCase())) ||
                                 ex.category === 'PESSOAL ADMINISTRATIVO') &&
                                 ex.date >= startDate && ex.date <= endDate
                            )
                            .map((ex: any) => (
                                <div key={ex.id} className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                                            <Receipt size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-950 dark:text-white uppercase">{ex.description || 'Pagamento Administrativo'}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(ex.date).toLocaleDateString()} • {ex.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-black text-rose-600">R$ {ex.amount?.toLocaleString('pt-BR')}</p>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${ex.status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>{ex.status === 'PAID' ? 'Pago' : 'Pendente'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Employee Modal */}
            {isEmployeeModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">
                                    {editingEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
                                </h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Informações contratuais e pessoais</p>
                            </div>
                            <button onClick={() => setIsEmployeeModalOpen(false)} className="p-3 bg-white dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-slate-950 dark:hover:text-white shadow-sm">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEmployee} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-none outline-none font-bold text-slate-950 dark:text-white focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
                                        value={employeeForm.name}
                                        onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cargo / Função</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ex: Recepção, Limpeza..."
                                        className="w-full bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-none outline-none font-bold text-slate-950 dark:text-white focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
                                        value={employeeForm.role}
                                        onChange={e => setEmployeeForm({...employeeForm, role: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Salário Base (R$)</label>
                                    <input 
                                        type="number" 
                                        required
                                        className="w-full bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-none outline-none font-bold text-slate-950 dark:text-white focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
                                        value={employeeForm.baseSalary}
                                        onChange={e => setEmployeeForm({...employeeForm, baseSalary: Number(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data de Admissão</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-none outline-none font-bold text-slate-950 dark:text-white focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
                                        value={employeeForm.admissionDate}
                                        onChange={e => setEmployeeForm({...employeeForm, admissionDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Celular / WhatsApp</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-none outline-none font-bold text-slate-950 dark:text-white focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
                                        value={employeeForm.phone}
                                        onChange={e => setEmployeeForm({...employeeForm, phone: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave PIX</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-none outline-none font-bold text-slate-950 dark:text-white focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-all"
                                        value={employeeForm.pixKey}
                                        onChange={e => setEmployeeForm({...employeeForm, pixKey: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsEmployeeModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Salvar Funcionário
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Edição de Folha */}
            {isPayrollModalOpen && editingPayroll && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleUpdatePayroll} className="p-8">
                            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter uppercase mb-2">Editar Folha</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">
                                {employees.find(e => e.id === editingPayroll.employeeId)?.name} • REF {["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"][editingPayroll.month]}/{editingPayroll.year}
                            </p>

                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Salário Base (R$)</label>
                                    <input 
                                        type="number" step="0.01" required
                                        value={editingPayroll.baseSalary}
                                        onChange={e => setEditingPayroll({...editingPayroll, baseSalary: Number(e.target.value)})}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Comissões (+)</label>
                                    <input 
                                        type="number" step="0.01"
                                        value={editingPayroll.commissions}
                                        onChange={e => setEditingPayroll({...editingPayroll, commissions: Number(e.target.value)})}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm text-indigo-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Extra/Bônus (+)</label>
                                    <input 
                                        type="number" step="0.01"
                                        value={editingPayroll.bonus}
                                        onChange={e => setEditingPayroll({...editingPayroll, bonus: Number(e.target.value)})}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm text-emerald-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dedução Empréstimo (-)</label>
                                    <input 
                                        type="number" step="0.01"
                                        value={editingPayroll.loanDeduction}
                                        onChange={e => setEditingPayroll({...editingPayroll, loanDeduction: Number(e.target.value)})}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm text-rose-500"
                                    />
                                    <p className="text-[8px] font-black text-amber-500 uppercase ml-1">Valor sugerido pelo sistema. Edite para pular ou ajustar parcelas.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Outros Descontos (-)</label>
                                    <input 
                                        type="number" step="0.01"
                                        value={editingPayroll.otherDeductions}
                                        onChange={e => setEditingPayroll({...editingPayroll, otherDeductions: Number(e.target.value)})}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm text-rose-700"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motivo dos Outros Descontos</label>
                                    <input 
                                        type="text"
                                        value={editingPayroll.otherDeductionsReason || ''}
                                        onChange={e => setEditingPayroll({...editingPayroll, otherDeductionsReason: e.target.value})}
                                        className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-xs uppercase"
                                        placeholder="EX: EMPRÉSTIMO ADQUIRIDO EM MARÇO"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsPayrollModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                                <button type="submit" className="flex-1 px-8 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Salvar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Novo Empréstimo */}
            {isLoanModalOpen && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleSaveLoan} className="p-8">
                            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter uppercase mb-2">
                                {editingLoan ? 'Editar Empréstimo' : 'Novo Empréstimo'}
                            </h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">
                                {editingLoan ? 'Ajuste as condições do empréstimo existente' : 'O desconto em folha será gerado automaticamente'}
                            </p>

                            <div className="space-y-6 mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Colaborador</label>
                                    <select 
                                        required
                                        value={loanForm.employeeId}
                                        onChange={e => setLoanForm({...loanForm, employeeId: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm"
                                    >
                                        <option value="">Selecione...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Total (R$)</label>
                                        <input 
                                            type="number" step="0.01" required
                                            value={loanForm.totalAmount}
                                            onChange={e => setLoanForm({...loanForm, totalAmount: Number(e.target.value)})}
                                            className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nº Parcelas</label>
                                        <input 
                                            type="number" required min="1"
                                            value={loanForm.installments}
                                            onChange={e => setLoanForm({...loanForm, installments: Number(e.target.value)})}
                                            className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Parcela (R$)</label>
                                        <input 
                                            type="number" step="0.01" required
                                            value={loanForm.installmentAmount}
                                            readOnly
                                            className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm opacity-60"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motivo / Descrição</label>
                                    <input 
                                        type="text" required
                                        placeholder="EX: ADIANTAMENTO PARA SAÚDE"
                                        value={loanForm.reason}
                                        onChange={e => setLoanForm({...loanForm, reason: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-sm uppercase"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsLoanModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                                <button type="submit" className="flex-1 px-8 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Confirmar e Gerar Doc</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confissão de Dívida (Documento) */}
            {showDebtDocument.open && showDebtDocument.loan && (
                <div className="fixed inset-0 bg-slate-950/90 z-[60] flex items-center justify-center p-4 backdrop-blur-md print-wrapper">
                    <style>
                        {`
                        @media print {
                            @page {
                                size: A4;
                                margin: 15mm;
                            }
                            html, body {
                                height: auto !important;
                                overflow: visible !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                background: white !important;
                            }
                            body * { visibility: hidden !important; }
                            .print-wrapper, .print-wrapper * {
                                visibility: visible !important;
                            }
                            .print-wrapper {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                display: block !important;
                                background: white !important;
                                z-index: 99999 !important;
                            }
                            .print-document-container {
                                position: static !important;
                                display: block !important;
                                width: 100% !important;
                                height: auto !important;
                                box-shadow: none !important;
                                border: none !important;
                                padding: 0 !important;
                                margin: 0 !important;
                            }
                            .print-document {
                                width: 100% !important;
                                min-height: 250mm;
                                display: block;
                                padding-bottom: 20mm;
                                box-sizing: border-box;
                            }
                            .print-document:not(:last-child) {
                                page-break-after: always !important;
                                break-after: page !important;
                            }
                            .no-print { display: none !important; }
                        }
                        `}
                    </style>
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl p-12 overflow-y-auto max-h-[90vh] font-serif no-scrollbar print-document-container print:overflow-visible print:max-h-none print:p-0 print:shadow-none print:rounded-none">
                        <div className="flex flex-col gap-10 print:block print:gap-0">
                            {[ 'VIA DO EMPREGADOR', 'VIA DO COLABORADOR' ].map((via, idx) => (
                                <div 
                                    key={via} 
                                    className={`bg-white print-document border-b-2 border-dashed border-slate-100 pb-20 last:border-none last:pb-0 print:border-none print:p-0 print:m-0 print:min-h-[270mm]`}
                                >
                                    <div className="text-center mb-12">
                                        <h1 className="text-2xl font-bold uppercase mb-2">Instrumento Particular de Confissão de Dívida</h1>
                                        <p className="text-sm font-black text-slate-900 font-sans tracking-[0.2em]">{via}</p>
                                    </div>

                                    <div className="space-y-8 text-justify text-[13pt] leading-relaxed text-slate-900">
                                        <p>
                                            Pelo presente instrumento, o(a) Sr(a). <strong className="uppercase">{employees.find(e => e.id === showDebtDocument.loan.employeeId)?.name}</strong>, 
                                            doravante denominado(a) DEVEDOR(A), confessa e assume como líquida e certa a dívida perante a empresa <strong>AMINNA ESTÉTICA</strong>, 
                                            no valor total de <strong>R$ {showDebtDocument.loan.totalAmount.toLocaleString('pt-BR')}</strong>.
                                        </p>

                                        <p>
                                            O valor acima referido foi concedido a título de empréstimo/adiantamento para a finalidade de: <strong className="uppercase">{showDebtDocument.loan.reason}</strong>.
                                        </p>

                                        <p>
                                            O(A) DEVEDOR(A) autoriza, neste ato, com fulcro no <strong>Artigo 462, § 1º, da CLT</strong>, 
                                            o desconto mensal em sua folha de pagamento no valor de <strong>R$ {showDebtDocument.loan.installmentAmount.toLocaleString('pt-BR')}</strong>, 
                                            a iniciar-se na folha do mês de {new Date(showDebtDocument.loan.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}, 
                                            até a total quitação do saldo devedor.
                                        </p>

                                        <p>
                                            Em caso de rescisão do contrato de trabalho, o saldo remanescente será descontado integralmente das verbas rescisórias, conforme 
                                            autoriza o <strong>Art. 477, § 5º, da CLT</strong> e o <strong>Artigo 368 do Código Civil</strong>.
                                        </p>

                                        <p className="pt-4 italic text-xs">
                                            Sendo expressão da verdade e estando as partes de comum acordo, em conformidade com o <strong>Art. 586 do Código Civil</strong>, 
                                            firma o presente para que surta seus efeitos legais.
                                        </p>

                                        <div className="pt-24 grid grid-cols-2 gap-20">
                                            <div className="border-t-2 border-slate-950 pt-6 text-center">
                                                <p className="font-bold text-xs uppercase">{employees.find(e => e.id === showDebtDocument.loan.employeeId)?.name}</p>
                                                <p className="text-[10px] text-slate-500 font-sans">DEVEDOR(A)</p>
                                            </div>
                                            <div className="border-t-2 border-slate-950 pt-6 text-center">
                                                <p className="font-bold text-xs uppercase">AMINNA ESTÉTICA</p>
                                                <p className="text-[10px] text-slate-500 font-sans tracking-widest">CREDOR(A)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 flex justify-end gap-4 no-print sticky bottom-0 bg-white/80 backdrop-blur-sm p-4 border-t border-slate-100">
                            <button 
                                onClick={() => window.print()}
                                className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2"
                            >
                                <Printer size={16} /> Imprimir 2 Vias
                            </button>
                            <button 
                                onClick={() => setShowDebtDocument({ open: false })}
                                className="px-8 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
