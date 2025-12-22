#!/usr/bin/env node

/**
 * Port content script - Downloads and transforms ported content
 * Downloads content and images via docusaurus-plugin-remote-content (configured in docusaurus.config.js)
 * Applies transformations: MDX syntax fixes, component import removal
 * Note: Image path rewriting and link processing are handled by remark plugins at build time
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

// PORTED_DATA_DIR is determined dynamically from docusaurus.config.js remote content plugin configurations
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
// Track log file initialization to write headers only once per run
let logFileInitialized = new Set();

/**
 * Initialize log file with header (timestamp and count placeholder)
 */
function initLogFile(logFile, itemType, count) {
  if (logFileInitialized.has(logFile)) {
    return; // Already initialized
  }
  
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    const logPath = path.join(LOGS_DIR, logFile);
    const timestamp = new Date().toISOString();
    const header = `=== ${itemType} Log ===\nDate: ${timestamp}\nTotal ${itemType}: ${count}\n\n`;
    fs.writeFileSync(logPath, header, "utf8");
    logFileInitialized.add(logFile);
  } catch (err) {
    console.warn(`[port-content] Failed to initialize log: ${err.message}`);
  }
}

/**
 * Write log entry in simple format: file, original, replacement
 */
function logToFile(logFile, file, original, replacement) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    const logPath = path.join(LOGS_DIR, logFile);
    const entry = `For file: ${file}\nOriginal: ${original}\nReplacement: ${replacement}\n\n`;
    fs.appendFileSync(logPath, entry, "utf8");
  } catch (err) {
    console.warn(`[port-content] Failed to write log: ${err.message}`);
  }
}

/**
 * Legacy log function for non-transformation logs (kept for compatibility)
 */
function logToFileLegacy(logFile, message) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    const logPath = path.join(LOGS_DIR, logFile);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8");
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
            
            // Suppress file count messages from plugin - we use documents array from config as source of truth
            // The "Found X files" message is from list-remote scanning, not from the actual documents array
            if (line.match(/\[list-remote\] (Found|After filtering)/)) {
              // Suppress - we show expected downloads from config instead
              continue; // Skip this line entirely
            }
            // Show task completion messages
            if (line.includes("Task fetch") && line.includes("done")) {
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
  
  // First, extract all path variable definitions (e.g., const partialsPath = "services/reference/_partials" or const ethereumFolder = "services/reference/ethereum")
  const pathVars = new Map();
  // Match variables ending in Path or Folder (or any variable that looks like a path)
  const pathVarRegex = /const\s+(\w+(?:Path|Folder))\s*=\s*["']([^"']+)["']/g;
  let pathMatch;
  while ((pathMatch = pathVarRegex.exec(configContent)) !== null) {
    pathVars.set(pathMatch[1], pathMatch[2]); // Store variable name -> path value
  }
  
  const commands = [];
  
  // Find all occurrences of "docusaurus-plugin-remote-content" and extract the following config block
  // Skip matches that are inside JavaScript comments (// or /* */)
  const pluginMarker = /["']docusaurus-plugin-remote-content["']/g;
  let markerMatch;
  
  while ((markerMatch = pluginMarker.exec(configContent)) !== null) {
    const startPos = markerMatch.index;
    
    // Check if this match is inside a comment
    // Look backwards from the match to find the last newline or comment start
    const beforeMatch = configContent.substring(0, startPos);
    const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
    const lineStart = lastNewlineIndex >= 0 ? lastNewlineIndex + 1 : 0;
    const lineBeforeMatch = configContent.substring(lineStart, startPos);
    
    // Check for single-line comment (//)
    if (lineBeforeMatch.trim().startsWith('//')) {
      continue; // Skip this match - it's in a single-line comment
    }
    
    // Check for multi-line comment (/* ... */)
    // Find the last /* before this position
    const lastCommentStart = beforeMatch.lastIndexOf('/*');
    if (lastCommentStart >= 0) {
      // Check if there's a matching */ after the comment start but before our match
      const afterCommentStart = configContent.substring(lastCommentStart + 2, startPos);
      const lastCommentEnd = afterCommentStart.lastIndexOf('*/');
      // If there's no */ between /* and our match, we're inside a comment
      if (lastCommentEnd === -1) {
        continue; // Skip this match - it's inside a multi-line comment
      }
    }
    
    // Start searching from the marker position
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
    
    // Extract source path variable from buildRepoRawBaseUrl call (e.g., buildRepoRawBaseUrl(metamaskRepo, partialsPath) or buildRepoRawBaseUrl(metamaskRepo, ethereumFolder))
    // This is the source of truth for what's being downloaded
    // Now that we've limited to just this plugin's config object, we can safely match the first sourceBaseUrl
    const sourcePathVarMatch = configChunk.match(/sourceBaseUrl:\s*buildRepoRawBaseUrl\([^,]+,\s*(\w+(?:Path|Folder))\)/);
    const sourcePathVar = sourcePathVarMatch ? sourcePathVarMatch[1] : null;
    const sourcePath = sourcePathVar && pathVars.has(sourcePathVar) ? pathVars.get(sourcePathVar) : null;
    
    // Extract documents array - this is the source of truth for what files are being downloaded
    // Can be: ["index.md"] or listDocuments(...) function call
    let expectedFileCount = null;
    let documentsDescription = null;
    
    // Try to match array format: documents: ["index.md", "file2.md"]
    const documentsArrayMatch = configChunk.match(/documents:\s*\[([^\]]+)\]/);
    if (documentsArrayMatch) {
      // Count items in the array (split by comma, filter empty)
      const items = documentsArrayMatch[1].split(',').map(item => item.trim().replace(/["']/g, '')).filter(item => item);
      expectedFileCount = items.length;
      documentsDescription = items.length === 1 ? items[0] : `${items.length} files`;
    } else {
      // Check if it's a function call like listDocuments(...)
      const listDocumentsMatch = configChunk.match(/documents:\s*listDocuments\(/);
      if (listDocumentsMatch) {
        documentsDescription = "dynamic list";
        // Can't determine count without executing the function, so leave as null
      }
    }
    
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
      expectedFileCount: expectedFileCount, // Number of files expected from documents array
      documentsDescription: documentsDescription, // Description of what's being downloaded
    });
  }
  
  return commands;
}

/**
 * Collect all ported file paths from all outDir directories
 * Returns array of relative paths from docs/ directory
 */
function collectPortedFiles(commands) {
  const portedFiles = new Set();
  const docsRoot = path.join(__dirname, "..", "docs");
  
  for (const { outDir } of commands) {
    if (!outDir) continue;
    
    // Skip image directories - we only track markdown files for remark plugins
    if (outDir.includes("static/img")) {
      continue;
    }
    
    const fullOutDir = path.resolve(path.join(__dirname, ".."), outDir);
    if (!fs.existsSync(fullOutDir)) {
      continue;
    }
    
    // Get all markdown files in this outDir
    const files = getAllMarkdownFiles(fullOutDir);
    
    for (const filePath of files) {
      // Convert to relative path from docs/ directory
      const relativePath = path.relative(docsRoot, filePath);
      if (relativePath && !relativePath.startsWith('..')) {
        // Remove .md/.mdx extension for consistency with Docusaurus paths
        const pathWithoutExt = relativePath.replace(/\.(md|mdx)$/, '');
        portedFiles.add(pathWithoutExt);
      }
    }
  }
  
  return Array.from(portedFiles).sort();
}

/**
 * Write ported files log for remark plugins to use
 */
function writePortedFilesLog(portedFiles) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    const logPath = path.join(LOGS_DIR, "ported-files.log");
    const content = portedFiles.join('\n') + '\n';
    fs.writeFileSync(logPath, content, "utf8");
  } catch (err) {
    console.warn(`[port-content] Failed to write ported-files.log: ${err.message}`);
  }
}

