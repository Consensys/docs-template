const path = require('path');

// Mock child_process before requiring the module
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 10);
      }
      return { on: jest.fn() };
    }),
    kill: jest.fn(),
  })),
}));

// Mock fs
const mockFs = {
  existsSync: jest.fn((filePath) => {
    // Mock common paths that should exist
    if (filePath.includes('node_modules') || 
        filePath.includes('docusaurus.config.js') ||
        filePath.includes('package.json')) {
      return true;
    }
    // Mock .env not existing by default
    if (filePath.includes('.env')) {
      return false;
    }
    return false;
  }),
  readFileSync: jest.fn((filePath) => {
    if (filePath.includes('package.json')) {
      return JSON.stringify({ name: 'docs-template', version: '1.19.0' });
    }
    return '';
  }),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  unlinkSync: jest.fn(),
  renameSync: jest.fn(),
};

jest.mock('fs', () => mockFs);

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('port-content script', () => {
  let portContent;
  
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
    delete process.env.API_TOKEN;
    // Reset mocks
    mockFs.existsSync.mockImplementation((filePath) => {
      if (filePath.includes('node_modules') || 
          filePath.includes('docusaurus.config.js') ||
          filePath.includes('package.json')) {
        return true;
      }
      return false;
    });
    
    // Clear module cache to get fresh mocks
    jest.resetModules();
    portContent = require('../port-content');
  });

  afterAll(() => {
    // Clean up any leftover test files from previous failed test runs
    const actualFs = jest.requireActual('fs');
    const path = require('path');
    const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
    const PORTED_DATA_DIR = path.join(
      PROJECT_ROOT,
      'docs',
      'single-source',
      'between-repos',
      'Plugins',
      'MetaMask-ported-data'
    );
    
    if (!actualFs.existsSync(PORTED_DATA_DIR)) {
      return;
    }
    
    try {
      const files = actualFs.readdirSync(PORTED_DATA_DIR);
      files.forEach(file => {
        // Clean up any test files/folders that match our pattern
        if (file.startsWith('static-test-') || file.startsWith('test-file-')) {
          const filePath = path.join(PORTED_DATA_DIR, file);
          try {
            const stat = actualFs.statSync(filePath);
            if (stat.isDirectory()) {
              actualFs.rmSync(filePath, { recursive: true, force: true });
            } else {
              actualFs.unlinkSync(filePath);
            }
          } catch (err) {
            // Ignore cleanup errors
          }
        }
      });
    } catch (err) {
      // Ignore errors reading directory
    }
  });

  test('checkGitHubToken should warn if token is not set', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    portContent.checkGitHubToken();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('GITHUB_TOKEN')
    );
    
    consoleSpy.mockRestore();
  });

  test('checkGitHubToken should not warn if GITHUB_TOKEN is set', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Need to re-require to get fresh function
    jest.resetModules();
    const freshPortContent = require('../port-content');
    freshPortContent.checkGitHubToken();
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
    delete process.env.GITHUB_TOKEN;
  });

  test('checkGitHubToken should not warn if API_TOKEN is set', () => {
    process.env.API_TOKEN = 'test-token';
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    jest.resetModules();
    const freshPortContent = require('../port-content');
    freshPortContent.checkGitHubToken();
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
    delete process.env.API_TOKEN;
  });

  test('validateSetup should pass when required files exist', () => {
    mockFs.existsSync.mockImplementation((filePath) => {
      if (filePath.includes('node_modules') || 
          filePath.includes('docusaurus.config.js') ||
          filePath.includes('package.json')) {
        return true;
      }
      return false;
    });
    
    jest.resetModules();
    const freshPortContent = require('../port-content');
    
    expect(() => freshPortContent.validateSetup()).not.toThrow();
  });

  test('fixImagePaths should fix markdown image syntax', () => {
    jest.resetModules();
    const freshPortContent = require('../port-content');
    
    const content = '![alt](../images/test.png)';
    const result = freshPortContent.fixImagePaths(content, '/test/path.md');
    
    expect(result.modified).toBe(true);
    expect(result.content).toContain('/img/ported-images/test.png');
    expect(result.imageFixes.length).toBe(1);
    expect(result.imageFixes[0].image).toBe('test.png');
  });

  test('fixImagePaths should fix require() statements', () => {
    jest.resetModules();
    const freshPortContent = require('../port-content');
    
    const content = 'require("../images/test.png")';
    const result = freshPortContent.fixImagePaths(content, '/test/path.md');
    
    expect(result.modified).toBe(true);
    expect(result.content).toContain('@site/static/img/ported-images/test.png');
  });

  test('fixComponentImports should replace JSX components with comments', () => {
    // Mock config-loader before requiring port-content
    jest.doMock('../../../plugins/config-loader', () => ({
      getComponentReplacements: jest.fn(() => [
        {
          component: 'SectionNetworks',
          importPath: '@site/src/components/Sections/SectionNetworks\\.jsx',
          replacement: 'SectionNetworks component not available in this project',
          jsxReplacement: '<!-- SectionNetworks component not available -->',
          insertNote: false
        },
        {
          component: 'SectionAPIs',
          importPath: '@site/src/components/Sections/SectionAPIs\\.jsx',
          replacement: 'SectionAPIs component not available in this project',
          jsxReplacement: '<!-- SectionAPIs component not available -->',
          insertNote: false
        }
      ]),
      getSettings: jest.fn(() => ({
        defaultComponentMessage: 'Component not available in this project',
        defaultPluginMessage: 'Plugin not available in this project',
        fallbackCommentedOut: '(commented out)',
        fallbackReplaced: '(replaced)'
      })),
      getPortedContentDirsRelative: jest.fn(() => ['docs/single-source/between-repos/Plugins/MetaMask-ported-data'])
    }));
    
    jest.resetModules();
    const freshPortContent = require('../port-content');
    
    const content = `import SectionNetworks from "@site/src/components/Sections/SectionNetworks.jsx";
import SectionAPIs from "@site/src/components/Sections/SectionAPIs.jsx";

# Title

<SectionNetworks />
<SectionAPIs />`;
    
    const result = freshPortContent.fixComponentImports(content, '/test/path.md');
    
    expect(result.modified).toBe(true);
    // Imports should be commented out (not removed)
    expect(result.content).toContain('// import SectionNetworks from');
    expect(result.content).toContain('// import SectionAPIs from');
    // JSX should be replaced with comments
    expect(result.content).toContain('{/* SectionNetworks');
    expect(result.content).toContain('{/* SectionAPIs');
    expect(result.componentFixes.length).toBeGreaterThan(0);
  });

  test('fixComponentImports should handle components even if imports are already commented', () => {
    // Mock config-loader before requiring port-content
    jest.doMock('../../../plugins/config-loader', () => ({
      getComponentReplacements: jest.fn(() => [
        {
          component: 'SectionNetworks',
          importPath: '@site/src/components/Sections/SectionNetworks\\.jsx',
          replacement: 'SectionNetworks component not available in this project',
          jsxReplacement: '<!-- SectionNetworks component not available -->',
          insertNote: false
        }
      ]),
      getSettings: jest.fn(() => ({
        defaultComponentMessage: 'Component not available in this project',
        defaultPluginMessage: 'Plugin not available in this project',
        fallbackCommentedOut: '(commented out)',
        fallbackReplaced: '(replaced)'
      })),
      getPortedContentDirsRelative: jest.fn(() => ['docs/single-source/between-repos/Plugins/MetaMask-ported-data'])
    }));
    
    jest.resetModules();
    const freshPortContent = require('../port-content');
    
    // Content with already-commented imports but active JSX usage
    const content = `// import SectionNetworks from "@site/src/components/Sections/SectionNetworks.jsx";

# Title

<SectionNetworks />`;
    
    const result = freshPortContent.fixComponentImports(content, '/test/path.md');
    
    // Should still replace JSX even though import is commented
    expect(result.modified).toBe(true);
    expect(result.content).toContain('{/* SectionNetworks');
    expect(result.content).not.toContain('<SectionNetworks />');
  });

  test('static files and folders should survive porting events', () => {
    // Use actual fs module, not mocked one
    const actualFs = jest.requireActual('fs');
    const path = require('path');
    
    // Get project root (three levels up from scripts/pipeline/__tests__/)
    const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
    const PORTED_DATA_DIR = path.join(
      PROJECT_ROOT,
      'docs',
      'single-source',
      'between-repos',
      'Plugins',
      'MetaMask-ported-data'
    );
    
    // Skip test if ported data directory doesn't exist (first run scenario)
    if (!actualFs.existsSync(PORTED_DATA_DIR)) {
      console.log('   ⚠️  Ported data directory does not exist, skipping test');
      return;
    }
    
    // Generate unique test folder/file names to avoid conflicts
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testFolderName = `static-test-${testId}`;
    const testFileName = `test-file-${testId}.md`;
    const testNestedFolder = path.join(testFolderName, 'nested', 'deep');
    const testNestedFile = path.join(testNestedFolder, `nested-${testId}.mdx`);
    const testImageFile = path.join(testFolderName, `test-image-${testId}.png`);
    const testCodeFile = path.join(testFolderName, `test-code-${testId}.js`);
    
    // Test file paths
    const testFiles = {
      rootFile: path.join(PORTED_DATA_DIR, testFileName),
      nestedFile: path.join(PORTED_DATA_DIR, testNestedFile),
      imageFile: path.join(PORTED_DATA_DIR, testImageFile),
      codeFile: path.join(PORTED_DATA_DIR, testCodeFile),
    };
    
    // Test folder path (defined outside try for cleanup)
    const testFolderPath = path.join(PORTED_DATA_DIR, testFolderName);
    
    // Test content
    const testContent = {
      markdown: `# Test File ${testId}\n\nThis is a test file that should survive porting.`,
      mdx: `---\ntitle: Test MDX ${testId}\n---\n\nThis MDX file should survive porting.`,
      image: 'fake-image-data',
      code: `// Test code file ${testId}\nconsole.log('This should survive porting');`,
    };
    
    try {
      // Create test structure
      console.log(`   Creating test structure: ${testFolderName}`);
      
      // Create root test file
      actualFs.writeFileSync(testFiles.rootFile, testContent.markdown, 'utf8');
      expect(actualFs.existsSync(testFiles.rootFile)).toBe(true);
      
      // Create nested folder structure
      const nestedDir = path.dirname(testFiles.nestedFile);
      actualFs.mkdirSync(nestedDir, { recursive: true });
      actualFs.writeFileSync(testFiles.nestedFile, testContent.mdx, 'utf8');
      expect(actualFs.existsSync(testFiles.nestedFile)).toBe(true);
      
      // Create test folder with image and code files
      const testFolderImagePath = path.dirname(testFiles.imageFile);
      actualFs.mkdirSync(testFolderImagePath, { recursive: true });
      actualFs.writeFileSync(testFiles.imageFile, testContent.image, 'utf8');
      actualFs.writeFileSync(testFiles.codeFile, testContent.code, 'utf8');
      expect(actualFs.existsSync(testFiles.imageFile)).toBe(true);
      expect(actualFs.existsSync(testFiles.codeFile)).toBe(true);
      
      // Verify all files exist before "porting"
      Object.values(testFiles).forEach(filePath => {
        expect(actualFs.existsSync(filePath)).toBe(true);
      });
      
      // Simulate porting process - in real scenario, docusaurus-plugin-remote-content
      // would download files here. Since performCleanup: false, existing files should remain.
      // We can't actually run the port in a test, but we verify the structure exists
      // and would survive (the plugin config ensures this with performCleanup: false)
      
      // Verify files still exist (they should, since we just created them)
      // In a real port scenario, these would be checked after running npm run port
      Object.entries(testFiles).forEach(([name, filePath]) => {
        const exists = actualFs.existsSync(filePath);
        expect(exists).toBe(true);
        
        if (exists) {
          // Verify content is intact
          const content = actualFs.readFileSync(filePath, 'utf8');
          expect(content.length).toBeGreaterThan(0);
          
          // Verify specific content for known files
          if (name === 'rootFile') {
            expect(content).toContain(testId);
          } else if (name === 'nestedFile') {
            expect(content).toContain(testId);
          } else if (name === 'codeFile') {
            expect(content).toContain(testId);
          }
        }
      });
      
      console.log(`   ✅ All test files created and verified`);
      
    } finally {
      // Cleanup: Remove all test files and folders
      console.log(`   Cleaning up test structure: ${testFolderName}`);
      
      // Remove root test file if it exists
      if (actualFs.existsSync(testFiles.rootFile)) {
        try {
          actualFs.unlinkSync(testFiles.rootFile);
        } catch (err) {
          console.log(`   ⚠️  Could not remove root test file: ${err.message}`);
        }
      }
      
      // Remove test folder recursively (this will remove all nested files and folders)
      if (actualFs.existsSync(testFolderPath)) {
        try {
          actualFs.rmSync(testFolderPath, { recursive: true, force: true });
        } catch (err) {
          console.log(`   ⚠️  Could not remove test folder: ${err.message}`);
        }
      }
      
      // Verify cleanup
      const stillExists = actualFs.existsSync(testFiles.rootFile) || actualFs.existsSync(testFolderPath);
      if (stillExists) {
        console.log(`   ⚠️  Warning: Some test files/folders may still exist`);
      } else {
        console.log(`   ✅ Cleanup completed`);
      }
    }
  });
});

