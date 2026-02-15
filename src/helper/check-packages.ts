import path from "path";
import fs from "fs";
import { findProjectRoot } from "./filesystem";
import { detectPackageManager } from "./package-manager";

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

function checkPackageJson(projectRoot: string, pkg: string): void {
  const [name, version] = pkg.split("@");
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found: ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const deps: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if (deps[name!] && deps[name!]!.replace(/[^0-9.]/g, "") === version) {
    console.log(
      `Malware detected: "${pkg}" found in package.json. Remove it immediately.`,
    );
    process.exit(1);
  }
}

function checkLockFile(projectRoot: string, pkg: string): void {
  const [name, version] = pkg.split("@");
  const pm = detectPackageManager(projectRoot);
  const lockFileName = pm === "yarn" ? "yarn.lock" : "package-lock.json";
  const lockFilePath = path.join(projectRoot, lockFileName);

  if (!fs.existsSync(lockFilePath)) {
    return;
  }

  const lockFileContent = fs.readFileSync(lockFilePath, "utf8");

  if (
    lockFileContent.includes(`"${name}": "${version}"`) ||
    lockFileContent.includes(`${name}@${version}`)
  ) {
    console.log(
      `Malware detected: "${pkg}" found in ${lockFileName}. Remove it immediately.`,
    );
    process.exit(1);
  }
}

export { validatePackages, checkPackageJson, checkLockFile };
