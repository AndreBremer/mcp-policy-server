/**
 * Section validator - ensures policy section IDs are unique across all files
 * Validates section uniqueness during server startup to prevent ambiguous references
 */

import * as fs from 'fs';
import * as path from 'path';
import { ServerConfig } from './config.js';
import { ValidationResult, SectionNotation } from './types.js';

/**
 * Extract all section IDs from a policy file
 *
 * Scans policy file content for section markers in {§PREFIX.N} format
 * and returns array of section IDs with § prefix. Used during validation
 * to identify duplicate sections across policy files.
 *
 * @param filePath - Absolute path to policy file
 * @returns Array of section IDs (e.g., ["§META.1", "§META.2"])
 *
 * @example
 * ```typescript
 * const sections = extractSectionIDs('/path/to/policy-meta.md');
 * // Returns: ['§META.1', '§META.2', '§META.3']
 * ```
 */
export function extractSectionIDs(filePath: string): SectionNotation[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sectionPattern = /\{§([A-Z]+(?:-[A-Z]+)*)\.(\d+(?:\.\d+)*)\}/g;
  const ids: SectionNotation[] = [];
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(content)) !== null) {
    ids.push(`§${match[1]}.${match[2]}` as SectionNotation);
  }

  return ids;
}

/**
 * Validate section uniqueness across all policy files
 *
 * Scans all policy files defined in configuration and checks for
 * duplicate section IDs. Returns validation result indicating success
 * or failure with details about which sections are duplicated.
 *
 * Logs warnings to console.error for missing policy files but continues
 * validation. Returns ValidationResult with errors array if duplicates found.
 *
 * @param config - Configuration object with stems mapping
 * @param baseDir - Base directory containing policy files
 * @returns Validation result with errors if duplicates detected
 *
 * @example
 * ```typescript
 * const config: ServerConfig = {
 *   policyFolder: 'policies/',
 *   stems: { META: 'policy-meta', APP: 'policy-application' }
 * };
 * const result = validateSectionUniqueness(config, '/path/to/vault/policies');
 * if (!result.valid) {
 *   console.error(formatDuplicateErrors(result.errors!));
 * }
 * ```
 */
export function validateSectionUniqueness(config: ServerConfig, baseDir: string): ValidationResult {
  const sectionMap = new Map<string, string[]>(); // section ID -> array of files

  // Process each policy file
  for (const [prefix, stem] of Object.entries(config.stems)) {
    const filePath = path.join(baseDir, `${stem}.md`);

    if (!fs.existsSync(filePath)) {
      console.error(`[WARN] validateSectionUniqueness: ${filePath} not found (prefix ${prefix})`);
      continue;
    }

    const sectionIDs = extractSectionIDs(filePath);

    for (const sectionID of sectionIDs) {
      if (!sectionMap.has(sectionID)) {
        sectionMap.set(sectionID, []);
      }
      sectionMap.get(sectionID)!.push(stem);
    }
  }

  // Check for duplicates
  const duplicates: Array<{ section: string; files: string[] }> = [];
  for (const [sectionID, files] of Array.from(sectionMap.entries())) {
    if (files.length > 1) {
      duplicates.push({ section: sectionID, files });
    }
  }

  if (duplicates.length > 0) {
    return { valid: false, errors: duplicates };
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
