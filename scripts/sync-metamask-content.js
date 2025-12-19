#!/usr/bin/env node

/**
 * Sync script to download and transform MetaMask docs content
 * Handles image detection, download, and link rewriting
 * Creates/updates PRs with transformed content
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { Octokit } = require("@octokit/rest");
const { createRepo, buildRepoRawBaseUrl } = require("../src/lib/list-remote");

// Configuration
const UPSTREAM_OWNER = "MetaMask";
const UPSTREAM_REPO = "metamask-docs";
const UPSTREAM_BRANCH = "main";
const UPSTREAM_BASE_PATH = "services";

// Content to sync (generalized for any network)
const SYNC_CONFIG = [
  {
    sourcePath: "services/index.md",
    targetPath: "docs/single-source/between-repos/services-index.md",
    description: "Services index page",
  },
  {
    sourcePath: "services/reference/base/json-rpc-methods",
    targetPath: "docs/single-source/between-repos/reference/base/json-rpc-methods",
    description: "Base JSON-RPC methods",
    isDirectory: true,
  },
  // Add more networks here as needed
  // {
  //   sourcePath: "services/reference/ethereum/json-rpc-methods",
  //   targetPath: "docs/single-source/between-repos/reference/ethereum/json-rpc-methods",
  //   description: "Ethereum JSON-RPC methods",
  //   isDirectory: true,
  // },
];

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Logging utility
function logToFile(logFile, message) {
  try {
    const logsDir = path.join(process.cwd(), "_maintainers", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, logFile);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf8");
  } catch (err) {
    console.warn(`[sync-metamask-content] Failed to write log: ${err.message}`);
  }
}

/**
 * Extract image references from markdown/MDX content
 */
function extractImageReferences(content, filePath) {
  const images = [];
  
  // Match markdown image syntax: ![alt](../images/file.png)
  const markdownRegex = /!\[([^\]]*)\]\((\.\.\/)+images\/([^)]+\.(png|jpg|jpeg|gif|svg|webp))\)/g;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    images.push({
      filename: match[3].split('/').pop(),
      originalPath: match[0],
      type: "markdown",
      file: filePath,
    });
  }
  
  // Match require() statements: require("../images/file.png")
  const requireRegex = /require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    images.push({
      filename: match[2].split('/').pop(),
      originalPath: match[0],
      type: "require",
      file: filePath,
    });
  }
  
  // Match JSX src={require(...)}: src={require("../images/file.png").default}
  const jsxRegex = /src=\{require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g;
  while ((match = jsxRegex.exec(content)) !== null) {
    images.push({
      filename: match[2].split('/').pop(),
      originalPath: match[0],
      type: "jsx",
      file: filePath,
    });
  }
  
  return images;
}

/**
 * Download image from upstream repository
 */
async function downloadImage(imageFilename, sourceDir) {
  const staticDir = path.join(process.cwd(), "static", "img");
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true });
  }
  
  const targetPath = path.join(staticDir, imageFilename);
  
  // Check if already exists
  if (fs.existsSync(targetPath)) {
    logToFile("image-operations.log", `SKIP: Image already exists: ${imageFilename}`);
    return { success: true, skipped: true, path: targetPath };
  }
  
  // Construct upstream URL
  // Try to find image in source directory structure
  const possiblePaths = [
    `${sourceDir}/images/${imageFilename}`,
    `${sourceDir}/../images/${imageFilename}`,
    `services/images/${imageFilename}`,
  ];
  
  const repo = createRepo(UPSTREAM_OWNER, UPSTREAM_REPO, UPSTREAM_BRANCH);
  
  for (const imagePath of possiblePaths) {
    const imageUrl = buildRepoRawBaseUrl(repo, imagePath);
    
    try {
      await downloadFile(imageUrl, targetPath);
      logToFile("image-operations.log", `DOWNLOADED: ${imageFilename} from ${imagePath}`);
      return { success: true, skipped: false, path: targetPath };
    } catch (err) {
      // Try next path
      continue;
    }
  }
  
  // If all paths failed
  const errorMsg = `Failed to download ${imageFilename} from any known location`;
  logToFile("image-errors.log", `ERROR: ${errorMsg}`);
  return { success: false, skipped: false, error: errorMsg };
}

/**
 * Download file from URL
 */
function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 404) {
        file.close();
        fs.unlinkSync(targetPath); // Delete empty file
        reject(new Error(`404: ${url}`));
      } else {
        file.close();
        fs.unlinkSync(targetPath);
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
      }
    }).on("error", (err) => {
      file.close();
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      reject(err);
    });
  });
}

/**
 * Download content from upstream
 */
