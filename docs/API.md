# BitsARK Exchanges API — Documentation

> ⚠️ **Disclaimer:** Data is provided for informational purposes only and may be outdated.
> BitsARK does not guarantee accuracy. Always verify with the official exchange.
> Full terms: https://bitsark.com/terms

---

## Overview

The BitsARK Exchanges API is a free, open-data REST API providing structured information about cryptocurrency exchanges — including trading fees, Brazilian CNPJ registration status, Banco Central do Brasil (BCB) licensing, and Pix support.

- **Base URL:** `https://api.bitsark.com/v1`
- **Format:** JSON
- **Auth:** None required
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

# Only exchanges that accept Pix and support BRL
curl "https://api.bitsark.com/v1/exchanges?accepts_pix=true&fiat=BRL"

# BCB-licensed exchanges
curl "https://api.bitsark.com/v1/exchanges?bcb_licensed=true"

# Exchanges supporting USDT
curl "https://api.bitsark.com/v1/exchanges?stablecoin=USDT"
```

**Response (200)**

```json
{
  "success": true,
  "notice": "...",
  "count": 20,
  "total": 20,
  "data": [
    {
      "id": "binance",
      "name": "Binance",
      "slug": "binance",
      "website": "https://www.binance.com",
      "logo_url": "https://assets.bitsark.com/logos/binance.svg",
      "brazil_registered": false,
      "cnpj": null,
      "bcb_licensed": false,
      "accepts_pix": false,
      "fees": {
        "maker": 0.001,
        "taker": 0.001,
        "fee_url": "https://www.binance.com/en/fee/schedule",
        "withdrawal_usdt": 1.0,
        "note": "VIP tiers reduce fees. BNB discount available (25% off)."
      },
      "supported_fiats": ["USD", "EUR", "BRL", "GBP", "AUD"],
      "stablecoins": ["USDT", "USDC", "BUSD", "TUSD", "FDUSD"],
      "kyc_required": true,
      "monitored_by_dolarmap": true,
      "cmc_rank": 1,
      "updated_at": "2026-04-01T00:00:00Z"
    }
  ]
}
```

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
  "total": 20,
  "data": [
    {
      "id": "foxbit",
      "name": "Foxbit",
      "website": "https://foxbit.com.br",
      "brazil_registered": true,
      "fees": {
        "maker": 0.003,
        "taker": 0.005,
        "fee_url": "https://foxbit.com.br/taxas",
        "withdrawal_usdt": 2.0,
        "note": "Fees vary by trading volume. Pix deposits free."
      },
      "updated_at": "2026-04-01T00:00:00Z"
    }
  ]
}
```

---

### `GET /v1/exchanges/brazil-registered`

Returns all exchanges where `brazil_registered: true`. The response uses a reduced projection:
`id`, `name`, `website`, `cnpj`, `bcb_licensed`, `accepts_pix`, `monitored_by_dolarmap`, `updated_at`.

**Request**

```bash
curl https://api.bitsark.com/v1/exchanges/brazil-registered
```

**Response (200)**

```json
{
  "success": true,
  "notice": "...",
  "count": 7,
  "data": [
    {
      "id": "foxbit",
      "name": "Foxbit",
      "website": "https://foxbit.com.br",
      "cnpj": "18.139.993/0001-56",
      "bcb_licensed": true,
      "accepts_pix": true,
      "monitored_by_dolarmap": true,
      "updated_at": "2026-04-01T00:00:00Z"
    }
  ]
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
| `brazil_registered` | `boolean` | Registered as a legal entity in Brazil |
| `cnpj` | `string` \| `null` | Brazilian CNPJ (`00.000.000/0000-00`) or `null` |
| `bcb_licensed` | `boolean` | Holds a Banco Central do Brasil license |
| `accepts_pix` | `boolean` | Supports Pix deposits/withdrawals |
| `fees.maker` | `number` | Maker fee as decimal (e.g. `0.001` = 0.1%) |
| `fees.taker` | `number` | Taker fee as decimal |
| `fees.fee_url` | `string` (URI) | Official fee schedule page |
| `fees.withdrawal_usdt` | `number` | USDT TRC-20 withdrawal fee in USDT |
| `fees.note` | `string` | Human-readable fee notes / discounts |
| `supported_fiats` | `string[]` | ISO 4217 fiat codes supported |
| `stablecoins` | `string[]` | Stablecoin tickers supported |
| `kyc_required` | `boolean` | KYC required to trade |
| `monitored_by_dolarmap` | `boolean` | Monitored by the DolarMap service |
| `cmc_rank` | `integer` \| `null` | CoinMarketCap exchange rank |
| `updated_at` | `string` (ISO 8601) | Date this entry was last manually verified |

---

## Query Filters

Filters can be combined. All filter values are case-insensitive for booleans.

| Parameter | Type | Applicable Endpoints | Description |
| --- | --- | --- | --- |
| `brazil_registered` | `true` / `false` | `/exchanges`, `/exchanges/fees` | Filter by Brazil registration |
| `bcb_licensed` | `true` / `false` | `/exchanges`, `/exchanges/fees` | Filter by BCB license status |
| `accepts_pix` | `true` / `false` | `/exchanges`, `/exchanges/fees` | Filter by Pix support |
| `monitored_by_dolarmap` | `true` / `false` | `/exchanges`, `/exchanges/fees` | Filter by DolarMap monitoring |
| `stablecoin` | `string` (e.g. `USDT`) | `/exchanges`, `/exchanges/fees` | Filter by supported stablecoin |
| `fiat` | `string` (ISO 4217) | `/exchanges`, `/exchanges/fees` | Filter by supported fiat (e.g. `BRL`) |

### Example: All Pix-enabled, BRL-supporting exchanges

```bash
curl "https://api.bitsark.com/v1/exchanges?accepts_pix=true&fiat=BRL"
```

---

## Rate Limiting

- **Limit:** 60 requests per minute per IP address
- **No API key required**
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
| `404` | Exchange not found / endpoint not found |
| `405` | Method not allowed (only GET and OPTIONS are supported) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## CORS

All responses include open CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Data Source & Contributing

All data lives in [`data/exchanges.json`](../data/exchanges.json) and is validated against
[`schema/exchange.schema.json`](../schema/exchange.schema.json) on every PR.

To update data or add a new exchange, see [CONTRIBUTING.md](./CONTRIBUTING.md).
