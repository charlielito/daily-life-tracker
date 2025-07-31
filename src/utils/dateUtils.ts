/**
 * Date utilities for handling local time storage without timezone conversion
 */

/**
 * Convert UTC timestamp back to local time for display
 * This is needed because we store local time components as UTC timestamps
 * to avoid timezone conversion issues.
 */
export function convertUTCToLocalDisplay(utcDate: Date | string): Date {
  const date = new Date(utcDate);
  // Create a new date using the UTC components as if they were local
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(), 
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
}

/**
 * Convert local time components to UTC timestamp for storage
 * This ensures the time stored in DB matches what user entered
 */
export function convertLocalToUTCForStorage(localDateTime: Date | string): Date {
  const inputDateTime = new Date(localDateTime);
  
  // Create a UTC date using local time components to avoid timezone shifts
  return new Date(Date.UTC(
    inputDateTime.getFullYear(),
    inputDateTime.getMonth(),
    inputDateTime.getDate(),
    inputDateTime.getHours(),
    inputDateTime.getMinutes(),
    inputDateTime.getSeconds(),
    inputDateTime.getMilliseconds()
  ));
} 

/**
 * Get the start of the day for a given date
 * This ensures the date is normalized to the start of the day in local timezone
 */
export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}