const fs = require('fs');

const filePath = 'c:\\Users\\Aminna\\Documents\\gestão-inteligente---aminna\\gestão-inteligente---aminna\\Aminna\\components\\Agenda.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let original = content;

// Replace rounding classes
content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-sm');
content = content.replace(/rounded-\[2rem\]/g, 'rounded-sm');
content = content.replace(/rounded-\[1\.5rem\]/g, 'rounded-sm');
content = content.replace(/rounded-\[1rem\]/g, 'rounded-sm');
content = content.replace(/rounded-3xl/g, 'rounded-sm');
content = content.replace(/rounded-2xl/g, 'rounded-sm');
content = content.replace(/rounded-xl/g, 'rounded-sm');
content = content.replace(/rounded-lg/g, 'rounded-sm');
content = content.replace(/rounded-md/g, 'rounded-sm');

if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Modified Agenda.tsx');
} else {
    console.log('No changes made to Agenda.tsx');
}
