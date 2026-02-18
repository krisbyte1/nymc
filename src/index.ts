import { createConfig, configExists, fetchPackages } from "./helper/config";
import {
  validatePackages,
  checkPackageJson,
  checkLockFile,
  checkNodeModules,
  checkDependencyTree,
} from "./helper/check-packages";
import { findProjectRoot } from "./helper/filesystem";

/**
 * Main CLI entry point. Handles --init flag for config creation,
 * validates configured packages, and runs malware detection checks
 * against package.json, lock files, node_modules, and the dependency tree.
 */
async function cli() {
  const args = process.argv;
  const useNetwork = args.includes("--network");

  if (args.includes("--init")) {
    createConfig(true);
    console.log(
      "Please add your packages to the packages array in .nymc/config.json",
    );
    process.exit(0);
  }

  if (!configExists()) {
    console.log("Config not found. Run 'nymc --init' to create it.");
    process.exit(1);
  }

  const packages = useNetwork ? await fetchPackages() : validatePackages();
  const projectRoot = findProjectRoot();

  const results: {
    pkg: string;
    packageJson: boolean;
    lockFile: boolean;
    nodeModules: boolean;
    dependencyTree: boolean;
  }[] = [];

  for (const pkg of packages) {
    results.push({
      pkg,
      packageJson: checkPackageJson(projectRoot, pkg),
      lockFile: checkLockFile(projectRoot, pkg),
      nodeModules: checkNodeModules(projectRoot, pkg),
      dependencyTree: await checkDependencyTree(projectRoot, pkg),
    });
  }

  console.log("\n--- Scan Results ---\n");

  const malwareFound = results.some(
    (r) => r.packageJson || r.lockFile || r.nodeModules || r.dependencyTree,
  );

  for (const r of results) {
    const detected =
      r.packageJson || r.lockFile || r.nodeModules || r.dependencyTree;
    console.log(`${r.pkg}: ${detected ? "MALWARE DETECTED" : "clean"}`);
    if (detected) {
      if (r.packageJson) console.log("  - found in package.json");
      if (r.lockFile) console.log("  - found in lock file");
      if (r.nodeModules) console.log("  - found in node_modules");
      if (r.dependencyTree) console.log("  - found in dependency tree");
    }
  }

  console.log(
    `\nScanned ${results.length} package(s): ${malwareFound ? "malware found" : "all clean"}`,
  );

  if (malwareFound) {
    process.exit(1);
  }
}

cli();
