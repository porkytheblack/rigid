#!/usr/bin/env node

/**
 * Version Management Script for Tauri App
 *
 * This script manages version synchronization between package.json and tauri.conf.json.
 * It supports bumping major, minor, and patch versions, checking sync status,
 * and displaying the current version.
 *
 * Usage:
 *   node scripts/version.js <command>
 *
 * Commands:
 *   get          - Display current version from both files
 *   check        - Check if versions are in sync
 *   bump:patch   - Bump the patch version (0.0.X)
 *   bump:minor   - Bump the minor version (0.X.0)
 *   bump:major   - Bump the major version (X.0.0)
 *   sync         - Sync tauri.conf.json version to match package.json
 */

const fs = require("node:fs");
const path = require("node:path");

const APP_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(APP_ROOT, "package.json");
const TAURI_CONF_PATH = path.join(APP_ROOT, "src-tauri", "tauri.conf.json");

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

/**
 * Prints a colored message to the console
 * @param {string} message - The message to print
 * @param {string} color - The color code to use
 */
function printColored(message, color) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Prints an error message and exits the process
 * @param {string} message - The error message
 * @param {number} exitCode - The exit code (default: 1)
 */
function exitWithError(message, exitCode = 1) {
  printColored(`Error: ${message}`, colors.red);
  process.exit(exitCode);
}

/**
 * Reads and parses a JSON file
 * @param {string} filePath - The path to the JSON file
 * @returns {object} The parsed JSON content
 * @throws {Error} If the file cannot be read or parsed
 */
