
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('all-appts.json', 'utf8'));
const patricia = data.filter(a => a.customers && a.customers.name === 'Patricia Prata');
console.log(JSON.stringify(patricia, null, 2));
