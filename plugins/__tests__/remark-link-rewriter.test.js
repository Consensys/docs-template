const remark = require('remark');
const remarkLinkRewriter = require('../remark-link-rewriter');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock logging
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    appendFileSync: jest.fn(),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn((filePath) => {
      if (filePath.includes('link-replacements.yaml')) {
        return yaml.dump({
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
        });
      }
      return actualFs.readFileSync(filePath);
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
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('/new-path');
    expect(html).not.toContain('/old-path');
  });

  test('should rewrite pattern-based links with network extraction', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Base API](/services/reference/base/json-rpc-methods/eth_call)';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('/reference/base/json-rpc-methods/eth_call');
    expect(html).not.toContain('/services/reference/base');
  });

  test('should preserve full MetaMask paths for non-ported networks', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Sei API](/services/reference/sei/some-page)';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('https://docs.metamask.io/services/reference/sei/some-page');
    expect(html).not.toContain('/services/reference/sei');
  });

  test('should not rewrite external URLs', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[External](https://example.com/page)';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('https://example.com/page');
  });

  test('should not rewrite anchor links', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Anchor](#section)';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('#section');
  });

  test('should handle missing config file gracefully', () => {
    fs.existsSync.mockReturnValueOnce(false);
    
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/some-path)';
    
    expect(() => {
      processor.processSync(markdown);
    }).not.toThrow();
  });

  test('should handle malformed YAML gracefully', () => {
    fs.readFileSync.mockReturnValueOnce('invalid: yaml: content: [');
    
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/some-path)';
    
    expect(() => {
      processor.processSync(markdown);
    }).not.toThrow();
  });

  test('should log replaced links', () => {
    const processor = remark().use(remarkLinkRewriter);
    const markdown = '[Link](/old-path)';
    
    processor.processSync(markdown);
    
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('links-replaced.log'),
      expect.stringContaining('REPLACED')
    );
  });

  test('should handle invalid regex patterns gracefully', () => {
    fs.readFileSync.mockReturnValueOnce(
      yaml.dump({
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
      processor.processSync(markdown);
    }).not.toThrow();
    
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('build-errors.log'),
      expect.stringContaining('ERROR')
    );
  });
});