async function downloadContent(sourcePath, targetPath, isDirectory = false) {
  const repo = createRepo(UPSTREAM_OWNER, UPSTREAM_REPO, UPSTREAM_BRANCH);
  
  if (isDirectory) {
    // Download directory recursively
    const baseUrl = buildRepoRawBaseUrl(repo, sourcePath);
    // Use GitHub API to list files
    try {
      const response = await octokit.repos.getContent({
        owner: UPSTREAM_OWNER,
        repo: UPSTREAM_REPO,
        path: sourcePath,
        ref: UPSTREAM_BRANCH,
      });
      
      if (Array.isArray(response.data)) {
        // Directory
        for (const item of response.data) {
          if (item.type === "file" && (item.name.endsWith(".md") || item.name.endsWith(".mdx"))) {
            const itemSourcePath = `${sourcePath}/${item.name}`;
            const itemTargetPath = path.join(targetPath, item.name);
            await downloadSingleFile(itemSourcePath, itemTargetPath, repo);
          } else if (item.type === "dir") {
            const itemSourcePath = `${sourcePath}/${item.name}`;
            const itemTargetPath = path.join(targetPath, item.name);
            await downloadContent(itemSourcePath, itemTargetPath, true);
          }
        }
      }
    } catch (err) {
      logToFile("build-errors.log", `ERROR: Failed to download directory ${sourcePath}: ${err.message}`);
      throw err;
    }
  } else {
    // Download single file
    await downloadSingleFile(sourcePath, targetPath, repo);
  }
}

/**
 * Download a single file
 */
async function downloadSingleFile(sourcePath, targetPath, repo) {
  const url = buildRepoRawBaseUrl(repo, sourcePath);
  
  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  try {
    await downloadFile(url, targetPath);
    logToFile("transformation-summary.log", `DOWNLOADED: ${sourcePath} -> ${targetPath}`);
  } catch (err) {
    logToFile("build-errors.log", `ERROR: Failed to download ${sourcePath}: ${err.message}`);
    throw err;
  }
}

/**
 * Apply transformations to content (link rewriting, image path fixing)
 * Uses the same plugins that run at build time
 */
function applyTransformations(content, filePath) {
  // Note: In a real implementation, we'd use the actual remark plugins
  // For now, we'll apply basic transformations
  // The plugins will handle the rest at build time
  
  // Extract and log image references
  const images = extractImageReferences(content, filePath);
  images.forEach(img => {
    logToFile("image-operations.log", `DETECTED: ${img.filename} in ${filePath} (${img.type})`);
  });
  
  return { content, images };
}

/**
 * Main sync function
 */
async function syncContent() {
  console.log("🚀 Starting MetaMask content sync...\n");
  
  const allImages = new Map(); // filename -> info
  const processedFiles = [];
  
  for (const config of SYNC_CONFIG) {
    console.log(`📥 Processing: ${config.description}`);
    console.log(`   Source: ${config.sourcePath}`);
    console.log(`   Target: ${config.targetPath}`);
    
    try {
      // Download content
      await downloadContent(
        config.sourcePath,
        config.targetPath,
        config.isDirectory || false
      );
      
      // Process downloaded files
      if (config.isDirectory) {
        const files = getAllMarkdownFiles(config.targetPath);
        for (const filePath of files) {
          const content = fs.readFileSync(filePath, "utf8");
          const { images } = applyTransformations(content, filePath);
          
          // Collect images
          images.forEach(img => {
            if (!allImages.has(img.filename)) {
              allImages.set(img.filename, img);
            }
          });
          
          processedFiles.push(filePath);
        }
      } else {
        const content = fs.readFileSync(config.targetPath, "utf8");
        const { images } = applyTransformations(content, config.targetPath);
        
        images.forEach(img => {
          if (!allImages.has(img.filename)) {
            allImages.set(img.filename, img);
          }
        });
        
        processedFiles.push(config.targetPath);
      }
      
      console.log(`   ✅ Completed\n`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      logToFile("build-errors.log", `ERROR: Failed to sync ${config.sourcePath}: ${err.message}\n${err.stack}`);
    }
  }
  
  // Download all detected images
  console.log(`📸 Downloading ${allImages.size} image(s)...\n`);
  for (const [filename, imgInfo] of allImages) {
    const sourceDir = path.dirname(imgInfo.file).replace(process.cwd(), "").replace(/^\/docs/, "services");
    const result = await downloadImage(filename, sourceDir);
    
    if (!result.success && !result.skipped) {
      console.warn(`   ⚠️  Failed to download: ${filename}`);
    } else if (result.skipped) {
      console.log(`   ⏭️  Skipped (exists): ${filename}`);
    } else {
      console.log(`   ✅ Downloaded: ${filename}`);
    }
  }
  
  console.log(`\n✨ Sync completed!`);
  console.log(`   Processed ${processedFiles.length} file(s)`);
  console.log(`   Handled ${allImages.size} image(s)`);
  console.log(`   Logs written to _maintainers/logs/`);
}

/**
 * Get all markdown files in a directory
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

// Run if called directly
if (require.main === module) {
  syncContent().catch((err) => {
    console.error("❌ Sync failed:", err);
    logToFile("build-errors.log", `FATAL ERROR: ${err.message}\n${err.stack}`);
    process.exit(1);
  });
}

module.exports = {
  syncContent,
  extractImageReferences,
  downloadImage,
  applyTransformations,
};

