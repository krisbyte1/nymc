const path = require("path");
const fs = require("fs");

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
