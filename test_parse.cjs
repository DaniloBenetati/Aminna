const text = `25/06/2026 PAGAMENTO PIX 07049713309 Kellen Silva de Sousa PIX_DEB -50,00 11.595,48
26/06/2026 LIQUIDACAO DE PARCELA C56930575 -3.854,31 7.741,17
26/06/2026 SICREDI DEBITO MASTER |0001-41 853884777 1.075,41 8.816,58`;
const datePattern = /(\d{2}\/\d{2}\/\d{4})/g;
const allMatches = Array.from(text.matchAll(datePattern));
const currencyRegex = /(?:[R$\+\s]*[-–—]?\s?\d{1,3}(?:\.\d{3})*,\d{2})/g;
for (let i = 0; i < allMatches.length; i++) {
    const start = allMatches[i].index;
    const end = (i + 1 < allMatches.length) ? allMatches[i + 1].index : text.length;
    const block = text.substring(start, end).replace(/\n/g, ' ').trim();
    const dateStr = allMatches[i][0];
    const rest = block.substring(dateStr.length).trim();
    const currencyMatches = Array.from(rest.matchAll(currencyRegex));
    if (currencyMatches.length > 0) {
        const valueStr = currencyMatches[0][0];
        const cleanValStr = valueStr.replace(/[R$+\s]/g, '').replace(/[–—]/g, '-').replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(cleanValStr);
        console.log(dateStr, amount);
    }
}
