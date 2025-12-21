// Source: https://github.com/1amcode/docusaurus-lib-list-remote
const { Octokit } = require("@octokit/rest");
const minimatch = require("minimatch");

const octokit = new Octokit({
  auth: process.env.API_TOKEN || process.env.GITHUB_TOKEN, // Optional: for higher rate limits
});

const OCTOKIT_TREE_FILE_TYPE = "blob";

const minimatchOpts = {
  matchBase: true,
  nonegate: true,
};

/**
 * Create GitHub repository object
 */
const createRepo = (repoOwner, repoName, primaryBranch) => {
  return {
    owner: repoOwner,
    name: repoName,
    branch: primaryBranch,
  };
};

/**
 * Build raw GitHub URL for docusaurus-plugin-remote-content
 */
const buildRepoRawBaseUrl = (repo, path = "") => {
  const basePath = path ? `/${path}` : "";
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.branch}${basePath}`;
};

/**
 * List files in repository matching include filters, excluding those matching exclude filters
 */
const listDocuments = (repo, includeFilters, excludeFilters = [], basePath = "") => {
  const req = "GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1";
  return octokit
    .request(req, {
      owner: repo.owner,
      repo: repo.name,
      tree_sha: repo.branch,
    })
    .then((repoTreeResponse) => {
      let repoFilePaths = extractFilesFromTree(repoTreeResponse.data.tree);

      // Filter to only files within the basePath
      if (basePath) {
        repoFilePaths = repoFilePaths.filter((p) => p.startsWith(basePath));
        // Remove basePath prefix to get relative paths
        repoFilePaths = repoFilePaths.map((p) => p.substring(basePath.length + 1));
      }

      console.log(`\n[list-remote] Found ${repoFilePaths.length} files in ${basePath || "root"}`);

      const resultingFilePaths = applyFilters(repoFilePaths, includeFilters, excludeFilters);
      console.log(`[list-remote] After filtering: ${resultingFilePaths.length} files`);

      return resultingFilePaths;
    });
};

const extractFilesFromTree = (treeElements) => {
  return treeElements
    .filter((treeElement) => treeElement.type === OCTOKIT_TREE_FILE_TYPE)
    .map((treeElement) => treeElement.path);
};

const applyFilters = (paths, includeFilters, excludeFilters) => {
  const pathsFilteredIncluded = applyIncludeFilters(paths, includeFilters);
  return applyExcludeFilters(pathsFilteredIncluded, excludeFilters);
};

const applyIncludeFilters = (paths, filters) => {
  const unique = (a) => Array.from(new Set(a));
  const pathsFilteredArray = filters.map((filter) => {
    return minimatch.match(paths, filter, minimatchOpts);
  });
  const pathsFilteredFlattened = [].concat(...pathsFilteredArray);
  return unique(pathsFilteredFlattened);
};

const applyExcludeFilters = (paths, excludeFilters) => {
  const excludedPathsArray = excludeFilters.map((excludeFilter) => {
    return minimatch.match(paths, excludeFilter, minimatchOpts);
  });
  const excludedPaths = [].concat(...excludedPathsArray);
  return paths.filter((p) => !excludedPaths.includes(p));
};

module.exports = {
  createRepo,
  buildRepoRawBaseUrl,
  listDocuments,
};

