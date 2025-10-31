/**
 * Section validator - validates policy sections using prebuilt index
 * All validation work is done during index build; this module just returns duplicates
 */

import { SectionIndex, ValidationResult } from './types.js';

/**
 * Validates sections using the prebuilt index
 *
 * Simply returns duplicates from index.duplicates Map.
 * All validation work is done during index build.
 *
 * @param index - The section index to validate
 * @returns Validation result with duplicates
 *
 * @example
 * ```typescript
 * const result = validateFromIndex(index);
 * if (!result.valid) {
 *   console.error(formatDuplicateErrors(result.errors!));
 * }
 * ```
 */
export function validateFromIndex(index: SectionIndex): ValidationResult {
  // Convert index.duplicates Map to ValidationResult format
  const errors: Array<{ section: string; files: string[] }> = [];

  for (const [section, files] of index.duplicates.entries()) {
    errors.push({ section, files });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Format duplicate section errors for user display
 *
 * Converts validation errors into human-readable multi-line string
 * listing each duplicate section and the files where it appears.
 * Used for displaying validation failures to users or in logs.
 *
 * @param errors - Array of duplicate section errors from validation
 * @returns Formatted error message string with newlines
 *
 * @example
 * ```typescript
 * const errors = [
 *   { section: '§APP.7', files: ['policy-application', 'policy-app-extra'] }
 * ];
 * const message = formatDuplicateErrors(errors);
 * // Returns:
 * // "Duplicate section IDs detected:
 * //   §APP.7 appears in: policy-application, policy-app-extra"
 * ```
 */
export function formatDuplicateErrors(errors: Array<{ section: string; files: string[] }>): string {
  const lines = ['Duplicate section IDs detected:'];
  for (const { section, files } of errors) {
    lines.push(`  ${section} appears in: ${files.join(', ')}`);
  }
  return lines.join('\n');
}
