/**
 * Section resolver - automatically resolves all § reference chains
 * Handles recursive reference resolution, file discovery, and section gathering
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  getBasePrefix,
  parseSectionNotation,
  extractSection,
  findEmbeddedReferences,
  expandRange,
  isParentSection,
  sortSections,
} from './parser.js';
import { ServerConfig } from './config.js';
import { ParsedSection, GatheredSection, SectionNotation } from './types.js';

/**
 * Get the base directory for policy files from configuration
 *
 * @deprecated This function is no longer needed. Use config.baseDir directly.
 * Kept for backward compatibility with tests.
 *
 * @param config - Server configuration containing resolved baseDir
 * @returns Absolute path to policy directory
 *
 * @example
 * ```typescript
 * const config = loadConfig();
 * const baseDir = getBaseDir(config); // Returns config.baseDir
 * ```
 */
export function getBaseDir(config?: ServerConfig): string {
  if (config?.baseDir) {
    return config.baseDir;
  }

  // Fallback for tests that don't provide config
  // From dist/ up to project root, then to test fixtures
  return path.join(__dirname, '..', '..', 'tests', 'fixtures', 'sample-policies');
}

/**
 * Discover policy file(s) for a given prefix using configuration stems
 *
 * Searches for base file and extension files matching the configured stem.
 * Supports extended prefixes (APP-HOOK, APP-PLG, etc.) by extracting base
 * prefix before stem lookup. Returns all matching files for comprehensive
 * section search.
 *
 * File discovery pattern:
 * - Base file: {stem}.md (e.g., policy-application.md)
 * - Extension files: {stem}-*.md (e.g., policy-application-hooks.md)
 *
 * @param prefix - Policy prefix (META, SYS, APP, USER, APP-HOOK, etc.)
 * @param config - Server configuration with stems mapping
 * @returns Array of relative file paths (e.g., ["policy-application.md", "policy-application-hooks.md"])
 * @throws {Error} When prefix unknown or no files found for stem
 *
 * @example
 * ```typescript
 * const config = { stems: { APP: 'policy-application' } };
 *
 * // Base prefix returns base + extension files
 * discoverPolicyFiles('APP', config)
 * // Returns: ['policy-application.md', 'policy-application-hooks.md']
 *
 * // Extended prefix extracts base before lookup
 * discoverPolicyFiles('APP-HOOK', config)
 * // Returns: ['policy-application.md', 'policy-application-hooks.md']
 * ```
 */
export function discoverPolicyFiles(
  prefix: string,
  config: ServerConfig,
  baseDir: string | null = null
): string[] {
  // Extract base prefix for hyphenated extensions (APP-HOOK → APP, SYS-TPL → SYS)
  const basePrefix = getBasePrefix(prefix);

  const stem = config.stems[basePrefix];
  if (!stem) {
    throw new Error(
      `Unknown prefix: ${basePrefix} (from ${prefix}). Valid prefixes: ${Object.keys(config.stems).join(', ')}`
    );
  }

  // Use provided baseDir parameter or config.baseDir
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const effectiveBaseDir = baseDir || config.baseDir;
  const files: string[] = [];

  // Always include base file
  const baseFile = `${stem}.md`;
  const baseFilePath = path.join(effectiveBaseDir, baseFile);
  if (fs.existsSync(baseFilePath)) {
    files.push(baseFile);
  }

  // Check for extension files matching pattern: {stem}-*.md
  const dirContents = fs.readdirSync(effectiveBaseDir);

  for (const file of dirContents) {
    if (file.startsWith(`${stem}-`) && file.endsWith('.md')) {
      files.push(file);
    }
  }

  if (files.length === 0) {
    throw new Error(`No policy files found for prefix: ${basePrefix} (stem: ${stem})`);
  }

  return files;
}

/**
 * Legacy function for backward compatibility - returns first discovered file
 *
 * Calls discoverPolicyFiles and returns first result. Maintained for backward
 * compatibility with code expecting single file path. New code should use
 * discoverPolicyFiles for full extension support.
 *
 * @deprecated Use discoverPolicyFiles for full extension support
 * @param prefix - Policy prefix (META, SYS, APP, USER, APP-HOOK, etc.)
 * @param config - Server configuration with stems mapping
 * @param baseDir - Base directory for policy files, defaults to getBaseDir()
 * @returns First discovered policy file path
 * @throws {Error} When prefix unknown or no files found
 *
 * @example
 * ```typescript
 * const config = { stems: { APP: 'policy-application' } };
 * discoverPolicyFile('APP', config)
 * // Returns: 'policy-application.md' (first file only)
 * ```
 */
