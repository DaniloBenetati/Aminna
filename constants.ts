
import { Provider, Service, Customer, StockItem, Appointment, Sale, Partner, Campaign, PantryItem, PantryLog, Lead } from './types';

// --- HELPER FOR DYNAMIC DATES ---
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
const nextMonthVal = (now.getMonth() + 2) % 12 || 12;
const nextMonth = String(nextMonthVal).padStart(2, '0');
const prevMonthVal = now.getMonth() === 0 ? 12 : now.getMonth();
const prevMonth = String(prevMonthVal).padStart(2, '0');

// Helper to get dynamic YYYY-MM-DD
// day: The day of the month (1-31). 
// Use day=0 for TODAY relative to execution
const getDynamicDate = (day: number, monthOffset: number = 0) => {
  let d;
  if (day === 0) {
    d = new Date(); // Today
  } else {
    d = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
  }
  return d.toISOString().split('T')[0];
};

// --- DATA GENERATION HELPERS ---
const generateProviders = (): Provider[] => {
  const baseProviders = [
    {
      id: 'p1', name: 'Ana Silva', specialty: 'Manicure Clássica', specialties: ['Mão Simples', 'Pé Simples', 'Blindagem de Diamante', 'Francesinha (Adicional)'], commissionRate: 0.6, commissionHistory: [],
      avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', phone: '(11) 99999-1001', birthDate: `1990-${currentMonth}-15`, pixKey: 'ana.silva@email.com', active: true,
      workDays: [1, 2, 3, 4, 5, 6] // Seg-Sab
    },
    {
      id: 'p2', name: 'Carla Souza', specialty: 'Nail Art', specialties: ['Mão Simples', 'Pé Simples', 'Nail Art (por unha)', 'Alongamento Fibra de Vidro', 'Manutenção Fibra', 'Esmaltação em Gel'], commissionRate: 0.65, commissionHistory: [],
      avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', phone: '(11) 99999-1002', birthDate: '1992-08-20', pixKey: '11999991002', active: true,
      workDays: [2, 3, 4, 5, 6] // Ter-Sab
    },
    {
      id: 'p3', name: 'Beatriz Costa', specialty: 'Podologia', specialties: ['Pé Simples', 'Spa dos Pés Completo', 'Plástica dos Pés'], commissionRate: 0.7, commissionHistory: [],
      avatar: 'https://i.pravatar.cc/150?u=a04258114e29026302d', phone: '(11) 99999-1003', birthDate: `1988-${currentMonth}-28`, pixKey: 'beatriz.costa@cpf.com', active: true,
      workDays: [1, 3, 5] // Seg, Qua, Sex
    },
    {
      id: 'p4', name: 'Fernanda Lima', specialty: 'Alongamento', specialties: ['Mão Simples', 'Alongamento Fibra de Vidro', 'Manutenção Fibra', 'Esmaltação em Gel', 'Banho de Gel', 'Remoção de Alongamento'], commissionRate: 0.65, commissionHistory: [],
      avatar: 'https://i.pravatar.cc/150?u=a04258114e29026708c', phone: '(11) 99999-1004', birthDate: '1995-12-10', pixKey: 'fernanda.lima@email.com', active: true,
      workDays: [4, 5, 6] // Qui, Sex, Sab
    },
    {
      id: 'p5', name: 'Juliana Mendes', specialty: 'SPA dos Pés', specialties: ['Mão Simples', 'Pé Simples', 'Spa dos Pés Completo', 'Plástica dos Pés'], commissionRate: 0.6, commissionHistory: [],
      avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', phone: '(11) 99999-1005', birthDate: `1993-${nextMonth}-14`, pixKey: '11999991005', active: true,
      workDays: [1, 2, 3, 4, 5, 6]
    }
  ];

  // No extra providers generated
  return baseProviders;
};

export const PROVIDERS: Provider[] = generateProviders();

