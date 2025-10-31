/**
 * Configuration loading and validation
 * Handles file-based, inline JSON, and direct glob configuration formats
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { ConfigError } from './types.js';

/**
 * Server configuration interface
 *
 * Contains all settings needed for server operation including
 * policy file lists and response chunking configuration.
 *
 * @example
 * ```typescript
 * const config: ServerConfig = {
 *   files: [
 *     '/absolute/path/to/policies/policy-meta.md',
 *     '/absolute/path/to/policies/policy-system.md',
 *     '/absolute/path/to/policies/policy-application.md'
 *   ],
 *   baseDir: '/absolute/path/to/policies',
 *   maxChunkTokens: 10000
 * };
 * ```
 */
export interface ServerConfig {
  /**
   * Absolute file paths to all policy files
   *
   * Expanded from glob patterns and resolved to absolute paths.
   * All files must exist, be readable, and have .md extension.
   */
  files: string[];

  /**
   * Absolute path to policy directory
   *
   * Resolved from MCP_POLICY_CONFIG location.
   * All policy file paths are resolved relative to this directory.
   */
  baseDir: string;

  /**
   * Maximum tokens per response chunk
   *
   * Large responses are split at section boundaries to stay
   * within this limit. Rough estimate: 1 token ≈ 4 characters.
   *
   * @default 10000
   */
  maxChunkTokens?: number;
}

/**
 * Structure of policies.json file
 */
interface PoliciesManifestFile {
  files: string[]; // Array of glob patterns or paths
}

/**
 * Expand glob patterns to absolute file paths
 *
 * Uses fast-glob to expand patterns. Deduplicates results.
 * Logs warnings for zero-match patterns. Fatal error if final list is empty.
 *
 * @param patterns - Glob patterns or file paths
 * @param baseDir - Base directory for relative path resolution
 * @returns Absolute file paths after expansion and deduplication
 * @throws {ConfigError} If final file list is empty or glob expansion fails
 */
