#!/usr/bin/env node

/**
 * Port content script - Downloads and transforms MetaMask content
 * Runs link fixes, image fixes, writes logs, then starts dev server
 * 
 * NOTE: This script must be in the project root scripts/ directory to work with npm commands
 */

const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load .env file if it exists (from project root)
try {
  const dotenv = require("dotenv");
  const envPath = path.join(__dirname, "..", ".env");
  dotenv.config({ path: envPath });
} catch (e) {
  // dotenv not installed or .env file doesn't exist - that's okay
}

const PORTED_DATA_DIR = path.join(__dirname, "..", "docs", "single-source", "between-repos", "Plugins", "MetaMask-ported-data");
const LOGS_DIR = path.join(__dirname, "..", "_maintainers", "logs");
const DEBUG_LOG_PATH = path.join(__dirname, "..", ".cursor", "debug.log");
const SERVER_ENDPOINT = "http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560";

// #region agent log
function debugLog(location, message, data = {}, hypothesisId = null) {
  try {
    const payload = {
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: process.env.RUN_ID || "run1",
      ...(hypothesisId && { hypothesisId })
    };
    // Ensure directory exists
    const debugLogDir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(debugLogDir)) {
      fs.mkdirSync(debugLogDir, { recursive: true });
    }
    // Write to debug log file (NDJSON format)
    const logLine = JSON.stringify(payload) + "\n";
    fs.appendFileSync(DEBUG_LOG_PATH, logLine, "utf8");
    // Also try HTTP endpoint if available (Node 18+)
    if (typeof fetch !== "undefined") {
      fetch(SERVER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  } catch (err) {
    // Log to console as fallback if file write fails
    console.error(`[debugLog] Failed: ${err.message}`);
  }
}
// #endregion agent log

// Logging utility - writes transformation logs to _maintainers/logs/ directory
function logToFile(logFile, message) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true }); // Create logs directory if it doesn't exist
    }
    const logPath = path.join(LOGS_DIR, logFile);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8"); // Append timestamped log entry
  } catch (err) {
    console.warn(`[port-content] Failed to write log: ${err.message}`);
  }
}

/**
 * Kill process tree (process and all children) - ensures all child processes are terminated on timeout
 */
function killProcessTree(pid, signal = "SIGTERM") {
  try {
    // On Unix, kill the process group (negative PID kills entire process group)
    process.kill(-pid, signal);
  } catch (err) {
    // If process group kill fails, try individual process
    try {
      process.kill(pid, signal); // Fallback to killing just the process
    } catch (e) {
      // Process might already be dead - ignore error
    }
  }
}

/**
 * Run command with timeout using exec with built-in timeout option
 * This is more reliable than manual timeout handling
 * Can filter output to show only relevant information
 */
function runCommandWithTimeout(command, args, options, timeoutMs = 300000, filterOutput = false) {
  // #region agent log
  debugLog("port-content.js:runCommandWithTimeout", "Command start", { command, args: args.join(" "), timeoutMs, filterOutput }, "A");
  // #endregion agent log
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const fullCommand = `${command} ${args.join(" ")}`;
    
    // Use exec with timeout option - this is built into Node.js and more reliable
    // The timeout option automatically kills the process after the specified time
    const proc = exec(fullCommand, {
      ...options,
      timeout: timeoutMs, // Built-in timeout that automatically kills the process
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    }, (error, stdout, stderr) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (error) {
        // #region agent log
        debugLog("port-content.js:runCommandWithTimeout", "Command error", { 
          command, 
          error: error.message, 
          code: error.code, 
          signal: error.signal,
          killed: error.killed,
          stderr: stderr ? stderr.substring(0, 200) : "",
          elapsed 
        }, "A");
        // #endregion agent log
        
        // Check if it was a timeout
        if (error.killed && error.signal === "SIGTERM") {
          reject(new Error(`Command timed out after ${elapsed}s: ${fullCommand}`));
        } else {
          // Check if stderr contains rate limit info and enhance error message
          const errorMsg = error.message || String(error);
          const stderrStr = (stderr || "").toLowerCase();
          const isRateLimit = stderrStr.includes("rate limit") || stderrStr.includes("403");
          
          if (isRateLimit) {
            const rateLimitError = new Error(`GitHub API rate limit exceeded. ${errorMsg}`);
            rateLimitError.originalError = error;
            rateLimitError.stderr = stderr;
            reject(rateLimitError);
          } else {
            reject(error);
          }
        }
      } else {
        // #region agent log
        debugLog("port-content.js:runCommandWithTimeout", "Command complete", { command, code: 0, elapsed }, "A");
        // #endregion agent log
        resolve();
      }
    });
    
    // #region agent log
    debugLog("port-content.js:runCommandWithTimeout", "Process started", { pid: proc.pid, command, timeoutMs }, "A");
    // #endregion agent log
    
    // Capture and filter output if requested
    // Note: exec() provides stdout/stderr as streams AND in the callback
    // We'll use streams for real-time filtering, but the callback also gets the full output
    if (filterOutput) {
      let fileCounts = [];
      let taskDoneShown = false;
      let firstFileCountShown = false;
      
      if (proc.stdout) {
        proc.stdout.on("data", (data) => {
          const text = data.toString();
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            // Collect file counts from "After filtering" message (most relevant)
            const fileCountMatch = line.match(/\[list-remote\] After filtering: (\d+) files/);
            if (fileCountMatch) {
              const count = parseInt(fileCountMatch[1], 10);
              if (!fileCounts.includes(count)) {
                fileCounts.push(count);
                // Show the first relevant file count (this is the one for the current download)
                if (!firstFileCountShown && fileCounts.length === 1) {
                  process.stdout.write(`   📄 Found ${count} file(s) to download\n`);
                  firstFileCountShown = true;
                }
              }
            }
            // Show task completion messages
            else if (line.includes("Task fetch") && line.includes("done")) {
              if (!taskDoneShown) {
                const timeMatch = line.match(/took\s+([\d.]+s)/);
                if (timeMatch) {
                  process.stdout.write(`   ✅ Task completed in ${timeMatch[1]}\n`);
                } else {
                  process.stdout.write(`   ✅ ${line.trim()}\n`);
                }
                taskDoneShown = true;
              }
            }
            // Suppress all list-remote messages (we show our own summary)
            else if (line.includes("[list-remote]")) {
              // Suppress - we show our own filtered summary
            }
            // Show other important messages (errors, warnings, etc.)
            else {
              process.stdout.write(line + '\n');
            }
          }
        });
      }
      
      if (proc.stderr) {
        proc.stderr.on("data", (data) => {
          const text = data.toString();
          // Only show stderr if it's not a list-remote info message
          if (!text.includes("[list-remote]")) {
            process.stderr.write(data);
          }
        });
      }
    } else {
      // If not filtering, pipe directly
      if (proc.stdout) {
        proc.stdout.pipe(process.stdout);
      }
      if (proc.stderr) {
        proc.stderr.pipe(process.stderr);
      }
    }
    
    // Monitor process events
    proc.on("exit", (code, signal) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      // #region agent log
      debugLog("port-content.js:runCommandWithTimeout", "Process exit", { command, code, signal, elapsed }, "A");
      // #endregion agent log
    });
    
    proc.on("error", (err) => {
      // #region agent log
      debugLog("port-content.js:runCommandWithTimeout", "Process spawn error", { command, error: err.message }, "A");
      // #endregion agent log
      // The error will also be passed to the callback, so we don't need to reject here
    });
  });
}

