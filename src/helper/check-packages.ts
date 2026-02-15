import path from "path";
import fs from "fs";
import { findProjectRoot } from "./filesystem";

export interface CheckPackagesResult {
  valid: boolean;
  missing: string[];
}

/**
 * Check that all packages listed in .nymc/config.json are present
 * in the project's package.json (dependencies or devDependencies).
 * @param startDir - Optional starting directory for project root detection
 * @returns Result with validity flag and list of missing packages
 */
function checkPackages(startDir?: string): CheckPackagesResult {
  const projectRoot = findProjectRoot(startDir);
  const configPath = path.join(projectRoot, ".nymc", "config.json");
  const packageJsonPath = path.join(projectRoot, "package.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found: ${packageJsonPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  const installedPackages = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const missing = (config.packages as string[]).filter(
    (pkg) => !(pkg in installedPackages),
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

export { checkPackages };
