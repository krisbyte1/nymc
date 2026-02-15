import { createConfig } from "./helper/config";
import { checkPackages } from "./helper/check-packages";

function cli() {
  const args = process.argv;
  if (args.length > 2) {
    const thirdParam = args[2];
    if (thirdParam === "--init") {
      createConfig(true);
    }
  }

  createConfig();

  const result = checkPackages();
  if (!result.valid) {
    console.log(`potential malware found: ${result.missing.join(", ")}`);
  } else {
    console.log(`no malware found`);
  }
}

cli();
