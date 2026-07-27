import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const resolve = createRequire(import.meta.url).resolve;
let packageJsonPath;

try {
  packageJsonPath = resolve("minimatch/package.json");
} catch (error) {
  if (error?.code === "MODULE_NOT_FOUND") {
    process.exit(0);
  }

  throw error;
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

if (packageJson.version !== "3.1.5") {
  throw new Error(
    `Expected minimatch 3.1.5, found ${packageJson.version}. Re-evaluate the brace-expansion compatibility patch.`,
  );
}

const minimatchPath = path.join(path.dirname(packageJsonPath), "minimatch.js");
const original = "var expand = require('brace-expansion')";
const replacement = [
  "var braceExpansion = require('brace-expansion')",
  "var expand = typeof braceExpansion === 'function'",
  "  ? braceExpansion : braceExpansion.expand",
].join("\n");
const source = fs.readFileSync(minimatchPath, "utf8");

if (source.includes(replacement)) {
  process.exit(0);
}

if (!source.includes(original)) {
  throw new Error(
    "Could not find minimatch's brace-expansion import. Re-evaluate the compatibility patch.",
  );
}

fs.writeFileSync(minimatchPath, source.replace(original, replacement));
console.log("Patched minimatch 3.1.5 for brace-expansion 5 compatibility.");
