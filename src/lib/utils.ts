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