export const SERVICES: Service[] = [
  { id: 's1', name: 'Mão Simples', price: 45.00, durationMinutes: 60, requiredSpecialty: 'Manicure' },
  { id: 's2', name: 'Pé Simples', price: 50.00, durationMinutes: 60, requiredSpecialty: 'Pedicure' },
  { id: 's3', name: 'Spa dos Pés Completo', price: 90.00, durationMinutes: 60, requiredSpecialty: 'SPA dos Pés' },
  { id: 's4', name: 'Alongamento Fibra de Vidro', price: 220.00, durationMinutes: 150, requiredSpecialty: 'Alongamento' },
  { id: 's5', name: 'Manutenção Fibra', price: 140.00, durationMinutes: 120, requiredSpecialty: 'Alongamento' },
  { id: 's6', name: 'Banho de Gel', price: 120.00, durationMinutes: 90, requiredSpecialty: 'Banho de Gel' },
  { id: 's7', name: 'Esmaltação em Gel', price: 70.00, durationMinutes: 60, requiredSpecialty: 'Esmaltação em Gel' },
  { id: 's8', name: 'Blindagem de Diamante', price: 80.00, durationMinutes: 60, requiredSpecialty: 'Manicure' },
  { id: 's9', name: 'Plástica dos Pés', price: 150.00, durationMinutes: 60, requiredSpecialty: 'Podologia' },
  { id: 's10', name: 'Nail Art (por unha)', price: 15.00, durationMinutes: 15, requiredSpecialty: 'Nail Art' },
  { id: 's11', name: 'Francesinha (Adicional)', price: 20.00, durationMinutes: 15, requiredSpecialty: 'Manicure' },
  { id: 's12', name: 'Remoção de Alongamento', price: 50.00, durationMinutes: 40, requiredSpecialty: 'Alongamento' }
];

const CHANNELS = ['Instagram', 'Indicação', 'Google', 'Facebook', 'TikTok', 'WhatsApp', 'Passante'];

