import { addDays, addWeeks, startOfWeek, endOfWeek, format, getWeek } from 'date-fns';

export function getWeekNumber(date: Date): number {
  return getWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

export function addWeeksToDate(date: Date, weeks: number): Date {
  return addWeeks(date, weeks);
}

export function formatDate(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
  return format(date, formatStr);
}

export function getDateRangeForWeek(year: number, weekNumber: number): { startDate: Date; endDate: Date } {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
  const weekStart = addDays(jan4, (weekNumber - 1) * 7 - (jan4Day - 1));
  
  return {
    startDate: getWeekStart(weekStart),
    endDate: getWeekEnd(weekStart)
  };
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function isPast(date: Date): boolean {
  return date < new Date();
}

export function isFuture(date: Date): boolean {
  return date > new Date();
}

export function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

