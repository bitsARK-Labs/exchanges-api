# Contributing to BitsARK Exchanges API

Thank you for helping keep this dataset accurate and up to date. This guide explains how to
contribute data changes, add new exchanges, or report outdated information.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Updating Existing Data](#updating-existing-data)
- [Adding a New Exchange](#adding-a-new-exchange)
- [Reporting Outdated Data](#reporting-outdated-data)
- [Data Quality Rules](#data-quality-rules)
- [What Is NOT Accepted](#what-is-not-accepted)
- [Running Validation Locally](#running-validation-locally)

---

## Code of Conduct

This is a public data project. Be respectful, factual, and cite your sources.
PRs without verifiable sources will be closed without review.

---

## Updating Existing Data

1. **Fork** this repository and create a new branch from `main`.
2. Open `data/exchanges.json` and locate the exchange you want to update.
3. Make your change. Common updates:
   - `fees.maker` / `fees.taker` — use decimal notation (see [Data Quality Rules](#data-quality-rules))
   - `operational_details_br.accepts_pix` — boolean
   - `operational_details_br.bcb_authorized` — boolean
   - `operational_details_br.cnpj` — must match format `00.000.000/0000-00`
4. Update `updated_at` to the current UTC datetime in ISO 8601 format:
   `"updated_at": "2026-04-15T00:00:00Z"`
5. Run validation: `npm run validate`
6. Open a Pull Request using the provided template. **Include the source URL.**

---

## Adding a New Exchange

1. Fork and create a branch.
2. Add a new object to the **end** of the array in `data/exchanges.json`.
3. Fill in **all required fields** — see [`schema/exchange.schema.json`](../schema/exchange.schema.json)
   for the complete field list and types.
4. Required fields at a glance:

   | Field | Notes |
   | --- | --- |
   | `id` | Unique, lowercase, hyphen-separated slug. Must not duplicate an existing `id`. |
   | `name` | Official name as shown on the exchange's website. |
   | `slug` | Should match `id`. |
   | `website` | Full URI including `https://`. |
   | `logo_url` | Full URI. Use `https://assets.bitsark.com/logos/<id>.svg` as a placeholder if you don't have a hosted URL. |
   | `operational_details_br.cnpj` | Required if the exchange has a Brazilian CNPJ. Format: `00.000.000/0000-00`. Otherwise `null`. Verify on [Receita Federal](https://www.gov.br/receitafederal/pt-br). |
   | `operational_details_br.bcb_authorized` | `true` only if the BCB authorization is confirmed. |
   | `operational_details_br.accepts_pix` | `true` if the exchange supports Pix deposits/withdrawals in Brazil. |
   | `operational_details_br.main_jurisdiction_iso` | ISO 3166-1 alpha-2 code of the exchange's primary legal jurisdiction (e.g. `BR`, `KY`, `SC`). |
   | `fiscal_details_br.tax_regime` | One of: `domestic_exchange`, `domestic_exchange_foreign_origin`, `offshore_law_14754`. |
   | `fiscal_details_br.monthly_brl_trade_exemption` | Monthly BRL volume below which the exchange is exempt from IN 1888 reporting. Use `0` for offshore. |
   | `fiscal_details_br.exchange_rfb_reports` | Array of report codes filed by the exchange with Receita Federal. Use `[]` if none. |
   | `fiscal_details_br.user_rfb_action_monthly` | Array of monthly actions the user must take with Receita Federal. Use `[]` if none. |
   | `fees.maker` / `fees.taker` | Decimal (e.g., `0.001` for 0.1%). Must be the **standard beginner tier** — see [Data Quality Rules](#data-quality-rules). |
   | `fees.fee_url` | Direct link to the official fee schedule. |
   | `updated_at` | Set to today's date in ISO 8601. |

5. Run `npm run validate` — it must exit 0.
6. Open a Pull Request with the template filled out completely.

---

## Reporting Outdated Data

If you notice that data is incorrect but don't want to submit a PR yourself,
[open a GitHub Issue](https://github.com/bitsARK-Labs/exchanges-api/issues/new) and include:

- Exchange name and `id`
- The field(s) that are incorrect
- The correct value
- A source URL (official exchange page, BCB registry, etc.)

---

## Data Quality Rules

These rules are enforced during code review. Violating them will result in your PR being
returned for corrections.

### Fees

> ⚠️ **Always use the standard beginner tier fee.**

**Primary Source Rule:**
Data MUST come directly from the exchange's official domain. Screenshots or links to blogs, news articles, or third-party comparison sites are NOT valid sources and will result in PR rejection.

> Every exchange publishes fee tiers based on 30-day trading volume or other criteria.
> We **always** record the fee for the **lowest tier** — i.e., the rate that applies to a
> brand-new account with no trading history and no special benefits.
>
> **Never submit:**
> - VIP, Pro, or high-volume tier fees
> - Fees that require holding a platform token (e.g., BNB, OKB, BGB) to achieve
> - Fees from referral programs, institutional accounts, or invite-based promotions
> - Any rate that is not immediately available to anyone who opens a standard account
>
> If the exchange's fee page shows a table of tiers, always pick the **first row** (the
> entry-level tier with no volume or balance requirements).

- `maker` and `taker` **must be decimals**, not percentages.
  - ✅ Correct: `"maker": 0.001` (means 0.1%)
  - ❌ Wrong: `"maker": 0.1` or `"maker": "0.1%"`
- `fee_url` must be a **direct link** to the exchange's official fee schedule page.
  It must be accessible without login.

### CNPJ

- Format must be exactly `00.000.000/0000-00` (dots, slash, and hyphen required).
- Must be verified against the [Receita Federal CNPJ query tool](https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp).
- `operational_details_br.cnpj` must be `null` if the exchange has no Brazilian legal entity.

### `updated_at`

- Must be a full ISO 8601 datetime string: `YYYY-MM-DDTHH:mm:ssZ`.
- Must reflect the date on which **you personally verified** the data — not the date you
  submitted the PR or copied data from another source.

### Boolean fields

- `operational_details_br.bcb_authorized`, `operational_details_br.accepts_pix`
  must all be `true` or `false` (JSON booleans, not strings).

---

## What Is NOT Accepted

The following types of contributions will be **rejected without review**:

- **Unverified data.** If you did not personally check the exchange's official page, do not
  submit a PR. Do not copy data from aggregator sites (CoinGecko, CoinMarketCap, etc.)
  without independent verification.
- **Non-beginner tier fees.** Fees from VIP levels, high-volume tiers, token-discount
  programs, or any rate not available to a standard new account will be rejected.
  Always use the standard beginner tier (see [Data Quality Rules → Fees](#fees)).
- **PRs that only update `updated_at`** without a corresponding data change and source.
  Refreshing the date without verifying the data is misleading.
- **Inaccessible exchanges.** Do not add exchanges that are geo-blocked, offline, or in
  shutdown/wind-down status.
- **Exchanges without a verifiable fee schedule URL.** The `fee_url` must be a publicly
  accessible page on the exchange's official domain.
- **Promotional or sponsored entries.** This is a neutral, open data repository.
  We do not accept paid placements or affiliated links.
- **Changes to `monitored_by_dolarmap` or `fiscal_details_br`.** These fields are managed
  by the BitsARK team only and will not be accepted via community PRs.

---

## Running Validation Locally

```bash
# Install dependencies
npm install

# Run schema validation
npm run validate

# Run fee staleness check
node scripts/check-fees.js
```

The `validate` script will:
- Parse `data/exchanges.json`
- Validate every entry against `schema/exchange.schema.json`
- Check for duplicate `id` fields
- Exit `0` on success, `1` on failure

Your PR must pass the `validate-schema` GitHub Actions workflow to be merged.