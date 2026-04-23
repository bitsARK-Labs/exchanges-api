# BitsARK Exchanges API — Documentation

> ⚠️ **Disclaimer:** Data is provided for informational purposes only and may be outdated.
> BitsARK does not guarantee accuracy. Always verify with the official exchange.
> Full terms: https://bitsark.com/terms

---

## Overview

The BitsARK Exchanges API is a free, open-data REST API providing structured information about cryptocurrency exchanges — including trading fees, Brazilian CNPJ registration status, Banco Central do Brasil (BCB) licensing, and Pix support.

- **Base URL:** `https://api.bitsark.com/v1`
- **Format:** JSON
- **Auth:** None required for public endpoints
- **Rate limit:** 60 requests per minute per IP
- **Cache:** Responses are cached at the Cloudflare edge for **1 hour**
- **Source data:** [`data/exchanges.json`](../data/exchanges.json) in this repository

---

## Endpoints

### `GET /v1`

Returns the API index — all available endpoints, supported filters, and usage examples.

**Request**

```bash
curl https://api.bitsark.com/v1
```

**Response (200)**

```json
{
  "success": true,
  "notice": "Data is provided for informational purposes only...",
  "api": "BitsARK Exchanges API",
  "version": "v1",
  "base_url": "https://api.bitsark.com/v1",
  "endpoints": [ ... ]
}
```

---

### `GET /v1/exchanges`

Returns the full list of all exchanges. Supports query string filters.

**Request**

```bash
# All exchanges
curl https://api.bitsark.com/v1/exchanges

# Only exchanges that accept Pix
curl "https://api.bitsark.com/v1/exchanges?accepts_pix=true"

# BCB-authorized exchanges
curl "https://api.bitsark.com/v1/exchanges?bcb_licensed=true"

# By tax regime
curl "https://api.bitsark.com/v1/exchanges?tax_regime=domestic_exchange"
```

**Response (200)**

```json
{
  "success": true,
  "notice": "...",
  "count": 24,
  "total": 24,
  "data": [
    {
      "id": "binance",
      "name": "Binance",
      "slug": "binance",
      "website": "https://www.binance.com",
      "logo_url": "https://assets.bitsark.com/logos/binance.svg",
      "updated_at": "2026-04-22T21:56:00Z",
      "operational_details_br": {
        "cnpj": "45.165.233/0001-82",
        "bcb_authorized": false,
        "accepts_pix": true,
        "main_jurisdiction_iso": "KY"
      },
      "fiscal_details_br": {
        "tax_regime": "offshore_law_14754",
        "monthly_brl_trade_exemption": 0,
        "exchange_rfb_reports": ["decripto_annually"],
        "user_rfb_action_monthly": ["manual_report_over_30k_traded", "manual_darf_over_15k_profit"]
      },
      "fees": {
        "maker": 0.001,
        "taker": 0.001,
        "fee_url": "https://www.binance.com/pt-BR/fee/schedule",
        "note": "25% discount when paying fees with BNB."
      }
    }
  ]
}
```

> **Note:** The `monitored_by_dolarmap` field is an internal field and is **not returned** in public endpoints.

---

### `GET /v1/exchanges/fees`

Returns a **fee projection** of all exchanges: `id`, `name`, `website`, `brazil_registered`, `fees`, `updated_at`. Supports the same query filters as `/v1/exchanges`.

**Request**

```bash
# All fees
curl https://api.bitsark.com/v1/exchanges/fees

# Fees for Brazil-registered exchanges only
curl "https://api.bitsark.com/v1/exchanges/fees?brazil_registered=true"
```

**Response (200)**

```json
{
  "success": true,
  "notice": "...",
  "count": 7,
  "total": 24,
  "data": [
    {
      "id": "foxbit",
      "name": "Foxbit",
      "website": "https://foxbit.com.br",
      "brazil_registered": true,
      "fees": {
        "maker": 0.003,
        "taker": 0.005,
        "fee_url": "https://foxbit.com.br/taxas/",
        "note": "Fees vary by trading volume. Pix deposits free; BRL withdrawals may incur a small fee."
      },
      "updated_at": "2026-04-22T21:56:00Z"
    }
  ]
}
```

---

### `GET /v1/exchanges/brazil-registered`

Returns all exchanges with a Brazilian tax regime (`domestic_exchange` or `domestic_exchange_foreign_origin`). Response projection: `id`, `name`, `website`, `cnpj`, `bcb_authorized`, `accepts_pix`, `fiscal_details_br`, `updated_at`.

**Request**

```bash
curl https://api.bitsark.com/v1/exchanges/brazil-registered
```

**Response (200)**

```json
{
  "success": true,
  "notice": "...",
  "count": 12,
  "data": [
    {
      "id": "foxbit",
      "name": "Foxbit",
      "website": "https://foxbit.com.br",
      "cnpj": "21.246.584/0002-30",
      "bcb_authorized": true,
      "accepts_pix": true,
      "fiscal_details_br": {
        "tax_regime": "domestic_exchange",
        "monthly_brl_trade_exemption": 35000,
        "exchange_rfb_reports": ["in_1888_monthly"],
        "user_rfb_action_monthly": []
      },
      "updated_at": "2026-04-22T21:56:00Z"
    }
  ]
}
```

---

### `GET /v1/exchanges/dolarmap` *(Internal)*

Returns only the exchanges monitored by the DolarMap service. This endpoint is **internal** and requires a valid `X-Internal-Token` header. Returns `401` if the token is missing or invalid.

