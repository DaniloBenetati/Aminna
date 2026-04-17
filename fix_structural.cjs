const fs = require('fs');
const path = 'components/ServiceModal.tsx';
let content = fs.readFileSync(path, 'utf8').split(/\r?\n/);
console.log('Original length:', content.length);
// Line 4162 is index 4161
console.log('Removing line 4162:', content[4161]);
content.splice(4161, 1);
// Now line 4478 (original) is at index 4476. 
// We want to add a </div> after it.
content.splice(4477, 0, '    </div>');
fs.writeFileSync(path, content.join('\n'), 'utf8');
console.log('Fixed file saved.');
