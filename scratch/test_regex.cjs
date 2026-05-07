const regex = /^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([-–—]?\s?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s+([-–—]?\s?\d{1,3}(?:\.\d{3})*,\d{2}))?\s*$/;

const lines = [
    "29/04/2026 PAGAMENTO PIX 05653523771 SUELEN ALVES VITAL -10.000,00 48.665,64",
    "29/04/2026 PAGAMENTO PIX 61086275000184 KEETA DELIVERY BRAZ -56,89 58.029,64",
    "29/04/2026 PAGAMENTO PIX 61086275000184 KEETA DELIVERY BRAZ –56,89 58.029,64", // En-dash
    "29/04/2026 PAGAMENTO PIX 61086275000184 KEETA DELIVERY BRAZ —56,89 58.029,64", // Em-dash
    "29/04/2026 PAGAMENTO PIX 61086275000184 KEETA DELIVERY BRAZ - 56,89 58.029,64", // Space after dash
    "01/04/2026 SICREDI DEBITO MASTER | SICREDI | 0001-41 818353618 2.555,98 74.769,51"
];

lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
        console.log(`Line: ${line}`);
        console.log(`  Date: ${match[1]}`);
        console.log(`  Desc: ${match[2]}`);
        
        const valueStr = match[3];
        const cleanValStr = valueStr.replace(/[–—]/g, '-').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(cleanValStr);
        
        console.log(`  Val1 (Raw): ${valueStr}`);
        console.log(`  Amount: ${amount}`);
        if (match[4]) console.log(`  Val2: ${match[4]}`);
    } else {
        console.log(`No match for: ${line}`);
    }
});
