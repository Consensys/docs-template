// plugins/remark-link-rewriter.js
/**
 * Remark plugin to rewrite links based on YAML configuration
 * Uses manual tree traversal to avoid ES module compatibility issues
 * Supports generalized network patterns and logging
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Track initialized log files and entry counts
const logFileInitialized = new Set();
const logFileCounts = new Map();

// Cache of ported files (loaded once per process)
let portedFilesCache = null;

/**
 * Load ported files list from log file created by port-content.js
 * Returns Set of file paths (relative to docs/, without .md/.mdx extension)
 * Reloads the cache if the file exists but cache is empty (allows for late file creation)
 */
function loadPortedFiles() {
  const logPath = path.join(process.cwd(), "_maintainers", "logs", "ported-files.log");
  
  // If cache exists and file exists, return cached result
  if (portedFilesCache !== null && fs.existsSync(logPath)) {
    return portedFilesCache;
  }
  
  // If cache exists but file doesn't exist, return empty cache
  if (portedFilesCache !== null && !fs.existsSync(logPath)) {
    return portedFilesCache;
  }
  
  // Initialize cache
  portedFilesCache = new Set();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:loadPortedFiles',message:'Loading ported files',data:{logPath,fileExists:fs.existsSync(logPath)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion agent log
  
  if (!fs.existsSync(logPath)) {
    // Log file doesn't exist - this is okay if porting hasn't run yet
    // Return empty set so plugin doesn't process any files
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:loadPortedFiles',message:'Log file does not exist',data:{logPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion agent log
    return portedFilesCache;
  }
  
  try {
    const content = fs.readFileSync(logPath, "utf8");
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    lines.forEach(line => portedFilesCache.add(line));
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:loadPortedFiles',message:'Loaded ported files',data:{fileCount:portedFilesCache.size,logPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion agent log
  } catch (err) {
    console.warn(`[remark-link-rewriter] Failed to load ported-files.log: ${err.message}`);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:loadPortedFiles',message:'Error loading log file',data:{error:err.message,logPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion agent log
  }
  
  return portedFilesCache;
}

// Initialize log file with header (datetime, count will be updated at end)
function initLogFile(logFile, itemType) {
  if (logFileInitialized.has(logFile)) {
    return; // Already initialized
  }
  
  try {
    const logsDir = path.join(process.cwd(), "_maintainers", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, logFile);
    const timestamp = new Date().toISOString();
    const header = `=== ${itemType} Log ===\nDate: ${timestamp}\nTotal ${itemType}: 0\n\n`;
    fs.writeFileSync(logPath, header, "utf8");
    logFileInitialized.add(logFile);
    logFileCounts.set(logFile, 0);
  } catch (err) {
    console.warn(`[remark-link-rewriter] Failed to initialize log: ${err.message}`);
  }
}

