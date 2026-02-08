
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  AGENDA = 'AGENDA',
  DAILY_APPOINTMENTS = 'DAILY_APPOINTMENTS',
  CLIENTES = 'CLIENTES',
  CRM = 'CRM',
  FINANCEIRO = 'FINANCEIRO',
  FECHAMENTOS = 'FECHAMENTOS',
  ESTOQUE = 'ESTOQUE',
  VENDAS = 'VENDAS',
  MARKETING = 'MARKETING',
  PROFISSIONAIS = 'PROFISSIONAIS',
  SERVICOS = 'SERVICOS',
  PARTNERSHIPS = 'PARTNERSHIPS',
  COPA = 'COPA', // Novo Módulo
  SETTINGS = 'SETTINGS'
}

export type LeadStatus = 'NOVO' | 'ATENDIMENTO' | 'QUALIFICADO' | 'PROPOSTA' | 'CONVERTIDO' | 'PERDIDO';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string; // Alterado de união fixa para string genérica
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  lostReason?: string;
  value?: number; // Valor estimado da oportunidade
  serviceInterest?: string; // Serviço de interesse
  temperature?: 'quente' | 'frio' | 'morno';
  tags?: string[];
}

export interface CommissionHistoryItem {
  date: string;
  rate: number;
  note?: string;
}

export interface Provider {
  id: string;
  name: string;
  specialty: string; // Mantido para exibição simples (título principal)
  specialties: string[]; // Lista completa de habilidades técnicas
  commissionRate: number; // 0.0 to 1.0
  commissionHistory?: CommissionHistoryItem[]; // Histórico de alterações de comissão
  avatar: string;
  phone?: string;
  birthDate?: string;
  pixKey?: string;
  active: boolean;
  order?: number; // Para ordenação personalizada
  workDays?: number[]; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
}

export interface PriceHistoryItem {
  date: string; // ISO Date of change
  price: number;
  note?: string; // Optional reason for price change
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  requiredSpecialty?: string; // Especialidade técnica necessária
  priceHistory?: PriceHistoryItem[];
  category?: string; // Categoria do serviço (ex: Cabelo, Unha, Estética)
}

export interface Complaint {
  id: string;
  date: string;
  subject: string;
  description: string;
  status: 'Pendente' | 'Em Análise' | 'Resolvido';
  resolution?: string;
}

export interface CustomerPreferences {
  favoriteServices: string[];
  preferredDays: string[];
  notes: string;
  restrictions: string; // Allergies, etc.
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  address?: string;
  cpf?: string;
  registrationDate: string;
  lastVisit: string;
  totalSpent: number;
  status: 'VIP' | 'Regular' | 'Risco de Churn' | 'Novo' | 'Restrito';
  isBlocked?: boolean;
  blockReason?: string;
  assignedProviderId?: string;
  restrictedProviderIds?: string[]; // Lista de IDs de profissionais bloqueados para esta cliente
  history: CustomerHistoryItem[];
  preferences?: CustomerPreferences;
  complaints?: Complaint[];
  observations?: string;
  acquisitionChannel?: string; // Novo campo: Canal de Entrada
  outstandingBalance?: number; // Saldo Devedor
}

export interface CustomerHistoryItem {
  id: string;
  date: string;
  type: 'VISIT' | 'PROVIDER_SWITCH' | 'PURCHASE' | 'CONTACT' | 'COMPLAINT' | 'NO_SHOW' | 'CANCELLATION' | 'RESTRICTION';
  description: string;
  providerId?: string;
  details?: string;
  productsUsed?: string[];
  rating?: number;
  feedback?: string;
}

export interface StockUsageLog {
  id: string;
  date: string;
  quantity: number;
  type: 'VENDA' | 'USO_INTERNO' | 'PERDA' | 'AJUSTE_ENTRADA' | 'CORRECAO';
  providerId?: string;
  note?: string;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: 'Uso Interno' | 'Venda';
  group?: string; // Ex: Cosméticos, Roupas, Descartáveis
  subGroup?: string; // Ex: Esmaltes, Calças, Luvas
  quantity: number;
  minQuantity: number;
  unit: string;
  price?: number;
  priceHistory?: PriceHistoryItem[];
  usageHistory?: StockUsageLog[];
  costPrice: number;
}

