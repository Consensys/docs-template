const remark = require('remark');
const remarkLinkRewriter = require('../remark-link-rewriter');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock logging
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  const yaml = require('js-yaml');
  return {
    ...actualFs,
    appendFileSync: jest.fn(),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn((filePath) => {
      if (filePath.includes('link-replacements.yaml')) {
        const mockYaml = {
          sourceBasePath: '/services',
          replacements: {
            '/old-path': '/new-path',
            '/services': 'https://docs.metamask.io/services',
          },
          patterns: [
            {
              pattern: '/services/reference/(base|ethereum)/.+',
              replacement: '/reference/{network}',
              extractPath: true,
              description: 'Rewrite reference links for ported networks',
            },
            {
              pattern: '/services/reference/sei/.+',
              replacement: 'https://docs.metamask.io/services/reference/sei',
              extractPath: true,
              description: 'Preserve full MetaMask path for Sei',
            },
          ],
        };
        return yaml.dump(mockYaml);
      }
      if (filePath.includes('ported-files.log')) {
        // Return file paths that will match test files
        // The plugin checks if relativeFilePath is in this list
        // 'unknown' matches the default when file path can't be determined
        // 'test-file' matches files processed with path 'docs/test-file.md'
        return 'test-file\nunknown';
      }
      if (filePath.includes('links-replaced.log') || filePath.includes('links-dropped.log')) {
        // Return log file content for updateLogFileCount - must be a string
        const logName = filePath.includes('links-replaced') ? 'Links Replaced' : 'Links Dropped';
        return `=== ${logName} Log ===\nDate: 2024-01-01\nTotal ${logName}: 0\n\n`;
      }
      return actualFs.readFileSync(filePath);
    }),
    writeFileSync: jest.fn(),
    statSync: jest.fn((filePath) => {
      // Mock file stats - return isFile for markdown files, isDirectory for directories
      // For /new-path, return as existing file to allow the test to pass
      if (filePath.includes('/new-path') || filePath.includes('new-path')) {
        return { isFile: () => true, isDirectory: () => false };
      }
      if (filePath.includes('.md') || filePath.includes('.mdx')) {
        return { isFile: () => true, isDirectory: () => false };
      }
      return { isFile: () => false, isDirectory: () => true };
    }),
  };
});

describe('remark-link-rewriter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should rewrite exact match links', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/old-path)';
    
    // Process with a file path that will be in the ported files log
    const result = processor.processSync(markdown, { path: 'docs/test-file.md' });
    const html = result.toString();
    
    expect(html).toContain('/new-path');
    expect(html).not.toContain('/old-path');
  });

  test('should rewrite pattern-based links with network extraction', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Base API](/services/reference/base/json-rpc-methods/eth_call)';
    
    const result = processor.processSync(markdown, { path: 'docs/test-file.md' });
    const html = result.toString();
    
    // The path is converted to relative, so it won't have leading /
    expect(html).toContain('reference/base/json-rpc-methods/eth_call');
    expect(html).not.toContain('/services/reference/base');
  });

  test('should preserve full MetaMask paths for non-ported networks', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Sei API](/services/reference/sei/some-page)';
    
    const result = processor.processSync(markdown, { path: 'docs/test-file.md' });
    const html = result.toString();
    
    expect(html).toContain('https://docs.metamask.io/services/reference/sei/some-page');
    // The original path should be rewritten to external URL, not remain as local path
    // Check that it doesn't appear as a standalone local path (not part of https://)
    expect(html).not.toMatch(/\]\(\/services\/reference\/sei/);
  });

  test('should not rewrite external URLs', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[External](https://example.com/page)';
    
    const result = processor.processSync(markdown, { path: 'docs/test-file.md' });
    const html = result.toString();
    
    expect(html).toContain('https://example.com/page');
  });

  test('should not rewrite anchor links', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Anchor](#section)';
    
    const result = processor.processSync(markdown, { path: 'docs/test-file.md' });
    const html = result.toString();
    
    expect(html).toContain('#section');
  });

  test('should handle missing config file gracefully', () => {
    fs.existsSync.mockReturnValueOnce(false);
    
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/some-path)';
    
    expect(() => {
      processor.processSync(markdown, { path: 'docs/test-file.md' });
    }).not.toThrow();
  });

  test('should handle malformed YAML gracefully', () => {
    fs.readFileSync.mockReturnValueOnce('invalid: yaml: content: [');
    
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/some-path)';
    
    expect(() => {
      processor.processSync(markdown, { path: 'docs/test-file.md' });
    }).not.toThrow();
  });

  test('should log replaced links', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/old-path)';
    
    processor.processSync(markdown, { path: 'docs/test-file.md' });
    
    // Check that logging was called with links-replaced.log
    // appendFileSync is called with (path, content, encoding)
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('links-replaced.log'),
      expect.stringContaining('Original: /old-path'),
      'utf8'
    );
  });

  test('should handle invalid regex patterns gracefully', () => {
    const yaml = require('js-yaml');
    fs.readFileSync.mockReturnValueOnce(
      yaml.dump({
        sourceBasePath: '/services',
        patterns: [
          {
            pattern: '[invalid(regex',
            replacement: '/new',
            description: 'Invalid pattern',
          },
        ],
      })
    );
    
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/some-path)';
    
    expect(() => {
      processor.processSync(markdown, { path: 'docs/test-file.md' });
    }).not.toThrow();
    
    // Check that error was logged - appendFileSync is called with (path, content, encoding)
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('build-errors.log'),
      expect.stringContaining('ERROR: Invalid regex pattern'),
      'utf8'
    );
  });
});

