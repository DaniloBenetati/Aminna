const fs = require('fs');
const path = require('path');

const filesToProcess = [
    'c:\\Users\\Aminna\\Documents\\gestão-inteligente---aminna\\gestão-inteligente---aminna\\Aminna\\components\\Dashboard.tsx',
    'c:\\Users\\Aminna\\Documents\\gestão-inteligente---aminna\\gestão-inteligente---aminna\\Aminna\\components\\InstagramMetrics.tsx',
    'c:\\Users\\Aminna\\Documents\\gestão-inteligente---aminna\\gestão-inteligente---aminna\\Aminna\\components\\InstagramOrganic.tsx'
];

filesToProcess.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace rounding classes
        content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-sm');
        content = content.replace(/rounded-\[2rem\]/g, 'rounded-sm');
        content = content.replace(/rounded-3xl/g, 'rounded-sm');
        content = content.replace(/rounded-2xl/g, 'rounded-sm');
        content = content.replace(/rounded-xl/g, 'rounded-sm');
        content = content.replace(/rounded-lg/g, 'rounded-sm');
        content = content.replace(/rounded-md/g, 'rounded-sm');
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Processed ${path.basename(filePath)}`);
    } else {
        console.log(`File not found: ${filePath}`);
    }
});
