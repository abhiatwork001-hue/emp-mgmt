import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets a localized string from an object with translations.
 * Falls back to the default field if translations for the locale are missing.
 */
export function getLocalized(obj: any, field: string, locale: string = "en") {
  if (obj?.translations instanceof Map) {
    const trans = obj.translations.get(locale);
    if (trans && trans[field]) return trans[field];
  } else if (obj?.translations?.[locale]?.[field]) {
    return obj.translations[locale][field];
  }
  return obj?.[field] || "";
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '') // remove diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // replace spaces with -
    .replace(/[^\w-]+/g, '') // remove all non-word chars
    .replace(/--+/g, '-'); // replace multiple - with single -
}
