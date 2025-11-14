import { format, FormatOptions } from "date-fns";
import { Locale } from "date-fns";

/**
 * Formats a date with locale support and capitalizes the first letter of each word
 */
export function formatDate(
  date: Date | number,
  formatStr: string,
  options?: FormatOptions & { locale?: Locale }
): string {
  const formatted = format(date, formatStr, options);
  
  // Capitalize the first letter of each word
  // Match start of string or after space/comma, followed by a letter
  // This handles cases like "domingo, enero 14, 2024" -> "Domingo, Enero 14, 2024"
  // and "miércoles" -> "Miércoles" (not "MiéRcoles")
  return formatted.replace(/(^|\s|,)([a-záéíóúñü])/gi, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  });
}

