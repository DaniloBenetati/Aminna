function parseLineRobust(line) {
    const dateRegex = /^(\d{2}\/\d{2}\/\d{4})\s+/;
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) return null;

    const dateStr = dateMatch[1];
    const rest = line.substring(dateMatch[0].length);

    // Find all currency-like blocks: optionally starting with R$, +, -, etc.
    const currencyRegex = /(?:[R$\+\s]*[-–—]?\s?\d{1,3}(?:\.\d{3})*,\d{2})/g;
    const matches = Array.from(rest.matchAll(currencyRegex));

    if (matches.length === 0) return null;

    let description, amountStr, balanceStr;

    if (matches.length === 1) {
        amountStr = matches[0][0];
        description = rest.substring(0, matches[0].index).trim();
    } else {
        // Assume first is amount, last is balance
        amountStr = matches[0][0];
        balanceStr = matches[matches.length - 1][0];
        description = rest.substring(0, matches[0].index).trim();
    }

    return { dateStr, description, amountStr, balanceStr };
}

const lines = [
    "29/04/2026 PAGAMENTO PIX 05653523771 SUELEN ALVES VITAL -10.000,00 48.665,64",
    "29/04/2026 PAGAMENTO PIX 61086275000184 KEETA DELIVERY BRAZ -56,89 58.029,64",
    "01/04/2026 SICREDI DEBITO MASTER | SICREDI | 0001-41 818353618 2.555,98 74.769,51",
    "01/04/2026 TEST WITH RS R$ 1.234,56 + R$ 5.000,00"
];

lines.forEach(line => {
    console.log(`Line: ${line}`);
    console.log(JSON.stringify(parseLineRobust(line), null, 2));
});