// --- EXTENDED CUSTOMER BASE ---
export const CUSTOMERS: Customer[] = [
  {
    id: 'c1', name: 'Mariana Oliveira', phone: '(11) 99999-1234', email: 'mari.o@gmail.com',
    birthDate: `1990-${currentMonth}-12`, registrationDate: '2023-01-15', lastVisit: getDynamicDate(1), totalSpent: 2450.00,
    status: 'VIP', assignedProviderId: 'p2',
    preferences: { favoriteServices: ['Alongamento Fibra'], preferredDays: ['Sexta'], notes: 'Ama café.', restrictions: 'Alergia a látex.' }, history: [],
    acquisitionChannel: 'Instagram'
  },
  {
    id: 'c2', name: 'Paula Santos', phone: '(11) 98888-5678', email: 'paula.s@hotmail.com',
    birthDate: `1985-${currentMonth}-05`, registrationDate: '2023-11-20', lastVisit: getDynamicDate(5), totalSpent: 450.00,
    status: 'Risco de Churn', assignedProviderId: 'p1', preferences: { favoriteServices: ['Mão Simples'], preferredDays: ['Terça'], notes: '', restrictions: '' }, history: [],
    acquisitionChannel: 'Indicação'
  },
  {
    id: 'c3', name: 'Gabriela Rocha', phone: '(11) 97777-4321', birthDate: `1998-${currentMonth}-22`, registrationDate: getDynamicDate(2), lastVisit: getDynamicDate(12), totalSpent: 890.00,
    status: 'Regular', assignedProviderId: 'p4', preferences: { favoriteServices: ['Pé Simples'], preferredDays: ['Quarta'], notes: 'Silenciosa.', restrictions: '' }, history: [],
    acquisitionChannel: 'Google'
  },
  // NOVOS CLIENTES (Datas no mês atual para aparecer no KPI)
  {
    id: 'c4', name: 'Luana Martins', phone: '(11) 96666-1111', birthDate: '2000-05-25', registrationDate: getDynamicDate(2), lastVisit: getDynamicDate(2), totalSpent: 200.00,
    status: 'Novo', assignedProviderId: 'p3', history: [], acquisitionChannel: 'Instagram'
  },
  {
    id: 'c5', name: 'Patricia Lima', phone: '(11) 95555-2222', birthDate: `1992-${nextMonth}-10`, registrationDate: '2023-05-01', lastVisit: getDynamicDate(15), totalSpent: 1800.00,
    status: 'VIP', assignedProviderId: 'p5', history: [], acquisitionChannel: 'TikTok'
  },
  { id: 'c6', name: 'Camila Ferreira', phone: '(11) 94444-3333', birthDate: `1980-${currentMonth}-30`, registrationDate: getDynamicDate(4), lastVisit: getDynamicDate(4), totalSpent: 600.00, status: 'Novo', assignedProviderId: 'p1', history: [], acquisitionChannel: 'Indicação' },
  { id: 'c7', name: 'Juliana Costa', phone: '(11) 93333-4444', registrationDate: getDynamicDate(5), lastVisit: getDynamicDate(6), totalSpent: 120.00, status: 'Novo', assignedProviderId: 'p2', history: [], acquisitionChannel: 'Instagram' },
  { id: 'c8', name: 'Roberta Almeida', phone: '(11) 92222-5555', registrationDate: '2023-08-15', lastVisit: getDynamicDate(8), totalSpent: 1100.00, status: 'Regular', assignedProviderId: 'p3', history: [], acquisitionChannel: 'Google' },
  { id: 'c9', name: 'Fernanda Barbosa', phone: '(11) 91111-6666', registrationDate: '2022-12-01', lastVisit: getDynamicDate(10), totalSpent: 3200.00, status: 'VIP', assignedProviderId: 'p4', history: [], acquisitionChannel: 'Facebook' },
  { id: 'c10', name: 'Amanda Souza', phone: '(11) 90000-7777', registrationDate: getDynamicDate(12), lastVisit: getDynamicDate(12), totalSpent: 300.00, status: 'Risco de Churn', assignedProviderId: 'p5', history: [], acquisitionChannel: 'WhatsApp' },
  { id: 'c11', name: 'Beatriz Nogueira', phone: '(11) 99888-1111', registrationDate: getDynamicDate(12), lastVisit: getDynamicDate(12), totalSpent: 180.00, status: 'Novo', assignedProviderId: 'p1', history: [], acquisitionChannel: 'Passante' },
  { id: 'c12', name: 'Larissa Dias', phone: '(11) 99777-2222', registrationDate: '2023-06-15', lastVisit: getDynamicDate(14), totalSpent: 950.00, status: 'Regular', assignedProviderId: 'p2', history: [], acquisitionChannel: 'Instagram' },
  { id: 'c13', name: 'Sofia Mendes', phone: '(11) 99666-3333', registrationDate: '2023-10-10', lastVisit: getDynamicDate(18), totalSpent: 1400.00, status: 'VIP', assignedProviderId: 'p3', history: [], acquisitionChannel: 'Indicação' },
  { id: 'c14', name: 'Isabela Ribeiro', phone: '(11) 99555-4444', registrationDate: getDynamicDate(20), lastVisit: getDynamicDate(20), totalSpent: 400.00, status: 'Regular', assignedProviderId: 'p4', history: [], acquisitionChannel: 'Google' },
  { id: 'c15', name: 'Helena Carvalho', phone: '(11) 99444-5555', registrationDate: '2023-02-05', lastVisit: getDynamicDate(25), totalSpent: 2100.00, status: 'Risco de Churn', assignedProviderId: 'p5', history: [], acquisitionChannel: 'Instagram' }
];

