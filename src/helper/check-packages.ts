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

function checkLockFile(projectRoot: string, pkg: string): boolean {
  const [name, version] = pkg.split("@");
  const pm = detectPackageManager(projectRoot);
  const lockFileName = pm === "yarn" ? "yarn.lock" : "package-lock.json";
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

async function checkDependencyTree(
  projectRoot: string,
  pkg: string,
): Promise<boolean> {
  const [name, version] = pkg.split("@");
  const pm = detectPackageManager(projectRoot);
  const command =
    pm === "yarn"
      ? `yarn --cwd ${projectRoot} list --pattern ${name} --depth=Infinity`
      : `npm ls ${name} --prefix ${projectRoot} --all`;

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
