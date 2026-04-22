#!/usr/bin/env node
/**
 * scripts/check-fees.js
 *
 * Verifica quais corretoras estão com dados de taxas desatualizados.
 * Considera stale qualquer registro com updated_at > 30 dias atrás.
 *
 * Uso: node scripts/check-fees.js
 *
 * Saída:
 *   - Console com lista de corretoras que precisam revisão
 *   - .fee-check-summary.txt com o relatório formatado (usado pelo GitHub Actions)
 *
 * O script nunca falha com exit(1) — staleness não é erro crítico.
 * O GitHub Actions lê o summary para decidir se abre um PR de alerta.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const ROOT         = path.resolve(__dirname, "..");
const DATA_PATH    = path.join(ROOT, "data", "exchanges.json");
const SUMMARY_PATH = path.join(ROOT, ".fee-check-summary.txt");
const STALE_DAYS   = 30;
const MS_PER_DAY   = 1000 * 60 * 60 * 24;

// ─── Carrega dados ─────────────────────────────────────────────────────────────
let exchanges;
try {
  exchanges = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
} catch (err) {
  console.error(`✗ Falha ao carregar data/exchanges.json: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(exchanges)) {
  console.error("✗ data/exchanges.json deve ser um array JSON.");
  process.exit(1);
}

// ─── Verifica staleness ────────────────────────────────────────────────────────
const now   = Date.now();
const stale = [];

for (const ex of exchanges) {
  if (!ex.updated_at) {
    stale.push({ ...ex, daysOld: Infinity, reason: "updated_at ausente" });
    continue;
  }
  const updatedAt = new Date(ex.updated_at);
  if (isNaN(updatedAt.getTime())) {
    stale.push({ ...ex, daysOld: Infinity, reason: "updated_at inválido" });
    continue;
  }
  const daysOld = (now - updatedAt.getTime()) / MS_PER_DAY;
  if (daysOld > STALE_DAYS) {
    stale.push({ ...ex, daysOld: Math.round(daysOld) });
  }
}

// ─── Console output ────────────────────────────────────────────────────────────
if (stale.length === 0) {
  console.log(`✓ Todas as ${exchanges.length} corretoras foram atualizadas nos últimos ${STALE_DAYS} dias.`);
} else {
  console.log(`⚠ ${stale.length} corretora(s) com dados desatualizados (mais de ${STALE_DAYS} dias):\n`);
  for (const ex of stale) {
    const age = ex.daysOld === Infinity ? `(${ex.reason})` : `${ex.daysOld} dias`;
    console.log(`  • ${ex.name}`);
    console.log(`    Última atualização : ${ex.updated_at ?? "N/A"} — ${age}`);
    console.log(`    Maker / Taker      : ${ex.fees?.maker ?? "?"} / ${ex.fees?.taker ?? "?"}`);
    console.log(`    Página de taxas    : ${ex.fees?.fee_url ?? "N/A"}`);
    console.log();
  }
}

// ─── Gera .fee-check-summary.txt ──────────────────────────────────────────────
const lines = [];
lines.push("## ⚠️ Revisão Mensal de Taxas — Ação Necessária");
lines.push("");
lines.push(`> Gerado em ${new Date().toISOString()} por \`scripts/check-fees.js\`.`);
lines.push("");

if (stale.length === 0) {
  lines.push(`✅ Todas as ${exchanges.length} corretoras foram verificadas nos últimos ${STALE_DAYS} dias. Nenhuma ação necessária.`);
} else {
  lines.push(`**${stale.length} corretora(s) precisam de revisão** (dados com mais de ${STALE_DAYS} dias).`);
  lines.push("");
  lines.push("Siga o passo a passo em [docs/MAINTENANCE.md](docs/MAINTENANCE.md) para atualizar via ChatGPT.");
  lines.push("");
  lines.push("| Corretora | Última Atualização | Dias | Maker | Taker | Página de Taxas |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (const ex of stale) {
    const age   = ex.daysOld === Infinity ? `∞ (${ex.reason})` : `${ex.daysOld}`;
    const maker = ex.fees?.maker !== undefined ? (ex.fees.maker * 100).toFixed(3) + "%" : "—";
    const taker = ex.fees?.taker !== undefined ? (ex.fees.taker * 100).toFixed(3) + "%" : "—";
    lines.push(`| ${ex.name} | ${ex.updated_at ?? "N/A"} | ${age} | ${maker} | ${taker} | [link](${ex.fees?.fee_url ?? "#"}) |`);
  }

  lines.push("");
  lines.push("### Checklist");
  lines.push("");
  for (const ex of stale) {
    lines.push(`- [ ] **${ex.name}** — [Abrir página de taxas](${ex.fees?.fee_url ?? "#"})`);
  }
}

lines.push("");
lines.push("---");
lines.push("_Gerado automaticamente pelo workflow mensal. Siga [docs/MAINTENANCE.md](docs/MAINTENANCE.md) para completar a revisão._");

fs.writeFileSync(SUMMARY_PATH, lines.join("\n"), "utf8");
console.log(`✓ Relatório salvo em ${SUMMARY_PATH}`);

process.exit(0);
