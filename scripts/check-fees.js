#!/usr/bin/env node
/**
 * scripts/check-fees.js
 * Flags exchanges where updated_at is older than 7 days.
 * Prints name, last updated date, fee_url, and current maker/taker for each.
 * Writes a .fee-check-summary.txt for use as a GitHub Actions PR body.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "exchanges.json");
const SUMMARY_PATH = path.join(ROOT, ".fee-check-summary.txt");

const STALE_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── Load data ─────────────────────────────────────────────────────────────────
let exchanges;
try {
  exchanges = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
} catch (err) {
  console.error(`✗ Failed to load data/exchanges.json: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(exchanges)) {
  console.error("✗ data/exchanges.json must be a JSON array.");
  process.exit(1);
}

// ─── Check staleness ───────────────────────────────────────────────────────────
const now = Date.now();
const staleExchanges = [];

for (const exchange of exchanges) {
  if (!exchange.updated_at) {
    staleExchanges.push({ ...exchange, daysOld: Infinity, reason: "missing updated_at" });
    continue;
  }

  const updatedAt = new Date(exchange.updated_at);
  if (isNaN(updatedAt.getTime())) {
    staleExchanges.push({ ...exchange, daysOld: Infinity, reason: "invalid updated_at" });
    continue;
  }

  const daysOld = (now - updatedAt.getTime()) / MS_PER_DAY;
  if (daysOld > STALE_DAYS) {
    staleExchanges.push({ ...exchange, daysOld: Math.round(daysOld) });
  }
}

// ─── Console output ────────────────────────────────────────────────────────────
if (staleExchanges.length === 0) {
  console.log(
    `✓ All ${exchanges.length} exchange(s) have been updated within the last ${STALE_DAYS} days.`
  );
} else {
  console.log(
    `⚠ ${staleExchanges.length} exchange(s) have stale fee data (older than ${STALE_DAYS} days):\n`
  );
  for (const ex of staleExchanges) {
    const age =
      ex.daysOld === Infinity
        ? `(${ex.reason})`
        : `${ex.daysOld} day(s) old`;
    console.log(`  • ${ex.name}`);
    console.log(`    Last updated : ${ex.updated_at ?? "N/A"} — ${age}`);
    console.log(`    Maker / Taker: ${ex.fees?.maker ?? "?"} / ${ex.fees?.taker ?? "?"}`);
    console.log(`    Fee URL      : ${ex.fees?.fee_url ?? "N/A"}`);
    console.log();
  }
}

// ─── Write .fee-check-summary.txt ─────────────────────────────────────────────
const lines = [];
lines.push("## ⚠️ Weekly Fee Check — Manual Review Required");
lines.push("");
lines.push(
  `> Generated on ${new Date().toISOString()} by \`scripts/check-fees.js\`.`
);
lines.push("");

if (staleExchanges.length === 0) {
  lines.push(
    `✅ All ${exchanges.length} exchange(s) have been updated within the last ${STALE_DAYS} days. No action needed.`
  );
} else {
  lines.push(
    `**${staleExchanges.length} exchange(s) have fee data older than ${STALE_DAYS} days.** ` +
      `Please verify the fees at each exchange's official fee page and update \`data/exchanges.json\` accordingly.`
  );
  lines.push("");
  lines.push("| Exchange | Last Updated | Days Old | Maker | Taker | Fee URL |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (const ex of staleExchanges) {
    const age = ex.daysOld === Infinity ? `∞ (${ex.reason})` : `${ex.daysOld}`;
    const maker = ex.fees?.maker !== undefined ? (ex.fees.maker * 100).toFixed(3) + "%" : "—";
    const taker = ex.fees?.taker !== undefined ? (ex.fees.taker * 100).toFixed(3) + "%" : "—";
    const feeUrl = ex.fees?.fee_url ?? "—";
    lines.push(
      `| ${ex.name} | ${ex.updated_at ?? "N/A"} | ${age} | ${maker} | ${taker} | [link](${feeUrl}) |`
    );
  }

  lines.push("");
  lines.push("### Checklist");
  lines.push("");
  for (const ex of staleExchanges) {
    lines.push(`- [ ] Verify and update **${ex.name}** — [Fee page](${ex.fees?.fee_url ?? "#"})`);
  }
}

lines.push("");
lines.push("---");
lines.push("_This PR was created automatically by the weekly fee-check workflow._");

const summary = lines.join("\n");
fs.writeFileSync(SUMMARY_PATH, summary, "utf8");
console.log(`✓ Summary written to ${SUMMARY_PATH}`);

// Exit 0 always — GitHub Action reads .fee-check-summary.txt to decide
// whether to open a PR; stale fees are not a hard failure.
process.exit(0);
