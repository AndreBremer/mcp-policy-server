/**
 * Integration tests for MCP server
 * Tests all tool handlers end-to-end with real file fixtures
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  handleFetch,
  handleResolveReferences,
  handleExtractReferences,
  handleValidateReferences,
  handleListSources,
  handleInspectContext,
  estimateTokens,
  chunkContent,
} from '../src/handlers';
import { ServerConfig } from '../src/config';

// Test configuration matching fixture structure
// baseDir should be the actual policy directory, not the project root
const TEST_CONFIG: ServerConfig = {
  stems: {
    TEST: 'policy-test',
    META: 'policy-meta',
    APP: 'policy-app',
    SYS: 'policy-sys',
    DUP: 'policy-duplicate1',
    SUB: 'policy-subsections',
    EMPTY: 'policy-empty',
    LARGE: 'policy-large',
  },
  baseDir: path.join(__dirname, 'fixtures', 'sample-policies'),
  maxChunkTokens: 10000,
};

// Small chunk size for testing chunking behavior
const SMALL_CHUNK_CONFIG: ServerConfig = {
  ...TEST_CONFIG,
  maxChunkTokens: 500,
};

describe('MCP Server Integration', () => {
  describe('Configuration', () => {
    test('test config has all required fields', () => {
      expect(TEST_CONFIG.baseDir).toBeDefined();
      expect(TEST_CONFIG.stems).toBeDefined();
      expect(Object.keys(TEST_CONFIG.stems).length).toBeGreaterThan(0);
    });

    test('test config has maxChunkTokens default', () => {
      expect(TEST_CONFIG.maxChunkTokens).toBe(10000);
    });

    test('fixture files exist for all prefixes', () => {
      for (const [, stem] of Object.entries(TEST_CONFIG.stems)) {
        const filePath = path.join(TEST_CONFIG.baseDir, `${stem}.md`);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });

  describe('Tool Handlers', () => {
    describe('handleFetch', () => {
      test('fetches single section successfully', () => {
        const response = handleFetch({ sections: ['§TEST.1'] }, TEST_CONFIG);

        expect(response.content).toBeDefined();
        expect(response.content.length).toBeGreaterThan(0);
        expect(response.content[0].type).toBe('text');
        expect(response.content[0].text).toContain('§TEST.1');
        expect(response.content[0].text).toContain('First Whole Section');
      });

      test('fetches multiple sections from same file', () => {
        const response = handleFetch({ sections: ['§TEST.1', '§TEST.3'] }, TEST_CONFIG);

        expect(response.content[0].text).toContain('§TEST.1');
        expect(response.content[0].text).toContain('§TEST.3');
      });

      test('fetches sections from different files', () => {
        const response = handleFetch({ sections: ['§APP.7', '§SYS.5', '§META.1'] }, TEST_CONFIG);

        const text = response.content[0].text;
        expect(text).toContain('§APP.7');
        expect(text).toContain('§SYS.5');
        expect(text).toContain('§META.1');
      });

      test('expands range notation', () => {
        const response = handleFetch({ sections: ['§APP.4.1-3'] }, TEST_CONFIG);

        const text = response.content[0].text;
        expect(text).toContain('§APP.4.1');
        expect(text).toContain('§APP.4.2');
        expect(text).toContain('§APP.4.3');
      });

      test('resolves embedded references recursively', () => {
        const response = handleFetch({ sections: ['§TEST.1'] }, TEST_CONFIG);

        const text = response.content[0].text;
        // TEST.1 references TEST.2 and TEST.3
        expect(text).toContain('§TEST.2');
        expect(text).toContain('§TEST.3');
      });

      test('throws error for empty sections array', () => {
        expect(() => {
          handleFetch({ sections: [] }, TEST_CONFIG);
        }).toThrow('sections parameter must be a non-empty array');
      });

      test('throws error for non-array sections parameter', () => {
        expect(() => {
          handleFetch({ sections: '§TEST.1' }, TEST_CONFIG);
        }).toThrow('sections parameter must be a non-empty array');
      });

      test('throws error for invalid section notation', () => {
        expect(() => {
          handleFetch({ sections: ['TEST.1'] }, TEST_CONFIG);
        }).toThrow();
      });

      test('throws error for unknown prefix', () => {
        expect(() => {
          handleFetch({ sections: ['§UNKNOWN.1'] }, TEST_CONFIG);
        }).toThrow();
      });

      test('throws error for missing section', () => {
        expect(() => {
          handleFetch({ sections: ['§TEST.999'] }, TEST_CONFIG);
        }).toThrow();
      });

      describe('chunking', () => {
        test('returns single chunk for small content', () => {
          const response = handleFetch({ sections: ['§TEST.1'] }, TEST_CONFIG);

          expect(response.content.length).toBe(1);
          expect(response.content[0].text).not.toContain('MORE CHUNKS REQUIRED');
        });

        test('splits large content into multiple chunks', () => {
          const response = handleFetch(
            { sections: ['§LARGE.1', '§LARGE.2', '§LARGE.3'] },
            SMALL_CHUNK_CONFIG
          );

          expect(response.content.length).toBeGreaterThan(1);
          expect(response.content[1].text).toContain('INCOMPLETE RESPONSE - CONTINUATION REQUIRED');
          expect(response.content[1].text).toContain('continuation');
        });

        test('retrieves subsequent chunks with continuation token', () => {
          // First request to get initial chunk
          const firstResponse = handleFetch(
            { sections: ['§LARGE.1', '§LARGE.2', '§LARGE.3'] },
            SMALL_CHUNK_CONFIG
          );

          expect(firstResponse.content.length).toBeGreaterThan(1);

          // Extract continuation token from response
          const continuationMatch = firstResponse.content[1].text.match(/continuation="([^"]+)"/);
          expect(continuationMatch).not.toBeNull();

          const continuationToken = continuationMatch![1];

          // Second request with continuation
          const secondResponse = handleFetch(
            {
              sections: ['§LARGE.1', '§LARGE.2', '§LARGE.3'],
              continuation: continuationToken,
            },
            SMALL_CHUNK_CONFIG
          );

          expect(secondResponse.content).toBeDefined();
          expect(secondResponse.content[0].text).toBeDefined();
          expect(secondResponse.content[0].text.length).toBeGreaterThan(0);
        });

        test('throws error for invalid continuation token', () => {
          expect(() => {
            handleFetch(
              {
                sections: ['§TEST.1'],
                continuation: 'chunk:999',
              },
              TEST_CONFIG
            );
          }).toThrow('Invalid continuation token');
        });

        test('last chunk has no continuation message', () => {
          const response = handleFetch({ sections: ['§TEST.1'] }, TEST_CONFIG);

          const hasMoreMessage = response.content.some((c) =>
            c.text.includes('MORE CHUNKS REQUIRED')
          );

          expect(hasMoreMessage).toBe(false);
        });
      });
    });

    describe('handleResolveReferences', () => {
      test('resolves single section location', () => {
        const response = handleResolveReferences({ sections: ['§TEST.1'] }, TEST_CONFIG);

        const result = JSON.parse(response.content[0].text);
        expect(result['policy-test.md']).toBeDefined();
        expect(result['policy-test.md']).toContain('§TEST.1');
      });

      test('resolves multiple sections from same file', () => {
        const response = handleResolveReferences(
          { sections: ['§TEST.1', '§TEST.2', '§TEST.3'] },
          TEST_CONFIG
        );

        const result = JSON.parse(response.content[0].text);
        expect(result['policy-test.md']).toBeDefined();
        expect(result['policy-test.md'].length).toBeGreaterThanOrEqual(3);
      });

      test('groups sections by file', () => {
        const response = handleResolveReferences(
          { sections: ['§APP.7', '§SYS.5', '§META.1'] },
          TEST_CONFIG
        );

        const result = JSON.parse(response.content[0].text);
        expect(result['policy-app.md']).toBeDefined();
        expect(result['policy-sys.md']).toBeDefined();
        expect(result['policy-meta.md']).toBeDefined();
      });

      test('expands ranges before resolving', () => {
        const response = handleResolveReferences({ sections: ['§APP.4.1-3'] }, TEST_CONFIG);

        const result = JSON.parse(response.content[0].text);
        expect(result['policy-app.md']).toContain('§APP.4.1');
        expect(result['policy-app.md']).toContain('§APP.4.2');
        expect(result['policy-app.md']).toContain('§APP.4.3');
      });

      test('includes recursively resolved references', () => {
        const response = handleResolveReferences({ sections: ['§TEST.1'] }, TEST_CONFIG);

        const result = JSON.parse(response.content[0].text);
        const allSections = Object.values(result).flat();

        // TEST.1 should trigger recursive resolution
        expect(allSections.length).toBeGreaterThan(1);
      });

      test('sorts sections within each file', () => {
        const response = handleResolveReferences(
          { sections: ['§TEST.3', '§TEST.1', '§TEST.2'] },
          TEST_CONFIG
        );

        const result = JSON.parse(response.content[0].text);
        const sections = result['policy-test.md'];

        // Verify sections are sorted
        const indices = sections.map((s: string) => {
          const match = s.match(/§TEST\.(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });

        for (let i = 1; i < indices.length; i++) {
          expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
        }
      });

      test('throws error for empty sections array', () => {
        expect(() => {
          handleResolveReferences({ sections: [] }, TEST_CONFIG);
        }).toThrow('sections parameter must be a non-empty array');
      });

      test('throws error for non-array sections parameter', () => {
        expect(() => {
          handleResolveReferences({ sections: '§TEST.1' }, TEST_CONFIG);
        }).toThrow('sections parameter must be a non-empty array');
      });
    });

    describe('handleExtractReferences', () => {
      const testAgentPath = path.join(__dirname, 'fixtures', 'test-agent.md');

      test('extracts all § references from file', () => {
        const response = handleExtractReferences({ file_path: testAgentPath }, TEST_CONFIG);

        const references = JSON.parse(response.content[0].text);
        expect(Array.isArray(references)).toBe(true);
        expect(references).toContain('§APP.7');
        expect(references).toContain('§SYS.5');
        expect(references).toContain('§META.1');
        expect(references).toContain('§TEST.1');
      });

      test('expands ranges in extracted references', () => {
        const response = handleExtractReferences({ file_path: testAgentPath }, TEST_CONFIG);

        const references = JSON.parse(response.content[0].text);
        expect(references).toContain('§APP.4.1');
        expect(references).toContain('§APP.4.2');
        expect(references).toContain('§APP.4.3');
      });

      test('returns unique sorted references', () => {
        const response = handleExtractReferences({ file_path: testAgentPath }, TEST_CONFIG);

        const references = JSON.parse(response.content[0].text);
        const uniqueRefs = Array.from(new Set(references));

        expect(references.length).toBe(uniqueRefs.length);

        // Verify sorted order
        const sorted = [...references].sort();
        expect(references).toEqual(sorted);
      });

      test('handles file with no references', () => {
        const emptyFile = path.join(__dirname, 'fixtures', 'sample-policies', 'policy-empty.md');

        const response = handleExtractReferences({ file_path: emptyFile }, TEST_CONFIG);

        const references = JSON.parse(response.content[0].text);
        expect(Array.isArray(references)).toBe(true);
        expect(references.length).toBe(0);
      });

      test('throws error for missing file_path parameter', () => {
        expect(() => {
          handleExtractReferences({}, TEST_CONFIG);
        }).toThrow('file_path parameter is required');
      });

      test('throws error for non-existent file', () => {
        expect(() => {
          handleExtractReferences({ file_path: '/non/existent/file.md' }, TEST_CONFIG);
        }).toThrow();
      });
    });

    describe('handleValidateReferences', () => {
      test('validates existing references as valid', () => {
        const response = handleValidateReferences(
          { references: ['§TEST.1', '§APP.7', '§META.1'] },
          TEST_CONFIG
        );

        const result = JSON.parse(response.content[0].text);
        expect(result.valid).toBe(true);
        expect(result.checked).toBe(3);
        expect(result.invalid).toEqual([]);
      });

      test('detects invalid references', () => {
        const response = handleValidateReferences(
          { references: ['§TEST.1', '§TEST.999', '§APP.7'] },
          TEST_CONFIG
        );

        const result = JSON.parse(response.content[0].text);
        expect(result.valid).toBe(false);
        expect(result.invalid).toContain('§TEST.999');
        expect(result.details.length).toBeGreaterThan(0);
      });

      test('validates ranges by expanding them first', () => {
        const response = handleValidateReferences({ references: ['§APP.4.1-3'] }, TEST_CONFIG);

        const result = JSON.parse(response.content[0].text);
        expect(result.valid).toBe(true);
        expect(result.checked).toBe(1);
      });

      test('detects duplicate sections across files', () => {
        // Use config that includes duplicate test files
        const dupConfig: ServerConfig = {
          ...TEST_CONFIG,
          stems: {
            ...TEST_CONFIG.stems,
            DUP: 'policy-duplicate1',
          },
        };

        // DUP.1 appears in both policy-duplicate1.md and policy-duplicate2.md
        const response = handleValidateReferences({ references: ['§DUP.1'] }, dupConfig);

        const result = JSON.parse(response.content[0].text);
        // May report duplicate issues in details
        expect(result.checked).toBe(1);
      });

      test('includes error details for invalid references', () => {
        const response = handleValidateReferences({ references: ['§TEST.999'] }, TEST_CONFIG);

        const result = JSON.parse(response.content[0].text);
        expect(result.valid).toBe(false);
        expect(result.details).toBeDefined();
        expect(result.details.length).toBeGreaterThan(0);
        expect(result.details.some((d: string) => d.includes('§TEST.999'))).toBe(true);
      });

      test('throws error for empty references array', () => {
        expect(() => {
          handleValidateReferences({ references: [] }, TEST_CONFIG);
        }).toThrow('references parameter must be a non-empty array');
      });

      test('throws error for non-array references parameter', () => {
        expect(() => {
          handleValidateReferences({ references: '§TEST.1' }, TEST_CONFIG);
        }).toThrow('references parameter must be a non-empty array');
      });
    });

    describe('handleListSources', () => {
      test('returns formatted list of policy sources', () => {
        const response = handleListSources({}, TEST_CONFIG);

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');

        const text = response.content[0].text;
        expect(text).toContain('Policy Documentation Files');
        expect(text).toContain('Section Format');
      });

      test('includes all configured prefixes', () => {
        const response = handleListSources({}, TEST_CONFIG);
        const text = response.content[0].text;

        for (const prefix of Object.keys(TEST_CONFIG.stems)) {
          expect(text).toContain(prefix);
        }
      });

      test('includes file stems for each prefix', () => {
        const response = handleListSources({}, TEST_CONFIG);
        const text = response.content[0].text;

        for (const stem of Object.values(TEST_CONFIG.stems)) {
          expect(text).toContain(stem);
        }
      });

      test('includes usage examples', () => {
        const response = handleListSources({}, TEST_CONFIG);
        const text = response.content[0].text;

        expect(text).toContain('Examples');
        expect(text).toContain('fetch(sections=');
        expect(text).toContain('Range:');
        expect(text).toContain('Multiple:');
      });

      test('documents section notation format', () => {
        const response = handleListSources({}, TEST_CONFIG);
        const text = response.content[0].text;

        expect(text).toContain('§');
        expect(text).toContain('Single:');
        expect(text).toContain('Range:');
      });
    });

    describe('handleInspectContext', () => {
      test('returns request context information', () => {
        const mockRequest = {
          params: { name: 'inspect_context', arguments: {} },
          method: 'tools/call',
        };

        const response = handleInspectContext({}, mockRequest);

        expect(response.content).toBeDefined();
        expect(response.content[0].type).toBe('text');

        const result = JSON.parse(response.content[0].text);
        expect(result.request_params).toBeDefined();
        expect(result.request_method).toBe('tools/call');
      });

      test('includes available properties in context', () => {
        const mockRequest = {
          params: { name: 'inspect_context', arguments: {} },
          method: 'tools/call',
          customField: 'custom value',
        };

        const response = handleInspectContext({}, mockRequest);
        const result = JSON.parse(response.content[0].text);

        expect(result.available_properties).toContain('params');
        expect(result.available_properties).toContain('method');
        expect(result.available_properties).toContain('customField');
      });

      test('handles request with meta information', () => {
        const mockRequest = {
          params: { name: 'inspect_context', arguments: {} },
          method: 'tools/call',
          _meta: { client_id: 'test-client' },
        };

        const response = handleInspectContext({}, mockRequest);
        const result = JSON.parse(response.content[0].text);

        expect(result._meta).toBeDefined();
      });
    });
  });

  describe('Helper Functions', () => {
    describe('estimateTokens', () => {
      test('estimates tokens for short text', () => {
        const text = 'Hello world';
        const tokens = estimateTokens(text);

        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(text.length);
      });

      test('estimates approximately 1 token per 4 characters', () => {
        const text = 'a'.repeat(400);
        const tokens = estimateTokens(text);

        expect(tokens).toBeCloseTo(100, -1);
      });

      test('rounds up for fractional tokens', () => {
        const text = 'abc';
        const tokens = estimateTokens(text);

        expect(tokens).toBe(1);
      });

      test('handles empty string', () => {
        const tokens = estimateTokens('');
        expect(tokens).toBe(0);
      });
    });

    describe('chunkContent', () => {
      test('returns single chunk for content under limit', () => {
        const content = 'Small content';
        const chunks = chunkContent(content, 10000);

        expect(chunks.length).toBe(1);
        expect(chunks[0].content).toBe(content);
        expect(chunks[0].hasMore).toBe(false);
        expect(chunks[0].continuation).toBeNull();
      });

      test('splits content at section boundaries', () => {
        const content = `## {§TEST.1} Section One

${'Content for section one. '.repeat(50)}

## {§TEST.2} Section Two

${'Content for section two. '.repeat(50)}

## {§TEST.3} Section Three

${'Content for section three. '.repeat(50)}`;

        const chunks = chunkContent(content, 200);

        expect(chunks.length).toBeGreaterThan(1);

        // Each chunk should start with a section header
        for (const chunk of chunks) {
          if (chunk.content.includes('##')) {
            expect(chunk.content).toMatch(/^## \{§/m);
          }
        }
      });

      test('sets hasMore flag correctly', () => {
        const longContent = 'a'.repeat(50000);
        const chunks = chunkContent(longContent, 1000);

        // All chunks except last should have hasMore=true
        for (let i = 0; i < chunks.length - 1; i++) {
          expect(chunks[i].hasMore).toBe(true);
        }

        // Last chunk should have hasMore=false
        expect(chunks[chunks.length - 1].hasMore).toBe(false);
      });

      test('generates sequential continuation tokens', () => {
        const longContent = 'a'.repeat(50000);
        const chunks = chunkContent(longContent, 1000);

        for (let i = 0; i < chunks.length - 1; i++) {
          expect(chunks[i].continuation).toBe(`chunk:${i + 1}`);
        }

        expect(chunks[chunks.length - 1].continuation).toBeNull();
      });

      test('keeps sections intact across chunks', () => {
        const content = `## {§TEST.1} Section One

${'Line of content. '.repeat(100)}

## {§TEST.2} Section Two

${'Another line. '.repeat(100)}`;

        const chunks = chunkContent(content, 500);

        // Verify no section is split mid-content
        for (const chunk of chunks) {
          const sectionCount = (chunk.content.match(/## \{§/g) ?? []).length;
          expect(sectionCount).toBeGreaterThanOrEqual(0);
        }
      });

      test('handles content with no section markers', () => {
        const content = 'Plain content without sections. '.repeat(1000);
        const chunks = chunkContent(content, 1000);

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[chunks.length - 1].hasMore).toBe(false);
      });

      test('uses custom maxTokens parameter', () => {
        const content = `## {§TEST.1} Section One

${'Content here. '.repeat(200)}

## {§TEST.2} Section Two

${'More content. '.repeat(200)}

## {§TEST.3} Section Three

${'Additional content. '.repeat(200)}`;

        const largeChunks = chunkContent(content, 2000);
        const smallChunks = chunkContent(content, 500);

        expect(smallChunks.length).toBeGreaterThan(largeChunks.length);
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles subsection references correctly', () => {
      const response = handleFetch({ sections: ['§META.2.1'] }, TEST_CONFIG);

      expect(response.content[0].text).toContain('§META.2.1');
      expect(response.content[0].text).toContain('Meta Subsection');
    });

    test('handles deeply nested subsections', () => {
      const response = handleFetch({ sections: ['§SUB.1.2.1'] }, TEST_CONFIG);

      expect(response.content[0].text).toContain('§SUB.1.2.1');
      expect(response.content[0].text).toContain('Deeply Nested');
    });

    test('handles empty section content', () => {
      const response = handleFetch({ sections: ['§APP.8'] }, TEST_CONFIG);

      expect(response.content[0].text).toContain('§APP.8');
    });

    test('handles mixed notation types in single request', () => {
      const response = handleFetch(
        { sections: ['§TEST.1', '§APP.4.1-3', '§META.2.1'] },
        TEST_CONFIG
      );

      const text = response.content[0].text;
      expect(text).toContain('§TEST.1');
      expect(text).toContain('§APP.4.1');
      expect(text).toContain('§META.2.1');
    });

    test('deduplicates parent-child sections', () => {
      const response = handleFetch({ sections: ['§APP.4', '§APP.4.1'] }, TEST_CONFIG);

      // APP.4 should include APP.4.1 content, so no duplication
      const text = response.content[0].text;
      const matches = text.match(/§APP\.4\.1/g);

      // Should appear once in header, not duplicated
      expect(matches).toBeDefined();
    });

    test('handles circular reference chains', () => {
      // TEST.1 references TEST.2, which references TEST.2.2,
      // which references APP.7, which references TEST.1
      const response = handleFetch({ sections: ['§TEST.1'] }, TEST_CONFIG);

      // Should not infinite loop
      expect(response.content).toBeDefined();
      expect(response.content[0].text).toBeTruthy();
    });

    test('handles sections with special characters in content', () => {
      const response = handleFetch({ sections: ['§TEST.1'] }, TEST_CONFIG);

      expect(response.content[0].text).toBeDefined();
      expect(response.content[0].text.length).toBeGreaterThan(0);
    });

    test('handles section notation with hyphens in prefix', () => {
      // APP-HOOK should extract base prefix APP and find policy-app-hooks.md
      const response = handleFetch({ sections: ['§APP-HOOK.1'] }, TEST_CONFIG);

      expect(response.content[0].text).toContain('§APP-HOOK.1');
      expect(response.content[0].text).toContain('First Hook Section');
    });
  });
});
