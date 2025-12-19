/**
 * Remark plugin to fix/remove missing component imports
 * Comments out @site/src/components and @site/src/plugins imports that don't exist
 * Replaces CreditCost component usage with link to README
 * Based on the approach from test-duplicate-data/scripts/get-remote.js
 */

const PORTED_CONTENT_DIR = "docs/single-source/between-repos/Plugins/MetaMask-ported-data";
const NOT_PORTED_README_PATH = "/docs/single-source/between-repos/Plugins/MetaMask-ported-data/not-ported/README.md";

function remarkFixComponents() {
  return (tree, file) => {
    // Only process files in the ported content directory
    // Check multiple possible path formats from Docusaurus
    const filePath = file?.path || file?.history?.[0] || file?.data?.filePath || "";
    const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize Windows paths
    
    // Check if file is in ported content directory (multiple ways to match)
    // If no path available, we'll process anyway and let the import check determine if it's relevant
    const isPortedContent = 
      !filePath || // If no path, process anyway
      normalizedPath.includes(PORTED_CONTENT_DIR) ||
      normalizedPath.includes('MetaMask-ported-data') ||
      normalizedPath.includes('single-source/between-repos/Plugins');
    
    if (!isPortedContent && filePath) {
      return; // Skip files outside ported content (but only if we have a path to check)
    }

    function traverse(node) {
      if (!node || typeof node !== 'object') return;

      // Handle MDX import statements (mdxjsEsm) - replace CreditCost imports with link
      // This runs BEFORE MDX processes the imports, so we can comment them out
      if (node.type === 'mdxjsEsm' && node.value) {
        let newValue = node.value;
        let modified = false;

        // Special handling for CreditCost component - replace import with link info
        // Match the exact import pattern - be very specific to catch it
        if (newValue.includes('CreditCost') && newValue.includes('@site/src/components/CreditCost')) {
          modified = true;
          // Replace the entire import line with a comment
          // Match: import CreditCost from '@site/src/components/CreditCost/CreditCostPrice.js';
          // Handle with or without semicolon, with or without trailing newline
          newValue = newValue.replace(
            /import\s+CreditCost\s+from\s+['"]@site\/src\/components\/CreditCost\/CreditCostPrice\.js['"];?\s*\n?/g,
            `// CreditCost component not available in this repo - see [credit cost information](${NOT_PORTED_README_PATH}#credit-cost)\n`
          );
        }

        // Match other @site/src/components imports (but not CreditCost which we already handled)
        if (!newValue.includes('CreditCost')) {
          newValue = newValue.replace(
            /^import\s+(\w+)\s+from\s+["']@site\/src\/components\/([^"']+)["'];?\s*$/gm,
            (match) => {
              modified = true;
              return `// ${match} // Component not available in this project`;
            }
          );
        }

        // Match @site/src/plugins imports (named imports)
        newValue = newValue.replace(
          /^import\s+{([^}]+)}\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm,
          (match) => {
            modified = true;
            return `// ${match} // Plugin not available in this project`;
          }
        );

        // Match @site/src/plugins imports (default imports)
        newValue = newValue.replace(
          /^import\s+(\w+)\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm,
          (match) => {
            modified = true;
            return `// ${match} // Plugin not available in this project`;
          }
        );

        if (modified) {
          node.value = newValue;
        }
      }

      // Handle JSX elements - replace CreditCost component usage with link
      if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'CreditCost') {
        // Replace CreditCost component with a paragraph containing a link to the README
        // This preserves the content flow while removing the broken component
        const linkNode = {
          type: 'link',
          url: NOT_PORTED_README_PATH + '#credit-cost',
          children: [
            {
              type: 'text',
              value: 'credit cost information',
            },
          ],
        };
        
        const textBefore = {
          type: 'text',
          value: 'For credit cost information, see ',
        };
        
        const textAfter = {
          type: 'text',
          value: '.',
        };
        
        // Transform the JSX element into a paragraph with link
        node.type = 'paragraph';
        node.name = undefined; // Remove JSX-specific properties
        node.attributes = undefined;
        node.children = [textBefore, linkNode, textAfter];
      }

      // Recursively traverse children
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    }

    traverse(tree);
  };
}

module.exports = remarkFixComponents;

