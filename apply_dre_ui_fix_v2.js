const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Danilo Souza', 'Documents', 'gestão-inteligente---aminna', 'gestão-inteligente---aminna', 'Aminna', 'components', 'Finance.tsx');

console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: Services visibility
const regex1 = /!\s*dreData\s*\.\s*isClosed\s*&&\s*\(\s*<>/;
if (regex1.test(content)) {
    console.log('Found match 1');
    content = content.replace(regex1, '(dreData.revenueServices > 0 || !dreData.isClosed) && (<>');
} else {
    console.log('Match 1 NOT found');
}

// Replacement 2: Bank Revenue visibility (Cartão/PIX)
const regex2 = /dreData\s*\.\s*isClosed\s*&&\s*dreData\s*\.\s*reconciledBankRevenues\s*>\s*0\s*&&\s*\(/;
if (regex2.test(content)) {
    console.log('Found match 2');
    content = content.replace(regex2, 'dreData.reconciledBankRevenues > 0 && (');
} else {
    console.log('Match 2 NOT found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update attempt finished');
