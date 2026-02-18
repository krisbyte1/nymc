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
    url: "",
    httpsHeader: "",
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

interface NymcConfig {
  version: string;
  url: string;
  httpsHeader: string;
  packages: string[];
}

function readConfig(): NymcConfig {
  const projectRoot = findProjectRoot();
  const configFile = path.join(projectRoot, ".nymc", "config.json");
  return JSON.parse(fs.readFileSync(configFile, "utf8")) as NymcConfig;
}

async function fetchPackages(): Promise<string[]> {
  const config = readConfig();

  if (!config.url) {
    console.log("No url configured in .nymc/config.json. Set it and retry.");
    process.exit(1);
  }

  const headers: Record<string, string> = {};
  if (config.httpsHeader) {
    const separatorIndex = config.httpsHeader.indexOf(":");
    if (separatorIndex === -1) {
      console.log(
        'Invalid httpsHeader format in config. Expected "Header-Name: value".',
      );
      process.exit(1);
    }
    const key = config.httpsHeader.substring(0, separatorIndex).trim();
    const value = config.httpsHeader.substring(separatorIndex + 1).trim();
    headers[key] = value;
  }

  const response = await fetch(config.url, { headers });

  if (!response.ok) {
    console.log(
      `Failed to fetch packages from ${config.url}: ${response.status} ${response.statusText}`,
    );
    process.exit(1);
  }

  const data = (await response.json()) as string[];
  return data;
}

export { createConfig, configExists, readConfig, fetchPackages };
