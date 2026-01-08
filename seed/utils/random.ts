import { faker } from '@faker-js/faker';

export function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function pickMultiple<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

export function generateRandomName(): { firstName: string; lastName: string } {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName()
  };
}

export function generateRandomEmail(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
  return `${base}@chickinho.com`;
}

export function generateRandomPhone(): string {
  return `+351 ${randomInt(900, 999)} ${randomInt(100, 999)} ${randomInt(100, 999)}`;
}

export function generateRandomAddress(): string {
  return faker.location.streetAddress() + ', ' + faker.location.city() + ', Portugal';
}

export function randomDateInRange(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

export function isPast(date: Date): boolean {
  return date < new Date();
}

export function isFuture(date: Date): boolean {
  return date > new Date();
}

