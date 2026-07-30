const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ServiceModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const helperCode = `
// Helper to build financial ledger updates
const buildCustomerFinancialUpdate = (
    customer: Customer,
    creditAdj: number,
    outstandingAdj: number,
    apptId: string,
    reason: string
) => {
    const updatePayload: any = {};
    let creditHistory = customer.creditHistory || [];
    let debtHistory = customer.debtHistory || [];
    let newCreditBal = customer.creditBalance || 0;
    let newDebtBal = customer.outstandingBalance || 0;

    if (creditAdj !== 0) {
        newCreditBal = Math.max(0, newCreditBal + creditAdj);
        updatePayload.credit_balance = newCreditBal;
        updatePayload.credit_history = [{
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            action: creditAdj > 0 ? 'ADD' : 'USE',
            amount: creditAdj,
            balanceAfter: newCreditBal,
            reason: reason,
            appointmentId: apptId
        }, ...creditHistory];
    } else {
        updatePayload.credit_balance = newCreditBal;
    }

    if (outstandingAdj !== 0) {
        newDebtBal = Math.max(0, newDebtBal + outstandingAdj);
        updatePayload.outstanding_balance = newDebtBal;
        updatePayload.debt_history = [{
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            action: outstandingAdj > 0 ? 'ADD' : 'PAY',
            amount: outstandingAdj,
            balanceAfter: newDebtBal,
            reason: reason,
            appointmentId: apptId
        }, ...debtHistory];
    } else {
        updatePayload.outstanding_balance = newDebtBal;
    }

    return updatePayload;
};
`;

if (!content.includes('buildCustomerFinancialUpdate')) {
    content = content.replace('const isCompleted = (status?: string) => status?.includes(\'Conclu\');', 'const isCompleted = (status?: string) => status?.includes(\'Conclu\');\n' + helperCode);
}

// 1. Line ~1325
content = content.replace(
    /outstanding_balance:\s*Math\.max\(0,\s*\(customer\.outstandingBalance\s*\|\|\s*0\)\s*\+\s*outstandingAdjustment\),\s*status:\s*customer\.status\s*===\s*'Novo'\s*\?\s*'Regular'\s*:\s*customer\.status,\s*credit_balance:\s*Math\.max\(0,\s*\(customer\.creditBalance\s*\|\|\s*0\)\s*\+\s*creditAdjustment\)/g,
    `status: customer.status === 'Novo' ? 'Regular' : customer.status,
                ...buildCustomerFinancialUpdate(customer, creditAdjustment, outstandingAdjustment, savedAppt.id, 'Atendimento (Checkout)')`
);

// 2. Line ~1505, ~2020, ~2450
content = content.replace(
    /outstanding_balance:\s*Math\.max\(0,\s*\(customer\.outstandingBalance\s*\|\|\s*0\)\s*\+\s*outstandingAdjustment\),\s*credit_balance:\s*Math\.max\(0,\s*\(customer\.creditBalance\s*\|\|\s*0\)\s*\+\s*creditAdjustment\)/g,
    `...buildCustomerFinancialUpdate(customer, creditAdjustment, outstandingAdjustment, appointment.id, 'Atendimento (Modificação)')`
);

// 3. Cancellation Reversion (outstanding_balance: newOutstandingBalance)
content = content.replace(
    /credit_balance:\s*newCreditBalance,\s*total_spent:\s*newTotalSpent,\s*outstanding_balance:\s*newOutstandingBalance/g,
    `total_spent: newTotalSpent,
                        ...buildCustomerFinancialUpdate(customer, newCreditBalance - (customer.creditBalance || 0), newOutstandingBalance - (customer.outstandingBalance || 0), appointment.id, 'Atendimento (Cancelamento)')`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ServiceModal.tsx');
