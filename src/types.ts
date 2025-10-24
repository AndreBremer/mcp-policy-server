/**
 * Core type definitions for policy server
 * Defines interfaces, types, and error classes used throughout the system
 */

/**
 * Parsed section notation without file resolution
 *
 * Represents a section reference that has been parsed but not yet
 * resolved to a specific policy file. The file property is null
 * until resolution occurs via configuration lookup.
 *
 * @example
 * ```typescript
 * const parsed: ParsedSection = {
 *   prefix: 'APP',
 *   section: '7',
 *   file: null
 * };
 * ```
 */
export interface ParsedSection {
  /**
   * Policy prefix identifying the documentation layer
   * Base prefixes: META, SYS, APP, USER
   * Extended prefixes: APP-HOOK, APP-PLG, APP-TPL, SYS-TPL
   */
  prefix: string;

  /**
   * Section number, possibly nested
   * Examples: "7", "4.1", "2.3.1"
   */
  section: string;

  /**
   * Policy file path, null when not yet resolved
   * Becomes string after file discovery completes
   */
  file: string | null;
}

/**
 * Fully resolved section with content
 *
 * Extends ParsedSection with the original notation, resolved file path,
 * and extracted content. Used after successful section extraction.
 *
 * @example
 * ```typescript
 * const resolved: ResolvedSection = {
 *   notation: '§APP.7',
 *   prefix: 'APP',
 *   section: '7',
 *   file: 'policy-application.md',
 *   content: '## {§APP.7}...'
 * };
 * ```
 */
export interface ResolvedSection extends ParsedSection {
  /**
   * Original section notation with § symbol
   * Examples: "§APP.7", "§META.1", "§SYS.5.2"
   */
  notation: string;

  /**
   * Policy file path (narrows null to string)
   * File is guaranteed to be resolved for this interface
   */
  file: string;

  /**
   * Extracted section content from policy file
   * Includes section header and all content up to next section marker
   */
  content: string;
}

/**
 * Section notation type with § prefix
 *
 * Template literal type enforcing § prefix followed by uppercase
 * prefix and numeric section identifier.
 *
 * @example
 * ```typescript
 * const valid: SectionNotation = '§APP.7';     // Valid
 * const valid2: SectionNotation = '§META.2.3'; // Valid
 * const invalid: SectionNotation = 'APP.7';    // Type error - missing §
 * ```
 */
export type SectionNotation = `§${string}.${string}`;

/**
 * Gathered section with all required fields
 *
 * Used in resolver Map to store sections during recursive resolution.
 * Similar to ResolvedSection but without notation field and with
 * stricter guarantees that all fields are populated.
 *
 * @example
 * ```typescript
 * const gathered: GatheredSection = {
 *   prefix: 'APP',
 *   section: '7',
 *   file: 'policy-application.md',
 *   content: '## {§APP.7}...'
 * };
 * ```
 */
export interface GatheredSection {
  /**
   * Policy prefix (META, SYS, APP, USER, APP-HOOK, etc.)
   */
  prefix: string;

  /**
   * Section number (7, 4.1, 2.3.1, etc.)
   */
  section: string;

  /**
   * Resolved policy file path
   * Guaranteed to be a valid file path string
   */
  file: string;

  /**
   * Extracted section content
   * Guaranteed to be non-empty after successful extraction
   */
  content: string;
}

/**
 * Validation result for section uniqueness checks
 *
 * Returned by validation functions to indicate success or failure
 * with details about duplicate section IDs across policy files.
 *
 * @example
 * ```typescript
 * // Success case
 * const success: ValidationResult = { valid: true };
 *
 * // Failure case with duplicate sections
 * const failure: ValidationResult = {
 *   valid: false,
 *   errors: [
 *     { section: '§APP.7', files: ['policy-application.md', 'policy-app-extra.md'] }
 *   ]
 * };
 * ```
 */
export interface ValidationResult {
  /**
   * Whether all sections are unique across policy files
   */
  valid: boolean;

  /**
   * Array of duplicate section errors
   * Only present when valid is false
   */
  errors?: Array<{
    /** Section ID that appears multiple times */
    section: string;
    /** Files containing the duplicate section */
    files: string[];
  }>;
}

/**
 * Configuration error exception
 *
 * Thrown when configuration files are missing, malformed,
 * or contain invalid values. Used during server startup
 * and configuration loading.
 *
 * @example
 * ```typescript
 * throw new ConfigError('Policy configuration not found: .claude/policy-config.json');
 * ```
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Section not found error exception
 *
 * Thrown when a requested section cannot be located in any
 * discovered policy file. Indicates either invalid section
 * reference or missing documentation.
 *
 * @example
 * ```typescript
 * throw new SectionNotFoundError(
 *   'Section not found: §APP.99 in policy-application.md'
 * );
 * ```
 */
export class SectionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SectionNotFoundError';
    Object.setPrototypeOf(this, SectionNotFoundError.prototype);
  }
}

/**
 * Validation error exception
 *
 * Thrown when section validation fails, such as duplicate
 * section IDs across policy files or invalid section format.
 *
 * @example
 * ```typescript
 * throw new ValidationError(
 *   'Duplicate section §APP.7 found in policy-application.md and policy-app-extra.md'
 * );
 * ```
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
