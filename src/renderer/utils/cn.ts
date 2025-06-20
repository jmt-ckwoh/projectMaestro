/**
 * Class Name Utility
 * 
 * Utility for conditionally joining class names together.
 * A lightweight alternative to clsx/classnames.
 */

export type ClassValue = string | number | boolean | undefined | null | ClassValue[]

/**
 * Combines class names conditionally
 * 
 * @param classes - Array of class values (strings, booleans, etc.)
 * @returns Combined class string
 */
export function cn(...classes: ClassValue[]): string {
  const result: string[] = []

  for (const cls of classes) {
    if (cls) {
      if (typeof cls === 'string') {
        result.push(cls)
      } else if (typeof cls === 'number') {
        result.push(String(cls))
      } else if (Array.isArray(cls)) {
        const nested = cn(...cls)
        if (nested) {
          result.push(nested)
        }
      }
    }
  }

  return result.join(' ')
}