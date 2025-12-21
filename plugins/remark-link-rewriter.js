// plugins/remark-link-rewriter.js
/**
 * Remark plugin to rewrite links based on YAML configuration
 * Uses manual tree traversal to avoid ES module compatibility issues
 * Supports generalized network patterns and logging
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Logging utility - writes transformation logs to _maintainers/logs/ directory
function logToFile(logFile, message) {
  try {
    const logsDir = path.join(process.cwd(), "_maintainers", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true }); // Create logs directory if it doesn't exist
    }
    const logPath = path.join(logsDir, logFile);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8"); // Append timestamped log entry
  } catch (err) {
    // Silently fail logging to avoid breaking builds
    console.warn(`[remark-link-rewriter] Failed to write log: ${err.message}`);
  }
}

function loadLinkReplacements() {
  const configPath = path.join(process.cwd(), "_maintainers", "link-replacements.yaml"); // Load YAML config from _maintainers directory

  if (!fs.existsSync(configPath)) {
    console.warn(`[remark-link-rewriter] No link-replacements.yaml found at ${configPath}`);
    logToFile("build-errors.log", `WARNING: No link-replacements.yaml found at ${configPath}`);
    return { replacements: new Map(), patterns: [] }; // Return empty config if file doesn't exist
  }

  try {
    const content = fs.readFileSync(configPath, "utf8");
    const config = yaml.load(content) || {}; // Parse YAML config file

    // Exact replacements: { "/old/path": "https://new/url" } - simple key-value mappings
    const replacements = new Map();
    if (config.replacements && typeof config.replacements === "object") {
      for (const [from, to] of Object.entries(config.replacements)) {
        replacements.set(from, to); // Store exact path replacements in Map for fast lookup
      }
    }

    // Pattern-based replacements: [{ pattern, replacement, description, extractPath }]
    const patterns = [];
    if (Array.isArray(config.patterns)) {
      for (const p of config.patterns) {
        if (!p.pattern || !p.replacement) continue;

        let regexPattern = p.pattern;
        let originalPattern = p.pattern; // Store original pattern for path extraction

        // Support {network} placeholder - replace with regex group to match network names dynamically
        // Example: '/services/reference/(base|ethereum)/' -> '/services/reference/(base|ethereum)/'
        // This allows matching multiple networks
        if (regexPattern.includes("{network}")) {
          // Replace {network} with a capture group that matches common network names (lowercase, numbers, hyphens)
          // This is a fallback - ideally patterns should use explicit network lists
          regexPattern = regexPattern.replace(/\{network\}/g, "([a-z0-9-]+)");
        }

        // If pattern has no '*' and no regex chars (except .+ and capture groups) → treat as prefix
        // Special handling for '.+' to not escape it
        if (!regexPattern.includes("*") && !/[?^${}()|[\]\\]/.test(regexPattern) && !regexPattern.endsWith('.+') && !regexPattern.includes('(')) {
          regexPattern =
            regexPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + ".*";
        } else {
          // Escape regex chars except '*', '.+', and capture groups
          regexPattern = regexPattern
            .replace(/(?<!\()(?!\()/g, "") // Don't escape inside capture groups
            .replace(/[?^${}[\]\\]/g, "\\$&") // Escape special chars
            .replace(/\*/g, ".*") // Convert * to .*
            .replace(/\.\+/g, ".+"); // Ensure .+ remains .+
        }

        regexPattern = "^" + regexPattern; // anchor at start

        try {
          patterns.push({
            originalPattern: originalPattern,
            regex: new RegExp(regexPattern),
            replacement: p.replacement,
            extractPath: p.extractPath === true,
            description: p.description || "",
          });
        } catch (err) {
          logToFile("build-errors.log", `ERROR: Invalid regex pattern "${regexPattern}": ${err.message}`);
          console.warn(`[remark-link-rewriter] Invalid regex pattern: ${regexPattern}`, err);
        }
      }
    }

    return { replacements, patterns };
  } catch (err) {
    logToFile("build-errors.log", `ERROR: Failed to load link-replacements.yaml: ${err.message}\n${err.stack}`);
    console.error(`[remark-link-rewriter] Failed to load config:`, err);
    return { replacements: new Map(), patterns: [] };
  }
}

