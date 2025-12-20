/**
 * Shared utility functions for remark plugins
 * Provides common functionality to avoid duplication across plugins
 */
const fs = require("fs");
const path = require("path");

/**
 * Get the logs directory path
 * @returns {string} Absolute path to _maintainers/logs/
 */
function getLogsDir() {
  return path.join(process.cwd(), "_maintainers", "logs");
}

/**
 * Ensure the logs directory exists
 * Creates the directory if it doesn't exist
 * @returns {string} Absolute path to the logs directory
 */
function ensureLogsDir() {
  const logsDir = getLogsDir();
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

/**
 * Normalize file path for cross-platform compatibility
 * Converts Windows backslashes to forward slashes
 * @param {string} filePath - File path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(filePath) {
  if (!filePath) return "";
  return filePath.replace(/\\/g, '/');
}

/**
 * Extract file path from Docusaurus file object
 * Handles various path formats that Docusaurus may provide
 * @param {object} file - Docusaurus file object
 * @returns {string} File path or empty string
 */
function getFilePath(file) {
  return file?.path || file?.history?.[0] || file?.data?.filePath || "";
}

module.exports = {
  getLogsDir,
  ensureLogsDir,
  normalizePath,
  getFilePath,
};

