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
 * Excludes section markers inside code blocks (backticks and fenced blocks)
 * to avoid false positives from example code in documentation. Also excludes
 * TOC references (wiki-link format) by only matching section markers that
 * appear in actual markdown headers (## or ###).
 *
 * **Important:** This filtering only applies to validation. Section extraction
 * (parser.extractSection) preserves all content including code blocks.
 *
 * @param filePath - Absolute path to policy file
 * @returns Array of section IDs (e.g., ["§META.1", "§META.2"])
 *
 * @example
 * ```typescript
 * const sections = extractSectionIDs('/path/to/policy-meta.md');
 * // Returns: ['§META.1', '§META.2', '§META.3']
 * // (Ignores examples in code blocks and TOC links)
 * ```
 */
export function extractSectionIDs(filePath: string): SectionNotation[] {
  const content = fs.readFileSync(filePath, 'utf8');

  // Remove all code blocks (inline and fenced) before scanning for section markers
  // This prevents section markers in example code from being treated as real sections
  let cleanedContent = content;

  // Remove fenced code blocks with proper fence length matching
  // Must match closing fence with same or more backticks as opening fence
  // Process from longest to shortest to handle nested fences correctly
  // Pattern accounts for optional language identifier after opening fence
  // Also handles unclosed fenced blocks (common when scanning full files)
  for (let tickCount = 10; tickCount >= 3; tickCount--) {
    const ticks = '`'.repeat(tickCount);
    // Match: ```[optional-language]\n content \n``` OR ```[optional-language]\n content (until end)
    const fencePattern = new RegExp(`${ticks}[^\\n]*\\n[\\s\\S]*?(?:\\n${ticks}|$)`, 'g');
    cleanedContent = cleanedContent.replace(fencePattern, '');
  }

  // Remove inline code blocks (`...`)
  cleanedContent = cleanedContent.replace(/`[^`]*`/g, '');

  // Match section markers that appear in markdown headers (## or ###)
  // This ensures we only find actual section definitions, not TOC references
  // Pattern: Line starts with ##/###, followed by {§PREFIX.N}, then optional title
  const headerPattern = /^##+ \{§([A-Z]+(?:-[A-Z]+)*)\.(\d+(?:\.\d+)*)\}/gm;
  const ids: SectionNotation[] = [];
  let match: RegExpExecArray | null;

  while ((match = headerPattern.exec(cleanedContent)) !== null) {
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
