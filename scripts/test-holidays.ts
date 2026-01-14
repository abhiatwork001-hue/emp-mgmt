
const { calculateWorkingDays } = require("../src/lib/holidays");

const cases = [
    { start: "2026-01-01", end: "2026-01-05", expected: 2 }, // Jan 1 (Hol), 2 (Fri), 3/4 (Wk), 5 (Mon) -> 2 days (2, 5)
    { start: "2026-01-01", end: "2026-01-01", expected: 0 }, // Holiday
    { start: "2026-01-02", end: "2026-01-02", expected: 1 }, // Friday
    { start: "2026-08-01", end: "2026-08-10", expected: 5 }, // Random range check
];

console.log("Testing calculateWorkingDays...");

cases.forEach(c => {
    const s = new Date(c.start);
    const e = new Date(c.end);
    const res = calculateWorkingDays(s, e);
    console.log(`${c.start} to ${c.end}: Got ${res}, Expected ${c.expected}. ${res === c.expected ? "PASS" : "FAIL"}`);
});
