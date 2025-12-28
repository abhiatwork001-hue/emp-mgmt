export function getEaster(year: number): Date {
    const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);

    return new Date(year, month - 1, day);
}

export function getPortugalHolidays(year: number): Date[] {
    const easter = getEaster(year);

    // Good Friday: 2 days before Easter
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);

    // Corpus Christi: 60 days after Easter
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);

    const fixedHolidays = [
        new Date(year, 0, 1),   // New Year
        new Date(year, 3, 25),  // Freedom Day
        new Date(year, 4, 1),   // Labor Day
        new Date(year, 5, 10),  // Portugal Day
        new Date(year, 7, 15),  // Assumption
        new Date(year, 9, 5),   // Republic Day
        new Date(year, 10, 1),  // All Saints
        new Date(year, 11, 1),  // Restoration of Independence
        new Date(year, 11, 8),  // Immaculate Conception
        new Date(year, 11, 25), // Christmas
    ];

    return [
        easter,
        goodFriday,
        corpusChristi,
        ...fixedHolidays
    ];
}

export function isPortugalHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const holidays = getPortugalHolidays(year);

    return holidays.some(h =>
        h.getDate() === date.getDate() &&
        h.getMonth() === date.getMonth() &&
        h.getFullYear() === date.getFullYear()
    );
}

export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

export function calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const curDate = new Date(startDate);
    const end = new Date(endDate);

    // Normalize to start of day needed? 
    // Usually input dates should be normalized. We'll assume they are.

    while (curDate <= end) {
        if (!isWeekend(curDate) && !isPortugalHoliday(curDate)) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}
