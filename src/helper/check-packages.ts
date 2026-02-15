import path from "path";
import fs from "fs";
import { findProjectRoot } from "./filesystem";

/**
 * Validate that all packages in .nymc/config.json have the correct
 * "package_name@version" format. Exits the program if any entry is invalid.
 * @param startDir - Optional starting directory for project root detection
 */
function validatePackages(startDir?: string): void {
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
}

export { validatePackages };
