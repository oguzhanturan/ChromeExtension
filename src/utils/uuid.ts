// Simple UUID v4 generator using crypto API
export function generateUUID(): string {
  return crypto.randomUUID();
}