/**
 * Check if API_TOKEN or GITHUB_TOKEN is set and warn if not
 */
function checkGitHubToken() {
  const token = process.env.API_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("⚠️  WARNING: API_TOKEN or GITHUB_TOKEN environment variable is not set.");
    console.warn("   Unauthenticated requests are limited to 60/hour and may fail.");
    console.warn("   Set API_TOKEN in .env file for higher rate limits (5000/hour):");
    console.warn("   Create .env file with: API_TOKEN=your_token_here");
    console.warn("   Or set it in your environment: export API_TOKEN=your_token_here");
    console.warn("   Get a token at: https://github.com/settings/tokens");
    console.warn("");
  } else {
    const tokenName = process.env.API_TOKEN ? "API_TOKEN" : "GITHUB_TOKEN";
    console.log(`✅ ${tokenName} detected - using authenticated requests (5000/hour limit)\n`);
  }
}

/**
 * Extract remote content plugin configurations from docusaurus.config.js
 * Parses the config file as text to avoid executing ES module dependencies
 * Uses path variables (e.g., partialsPath, lineaJsonRpcPath) as the source of truth
 */
function getRemoteContentPlugins() {
  const configPath = path.join(__dirname, "..", "docusaurus.config.js");
  const configContent = fs.readFileSync(configPath, "utf8");
  
  // First, extract all path variable definitions (e.g., const partialsPath = "services/reference/_partials")
  const pathVars = new Map();
  const pathVarRegex = /const\s+(\w+Path)\s*=\s*["']([^"']+)["']/g;
  let pathMatch;
  while ((pathMatch = pathVarRegex.exec(configContent)) !== null) {
    pathVars.set(pathMatch[1], pathMatch[2]); // Store variable name -> path value
  }
  
  const commands = [];
  
  // Find all occurrences of "docusaurus-plugin-remote-content" and extract the following config block
  const pluginMarker = /["']docusaurus-plugin-remote-content["']/g;
  let markerMatch;
  
  while ((markerMatch = pluginMarker.exec(configContent)) !== null) {
    // Start searching from the marker position
    const startPos = markerMatch.index;
    const afterMarker = configContent.substring(startPos);
    
    // Find the opening brace of the config object (skip the array bracket and comma)
    const configStart = afterMarker.indexOf('{');
    if (configStart === -1) continue;
    
    // Find the matching closing brace for this config object to limit our search
    let braceCount = 0;
    let configEnd = configStart;
    for (let i = configStart; i < afterMarker.length && i < configStart + 5000; i++) {
      if (afterMarker[i] === '{') braceCount++;
      if (afterMarker[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          configEnd = i + 1;
          break;
        }
      }
    }
    
    // Extract the config object content (from opening brace to closing brace)
    const configChunk = afterMarker.substring(configStart, configEnd);
    
    // Extract name field
    const nameMatch = configChunk.match(/name:\s*["']([^"']+)["']/);
    if (!nameMatch) continue;
    const pluginName = nameMatch[1];
    
    
    // Extract outDir field
    const outDirMatch = configChunk.match(/outDir:\s*["']([^"']+)["']/);
    const outDir = outDirMatch ? outDirMatch[1] : null;
    
    // Extract source path variable from buildRepoRawBaseUrl call (e.g., buildRepoRawBaseUrl(metamaskRepo, partialsPath))
    // This is the source of truth for what's being downloaded
    // Now that we've limited to just this plugin's config object, we can safely match the first sourceBaseUrl
    const sourcePathVarMatch = configChunk.match(/sourceBaseUrl:\s*buildRepoRawBaseUrl\([^,]+,\s*(\w+Path)\)/);
    const sourcePathVar = sourcePathVarMatch ? sourcePathVarMatch[1] : null;
    const sourcePath = sourcePathVar && pathVars.has(sourcePathVar) ? pathVars.get(sourcePathVar) : null;
    
    // Use the source path as the display name - what maintainers configured is what they get
    const displayName = sourcePath || pluginName;
    
    // Generate download command: npx docusaurus download-remote-{name}
    const downloadCommand = `download-remote-${pluginName}`;
    
    commands.push({
      name: pluginName,
      displayName: displayName,
      cmd: "npx",
      args: ["docusaurus", downloadCommand],
      outDir: outDir, // Use outDir from config to determine where files are downloaded
    });
  }
  
  return commands;
}

/**
 * Download remote content using docusaurus-plugin-remote-content
 */
async function downloadRemoteContent() {
  // #region agent log
  debugLog("port-content.js:downloadRemoteContent", "Function entry", {}, "B");
  // #endregion agent log
  
  console.log("📥 Downloading remote content from MetaMask docs...\n");
  
  // Check for GitHub token
  checkGitHubToken();
  
  // Get commands from docusaurus.config.js instead of hardcoding
  const commands = getRemoteContentPlugins();
  
  if (commands.length === 0) {
    console.warn("⚠️  No remote content plugins found in docusaurus.config.js");
    return;
  }
  
  // Show expected downloads summary
  console.log("📋 Expected downloads:");
  commands.forEach((cmd, index) => {
    console.log(`   ${index + 1}. ${cmd.displayName} (${cmd.name})`);
  });
  console.log("");
  
  try {
    // #region agent log
    debugLog("port-content.js:downloadRemoteContent", "Before download loop", { commandCount: commands.length }, "B");
    // #endregion agent log
    
      const downloadResults = [];
      
      for (const { name, displayName, cmd, args, outDir: expectedPath } of commands) {
        // #region agent log
        debugLog("port-content.js:downloadRemoteContent", "Starting download", { name, cmd, args: args.join(" ") }, "B");
        // #endregion agent log
        
        console.log(`📦 Downloading ${displayName}...`);
        const startTime = Date.now();
        
      await runCommandWithTimeout(cmd, args, {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env }, // Preserve environment including GITHUB_TOKEN
      }, 300000, true); // 5 minute timeout per command, filter output
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Count files after download to verify success - use outDir from plugin config
        let fileCount = null;
        const outDir = expectedPath ? path.resolve(path.join(__dirname, ".."), expectedPath) : null;
        
        if (outDir && fs.existsSync(outDir)) {
          const files = getAllMarkdownFiles(outDir);
          fileCount = files.length;
          console.log(`   ✅ Successfully downloaded ${fileCount} file(s) in ${elapsed}s`);
        } else if (outDir) {
          console.log(`   ⚠️  Completed in ${elapsed}s but output directory not found: ${outDir}`);
        } else {
          console.log(`   ✅ Completed in ${elapsed}s`);
        }
        
        downloadResults.push({ name: displayName, fileCount, elapsed, success: true });
      
      // #region agent log
      debugLog("port-content.js:downloadRemoteContent", "Download complete", { name, fileCount, elapsed }, "B");
      // #endregion agent log
    }
    
    // #region agent log
    debugLog("port-content.js:downloadRemoteContent", "All downloads complete", {}, "B");
    // #endregion agent log
    
    // Summary
    console.log("\n📊 Download Summary:");
    const totalFiles = downloadResults.reduce((sum, r) => sum + (r.fileCount || 0), 0);
    downloadResults.forEach((result) => {
      const fileInfo = result.fileCount ? ` (${result.fileCount} files)` : "";
      console.log(`   ✅ ${result.name}${fileInfo} - ${result.elapsed}s`);
    });
    console.log(`\n✅ Successfully downloaded ${totalFiles} total file(s) from MetaMask docs`);
    
    logToFile("transformation-summary.log", `Downloaded remote content from MetaMask docs: ${downloadResults.map(r => `${r.name} (${r.fileCount || 0} files)`).join(", ")}`);
  } catch (error) {
    // #region agent log
    debugLog("port-content.js:downloadRemoteContent", "Download error", { error: error.message, stack: error.stack }, "B");
    // #endregion agent log
    
    const errorMessage = error.message || String(error);
    const errorString = JSON.stringify(error).toLowerCase();
    
    // Check for rate limit errors (check message, status code, and error data)
    const isRateLimit = 
      errorMessage.includes("rate limit") || 
      errorMessage.includes("403") || 
      errorMessage.includes("API rate limit exceeded") ||
      errorString.includes("rate limit") ||
      (error.response && error.response.status === 403) ||
      (error.status === 403);
    
    if (isRateLimit) {
      console.error("\n❌ GitHub API rate limit exceeded!");
      console.error("");
      console.error("   Solutions:");
      console.error("   1. Set API_TOKEN environment variable (or GITHUB_TOKEN):");
      console.error("      export API_TOKEN=your_github_token");
      console.error("   2. Or create/update .env file in the project root:");
      console.error("      echo 'API_TOKEN=your_github_token' >> .env");
      console.error("   3. Get a token at: https://github.com/settings/tokens");
      console.error("      (No special permissions needed - just a personal access token)");
      console.error("   4. Wait for rate limit to reset (usually 1 hour)");
      console.error("");
      logToFile("build-errors.log", `ERROR: GitHub API rate limit exceeded. Set API_TOKEN or GITHUB_TOKEN for higher limits.\n${errorMessage}`);
    } else {
      console.error("\n❌ Error downloading remote content:", errorMessage);
      logToFile("build-errors.log", `ERROR: Failed to download remote content: ${errorMessage}\n${error.stack || ''}`);
    }
    throw error;
  }
}

