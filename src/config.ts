/**
 * Configuration loading and validation
 * Handles single-file configuration system for policy server
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigError } from './types.js';

/**
 * Server configuration interface
 *
 * Contains all settings needed for server operation including
 * prefix mappings and policy directory location.
 *
 * @example
 * ```typescript
 * const config: ServerConfig = {
 *   stems: {
 *     META: 'policy-meta',
 *     SYS: 'policy-system',
 *     APP: 'policy-application',
 *     USER: 'policy-user'
 *   },
 *   baseDir: '/absolute/path/to/policies',
 *   maxChunkTokens: 10000
 * };
 * ```
 */
export interface ServerConfig {
  /**
   * Prefix-to-stem mapping for policy file discovery
   *
   * Maps policy prefixes (META, SYS, APP, USER) to file stems.
   * File stems are combined with .md extension to find policy files.
   *
   * @example
   * ```typescript
   * stems: {
   *   META: 'policy-meta',    // Resolves to policy-meta.md
   *   APP: 'policy-application' // Resolves to policy-application.md
   * }
   * ```
   */
  stems: Record<string, string>;

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
 * Policy file mapping interface
 *
 * Maps a prefix to its stem and discovered policy files.
 * Used for file discovery when handling extended prefixes
 * (APP-HOOK, APP-PLG, etc.) that map to multiple files.
 *
 * Not currently used but defined for Phase 2 implementation.
 *
 * @example
 * ```typescript
 * const mapping: PolicyFileMapping = {
 *   prefix: 'APP',
 *   stem: 'policy-application',
 *   files: ['policy-application.md', 'policy-application-hooks.md']
 * };
 * ```
 */
export interface PolicyFileMapping {
  /**
   * Base prefix (META, SYS, APP, USER)
   */
  prefix: string;

  /**
   * File stem without extension
   */
  stem: string;

  /**
   * Discovered policy files for this prefix
   * Includes base file and extension files matching {stem}-*.md
   */
  files: string[];
}

/**
 * Structure of policies.json file
 */
interface PoliciesManifestFile {
  prefixes: Record<string, string>;
}

/**
 * Load configuration from policies.json
 *
 * Loads policies.json specified by MCP_POLICY_CONFIG environment variable.
 * The policy directory is determined from the location of policies.json.
 *
 * @param configPath - Path to policies.json (for testing), overrides MCP_POLICY_CONFIG
 * @returns Server configuration
 * @throws {ConfigError} If configuration file is missing or invalid
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
  // Determine config file path: explicit parameter or MCP_POLICY_CONFIG env var
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const policiesPath = configPath || process.env.MCP_POLICY_CONFIG;

  if (!policiesPath) {
    throw new ConfigError(
      'MCP_POLICY_CONFIG environment variable must be set to the absolute path of policies.json'
    );
  }

  // Load policies.json
  if (!fs.existsSync(policiesPath)) {
    throw new ConfigError(`Policy configuration not found: ${policiesPath}`);
  }

  let policiesManifest: PoliciesManifestFile;
  try {
    const fileContent = fs.readFileSync(policiesPath, 'utf8');
    policiesManifest = JSON.parse(fileContent);
  } catch (error) {
    throw new ConfigError(
      `Failed to parse policies manifest at ${policiesPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Policy directory is the directory containing policies.json
  const baseDir = path.dirname(policiesPath);

  // Build configuration
  const config: ServerConfig = {
    stems: policiesManifest.prefixes,
    baseDir,
    maxChunkTokens: 8000,
  };

  // Validate before returning
  validateConfiguration(config);

  return config;
}

/**
 * Validate configuration for required fields and constraints
 *
 * Ensures configuration contains all required fields with valid values:
 * - stems must be non-empty object with string values
 * - baseDir must be non-empty string
 *
 * @param config - Configuration object to validate
 * @throws {ConfigError} If validation fails
 *
 * @example
 * ```typescript
 * const config: ServerConfig = {
 *   stems: { APP: 'policy-application' },
 *   baseDir: '/absolute/path/to/policies'
 * };
 * validateConfiguration(config); // Passes
 *
 * const badConfig: ServerConfig = {
 *   stems: {},
 *   baseDir: ''
 * };
 * validateConfiguration(badConfig); // Throws ConfigError
 * ```
 */
export function validateConfiguration(config: ServerConfig): void {
  if (!config.stems || typeof config.stems !== 'object') {
    throw new ConfigError('Configuration missing required field: stems (from policies.json)');
  }

  if (Object.keys(config.stems).length === 0) {
    throw new ConfigError('Configuration error: stems mapping is empty');
  }

  // Validate stems contains only string values
  for (const [prefix, stem] of Object.entries(config.stems)) {
    if (typeof stem !== 'string' || stem.length === 0) {
      throw new ConfigError(`Configuration error: invalid stem value for prefix ${prefix}`);
    }
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