function readJsonFile(filePath) {
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read ${fileName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse ${fileName} as JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Writes an object to a JSON file with proper formatting
 * @param {string} filePath - The path to the JSON file
 * @param {object} data - The data to write
 * @throws {Error} If the file cannot be written
 */
function writeJsonFile(filePath, data) {
  const fileName = path.basename(filePath);

  try {
    const content = JSON.stringify(data, null, 2) + "\n";
    fs.writeFileSync(filePath, content, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write ${fileName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validates that a string is a valid semver version
 * @param {string} version - The version string to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidSemver(version) {
  if (typeof version !== "string") {
    return false;
  }
  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}

/**
 * Parses a semver version string into its components
 * @param {string} version - The version string (e.g., "1.2.3")
 * @returns {{major: number, minor: number, patch: number}} The version components
 * @throws {Error} If the version string is invalid
 */
function parseVersion(version) {
  if (!isValidSemver(version)) {
    throw new Error(
      `Invalid version format: "${version}". Expected format: X.Y.Z (e.g., 1.2.3)`
    );
  }

  const parts = version.split(".");
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10),
  };
}

/**
 * Formats version components back into a semver string
 * @param {{major: number, minor: number, patch: number}} components - The version components
 * @returns {string} The formatted version string
 */
function formatVersion(components) {
  return `${components.major}.${components.minor}.${components.patch}`;
}

/**
 * Gets the current version from package.json
 * @returns {string} The current version
 */
function getPackageVersion() {
  const packageJson = readJsonFile(PACKAGE_JSON_PATH);

  if (!packageJson.version) {
    throw new Error("No version field found in package.json");
  }

  if (!isValidSemver(packageJson.version)) {
    throw new Error(
      `Invalid version in package.json: "${packageJson.version}"`
    );
  }

  return packageJson.version;
}

/**
 * Gets the current version from tauri.conf.json
 * @returns {string} The current version
 */
function getTauriVersion() {
  const tauriConf = readJsonFile(TAURI_CONF_PATH);

  if (!tauriConf.version) {
    throw new Error("No version field found in tauri.conf.json");
  }

  if (!isValidSemver(tauriConf.version)) {
    throw new Error(
      `Invalid version in tauri.conf.json: "${tauriConf.version}"`
    );
  }

  return tauriConf.version;
}

/**
 * Updates the version in package.json
 * @param {string} newVersion - The new version to set
 */
function updatePackageVersion(newVersion) {
  const packageJson = readJsonFile(PACKAGE_JSON_PATH);
  packageJson.version = newVersion;
  writeJsonFile(PACKAGE_JSON_PATH, packageJson);
}

/**
 * Updates the version in tauri.conf.json
 * @param {string} newVersion - The new version to set
 */
function updateTauriVersion(newVersion) {
  const tauriConf = readJsonFile(TAURI_CONF_PATH);
  tauriConf.version = newVersion;
  writeJsonFile(TAURI_CONF_PATH, tauriConf);
}

/**
 * Bumps the version according to the specified type
 * @param {string} currentVersion - The current version string
 * @param {'major' | 'minor' | 'patch'} bumpType - The type of version bump
 * @returns {string} The new version string
 */
function bumpVersion(currentVersion, bumpType) {
  const components = parseVersion(currentVersion);

  switch (bumpType) {
    case "major":
      components.major += 1;
      components.minor = 0;
      components.patch = 0;
      break;
    case "minor":
      components.minor += 1;
      components.patch = 0;
      break;
    case "patch":
      components.patch += 1;
      break;
    default:
      throw new Error(
        `Invalid bump type: "${bumpType}". Expected: major, minor, or patch`
      );
  }

  return formatVersion(components);
}

/**
 * Command: Display current versions from both files
 */
function commandGet() {
  try {
    const packageVersion = getPackageVersion();
    const tauriVersion = getTauriVersion();

    console.log("");
    printColored("Current Versions:", colors.bold);
    console.log(
      `  ${colors.cyan}package.json:${colors.reset}    ${packageVersion}`
    );
    console.log(
      `  ${colors.cyan}tauri.conf.json:${colors.reset} ${tauriVersion}`
    );

    if (packageVersion === tauriVersion) {
      console.log("");
      printColored(`Version: ${packageVersion}`, colors.green);
    } else {
      console.log("");
      printColored("Warning: Versions are out of sync!", colors.yellow);
    }
    console.log("");
  } catch (error) {
    exitWithError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Command: Check if versions are in sync
 */
function commandCheck() {
  try {
    const packageVersion = getPackageVersion();
    const tauriVersion = getTauriVersion();

    console.log("");
    printColored("Version Sync Check:", colors.bold);
    console.log(
      `  ${colors.cyan}package.json:${colors.reset}    ${packageVersion}`
    );
    console.log(
      `  ${colors.cyan}tauri.conf.json:${colors.reset} ${tauriVersion}`
    );
    console.log("");

    if (packageVersion === tauriVersion) {
      printColored("Versions are in sync.", colors.green);
      console.log("");
      process.exit(0);
    } else {
      printColored("Versions are NOT in sync!", colors.red);
      console.log("");
      console.log("Run one of the following to fix:");
      console.log(
        `  ${colors.cyan}pnpm version:bump:patch${colors.reset} - Bump and sync versions`
      );
      console.log(
        `  ${colors.cyan}node scripts/version.js sync${colors.reset} - Sync tauri.conf.json to package.json`
      );
      console.log("");
      process.exit(1);
    }
  } catch (error) {
    exitWithError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Command: Bump version (major, minor, or patch)
 * @param {'major' | 'minor' | 'patch'} bumpType - The type of version bump
 */
function commandBump(bumpType) {
  try {
    const currentVersion = getPackageVersion();
    const newVersion = bumpVersion(currentVersion, bumpType);

    console.log("");
    printColored(`Bumping ${bumpType} version...`, colors.bold);
    console.log(`  ${colors.cyan}Current:${colors.reset} ${currentVersion}`);
    console.log(`  ${colors.cyan}New:${colors.reset}     ${newVersion}`);
    console.log("");

    updatePackageVersion(newVersion);
    printColored("  Updated package.json", colors.green);

    updateTauriVersion(newVersion);
    printColored("  Updated tauri.conf.json", colors.green);

    console.log("");
    printColored(`Successfully bumped version to ${newVersion}`, colors.green);
    console.log("");
  } catch (error) {
    exitWithError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Command: Sync tauri.conf.json version to match package.json
 */
function commandSync() {
  try {
    const packageVersion = getPackageVersion();
    const tauriVersion = getTauriVersion();

    console.log("");
    printColored("Syncing versions...", colors.bold);
    console.log(
      `  ${colors.cyan}package.json:${colors.reset}    ${packageVersion}`
    );
    console.log(
      `  ${colors.cyan}tauri.conf.json:${colors.reset} ${tauriVersion}`
    );
    console.log("");

    if (packageVersion === tauriVersion) {
      printColored("Versions are already in sync. No changes made.", colors.green);
      console.log("");
      return;
    }

    updateTauriVersion(packageVersion);

    printColored(
      `Synced tauri.conf.json to version ${packageVersion}`,
      colors.green
    );
    console.log("");
  } catch (error) {
    exitWithError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Prints the help message
 */
function printHelp() {
  console.log("");
  printColored("Version Management Script", colors.bold);
  console.log("");
  console.log("Usage: node scripts/version.js <command>");
  console.log("");
  printColored("Commands:", colors.cyan);
  console.log("  get          Display current version from both files");
  console.log("  check        Check if versions are in sync (exits with code 1 if not)");
  console.log("  bump:patch   Bump the patch version (0.0.X)");
  console.log("  bump:minor   Bump the minor version (0.X.0)");
  console.log("  bump:major   Bump the major version (X.0.0)");
  console.log("  sync         Sync tauri.conf.json version to match package.json");
  console.log("  help         Show this help message");
  console.log("");
  printColored("Examples:", colors.cyan);
  console.log("  node scripts/version.js get");
  console.log("  node scripts/version.js bump:patch");
  console.log("  pnpm version:bump:minor");
  console.log("");
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printHelp();
    process.exit(0);
  }

  switch (command.toLowerCase()) {
    case "get":
      commandGet();
      break;
    case "check":
      commandCheck();
      break;
    case "bump:patch":
      commandBump("patch");
      break;
    case "bump:minor":
      commandBump("minor");
      break;
    case "bump:major":
      commandBump("major");
      break;
    case "sync":
      commandSync();
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      printColored(`Unknown command: "${command}"`, colors.red);
      console.log("");
      console.log('Run "node scripts/version.js help" for usage information.');
      console.log("");
      process.exit(1);
  }
}

main();