/**
 * Get all markdown files in ported data directory
 */
function getAllMarkdownFiles(dir) {
  const files = []; // Array to collect all markdown files recursively
  
  if (!fs.existsSync(dir)) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:getAllMarkdownFiles',message:'Directory does not exist',data:{dir},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion agent log
    return files; // Return empty array if directory doesn't exist
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true }); // Read directory with file type info
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath)); // Recursively process subdirectories
    } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))) {
      files.push(fullPath); // Add markdown/MDX files to results
    }
  }
  
  return files; // Return all collected markdown files
}

/**
 * Check if a file exists relative to a base directory - validates link targets for broken link detection
 */
function fileExists(relativePath, baseDir) {
  // Skip external URLs - consider them valid (they don't need to exist locally)
  if (/^(https?|mailto):/.test(relativePath)) {
    return true; // Consider external links as "existing"
  }
  
  // Skip anchor links - consider them valid (they reference sections within the same file)
  if (relativePath.startsWith('#')) {
    return true;
  }
  
  // Strip anchor/hash from path (e.g., "file.md#anchor" -> "file.md")
  const pathWithoutAnchor = relativePath.split('#')[0];
  const projectRoot = path.join(__dirname, "..");
  let pathToCheck = pathWithoutAnchor;
  
  // Handle absolute paths starting with / (web paths)
  if (pathWithoutAnchor.startsWith('/')) {
    // Convert absolute web path to filesystem path relative to docs
    pathToCheck = pathWithoutAnchor.replace(/^\//, '');
    const resolvedPath = path.resolve(projectRoot, "docs", pathToCheck);
    if (fs.existsSync(resolvedPath)) {
      return true;
    }
    // Also check with .md and .mdx extensions if no extension provided
    if (!path.extname(resolvedPath)) {
      return fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx');
    }
    return false;
  }
  
  // Resolve relative path from base directory
  let resolvedPath;
  try {
    resolvedPath = path.resolve(baseDir, pathToCheck);
  } catch (e) {
    return false;
  }
  
  // Check if file exists
  if (fs.existsSync(resolvedPath)) {
    return true;
  }
  
  // Also check with .md and .mdx extensions if no extension provided
  if (!path.extname(resolvedPath)) {
    if (fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx')) {
      return true;
    }
    
    // If link starts with ../ and doesn't exist, try same directory as fallback
    if (pathToCheck.startsWith('../')) {
      const filename = path.basename(pathToCheck);
      const sameDirPath = path.join(baseDir, filename);
      if (fs.existsSync(sameDirPath + '.md') || fs.existsSync(sameDirPath + '.mdx')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Build a map of partial files to the files that import them - used for context-aware link validation
 */
function buildPartialImportMap() {
  const partialImportMap = new Map(); // Map: partial file path -> array of files that import it
  const files = getAllMarkdownFiles(PORTED_DATA_DIR);
  const docsRoot = path.join(__dirname, "..", "docs");
  const partialsDir = path.join(PORTED_DATA_DIR, "reference", "_partials");
  
  files.forEach(filePath => {
    // Skip partial files themselves - only process files that import partials
    if (filePath.includes(path.join("reference", "_partials"))) {
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Match import statements: import X from "../../_partials/..." - find all partial imports
    const importRegex = /import\s+\w+\s+from\s+["']([^"']*_partials[^"']+)["']/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      let partialPath;
      
      // Handle absolute paths
      if (importPath.startsWith('/') && importPath.includes('_partials')) {
        const relativePath = importPath.replace(/^.*_partials\//, '');
        partialPath = path.join(partialsDir, relativePath);
      }
      // Handle relative paths
      else if (importPath.includes('_partials')) {
        const baseDir = path.dirname(filePath);
        partialPath = path.resolve(baseDir, importPath);
      }
      
      if (partialPath && fs.existsSync(partialPath)) {
        const normalizedPartialPath = path.normalize(partialPath);
        if (!partialImportMap.has(normalizedPartialPath)) {
          partialImportMap.set(normalizedPartialPath, []);
        }
        partialImportMap.get(normalizedPartialPath).push(filePath);
      }
    }
  });
  
  return partialImportMap;
}

/**
 * Try to fix a broken link by finding the correct path
 */
function tryFixLink(linkPath, baseDir, docsRoot) {
  // Strip anchor for checking existence
  const linkWithoutAnchor = linkPath.split('#')[0];
  const anchor = linkPath.includes('#') ? '#' + linkPath.split('#').slice(1).join('#') : '';
  
  // Try to fix known broken link patterns
  // This function should only attempt fixes, not exclude paths
  // Let fileExists() determine if a link is valid - this makes the system work with any configured import
  
  // Example: Fix relative paths that might need adjustment
  // Add specific fix patterns here if needed, but don't exclude any paths generically
  
  return null; // Return null if no fix found - fileExists() will check validity
}

/**
 * Fix or remove broken internal links
 */
function removeBrokenLinks(content, filePath, partialImportMap) {
  const baseDir = path.dirname(filePath);
  const docsRoot = path.join(__dirname, "..", "docs");
  const normalizedFilePath = path.normalize(filePath);
  
  // Check if this is a partial file
  const isPartial = filePath.includes(path.join("reference", "_partials"));
  const importingFiles = isPartial ? (partialImportMap.get(normalizedFilePath) || []) : [];
  
  // Match markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let modified = false;
  const brokenLinks = [];
  
  content = content.replace(linkRegex, (match, linkText, linkPath) => {
    // Skip external links (http, https, mailto, etc.)
    if (/^(https?|mailto|#):/.test(linkPath)) {
      return match;
    }
    
    // Skip anchor links (starting with #)
    if (linkPath.startsWith('#')) {
      return match;
    }
    
    let targetExists = false;
    let fixedPath = null;
    
    // For partial files, check from multiple contexts
    if (isPartial) {
      const worksFromPartial = fileExists(linkPath, baseDir) || fileExists(linkPath, docsRoot);
      
      if (worksFromPartial) {
        targetExists = true;
      } else if (importingFiles.length > 0) {
        for (const importingFile of importingFiles) {
          const importingDir = path.dirname(importingFile);
          if (fileExists(linkPath, importingDir) || fileExists(linkPath, docsRoot)) {
            targetExists = true;
            break;
          }
        }
      } else {
        targetExists = worksFromPartial;
      }
    } else {
      targetExists = fileExists(linkPath, baseDir) || fileExists(linkPath, docsRoot);
    }
    
    // If link is broken, try to fix it
    if (!targetExists) {
      fixedPath = tryFixLink(linkPath, baseDir, docsRoot);
      
      if (!fixedPath && isPartial && importingFiles.length > 0) {
        for (const importingFile of importingFiles) {
          const importingDir = path.dirname(importingFile);
          fixedPath = tryFixLink(linkPath, importingDir, docsRoot);
          if (fixedPath) break;
        }
      }
      
      if (fixedPath && fileExists(fixedPath, docsRoot)) {
        modified = true;
        return `[${linkText}](${fixedPath})`;
      } else {
        // Couldn't fix, remove link but keep text
        brokenLinks.push({ file: path.relative(docsRoot, filePath), link: linkPath, text: linkText });
        modified = true;
        return linkText;
      }
    }
    
    return match;
  });
  
  return { content, modified, brokenLinks };
}

/**
 * Fix MDX import/export syntax issues
 */
function fixMDXSyntax(content) {
  let modified = false;
  
  // Remove commented component imports entirely to avoid parsing issues
  content = content.replace(/^\/\/\s*import\s+[^;]+;?\s*\/\/\s*Component not available[^\n]*\n/gm, (match) => {
    modified = true;
    return '';
  });
  
  // Ensure there's a blank line after import statements before markdown content
  // This fixes "Could not parse import/exports with acorn" errors
  // Match: import statement followed by newline, then immediately a markdown heading or other content
  content = content.replace(/(^import\s+[^;\n]+;?\s*\n)([#\w<])/gm, (match, imports, nextChar) => {
    // Check if there's already a blank line after the import
    const afterImport = content.substring(content.indexOf(imports) + imports.length);
    if (afterImport && !afterImport.startsWith('\n')) {
      modified = true;
      return imports + '\n' + nextChar;
    }
    return match;
  });
  
  // Also handle case where import is followed directly by markdown heading
  content = content.replace(/(import\s+[^;\n]+;?\n)(#\s+)/gm, (match, imports, heading) => {
    modified = true;
    return imports + '\n' + heading;
  });
  
  return { content, modified };
}

/**
 * Remove or comment out missing component imports and their usage
 */
function fixComponentImports(content, filePath) {
  let modified = false;
  const removedComponents = new Set();
  const removedConstants = new Set();
  const componentFixes = [];
  
  // Match @site/src/components imports and track component names
  const componentImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/components\/([^"']+)["'];?$/gm;
  
  content = content.replace(componentImportRegex, (match, componentName, componentPath) => {
    modified = true;
    removedComponents.add(componentName);
    componentFixes.push({ type: 'component', name: componentName, path: componentPath, import: match });
    // Remove the import entirely instead of commenting (to avoid MDX parsing issues)
    return '';
  });
  
  // Match @site/src/plugins imports
  const pluginImportRegex = /^import\s+{([^}]+)}\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  
  content = content.replace(pluginImportRegex, (match, imports, pluginPath) => {
    modified = true;
    const constants = imports.split(',').map(i => i.trim());
    constants.forEach(constName => {
      removedConstants.add(constName);
      componentFixes.push({ type: 'plugin', name: constName, path: pluginPath, import: match });
    });
    // Remove the import entirely
    return '';
  });
  
  // Also match default imports from plugins
  const pluginDefaultImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  
  content = content.replace(pluginDefaultImportRegex, (match, importName, pluginPath) => {
    modified = true;
    removedConstants.add(importName);
    componentFixes.push({ type: 'plugin', name: importName, path: pluginPath, import: match });
    return '';
  });
  
  // Remove or comment out usage of these components
  removedComponents.forEach(componentName => {
    // Match self-closing tags (including multi-line)
    const selfClosingRegex = new RegExp(`<${componentName}(?:[\\s\\S]*?)/>`, 'g');
    if (selfClosingRegex.test(content)) {
      content = content.replace(selfClosingRegex, (match) => {
        modified = true;
        const lines = match.split('\n');
        return `{/* ${lines[0]}... - Component not available */}`;
      });
    }
    
    // Match opening/closing tags
    const openCloseRegex = new RegExp(`<${componentName}(?:[\\s\\S]*?)>([\\s\\S]*?)</${componentName}>`, 'g');
    if (openCloseRegex.test(content)) {
      content = content.replace(openCloseRegex, (match, innerContent) => {
        modified = true;
        const lines = match.split('\n');
        return `{/* ${lines[0]}... - Component not available */}`;
      });
    }
  });
  
  // Remove or comment out usage of removed constants
  removedConstants.forEach(constName => {
    const constantUsageRegex = new RegExp(`\\b${constName}\\.[\\w]+`, 'g');
    if (constantUsageRegex.test(content)) {
      content = content.replace(constantUsageRegex, (match) => {
        modified = true;
        return `/* ${match} - Constant not available */`;
      });
    }
  });
  
  return { content, modified, componentFixes };
}

/**
 * Fix image paths in content
 */
function fixImagePaths(content, filePath) {
  let modified = false;
  const imageFixes = [];
  
  // Match require() statements for images with any number of ../ before images/ - convert to @site/static/img/ paths
  content = content.replace(
    /require\(["'](\.\.\/)+images\/([^"']+)["']\)/g,
    (match, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop(); // Extract filename from path
      imageFixes.push({ original: match, new: `require('@site/static/img/${filename}')`, image: filename });
      return `require('@site/static/img/${filename}')`; // Rewrite to Docusaurus static asset path
    }
  );
  
  // Match src={require(...)} patterns - convert JSX src attributes with relative require() to @site/static/img/ paths
  content = content.replace(
    /src=\{require\(["'](\.\.\/)+images\/([^"']+)["']\)\.default\}/g,
    (match, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop(); // Extract filename from path
      imageFixes.push({ original: match, new: `src={require('@site/static/img/${filename}').default}`, image: filename });
      return `src={require('@site/static/img/${filename}').default}`; // Rewrite to Docusaurus static asset path
    }
  );
  
  // Also handle markdown image syntax - convert ![alt](../images/file.png) to JSX img tag with require()
  content = content.replace(
    /!\[([^\]]*)\]\((\.\.\/)+images\/([^)]+)\)/g,
    (match, alt, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop(); // Extract filename from path
      const newPath = `<img src={require('@site/static/img/${filename}').default} alt="${alt}" />`; // Convert to Docusaurus require() syntax
      imageFixes.push({ original: match, new: newPath, image: filename });
      return newPath;
    }
  );
  
  return { content, modified, imageFixes };
}

/**
 * Rename index.md to services-index.md to avoid conflict with README.md
 * Also removes index.md if services-index.md already exists (from previous run)
 */
function renameIndexFile() {
  const indexPath = path.join(PORTED_DATA_DIR, "index.md");
  const servicesIndexPath = path.join(PORTED_DATA_DIR, "services-index.md");
  
  // If services-index.md already exists, delete the newly downloaded index.md
  if (fs.existsSync(servicesIndexPath) && fs.existsSync(indexPath)) {
    fs.unlinkSync(indexPath);
    console.log("   ✅ Removed duplicate index.md (services-index.md already exists)");
    logToFile("transformation-summary.log", "Removed duplicate index.md (services-index.md already exists)");
    return;
  }
  
  // Otherwise, rename index.md to services-index.md
  if (fs.existsSync(indexPath) && !fs.existsSync(servicesIndexPath)) {
    fs.renameSync(indexPath, servicesIndexPath);
    console.log("   ✅ Renamed index.md to services-index.md");
    logToFile("transformation-summary.log", "Renamed index.md to services-index.md to avoid conflict with README.md");
  }
}

/**
 * Apply transformations to downloaded content
 */
function applyTransformations() {
  // #region agent log
  debugLog("port-content.js:applyTransformations", "Function entry", {}, "C");
  // #endregion agent log
  
  console.log("🔧 Applying transformations...");
  
  if (!fs.existsSync(PORTED_DATA_DIR)) {
    // #region agent log
    debugLog("port-content.js:applyTransformations", "No ported data dir", { path: PORTED_DATA_DIR }, "C");
    // #endregion agent log
    console.log("⚠️  No ported data directory found. Skipping transformations.");
    return;
  }
  
  // Rename index.md to services-index.md first
  renameIndexFile();
  
  const files = getAllMarkdownFiles(PORTED_DATA_DIR);
  // #region agent log
  debugLog("port-content.js:applyTransformations", "Files found", { fileCount: files.length }, "C");
  // #endregion agent log
  
  console.log(`   Processing ${files.length} file(s)...`);
  
  // Build map of partial files to their importing files
  console.log(`   Building partial import map...`);
  const partialImportMap = buildPartialImportMap();
  if (partialImportMap.size > 0) {
    console.log(`   Found ${partialImportMap.size} partial file(s) with imports`);
  }
  
  let totalBroken = 0;
  let totalImageFixes = 0;
  let totalComponentFixes = 0;
  const allBrokenLinks = [];
  const allImageFixes = [];
  const allComponentFixes = [];
  const docsRoot = path.join(__dirname, "..", "docs");
  
  files.forEach((filePath, index) => {
    // #region agent log
    if (index % 50 === 0) {
      debugLog("port-content.js:applyTransformations", "Processing file", { index, total: files.length, filePath }, "C");
    }
    // #endregion agent log
    
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;
    let fileModified = false;
    const relativeFilePath = path.relative(docsRoot, filePath);
    
    // #region agent log
    if (content.length < 100) {
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:applyTransformations',message:'File with very short content detected',data:{filePath,contentLength:content.length,contentPreview:content.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    }
    // #endregion agent log
    
    // Step 1: Fix image paths
    const { content: imageFixed, modified: imageModified, imageFixes } = fixImagePaths(content, filePath);
    content = imageFixed;
    if (imageModified) {
      fileModified = true;
      totalImageFixes += imageFixes.length;
      imageFixes.forEach(fix => {
        allImageFixes.push({
          file: relativeFilePath,
          original: fix.original,
          new: fix.new,
          image: fix.image,
        });
        logToFile("image-operations.log", `FIXED: File: ${relativeFilePath}, Image: ${fix.image}, Original: ${fix.original}, New: ${fix.new}`);
      });
    }
    
    // Step 2: Fix MDX syntax issues (blank lines after imports, etc.)
    const { content: mdxFixed, modified: mdxModified } = fixMDXSyntax(content);
    content = mdxFixed;
    if (mdxModified) {
      fileModified = true;
    }
    
    // Step 3: Fix component imports
    const { content: componentFixed, modified: componentModified, componentFixes } = fixComponentImports(content, filePath);
    content = componentFixed;
    if (componentModified) {
      fileModified = true;
      totalComponentFixes += componentFixes.length;
      componentFixes.forEach(fix => {
        allComponentFixes.push({
          file: relativeFilePath,
          type: fix.type,
          name: fix.name,
          path: fix.path,
          import: fix.import,
        });
        logToFile("component-import-fixes.log", `FIXED: File: ${relativeFilePath}, Type: ${fix.type}, Name: ${fix.name}, Path: ${fix.path}`);
      });
    }
    
    // Step 4: Remove broken internal links
    const { content: fixedContent, modified: linksModified, brokenLinks } = removeBrokenLinks(content, filePath, partialImportMap);
    content = fixedContent;
    
    // #region agent log
    if (originalContent.length > 100 && content.length < 100) {
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:applyTransformations',message:'Content significantly reduced after transformations',data:{filePath,originalLength:originalContent.length,contentLength:content.length,linksModified,brokenLinksCount:brokenLinks.length,imageModified,componentModified,mdxModified},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    }
    // #endregion agent log
    
    if (linksModified) {
      fileModified = true;
      totalBroken += brokenLinks.length;
      allBrokenLinks.push(...brokenLinks);
      brokenLinks.forEach(({ link, text }) => {
        logToFile("links-dropped.log", `REMOVED: File: ${relativeFilePath}, Link Text: ${text}, Broken Link: ${link}`);
      });
    }
    
    if (fileModified || content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
    }
  });
  
  // #region agent log
  debugLog("port-content.js:applyTransformations", "Transformations complete", { 
    totalImageFixes, 
    totalComponentFixes, 
    totalBroken, 
    fileCount: files.length 
  }, "C");
  // #endregion agent log
  
  // Report fixes
  if (totalImageFixes > 0) {
    console.log(`   ✅ Fixed ${totalImageFixes} image path(s)`);
    console.log(`      📝 Details written to _maintainers/logs/image-operations.log`);
  } else {
    console.log("   ✅ No image fixes needed");
  }
  
  if (totalComponentFixes > 0) {
    console.log(`   ⚠️  Commented out ${totalComponentFixes} missing component import(s)`);
    console.log(`      📝 Details written to _maintainers/logs/component-import-fixes.log`);
  }
  
  if (totalBroken > 0) {
    console.log(`   ⚠️  Found and removed ${totalBroken} broken link(s)`);
    console.log(`      📝 Details written to _maintainers/logs/links-dropped.log`);
    // Log first 10 broken links as examples
    const examples = allBrokenLinks.slice(0, 10);
    examples.forEach(({ file, link, text }) => {
      console.log(`      - ${file}: [${text}](${link})`);
    });
    if (allBrokenLinks.length > 10) {
      console.log(`      ... and ${allBrokenLinks.length - 10} more`);
    }
  }
  
  logToFile("transformation-summary.log", `Applied transformations to ${files.length} file(s), fixed ${totalImageFixes} image path(s), commented out ${totalComponentFixes} component import(s), removed ${totalBroken} broken link(s)`);
}

/**
 * Main function
 */
async function main() {
  // #region agent log
  debugLog("port-content.js:main", "Main function entry", { argv: process.argv }, "D");
  // #endregion agent log
  
  console.log("🚀 Starting port content process...\n");
  
  // Check if we should skip the dev server (for testing)
  const skipServer = process.argv.includes("--no-server") || process.argv.includes("--test");
  const runBuild = process.argv.includes("--build");
  
  // #region agent log
  debugLog("port-content.js:main", "Flags parsed", { skipServer, runBuild }, "D");
  // #endregion agent log
  
  // Set up global timeout to prevent hanging >6 minutes
  const globalTimeout = setTimeout(() => {
    // #region agent log
    debugLog("port-content.js:main", "Global timeout triggered", {}, "D");
    // #endregion agent log
    console.error("\n❌ Process exceeded 6 minute timeout. Exiting...");
    process.exit(1);
  }, 360000); // 6 minutes
  
  try {
    // Step 1: Download remote content
    // #region agent log
    debugLog("port-content.js:main", "Before downloadRemoteContent", {}, "D");
    // #endregion agent log
    await downloadRemoteContent();
    
    // Step 2: Apply transformations
    // #region agent log
    debugLog("port-content.js:main", "Before applyTransformations", {}, "D");
    // #endregion agent log
    applyTransformations();
    
    // #region agent log
    debugLog("port-content.js:main", "Before server decision", { skipServer, runBuild }, "D");
    // #endregion agent log
    
    // Clear global timeout since download/transform completed successfully
    clearTimeout(globalTimeout);
    
    console.log("\n✨ Port content process completed!");
    
    if (runBuild) {
      // Run build to check for broken links
      console.log("   Running build to check for broken links...\n");
      // #region agent log
      debugLog("port-content.js:main", "Starting build", {}, "E");
      // #endregion agent log
      await runCommandWithTimeout("npm", ["run", "build"], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env },
      }, 600000); // 10 minute timeout for build
    } else if (!skipServer) {
      // Step 3: Start dev server (default behavior)
      // Note: Dev server runs indefinitely, so we spawn it without timeout
      // User can stop it with Ctrl+C
      console.log("   Starting dev server...\n");
      console.log("   (Press Ctrl+C to stop the dev server)\n");
      // #region agent log
      debugLog("port-content.js:main", "Starting dev server", {}, "E");
      // #endregion agent log
      
      // Spawn dev server without timeout (runs indefinitely)
      const devServer = spawn("npm", ["start"], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env },
        stdio: "inherit",
        shell: true,
      });
      
      // Handle process termination signals
      process.on("SIGINT", () => {
        // #region agent log
        debugLog("port-content.js:main", "SIGINT received", {}, "E");
        // #endregion agent log
        console.log("\n\n🛑 Stopping dev server...");
        devServer.kill("SIGTERM");
        process.exit(0);
      });
      
      process.on("SIGTERM", () => {
        // #region agent log
        debugLog("port-content.js:main", "SIGTERM received", {}, "E");
        // #endregion agent log
        devServer.kill("SIGTERM");
        process.exit(0);
      });
      
      // Wait for dev server to exit (shouldn't happen unless killed)
      await new Promise((resolve) => {
        devServer.on("close", (code) => {
          // #region agent log
          debugLog("port-content.js:main", "Dev server closed", { code }, "E");
          // #endregion agent log
          resolve();
        });
      });
    } else {
      console.log("   Skipping dev server (--no-server flag used)");
      // #region agent log
      debugLog("port-content.js:main", "Skipping server", {}, "E");
      // #endregion agent log
    }
  } catch (error) {
    clearTimeout(globalTimeout);
    // #region agent log
    debugLog("port-content.js:main", "Error caught", { error: error.message, stack: error.stack }, "D");
    // #endregion agent log
    console.error("\n❌ Port content process failed:", error.message);
    logToFile("build-errors.log", `FATAL ERROR: ${error.message}\n${error.stack}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    // #region agent log
    debugLog("port-content.js:main", "Unhandled error", { error: error.message, stack: error.stack }, "D");
    // #endregion agent log
    console.error("\n❌ Unhandled error:", error.message);
    process.exit(1);
  });
}

module.exports = {
  downloadRemoteContent,
  applyTransformations,
};

