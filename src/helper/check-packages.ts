import path from "path";
import fs from "fs";
import { findProjectRoot } from "./filesystem";
import { detectPackageManager } from "./package-manager";
import { executeCommand } from "./command";

/**
 * Validate that all packages in .nymc/config.json have the correct
 * "package_name@version" format. Exits the program if any entry is invalid.
 * @param startDir - Optional starting directory for project root detection
 */
function validatePackages(startDir?: string): string[] {
  const projectRoot = findProjectRoot(startDir);
  const configPath = path.join(projectRoot, ".nymc", "config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const formatRegex = /^.+@\d+(\.\d+){0,2}$/;
  for (const pkg of config.packages as string[]) {
    if (!formatRegex.test(pkg)) {
      console.log(
        `Invalid package format: "${pkg}". Expected format: "package_name@version"`,
      );
      process.exit(1);
    }
  }

  return config.packages as string[];
}

/**
 * Check if a known malware package is listed in the project's package.json.
 * Supports scoped packages (e.g. @scope/name).
 * @param projectRoot - Absolute path to the project root directory
 * @param pkg - Package identifier in "name@version" format
 * @returns True if the malware package was found in package.json
 */
function checkPackageJson(projectRoot: string, pkg: string): boolean {
  const lastAt = pkg.lastIndexOf("@");
  const name = pkg.substring(0, lastAt);
  const version = pkg.substring(lastAt + 1);
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found: ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const deps: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  if (
    deps[name!] &&
    deps[name!]!.replace(/[^0-9.]/g, "").startsWith(version!)
  ) {
    console.log(
      `Malware detected: "${pkg}" found in package.json. Remove it immediately.`,
    );
    return true;
  }

  return false;
}

/**
 * Check if a known malware package is present in the lock file.
 * Checks package-lock.json for npm or yarn.lock for yarn.
 * @param projectRoot - Absolute path to the project root directory
 * @param pkg - Package identifier in "name@version" format
 * @returns True if the malware package was found in the lock file
 */
function checkLockFile(projectRoot: string, pkg: string): boolean {
  const [name, version] = pkg.split("@");
  const pm = detectPackageManager(projectRoot);
  const lockFileName = pm === "yarn-classic" || pm === "yarn-modern" ? "yarn.lock" : "package-lock.json";
  const lockFilePath = path.join(projectRoot, lockFileName);

  if (!fs.existsSync(lockFilePath)) {
    return false;
  }

  const lockFileContent = fs.readFileSync(lockFilePath, "utf8");

  if (
    lockFileContent.includes(`"${name}": "${version}"`) ||
    lockFileContent.includes(`${name}@${version}`)
  ) {
    console.log(
      `Malware detected: "${pkg}" found in ${lockFileName}. Remove it immediately.`,
    );
    return true;
  }

  return false;
}

/**
 * Check if a known malware package is installed in the node_modules directory.
 * Supports scoped packages (e.g. @scope/name).
 * @param projectRoot - Absolute path to the project root directory
 * @param pkg - Package identifier in "name@version" format
 * @returns True if the malware package was found in node_modules
 */
function checkNodeModules(projectRoot: string, pkg: string): boolean {
  const lastAt = pkg.lastIndexOf("@");
  const name = pkg.substring(0, lastAt);
  const version = pkg.substring(lastAt + 1);
  const modulePkgPath = path.join(
    projectRoot,
    "node_modules",
    name!,
    "package.json",
  );

  if (!fs.existsSync(modulePkgPath)) {
    return false;
  }

  const modulePkg = JSON.parse(fs.readFileSync(modulePkgPath, "utf8"));

  if (modulePkg.version === version) {
    console.log(
      `Malware detected: "${pkg}" found in node_modules. Remove it immediately.`,
    );
    return true;
  }

  return false;
}

/**
 * Check the full dependency tree for a known malware package.
 * Uses "npm ls --all" or "yarn list --depth=Infinity" depending on the package manager.
 * @param projectRoot - Absolute path to the project root directory
 * @param pkg - Package identifier in "name@version" format
 * @returns True if the malware package was found in the dependency tree
 */
async function checkDependencyTree(
  projectRoot: string,
  pkg: string,
): Promise<boolean> {
  const [name, version] = pkg.split("@");
  const pm = detectPackageManager(projectRoot);
  let command: string;
  if (pm === "yarn-classic") {
    command = `yarn list --pattern ${name} --depth=Infinity`;
  } else if (pm === "yarn-modern") {
    command = `yarn info ${name} --all --recursive`;
  } else {
    command = `npm ls ${name} --prefix ${projectRoot} --all`;
  }

  const result = await executeCommand(command);
  const output = result.stdout + result.stderr;

  if (output.includes(`${name}@${version}`)) {
    console.log(
      `Malware detected: "${pkg}" found in dependency tree. Remove it immediately.`,
    );
    return true;
  }

  return false;
}

export {
  validatePackages,
  checkPackageJson,
  checkLockFile,
  checkNodeModules,
  checkDependencyTree,
};
