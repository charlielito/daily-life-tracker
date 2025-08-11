/**
 * Calculate age from birth date as of today
 * @param birthDate - The user's birth date
 * @returns The calculated age as an integer
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // If birthday hasn't occurred yet this year, subtract 1 from age
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Validate that birth date is reasonable (not in the future, not too old)
 * @param birthDate - The birth date to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateBirthDate(birthDate: Date): { isValid: boolean; error?: string } {
  const today = new Date();
  
  // Check if birth date is in the future
  if (birthDate > today) {
    return { isValid: false, error: "Birth date cannot be in the future" };
  }
  
  // Check if birth date is too old (more than 120 years ago)
  const maxAge = 120;
  const minBirthYear = today.getFullYear() - maxAge;
  if (birthDate.getFullYear() < minBirthYear) {
    return { isValid: false, error: `Birth date cannot be more than ${maxAge} years ago` };
  }
  
  // Check if birth date is too recent (less than 10 years ago)
  const minAge = 10;
  const maxBirthYear = today.getFullYear() - minAge;
  if (birthDate.getFullYear() > maxBirthYear) {
    return { isValid: false, error: `Birth date cannot be less than ${minAge} years ago` };
  }
  
  return { isValid: true };
}

/**
 * Format birth date for display
 * @param birthDate - The birth date to format
 * @returns Formatted date string
 */
export function formatBirthDate(birthDate: Date): string {
  return birthDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
} 