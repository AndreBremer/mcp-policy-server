/**
 * Comprehensive tests for validator.ts
 * Tests all 3 exported functions with >80% coverage target
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  extractSectionIDs,
  validateSectionUniqueness,
  formatDuplicateErrors,
} from '../src/validator';
import { ServerConfig } from '../src/config';

// Fixture directory paths (absolute)
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'sample-policies');
const META_POLICY = path.join(FIXTURES_DIR, 'policy-meta.md');
const APP_POLICY = path.join(FIXTURES_DIR, 'policy-app.md');
const HOOKS_POLICY = path.join(FIXTURES_DIR, 'policy-app-hooks.md');
const EMPTY_POLICY = path.join(FIXTURES_DIR, 'policy-empty.md');
const DUPLICATE1_POLICY = path.join(FIXTURES_DIR, 'policy-duplicate1.md');
const SUBSECTIONS_POLICY = path.join(FIXTURES_DIR, 'policy-subsections.md');
const HYPHENATED_POLICY = path.join(FIXTURES_DIR, 'policy-hyphenated.md');

// Default config properties for tests
const DEFAULT_BASE_DIR = FIXTURES_DIR;

describe('validator', () => {
  describe('extractSectionIDs', () => {
    it('should extract section IDs from policy file with multiple sections', () => {
      const sectionIDs = extractSectionIDs(META_POLICY);
      expect(sectionIDs).toEqual(['§META.1', '§META.2', '§META.2.1']);
      expect(sectionIDs).toHaveLength(3);
    });

    it('should extract section IDs from application policy file', () => {
      const sectionIDs = extractSectionIDs(APP_POLICY);
      expect(sectionIDs).toContain('§APP.1');
      expect(sectionIDs).toContain('§APP.4');
      expect(sectionIDs).toContain('§APP.4.1');
      expect(sectionIDs).toContain('§APP.4.2');
      expect(sectionIDs).toContain('§APP.4.3');
      expect(sectionIDs).toContain('§APP.7');
      expect(sectionIDs).toContain('§APP.8');
      expect(sectionIDs).toHaveLength(7);
    });

    it('should extract hyphenated prefix section IDs', () => {
      const sectionIDs = extractSectionIDs(HOOKS_POLICY);
      expect(sectionIDs).toContain('§APP-HOOK.1');
      expect(sectionIDs).toContain('§APP-HOOK.2');
      expect(sectionIDs).toHaveLength(2);
    });

    it('should extract deeply nested subsection IDs', () => {
      const sectionIDs = extractSectionIDs(SUBSECTIONS_POLICY);
      expect(sectionIDs).toContain('§SUB.1');
      expect(sectionIDs).toContain('§SUB.1.1');
      expect(sectionIDs).toContain('§SUB.1.2');
      expect(sectionIDs).toContain('§SUB.1.2.1');
      expect(sectionIDs).toContain('§SUB.2');
      expect(sectionIDs).toContain('§SUB.2.1');
      expect(sectionIDs).toHaveLength(6);
    });

    it('should extract mixed hyphenated prefix section IDs', () => {
      const sectionIDs = extractSectionIDs(HYPHENATED_POLICY);
      expect(sectionIDs).toContain('§SYS-TPL.1');
      expect(sectionIDs).toContain('§SYS-TPL.2');
      expect(sectionIDs).toContain('§SYS-TPL.2.1');
      expect(sectionIDs).toContain('§APP-PLG.1');
      expect(sectionIDs).toHaveLength(4);
    });

    it('should return empty array for file with no section IDs', () => {
      const sectionIDs = extractSectionIDs(EMPTY_POLICY);
      expect(sectionIDs).toEqual([]);
      expect(sectionIDs).toHaveLength(0);
    });

    it('should extract section IDs with all formatting preserved', () => {
      const sectionIDs = extractSectionIDs(META_POLICY);
      // Verify exact format with § prefix
      expect(sectionIDs[0]).toBe('§META.1');
      expect(sectionIDs[1]).toBe('§META.2');
      expect(sectionIDs[2]).toBe('§META.2.1');
      // Verify type
      sectionIDs.forEach((id) => {
        expect(id).toMatch(/^§[A-Z]+(-[A-Z]+)*\.\d+(\.\d+)*$/);
      });
    });

    it('should handle file with duplicate section markers correctly', () => {
      const sectionIDs = extractSectionIDs(DUPLICATE1_POLICY);
      expect(sectionIDs).toContain('§DUP.1');
      expect(sectionIDs).toContain('§DUP.2');
      expect(sectionIDs).toContain('§DUP.3');
      expect(sectionIDs).toContain('§DUP.3.1');
      expect(sectionIDs).toHaveLength(4);
    });

    it('should maintain order of section IDs as they appear in file', () => {
      const sectionIDs = extractSectionIDs(APP_POLICY);
      expect(sectionIDs[0]).toBe('§APP.1');
      expect(sectionIDs[1]).toBe('§APP.4');
      expect(sectionIDs[2]).toBe('§APP.4.1');
      // Order preserved from file content
    });

    it('should throw error for non-existent file', () => {
      const nonExistentPath = path.join(FIXTURES_DIR, 'policy-does-not-exist.md');
      expect(() => extractSectionIDs(nonExistentPath)).toThrow();
    });
  });

  describe('validateSectionUniqueness', () => {
    // Mock console.error to avoid cluttering test output
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should return valid result when no duplicates exist', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          META: 'policy-meta',
          APP: 'policy-app',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect duplicate sections across multiple files', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          DUP1: 'policy-duplicate1',
          DUP2: 'policy-duplicate2',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(2);

      // Check for §DUP.1 duplicate
      const dup1Error = result.errors?.find((e) => e.section === '§DUP.1');
      expect(dup1Error).toBeDefined();
      expect(dup1Error?.files).toContain('policy-duplicate1');
      expect(dup1Error?.files).toContain('policy-duplicate2');
      expect(dup1Error?.files).toHaveLength(2);

      // Check for §DUP.3 duplicate
      const dup3Error = result.errors?.find((e) => e.section === '§DUP.3');
      expect(dup3Error).toBeDefined();
      expect(dup3Error?.files).toContain('policy-duplicate1');
      expect(dup3Error?.files).toContain('policy-duplicate2');
      expect(dup3Error?.files).toHaveLength(2);
    });

    it('should handle files with no duplicates mixed with duplicate files', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          META: 'policy-meta',
          DUP1: 'policy-duplicate1',
          DUP2: 'policy-duplicate2',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(2);

      // Only DUP sections should be flagged
      result.errors?.forEach((error) => {
        expect(error.section).toMatch(/^§DUP\./);
      });
    });

    it('should return valid for empty policy files', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          EMPTY: 'policy-empty',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle hyphenated prefix sections correctly', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          HOOKS: 'policy-app-hooks',
          HYPH: 'policy-hyphenated',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle missing policy files with console warning', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          MISSING: 'policy-missing-file',
          META: 'policy-meta',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);

      // Should continue validation despite missing file
      expect(result.valid).toBe(true);

      // Should log warning for missing file
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] validateSectionUniqueness:')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('policy-missing-file.md')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('prefix MISSING'));
    });

    it('should handle configuration with only missing files', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          MISSING1: 'policy-missing-1',
          MISSING2: 'policy-missing-2',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);

      // Should return valid (no sections to validate)
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();

      // Should log warnings for both missing files
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('should detect three-way duplicate across multiple files', () => {
      // Create temporary third duplicate file for this test
      const tempDuplicate3 = path.join(FIXTURES_DIR, 'policy-duplicate3-temp.md');
      fs.writeFileSync(
        tempDuplicate3,
        `# Duplicate Test Policy 3\n\n## {§DUP.1} First Duplicate Section\n\nThird file with same ID.\n\n{§END}\n`
      );

      try {
        const config: ServerConfig = {
          baseDir: DEFAULT_BASE_DIR,
          stems: {
            DUP1: 'policy-duplicate1',
            DUP2: 'policy-duplicate2',
            DUP3: 'policy-duplicate3-temp',
          },
        };

        const result = validateSectionUniqueness(config, FIXTURES_DIR);
        expect(result.valid).toBe(false);

        const dup1Error = result.errors?.find((e) => e.section === '§DUP.1');
        expect(dup1Error?.files).toHaveLength(3);
        expect(dup1Error?.files).toContain('policy-duplicate1');
        expect(dup1Error?.files).toContain('policy-duplicate2');
        expect(dup1Error?.files).toContain('policy-duplicate3-temp');
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempDuplicate3)) {
          fs.unlinkSync(tempDuplicate3);
        }
      }
    });

    it('should handle mix of unique and duplicate sections in same files', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          DUP1: 'policy-duplicate1',
          DUP2: 'policy-duplicate2',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);

      // §DUP.2 is unique to duplicate1, §DUP.4 is unique to duplicate2
      // Only §DUP.1 and §DUP.3 should be flagged as duplicates
      expect(result.errors).toHaveLength(2);

      const sections = result.errors?.map((e) => e.section);
      expect(sections).toContain('§DUP.1');
      expect(sections).toContain('§DUP.3');
      expect(sections).not.toContain('§DUP.2');
      expect(sections).not.toContain('§DUP.4');
    });

    it('should validate subsections independently', () => {
      const config: ServerConfig = {
        baseDir: DEFAULT_BASE_DIR,
        stems: {
          SUB: 'policy-subsections',
          APP: 'policy-app',
        },
      };

      const result = validateSectionUniqueness(config, FIXTURES_DIR);
      // No duplicates between these files
      expect(result.valid).toBe(true);
    });
  });

  describe('formatDuplicateErrors', () => {
    it('should format single duplicate error correctly', () => {
      const errors = [{ section: '§APP.7', files: ['policy-application', 'policy-app-extra'] }];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toContain('Duplicate section IDs detected:');
      expect(formatted).toContain('§APP.7 appears in: policy-application, policy-app-extra');
      expect(formatted.split('\n')).toHaveLength(2);
    });

    it('should format multiple duplicate errors correctly', () => {
      const errors = [
        { section: '§APP.7', files: ['policy-application', 'policy-app-extra'] },
        { section: '§META.1', files: ['policy-meta', 'policy-meta-override'] },
      ];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toContain('Duplicate section IDs detected:');
      expect(formatted).toContain('§APP.7 appears in: policy-application, policy-app-extra');
      expect(formatted).toContain('§META.1 appears in: policy-meta, policy-meta-override');
      expect(formatted.split('\n')).toHaveLength(3);
    });

    it('should format three-way duplicate correctly', () => {
      const errors = [
        {
          section: '§DUP.1',
          files: ['policy-duplicate1', 'policy-duplicate2', 'policy-duplicate3'],
        },
      ];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toContain(
        '§DUP.1 appears in: policy-duplicate1, policy-duplicate2, policy-duplicate3'
      );
      expect(formatted.split('\n')).toHaveLength(2);
    });

    it('should handle empty errors array', () => {
      const errors: Array<{ section: string; files: string[] }> = [];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toBe('Duplicate section IDs detected:');
      expect(formatted.split('\n')).toHaveLength(1);
    });

    it('should format errors with hyphenated prefixes', () => {
      const errors = [
        { section: '§APP-HOOK.2', files: ['policy-app-hooks', 'policy-app-hooks-override'] },
        { section: '§SYS-TPL.1', files: ['policy-sys-template', 'policy-sys-tpl'] },
      ];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toContain('§APP-HOOK.2 appears in:');
      expect(formatted).toContain('§SYS-TPL.1 appears in:');
      expect(formatted.split('\n')).toHaveLength(3);
    });

    it('should format subsection duplicates correctly', () => {
      const errors = [{ section: '§META.2.1', files: ['policy-meta', 'policy-meta-extended'] }];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toContain('§META.2.1 appears in: policy-meta, policy-meta-extended');
    });

    it('should maintain order of errors as provided', () => {
      const errors = [
        { section: '§APP.7', files: ['file1', 'file2'] },
        { section: '§META.1', files: ['file3', 'file4'] },
        { section: '§SYS.3', files: ['file5', 'file6'] },
      ];

      const formatted = formatDuplicateErrors(errors);
      const lines = formatted.split('\n');

      expect(lines[1]).toContain('§APP.7');
      expect(lines[2]).toContain('§META.1');
      expect(lines[3]).toContain('§SYS.3');
    });

    it('should properly indent error lines', () => {
      const errors = [{ section: '§APP.7', files: ['policy-application', 'policy-app-extra'] }];

      const formatted = formatDuplicateErrors(errors);
      const lines = formatted.split('\n');

      expect(lines[0]).not.toMatch(/^\s/); // Header not indented
      expect(lines[1]).toMatch(/^\s\s/); // Error line indented with 2 spaces
    });

    it('should handle files array with single file (edge case)', () => {
      // This shouldn't happen in practice, but test defensive handling
      const errors = [{ section: '§APP.7', files: ['policy-application'] }];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toContain('§APP.7 appears in: policy-application');
    });

    it('should handle long file lists correctly', () => {
      const errors = [
        {
          section: '§TEST.1',
          files: ['file1', 'file2', 'file3', 'file4', 'file5', 'file6', 'file7'],
        },
      ];

      const formatted = formatDuplicateErrors(errors);

      expect(formatted).toContain(
        '§TEST.1 appears in: file1, file2, file3, file4, file5, file6, file7'
      );
      expect(formatted.split('\n')).toHaveLength(2);
    });

    it('should produce output matching expected format exactly', () => {
      const errors = [{ section: '§APP.7', files: ['policy-application', 'policy-app-extra'] }];

      const formatted = formatDuplicateErrors(errors);

      const expected = `Duplicate section IDs detected:
  §APP.7 appears in: policy-application, policy-app-extra`;

      expect(formatted).toBe(expected);
    });
  });
});
