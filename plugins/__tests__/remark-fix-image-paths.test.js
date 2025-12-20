const remark = require('remark');
const remarkFixImagePaths = require('../remark-fix-image-paths');
const fs = require('fs');

// Mock logging
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    appendFileSync: jest.fn(),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  };
});

describe('remark-fix-image-paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fix markdown image syntax', () => {
    const processor = remark().use(remarkFixImagePaths);
    const markdown = '![Alt text](../images/example.png)';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('/img/example.png');
    expect(html).not.toContain('../images/example.png');
  });

  test('should fix require() statements in JSX', () => {
    const processor = remark().use(remarkFixImagePaths);
    const markdown = '<img src={require("../images/example.png").default} alt="Example" />';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('/img/example.png');
    expect(html).not.toContain('../images/example.png');
  });

  test('should handle multiple levels of ../images/', () => {
    const processor = remark().use(remarkFixImagePaths);
    const markdown = '![Alt](../../images/example.png)';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('/img/example.png');
  });

  test('should handle different image formats', () => {
    const formats = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    
    formats.forEach(format => {
      const processor = remark().use(remarkFixImagePaths);
      const markdown = `![Alt](../images/example.${format})`;
      
      const result = processor.processSync(markdown);
      const html = result.toString();
      
      expect(html).toContain(`/img/example.${format}`);
    });
  });

  test('should not modify images already using /img/', () => {
    const processor = remark().use(remarkFixImagePaths);
    const markdown = '![Alt](/img/example.png)';
    
    const result = processor.processSync(markdown);
    const html = result.toString();
    
    expect(html).toContain('/img/example.png');
  });

  test('should log image fixes', () => {
    const processor = remark().use(remarkFixImagePaths);
    const markdown = '![Alt](../images/example.png)';
    
    processor.processSync(markdown);
    
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('image-operations.log'),
      expect.stringContaining('FIXED')
    );
  });

  test('should handle errors gracefully', () => {
    const processor = remark().use(remarkFixImagePaths);
    
    // Create a malformed tree by passing invalid data
    const invalidTree = { type: 'root', children: null };
    
    expect(() => {
      const plugin = remarkFixImagePaths();
      plugin(invalidTree, { path: 'test.md' });
    }).not.toThrow();
    
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('build-errors.log'),
      expect.stringContaining('ERROR')
    );
  });

  test('should handle missing file path gracefully', () => {
    const processor = remark().use(remarkFixImagePaths);
    const markdown = '![Alt](../images/example.png)';
    
    expect(() => {
      processor.processSync(markdown);
    }).not.toThrow();
  });
});

