const fs = require('fs');
const path = require('path');

const componentsDir = 'c:\\Users\\Aminna\\Documents\\gestão-inteligente---aminna\\gestão-inteligente---aminna\\Aminna\\components';

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    let count = 0;
    
    files.forEach(file => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile() && fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
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
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Processed ${file}`);
                count++;
            }
        }
    });
    
    return count;
}

const totalProcessed = processDirectory(componentsDir);
console.log(`\nTotal files processed: ${totalProcessed}`);
