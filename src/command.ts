import { createConfig } from "./helper/config";

function cli() {
  const args = process.argv;
  if (args.length > 2) {
    const thirdParam = args[2];
    if (thirdParam === "--init") {
      createConfig();
    }
  }
}

cli();