export function discoverPolicyFile(
  prefix: string,
  config: ServerConfig,
  baseDir: string | null = null
): string {
  const files = discoverPolicyFiles(prefix, config, baseDir);
  return files[0];
}

/**
 * Resolve section notation to file path
 *
 * Parses section notation and discovers first matching policy file.
 * Returns combined object with parsed section data and file path.
 * Uses deprecated discoverPolicyFile internally for backward compatibility.
 *
 * @param notation - Section notation (§APP.7, §META.1, etc.)
 * @param config - Server configuration with stems mapping
 * @param baseDir - Base directory for policy files, defaults to getBaseDir()
 * @returns Parsed section with resolved file path
 * @throws {Error} When notation invalid or prefix unknown
 *
 * @example
 * ```typescript
 * const config = { stems: { APP: 'policy-application' } };
 * resolveSection('§APP.7', config)
 * // Returns: { prefix: 'APP', section: '7', file: 'policy-application.md' }
 * ```
 */
export function resolveSection(
  notation: string,
  config: ServerConfig,
  baseDir: string | null = null
): ParsedSection {
  const parsed = parseSectionNotation(notation);
  const file = discoverPolicyFile(parsed.prefix, config, baseDir);
  return { ...parsed, file };
}

/**
 * Recursively gather all sections including embedded references
 *
 * Core recursive resolution function that:
 * 1. Extracts requested sections from policy files
 * 2. Finds § references in extracted content
 * 3. Queues referenced sections for extraction
 * 4. Repeats until no new references found
 * 5. Removes parent-child duplicates (§APP.4 supersedes §APP.4.1)
 *
 * Returns Map with section notation as key and gathered section data
 * as value. Sections are not sorted - use sortSections on keys for ordering.
 *
 * Parent-child deduplication ensures whole sections take precedence:
 * - If §APP.4 already processed, §APP.4.1 is skipped (child of parent)
 * - If §APP.4.1 processed first, then §APP.4 added, §APP.4.1 is removed
 *
 * @param initialSections - Starting section notations (may include ranges)
 * @param config - Server configuration with stems mapping
 * @param baseDir - Base directory for policy files, defaults to getBaseDir()
 * @returns Map of section notation to gathered section data
 * @throws {Error} When section not found in any discovered policy file
 *
 * @example
 * ```typescript
 * const config = { stems: { APP: 'policy-application', META: 'policy-meta' } };
 *
 * // Single section with no embedded references
 * gatherSections(['§APP.7'], config)
 * // Returns: Map { '§APP.7' => { prefix: 'APP', section: '7', file: '...', content: '...' } }
 *
 * // Section with embedded § reference to §META.2
 * gatherSections(['§APP.7'], config)
 * // Returns: Map with both §APP.7 and §META.2 entries
 *
 * // Parent-child deduplication
 * gatherSections(['§APP.4', '§APP.4.1'], config)
 * // Returns: Map with only §APP.4 (parent supersedes child)
 * ```
 */
export function gatherSections(
  initialSections: string[],
  config: ServerConfig,
  baseDir: string | null = null
): Map<string, GatheredSection> {
  // Use provided baseDir parameter or config.baseDir
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const effectiveBaseDir = baseDir || config.baseDir;

  const gathered = new Map<string, GatheredSection>();
  const queue: string[] = [...initialSections];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const notation = queue.shift();
    if (!notation) continue;

    if (processed.has(notation)) continue;

    // Check if any already-processed section is a parent of this one
    let hasParent = false;
    for (const existing of Array.from(processed)) {
      if (isParentSection(existing as SectionNotation, notation as SectionNotation)) {
        hasParent = true;
        break;
      }
    }
    if (hasParent) continue;

    // Check if this section is a parent of any already-processed sections
    const childrenToRemove: string[] = [];
    for (const existing of Array.from(processed)) {
      if (isParentSection(notation as SectionNotation, existing as SectionNotation)) {
        childrenToRemove.push(existing);
      }
    }
    for (const child of childrenToRemove) {
      processed.delete(child);
      gathered.delete(child);
    }

    processed.add(notation);

    const parsed = parseSectionNotation(notation);

    // Discover all policy files for this prefix (base + extensions)
    const policyFiles = discoverPolicyFiles(parsed.prefix, config, effectiveBaseDir);

    // Search across all discovered files for the section
    let content: string | null = null;
    let foundInFile: string | null = null;

    for (const file of policyFiles) {
      const filePath = path.join(effectiveBaseDir, file);

      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const extracted = extractSection(filePath, parsed.prefix, parsed.section);
        if (extracted && extracted.trim().length > 0) {
          content = extracted;
          foundInFile = file;
          break; // Found it, stop searching
        }
      } catch {
        // Section not in this file, try next
        continue;
      }
    }

    if (!content || content.trim().length === 0) {
      throw new Error(`Section not found: ${notation} in ${policyFiles.join(', ')}`);
    }

    if (!foundInFile) {
      throw new Error(`Section found but file tracking failed: ${notation}`);
    }

    gathered.set(notation, {
      prefix: parsed.prefix,
      section: parsed.section,
      file: foundInFile,
      content,
    });

    // Find embedded references in extracted content
    const embedded = findEmbeddedReferences(content);
    // Expand any range notation in embedded references
    const expandedEmbedded = embedded.flatMap((ref) => expandRange(ref));
    for (const ref of expandedEmbedded) {
      if (!processed.has(ref) && !queue.includes(ref)) {
        queue.push(ref);
      }
    }
  }

  return gathered;
}

