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

export { findGitRoot, findProjectRoot };