// --- LEADS MOCK DATA ---
export const LEADS: Lead[] = [
  { id: 'l1', name: 'Camila (WhatsApp)', phone: '(11) 91234-5678', source: 'WhatsApp', status: 'NOVO', createdAt: getDynamicDate(0), updatedAt: getDynamicDate(0), serviceInterest: 'Alongamento' },
  { id: 'l2', name: 'Bruna Oliveira', phone: '(11) 99876-5432', source: 'Instagram', status: 'ATENDIMENTO', createdAt: getDynamicDate(-1), updatedAt: getDynamicDate(0), serviceInterest: 'Spa dos Pés' },
  { id: 'l3', name: 'Jessica Santos', phone: '(11) 95555-4444', source: 'Indicação', status: 'QUALIFICADO', createdAt: getDynamicDate(-2), updatedAt: getDynamicDate(-1), notes: 'Quer marcar para sábado' },
  { id: 'l4', name: 'Amanda Lima', phone: '(11) 93333-2222', source: 'WhatsApp', status: 'PROPOSTA', createdAt: getDynamicDate(-3), updatedAt: getDynamicDate(-1), value: 220 },
  { id: 'l5', name: 'Fernanda Tech', phone: '(11) 91111-0000', source: 'Google', status: 'PERDIDO', createdAt: getDynamicDate(-5), updatedAt: getDynamicDate(-4), lostReason: 'Preço alto' },
];

