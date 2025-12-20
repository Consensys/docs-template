// plugins/remark-link-rewriter.js
/**
 * Remark plugin to rewrite links based on YAML configuration
 * Only processes files in the ported content directory
 * Handles relative paths that point outside ported content by converting to external URLs
 * Based on the simpler, less brittle approach from test-duplicate-data
 * 
 * Note: Contains MetaMask-specific logic for base/ethereum mapping:
 * - Maps base/ paths to ethereum/ in external MetaMask URLs (base services use ethereum paths upstream)
 * - Maps ethereum/ links to base/ if base version exists locally
 * This is intentional for MetaMask docs porting but could be generalized for other use cases
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { getPortedContentDirs, getPortedContentDirsRelative, isPortedContent, getPortedContentDirForFile } = require("./config-loader");
const { getLogsDir, ensureLogsDir, normalizePath, getFilePath } = require("./utils");

// Get ported content directories from config
const PORTED_CONTENT_DIRS = getPortedContentDirsRelative();
const PORTED_CONTENT_DIRS_ABSOLUTE = getPortedContentDirs();
const LOGS_DIR = getLogsDir();
const DROPPED_LINKS_LOG = path.join(LOGS_DIR, "links-dropped.log");
const EXTERNAL_LINKS_LOG = path.join(LOGS_DIR, "links-external.log");
const LINKS_REPLACED_LOG = path.join(LOGS_DIR, "links-replaced.log");

// Track transformations with file context (matching original repo structure)
const droppedLinks = []; // Array of { file, link }
const externalLinks = []; // Array of { file, original, external }
const replacedLinks = []; // Array of { file, original, new }

/**
 * Check if a relative path points to a file that exists in the ported content
 */
