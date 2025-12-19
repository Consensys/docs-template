/**
 * Remark plugin to fix image paths in markdown
 * Converts ../images/... to /img/... (Docusaurus serves static files from root)
 * 
 * This is a CommonJS version that uses string replacement instead of AST traversal
 * to avoid ES module compatibility issues with unist-util-visit
 * Includes logging for image operations
 */
const fs = require("fs");
const path = require("path");

// Logging utility
function logToFile(logFile, message) {
  try {
    const logsDir = path.join(process.cwd(), "_maintainers", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, logFile);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8");
  } catch (err) {
    // Silently fail logging to avoid breaking builds
    console.warn(`[remark-fix-image-paths] Failed to write log: ${err.message}`);
  }
}

function remarkFixImagePaths() {
  const imageFixes = [];
  const imageErrors = [];

  return (tree, file) => {
    try {
      const filePath = file?.path || file?.history?.[0] || "unknown";
      
      // Use a simple approach: traverse the tree manually
      // Since we can't use unist-util-visit (ES module), we'll do a simple recursive traversal
      function traverse(node) {
        if (!node || typeof node !== 'object') return;
        
        // Handle image nodes
        if (node.type === 'image' && node.url) {
          if (node.url.includes('../images/') || node.url.includes('./images/')) {
            const imagePath = node.url.replace(/^(\.\.\/|\.\/)+images\//, '');
            const filename = imagePath.split('/').pop();
            const oldUrl = node.url;
            node.url = `/img/${filename}`;
            
            imageFixes.push({
              file: filePath,
              original: oldUrl,
              new: node.url,
              image: filename,
            });
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
              const newPath = `src="/img/${filename}"`;
              
              imageFixes.push({
                file: filePath,
                original: match,
                new: newPath,
                image: filename,
              });
              
              return newPath;
            }
          );
          
          // Also match single ../images/ pattern
          newValue = newValue.replace(
            /src=\{require\(["']\.\.\/images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
            (match, imagePath) => {
              modified = true;
              const filename = imagePath.split('/').pop();
              const newPath = `src="/img/${filename}"`;
              
              imageFixes.push({
                file: filePath,
                original: match,
                new: newPath,
                image: filename,
              });
              
              return newPath;
            }
          );
          
          // Match require() statements for images
          newValue = newValue.replace(
            /require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)/g,
            (match, dots, imagePath) => {
              modified = true;
              const filename = imagePath.split('/').pop();
              const newPath = `require('@site/static/img/${filename}')`;
              
              imageFixes.push({
                file: filePath,
                original: match,
                new: newPath,
                image: filename,
              });
              
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
                    const oldValue = attr.value;
                    attr.value = `/img/${filename}`;
                    
                    imageFixes.push({
                      file: filePath,
                      original: String(oldValue),
                      new: attr.value,
                      image: filename,
                    });
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
      
      // Log image fixes after processing
      if (imageFixes.length > 0) {
        imageFixes.forEach(fix => {
          logToFile("image-operations.log", `FIXED: File: ${fix.file}, Image: ${fix.image}, Original: ${fix.original}, New: ${fix.new}`);
        });
      }
      
    } catch (err) {
      const errorMsg = `ERROR: remark-fix-image-paths failed for file ${file?.path || 'unknown'}: ${err.message}\n${err.stack}`;
      logToFile("build-errors.log", errorMsg);
      logToFile("image-errors.log", errorMsg);
      console.error(`[remark-fix-image-paths] Error:`, err);
      // Don't throw - allow build to continue
    }
  };
}

module.exports = remarkFixImagePaths;

