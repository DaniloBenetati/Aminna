
const isDateInPeriodFixed = (dateStr) => {
    const cleanDate = dateStr.split('T')[0];
    const d = new Date(cleanDate + 'T12:00:00');
    return `${dateStr} -> month: ${d.getMonth()}`;
};

console.log(isDateInPeriodFixed("2026-03-15"));
console.log(isDateInPeriodFixed("2026-03-15T21:37:59.000Z"));
