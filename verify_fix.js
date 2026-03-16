
const isDateInPeriodFixed = (dateStr) => {
    // Take only the date part YYYY-MM-DD to avoid issues with full ISO strings
    const cleanDate = dateStr.split('T')[0];
    const d = new Date(cleanDate + 'T12:00:00');
    console.log(`Input: ${dateStr}`);
    console.log(`Clean Date: ${cleanDate}`);
    console.log(`Resulting Date object: ${d}`);
    console.log(`Month: ${d.getMonth()}`);
};

console.log("--- Appointment Date (YYYY-MM-DD) ---");
isDateInPeriodFixed("2026-03-15");

console.log("\n--- Sale Date (ISO String) ---");
isDateInPeriodFixed("2026-03-15T21:37:59.000Z");
