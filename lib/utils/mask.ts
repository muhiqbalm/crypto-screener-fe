/**
 * Masks a passphrase by replacing all but the last 4 characters with bullet
 * characters (•). Implements Requirement 8.3.
 *
 * Examples:
 *   maskPassphrase("abcdefgh")  → "••••efgh"
 *   maskPassphrase("abc")       → "abc"   (≤4 chars → no masking)
 *   maskPassphrase("")          → ""
 */
export function maskPassphrase(p: string): string {
  const visibleCount = 4
  const maskCount = Math.max(0, p.length - visibleCount)
  return '•'.repeat(maskCount) + p.slice(-visibleCount)
}
