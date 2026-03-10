const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Danilo Souza\\Documents\\gestão-inteligente---aminna\\gestão-inteligente---aminna\\Aminna\\components\\Finance.tsx', 'utf8');
const lines = content.split('\n');
const line = lines[2918]; // 2919 is 0-indexed 2918
console.log('Line 2919:', JSON.stringify(line));
console.log('Char codes:', [...line].map(c => c.charCodeAt(0)));
