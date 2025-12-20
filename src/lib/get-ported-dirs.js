/**
 * Extract ported content directories from docusaurus.config.js
 * This is the single source of truth for where ported content is stored
 * Reads from docusaurus-plugin-remote-content plugin configurations
 */
const fs = require("fs");
const path = require("path");

// Default fallback directory if config cannot be read
// This should match the primary outDir in docusaurus.config.js
const DEFAULT_PORTED_DIR = "docs/single-source/between-repos/Plugins/MetaMask-ported-data";

let cachedDirs = null;

/**
 * Get ported content directories from docusaurus.config.js
 * Returns array of relative paths (from project root)
 */
function getPortedContentDirsFromConfig() {
  if (cachedDirs !== null) {
    return cachedDirs;
  }

  try {
    const configPath = path.join(process.cwd(), "docusaurus.config.js");
    if (!fs.existsSync(configPath)) {
      // Fallback to default if config doesn't exist
      cachedDirs = [DEFAULT_PORTED_DIR];
      return cachedDirs;
    }

    // Read the config file
    const configContent = fs.readFileSync(configPath, "utf8");
    
    // Extract outDir values from docusaurus-plugin-remote-content entries
    // Match: outDir: "path" or outDir: 'path' (handles both single and double quotes)
    // Look for patterns like: outDir: "docs/..." or outDir: 'docs/...'
    const outDirPattern = /outDir:\s*["']([^"']+)["']/g;
    const dirs = new Set();
    let match;
    
    while ((match = outDirPattern.exec(configContent)) !== null) {
      const outDir = match[1];
      // Only include directories under docs/ (exclude static/img/ported-images and other static dirs)
      if (outDir.startsWith("docs/")) {
        dirs.add(outDir);
      }
    }
    
    // Convert to array and sort for consistency
    cachedDirs = Array.from(dirs).sort();
    
    // If no directories found, use default
    if (cachedDirs.length === 0) {
      cachedDirs = [DEFAULT_PORTED_DIR];
    }
    
    return cachedDirs;
  } catch (err) {
    console.warn(`[get-ported-dirs] Failed to read docusaurus.config.js: ${err.message}`);
    // Fallback to default
    cachedDirs = [DEFAULT_PORTED_DIR];
    return cachedDirs;
  }
}

/**
 * Get ported content directories as absolute paths
 */
function getPortedContentDirsAbsolute() {
  const dirs = getPortedContentDirsFromConfig();
  return dirs.map(dir => path.join(process.cwd(), dir));
}

/**
 * Check if a file path is within any ported content directory
 * @param {string} filePath - File path to check (can be absolute or relative)
 * @returns {boolean} True if file is in any ported content directory
 */
function isPortedContent(filePath) {
  if (!filePath) return false;
  
  const normalizedPath = filePath.replace(/\\/g, '/');
  const portedDirs = getPortedContentDirsFromConfig();
  
  return portedDirs.some(dir => {
    const normalizedDir = dir.replace(/\\/g, '/');
    return normalizedPath.includes(normalizedDir);
  });
}

/**
 * Get the ported content directory that contains the given file path
 * @param {string} filePath - File path to check (absolute path)
 * @returns {string|null} The absolute ported content directory path, or null if not found
 */
function getPortedContentDirForFile(filePath) {
  if (!filePath) return null;
  
  const normalizedPath = filePath.replace(/\\/g, '/');
  const portedDirs = getPortedContentDirsAbsolute();
  
  for (const dir of portedDirs) {
    const normalizedDir = dir.replace(/\\/g, '/');
    if (normalizedPath.startsWith(normalizedDir)) {
      return dir;
    }
  }
  
  return null;
}

module.exports = {
  getPortedContentDirsFromConfig,
  getPortedContentDirsAbsolute,
  isPortedContent,
  getPortedContentDirForFile,
};