// Write log entry in simple format: file, original, replacement
// Uses append-only approach to avoid file locking issues during parallel processing
function logToFile(logFile, file, original, replacement) {
  try {
    const logsDir = path.join(process.cwd(), "_maintainers", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logPath = path.join(logsDir, logFile);
    
    // Initialize log file on first write if not already initialized
    if (!logFileInitialized.has(logFile)) {
      const timestamp = new Date().toISOString();
      const itemType = logFile.replace('.log', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const header = `=== ${itemType} Log ===\nDate: ${timestamp}\nTotal ${itemType}: 0\n\n`;
      fs.writeFileSync(logPath, header, "utf8");
      logFileInitialized.add(logFile);
      logFileCounts.set(logFile, 0);
    }
    
    // Append entry (simple append, no header update during processing)
    const entry = `For file: ${file}\nOriginal: ${original}\nReplacement: ${replacement}\n\n`;
    fs.appendFileSync(logPath, entry, "utf8");
    
    // Increment count (header will be updated at end of build if needed)
    const currentCount = (logFileCounts.get(logFile) || 0) + 1;
    logFileCounts.set(logFile, currentCount);
  } catch (err) {
    console.warn(`[remark-link-rewriter] Failed to write log: ${err.message}`);
  }
}

// Update log file header with final count by counting actual entries
function updateLogFileCount(logFile, itemType) {
  try {
    const logsDir = path.join(process.cwd(), "_maintainers", "logs");
    const logPath = path.join(logsDir, logFile);
    
    if (!fs.existsSync(logPath)) {
      return; // Log file doesn't exist yet
    }
    
    // Count actual "For file:" entries in the file
    const content = fs.readFileSync(logPath, "utf8");
    const entryCount = (content.match(/^For file:/gm) || []).length;
    
    // Extract timestamp from existing header
    const timestampMatch = content.match(/Date: (.+)/);
    const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
    
    // Rebuild header with correct count
    const header = `=== ${itemType} Log ===\nDate: ${timestamp}\nTotal ${itemType}: ${entryCount}\n\n`;
    
    // Replace header (first 3 lines + blank line) with updated count
    const lines = content.split('\n');
    const body = lines.slice(4).join('\n'); // Skip header (3 lines + blank line)
    const updatedContent = header + body;
    
    fs.writeFileSync(logPath, updatedContent, "utf8");
  } catch (err) {
    console.warn(`[remark-link-rewriter] Failed to update log count: ${err.message}`);
  }
}

// Legacy log function for error logs (kept for compatibility)
function logToFileLegacy(logFile, message) {
  try {
    const logsDir = path.join(process.cwd(), "_maintainers", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, logFile);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8");
  } catch (err) {
    console.warn(`[remark-link-rewriter] Failed to write log: ${err.message}`);
  }
}

/**
 * Check if a file exists relative to a base directory or as an absolute path
 * Used to validate link targets after rewriting
 */
function fileExists(linkPath, baseFilePath) {
  // Skip external URLs - consider them valid (they don't need to exist locally)
  if (/^(https?|mailto):/.test(linkPath)) {
    return true;
  }
  
  // Skip anchor links - consider them valid (they reference sections within the same file)
  // Handle both #anchor and /#anchor formats
  if (linkPath.startsWith('#') || linkPath.startsWith('/#')) {
    return true;
  }
  
  // Strip anchor/hash from path (e.g., "file.md#anchor" -> "file.md")
  const pathWithoutAnchor = linkPath.split('#')[0];
  const projectRoot = process.cwd();
  const docsDir = path.join(projectRoot, "docs");
  let pathToCheck = pathWithoutAnchor;
  
  // Handle absolute paths starting with / (web paths)
  if (pathWithoutAnchor.startsWith('/')) {
    // Convert absolute web path to filesystem path relative to docs
    pathToCheck = pathWithoutAnchor.replace(/^\//, '');
    // Remove trailing slash if present (common in web paths)
    if (pathToCheck.endsWith('/')) {
      pathToCheck = pathToCheck.slice(0, -1);
    }
    const resolvedPath = path.resolve(docsDir, pathToCheck);
    
    // If path exists and is a directory, check for index.md or index.mdx inside
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      return fs.existsSync(path.join(resolvedPath, 'index.md')) || 
             fs.existsSync(path.join(resolvedPath, 'index.mdx'));
    }
    
    // Check with .md and .mdx extensions if no extension provided
    if (!path.extname(resolvedPath)) {
      return fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx');
    }
    return fs.existsSync(resolvedPath);
  }
  
  // Resolve relative path from base file's directory
  const baseDir = path.dirname(baseFilePath);
  let resolvedPath;
  try {
    resolvedPath = path.resolve(baseDir, pathToCheck);
  } catch (e) {
    return false;
  }
  
  // Check if file exists
  if (fs.existsSync(resolvedPath)) {
    // If it's a directory, check for index.md or index.mdx inside
    if (fs.statSync(resolvedPath).isDirectory()) {
      return fs.existsSync(path.join(resolvedPath, 'index.md')) || 
             fs.existsSync(path.join(resolvedPath, 'index.mdx'));
    }
    return true;
  }
  
  // Also check with .md and .mdx extensions if no extension provided
  if (!path.extname(resolvedPath)) {
    return fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx');
  }
  
  return false;
}

function loadLinkReplacements() {
  const configPath = path.join(process.cwd(), "_maintainers", "link-replacements.yaml"); // Load YAML config from _maintainers directory

  if (!fs.existsSync(configPath)) {
    console.warn(`[remark-link-rewriter] No link-replacements.yaml found at ${configPath}`);
    logToFileLegacy("build-errors.log", `WARNING: No link-replacements.yaml found at ${configPath}`);
    return { replacements: new Map(), patterns: [] }; // Return empty config if file doesn't exist
  }

  try {
    const content = fs.readFileSync(configPath, "utf8");
    const config = yaml.load(content) || {}; // Parse YAML config file

    // Source base path: used to convert relative paths to absolute paths for pattern matching
    const sourceBasePath = config.sourceBasePath || '/services';
    
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
        // This allows matching multiple networks in patterns
        if (regexPattern.includes("{network}")) {
          // Replace {network} with a capture group that matches common network names (lowercase, numbers, hyphens)
          // This is a fallback - ideally patterns should use explicit network lists
          regexPattern = regexPattern.replace(/\{network\}/g, "([a-z0-9-]+)");
        }

        // If pattern contains regex features (negative lookaheads, capture groups with character classes),
        // treat it as a full regex pattern and don't escape it
        const hasRegexFeatures = regexPattern.includes('(?!') || regexPattern.includes('(?=') || 
                                 regexPattern.includes('(?<=') || regexPattern.includes('(?<!') ||
                                 (regexPattern.includes('[') && regexPattern.includes(']') && regexPattern.includes('('));
        
        if (hasRegexFeatures) {
          // Pattern is already a valid regex - just anchor it and handle wildcards
          regexPattern = regexPattern
            .replace(/\*/g, ".*") // Convert * to .*
            .replace(/\.\+/g, ".+"); // Ensure .+ remains .+
        } else if (!regexPattern.includes("*") && !/[?^${}()|[\]\\]/.test(regexPattern) && !regexPattern.endsWith('.+') && !regexPattern.includes('(')) {
          // Simple pattern - escape and add wildcard
          regexPattern =
            regexPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + ".*";
        } else {
          // Escape regex chars except '*', '.+', and capture groups
          // Preserve negative lookaheads like (?!...)
          regexPattern = regexPattern
            .replace(/\(\?!/g, "___NEGATIVE_LOOKAHEAD_START___") // Mark negative lookaheads
            .replace(/\(([^?])/g, "___CAPTURE_START___$1") // Mark capture groups (but not lookaheads)
            .replace(/[?^${}[\]\\]/g, "\\$&") // Escape special chars
            .replace(/___NEGATIVE_LOOKAHEAD_START___/g, "(?!") // Restore negative lookaheads
            .replace(/___CAPTURE_START___/g, "(") // Restore capture groups
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
          logToFileLegacy("build-errors.log", `ERROR: Invalid regex pattern "${regexPattern}": ${err.message}`);
          console.warn(`[remark-link-rewriter] Invalid regex pattern: ${regexPattern}`, err);
        }
      }
    }

    return { replacements, patterns, sourceBasePath };
  } catch (err) {
      logToFileLegacy("build-errors.log", `ERROR: Failed to load link-replacements.yaml: ${err.message}\n${err.stack}`);
    console.error(`[remark-link-rewriter] Failed to load config:`, err);
    return { replacements: new Map(), patterns: [], sourceBasePath: '/services' };
  }
}

function remarkLinkRewriter() {
  let config;
  try {
    config = loadLinkReplacements();
  } catch (err) {
    logToFileLegacy("build-errors.log", `ERROR: Failed to initialize remark-link-rewriter: ${err.message}\n${err.stack}`);
    console.error(`[remark-link-rewriter] Initialization error:`, err);
    // Return no-op plugin on error (must match signature: tree, file)
    return (tree, file) => {
      // No-op: don't modify tree at all
    };
  }

  const { replacements, patterns, sourceBasePath } = config;
  const linksReplaced = [];
  const linksDropped = [];

  // Early return if no replacements configured
  if (replacements.size === 0 && patterns.length === 0) {
    return (tree, file) => {
      // No-op: don't modify tree at all
    };
  }

  return (tree, file) => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:plugin-entry',message:'Plugin invoked',data:{filePath:file?.path,fileHistory:file?.history?.[0],hasTree:!!tree,hasFile:!!file},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion agent log
      
      // Get file path from vfile if available (Docusaurus passes this)
      const filePath = file?.path || file?.history?.[0] || 'unknown';
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:plugin',message:'File path extracted',data:{filePath,processCwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion agent log
      
      // Convert to relative path from docs/ directory (without extension)
      const docsRoot = path.join(process.cwd(), "docs");
      let relativeFilePath = 'unknown';
      try {
        const relativePath = path.relative(docsRoot, filePath);
        if (relativePath && !relativePath.startsWith('..')) {
          relativeFilePath = relativePath.replace(/\.(md|mdx)$/, '');
        }
      } catch (e) {
        // If path resolution fails, try fallback method
        relativeFilePath = filePath.replace(/^.*\/docs\//, '').replace(/\.mdx?$/, '') || 'unknown';
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:plugin',message:'Relative path calculated',data:{relativeFilePath,filePath,docsRoot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion agent log
      
      // Only process files that are in the ported files log
      // This ensures we only process files that were actually ported, not all docs
      const portedFiles = loadPortedFiles();
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:plugin',message:'Checking if file is ported',data:{relativeFilePath,isPorted:portedFiles.has(relativeFilePath),portedFilesCount:portedFiles.size,filePath,firstFewPortedFiles:Array.from(portedFiles).slice(0,3),isMetamaskServicesIndex:relativeFilePath.includes('metamask_services_index')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion agent log
      if (!portedFiles.has(relativeFilePath)) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:plugin',message:'File not in ported files, skipping',data:{relativeFilePath,filePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion agent log
        return; // Skip files that weren't ported
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:plugin',message:'File is ported, starting traversal',data:{relativeFilePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion agent log
      
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
          
          // Match import statements with source base paths (configured in YAML via sourceBasePath)
          const sourceBasePathEscaped = sourceBasePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const importRegex = new RegExp(`import\\s+(\\w+)\\s+from\\s+["'](${sourceBasePathEscaped}[^"']+)["']`, 'g');
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
                    // Extract path after pattern match
                    let patternBase = pattern.originalPattern.replace(/\.\+$/, '');
                    if (patternBase.includes('(') && pathMatch[1]) {
                      patternBase = patternBase.replace(/\([^)]+\)/, pathMatch[1]);
                    }
                    patternBase = patternBase.replace(/\{network\}/g, pathMatch[1] || '');
                    const extractedPath = importPath.substring(patternBase.length);
                    newPath = `${newPath}${extractedPath}`;
                  }
                  
                  // Convert absolute paths to relative paths based on file location
                  // Calculate relative path from current file to target
                  if (newPath.startsWith('/') && !newPath.startsWith('http')) {
                    const currentParts = relativeFilePath.split('/');
                    const targetParts = newPath.replace(/^\//, '').split('/');
                    
                    // Find common ancestor directory
                    let commonDepth = 0;
                    while (commonDepth < currentParts.length - 1 && 
                           commonDepth < targetParts.length &&
                           currentParts[commonDepth] === targetParts[commonDepth]) {
                      commonDepth++;
                    }
                    
                    // Calculate relative path
                    const upLevels = currentParts.length - 1 - commonDepth;
                    const downPath = targetParts.slice(commonDepth).join('/');
                    newPath = '../'.repeat(upLevels) + (downPath || '');
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
                logToFileLegacy("build-errors.log", `ERROR: Import path pattern matching failed: ${err.message}`);
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
            // Don't log here - collect and log at end with proper format
          }
          
          return; // Don't traverse children of mdxjsEsm
        }
        
        // Handle link nodes - only modify the URL property, nothing else
        // Be very defensive: only process if it's actually a link node with a string URL
        if (node.type === 'link' && node.url && typeof node.url === 'string') {
          const originalUrl = String(node.url); // Ensure it's a string
          
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:link-found',message:'Link node found',data:{originalUrl,relativeFilePath,isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion agent log
          // Capture original link text for logging (the [text] part of [text](url))
          // Link nodes have children array with text nodes - extract all text content
          let originalLinkText = '';
          if (node.children && Array.isArray(node.children)) {
            originalLinkText = node.children
              .map(child => {
                if (child.type === 'text' && child.value) {
                  return child.value;
                }
                // Handle nested structures (e.g., emphasis, strong)
                if (child.children && Array.isArray(child.children)) {
                  return child.children
                    .map(grandchild => grandchild.value || '')
                    .join('');
                }
                return '';
              })
              .join('');
          }
          // Fallback to URL if no text found
          if (!originalLinkText) {
            originalLinkText = originalUrl;
          }

          // Skip absolute URLs and anchors (handle both #anchor and /#anchor formats)
          // Extract anchor from original URL for later restoration (do this before any processing)
          const anchorMatch = originalUrl.match(/#.*$/);
          const anchor = anchorMatch ? anchorMatch[0] : '';
          const urlWithoutAnchor = originalUrl.replace(/#.*$/, '');
          
          if (!(/^(https?|mailto):/.test(originalUrl) || originalUrl.startsWith("#") || originalUrl.startsWith("/#"))) {
            // Convert relative paths to absolute paths for pattern matching
            // Uses sourceBasePath from YAML config to determine the base path
            let urlToMatch = urlWithoutAnchor;
            if (originalUrl.startsWith('../') || originalUrl.startsWith('./') || (!originalUrl.startsWith('/') && !originalUrl.startsWith('http'))) {
              // Resolve relative path to absolute path based on file location
              // Count how many ../ in the relative URL (without anchor)
              const upLevels = (urlWithoutAnchor.match(/\.\.\//g) || []).length;
              // Extract the target path after ../../
              const targetPath = urlWithoutAnchor.replace(/^(\.\.\/)+/, '');
              
              // Calculate depth from docs root to current file
              const pathParts = relativeFilePath.split('/');
              
              // Find common ported data directory markers to determine where ported content structure starts
              // Look for directories that typically contain ported content (e.g., "Plugins", directories with "ported" in name)
              // Also check for "reference" subdirectory as a marker
              let referenceIndex = pathParts.indexOf('reference');
              let pluginsIndex = pathParts.findIndex(part => part.toLowerCase().includes('plugin'));
              let portedIndex = pathParts.findIndex(part => part.toLowerCase().includes('ported'));
              
              // Determine the depth from which to calculate if a relative path escapes the ported structure
              // Priority: reference/ subdirectory > Plugins directory > ported directory > docs root
              let baseDepth = pathParts.length - 1; // Default: depth from docs root
              
              if (referenceIndex >= 0) {
                // File is in a reference/ subdirectory - calculate depth from reference/ to current file
                // Example: reference/_partials/file.mdx -> depth = 2 (1 for _partials, 1 for file)
                baseDepth = pathParts.length - referenceIndex - 1;
              } else if (pluginsIndex >= 0) {
                // File is in a Plugins directory - calculate depth from Plugins/ to current file
                baseDepth = pathParts.length - pluginsIndex - 1;
              } else if (portedIndex >= 0) {
                // File is in a ported directory - calculate depth from there
                baseDepth = pathParts.length - portedIndex - 1;
              }
              
              // If relative path goes up enough levels to escape the ported structure,
              // or if it's a root-relative path (no ../), convert to sourceBasePath
              // This assumes relative paths in ported content that escape the structure point to upstream source paths
              if (upLevels >= baseDepth || upLevels === 0) {
                urlToMatch = `${sourceBasePath}/${targetPath || urlWithoutAnchor}`.replace(/\/+/g, '/');
              }
            }
            
            let newUrl = originalUrl;
            let matched = false;
            
            // Anchor was already extracted above, use it here
            // 1. Pattern-based replacements (applied first as per YAML comment)
            // Match against the converted absolute path if we converted it (without anchor)
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:pattern-matching',message:'Starting pattern matching',data:{originalUrl,urlToMatch,anchor,patternCount:patterns.length,isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion agent log
            for (const pattern of patterns) {
              try {
                const match = urlToMatch.match(pattern.regex);
                // #region agent log
                if (match) {
                  fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:pattern-matching',message:'Pattern matched',data:{originalUrl,urlToMatch,pattern:pattern.originalPattern,replacement:pattern.replacement,match:match[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                }
                // #endregion agent log
                if (match) {
                  // #region agent log
                  fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:pattern-matched',message:'Pattern matched',data:{originalUrl,urlToMatch,pattern:pattern.originalPattern,replacement:pattern.replacement,match:match[0],isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                  // #endregion agent log
                  matched = true;
                  let candidateUrl = pattern.replacement;
                  
                  // Handle {network} placeholder in replacement
                  // match[1] is the first capture group (network name)
                  if (candidateUrl.includes("{network}") && match[1]) {
                    candidateUrl = candidateUrl.replace(/\{network\}/g, match[1]);
                  }
                  
                  // Handle {path} placeholder in replacement
                  // match[1] is the first capture group (extracted path segment)
                  if (candidateUrl.includes("{path}") && match[1]) {
                    candidateUrl = candidateUrl.replace(/\{path\}/g, match[1]);
                  }
                  
                  if (pattern.extractPath) {
                    // Extract the part of the URL after the pattern base
                    // For pattern like '/services/reference/sei/.+' matching '/services/reference/sei/some-page',
                    // we need to extract 'some-page' (the part after '/services/reference/sei/')
                    let patternBase = pattern.originalPattern.replace(/\.\+$/, '').replace(/\*$/, '');
                    // Replace capture groups with actual values from match
                    if (patternBase.includes('(') && match[1]) {
                      patternBase = patternBase.replace(/\([^)]+\)/, match[1]);
                    }
                    patternBase = patternBase.replace(/\{network\}/g, match[1] || '');
                    
                    // Find where patternBase ends in the matched URL
                    const patternBaseIndex = urlToMatch.indexOf(patternBase);
                    if (patternBaseIndex >= 0) {
                      const extractedPath = urlToMatch.substring(patternBaseIndex + patternBase.length);
                      // Add / separator if needed
                      if (extractedPath && !extractedPath.startsWith('/') && !candidateUrl.endsWith('/')) {
                        candidateUrl = `${candidateUrl}/${extractedPath}`;
                      } else {
                        candidateUrl = `${candidateUrl}${extractedPath}`;
                      }
                    }
                  }
                  
                  // For external URLs (https://...), use directly without validation
                  // For local paths, convert to relative and validate
                  let finalUrl = candidateUrl;
                  
                  // Anchor was already extracted above, use it here
                  if (candidateUrl.startsWith('http')) {
                    // External URL - use directly (no validation needed)
                    // Append anchor if present
                    finalUrl = candidateUrl + anchor;
                  } else if (candidateUrl.startsWith('/') && !candidateUrl.startsWith('http')) {
                    // Convert absolute local path to relative path based on file location
                    const targetParts = candidateUrl.replace(/^\//, '').split('/');
                    const currentParts = relativeFilePath.split('/');
                    
                    // Find common ancestor directory
                    let commonDepth = 0;
                    while (commonDepth < currentParts.length - 1 && 
                           commonDepth < targetParts.length &&
                           currentParts[commonDepth] === targetParts[commonDepth]) {
                      commonDepth++;
                    }
                    
                    // Calculate relative path
                    const upLevels = currentParts.length - 1 - commonDepth;
                    const downPath = targetParts.slice(commonDepth).join('/');
                    finalUrl = '../'.repeat(upLevels) + (downPath || '') + anchor;
                  }
                  
                  // For external URLs, check if original exists locally first
                  // If original doesn't exist locally, convert to external URL (as defined in YAML)
                  // If original exists locally, keep it as local link (don't convert to external)
                  if (finalUrl.startsWith('http')) {
                    // Pattern would convert to external URL (as defined in YAML)
                    // Check if original file exists locally
                    const originalExists = fileExists(originalUrl, filePath);
                    // #region agent log
                    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:external-url-check',message:'Checking if original exists locally',data:{originalUrl,finalUrl,originalExists,filePath,isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                    // #endregion agent log
                    if (!originalExists) {
                      // Original doesn't exist locally - convert to external URL (as defined in YAML pattern)
                      newUrl = finalUrl;
                      linksReplaced.push({
                        original: originalUrl,
                        new: newUrl,
                        pattern: pattern.description || pattern.originalPattern,
                      });
                      // #region agent log
                      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:pattern-matching',message:'Link replaced successfully',data:{originalUrl,newUrl,pattern:pattern.originalPattern,anchor,isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                      // #endregion agent log
                      break;
                    } else {
                      // Original exists locally - keep it as local link, don't convert to external
                      // Reset matched flag so it stays as original local link
                      // #region agent log
                      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:external-url-check',message:'Original exists locally, keeping as local link',data:{originalUrl,finalUrl,originalExists,isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                      // #endregion agent log
                      matched = false;
                      continue;
                    }
                  } else if (fileExists(finalUrl, filePath)) {
                    // Local path and target exists - apply rewrite
                    newUrl = finalUrl;
                    linksReplaced.push({
                      original: originalUrl,
                      new: newUrl,
                      pattern: pattern.description || pattern.originalPattern,
                    });
                    // #region agent log
                    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:pattern-matching',message:'Link replaced successfully',data:{originalUrl,newUrl,pattern:pattern.originalPattern,anchor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion agent log
                    break; // Stop checking patterns once one matches and validates
                  } else {
                    // Pattern matched but target doesn't exist (for local paths)
                    // Don't rewrite - will be dropped below
                    // #region agent log
                    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:pattern-matching',message:'Link replacement failed validation',data:{originalUrl,urlToMatch,candidateUrl,finalUrl,fileExists:fileExists(finalUrl, filePath)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion agent log
                    // Reset matched flag so the link can be dropped if it doesn't exist
                    matched = false;
                    continue;
                  }
                }
              } catch (err) {
                logToFileLegacy("build-errors.log", `ERROR: Pattern matching failed for "${pattern.originalPattern}": ${err.message}`);
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
                // For exact replacements, validate target exists if it's a local path
                // External URLs (https://) are always valid
                if (exact.startsWith('http') || fileExists(exact, filePath)) {
                  newUrl = exact;
                  linksReplaced.push({
                    original: originalUrl,
                    new: newUrl,
                    pattern: "exact match",
                  });
                }
                // If exact replacement doesn't exist, don't apply it - will be dropped below
              }
            }
            
            // Only modify if URL actually changed and target exists
            if (newUrl !== originalUrl) {
              // At this point, newUrl has been validated to exist (for local paths)
              // or is an external URL (always valid)
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:link-updated',message:'Link URL updated',data:{originalUrl,newUrl,isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
              // #endregion agent log
              node.url = newUrl;
            } else if (!matched) {
              // Link didn't match any pattern and wasn't replaced
              // Check if the original link points to a file that exists
              // If not, remove the link (keep text) and log as dropped
              const originalExists = fileExists(originalUrl, filePath);
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remark-link-rewriter.js:link-not-matched',message:'Link did not match any pattern',data:{originalUrl,matched,originalExists,isTargetLink:originalUrl.includes('concepts/archive-data')||originalUrl.includes('concepts/transaction-types')||originalUrl.includes('concepts/websockets')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion agent log
              if (!originalExists) {
                // Link doesn't exist - remove it but keep the text
                // Convert link node to text node by removing the url
                const droppedText = originalLinkText || originalUrl;
                node.type = 'text';
                node.value = droppedText;
                node.children = undefined;
                node.url = undefined;
                
                linksDropped.push({
                  originalMarkdown: `[${originalLinkText}](${originalUrl})`,
                  originalUrl: originalUrl,
                  originalText: originalLinkText,
                  droppedText: droppedText,
                  reason: "No matching pattern or exact replacement, and file does not exist",
                });
              } else {
                // Link exists but didn't match pattern - leave as-is (might be a valid relative link)
                // Don't log as dropped since it's a valid link
              }
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
      
      // Log results after processing with proper format
      if (linksReplaced.length > 0) {
        linksReplaced.forEach(link => {
          logToFile("links-replaced.log", relativeFilePath, link.original, link.new);
        });
      }
      
      if (linksDropped.length > 0) {
        linksDropped.forEach(link => {
          // Log in format: Original: [text](url), Replacement: text (after link dropped)
          logToFile("links-dropped.log", relativeFilePath, link.originalMarkdown || `[${link.originalText}](${link.originalUrl})`, link.droppedText || link.originalText);
        });
      }
      
      // Update header counts for log files that were written to
      if (linksReplaced.length > 0) {
        updateLogFileCount("links-replaced.log", "Link Replacements");
      }
      if (linksDropped.length > 0) {
        updateLogFileCount("links-dropped.log", "Links Dropped");
      }
    } catch (err) {
      logToFileLegacy("build-errors.log", `ERROR: remark-link-rewriter traversal failed: ${err.message}\n${err.stack}`);
      console.error(`[remark-link-rewriter] Traversal error:`, err);
      // Don't throw - allow build to continue
    }
  };
}

module.exports = remarkLinkRewriter;

