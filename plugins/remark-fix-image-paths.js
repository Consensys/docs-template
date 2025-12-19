/**
 * Remark plugin to fix image paths in markdown
 * Converts ../images/... to /img/ported-images/... (Docusaurus serves static files from root)
 * 
 * This is a CommonJS version that uses string replacement instead of AST traversal
 * to avoid ES module compatibility issues with unist-util-visit
 * 
 * NOTE: Images are downloaded to static/img/ported-images/ via docusaurus-plugin-remote-content.
 * This plugin only rewrites the paths in markdown/MDX content.
 */
const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.join(process.cwd(), "_maintainers", "logs");
const IMAGE_FIXES_LOG = path.join(LOGS_DIR, "image-path-fixes.log");

// Track image fixes with file context (matching original repo structure)
const imageFixes = []; // Array of { file, original, new, image }

function remarkFixImagePaths() {
  return (tree, file) => {
    const filePath = file?.path || file?.history?.[0] || "";
    const relativeFilePath = path.relative(process.cwd(), filePath);
    // Use a simple approach: traverse the tree manually
    // Since we can't use unist-util-visit (ES module), we'll do a simple recursive traversal
    function traverse(node) {
      if (!node || typeof node !== 'object') return;
      
      // Handle image nodes
      if (node.type === 'image' && node.url) {
        if (node.url.includes('../images/') || node.url.includes('./images/')) {
          const originalUrl = node.url;
          const imagePath = originalUrl.replace(/^(\.\.\/|\.\/)+images\//, '');
          const filename = imagePath.split('/').pop();
          const newUrl = `/img/ported-images/${filename}`;
          node.url = newUrl;
          imageFixes.push({ file: relativeFilePath, original: originalUrl, new: newUrl, image: filename });
        }
      }
      
      // Handle HTML nodes (for JSX img tags with require())
      if (node.type === 'html' && node.value) {
        let modified = false;
        let newValue = node.value;
        
        // Match src={require("../images/file.png").default} or src={require('../../images/file.png').default}
        newValue = newValue.replace(
          /src=\{require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
          (match, dots, imagePath) => {
            modified = true;
            const filename = imagePath.split('/').pop();
            const newPath = `src="/img/ported-images/${filename}"`;
            imageFixes.push({ file: relativeFilePath, original: match, new: newPath, image: filename });
            return newPath;
          }
        );
        
        // Also match single ../images/ pattern
        newValue = newValue.replace(
          /src=\{require\(["']\.\.\/images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
          (match, imagePath) => {
            modified = true;
            const filename = imagePath.split('/').pop();
            const newPath = `src="/img/ported-images/${filename}"`;
            imageFixes.push({ file: relativeFilePath, original: match, new: newPath, image: filename });
            return newPath;
          }
        );
        
        if (modified) {
          node.value = newValue;
        }
      }
      
      // Handle JSX nodes (mdxJsxFlowElement or mdxJsxTextElement) - this is how MDX parses JSX
      if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'img') {
        if (Array.isArray(node.attributes)) {
          node.attributes.forEach(attr => {
            if (attr.name === 'src' && attr.value) {
              // The value might be an object with type 'mdxJsxExpressionAttribute'
              // or it might be a string representation
              let valueStr = '';
              if (typeof attr.value === 'string') {
                valueStr = attr.value;
              } else if (attr.value && attr.value.type === 'mdxJsxExpressionAttribute') {
                // For JSX expressions, we need to check the value differently
                // The actual require() might be in a child node
                return; // Skip for now, handle in HTML node processing
              } else if (attr.value && attr.value.value) {
                valueStr = String(attr.value.value);
              }
              
              if (valueStr.includes('require') && valueStr.includes('../images/')) {
                const match = valueStr.match(/require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)/);
                if (match) {
                  const filename = match[2].split('/').pop();
                  const newPath = `/img/ported-images/${filename}`;
                  attr.value = newPath;
                  imageFixes.push({ file: relativeFilePath, original: match[0], new: newPath, image: filename });
                }
              }
            }
          });
        }
      }
      
      // Recursively traverse children
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
      
      // Also check other common properties that might contain nodes
      for (const key in node) {
        if (key !== 'children' && Array.isArray(node[key])) {
          node[key].forEach(traverse);
        }
      }
    }
    
    traverse(tree);
  };
}

// Write image fixes log at module unload (end of build) - matching original repo structure
process.on('exit', () => {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    if (imageFixes.length > 0) {
      const sortedFixes = imageFixes.sort((a, b) => {
        const fileCompare = a.file.localeCompare(b.file);
        return fileCompare !== 0 ? fileCompare : a.image.localeCompare(b.image);
      });
      const logContent = sortedFixes.map(fix => 
        `File: ${fix.file}\n  Original: ${fix.original}\n  New: ${fix.new}\n  Image: ${fix.image}\n`
      ).join('\n');
      fs.writeFileSync(IMAGE_FIXES_LOG, `Image Path Fixes (${imageFixes.length} total)\n${"=".repeat(80)}\n\n${logContent}`, "utf8");
    } else {
      fs.writeFileSync(IMAGE_FIXES_LOG, `Image Path Fixes (0 total)\n${"=".repeat(80)}\n\n`, "utf8");
    }
  } catch (err) {
    // Silently fail - don't break the build
  }
});

module.exports = remarkFixImagePaths;

