/**
 * Generate a fake Portuguese NIF (Número de Identificação Fiscal)
 * Format: 9 digits, with check digit
 */
export function generatePortugueseNIF(): string {
  // Generate 8 random digits
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  
  // Calculate check digit (simplified algorithm)
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i]) * (9 - i);
  }
  const checkDigit = sum % 11;
  const finalCheck = checkDigit < 2 ? 0 : 11 - checkDigit;
  
  return `${digits}${finalCheck}`;
}

