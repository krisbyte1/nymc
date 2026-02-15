import { findProjectRoot } from "./filesystem";
import fs from "fs";
import path from "path";

/**
 * Create the .nymc/config.json configuration file in the project root.
 * @param force - If true, overwrite an existing config file
 */
function createConfig(force: boolean = false) {
  const projectRoot = findProjectRoot();
  const configDir = path.join(projectRoot, ".nymc");
  const configFile = path.join(configDir, "config.json");

  // Check if already exists
  if (!force && fs.existsSync(configFile)) {
    return;
  }

  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Create default config
  const defaultConfig = {
    version: JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ).version,
    packages: [],
  };

  fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2), "utf8");

  console.log(`Config created at: ${configFile}`);
}

/**
 * Check whether the .nymc/config.json file exists in the project root.
 * @returns True if the config file exists
 */
function configExists(): boolean {
  const projectRoot = findProjectRoot();
  const configFile = path.join(projectRoot, ".nymc", "config.json");
  return fs.existsSync(configFile);
}

export { createConfig, configExists };
