const fs = require('fs');
const file = 'c:/Users/Aminna/Documents/gestão-inteligente---aminna/gestão-inteligente---aminna/Aminna/components/BankReconciliation.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add _tempFingerprint to newExpenses
content = content.replace(
    /newExpenses\.push\(\{[\s\S]*?description: row\.description,/,
    (match) => match.replace('description: row.description,', '_tempFingerprint: row.fingerprint,\n                                    description: row.description,')
);
content = content.replace(
    /newExpenses\.push\(\{[\s\S]*?description: row\.description,/,
    (match) => match.replace('description: row.description,', '_tempFingerprint: row.fingerprint,\n                                description: row.description,')
);

// 2. Cut the newExpenses and newSales insert blocks
const expInsertStart = content.indexOf('if (newExpenses.length > 0) {');
let expInsertEnd = content.indexOf('if (newSales.length > 0) {', expInsertStart);
let salesInsertEnd = content.indexOf('if (updatesToExecute.length > 0) {', expInsertEnd);

const expInsertCode = content.substring(expInsertStart, expInsertEnd);
const salesInsertCode = content.substring(expInsertEnd, salesInsertEnd);

content = content.substring(0, expInsertStart) + content.substring(salesInsertEnd);

// 3. Paste them right after the FIRST loop ends
const firstLoopEnd = content.indexOf('const newBankTransactions: any[] = [];');
const newExpInsertCode = expInsertCode.replace(
    'setExpenses(prev => [...prev, ...data.map(d => ({',
    `data.forEach((insertedExp, idx) => {
                        const originalRow = finalRowsToProcess.find(r => r.fingerprint === newExpenses[idx]._tempFingerprint);
                        if (originalRow) {
                            originalRow.matchId = insertedExp.id;
                            originalRow.matchType = originalRow.type === 'RECEITA' ? 'RECEITA' : 'DESPESA';
                            originalRow.status = 'CONCILIADOS';
                        }
                    });
                    setExpenses(prev => [...prev, ...data.map(d => ({`
);

content = content.substring(0, firstLoopEnd) + newExpInsertCode + salesInsertCode + content.substring(firstLoopEnd);

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