function remarkLinkRewriter() {
  let config;
  try {
    config = loadLinkReplacements();
  } catch (err) {
    logToFile("build-errors.log", `ERROR: Failed to initialize remark-link-rewriter: ${err.message}\n${err.stack}`);
    console.error(`[remark-link-rewriter] Initialization error:`, err);
    // Return no-op plugin on error
    return (tree) => {};
  }

  const { replacements, patterns } = config;
  const linksReplaced = [];
  const linksDropped = [];

  // Early return if no replacements configured
  if (replacements.size === 0 && patterns.length === 0) {
    return (tree) => {
      // No-op: don't modify tree at all
    };
  }

  return (tree) => {
    try {
      function traverse(node) {
        if (!node || typeof node !== 'object' || !node.type) return;
        
        // Skip code blocks and inline code - they contain literal code/content
        // Also skip HTML nodes to avoid corrupting JSX/HTML structures
        if (
          node.type === 'code' || 
          node.type === 'inlineCode' ||
          node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement' ||
          node.type === 'mdxjsExpression' ||
          node.type === 'html'
        ) {
          return;
        }
        
        // Handle MDX import statements (mdxjsEsm) - rewrite import paths
        if (node.type === 'mdxjsEsm' && node.value) {
          const originalValue = node.value;
          let newValue = originalValue;
          let modified = false;
          
          // Match import statements with /services/ paths
          // Example: import Description from "/services/reference/_partials/_web3_clientversion-description.mdx"
          const importRegex = /import\s+(\w+)\s+from\s+["'](\/services\/[^"']+)["']/g;
          let match;
          
          while ((match = importRegex.exec(originalValue)) !== null) {
            const importPath = match[2];
            let newPath = importPath;
            let pathMatched = false;
            
            // Apply pattern-based replacements
            for (const pattern of patterns) {
              try {
                const pathMatch = importPath.match(pattern.regex);
                if (pathMatch) {
                  pathMatched = true;
                  newPath = pattern.replacement;
                  
                  // Handle {network} placeholder
                  if (newPath.includes("{network}") && pathMatch[1]) {
                    newPath = newPath.replace(/\{network\}/g, pathMatch[1]);
                  }
                  
                  if (pattern.extractPath) {
                    let patternBase = pattern.originalPattern.replace(/\.\+$/, '');
                    if (patternBase.includes('(') && pathMatch[1]) {
                      patternBase = patternBase.replace(/\([^)]+\)/, pathMatch[1]);
                    }
                    patternBase = patternBase.replace(/\{network\}/g, pathMatch[1] || '');
                    const extractedPath = importPath.substring(patternBase.length);
                    newPath = `${newPath}${extractedPath}`;
                  }
                  
                  // Convert to relative path from the file location
                  // /services/reference/_partials/... -> ../../_partials/... (from json-rpc-methods folder)
                  // Files are in: docs/single-source/between-repos/Plugins/MetaMask-ported-data/reference/base/json-rpc-methods/
                  // Partials are in: docs/single-source/between-repos/Plugins/MetaMask-ported-data/reference/_partials/
                  // So from json-rpc-methods, we need: ../../_partials/
                  if (newPath.startsWith('/reference/_partials/')) {
                    // Extract the partial filename
                    const partialFile = newPath.replace('/reference/_partials/', '');
                    newPath = `../../_partials/${partialFile}`;
                  } else if (newPath.startsWith('/reference/')) {
                    // For other reference paths, use relative path
                    const relativePath = newPath.replace('/reference/', '');
                    newPath = `../../${relativePath}`;
                  }
                  
                  linksReplaced.push({
                    original: importPath,
                    new: newPath,
                    pattern: pattern.description || pattern.originalPattern,
                    type: 'import',
                  });
                  break;
                }
              } catch (err) {
                logToFile("build-errors.log", `ERROR: Import path pattern matching failed: ${err.message}`);
              }
            }
            
            // If no pattern matched, try exact replacements
            if (!pathMatched && replacements.has(importPath)) {
              newPath = replacements.get(importPath);
              linksReplaced.push({
                original: importPath,
                new: newPath,
                type: 'import',
              });
            }
            
            if (newPath !== importPath) {
              // Replace in the import statement
              newValue = newValue.replace(
                new RegExp(`(["'])${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["'])`, 'g'),
                `$1${newPath}$2`
              );
              modified = true;
            }
          }
          
          if (modified) {
            node.value = newValue;
            logToFile("links-replaced.log", `IMPORT: ${originalValue} -> ${newValue}`);
          }
          
          return; // Don't traverse children of mdxjsEsm
        }
        
        // Handle link nodes - only modify the URL property, nothing else
        // Be very defensive: only process if it's actually a link node with a string URL
        if (node.type === 'link' && node.url && typeof node.url === 'string') {
          const originalUrl = String(node.url); // Ensure it's a string

          // Skip absolute URLs and anchors
          if (!(/^(https?|mailto):/.test(originalUrl) || originalUrl.startsWith("#"))) {
            let newUrl = originalUrl;
            let matched = false;
            
            // 1. Pattern-based replacements (applied first as per YAML comment)
            for (const pattern of patterns) {
              try {
                const match = originalUrl.match(pattern.regex);
                if (match) {
                  matched = true;
                  newUrl = pattern.replacement;
                  
                  // Handle {network} placeholder in replacement
                  // match[1] is the first capture group (network name)
                  if (newUrl.includes("{network}") && match[1]) {
                    newUrl = newUrl.replace(/\{network\}/g, match[1]);
                  }
                  
                  if (pattern.extractPath) {
                    // Extract the part of the URL after the original pattern
                    // Example: url = /services/reference/base/foo/bar, originalPattern = /services/reference/(base|ethereum)/.+
                    // We need to find where the pattern ends and extract the rest
                    // Replace {network} in pattern with actual network from match
                    let patternBase = pattern.originalPattern.replace(/\.\+$/, '');
                    if (patternBase.includes('(') && match[1]) {
                      // Replace capture group with actual network name for path extraction
                      patternBase = patternBase.replace(/\([^)]+\)/, match[1]);
                    }
                    patternBase = patternBase.replace(/\{network\}/g, match[1] || '');
                    const extractedPath = originalUrl.substring(patternBase.length);
                    newUrl = `${newUrl}${extractedPath}`;
                  }
                  
                  linksReplaced.push({
                    original: originalUrl,
                    new: newUrl,
                    pattern: pattern.description || pattern.originalPattern,
                  });
                  break; // Stop checking patterns once one matches
                }
              } catch (err) {
                logToFile("build-errors.log", `ERROR: Pattern matching failed for "${pattern.originalPattern}": ${err.message}`);
              }
            }

            // 2. Exact replacements (normalized variants) - only if not already replaced by pattern
            if (!matched && newUrl === originalUrl) {
              const normalizedWithSlash = originalUrl.startsWith("/") ? originalUrl : "/" + originalUrl;
              const withoutSlash = originalUrl.replace(/^\//, "");

              const exact =
                replacements.get(originalUrl) ||
                replacements.get(normalizedWithSlash) ||
                replacements.get(withoutSlash);

              if (exact) {
                newUrl = exact;
                linksReplaced.push({
                  original: originalUrl,
                  new: newUrl,
                  pattern: "exact match",
                });
              }
            }
            
            // Only modify if URL actually changed
            if (newUrl !== originalUrl) {
              node.url = newUrl;
            } else if (!matched) {
              // Link didn't match any pattern and wasn't replaced
              // Log as potentially dropped (could be a broken link)
              linksDropped.push({
                url: originalUrl,
                reason: "No matching pattern or exact replacement",
              });
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
      
      // Log results after processing
      if (linksReplaced.length > 0) {
        linksReplaced.forEach(link => {
          logToFile("links-replaced.log", `REPLACED: "${link.original}" -> "${link.new}" (${link.pattern})`);
        });
      }
      
      if (linksDropped.length > 0) {
        linksDropped.forEach(link => {
          logToFile("links-dropped.log", `DROPPED: "${link.url}" (${link.reason})`);
        });
      }
    } catch (err) {
      logToFile("build-errors.log", `ERROR: remark-link-rewriter traversal failed: ${err.message}\n${err.stack}`);
      console.error(`[remark-link-rewriter] Traversal error:`, err);
      // Don't throw - allow build to continue
    }
  };
}

module.exports = remarkLinkRewriter;

