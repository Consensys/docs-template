/**
 * Shared configuration loader for remark plugins
 * Loads settings from _maintainers/link-replacements.yaml
 * Ported content directories are read from docusaurus.config.js (single source of truth)
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { 
  getPortedContentDirsFromConfig, 
  getPortedContentDirsAbsolute,
  isPortedContent: isPortedContentFromConfig,
  getPortedContentDirForFile: getPortedContentDirForFileFromConfig
} = require("../src/lib/get-ported-dirs");

const DEFAULT_SETTINGS = {
  imagePath: "/img/ported-images",
  defaultComponentMessage: "Component not available in this project",
  defaultPluginMessage: "Plugin not available in this project",
  fallbackCommentedOut: "(commented out)",
  fallbackReplaced: "(replaced)",
};

let cachedConfig = null;

/**
 * Load configuration from YAML file
 * Returns settings with defaults applied
 */
function loadConfig() {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), "_maintainers", "link-replacements.yaml");
    if (!fs.existsSync(configPath)) {
      cachedConfig = { settings: DEFAULT_SETTINGS, componentReplacements: [] };
      return cachedConfig;
    }

    const configContent = fs.readFileSync(configPath, "utf8");
    const config = yaml.load(configContent);

    // Merge settings with defaults
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(config.settings || {}),
    };

    cachedConfig = {
      settings,
      componentReplacements: config.componentReplacements || [],
      replacements: config.replacements || {},
      patterns: config.patterns || [],
    };

    return cachedConfig;
  } catch (err) {
    // Fail gracefully - return defaults
    console.warn(`[config-loader] Failed to load config: ${err.message}`);
    cachedConfig = { settings: DEFAULT_SETTINGS, componentReplacements: [] };
    return cachedConfig;
  }
}

/**
 * Get settings with defaults
 */
function getSettings() {
  return loadConfig().settings;
}

/**
 * Get component replacements
 */
function getComponentReplacements() {
  return loadConfig().componentReplacements;
}

/**
 * Get ported content directories (absolute paths)
 * Reads from docusaurus.config.js (single source of truth)
 */
function getPortedContentDirs() {
  return getPortedContentDirsAbsolute();
}

/**
 * Get ported content directories (relative paths)
 * Reads from docusaurus.config.js (single source of truth)
 */
function getPortedContentDirsRelative() {
  return getPortedContentDirsFromConfig();
}

/**
 * Check if a file path is within any ported content directory
 * Reads from docusaurus.config.js (single source of truth)
 */
function isPortedContent(filePath) {
  return isPortedContentFromConfig(filePath);
}

/**
 * Get the ported content directory that contains the given file path
 * Reads from docusaurus.config.js (single source of truth)
 */
function getPortedContentDirForFile(filePath) {
  return getPortedContentDirForFileFromConfig(filePath);
}

// Backward compatibility functions
// Note: These return the first ported directory or a fallback
// The fallback should match DEFAULT_PORTED_DIR in src/lib/get-ported-dirs.js
const FALLBACK_PORTED_DIR = "docs/single-source/between-repos/Plugins/MetaMask-ported-data";

function getPortedContentDir() {
  const dirs = getPortedContentDirsAbsolute();
  return dirs[0] || path.join(process.cwd(), FALLBACK_PORTED_DIR);
}

function getPortedContentDirRelative() {
  const dirs = getPortedContentDirsFromConfig();
  return dirs[0] || FALLBACK_PORTED_DIR;
}

/**
 * Get image path
 */
function getImagePath() {
  const settings = getSettings();
  return settings.imagePath;
}

module.exports = {
  loadConfig,
  getSettings,
  getComponentReplacements,
  getPortedContentDirs,
  getPortedContentDirsRelative,
  isPortedContent,
  getPortedContentDirForFile,
  getPortedContentDir, // Backward compatibility
  getPortedContentDirRelative, // Backward compatibility
  getImagePath,
};