function pathExistsInPortedContent(relativePath, baseDir) {
  try {
    const resolvedPath = path.resolve(baseDir, relativePath);
    // Check if resolved path is within any ported content directory
    const isInPortedDir = PORTED_CONTENT_DIRS_ABSOLUTE.some(dir => 
      resolvedPath.startsWith(dir)
    );
    if (!isInPortedDir) {
      return false;
    }
    // Check if file exists
    if (fs.existsSync(resolvedPath)) {
      return true;
    }
    // Also check with .md and .mdx extensions
    if (!path.extname(resolvedPath)) {
      return fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx');
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Try to map ethereum links to base links if base version exists
 * MetaMask-specific: base services use ethereum paths upstream, so we map ethereum->base for local links
 */
function tryMapEthereumToBase(relativePath, baseDir) {
  // Try various patterns to map ethereum to base
  let basePath = null;
  
  // Pattern 1: ../ethereum/... -> ../base/...
  if (relativePath.includes('../ethereum/')) {
    basePath = relativePath.replace(/\.\.\/ethereum\//, '../base/');
    if (pathExistsInPortedContent(basePath, baseDir)) {
      return basePath;
    }
  }
  
  // Pattern 2: /ethereum/... -> /base/...
  if (relativePath.includes('/ethereum/')) {
    basePath = relativePath.replace(/\/ethereum\//, '/base/');
    if (pathExistsInPortedContent(basePath, baseDir)) {
      return basePath;
    }
  }
  
  // Pattern 3: ethereum/... -> base/...
  if (relativePath.startsWith('ethereum/')) {
    basePath = relativePath.replace(/^ethereum\//, 'base/');
    if (pathExistsInPortedContent(basePath, baseDir)) {
      return basePath;
    }
  }
  
  return null;
}

/**
 * Convert relative path to MetaMask docs external URL
 * Handles paths like ../ethereum/... or ../../concepts/...
 * Removes file extensions (.md, .mdx) from URLs
 * 
 * MetaMask-specific: Maps base/ paths to ethereum/ in external URLs
 * (base services use ethereum paths in MetaMask docs upstream)
 */
function convertToExternalUrl(relativePath, baseDir) {
  // Remove leading ../ or ./
  let cleanPath = relativePath.replace(/^(\.\.\/|\.\/)+/, '');
  
  // Remove file extensions for external URLs (MetaMask docs don't use .mdx in URLs)
  cleanPath = cleanPath.replace(/\.(md|mdx)$/, '');
  
  // Try to resolve the path relative to the current file to understand context
  let resolvedPath = null;
  try {
    resolvedPath = path.resolve(baseDir, relativePath);
    // Check if this path is within any ported content directory
    const portedDirForFile = getPortedContentDirForFile(resolvedPath);
    if (portedDirForFile) {
      const relativeToPorted = path.relative(portedDirForFile, resolvedPath);
      // Map base/ to ethereum/ for MetaMask docs
      // Example: reference/base/json-rpc-methods/filter-methods/eth_newfilter
      // -> services/reference/ethereum/json-rpc-methods/filter-methods/eth_newfilter
      if (relativeToPorted.startsWith('reference/base/')) {
        const ethereumPath = relativeToPorted.replace(/^reference\/base\//, '');
        return `https://docs.metamask.io/services/reference/ethereum/${ethereumPath}`;
      }
      // If it's already in reference/ but not base/, keep structure
      if (relativeToPorted.startsWith('reference/')) {
        const refPath = relativeToPorted.replace(/^reference\//, '');
        // If it doesn't have a network, assume ethereum (base services)
        if (!refPath.match(/^(base|ethereum|linea|sei|arbitrum|avalanche)\//)) {
          return `https://docs.metamask.io/services/reference/ethereum/${refPath}`;
        }
        return `https://docs.metamask.io/services/reference/${refPath}`;
      }
    }
  } catch (e) {
    // If resolution fails, fall back to simple path construction
  }
  
  // Handle ethereum paths
  if (cleanPath.startsWith('ethereum/')) {
    return `https://docs.metamask.io/services/reference/${cleanPath}`;
  }
  
  // Handle concepts paths
  if (cleanPath.startsWith('concepts/')) {
    return `https://docs.metamask.io/services/${cleanPath}`;
  }
  
  // Handle reference paths - assume ethereum if no network specified
  if (cleanPath.startsWith('reference/')) {
    const refPath = cleanPath.replace(/^reference\//, '');
    // If no network specified, assume ethereum (base services)
    if (!refPath.match(/^(base|ethereum|linea|sei|arbitrum|avalanche)\//)) {
      return `https://docs.metamask.io/services/reference/ethereum/${refPath}`;
    }
    // Map base/ to ethereum/
    const ethereumPath = refPath.replace(/^base\//, 'ethereum/');
    return `https://docs.metamask.io/services/reference/${ethereumPath}`;
  }
  
  // For paths that look like method names (eth_*, net_*, web3_*), assume they're in ethereum/json-rpc-methods
  // This handles cases like ../eth_newfilter from filter-methods/
  if (cleanPath.match(/^(eth_|net_|web3_|shh_)/)) {
    // Try to infer the category from the baseDir
    let category = '';
    if (baseDir.includes('filter-methods')) {
      category = 'filter-methods/';
    } else if (baseDir.includes('subscription-methods')) {
      category = 'subscription-methods/';
    } else if (baseDir.includes('bundler')) {
      category = 'bundler/';
    }
    return `https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/${category}${cleanPath}`;
  }
  
  // Default: assume it's a services path
  return `https://docs.metamask.io/services/${cleanPath}`;
}

function loadLinkReplacements() {
  const configPath = path.join(process.cwd(), "_maintainers", "link-replacements.yaml");

  if (!fs.existsSync(configPath)) {
    console.warn(`[remark-link-rewriter] No link-replacements.yaml found at ${configPath}`);
    return { replacements: new Map(), patterns: [] };
  }

  const content = fs.readFileSync(configPath, "utf8");
  const config = yaml.load(content) || {};

  // Exact replacements: { "/old/path": "https://new/url" }
  const replacements = new Map();
  if (config.replacements && typeof config.replacements === "object") {
    for (const [from, to] of Object.entries(config.replacements)) {
      replacements.set(from, to);
    }
  }

  // Pattern-based replacements: [{ pattern, replacement, description, extractPath }]
  const patterns = [];
  if (Array.isArray(config.patterns)) {
    for (const p of config.patterns) {
      if (!p.pattern || !p.replacement) continue;

      let regexPattern = p.pattern;
      let originalPattern = p.pattern; // Store original pattern for path extraction

      // If pattern has no '*' and no regex chars (except .+) → treat as prefix
      // Special handling for '.+' to not escape it
      if (!regexPattern.includes("*") && !/[?^${}()|[\]\\]/.test(regexPattern) && !regexPattern.endsWith('.+')) {
        regexPattern =
          regexPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + ".*";
      } else {
        // Escape regex chars except '*' and '.+' and turn '*' into '.*'
        regexPattern = regexPattern
          .replace(/[?^${}()|[\]\\]/g, "\\$&") // Escape all except . + *
          .replace(/\*/g, ".*") // Convert * to .*
          .replace(/\.\+/g, ".+"); // Ensure .+ remains .+
      }

      regexPattern = "^" + regexPattern; // anchor at start

      patterns.push({
        originalPattern: originalPattern, // Store original pattern
        regex: new RegExp(regexPattern),
        replacement: p.replacement,
        extractPath: p.extractPath === true,
        description: p.description || "",
      });
    }
  }

  return { replacements, patterns };
}

function remarkLinkRewriter() {
  const { replacements, patterns } = loadLinkReplacements();

  // Early return if no replacements configured
  if (replacements.size === 0 && patterns.length === 0) {
    return (tree, file) => {
      // Still need to handle relative paths for ported content
      const filePath = getFilePath(file);
      if (!isPortedContent(filePath)) {
        return; // Skip files outside ported content
      }
      
      // Handle relative paths even without config
      function traverse(node) {
        if (!node || typeof node !== 'object' || !node.type) return;
        
        if (
          node.type === 'code' || 
          node.type === 'inlineCode' ||
          node.type === 'mdxjsEsm' ||
          node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement' ||
          node.type === 'mdxjsExpression' ||
          node.type === 'html'
        ) {
          return;
        }
        
        if (node.type === 'link' && node.url && typeof node.url === 'string') {
          const originalUrl = String(node.url);
          
          // Handle relative paths that point outside ported content
          // Skip absolute URLs, anchors, and Docusaurus routes (/docs/...)
          // Docusaurus routes are valid and should not be processed
          if (!(/^(https?|mailto):/.test(originalUrl) || originalUrl.startsWith("#") || originalUrl.startsWith("/docs/"))) {
            const isRelativePath = !originalUrl.startsWith('/') && 
                                   !/^(https?|mailto):/.test(originalUrl) && 
                                   !originalUrl.startsWith('#');
            if (isRelativePath) {
              const baseDir = path.dirname(filePath);
              // First, try to map ethereum links to base links if base version exists
              const mappedPath = tryMapEthereumToBase(originalUrl, baseDir);
              if (mappedPath) {
                node.url = mappedPath;
                const relativeFilePath = path.relative(process.cwd(), filePath);
                replacedLinks.push({ file: relativeFilePath, original: originalUrl, new: mappedPath });
              } else               if (!pathExistsInPortedContent(originalUrl, baseDir)) {
                // Convert to external URL
                const externalUrl = convertToExternalUrl(originalUrl, baseDir);
                node.url = externalUrl;
                const relativeFilePath = path.relative(process.cwd(), filePath);
                externalLinks.push({ file: relativeFilePath, original: originalUrl, external: externalUrl });
              }
            }
          }
        }
        
        if (Array.isArray(node.children)) {
          node.children.forEach(traverse);
        }
      }
      
      traverse(tree);
    };
  }

  return (tree, file) => {
    // Only process files in any ported content directory
    const filePath = getFilePath(file);
    if (!isPortedContent(filePath)) {
      return; // Skip files outside ported content
    }

    const baseDir = path.dirname(filePath);

    function traverse(node) {
      if (!node || typeof node !== 'object' || !node.type) return;
      
      // Skip code blocks, inline code, and MDX-specific nodes - they contain literal code/content
      // that shouldn't be processed and could break MDX compilation if modified
      // Also skip HTML nodes to avoid corrupting JSX/HTML structures
      // Note: Import statements (mdxjsEsm) are handled by webpack alias, not by this plugin
      if (
        node.type === 'code' || 
        node.type === 'inlineCode' ||
        node.type === 'mdxjsEsm' ||
        node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement' ||
        node.type === 'mdxjsExpression' ||
        node.type === 'html'
      ) {
        return;
      }
      
      // Handle link nodes - only modify the URL property, nothing else
      // Be very defensive: only process if it's actually a link node with a string URL
      if (node.type === 'link' && node.url && typeof node.url === 'string') {
        const originalUrl = String(node.url); // Ensure it's a string

        // Skip absolute URLs, anchors, and Docusaurus routes (/docs/...)
        // Docusaurus routes are valid and should not be processed
        if (!(/^(https?|mailto):/.test(originalUrl) || originalUrl.startsWith("#") || originalUrl.startsWith("/docs/"))) {
          let newUrl = originalUrl;
          
          // Check if this is a relative path (not starting with /, http, mailto, or #)
          const isRelativePath = !originalUrl.startsWith('/') && 
                                 !/^(https?|mailto):/.test(originalUrl) && 
                                 !originalUrl.startsWith('#');
          
          // Handle relative paths first (before pattern matching)
          if (isRelativePath) {
            // First, try to map ethereum links to base links if base version exists
            const mappedPath = tryMapEthereumToBase(originalUrl, baseDir);
            if (mappedPath) {
              newUrl = mappedPath;
              const relativeFilePath = path.relative(process.cwd(), filePath);
              replacedLinks.push({ file: relativeFilePath, original: originalUrl, new: newUrl });
            } else if (!pathExistsInPortedContent(originalUrl, baseDir)) {
              // Path doesn't exist in ported content, convert to external URL
              newUrl = convertToExternalUrl(originalUrl, baseDir);
              const relativeFilePath = path.relative(process.cwd(), filePath);
              externalLinks.push({ file: relativeFilePath, original: originalUrl, external: newUrl });
            }
            // If path exists in ported content, keep it as-is (it's a valid relative link)
          } else {
            // Handle absolute paths with pattern-based replacements
            // 1. Pattern-based replacements (applied first as per YAML comment)
            for (const pattern of patterns) {
              const match = originalUrl.match(pattern.regex);
              if (match) {
                newUrl = pattern.replacement;
                if (pattern.extractPath) {
                  // Extract the part of the URL after the original pattern
                  // Example: url = /developer-tools/dashboard/foo/bar, originalPattern = /developer-tools/dashboard/.+
                  // We want /foo/bar
                  const patternBase = pattern.originalPattern.replace(/\.\+$/, ''); // Remove the '.+' from the end
                  const extractedPath = originalUrl.substring(patternBase.length);
                  newUrl = `${pattern.replacement}${extractedPath}`;
                }
                // Track replacement
                const relativeFilePath = path.relative(process.cwd(), filePath);
                replacedLinks.push({ file: relativeFilePath, original: originalUrl, new: newUrl });
                break; // Stop checking patterns once one matches
              }
            }

            // 2. Exact replacements (normalized variants) - only if not already replaced by pattern
            if (newUrl === originalUrl) {
              const normalizedWithSlash = originalUrl.startsWith("/") ? originalUrl : "/" + originalUrl;
              const withoutSlash = originalUrl.replace(/^\//, "");

              const exact =
                replacements.get(originalUrl) ||
                replacements.get(normalizedWithSlash) ||
                replacements.get(withoutSlash);

              if (exact) {
                newUrl = exact;
                // Track replacement
                const relativeFilePath = path.relative(process.cwd(), filePath);
                replacedLinks.push({ file: relativeFilePath, original: originalUrl, new: newUrl });
              } else {
                // Link doesn't match any pattern or exact replacement
                // If it's a /services/... path, convert to external MetaMask URL
                // Otherwise, track as dropped (broken/invalid link)
                const relativeFilePath = path.relative(process.cwd(), filePath);
                if (originalUrl.startsWith('/services/')) {
                  newUrl = `https://docs.metamask.io${originalUrl}`;
                  externalLinks.push({ file: relativeFilePath, original: originalUrl, external: newUrl });
                } else {
                  // Track as dropped for non-services paths
                  droppedLinks.push({ file: relativeFilePath, link: originalUrl });
                }
              }
            }
          }
          
          // Only modify if URL actually changed
          if (newUrl !== originalUrl) {
            node.url = newUrl;
          }
        }
      }
      
      // Recursively traverse children - only standard markdown children array
      // Don't traverse into other properties to avoid corrupting MDX structures
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }
    
    traverse(tree);
  };
}

// Write logs at module unload (end of build) - matching original repo structure
process.on('exit', () => {
  try {
    ensureLogsDir();
    
    // Write dropped links log (matching original format)
    if (droppedLinks.length > 0) {
      const sortedLinks = droppedLinks.sort((a, b) => {
        const fileCompare = a.file.localeCompare(b.file);
        return fileCompare !== 0 ? fileCompare : a.link.localeCompare(b.link);
      });
      const logContent = sortedLinks.map(({ file, link }) => 
        `File: ${file}\n  Broken Link: ${link}\n`
      ).join('\n');
      fs.writeFileSync(DROPPED_LINKS_LOG, `Broken Links Removed (${droppedLinks.length} total)\n${"=".repeat(80)}\n\n${logContent}`, "utf8");
    } else {
      fs.writeFileSync(DROPPED_LINKS_LOG, `Broken Links Removed (0 total)\n${"=".repeat(80)}\n\n`, "utf8");
    }
    
    // Write external links log (matching original format)
    if (externalLinks.length > 0) {
      const sortedLinks = externalLinks.sort((a, b) => {
        const fileCompare = a.file.localeCompare(b.file);
        return fileCompare !== 0 ? fileCompare : a.original.localeCompare(b.original);
      });
      const logContent = sortedLinks.map(({ file, original, external }) => 
        `File: ${file}\n  Original: ${original}\n  External: ${external}\n`
      ).join('\n');
      fs.writeFileSync(EXTERNAL_LINKS_LOG, `Links Converted to External URLs (${externalLinks.length} total)\n${"=".repeat(80)}\n\n${logContent}`, "utf8");
    } else {
      fs.writeFileSync(EXTERNAL_LINKS_LOG, `Links Converted to External URLs (0 total)\n${"=".repeat(80)}\n\n`, "utf8");
    }
    
    // Write replaced links log (matching original format)
    if (replacedLinks.length > 0) {
      const sortedLinks = replacedLinks.sort((a, b) => {
        const fileCompare = a.file.localeCompare(b.file);
        return fileCompare !== 0 ? fileCompare : a.original.localeCompare(b.original);
      });
      const logContent = sortedLinks.map(({ file, original, new: newUrl }) => 
        `File: ${file}\n  Original: ${original}\n  New: ${newUrl}\n`
      ).join('\n');
      fs.writeFileSync(LINKS_REPLACED_LOG, `Links Replaced (${replacedLinks.length} total)\n${"=".repeat(80)}\n\n${logContent}`, "utf8");
    } else {
      fs.writeFileSync(LINKS_REPLACED_LOG, `Links Replaced (0 total)\n${"=".repeat(80)}\n\n`, "utf8");
    }
  } catch (err) {
    // Silently fail - don't break the build
  }
});

module.exports = remarkLinkRewriter;

