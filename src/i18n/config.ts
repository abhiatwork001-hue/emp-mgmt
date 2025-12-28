export const locales = ['en', 'pt', 'de'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