/**
 * Fetch and combine sections with separators (always resolves embedded § references)
 *
 * High-level function that gathers all sections (including recursive references),
 * sorts them by prefix and section number, then combines content with '---'
 * separators. Primary function for retrieving formatted policy content.
 *
 * @param sections - Section notations (may include ranges like §APP.4.1-3)
 * @param config - Server configuration with stems mapping
 * @returns Combined section content with '---' separators
 * @throws {Error} When any section not found
 *
 * @example
 * ```typescript
 * const config = { stems: { APP: 'policy-application', META: 'policy-meta' } };
 *
 * // Single section
 * fetchSections(['§APP.7'], config)
 * // Returns: "## {§APP.7}\n[content]"
 *
 * // Multiple sections with separator
 * fetchSections(['§APP.7', '§META.2'], config)
 * // Returns: "## {§META.2}\n[content]\n---\n\n## {§APP.7}\n[content]"
 *
 * // Range notation expanded automatically
 * fetchSections(['§APP.4.1-3'], config)
 * // Returns: "[§APP.4.1 content]\n---\n\n[§APP.4.2 content]\n---\n\n[§APP.4.3 content]"
 * ```
 */
export function fetchSections(sections: string[], config: ServerConfig): string {
  // config.baseDir is already the full path to the policy directory
  const gathered = gatherSections(sections, config, config.baseDir);

  const sortedNotations = sortSections(Array.from(gathered.keys()) as SectionNotation[]);

  const parts: string[] = [];
  for (const notation of sortedNotations) {
    const section = gathered.get(notation);
    if (section) {
      parts.push(section.content);
    }
  }

  // Join sections without adding separators - sections already have trailing separators in the markdown
  return parts.join('\n');
}

/**
 * Resolve section locations (always resolves embedded § references)
 *
 * Returns mapping of policy files to sorted section arrays. Useful for
 * understanding which sections come from which files after recursive
 * resolution completes.
 *
 * @param sections - Section notations (may include ranges)
 * @param config - Server configuration with stems mapping
 * @returns Map of policy file to array of section notations (sorted)
 * @throws {Error} When any section not found
 *
 * @example
 * ```typescript
 * const config = { stems: { APP: 'policy-application', META: 'policy-meta' } };
 *
 * resolveSectionLocations(['§APP.7', '§META.2', '§APP.4'], config)
 * // Returns: {
 * //   'policy-application.md': ['§APP.4', '§APP.7'],
 * //   'policy-meta.md': ['§META.2']
 * // }
 * ```
 */
export function resolveSectionLocations(
  sections: string[],
  config: ServerConfig
): Record<string, string[]> {
  // config.baseDir is already the full path to the policy directory
  const gathered = gatherSections(sections, config, config.baseDir);

  // Group by file: { file -> [notations] }
  const fileMap: Record<string, string[]> = {};
  for (const [notation, data] of Array.from(gathered.entries())) {
    if (!fileMap[data.file]) {
      fileMap[data.file] = [];
    }
    fileMap[data.file].push(notation);
  }

  // Sort files and their notation arrays
  const sortedResult: Record<string, string[]> = {};
  const sortedFiles = Object.keys(fileMap).sort();

  for (const file of sortedFiles) {
    sortedResult[file] = sortSections(fileMap[file] as SectionNotation[]);
  }

  return sortedResult;
}
