import path from "path";
import fs from "fs";
import { findProjectRoot } from "./filesystem";

export type PackageManager = "npm" | "yarn-classic" | "yarn-modern";

/**
 * Detect whether the project uses npm or yarn as its package manager.
 * Checks for lock files in the project root directory.
 * @param startDir - Optional starting directory for project root detection
 * @returns The detected package manager, defaults to "npm" if none is detected
 */
function detectPackageManager(startDir?: string): PackageManager {
  const projectRoot = findProjectRoot(startDir);

  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) {
    return fs.existsSync(path.join(projectRoot, ".yarnrc.yml"))
      ? "yarn-modern"
      : "yarn-classic";
  }

  return "npm";
}

export { detectPackageManager };