/**
 * Download remote content using docusaurus-plugin-remote-content
 */
async function downloadRemoteContent(commands) {
  // #region agent log
  debugLog("port-content.js:downloadRemoteContent", "Function entry", { commandCount: commands ? commands.length : 0 }, "B");
  // #endregion agent log
  
  console.log("📥 Downloading remote content...\n");
  
  // Check for GitHub token
  checkGitHubToken();
  
  // Use commands passed from main() (already loaded from docusaurus.config.js)
  if (!commands || commands.length === 0) {
    // Fallback: Get commands from docusaurus.config.js if not provided
    commands = getRemoteContentPlugins();
  }
  
  if (commands.length === 0) {
    console.warn("⚠️  No remote content plugins found in docusaurus.config.js");
    return;
  }
  
  // Show expected downloads summary using documents array as source of truth
  console.log("📋 Expected downloads:");
  commands.forEach((cmd, index) => {
    const fileInfo = cmd.expectedFileCount !== null 
      ? ` (${cmd.expectedFileCount} file${cmd.expectedFileCount !== 1 ? 's' : ''})`
      : cmd.documentsDescription 
        ? ` (${cmd.documentsDescription})`
        : '';
    console.log(`   ${index + 1}. ${cmd.displayName}${fileInfo}`);
  });
  console.log("");
  
  try {
    // #region agent log
    debugLog("port-content.js:downloadRemoteContent", "Before download loop", { commandCount: commands.length }, "B");
    // #endregion agent log
    
      const downloadResults = [];
      
      for (const { name, displayName, cmd, args, outDir: expectedPath, expectedFileCount } of commands) {
        // #region agent log
        debugLog("port-content.js:downloadRemoteContent", "Starting download", { name, cmd, args: args.join(" "), expectedPath }, "A");
        // #endregion agent log
        
        console.log(`📦 Downloading ${displayName}...`);
        const startTime = Date.now();
        
        // #region agent log
        debugLog("port-content.js:downloadRemoteContent", "Starting download", { name, cmd, args: args.join(" ") }, "B");
        // #endregion agent log
        
        await runCommandWithTimeout(cmd, args, {
          cwd: path.join(__dirname, ".."),
          env: { ...process.env }, // Preserve environment including GITHUB_TOKEN
        }, 300000, true); // 5 minute timeout per command, filter output
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Count files after download to verify success - use outDir from plugin config
        let fileCount = null;
        const outDir = expectedPath ? path.resolve(path.join(__dirname, ".."), expectedPath) : null;
        
        // #region agent log
        debugLog("port-content.js:downloadRemoteContent", "After command execution", { outDir, outDirExists: outDir ? fs.existsSync(outDir) : null, elapsed }, "A");
        // #endregion agent log
        
        if (outDir && fs.existsSync(outDir)) {
          // For image directories, count image files; for docs directories, count markdown files
          if (outDir.includes("static/img")) {
            const files = getAllImageFiles(outDir);
            fileCount = files.length;
          } else {
            // Check if this plugin downloads only top-level files (e.g., index.md)
            // This is determined by checking if documents array contains only root-level files
            const entries = fs.readdirSync(outDir, { withFileTypes: true });
            const topLevelFiles = entries.filter(entry => 
              entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
            );
            const hasSubdirs = entries.some(entry => entry.isDirectory());
            
            // If only top-level files and no subdirectories, or if documents array suggests root-level only
            if (topLevelFiles.length > 0 && !hasSubdirs && expectedFileCount === 1) {
              // Count only top-level markdown files in this directory (not recursive)
              fileCount = topLevelFiles.length;
            } else {
              // For plugins that download to subdirectories, count recursively
              const files = getAllMarkdownFiles(outDir);
              fileCount = files.length;
            }
          }
          
          // Handle index.md files that might conflict with README.md or other index files
          // If a plugin downloads index.md and there's already a conflicting index file,
          // rename the downloaded one to avoid conflicts
          const indexPath = path.join(outDir, "index.md");
          if (fs.existsSync(indexPath) && expectedFileCount === 1) {
            // Generate a unique name based on the plugin name
            // If name already ends with "-index", use it as-is; otherwise append "-index"
            let pluginIndexName;
            if (name.toLowerCase().endsWith('-index')) {
              pluginIndexName = `${name.replace(/-/g, '_')}.md`;
            } else {
              pluginIndexName = `${name.replace(/-/g, '_')}-index.md`;
            }
            const pluginIndexPath = path.join(outDir, pluginIndexName);
            
            if (fs.existsSync(pluginIndexPath)) {
              // Both exist - delete index.md (keep the plugin-specific one)
              fs.unlinkSync(indexPath);
            } else {
              // Rename index.md to plugin-specific name
              fs.renameSync(indexPath, pluginIndexPath);
            }
          }
          
          // Use expected file count from config if available, otherwise use actual count
          const reportedCount = expectedFileCount !== null ? expectedFileCount : fileCount;
          console.log(`   ✅ Successfully downloaded ${reportedCount} file(s) in ${elapsed}s`);
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
    console.log(`\n✅ Successfully downloaded ${totalFiles} total file(s)`);
    
    // Note: ported-files.log creation moved to main() to ensure correct order
    // This ensures the log exists before remark plugins run during npm start
    
    logToFileLegacy("transformation-summary.log", `Downloaded remote content: ${downloadResults.map(r => `${r.name} (${r.fileCount || 0} files)`).join(", ")}`);
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
      logToFileLegacy("build-errors.log", `ERROR: GitHub API rate limit exceeded. Set API_TOKEN or GITHUB_TOKEN for higher limits.\n${errorMessage}`);
    } else {
      console.error("\n❌ Error downloading remote content:", errorMessage);
      logToFileLegacy("build-errors.log", `ERROR: Failed to download remote content: ${errorMessage}\n${error.stack || ''}`);
    }
    throw error;
  }
}

/**
 * Recursively get all image files from a directory
 */
function getAllImageFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    // #region agent log
    debugLog("port-content.js:getAllImageFiles", "Directory does not exist", { dir }, "A");
    // #endregion agent log
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllImageFiles(fullPath)); // Recursively process subdirectories
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
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
 * Fix MDX import/export syntax issues
 */
