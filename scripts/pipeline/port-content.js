#!/usr/bin/env node

/**
 * Port content script - Downloads and transforms MetaMask content
 * Runs link fixes, image fixes, writes logs, then starts dev server
 * 
 * NOTE: This script must be in the project root scripts/ directory to work with npm commands
 */

// Load environment variables from .env file
require("dotenv").config();

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORTED_DATA_DIR = path.join(__dirname, "..", "docs", "single-source", "between-repos", "Plugins", "MetaMask-ported-data");
const LOGS_DIR = path.join(__dirname, "..", "_maintainers", "logs");

// Logging utility
function logToFile(logFile, message) {
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
 * Check if GITHUB_TOKEN is set and warn if not
 */
function checkGitHubToken() {
  const token = process.env.GITHUB_TOKEN || process.env.API_TOKEN;
  if (!token) {
    console.warn("⚠️  WARNING: GITHUB_TOKEN or API_TOKEN environment variable is not set.");
    console.warn("   Unauthenticated requests are limited to 60/hour and may fail.");
    console.warn("   Set GITHUB_TOKEN in .env file for higher rate limits (5000/hour):");
    console.warn("   Create .env file with: GITHUB_TOKEN=your_token_here");
    console.warn("   Or set it in your environment: export GITHUB_TOKEN=your_token_here");
    console.warn("");
  }
}

/**
 * Download remote content using docusaurus-plugin-remote-content
 */
function downloadRemoteContent() {
  console.log("📥 Downloading remote content from MetaMask docs...");
  
  // Check for GitHub token
  checkGitHubToken();
  
  try {
    // Download _partials first (required for Base JSON-RPC methods)
    execSync("npx docusaurus download-remote-metamask-partials", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
      env: { ...process.env }, // Preserve environment including GITHUB_TOKEN
    });
    
    // Download services index
    execSync("npx docusaurus download-remote-metamask-services-index", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
      env: { ...process.env },
    });
    
    // Download Base JSON-RPC methods
    execSync("npx docusaurus download-remote-metamask-base-json-rpc", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
      env: { ...process.env },
    });
    
    // Download images
    execSync("npx docusaurus download-remote-metamask-images", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
      env: { ...process.env },
    });
    
    console.log("✅ Remote content downloaded successfully!");
    logToFile("transformation-summary.log", "Downloaded remote content from MetaMask docs (partials, services index, base JSON-RPC, images)");
  } catch (error) {
    const errorMessage = error.message || String(error);
    
    // Check for rate limit errors
    if (errorMessage.includes("rate limit") || errorMessage.includes("403")) {
      console.error("❌ GitHub API rate limit exceeded!");
      console.error("");
      console.error("   Solutions:");
      console.error("   1. Set GITHUB_TOKEN environment variable:");
      console.error("      export GITHUB_TOKEN=your_github_token");
      console.error("   2. Wait for rate limit to reset (check X-RateLimit-Reset header)");
      console.error("   3. Use a GitHub Personal Access Token:");
      console.error("      https://github.com/settings/tokens");
      console.error("");
      logToFile("build-errors.log", `ERROR: GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.\n${errorMessage}`);
    } else {
      console.error("❌ Error downloading remote content:", errorMessage);
      logToFile("build-errors.log", `ERROR: Failed to download remote content: ${errorMessage}\n${error.stack || ''}`);
    }
    throw error;
  }
}

/**
 * Get all markdown files in ported data directory
 */
function getAllMarkdownFiles(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Fix image paths in content
 */
function fixImagePaths(content, filePath) {
  let modified = false;
  const imageFixes = [];
  
  // Match markdown image syntax
  content = content.replace(
    /!\[([^\]]*)\]\((\.\.\/)+images\/([^)]+\.(png|jpg|jpeg|gif|svg|webp))\)/g,
    (match, alt, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop();
      const newPath = `<img src={require('@site/static/img/${filename}').default} alt="${alt}" />`;
      imageFixes.push({ original: match, new: newPath, image: filename });
      return newPath;
    }
  );
  
  // Match require() statements
  content = content.replace(
    /require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)/g,
    (match, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop();
      const newPath = `require('@site/static/img/${filename}')`;
      imageFixes.push({ original: match, new: newPath, image: filename });
      return newPath;
    }
  );
  
  // Match src={require(...)} patterns
  content = content.replace(
    /src=\{require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
    (match, dots, imagePath) => {
      modified = true;
      const filename = imagePath.split('/').pop();
      const newPath = `src={require('@site/static/img/${filename}').default}`;
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
  console.log("🔧 Applying transformations...");
  
  if (!fs.existsSync(PORTED_DATA_DIR)) {
    console.log("⚠️  No ported data directory found. Skipping transformations.");
    return;
  }
  
  // Rename index.md to services-index.md first
  renameIndexFile();
  
  const files = getAllMarkdownFiles(PORTED_DATA_DIR);
  console.log(`   Processing ${files.length} file(s)...`);
  
  let totalImageFixes = 0;
  const allImageFixes = [];
  
  files.forEach(filePath => {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;
    const relativeFilePath = path.relative(path.join(__dirname, "..", "docs"), filePath);
    
    // Fix image paths
    const { content: imageFixed, modified: imageModified, imageFixes } = fixImagePaths(content, filePath);
    content = imageFixed;
    
    if (imageModified) {
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
      
      fs.writeFileSync(filePath, content, "utf8");
    }
  });
  
  if (totalImageFixes > 0) {
    console.log(`   ✅ Fixed ${totalImageFixes} image path(s)`);
    console.log(`      📝 Details written to _maintainers/logs/image-operations.log`);
  } else {
    console.log("   ✅ No image fixes needed");
  }
  
  logToFile("transformation-summary.log", `Applied transformations to ${files.length} file(s), fixed ${totalImageFixes} image path(s)`);
}

/**
 * Main function
 */
function main() {
  console.log("🚀 Starting port content process...\n");
  
  // Check if we should skip the dev server (for testing)
  const skipServer = process.argv.includes("--no-server") || process.argv.includes("--test");
  const runBuild = process.argv.includes("--build");
  
  try {
    // Step 1: Download remote content
    downloadRemoteContent();
    
    // Step 2: Apply transformations
    applyTransformations();
    
    console.log("\n✨ Port content process completed!");
    
    if (runBuild) {
      // Run build to check for broken links
      console.log("   Running build to check for broken links...\n");
      execSync("npm run build", {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
    } else if (!skipServer) {
      // Step 3: Start dev server (default behavior)
      console.log("   Starting dev server...\n");
      execSync("npm start", {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
    } else {
      console.log("   Skipping dev server (--no-server flag used)");
    }
  } catch (error) {
    console.error("\n❌ Port content process failed:", error.message);
    logToFile("build-errors.log", `FATAL ERROR: ${error.message}\n${error.stack}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  downloadRemoteContent,
  applyTransformations,
};

