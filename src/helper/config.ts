import { findProjectRoot } from "./filesystem";
const fs = require("fs");
const path = require("path");

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
    version: "0.0.1",
    packages: [],
  };

  fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2), "utf8");

  console.log(`Config created at: ${configFile}`);
}

export { createConfig };
