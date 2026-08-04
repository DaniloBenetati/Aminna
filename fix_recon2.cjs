const fs = require('fs');
const file = 'c:/Users/Aminna/Documents/gestão-inteligente---aminna/gestão-inteligente---aminna/Aminna/components/BankReconciliation.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: DESPESA existingExp
content = content.replace(
    /if \(existingExp\) \{\s*toUpdateExpenseStatus\.push\(existingExp\.id\);\s*updatesToExecute\.push\(\{ type: 'EXPENSE', id: existingExp\.id, date: row\.date \}\);\s*\} else if \(row\.suggestedProvider\) \{/,
    `if (existingExp) {
                                toUpdateExpenseStatus.push(existingExp.id);
                                updatesToExecute.push({ type: 'EXPENSE', id: existingExp.id, date: row.date });
                                row.matchId = existingExp.id;
                                row.matchType = 'DESPESA';
                                row.status = 'CONCILIADOS';
                            } else if (row.suggestedProvider) {`
);

// Fix 2: RECEITA existingExp
content = content.replace(
    /if \(existingExp\) \{\s*toUpdateExpenseStatus\.push\(existingExp\.id\);\s*updatesToExecute\.push\(\{ type: 'EXPENSE', id: existingExp\.id, date: row\.date \}\);\s*\} else if \(row\.suggestedProvider\) \{/,
    `if (existingExp) {
                            toUpdateExpenseStatus.push(existingExp.id);
                            updatesToExecute.push({ type: 'EXPENSE', id: existingExp.id, date: row.date });
                            row.matchId = existingExp.id;
                            row.matchType = 'RECEITA';
                            row.status = 'CONCILIADOS';
                        } else if (row.suggestedProvider) {`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