**Request**

```bash
curl https://api.bitsark.com/v1/exchanges/dolarmap \
  -H "X-Internal-Token: YOUR_SECRET_TOKEN"
```

**Response (200)**

```json
{
  "success": true,
  "notice": "...",
  "count": 13,
  "data": [
    {
      "id": "binance",
      "name": "Binance",
      "monitored_by_dolarmap": true,
      ...
    }
  ]
}
```

**Response (401)**

```json
{
  "success": false,
  "notice": "...",
  "error": "Unauthorized. This endpoint requires a valid X-Internal-Token header."
}
```

---

### `GET /v1/exchanges/:id`

Returns a single exchange matched by `id` or `slug`. Returns **404** if not found.

**Request**

```bash
# By id
curl https://api.bitsark.com/v1/exchanges/binance

# By slug (equivalent)
curl https://api.bitsark.com/v1/exchanges/mercado-bitcoin
```

**Response (200)**

```json
{
  "success": true,
  "notice": "...",
  "data": {
    "id": "mercado-bitcoin",
    "name": "Mercado Bitcoin",
    ...
  }
}
```

**Response (404)**

```json
{
  "success": false,
  "notice": "...",
  "error": "Exchange 'unknown-exchange' not found."
}
```

---

## Exchange Object Fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique slug-style identifier (e.g. `binance`, `mercado-bitcoin`) |
| `name` | `string` | Human-readable display name |
| `slug` | `string` | URL-safe slug (matches `id`) |
| `website` | `string` (URI) | Official website URL |
| `logo_url` | `string` (URI) | Logo image URL |
| `updated_at` | `string` (ISO 8601) | Date this entry was last manually verified |
| `operational_details_br.cnpj` | `string` \| `null` | Brazilian CNPJ (`00.000.000/0000-00`) or `null` |
| `operational_details_br.bcb_authorized` | `boolean` | Holds a Banco Central do Brasil authorization |
| `operational_details_br.accepts_pix` | `boolean` | Supports Pix deposits/withdrawals |
| `operational_details_br.main_jurisdiction_iso` | `string` | ISO country code of primary legal jurisdiction |
| `fiscal_details_br.tax_regime` | `string` | Brazilian tax regime: `domestic_exchange`, `domestic_exchange_foreign_origin`, or `offshore_law_14754` |
| `fiscal_details_br.monthly_brl_trade_exemption` | `number` | Monthly BRL trade volume exempt from reporting (0 if offshore) |
| `fiscal_details_br.exchange_rfb_reports` | `string[]` | Reports the exchange files with Receita Federal |
| `fiscal_details_br.user_rfb_action_monthly` | `string[]` | Monthly actions required from the user with Receita Federal |
| `fees.maker` | `number` | Maker fee as decimal (e.g. `0.001` = 0.1%) |
| `fees.taker` | `number` | Taker fee as decimal |
| `fees.fee_url` | `string` (URI) | Official fee schedule page |
| `fees.note` | `string` | Human-readable fee notes / discounts |

> **Internal fields** (`monitored_by_dolarmap`) are stored in `data/exchanges.json` but are **never returned** by public endpoints. They are only accessible via `GET /v1/exchanges/dolarmap` with a valid `X-Internal-Token`.

---

## Query Filters

Filters can be combined. All filter values are case-insensitive for booleans.

| Parameter | Type | Applicable Endpoints | Description |
| --- | --- | --- | --- |
| `brazil_registered` | `true` / `false` | `/exchanges`, `/exchanges/fees` | Filter by Brazil registration |
| `bcb_licensed` | `true` / `false` | `/exchanges`, `/exchanges/fees` | Filter by BCB authorization status |
| `accepts_pix` | `true` / `false` | `/exchanges`, `/exchanges/fees` | Filter by Pix support |
| `tax_regime` | `string` | `/exchanges`, `/exchanges/fees` | Filter by fiscal regime (`domestic_exchange`, `domestic_exchange_foreign_origin`, `offshore_law_14754`) |

### Example: All Pix-enabled exchanges with domestic tax regime

```bash
curl "https://api.bitsark.com/v1/exchanges?accepts_pix=true&tax_regime=domestic_exchange"
```

---

## Rate Limiting

- **Limit:** 60 requests per minute per IP address
- **No API key required** for public endpoints
- When exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header
- Rate limit state is stored in Cloudflare KV (when configured)

---

## Caching

All responses are cached at the **Cloudflare edge for 1 hour**. This means:
- Data may be up to 1 hour old relative to the GitHub source file
- The source file itself is manually updated by contributors via pull requests
- Always check `updated_at` on individual entries for data freshness

---

## Error Responses

All error responses follow this structure:

```json
{
  "success": false,
  "notice": "...",
  "error": "Human-readable error message."
}
```

| Status | Meaning |
| --- | --- |
| `400` | Bad request |
| `401` | Unauthorized (missing or invalid `X-Internal-Token`) |
| `404` | Exchange not found / endpoint not found |
| `405` | Method not allowed (only GET and OPTIONS are supported) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## CORS

All responses include open CORS headers:
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Internal-Token

---

## Data Source & Contributing

All data lives in [`data/exchanges.json`](../data/exchanges.json) and is validated against
[`schema/exchange.schema.json`](../schema/exchange.schema.json) on every PR.

To update data or add a new exchange, see [CONTRIBUTING.md](./CONTRIBUTING.md).