function fixMDXSyntax(content) {
  let modified = false;
  const originalContent = content;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:fixMDXSyntax',message:'Function entry',data:{contentLength:content.length,importCount:(content.match(/^import\s+/gm)||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion agent log
  
  // Keep commented component imports (they're now commented out, not removed)
  // This allows maintainers to see what was there
  
  // #region agent log
  const afterCommentRemoval = content;
  fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:fixMDXSyntax',message:'After comment removal',data:{contentLength:content.length,blankLineCount:(content.match(/\n\n+/g)||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion agent log
  
  // Ensure there's a blank line after import statements (or commented imports) before markdown content
  // This fixes "Could not parse import/exports with acorn" errors
  // Match: import statement (or commented import) followed by newline, then immediately a markdown heading, JSX tag, or letter (not digits)
  // IMPORTANT: Exclude cases where the next character is part of another import statement (e.g., "import TabItem")
  // Handle HTML comments (<!-- -->) for .md, MDX comments ({/* */}) for .mdx
  // Pattern matches: "import ...", "<!-- import ... -->", or "{/* import ... */}"
  let matchCount1 = 0;
  content = content.replace(/(^(?:import|<!--\s*import|\{\/\*\s*import)[^\n]*(?:-->\s*|\*\/\})?\s*\n)([#<]|[a-zA-Z_])/gm, (match, imports, nextChar, offset) => {
    matchCount1++;
    // Check if there's already a blank line after the import
    const afterImport = content.substring(offset + imports.length);
    const hasBlankLine = afterImport.startsWith('\n');
    
    // Skip if the next character is part of another import statement
    // Check if the line starting with nextChar is an import statement
    const lineAfterImport = afterImport.split('\n')[0];
    if (lineAfterImport.trim().startsWith('import') || lineAfterImport.trim().startsWith('<!-- import') || lineAfterImport.trim().startsWith('{/* import')) {
      // This is another import, don't modify
      return match;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:fixMDXSyntax',message:'Regex1 match',data:{matchCount:matchCount1,imports,nextChar,offset,hasBlankLine,afterImportPreview:afterImport.substring(0,20),lineAfterImport},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion agent log
    if (afterImport && !hasBlankLine) {
      modified = true;
      return imports + '\n' + nextChar;
    }
    return match;
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:fixMDXSyntax',message:'After regex1',data:{matchCount1,contentLength:content.length,blankLineCount:(content.match(/\n\n+/g)||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion agent log
  
  // Also handle case where import is followed directly by markdown heading
  let matchCount2 = 0;
  content = content.replace(/(^(?:import|<!--\s*import|\{\/\*\s*import)[^\n]*(?:-->\s*|\*\/\})?\s*\n)(#\s+)/gm, (match, imports, heading, offset) => {
    matchCount2++;
    const afterImport = content.substring(offset + imports.length);
    const hasBlankLine = afterImport.startsWith('\n');
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:fixMDXSyntax',message:'Regex2 match',data:{matchCount:matchCount2,imports,heading,offset,hasBlankLine,afterImportPreview:afterImport.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    if (!hasBlankLine) {
      modified = true;
      return imports + '\n' + heading;
    }
    return match;
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:fixMDXSyntax',message:'Function exit',data:{matchCount1,matchCount2,modified,contentLength:content.length,originalLength:originalContent.length,blankLineCount:(content.match(/\n\n+/g)||[]).length,blankLineCountOriginal:(originalContent.match(/\n\n+/g)||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion agent log
  
  // Normalize multiple consecutive blank lines between imports to single blank line
  // This fixes issues where component import removal leaves extra blank lines
  content = content.replace(/(^import\s+[^;\n]+;?\s*\n)\n{2,}(^import\s+[^;\n]+;?\s*\n)/gm, (match, import1, blankLines, import2) => {
    modified = true;
    return import1 + '\n' + import2;
  });
  
  // Normalize multiple consecutive blank lines after the last import (before content)
  // Match: import statement, then 2+ blank lines, then non-import content
  content = content.replace(/(^import\s+[^;\n]+;?\s*\n)\n{2,}(?=^[^i]|^<|^#)/gm, (match, imports) => {
    modified = true;
    return imports + '\n';
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
  
  // Determine if this is an MDX file (needs MDX comment syntax) or MD file (needs HTML comment syntax)
  const isMdxFile = filePath.endsWith('.mdx');
  const commentStart = isMdxFile ? '{/* ' : '<!-- ';
  const commentEnd = isMdxFile ? ' */}' : ' -->';
  const commentSuffix = isMdxFile ? '' : ' Component not available in this repository';
  
  // Match @site/src/components imports and track component names
  const componentImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/components\/([^"']+)["'];?$/gm;
  
  content = content.replace(componentImportRegex, (match, componentName, componentPath) => {
    modified = true;
    removedComponents.add(componentName);
    componentFixes.push({ type: 'component', name: componentName, path: componentPath, import: match });
    // Comment out the import so maintainers can see what was there
    // Use MDX comment syntax for .mdx files, HTML comment syntax for .md files
    // Add a blank line after the commented import to prevent breaking subsequent imports
    return `${commentStart}${match}${commentSuffix}${commentEnd}\n`;
  });
  
  // Match @site/src/plugins imports
  const pluginImportRegex = /^import\s+{([^}]+)}\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  const pluginCommentSuffix = isMdxFile ? '' : ' Plugin not available in this repository';
  
  content = content.replace(pluginImportRegex, (match, imports, pluginPath) => {
    modified = true;
    const constants = imports.split(',').map(i => i.trim());
    constants.forEach(constName => {
      removedConstants.add(constName);
      componentFixes.push({ type: 'plugin', name: constName, path: pluginPath, import: match });
    });
    // Comment out the import so maintainers can see what was there
    // Add a blank line after the commented import to prevent breaking subsequent imports
    return `${commentStart}${match}${pluginCommentSuffix}${commentEnd}\n`;
  });
  
  // Also match default imports from plugins
  const pluginDefaultImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  
  content = content.replace(pluginDefaultImportRegex, (match, importName, pluginPath) => {
    modified = true;
    removedConstants.add(importName);
    componentFixes.push({ type: 'plugin', name: importName, path: pluginPath, import: match });
    // Comment out the import so maintainers can see what was there
    // Add a blank line after the commented import to prevent breaking subsequent imports
    return `${commentStart}${match}${pluginCommentSuffix}${commentEnd}\n`;
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
 * Add warning to frontmatter for ported markdown files (not MDX)
 */
function addPortedWarning(content, filePath) {
  // Only add warning to .md files, not .mdx files
  if (!filePath.endsWith('.md')) {
    return { content, modified: false };
  }
  
  // Check if warning already exists
  if (content.includes('warning:') && content.includes('this page has been ported')) {
    return { content, modified: false };
  }
  
  // Check if file has frontmatter
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---(\s*\n)/;
  const frontmatterMatch = content.match(frontmatterRegex);
  
  if (frontmatterMatch) {
    // Add warning to existing frontmatter
    const frontmatter = frontmatterMatch[1];
    const warning = 'warning: this page has been ported from another repository, any edits may be overwritten by running the port script';
    
    // Check if warning already exists in frontmatter
    if (frontmatter.includes('warning:')) {
      return { content, modified: false };
    }
    
    // Add warning to end of frontmatter
    const newFrontmatter = frontmatter + '\n' + warning;
    const afterFrontmatter = frontmatterMatch[2]; // The newline(s) after ---
    
    // Ensure there's a blank line after the closing --- before content
    // If there's already content immediately after ---, add a blank line
    const restOfContent = content.substring(frontmatterMatch[0].length);
    const needsBlankLine = restOfContent.length > 0 && !restOfContent.startsWith('\n\n') && !restOfContent.startsWith('\n<!--') && !restOfContent.startsWith('\nimport') && !restOfContent.startsWith('\n{/*');
    
    // Replace frontmatter with new one, ensuring blank line after ---
    if (needsBlankLine) {
      const newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---\n\n`);
      return { content: newContent, modified: true };
    } else {
      // Already has blank line or starts with comment/import
      const newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---${afterFrontmatter}`);
      return { content: newContent, modified: true };
    }
  } else {
    // Add frontmatter with warning at the beginning
    const warning = '---\nwarning: this page has been ported from another repository, any edits may be overwritten by running the port script\n---\n\n';
    return { content: warning + content, modified: true };
  }
}

/**
 * Fix image paths in content
 */
function fixImagePaths(content, filePath) {
  let modified = false;
  const imageFixes = [];
  
  // Match require() statements for images with any number of ../ before images/ - convert to @site/static/img/ported-images/ paths
  content = content.replace(
    /require\(["'](\.\.\/)+images\/([^"']+)["']\)/g,
    (match, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop(); // Extract filename from path
      imageFixes.push({ original: match, new: `require('@site/static/img/ported-images/${filename}')`, image: filename });
      return `require('@site/static/img/ported-images/${filename}')`; // Rewrite to Docusaurus static asset path
    }
  );
  
  // Match src={require(...)} patterns - convert JSX src attributes with relative require() to @site/static/img/ported-images/ paths
  content = content.replace(
    /src=\{require\(["'](\.\.\/)+images\/([^"']+)["']\)\.default\}/g,
    (match, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop(); // Extract filename from path
      imageFixes.push({ original: match, new: `src={require('@site/static/img/ported-images/${filename}').default}`, image: filename });
      return `src={require('@site/static/img/ported-images/${filename}').default}`; // Rewrite to Docusaurus static asset path
    }
  );
  
  // Also handle markdown image syntax - convert ![alt](../images/file.png) to JSX img tag with require()
  content = content.replace(
    /!\[([^\]]*)\]\((\.\.\/)+images\/([^)]+)\)/g,
    (match, alt, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop(); // Extract filename from path
      const newPath = `<img src={require('@site/static/img/ported-images/${filename}').default} alt="${alt}" />`; // Convert to Docusaurus require() syntax
      imageFixes.push({ original: match, new: newPath, image: filename });
      return newPath;
    }
  );
  
  return { content, modified, imageFixes };
}

/**
 * Rename index.md files in ported data directories to avoid conflicts
 * This function is called during transformations to handle index.md files
 * that might conflict with README.md or other index files
 */
function renameIndexFiles(commands) {
  // Process each outDir from remote content plugins
  for (const { outDir, name } of commands) {
    if (!outDir || outDir.includes("static/img")) continue;
    
    const fullOutDir = path.resolve(path.join(__dirname, ".."), outDir);
    if (!fs.existsSync(fullOutDir)) continue;
    
    const indexPath = path.join(fullOutDir, "index.md");
    if (!fs.existsSync(indexPath)) continue;
    
    // Generate a unique name based on the plugin name
    // If name already ends with "-index", use it as-is; otherwise append "-index"
    let pluginIndexName;
    if (name.toLowerCase().endsWith('-index')) {
      pluginIndexName = `${name.replace(/-/g, '_')}.md`;
    } else {
      pluginIndexName = `${name.replace(/-/g, '_')}-index.md`;
    }
    const pluginIndexPath = path.join(fullOutDir, pluginIndexName);
  
    if (fs.existsSync(pluginIndexPath)) {
      // Both exist - delete index.md (plugin-specific one is the correct one)
      fs.unlinkSync(indexPath);
    } else {
      // Only index.md exists - rename it to plugin-specific name
      fs.renameSync(indexPath, pluginIndexPath);
    }
  }
}

/**
 * Pre-process links in ported files to convert relative paths to external URLs
 * This runs BEFORE Docusaurus validates links, preventing build warnings/errors
 * Uses regex-based replacement for known broken link patterns
 */
async function runRemarkPlugins() {
  // #region agent log
  debugLog("port-content.js:runRemarkPlugins", "Function entry", {}, "E");
  // #endregion agent log
  
  console.log("🔗 Pre-processing links in ported files...");
  
  const docsRoot = path.join(__dirname, "..", "docs");
  const portedFilesLog = path.join(LOGS_DIR, "ported-files.log");
  
  if (!fs.existsSync(portedFilesLog)) {
    // #region agent log
    debugLog("port-content.js:runRemarkPlugins", "No ported-files.log found", { portedFilesLog }, "E");
    // #endregion agent log
    console.log("⚠️  No ported-files.log found. Skipping link pre-processing.");
    return;
  }
  
  // Load ported files list
  const portedFilesContent = fs.readFileSync(portedFilesLog, "utf8");
  const portedFiles = new Set(
    portedFilesContent.split('\n')
      .map(line => line.trim())
      .filter(line => line)
  );
  
  // #region agent log
  debugLog("port-content.js:runRemarkPlugins", "Ported files loaded", { fileCount: portedFiles.size }, "E");
  // #endregion agent log
  
  if (portedFiles.size === 0) {
    console.log("⚠️  No ported files found. Skipping link pre-processing.");
    return;
  }
  
  // Load link replacement config to get sourceBasePath
  const yaml = require("js-yaml");
  const configPath = path.join(__dirname, "..", "_maintainers", "link-replacements.yaml");
  const config = yaml.load(fs.readFileSync(configPath, "utf8"));
  const sourceBasePath = config.sourceBasePath || "/services";
  
  // #region agent log
  debugLog("port-content.js:runRemarkPlugins", "Config loaded", { sourceBasePath }, "E");
  // #endregion agent log
  
  // Process each ported file
  let processedCount = 0;
  let linkConversionCount = 0;
  
  for (const relativePath of portedFiles) {
    try {
      // Convert relative path (without extension) to full file path
      // Try .mdx first, then .md
      let filePath = path.join(docsRoot, relativePath + ".mdx");
      if (!fs.existsSync(filePath)) {
        filePath = path.join(docsRoot, relativePath + ".md");
      }
      
      if (!fs.existsSync(filePath)) {
        // #region agent log
        debugLog("port-content.js:runRemarkPlugins", "File not found", { relativePath, filePath }, "E");
        // #endregion agent log
        continue;
      }
      
      // Read file content
      let content = fs.readFileSync(filePath, "utf8");
      const originalContent = content;
      
      // Convert relative paths that don't exist locally to external URLs
      // Pattern: relative paths like concepts/archive-data.md, ../../concepts/websockets.md, etc.
      // These should be converted to https://docs.metamask.io/services/concepts/...
      
      // Match markdown links with relative paths that don't start with / or http
      // Pattern: [text](relative-path.md) or [text](../../relative-path.md)
      // Updated to match paths with slashes: concepts/archive-data.md
      const linkPattern = /\[([^\]]*)\]\(((?:\.\.\/)+)?([^\)]+\.md[^\)]*)\)/g;
      let modified = false;
      
      content = content.replace(linkPattern, (match, linkText, upLevels, targetPath) => {
        // Skip if it's already an external URL or absolute path
        if (targetPath.startsWith('http') || targetPath.startsWith('/') || targetPath.startsWith('#')) {
          return match;
        }
        
        // Check if the file exists locally
        const baseDir = path.dirname(filePath);
        let resolvedPath;
        
        // Remove anchor from path for file existence check
        const anchor = targetPath.includes('#') ? '#' + targetPath.split('#').slice(1).join('#') : '';
        const targetFile = targetPath.split('#')[0];
        
        if (upLevels) {
          // Resolve relative path with ../../
          const upCount = (upLevels.match(/\.\.\//g) || []).length;
          resolvedPath = path.resolve(baseDir, ...Array(upCount).fill('..'), targetFile);
        } else {
          // Resolve relative path without ../
          resolvedPath = path.resolve(baseDir, targetFile);
        }
        
        // Check if file exists (with .md or .mdx extension, or as-is)
        const exists = fs.existsSync(resolvedPath) || 
                      (resolvedPath.endsWith('.md') && fs.existsSync(resolvedPath)) ||
                      (resolvedPath.endsWith('.mdx') && fs.existsSync(resolvedPath)) ||
                      (!path.extname(resolvedPath) && (fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx')));
        
        if (!exists) {
          // File doesn't exist locally - convert to external URL
          const externalUrl = `https://docs.metamask.io${sourceBasePath}/${targetFile}${anchor}`;
          modified = true;
          linkConversionCount++;
          return `[${linkText}](${externalUrl})`;
        }
        
        return match; // Keep original if file exists locally
      });
      
      // Write back if modified
      if (modified && content !== originalContent) {
        fs.writeFileSync(filePath, content, "utf8");
        processedCount++;
        // #region agent log
        debugLog("port-content.js:runRemarkPlugins", "File processed", { relativePath, linkCount: linkConversionCount }, "E");
        // #endregion agent log
      }
    } catch (err) {
      // #region agent log
      debugLog("port-content.js:runRemarkPlugins", "Error processing file", { relativePath, error: err.message }, "E");
      // #endregion agent log
      console.warn(`   ⚠️  Error processing ${relativePath}: ${err.message}`);
    }
  }
  
  // #region agent log
  debugLog("port-content.js:runRemarkPlugins", "Processing complete", { processedCount, linkConversionCount, totalFiles: portedFiles.size }, "E");
  // #endregion agent log
  
  if (processedCount > 0) {
    console.log(`   ✅ Pre-processed ${processedCount} file(s), converted ${linkConversionCount} link(s) to external URLs`);
  } else {
    console.log("   ✅ No files needed link pre-processing");
  }
}

/**
 * Apply transformations to downloaded content
 */
function applyTransformations(commands) {
  // Reset log file initialization tracking for this run
  logFileInitialized = new Set();
  
  // #region agent log
  debugLog("port-content.js:applyTransformations", "Function entry", {}, "C");
  // #endregion agent log
  
  console.log("🔧 Applying transformations...");
  
  // Rename index.md files first to avoid conflicts
  if (commands && commands.length > 0) {
    renameIndexFiles(commands);
  }
  
  // Collect all ported data directories from commands
  const portedDataDirs = [];
  if (commands) {
    for (const { outDir } of commands) {
      if (outDir && !outDir.includes("static/img")) {
        const fullOutDir = path.resolve(path.join(__dirname, ".."), outDir);
        if (fs.existsSync(fullOutDir)) {
          portedDataDirs.push(fullOutDir);
        }
      }
    }
  }
  
  if (portedDataDirs.length === 0) {
    console.log("⚠️  No ported data directories found. Skipping transformations.");
    return;
  }
  
  // Get all markdown files from all ported data directories
  const files = [];
  for (const portedDataDir of portedDataDirs) {
    files.push(...getAllMarkdownFiles(portedDataDir));
  }
  // #region agent log
  debugLog("port-content.js:applyTransformations", "Files found", { fileCount: files.length }, "C");
  // #endregion agent log
  
  console.log(`   Processing ${files.length} file(s)...`);
  
  let totalImageFixes = 0;
  let totalComponentFixes = 0;
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
        // Log entry will be written later after we know the total count
      });
    }
    
    // Step 2: Fix MDX syntax issues (blank lines after imports, etc.)
    // #region agent log
    const beforeMDX = content;
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:applyTransformations',message:'Before fixMDXSyntax',data:{filePath:relativeFilePath,contentLength:content.length,blankLineCount:(content.match(/\n\n+/g)||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion agent log
    const { content: mdxFixed, modified: mdxModified } = fixMDXSyntax(content);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:applyTransformations',message:'After fixMDXSyntax',data:{filePath:relativeFilePath,contentLength:mdxFixed.length,blankLineCount:(mdxFixed.match(/\n\n+/g)||[]).length,modified:mdxModified},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion agent log
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
        // Log entry will be written later after we know the total count
      });
    }
    
    // Step 4: Add warning to frontmatter for ported markdown files
    const { content: warningAdded, modified: warningModified } = addPortedWarning(content, filePath);
    content = warningAdded;
    if (warningModified) {
      fileModified = true;
    }
    
    // Step 5: Normalize blank lines after component import removal
    // This fixes extra blank lines left when imports are commented out
    // Only normalize blank lines between consecutive imports/comments (keep single blank line)
    // Don't normalize blank lines elsewhere as they might be needed for MDX syntax
    // Handle HTML comments (<!-- -->) for .md, MDX comments ({/* */}) for .mdx
    content = content.replace(/(^(?:import|<!--\s*import|\{\/\*\s*import)[^\n]*(?:-->\s*|\*\/\})?\s*\n)\n{2,}(^(?:import|<!--\s*import|\{\/\*\s*import)[^\n]*(?:-->\s*|\*\/\})?\s*\n)/gm, (match, import1, blankLines, import2) => {
      fileModified = true;
      return import1 + '\n' + import2;
    });
    // Normalize excessive blank lines (5+) after the last import/comment statement only
    // This is more conservative - only fixes obvious cases where many blank lines were left
    // Handle HTML comments (<!-- -->) for .md, MDX comments ({/* */}) for .mdx
    content = content.replace(/(^(?:import|<!--\s*import|\{\/\*\s*import)[^\n]*(?:-->\s*|\*\/\})?\s*\n)\n{5,}(?=^[^i\n]|^<|^#|$)/gm, (match, imports) => {
      fileModified = true;
      return imports + '\n\n';
    });
    
    // Step 6: Remove stray digits/characters before JSX tags (artifacts from transformations)
    // Fix cases like "0<Tabs>" or "1<Tabs>" that shouldn't be there
    content = content.replace(/\n(\d+)(<[A-Z])/g, (match, digits, jsxTag) => {
      fileModified = true;
      return '\n' + jsxTag;
    });
    
    // Note: Link processing (rewriting and dropping) is handled by runRemarkPlugins() in Step 5
    
    // #region agent log
    if (originalContent.length > 100 && content.length < 100) {
      fetch('http://127.0.0.1:7244/ingest/fae801bd-1e6d-4c72-aede-bd9509a19560',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'port-content.js:applyTransformations',message:'Content significantly reduced after transformations',data:{filePath,originalLength:originalContent.length,contentLength:content.length,imageModified,componentModified,mdxModified},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    }
    // #endregion agent log
    
    if (fileModified || content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
    }
  });
  
  // #region agent log
  debugLog("port-content.js:applyTransformations", "Transformations complete", { 
    totalImageFixes, 
    totalComponentFixes, 
    fileCount: files.length 
  }, "C");
  // #endregion agent log
  
  // Initialize log files with headers and write entries
  if (totalImageFixes > 0) {
    initLogFile("image-operations.log", "Image Fixes", totalImageFixes);
    allImageFixes.forEach(({ file, original, new: replacement }) => {
      logToFile("image-operations.log", file, original, replacement);
    });
  }
  
  if (totalComponentFixes > 0) {
    initLogFile("component-import-fixes.log", "Component Fixes", totalComponentFixes);
    allComponentFixes.forEach(({ file, type, name, path: componentPath, import: importPath }) => {
      const original = importPath || `${type} ${name} from ${componentPath}`;
      const replacement = `/* ${name} - Component not available */`;
      logToFile("component-import-fixes.log", file, original, replacement);
    });
  }
  
  // Note: Link processing (rewriting and dropping) is handled by runRemarkPlugins() in Step 5
  
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
  
  logToFileLegacy("transformation-summary.log", `Applied transformations to ${files.length} file(s), fixed ${totalImageFixes} image path(s), commented out ${totalComponentFixes} component import(s). Link processing handled by runRemarkPlugins() in Step 5.`);
}

/**
 * Main function
 */
async function main() {
  // #region agent log
  debugLog("port-content.js:main", "Main function entry", { argv: process.argv }, "D");
  // #endregion agent log
  
  console.log("🚀 Starting port content process...\n");
  
  // Clear logs directory to ensure no stale data from previous runs
  try {
    if (fs.existsSync(LOGS_DIR)) {
      const files = fs.readdirSync(LOGS_DIR);
      for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️  Warning: Could not clear logs directory: ${err.message}`);
  }
  
  // Reset log file initialization tracking for this run
  logFileInitialized = new Set();
  
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
    // Step 1: Know what files/folders to import using docusaurus config
    // #region agent log
    debugLog("port-content.js:main", "Step 1: Getting import configuration from docusaurus.config.js", {}, "D");
    // #endregion agent log
    const commands = getRemoteContentPlugins();
    // #region agent log
    debugLog("port-content.js:main", "Step 1 complete: Import configuration loaded", { commandCount: commands.length, commands: commands.map(c => ({ name: c.name, outDir: c.outDir })) }, "D");
    // #endregion agent log
    
    // Step 2: Download remote content
    // #region agent log
    debugLog("port-content.js:main", "Step 2: Starting downloadRemoteContent", {}, "D");
    // #endregion agent log
    await downloadRemoteContent(commands);
    
    // Step 3: Apply transformations (MDX fixes, component imports, image paths)
    // This must run BEFORE collecting ported files to ensure renamed index files are included
    // #region agent log
    debugLog("port-content.js:main", "Step 3: Starting applyTransformations", {}, "D");
    // #endregion agent log
    applyTransformations(commands);
    // #region agent log
    debugLog("port-content.js:main", "Step 3 complete: Transformations applied", {}, "D");
    // #endregion agent log
    
    // Step 4: Create log of all ported files (for remark plugins)
    // This log is used by runRemarkPlugins() in Step 5 to know which files to process
    // Must run AFTER applyTransformations to include renamed index files
    // #region agent log
    debugLog("port-content.js:main", "Step 4: Creating ported-files.log for remark plugins", {}, "D");
    // #endregion agent log
    const portedFiles = collectPortedFiles(commands);
    writePortedFilesLog(portedFiles);
    // #region agent log
    debugLog("port-content.js:main", "Step 4 complete: ported-files.log created", { fileCount: portedFiles.length, logPath: path.join(LOGS_DIR, "ported-files.log") }, "D");
    // #endregion agent log
    console.log(`📝 Logged ${portedFiles.length} ported file(s) for remark plugins`);
    // #region agent log
    debugLog("port-content.js:main", "Step 4 complete: Transformations applied", {}, "D");
    // #endregion agent log
    
    // Step 5: Run remark plugins explicitly to convert links in source files
    // This ensures links are converted BEFORE Docusaurus validates them, preventing build warnings
    // The plugins also run during build via docusaurus.config.js, but pre-processing here
    // ensures the source files have converted links when validation happens
    // #region agent log
    debugLog("port-content.js:main", "Step 5: Running remark plugins to pre-process links", {}, "D");
    // #endregion agent log
    await runRemarkPlugins();
    // #region agent log
    debugLog("port-content.js:main", "Step 5 complete: Remark plugins finished pre-processing", {}, "D");
    // #endregion agent log
    
    // #region agent log
    debugLog("port-content.js:main", "Before server decision", { skipServer, runBuild }, "D");
    // #endregion agent log
    
    // Clear global timeout since download/transform completed successfully
    clearTimeout(globalTimeout);
    
    console.log("\n✨ Port content process completed!");
    
    if (runBuild) {
      // Run build to validate content and check for issues
      console.log("   Running build to validate content...\n");
      // #region agent log
      debugLog("port-content.js:main", "Starting build", {}, "E");
      // #endregion agent log
      await runCommandWithTimeout("npm", ["run", "build"], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env },
      }, 600000); // 10 minute timeout for build
    } else if (!skipServer) {
      // Step 6: Start dev server (default behavior)
      // Note: Dev server runs indefinitely, so we spawn it without timeout
      // User can stop it with Ctrl+C
      // Remark plugins have already run in Step 5, so npm start just serves the site
      console.log("   Starting dev server...\n");
      console.log("   (Press Ctrl+C to stop the dev server)\n");
      // #region agent log
      debugLog("port-content.js:main", "Step 6: Starting dev server (npm start - default docusaurus serve)", {}, "E");
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
    logToFileLegacy("build-errors.log", `FATAL ERROR: ${error.message}\n${error.stack}`);
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

