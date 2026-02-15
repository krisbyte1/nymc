import { createConfig, configExists } from "./helper/config";
import { validatePackages } from "./helper/check-packages";

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

  validatePackages();
}

cli();
