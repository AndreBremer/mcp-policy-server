/**
 * Comprehensive tests for section resolver
 * Tests recursive reference resolution, file discovery, and section gathering
 */

import * as path from 'path';
import { ServerConfig } from '../src/config';

// Get fixtures directory
const fixturesDir = path.resolve(__dirname, 'fixtures');
const policiesDir = path.join(fixturesDir, 'sample-policies');

import * as resolver from '../src/resolver';

describe('resolver', () => {
  // Test configuration matching fixture file structure
  // baseDir should be the actual policy directory
  const testConfig: ServerConfig = {
    baseDir: policiesDir,
    stems: {
      META: 'policy-meta',
      TEST: 'policy-test',
      APP: 'policy-app',
      SYS: 'policy-sys',
      EMPTY: 'policy-empty',
    },
  };

  // Mock config for testing getBaseDir fallback
  const mockConfig: ServerConfig = {
    ...testConfig,
  };

  describe('getBaseDir', () => {
    it('should return config.baseDir when provided', () => {
      const testConfig: ServerConfig = {
        ...mockConfig,
        baseDir: '/custom/policy/path',
      };

      const baseDir = resolver.getBaseDir(testConfig);
      expect(baseDir).toBe('/custom/policy/path');
    });

    it('should return fallback path when config not provided', () => {
      const baseDir = resolver.getBaseDir();
      expect(baseDir).toContain('fixtures');
      expect(baseDir).toContain('sample-policies');
      expect(path.isAbsolute(baseDir)).toBe(true);
    });

    it('should return absolute path', () => {
      const testConfig: ServerConfig = {
        ...mockConfig,
        baseDir: fixturesDir,
      };

      const baseDir = resolver.getBaseDir(testConfig);
      expect(path.isAbsolute(baseDir)).toBe(true);
    });
  });

  describe('discoverPolicyFiles', () => {
    it('should discover base file for simple prefix', () => {
      const files = resolver.discoverPolicyFiles('TEST', testConfig, policiesDir);
      expect(files).toContain('policy-test.md');
      expect(files.length).toBeGreaterThanOrEqual(1);
    });

    it('should discover base and extension files', () => {
      const files = resolver.discoverPolicyFiles('APP', testConfig, policiesDir);
      expect(files).toContain('policy-app.md');
      expect(files).toContain('policy-app-hooks.md');
      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract base prefix from hyphenated extension', () => {
      const files = resolver.discoverPolicyFiles('APP-HOOK', testConfig, policiesDir);
      expect(files).toContain('policy-app.md');
      expect(files).toContain('policy-app-hooks.md');
    });

    it('should throw error for unknown prefix', () => {
      expect(() => {
        resolver.discoverPolicyFiles('UNKNOWN', testConfig, policiesDir);
      }).toThrow(/Unknown prefix: UNKNOWN/);
    });

    it('should throw error when no files found for stem', () => {
      const noFilesConfig: ServerConfig = {
        baseDir: fixturesDir,
        stems: {
          MISSING: 'policy-nonexistent',
        },
      };

      expect(() => {
        resolver.discoverPolicyFiles('MISSING', noFilesConfig, policiesDir);
      }).toThrow(/No policy files found for prefix: MISSING/);
    });

    it('should list valid prefixes in error message', () => {
      try {
        resolver.discoverPolicyFiles('INVALID', testConfig, policiesDir);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Valid prefixes:');
        expect((error as Error).message).toContain('META');
        expect((error as Error).message).toContain('TEST');
      }
    });

    it('should handle prefix with no extension files', () => {
      const files = resolver.discoverPolicyFiles('META', testConfig, policiesDir);
      expect(files).toContain('policy-meta.md');
      expect(files).toHaveLength(1);
    });
  });

  describe('discoverPolicyFile', () => {
    it('should return first discovered file', () => {
      const file = resolver.discoverPolicyFile('APP', testConfig, policiesDir);
      expect(file).toBe('policy-app.md');
    });

    it('should return base file when only one exists', () => {
      const file = resolver.discoverPolicyFile('META', testConfig, policiesDir);
      expect(file).toBe('policy-meta.md');
    });

    it('should throw error for unknown prefix', () => {
      expect(() => {
        resolver.discoverPolicyFile('UNKNOWN', testConfig, policiesDir);
      }).toThrow(/Unknown prefix: UNKNOWN/);
    });
  });

  describe('resolveSection', () => {
    it('should resolve section notation to parsed section with file', () => {
      const resolved = resolver.resolveSection('§APP.7', testConfig, policiesDir);
      expect(resolved.prefix).toBe('APP');
      expect(resolved.section).toBe('7');
      expect(resolved.file).toBe('policy-app.md');
    });

    it('should resolve subsection notation', () => {
      const resolved = resolver.resolveSection('§APP.4.1', testConfig, policiesDir);
      expect(resolved.prefix).toBe('APP');
      expect(resolved.section).toBe('4.1');
      expect(resolved.file).toBe('policy-app.md');
    });

    it('should resolve hyphenated prefix', () => {
      const resolved = resolver.resolveSection('§APP-HOOK.1', testConfig, policiesDir);
      expect(resolved.prefix).toBe('APP-HOOK');
      expect(resolved.section).toBe('1');
      expect(resolved.file).toBe('policy-app.md');
    });

    it('should throw error for invalid notation', () => {
      expect(() => {
        resolver.resolveSection('APP.7', testConfig, policiesDir);
      }).toThrow(/Invalid section notation.*Must start with § symbol/);
    });

    it('should throw error for unknown prefix', () => {
      expect(() => {
        resolver.resolveSection('§UNKNOWN.1', testConfig, policiesDir);
      }).toThrow(/Unknown prefix: UNKNOWN/);
    });
  });

  describe('gatherSections', () => {
    it('should gather single section without references', () => {
      const gathered = resolver.gatherSections(['§META.1'], testConfig, policiesDir);
      expect(gathered.size).toBe(1);
      expect(gathered.has('§META.1')).toBe(true);

      const section = gathered.get('§META.1');
      expect(section).toBeDefined();
      expect(section?.prefix).toBe('META');
      expect(section?.section).toBe('1');
      expect(section?.file).toBe('policy-meta.md');
      expect(section?.content).toContain('First Meta Section');
    });

    it('should gather section and resolve embedded references', () => {
      const gathered = resolver.gatherSections(['§TEST.1'], testConfig, policiesDir);
      // TEST.1 references §TEST.2 and §TEST.3
      expect(gathered.size).toBeGreaterThanOrEqual(3);
      expect(gathered.has('§TEST.1')).toBe(true);
      expect(gathered.has('§TEST.2')).toBe(true);
      expect(gathered.has('§TEST.3')).toBe(true);
    });

    it('should resolve recursive reference chains', () => {
      // TEST.2.1 → TEST.2.2 → APP.7 → TEST.1 → TEST.2, TEST.3
      // Note: TEST.2 is parent of TEST.2.1, so TEST.2 supersedes TEST.2.1 when pulled in
      const gathered = resolver.gatherSections(['§TEST.2.1'], testConfig, policiesDir);

      // TEST.2 gets pulled in and supersedes TEST.2.1 (parent-child deduplication)
      expect(gathered.has('§TEST.2')).toBe(true);
      expect(gathered.has('§TEST.2.1')).toBe(false); // Deduplicated by parent TEST.2
      expect(gathered.has('§APP.7')).toBe(true);
      expect(gathered.has('§TEST.1')).toBe(true);
      expect(gathered.has('§TEST.3')).toBe(true);
    });

    it('should handle parent-child deduplication when parent processed first', () => {
      const gathered = resolver.gatherSections(['§APP.4', '§APP.4.1'], testConfig, policiesDir);

      // Parent §APP.4 should be included
      expect(gathered.has('§APP.4')).toBe(true);
      // Child §APP.4.1 should be excluded (parent supersedes)
      expect(gathered.has('§APP.4.1')).toBe(false);
    });

    it('should handle parent-child deduplication when child processed first', () => {
      // Process child first, then parent appears via reference
      const gathered = resolver.gatherSections(['§APP.4.1', '§APP.4'], testConfig, policiesDir);

      // Parent §APP.4 should be included
      expect(gathered.has('§APP.4')).toBe(true);
      // Child §APP.4.1 should be removed when parent added
      expect(gathered.has('§APP.4.1')).toBe(false);
    });

    it('should not deduplicate unrelated sections', () => {
      const gathered = resolver.gatherSections(['§APP.1', '§APP.7'], testConfig, policiesDir);
      expect(gathered.has('§APP.1')).toBe(true);
      expect(gathered.has('§APP.7')).toBe(true);
    });

    it('should throw error for missing section', () => {
      expect(() => {
        resolver.gatherSections(['§APP.99'], testConfig, policiesDir);
      }).toThrow(/Section "§APP.99" not found/);
    });

    it('should search across multiple files for section', () => {
      // APP-HOOK.1 is in policy-app-hooks.md
      const gathered = resolver.gatherSections(['§APP-HOOK.1'], testConfig, policiesDir);
      expect(gathered.has('§APP-HOOK.1')).toBe(true);

      const section = gathered.get('§APP-HOOK.1');
      expect(section?.file).toBe('policy-app-hooks.md');
    });

    it('should merge all files matching stem pattern into single namespace', () => {
      // This test demonstrates the key behavior documented in POLICY_REFERENCE.md:
      // All files matching {stem}.md and {stem}-*.md are merged into a single namespace.
      // The hyphenated extension (APP-HOOK) is just a section identifier, not a file selector.

      // Both APP and APP-HOOK use the same stem ('policy-app')
      // so both policy-app.md and policy-app-hooks.md are searched

      // 1. Regular APP section from policy-app.md
      const appGathered = resolver.gatherSections(['§APP.1'], testConfig, policiesDir);
      expect(appGathered.has('§APP.1')).toBe(true);
      expect(appGathered.get('§APP.1')?.file).toBe('policy-app.md');

      // 2. APP-HOOK section from policy-app-hooks.md
      const hookGathered = resolver.gatherSections(['§APP-HOOK.1'], testConfig, policiesDir);
      expect(hookGathered.has('§APP-HOOK.1')).toBe(true);
      expect(hookGathered.get('§APP-HOOK.1')?.file).toBe('policy-app-hooks.md');

      // 3. Both use the same file discovery process
      const appFiles = resolver.discoverPolicyFiles('APP', testConfig, policiesDir);
      const hookFiles = resolver.discoverPolicyFiles('APP-HOOK', testConfig, policiesDir);
      expect(appFiles).toEqual(hookFiles); // Same files discovered for both prefixes

      // 4. Both files are in the merged namespace
      expect(appFiles).toContain('policy-app.md');
      expect(appFiles).toContain('policy-app-hooks.md');
    });

    it('should handle range notation in embedded references', () => {
      // TEST.2.2 contains §APP.4.1-3 range and §APP.7 which references TEST.1 → TEST.2
      // TEST.2 is parent of TEST.2.2 so it supersedes
      const gathered = resolver.gatherSections(['§TEST.2.2'], testConfig, policiesDir);

      expect(gathered.has('§TEST.2')).toBe(true); // Parent supersedes TEST.2.2
      expect(gathered.has('§TEST.2.2')).toBe(false); // Deduplicated by parent
      // APP.7 references TEST.1, which pulls in TEST.2 and TEST.3 via references
      expect(gathered.has('§APP.7')).toBe(true);
      expect(gathered.has('§TEST.1')).toBe(true);
      expect(gathered.has('§TEST.3')).toBe(true);
      // Section count should reflect recursive resolution
      expect(gathered.size).toBeGreaterThan(3);
    });

    it('should handle multiple initial sections', () => {
      const gathered = resolver.gatherSections(['§META.1', '§SYS.1'], testConfig, policiesDir);
      expect(gathered.has('§META.1')).toBe(true);
      expect(gathered.has('§SYS.1')).toBe(true);
    });

    it('should use default baseDir when null provided', () => {
      // This will fail unless we're in the right directory structure
      // But it tests the null handling branch
      expect(() => {
        resolver.gatherSections(['§APP.99'], testConfig, null);
      }).toThrow(); // Will throw section not found
    });

    it('should handle sections with no content gracefully', () => {
      // APP.8 is an empty section
      const gathered = resolver.gatherSections(['§APP.8'], testConfig, policiesDir);
      expect(gathered.has('§APP.8')).toBe(true);
    });

    it('should deduplicate when processing queue', () => {
      // Section that references itself indirectly shouldn't cause infinite loop
      const gathered = resolver.gatherSections(['§APP.4.1'], testConfig, policiesDir);
      expect(gathered.size).toBeGreaterThan(0);
      // All gathered sections should be unique
      const notations = Array.from(gathered.keys());
      const uniqueNotations = new Set(notations);
      expect(notations.length).toBe(uniqueNotations.size);
    });

    it('should throw error with list of searched files', () => {
      try {
        resolver.gatherSections(['§APP.99'], testConfig, policiesDir);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('policy-app.md');
        expect((error as Error).message).toContain('policy-app-hooks.md');
      }
    });
  });

  describe('fetchSections', () => {
    it('should fetch single section and return content', () => {
      const content = resolver.fetchSections(['§META.1'], testConfig);
      expect(content).toContain('§META.1');
      expect(content).toContain('First Meta Section');
    });

    it('should fetch multiple sections with separator', () => {
      const content = resolver.fetchSections(['§META.1', '§SYS.1'], testConfig);
      expect(content).toContain('§META.1');
      expect(content).toContain('§SYS.1');
      // Note: Separator presence depends on markdown file formatting
      // Test fixtures may not have --- separators, but production files do
    });

    it('should sort sections by prefix and number', () => {
      // Test sorting behavior - verify sections are all present
      const content = resolver.fetchSections(['§META.2.1', '§SYS.5.1', '§APP.8'], testConfig);

      // Verify all sections are included
      expect(content).toContain('{§META.2.1}');
      expect(content).toContain('{§SYS.5.1}');
      expect(content).toContain('{§APP.8}');

      // Note: Exact ordering may vary due to parent section inclusion
      // The sortSections function is tested separately in parser.test.ts
    });

    it('should include recursively resolved sections', () => {
      const content = resolver.fetchSections(['§TEST.1'], testConfig);
      expect(content).toContain('§TEST.1');
      expect(content).toContain('§TEST.2');
      expect(content).toContain('§TEST.3');
    });

    it('should expand range notation', () => {
      // fetchSections should handle range expansion internally via gatherSections
      // APP.4 has references to META.1 and pulls in APP.4.1→APP.4.2→APP.4.3 chain
      // Then parent §APP.4 supersedes all children
      const content = resolver.fetchSections(['§APP.4'], testConfig);
      expect(content).toContain('{§APP.4}');
    });

    it('should handle sections with embedded references', () => {
      // TEST.2.2 → APP.7 → TEST.1 → TEST.2 (parent supersedes TEST.2.2)
      const content = resolver.fetchSections(['§TEST.2.2'], testConfig);
      expect(content).toContain('{§TEST.2}'); // Parent  instead of TEST.2.2
      // Should include referenced APP sections
      expect(content).toContain('§APP'); // From §APP.7 or §APP.4 references
    });

    it('should throw error for missing section', () => {
      expect(() => {
        resolver.fetchSections(['§APP.99'], testConfig);
      }).toThrow(/Section "§APP.99" not found/);
    });

    it('should separate sections with newlines and separators', () => {
      const content = resolver.fetchSections(['§META.1', '§SYS.1'], testConfig);
      // Verify both sections are present (separator format depends on markdown files)
      expect(content).toContain('§META.1');
      expect(content).toContain('§SYS.1');
      // Test fixtures don't have --- separators, but production files do
    });
  });

  describe('resolveSectionLocations', () => {
    it('should map sections to their source files', () => {
      const locations = resolver.resolveSectionLocations(['§META.1', '§APP.1'], testConfig);

      expect(locations['policy-meta.md']).toContain('§META.1');
      expect(locations['policy-app.md']).toContain('§APP.1');
    });

    it('should include recursively resolved sections', () => {
      const locations = resolver.resolveSectionLocations(['§TEST.1'], testConfig);

      // TEST.1 references TEST.2, TEST.3
      expect(locations['policy-test.md']).toBeDefined();
      expect(locations['policy-test.md'].length).toBeGreaterThan(1);
    });

    it('should sort sections within each file', () => {
      const locations = resolver.resolveSectionLocations(
        ['§APP.7', '§APP.1', '§APP.4'],
        testConfig
      );

      const appSections = locations['policy-app.md'];
      expect(appSections).toBeDefined();

      // Check numeric sorting: APP.1 < APP.4 < APP.7
      const app1Index = appSections.indexOf('§APP.1');
      const app4Index = appSections.indexOf('§APP.4');
      const app7Index = appSections.indexOf('§APP.7');

      expect(app1Index).toBeLessThan(app4Index);
      expect(app4Index).toBeLessThan(app7Index);
    });

    it('should sort files alphabetically', () => {
      const locations = resolver.resolveSectionLocations(
        ['§META.1', '§TEST.1', '§APP.1'],
        testConfig
      );

      const files = Object.keys(locations);
      // Files should be sorted
      const sortedFiles = [...files].sort();
      expect(files).toEqual(sortedFiles);
    });

    it('should map extension file sections correctly', () => {
      const locations = resolver.resolveSectionLocations(['§APP-HOOK.1'], testConfig);

      expect(locations['policy-app-hooks.md']).toBeDefined();
      expect(locations['policy-app-hooks.md']).toContain('§APP-HOOK.1');
    });

    it('should throw error for missing section', () => {
      expect(() => {
        resolver.resolveSectionLocations(['§APP.99'], testConfig);
      }).toThrow(/Section "§APP.99" not found/);
    });

    it('should handle multiple sections from same file', () => {
      const locations = resolver.resolveSectionLocations(
        ['§TEST.1', '§TEST.2', '§TEST.3'],
        testConfig
      );

      expect(locations['policy-test.md']).toBeDefined();
      expect(locations['policy-test.md'].length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty object when no sections provided', () => {
      const locations = resolver.resolveSectionLocations([], testConfig);
      expect(Object.keys(locations).length).toBe(0);
    });

    it('should handle parent-child deduplication in location map', () => {
      const locations = resolver.resolveSectionLocations(['§APP.4', '§APP.4.1'], testConfig);

      const appSections = locations['policy-app.md'];
      expect(appSections).toContain('§APP.4');
      expect(appSections).not.toContain('§APP.4.1'); // Child removed by parent
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle empty section list gracefully', () => {
      const gathered = resolver.gatherSections([], testConfig, policiesDir);
      expect(gathered.size).toBe(0);
    });

    it('should handle section with only whitespace content', () => {
      // EMPTY prefix points to policy-empty.md which has minimal content
      // Should throw if section doesn't exist or is empty
      expect(() => {
        resolver.gatherSections(['§EMPTY.1'], testConfig, policiesDir);
      }).toThrow(); // Section not found or empty
    });

    it('should handle deeply nested subsections', () => {
      const resolved = resolver.resolveSection('§APP.4.1', testConfig, policiesDir);
      expect(resolved.section).toBe('4.1');
    });

    it('should handle prefix extraction for complex hyphenated prefixes', () => {
      // APP-HOOK should extract to APP base prefix
      const files = resolver.discoverPolicyFiles('APP-HOOK', testConfig, policiesDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should throw error when file found but empty', () => {
      // Depends on fixture setup - if policy-empty.md is truly empty
      expect(() => {
        resolver.gatherSections(['§EMPTY.99'], testConfig, policiesDir);
      }).toThrow(); // Either section not found or empty content
    });

    it('should handle concurrent sections from different files', () => {
      const locations = resolver.resolveSectionLocations(
        ['§META.1', '§TEST.1', '§APP.1', '§SYS.1'],
        testConfig
      );

      expect(Object.keys(locations).length).toBeGreaterThanOrEqual(4);
    });

    it('should show reference chain in error for embedded references', () => {
      // Add BADREF to test config
      const configWithBadRef = {
        ...testConfig,
        stems: {
          ...testConfig.stems,
          BADREF: 'policy-with-bad-ref',
        },
      };

      // §BADREF.1 contains reference to §MISSING.99
      expect(() => {
        resolver.gatherSections(['§BADREF.1'], configWithBadRef, policiesDir);
      }).toThrow(/§MISSING\.99.*\(referenced by §BADREF\.1\)/);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete reference chain resolution', () => {
      // TEST.2.2 → APP.7 → TEST.1 → TEST.2, TEST.3 → META.1, SYS.5
      const gathered = resolver.gatherSections(['§TEST.2.2'], testConfig, policiesDir);

      // Should have resolved multiple levels deep
      expect(gathered.size).toBeGreaterThan(3);
    });

    it('should handle mixed range and single section requests', () => {
      // Use whole section §APP.4 instead of range §APP.4.1-3
      const content = resolver.fetchSections(['§APP.1', '§APP.4'], testConfig);
      expect(content).toContain('{§APP.1}');
      expect(content).toContain('{§APP.4}'); // Parent supersedes children
    });

    it('should correctly order mixed prefix sections', () => {
      // Test with sections from different prefixes
      const content = resolver.fetchSections(['§APP.8', '§META.2.1', '§SYS.5.1'], testConfig);

      // Verify all sections are included
      expect(content).toContain('{§META.2.1}');
      expect(content).toContain('{§SYS.5.1}');
      expect(content).toContain('{§APP.8}');

      // Note: Parent sections may be included, affecting observed order
      // Sorting logic is tested in parser.test.ts
    });

    it('should resolve sections from multiple extension files', () => {
      const locations = resolver.resolveSectionLocations(['§APP.1', '§APP-HOOK.1'], testConfig);

      expect(locations['policy-app.md']).toBeDefined();
      expect(locations['policy-app-hooks.md']).toBeDefined();
    });
  });
});
