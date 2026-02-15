# nymc

A CLI tool that scans your Node.js project for known malware packages. It checks your project's `package.json`, lock files, `node_modules`, and the full dependency tree against a configurable list of known malicious packages.

## Installation

```bash
npm install -g @krisbyte/nymc
```

## Usage

### Initialize configuration

```bash
nymc --init
```

This creates a `.nymc/config.json` file in your project root. Add known malware packages to the `packages` array using the `name@version` format:

```json
{
  "version": "0.0.1",
  "packages": [
    "malicious-pkg@1.0.0",
    "@scope/bad-pkg@2.3.1"
  ]
}
```

### Run the scan

```bash
nymc
```

## How it works

For each package in the configuration, nymc runs four checks:

1. **package.json** - Checks if the package is listed in `dependencies` or `devDependencies`
2. **Lock file** - Checks `package-lock.json` (npm) or `yarn.lock` (yarn) for the package
3. **node_modules** - Checks if the package is physically installed with the matching version
4. **Dependency tree** - Runs `npm ls --all` or `yarn list --depth=Infinity` to find the package in nested dependencies

If any malware is detected, all checks still run to give a complete report before exiting with code 1.

## License

ISC
