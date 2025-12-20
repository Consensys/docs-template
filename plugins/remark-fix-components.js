/**
 * Remark plugin to fix/remove missing component imports
 * Comments out @site/src/components and @site/src/plugins imports that don't exist
 * Replaces component usage based on YAML config
 * Based on the approach from test-duplicate-data/scripts/get-remote.js
 */

const { 
  isPortedContent,
  getComponentReplacements, 
  getSettings 
} = require("./config-loader");
const { normalizePath, getFilePath } = require("./utils");

function remarkFixComponents() {
  return (tree, file) => {
    // Only process files in the ported content directory
    // Check multiple possible path formats from Docusaurus
    const filePath = getFilePath(file);
    const normalizedPath = normalizePath(filePath);
    
    // Check if file is in any ported content directory
    // If no path available, we'll process anyway and let the import check determine if it's relevant
    const isInPortedContent = !filePath || isPortedContent(filePath);
    
    if (!isInPortedContent && filePath) {
      return; // Skip files outside ported content (but only if we have a path to check)
    }

    function traverse(node) {
      if (!node || typeof node !== 'object') return;

      // Handle MDX import statements (mdxjsEsm) - replace component imports based on config
      // This runs BEFORE MDX processes the imports, so we can comment them out
      if (node.type === 'mdxjsEsm' && node.value) {
        let newValue = node.value;
        let modified = false;

        // Load component replacements from config
        const componentReplacements = getComponentReplacements();
        const settings = getSettings();
        const componentMap = new Map();
        componentReplacements.forEach(replacement => {
          if (replacement.component && replacement.importPath) {
            componentMap.set(replacement.component.toLowerCase(), replacement);
          }
        });

        // Match @site/src/components imports
        newValue = newValue.replace(
          /^import\s+(\w+)\s+from\s+["']@site\/src\/components\/([^"']+)["'];?\s*$/gm,
          (match, componentName, componentPath) => {
            modified = true;
            
            // Check if we have a replacement configured for this component
            const replacement = componentMap.get(componentName.toLowerCase());
            
            if (replacement) {
              // Check if the import path matches
              const importPathRegex = new RegExp(replacement.importPath.replace(/\./g, '\\.'));
              if (importPathRegex.test(componentPath)) {
                // Remove the import (replacement will be handled elsewhere)
                return '';
              }
            }
            
            // No replacement configured - comment it out
            return `// ${match} // ${settings.defaultComponentMessage}`;
          }
        );

        // Match @site/src/plugins imports (named imports)
        newValue = newValue.replace(
          /^import\s+{([^}]+)}\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm,
          (match) => {
            modified = true;
            return `// ${match} // ${settings.defaultPluginMessage}`;
          }
        );

        // Match @site/src/plugins imports (default imports)
        newValue = newValue.replace(
          /^import\s+(\w+)\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm,
          (match) => {
            modified = true;
            return `// ${match} // ${settings.defaultPluginMessage}`;
          }
        );

        if (modified) {
          node.value = newValue;
        }
      }

      // Note: JSX component usage is handled by text-based fixComponentImports in port-content.js
      // This plugin only handles import statements to avoid AST manipulation issues
      // The working source code does text replacement before MDX compilation, not AST manipulation

      // Recursively traverse children
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    }

    traverse(tree);
  };
}

module.exports = remarkFixComponents;

