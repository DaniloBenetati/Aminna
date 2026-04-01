const fs = require('fs');
const path = 'C:\\Users\\Danilo Souza\\.gemini\\antigravity\\brain\\dba237f6-d649-41db-a060-3e5949127cb6\\.system_generated\\steps\\207\\output.txt';

if (!fs.existsSync(path)) {
    console.error('File not found:', path);
    process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const data = JSON.parse(content).result;
const startIdx = data.indexOf('[');
const endIdx = data.lastIndexOf(']');
const apps = JSON.parse(data.substring(startIdx, endIdx + 1));

let totalComm = 0;
let totalBase = 0;
const providerId = '1bc89211-f17c-42e9-be9f-d8b9bdeabeca';

apps.forEach(a => {
    let appTotalBase = 0;
    const isRemakeApp = a.payment_method === 'Refazer' || a.is_remake === true;

    // Main service
    if (a.provider_id === providerId) {
        // Calculate main base: booked_price - extras (sum of bookedPrices in additional_services)
        let totalBooked = parseFloat(a.booked_price || '0');
        let extrasSum = 0;
        if (a.additional_services) {
            const extras = typeof a.additional_services === 'string' ? JSON.parse(a.additional_services) : a.additional_services;
            extras.forEach(e => {
                extrasSum += parseFloat(e.bookedPrice || '0');
            });
        }
        let mainBase = totalBooked - extrasSum;
        if (isRemakeApp) mainBase = 0;
        if (mainBase < 0) mainBase = 0; // sanity
        
        appTotalBase += mainBase;
        // console.log(`[Main] Appt: ${a.id}, Base: ${mainBase}`);
    }

    // Additional services
    if (a.additional_services) {
        const extras = typeof a.additional_services === 'string' ? JSON.parse(a.additional_services) : a.additional_services;
        extras.forEach(e => {
            if (e.providerId === providerId) {
                let extraBase = parseFloat(e.bookedPrice || '0');
                if (e.isRemake === true || isRemakeApp) extraBase = 0;
                appTotalBase += extraBase;
                // console.log(`[Extra] Appt: ${a.id}, Base: ${extraBase}`);
            }
        });
    }

    totalBase += appTotalBase;
    totalComm += appTotalBase * 0.4;
});

console.log('--- Summary for Cleiciane (March 15-31) ---');
console.log('Total Commissionable Revenue (Base):', totalBase.toFixed(2));
console.log('Total Commission (40%):', totalComm.toFixed(2));
console.log('Calculated with 10.00 Tip:', (totalComm + 10).toFixed(2));
