import { createConfig, configExists } from "./helper/config";
import {
  validatePackages,
  checkPackageJson,
  checkLockFile,
  checkNodeModules,
  checkDependencyTree,
} from "./helper/check-packages";
import { findProjectRoot } from "./helper/filesystem";

async function cli() {
  const args = process.argv;
  if (args.length > 2) {
    const thirdParam = args[2];
    if (thirdParam === "--init") {
      createConfig(true);
      console.log(
        "Please add your packages to the packages array in .nymc/config.json",
      );
      process.exit(0);
    }
  }

  if (!configExists()) {
    console.log("Config not found. Run 'nymc --init' to create it.");
    process.exit(1);
  }

  const packages = validatePackages();
  const projectRoot = findProjectRoot();
  let malwareFound = false;

  for (const pkg of packages) {
    if (checkPackageJson(projectRoot, pkg)) malwareFound = true;
    if (checkLockFile(projectRoot, pkg)) malwareFound = true;
    if (checkNodeModules(projectRoot, pkg)) malwareFound = true;
    if (await checkDependencyTree(projectRoot, pkg)) malwareFound = true;
  }

  if (malwareFound) {
    process.exit(1);
  }
}

cli();
