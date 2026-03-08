import path from "path";
import fs from "fs";

/**
 * Find the project root by traversing up from the given directory
 * looking for a package.json file.
 * @param startDir - Directory to start searching from, defaults to cwd
 * @returns The project root directory path, or startDir as fallback
 */
function findProjectRoot(startDir: string = process.cwd()): string {
  let currentDir: string = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return startDir; // Fallback to current directory
}

/**
 * Find the git repository root by traversing up from the given directory
 * looking for a .git directory.
 * @param startDir - Directory to start searching from, defaults to cwd
 * @returns The git root directory path, or null if not in a git repository
 */
function findGitRoot(startDir: string = process.cwd()): string | null {
  let currentDir: string = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, ".git"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Expand a single workspace glob pattern relative to projectRoot.
 * Handles patterns like "packages/*", "apps/my-app", "pkg-*".
 * Only `*` and `?` wildcards within a single path segment are supported.
 * @param projectRoot - Absolute path to the monorepo root
 * @param pattern - Workspace glob pattern (e.g. "packages/*")
 * @returns Array of absolute directory paths that match the pattern
 */
function expandWorkspacePattern(projectRoot: string, pattern: string): string[] {
  const segments = pattern.split("/");
  let currentDirs = [projectRoot];

  for (const segment of segments) {
    const nextDirs: string[] = [];

    for (const dir of currentDirs) {
      if (segment.includes("*") || segment.includes("?")) {
        const regexStr =
          "^" +
          segment
            .replace(/\./g, "\\.")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".") +
          "$";
        const regex = new RegExp(regexStr);

        try {
          const names = fs.readdirSync(dir) as string[];
          for (const name of names) {
            if (!regex.test(name)) continue;
            const candidate = path.join(dir, name);
            try {
              if (fs.statSync(candidate).isDirectory()) {
                nextDirs.push(candidate);
              }
            } catch {
              // stat failed — skip
            }
          }
        } catch {
          // directory unreadable — skip
        }
      } else {
        const candidate = path.join(dir, segment);
        try {
          if (fs.statSync(candidate).isDirectory()) {
            nextDirs.push(candidate);
          }
        } catch {
          // path doesn't exist — skip
        }
      }
    }

    currentDirs = nextDirs;
  }

  return currentDirs;
}

/**
 * Find all workspace directories declared in the root package.json.
 * Supports both the array form (npm / yarn modern) and the object form
 * with a `packages` key (yarn classic).
 * @param projectRoot - Absolute path to the monorepo root directory
 * @returns Array of absolute paths to workspace directories, empty if not a monorepo
 */
function findMonorepoWorkspaces(projectRoot: string): string[] {
  const packageJsonPath = path.join(projectRoot, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  let packageJson: {
    workspaces?: string[] | { packages?: string[] };
  };

  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch {
    return [];
  }

  let patterns: string[] = [];

  if (Array.isArray(packageJson.workspaces)) {
    patterns = packageJson.workspaces;
  } else if (
    packageJson.workspaces?.packages &&
    Array.isArray(packageJson.workspaces.packages)
  ) {
    patterns = packageJson.workspaces.packages;
  }

  if (patterns.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const workspaceDirs: string[] = [];

  for (const pattern of patterns) {
    for (const dir of expandWorkspacePattern(projectRoot, pattern)) {
      if (!seen.has(dir) && dir !== projectRoot) {
        seen.add(dir);
        workspaceDirs.push(dir);
      }
    }
  }

  return workspaceDirs;
}

export { findGitRoot, findMonorepoWorkspaces, findProjectRoot };
