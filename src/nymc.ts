import { createConfig, configExists } from "./helper/config";
import {
  validatePackages,
  checkPackageJson,
  checkLockFile,
} from "./helper/check-packages";
import { findProjectRoot } from "./helper/filesystem";

function cli() {
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

  for (const pkg of packages) {
    checkPackageJson(projectRoot, pkg);
    checkLockFile(projectRoot, pkg);
  }
}

cli();
