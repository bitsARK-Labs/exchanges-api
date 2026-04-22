#!/usr/bin/env node
/**
 * scripts/validate.js
 * Validates every entry in data/exchanges.json against schema/exchange.schema.json.
 * Checks for duplicate `id` fields.
 * Exits with code 1 on any error; exits 0 on success.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "schema", "exchange.schema.json");
const DATA_PATH = path.join(ROOT, "data", "exchanges.json");

// ─── Load files ────────────────────────────────────────────────────────────────
function loadJSON(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`✗ Failed to parse ${label}: ${err.message}`);
    process.exit(1);
  }
}

const schema = loadJSON(SCHEMA_PATH, "schema/exchange.schema.json");
const exchanges = loadJSON(DATA_PATH, "data/exchanges.json");

if (!Array.isArray(exchanges)) {
  console.error("✗ data/exchanges.json must be a JSON array.");
  process.exit(1);
}

// ─── Set up AJV ────────────────────────────────────────────────────────────────
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// ─── Validate each entry ───────────────────────────────────────────────────────
let hasErrors = false;
const seenIds = new Map();

for (let i = 0; i < exchanges.length; i++) {
  const exchange = exchanges[i];
  const label = exchange.name || exchange.id || `index ${i}`;

  // Duplicate id check
  if (exchange.id !== undefined) {
    if (seenIds.has(exchange.id)) {
      console.error(
        `✗ [${label}] Duplicate id "${exchange.id}" — first seen at index ${seenIds.get(exchange.id)}.`
      );
      hasErrors = true;
    } else {
      seenIds.set(exchange.id, i);
    }
  }

  // Schema validation
  const valid = validate(exchange);
  if (!valid) {
    hasErrors = true;
    console.error(`\n✗ [${label}] Schema validation failed:`);
    for (const err of validate.errors) {
      const pointer = err.instancePath || "(root)";
      console.error(`   • ${pointer}: ${err.message}`);
      if (err.params) {
        const detail = JSON.stringify(err.params);
        if (detail !== "{}") {
          console.error(`     params: ${detail}`);
        }
      }
    }
  }
}

// ─── Report ────────────────────────────────────────────────────────────────────
if (hasErrors) {
  console.error(
    `\n✗ Validation FAILED — fix the errors above before merging.`
  );
  process.exit(1);
} else {
  console.log(
    `✓ All ${exchanges.length} exchange(s) passed schema validation. No duplicate ids found.`
  );
  process.exit(0);
}