// --- MASSIVE APPOINTMENT GENERATION (DYNAMIC RELATIVE TO TODAY) ---
const generateAppointments = (): Appointment[] => {
  const appointments: Appointment[] = [];
  const now = new Date();

  // Helper to get YYYY-MM-DD
  const getDateStr = (d: Date) => d.toISOString().split('T')[0];

  const addDays = (d: Date, days: number) => {
    const newD = new Date(d);
    newD.setDate(d.getDate() + days);
    return newD;
  };

  const todayStr = getDateStr(now);

  // Helper to attach coupons randomly
  const getRandomCoupon = () => {
    const rand = Math.random();
    if (rand > 0.8) return 'LAURA10';
    if (rand > 0.6) return 'FITLIFE15';
    return undefined;
  };

  // Helper to get price
  const getPrice = (id: string) => SERVICES.find(s => s.id === id)?.price || 0;

  // --- STRESS TEST DATA (TODAY) ---
  // ~15 diverse transactions for rigorous cash testing

  // 1. Dinheiro - Valor Exato
  appointments.push({ id: 'stress-1', customerId: 'c1', providerId: 'p1', serviceId: 's1', date: todayStr, time: '08:00', status: 'Concluído', pricePaid: 45.00, bookedPrice: 45.00, commissionRateSnapshot: 0.6 });
  // 2. Pix - Valor Alto (Alongamento)
  appointments.push({ id: 'stress-2', customerId: 'c2', providerId: 'p4', serviceId: 's4', date: todayStr, time: '08:30', status: 'Concluído', pricePaid: 220.00, bookedPrice: 220.00, commissionRateSnapshot: 0.65 });
  // 3. Cartão - Spa dos Pés
  appointments.push({ id: 'stress-3', customerId: 'c3', providerId: 'p5', serviceId: 's3', date: todayStr, time: '09:00', status: 'Concluído', pricePaid: 90.00, bookedPrice: 90.00, commissionRateSnapshot: 0.6 });
  // 4. Dinheiro - Com Desconto (Cupom)
  appointments.push({ id: 'stress-4', customerId: 'c4', providerId: 'p2', serviceId: 's7', date: todayStr, time: '09:30', status: 'Concluído', pricePaid: 63.00, bookedPrice: 70.00, appliedCoupon: 'LAURA10', discountAmount: 7.00, commissionRateSnapshot: 0.65 });
  // 5. Pix - Mão Simples
  appointments.push({ id: 'stress-5', customerId: 'c5', providerId: 'p1', serviceId: 's1', date: todayStr, time: '10:00', status: 'Concluído', pricePaid: 45.00, bookedPrice: 45.00, commissionRateSnapshot: 0.6 });
  // 6. Cartão - Pé Simples
  appointments.push({ id: 'stress-6', customerId: 'c6', providerId: 'p3', serviceId: 's2', date: todayStr, time: '10:30', status: 'Concluído', pricePaid: 50.00, bookedPrice: 50.00, commissionRateSnapshot: 0.7 });
  // 7. Em Andamento (Não deve somar no realizado)
  appointments.push({ id: 'stress-7', customerId: 'c7', providerId: 'p2', serviceId: 's5', date: todayStr, time: '11:00', status: 'Em Andamento', bookedPrice: 140.00, commissionRateSnapshot: 0.65 });
  // 8. Cancelado (Não deve somar)
  appointments.push({ id: 'stress-8', customerId: 'c8', providerId: 'p1', serviceId: 's1', date: todayStr, time: '11:30', status: 'Cancelado', bookedPrice: 45.00, commissionRateSnapshot: 0.6 });
  // 9. Dinheiro - Pequeno Valor (Nail Art)
  appointments.push({ id: 'stress-9', customerId: 'c9', providerId: 'p2', serviceId: 's10', date: todayStr, time: '12:00', status: 'Concluído', pricePaid: 15.00, bookedPrice: 15.00, commissionRateSnapshot: 0.65 });
  // 10. Pix - Plástica dos Pés
  appointments.push({ id: 'stress-10', customerId: 'c10', providerId: 'p5', serviceId: 's9', date: todayStr, time: '13:00', status: 'Concluído', pricePaid: 150.00, bookedPrice: 150.00, commissionRateSnapshot: 0.6 });
  // 11. Cartão - Banho de Gel
  appointments.push({ id: 'stress-11', customerId: 'c11', providerId: 'p4', serviceId: 's6', date: todayStr, time: '14:00', status: 'Concluído', pricePaid: 120.00, bookedPrice: 120.00, commissionRateSnapshot: 0.65 });
  // 12. Dinheiro - Valor Quebrado (Simulado com desconto manual)
  appointments.push({ id: 'stress-12', customerId: 'c12', providerId: 'p3', serviceId: 's2', date: todayStr, time: '15:00', status: 'Concluído', pricePaid: 48.50, bookedPrice: 50.00, discountAmount: 1.50, commissionRateSnapshot: 0.7 });
  // 13. Pix - Combo (Manicure + Pedicure - simulado como 1 appt aqui, mas valor cheio)
  appointments.push({ id: 'stress-13', customerId: 'c13', providerId: 'p1', serviceId: 's1', date: todayStr, time: '16:00', status: 'Concluído', pricePaid: 95.00, bookedPrice: 95.00, combinedServiceNames: 'Mão + Pé', commissionRateSnapshot: 0.6 });
  // 14. Pendente (Confirmado mas não pago)
  appointments.push({ id: 'stress-14', customerId: 'c14', providerId: 'p2', serviceId: 's8', date: todayStr, time: '17:00', status: 'Confirmado', bookedPrice: 80.00, commissionRateSnapshot: 0.65 });
  // 15. Cartão - Remoção
  appointments.push({ id: 'stress-15', customerId: 'c15', providerId: 'p4', serviceId: 's12', date: todayStr, time: '18:00', status: 'Concluído', pricePaid: 50.00, bookedPrice: 50.00, commissionRateSnapshot: 0.65 });

  // --- REQUESTED EXTRA 20 APPOINTMENTS FOR TODAY (MIXED STATUS) ---
  for (let i = 0; i < 20; i++) {
    const hour = Math.floor(Math.random() * (19 - 8 + 1)) + 8; // 8h to 19h
    const minutes = Math.random() > 0.5 ? '00' : '30';
    const randomCustomer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    const randomProvider = PROVIDERS[Math.floor(Math.random() * 5)]; // First 5 active providers
    const randomService = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    const randomStatus = Math.random() > 0.5 ? 'Confirmado' : 'Pendente';

    appointments.push({
      id: `extra-today-${i}`,
      customerId: randomCustomer.id,
      providerId: randomProvider.id,
      serviceId: randomService.id,
      date: todayStr,
      time: `${String(hour).padStart(2, '0')}:${minutes}`,
      status: randomStatus,
      bookedPrice: randomService.price,
      commissionRateSnapshot: randomProvider.commissionRate,
      // Add coupon randomly
      appliedCoupon: Math.random() > 0.8 ? 'LAURA10' : undefined
    });
  }

  // --- HISTORY & FUTURE (Existing Logic) ---
  // 3. GENERATE HISTORY (Past 30 days)
  for (let i = 30; i > 0; i--) {
    const dateStr = getDateStr(addDays(now, -i));
    const dailyCount = Math.floor(Math.random() * 5) + 2;

    for (let j = 0; j < dailyCount; j++) {
      const prov = PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)];
      const serv = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const cust = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
      const hour = 9 + Math.floor(Math.random() * 10);

      appointments.push({
        id: `past-${i}-${j}`,
        customerId: cust.id,
        providerId: prov.id,
        serviceId: serv.id,
        date: dateStr,
        time: `${hour}:00`,
        status: Math.random() > 0.1 ? 'Concluído' : 'Cancelado',
        pricePaid: serv.price,
        bookedPrice: serv.price,
        commissionRateSnapshot: prov.commissionRate,
        appliedCoupon: getRandomCoupon()
      });
    }
  }

  // 4. GENERATE FUTURE (Next 30 days)
  for (let i = 1; i <= 30; i++) {
    const dateStr = getDateStr(addDays(now, i));
    const dayOfWeek = addDays(now, i).getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const dailyCount = isWeekend ? Math.floor(Math.random() * 6) + 4 : Math.floor(Math.random() * 4) + 1;

    for (let j = 0; j < dailyCount; j++) {
      const prov = PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)];
      const serv = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const cust = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
      const hour = 9 + Math.floor(Math.random() * 10);

      appointments.push({
        id: `fut-${i}-${j}`,
        customerId: cust.id,
        providerId: prov.id,
        serviceId: serv.id,
        date: dateStr,
        time: `${hour}:00`,
        status: Math.random() > 0.8 ? 'Pendente' : 'Confirmado',
        bookedPrice: serv.price,
        commissionRateSnapshot: prov.commissionRate,
        appliedCoupon: getRandomCoupon()
      });
    }
  }

  return appointments;
};