export interface Sale {
  id: string;
  date: string;
  customerId: string;
  totalAmount: number;
  paymentMethod: string;
  payments?: PaymentInfo[];
  items: any[]; // List of { productId, quantity, unitPrice, name } or service details
}


export interface Appointment {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  date: string; // Data agendada
  paymentDate?: string; // Data real do pagamento (Baixa)
  time: string;
  status: 'Confirmado' | 'Pendente' | 'Concluído' | 'Cancelado' | 'Em Andamento';
  productsUsed?: string[]; // Legacy / Consolidated list
  groupId?: string; // Tracks services booked together
  recurrenceId?: string; // ID to track recurring appointment series
  pricePaid?: number;
  bookedPrice?: number; // Snapshot of price at booking time
  commissionRateSnapshot?: number; // Snapshot da comissão no momento do agendamento
  isCourtesy?: boolean;
  appliedCoupon?: string;
  discountAmount?: number;
  paymentMethod?: string; // Legacy/Main method
  payments?: PaymentInfo[]; // Detailed multi-payments

  // Lista de produtos vinculados especificamente ao serviço principal
  mainServiceProducts?: string[];

  // Novos campos para suporte a multi-serviços agrupados
  additionalServices?: {
    serviceId: string;
    providerId: string;
    isCourtesy: boolean;
    discount: number;
    bookedPrice?: number; // Snapshot for extras
    commissionRateSnapshot?: number; // Snapshot for extras commission
    startTime?: string; // Horário específico do serviço extra
    products?: string[]; // Lista de produtos vinculados a este serviço extra
  }[];
  combinedServiceNames?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Partner {
  id: string;
  name: string;
  socialMedia: string;
  category: string; // Influencer, Local Business, etc.
  phone: string;
  email?: string;
  document?: string; // CPF or CNPJ
  address?: string;
  partnershipType: 'PERMUTA' | 'PAGO';
  pixKey?: string;
  notes?: string;
  active: boolean;
}

export interface Campaign {
  id: string;
  partnerId: string;
  name: string;
  couponCode: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  startDate: string;
  endDate?: string;
  useCount: number;
  maxUses: number;
  totalRevenueGenerated: number;
}

export interface Expense {
  id: string;
  description: string;
  category: string; // User defined category (ex: Aluguel, Marketing)
  subcategory?: string; // User defined subcategory
  dreClass: 'COSTS' | 'EXPENSE_SALES' | 'EXPENSE_ADM' | 'EXPENSE_FIN' | 'TAX' | 'DEDUCTION'; // Fixed DRE mapping
  amount: number;
  date: string;
  status: 'Pago' | 'Pendente';
  paymentMethod: 'Boleto' | 'Pix' | 'Transferência' | 'Cartão' | 'Dinheiro';
  supplierId?: string;
  recurringId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category?: string;
  document?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  dreClass: 'COSTS' | 'EXPENSE_SALES' | 'EXPENSE_ADM' | 'EXPENSE_FIN' | 'TAX' | 'DEDUCTION';
  isSystem?: boolean; // If true, cannot be deleted (e.g. basic categories)
}

export interface FinancialTransaction {
  id: string;
  date: string;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  description: string;
  amount: number;
  status: 'Pago' | 'Pendente' | 'Previsto' | 'Atrasado';
  paymentMethod: string;
  origin: 'Serviço' | 'Produto' | 'Despesa' | 'Outro';
  customerOrProviderName?: string;
}

// --- TIPOS PARA COPA (PANTRY) ---

export interface PantryItem {
  id: string;
  name: string;
  unit: string; // ex: capsula, garrafa, dose
  category: 'Bebida' | 'Alimento' | 'Outro';
  quantity: number; // Estoque atual
  minQuantity: number;
  costPrice: number; // Custo de compra
  referencePrice: number; // Valor de referência (não cobrado, apenas para relatórios)
  priceHistory?: PriceHistoryItem[]; // Histórico de alteração de preço referência
}

export interface PantryLog {
  id: string;
  date: string;
  time: string;
  itemId: string;
  quantity: number;
  appointmentId?: string; // Opcional, se vinculado a um atendimento
  customerId?: string; // Opcional
  providerId?: string; // Profissional responsável pelo atendimento
  costAtMoment: number; // Custo de compra no momento
  referenceAtMoment: number; // Valor ref no momento
}

export interface PaymentInfo {
  id: string;
  method: string;
  amount: number;
  installments?: number;
}

export interface PaymentSetting {
  id: string;
  method: string;
  iconName: 'Smartphone' | 'CreditCard' | 'Landmark' | 'Wallet' | 'Banknote' | 'Ticket';
  fee: number;
  days: number;
  color: string;
}

export interface CommissionSetting {
  id: string; // '1' or '2' for the two periods
  startDay: number;
  endDay: number | 'last'; // 'last' means last day of month
  paymentDay: number;
}

export interface AppPermissions {
  tabs: ViewState[];
  privileges: string[];
}

export interface UserProfile {
  id: string;
  email?: string;
  role: 'admin' | 'manager' | 'staff';
  permissions: AppPermissions;
  createdAt: string;
}

// --- TIPOS PARA INTEGRAÇÃO FISCAL (Focus NFe / Salão Parceiro) ---

export enum NFSeStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  ISSUED = 'issued',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface FiscalConfig {
  id: string;
  salonName: string;
  cnpj: string;
  municipalRegistration?: string;
  stateRegistration?: string;
  city: string;
  state: string;
  address?: string;
  zipCode?: string;
  // Focus NFe Settings
  focusNfeToken?: string;
  focusNfeEnvironment: 'sandbox' | 'production';
  autoIssueNfse: boolean;
  // Digital Certificate
  certificateBase64?: string;
  certificatePassword?: string;
  certificateExpiresAt?: string;
  // Salão Parceiro Settings
  salaoParceiroEnabled: boolean;
  defaultSalonPercentage: number; // Percentage salon keeps (e.g., 30%)
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalFiscalConfig {
  id: string;
  providerId: string;
  cnpj: string;
  municipalRegistration?: string;
  socialName?: string; // Razão Social
  fantasyName?: string; // Nome Fantasia
  servicePercentage: number; // Percentage professional receives (e.g., 70%)
  // Address (if different from salon)
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Contact
  email?: string;
  phone?: string;
  // Status
  active: boolean;
  verified: boolean; // Admin verified this data
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface NFSeRecord {
  id: string;
  // References
  appointmentId?: string;
  providerId?: string;
  customerId?: string;
  // NFSe Data
  reference?: string; // Focus NFe reference ID
  nfseNumber?: string; // NFSe number after issued
  verificationCode?: string;
  status: NFSeStatus;
  // Values (Salão Parceiro segregation)
  totalValue: number;
  salonValue: number;
  professionalValue: number;
  professionalCnpj: string;
  // Service Description
  serviceDescription: string;
  // Focus NFe Response
  focusResponse?: any;
  xmlUrl?: string;
  pdfUrl?: string;
  // Error Handling
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: string;
  // Cancellation
  cancelledAt?: string;
  cancellationReason?: string;
  // Metadata
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Update Provider to include fiscal config
export interface ProviderWithFiscal extends Provider {
  fiscalConfigId?: string;
  fiscalConfig?: ProfessionalFiscalConfig;
}

// Update Appointment to include NFSe reference
export interface AppointmentWithNFSe extends Appointment {
  nfseRecordId?: string;
  nfseRecord?: NFSeRecord;
}

