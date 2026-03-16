
const isDateInPeriodHypothesis = (dateStr) => {
    // Force dateStr (YYYY-MM-DD) to be interpreted as noon local time for consistent component extraction
    const d = new Date(dateStr + 'T12:00:00');
    console.log(`Input: ${dateStr}`);
    console.log(`Resulting Date object: ${d}`);
    console.log(`Month: ${d.getMonth()}`);
};

console.log("--- Appointment Date (YYYY-MM-DD) ---");
isDateInPeriodHypothesis("2026-03-15");

console.log("\n--- Sale Date (ISO String) ---");
isDateInPeriodHypothesis("2026-03-15T21:37:59.000Z");