export const APPOINTMENTS: Appointment[] = generateAppointments();

// --- STOCK & SALES ---
export const STOCK: StockItem[] = [
  {
    id: 'st1', code: 'PROD001', name: 'Esmalte Vermelho Royal', category: 'Uso Interno', group: 'Cosméticos', subGroup: 'Esmaltes', quantity: 12, minQuantity: 5, unit: 'frasco', costPrice: 8.50,
    priceHistory: [], usageHistory: [{ id: 'log1', date: getDynamicDate(1), quantity: 2, type: 'USO_INTERNO', providerId: 'p1', note: 'Movimentado' }]
  },
  {
    id: 'st2', code: 'MAT002', name: 'Algodão Premium 500g', category: 'Uso Interno', group: 'Descartáveis', subGroup: 'Algodão', quantity: 4, minQuantity: 10, unit: 'pacote', costPrice: 15.90,
    priceHistory: [], usageHistory: [{ id: 'log3', date: getDynamicDate(2), quantity: 10, type: 'AJUSTE_ENTRADA', note: 'Compra Mensal' }]
  },
  {
    id: 'st3', code: 'MAT003', name: 'Acetona 1L', category: 'Uso Interno', group: 'Químicos', subGroup: 'Removedores', quantity: 8, minQuantity: 5, unit: 'litro', costPrice: 22.00, priceHistory: [], usageHistory: []
  },
  {
    id: 'st4', code: 'VEND004', name: 'Creme Hidratante Mãos', category: 'Venda', group: 'Cosméticos', subGroup: 'Cremes', quantity: 15, minQuantity: 5, unit: 'unidade', costPrice: 18.00, price: 45.90,
    priceHistory: [], usageHistory: []
  },
  {
    id: 'st5', code: 'VEND005', name: 'Óleo de Cutícula', category: 'Venda', group: 'Cosméticos', subGroup: 'Óleos', quantity: 8, minQuantity: 10, unit: 'unidade', costPrice: 12.50, price: 29.90,
    priceHistory: [], usageHistory: []
  },
  {
    id: 'st6', code: 'ROUPA001', name: 'Camiseta Logo Aminna P', category: 'Venda', group: 'Roupas', subGroup: 'Camisetas', quantity: 5, minQuantity: 2, unit: 'unidade', costPrice: 25.00, price: 59.90,
    priceHistory: [], usageHistory: []
  }
];