function expandGlobs(patterns: string[], baseDir: string): string[] {
  const allFiles: string[] = [];

  for (const pattern of patterns) {
    try {
      // Resolve pattern relative to baseDir
      const resolvedPattern = path.isAbsolute(pattern)
        ? path.normalize(pattern)
        : path.resolve(baseDir, pattern);

      // Convert Windows backslashes to forward slashes for fast-glob compatibility
      const normalizedPattern = resolvedPattern.replace(/\\/g, '/');

      // Expand glob pattern
      const matches = fg.sync(normalizedPattern, {
        dot: false,
        followSymbolicLinks: true,
        onlyFiles: true,
        absolute: true,
      });

      if (matches.length === 0) {
        console.error(`  Warning: Pattern "${pattern}" matched 0 files`);
      }
      allFiles.push(...matches);
    } catch (error) {
      throw new ConfigError(
        `Glob expansion failed for pattern "${pattern}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Deduplicate using Set
  const uniqueFiles = Array.from(new Set(allFiles));
  const duplicateCount = allFiles.length - uniqueFiles.length;

  if (duplicateCount > 0) {
    console.error(`  Removed ${duplicateCount} duplicate paths after expansion`);
  }

  if (uniqueFiles.length === 0) {
    throw new ConfigError(
      `No policy files found after glob expansion. Patterns: ${patterns.join(', ')}`
    );
  }

  return uniqueFiles;
}

/**
 * Validate that all files exist, are readable, and have .md extension
 *
 * Symlinks are followed. Target must meet all requirements.
 *
 * @param files - Absolute file paths to validate
 * @throws {ConfigError} If any file fails validation
 */
function validateFiles(files: string[]): void {
  for (const file of files) {
    // Check existence
    if (!fs.existsSync(file)) {
      throw new ConfigError(`Policy file does not exist: ${file}`);
    }

    // Get file stats (follows symlinks per spec line 256)
    let stats: fs.Stats;
    try {
      stats = fs.statSync(file);
    } catch (error) {
      throw new ConfigError(
        `Cannot access policy file "${file}": ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check it's a regular file (not directory)
    if (!stats.isFile()) {
      throw new ConfigError(`Policy file is not a regular file: ${file}`);
    }

    // Check .md extension (case-sensitive per spec line 256, even on Windows)
    if (!file.endsWith('.md')) {
      throw new ConfigError(`Policy file must have .md extension: ${file}`);
    }

    // Check readability
    try {
      fs.accessSync(file, fs.constants.R_OK);
    } catch {
      throw new ConfigError(`Policy file is not readable: ${file}`);
    }
  }
}

/**
 * Load configuration from policies.json, inline JSON, or direct glob
 *
 * Supports three configuration formats detected in this order:
 * 1. Ends with .json → load as file-based config (fatal if not exists)
 * 2. Starts with { AND ends with } → parse as inline JSON (fatal if invalid)
 * 3. Otherwise → treat as direct glob pattern
 *
 * If MCP_POLICY_CONFIG not set → default to ./policies.json from working directory
 *
 * @param configPath - Path to policies.json (for testing), overrides MCP_POLICY_CONFIG
 * @returns Server configuration with expanded file paths
 * @throws {ConfigError} If configuration is missing, invalid, or files fail validation
 *
 * @example
 * ```typescript
 * // Load from MCP_POLICY_CONFIG environment variable
 * const config = loadConfig();
 *
 * // Load from custom location (testing)
 * const testConfig = loadConfig('/custom/path/policies.json');
 * ```
 */
export function loadConfig(configPath?: string): ServerConfig {
  // Step 1: Get config value
  // Priority: configPath param (testing) > MCP_POLICY_CONFIG env var > default ./policies.json (spec line 240)
  const configValue = configPath ?? process.env.MCP_POLICY_CONFIG ?? './policies.json';

  let manifest: PoliciesManifestFile;
  let baseDir: string;
  let configSource: string;

  // Step 2: Detect format and load files array
  if (configValue.endsWith('.json')) {
    // Format 1: File-based configuration
    const resolvedPath = path.isAbsolute(configValue)
      ? configValue
      : path.resolve(process.cwd(), configValue);

    if (!fs.existsSync(resolvedPath)) {
      throw new ConfigError(`Policy configuration file not found: ${resolvedPath}`);
    }

    try {
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      manifest = JSON.parse(fileContent);
    } catch (error) {
      throw new ConfigError(
        `Failed to parse policies manifest at ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    baseDir = path.dirname(resolvedPath);
    configSource = resolvedPath;
  } else if (configValue.startsWith('{') && configValue.endsWith('}')) {
    // Format 2: Inline JSON configuration
    try {
      manifest = JSON.parse(configValue);
    } catch (error) {
      throw new ConfigError(
        `Failed to parse inline JSON configuration (detected by { } delimiters): ${error instanceof Error ? error.message : String(error)}`
      );
    }

    baseDir = process.cwd();
    configSource = 'MCP_POLICY_CONFIG (inline JSON)';
  } else {
    // Format 3: Direct glob pattern
    manifest = { files: [configValue] };
    baseDir = process.cwd();
    configSource = `MCP_POLICY_CONFIG (direct glob: "${configValue}")`;
  }

  // Step 3: Log configuration loading
  console.error('Policy server configuration loaded:');
  console.error(`  Source: ${configSource}`);
  console.error(`  Base directory: ${baseDir}`);
  console.error(`  Patterns: ${manifest.files.length} configured`);

  // Step 4: Expand globs to absolute file paths
  const expandedFiles = expandGlobs(manifest.files, baseDir);

  console.error(`  Files: ${expandedFiles.length} total after expansion`);

  // Step 5: Validate files
  validateFiles(expandedFiles);

  // Step 6: Return ServerConfig
  return {
    files: expandedFiles,
    baseDir,
    maxChunkTokens: 10000,
  };
}

/**
 * Validate configuration for required fields and constraints
 *
 * Ensures configuration contains all required fields with valid values:
 * - files must be non-empty array
 * - baseDir must be non-empty string
 * - maxChunkTokens must be positive number if present
 *
 * @param config - Configuration object to validate
 * @throws {ConfigError} If validation fails
 *
 * @example
 * ```typescript
 * const config: ServerConfig = {
 *   files: ['/path/to/policy.md'],
 *   baseDir: '/path/to'
 * };
 * validateConfiguration(config); // Passes
 *
 * const badConfig: ServerConfig = {
 *   files: [],
 *   baseDir: ''
 * };
 * validateConfiguration(badConfig); // Throws ConfigError
 * ```
 */
export function validateConfiguration(config: ServerConfig): void {
  if (!config.files || !Array.isArray(config.files)) {
    throw new ConfigError('Configuration missing required field: files (must be array)');
  }

  if (config.files.length === 0) {
    throw new ConfigError('Configuration error: files array is empty');
  }

  if (!config.baseDir || typeof config.baseDir !== 'string') {
    throw new ConfigError('Configuration missing required field: baseDir');
  }

  // Validate maxChunkTokens if present
  if (
    config.maxChunkTokens !== undefined &&
    (typeof config.maxChunkTokens !== 'number' || config.maxChunkTokens <= 0)
  ) {
    throw new ConfigError('Configuration error: maxChunkTokens must be a positive number');
  }
}