// DYNAMIC SALES DATA (Populated for current month view)
export const SALES: Sale[] = [
  // TODAY'S SALES FOR STRESS TEST
  { id: 'stress-s1', date: getDynamicDate(0), customerId: 'c1', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Dinheiro' },
  { id: 'stress-s2', date: getDynamicDate(0), customerId: 'c2', productId: 'st5', quantity: 2, unitPrice: 29.90, totalPrice: 59.80, paymentMethod: 'Cartão' },
  { id: 'stress-s3', date: getDynamicDate(0), customerId: 'c5', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Pix' },
  { id: 'stress-s4', date: getDynamicDate(0), customerId: 'c9', productId: 'st6', quantity: 1, unitPrice: 59.90, totalPrice: 59.90, paymentMethod: 'Dinheiro' },
  { id: 'stress-s5', date: getDynamicDate(0), customerId: 'c3', productId: 'st5', quantity: 1, unitPrice: 29.90, totalPrice: 29.90, paymentMethod: 'Cartão' },

  // PAST SALES
  { id: 's1', date: getDynamicDate(1), customerId: 'c1', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Pix' },
  { id: 's2', date: getDynamicDate(2), customerId: 'c5', productId: 'st5', quantity: 2, unitPrice: 29.90, totalPrice: 59.80, paymentMethod: 'Cartão' },
  { id: 's3', date: getDynamicDate(3), customerId: 'c9', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Dinheiro' },
  { id: 's4', date: getDynamicDate(5), customerId: 'c12', productId: 'st5', quantity: 1, unitPrice: 29.90, totalPrice: 29.90, paymentMethod: 'Pix' },
  { id: 's5', date: getDynamicDate(6), customerId: 'c3', productId: 'st4', quantity: 2, unitPrice: 45.90, totalPrice: 91.80, paymentMethod: 'Cartão' },
  { id: 's6', date: getDynamicDate(8), customerId: 'c1', productId: 'st5', quantity: 1, unitPrice: 29.90, totalPrice: 29.90, paymentMethod: 'Pix' },
  { id: 's7', date: getDynamicDate(9), customerId: 'c7', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Pix' },
  { id: 's8', date: getDynamicDate(10), customerId: 'c4', productId: 'st5', quantity: 1, unitPrice: 29.90, totalPrice: 29.90, paymentMethod: 'Cartão' },
  { id: 's9', date: getDynamicDate(11), customerId: 'c2', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Dinheiro' },
  { id: 's10', date: getDynamicDate(12), customerId: 'c8', productId: 'st5', quantity: 3, unitPrice: 29.90, totalPrice: 89.70, paymentMethod: 'Cartão' },
  { id: 's11', date: getDynamicDate(14), customerId: 'c6', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Pix' },
  { id: 's12', date: getDynamicDate(15), customerId: 'c13', productId: 'st5', quantity: 2, unitPrice: 29.90, totalPrice: 59.80, paymentMethod: 'Cartão' },
  { id: 's13', date: getDynamicDate(16), customerId: 'c14', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Dinheiro' },
  { id: 's14', date: getDynamicDate(18), customerId: 'c15', productId: 'st5', quantity: 1, unitPrice: 29.90, totalPrice: 29.90, paymentMethod: 'Pix' },
  { id: 's15', date: getDynamicDate(20), customerId: 'c10', productId: 'st4', quantity: 1, unitPrice: 45.90, totalPrice: 45.90, paymentMethod: 'Cartão' }
];

export const PARTNERS: Partner[] = [
  { id: 'part1', name: 'Laura Digital', socialMedia: '@laurainfluencer', category: 'Influenciadora', phone: '(11) 98888-0001', partnershipType: 'PERMUTA', active: true },
  { id: 'part2', name: 'Academia FitLife', socialMedia: '@fitlife_sp', category: 'Estabelecimento Local', phone: '(11) 3333-4444', partnershipType: 'PAGO', active: true },
  { id: 'part3', name: 'Blog da Nails', socialMedia: '@blog_nails_brasil', category: 'Blog/Mídia', phone: '(11) 97777-1111', partnershipType: 'PERMUTA', active: false }
];

export const CAMPAIGNS: Campaign[] = [
  { id: 'camp1', partnerId: 'part1', name: 'Lançamento Verão', couponCode: 'LAURA10', discountType: 'PERCENTAGE', discountValue: 10, startDate: getDynamicDate(1), useCount: 45, maxUses: 100, totalRevenueGenerated: 2500.00 },
  { id: 'camp2', partnerId: 'part2', name: 'Parceria Vizinhos', couponCode: 'FITLIFE15', discountType: 'FIXED', discountValue: 15, startDate: getDynamicDate(5), useCount: 12, maxUses: 20, totalRevenueGenerated: 980.00 }
];

// --- PANTRY MOCK DATA ---
export const PANTRY_ITEMS: PantryItem[] = [
  { id: 'pi1', name: 'Café Expresso', unit: 'cápsula', quantity: 80, minQuantity: 20, costPrice: 2.50, referencePrice: 0, category: 'Bebida' },
  { id: 'pi2', name: 'Água Mineral', unit: 'garrafa', quantity: 48, minQuantity: 12, costPrice: 1.20, referencePrice: 0, category: 'Bebida' },
  { id: 'pi3', name: 'Capuccino', unit: 'dose', quantity: 30, minQuantity: 10, costPrice: 3.00, referencePrice: 0, category: 'Bebida' },
  { id: 'pi4', name: 'Petit Four', unit: 'unidade', quantity: 100, minQuantity: 30, costPrice: 0.50, referencePrice: 0, category: 'Alimento' },
  { id: 'pi5', name: 'Espumante', unit: 'taça', quantity: 10, minQuantity: 5, costPrice: 8.00, referencePrice: 0, category: 'Bebida' }
];

export const PANTRY_LOGS: PantryLog[] = [
  { id: 'pl1', date: getDynamicDate(0), time: '09:15', itemId: 'pi1', quantity: 1, customerId: 'c1', providerId: 'p2', costAtMoment: 2.50, referenceAtMoment: 0 },
  { id: 'pl2', date: getDynamicDate(0), time: '10:30', itemId: 'pi2', quantity: 1, customerId: 'c5', providerId: 'p1', costAtMoment: 1.20, referenceAtMoment: 0 },
  { id: 'pl3', date: getDynamicDate(0), time: '14:00', itemId: 'pi1', quantity: 2, customerId: 'c2', providerId: 'p4', costAtMoment: 2.50, referenceAtMoment: 0 }
];