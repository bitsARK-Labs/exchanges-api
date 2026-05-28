# BitsARK Exchanges API

[![Validate Schema](https://github.com/bitsARK-Labs/exchanges-api/actions/workflows/validate-schema.yml/badge.svg)](https://github.com/bitsARK-Labs/exchanges-api/actions/workflows/validate-schema.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Open data API for cryptocurrency exchanges operating in Brazil — trading fees, CVM/BCB registration status, Pix support, and tax regime classification. Served via Cloudflare Workers at `api.bitsark.com`.

No API key required. Free to use.

---

## Quick start

```bash
# All exchanges
curl https://api.bitsark.com/v1/exchanges

# Brazil-registered exchanges that accept Pix
curl "https://api.bitsark.com/v1/exchanges?brazil_registered=true&accepts_pix=true"

# BCB-licensed exchanges
curl "https://api.bitsark.com/v1/exchanges?bcb_licensed=true"

# Single exchange by id or slug
curl https://api.bitsark.com/v1/exchanges/mercado-bitcoin

# API index — all endpoints and examples
curl https://api.bitsark.com/v1
```

Full interactive documentation: **[bitsark.com/exchanges/api](https://bitsark.com/exchanges/api/)**

OpenAPI spec: [`schema/openapi.yaml`](./schema/openapi.yaml) — import into Postman, Insomnia, or any OpenAPI-compatible tool. A pre-generated Postman collection is also available at [`schema/postman.collection.json`](./schema/postman.collection.json).

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1` | API index with all endpoints, filters, and examples |
| `GET` | `/v1/exchanges` | Full list of exchanges (filterable) |
| `GET` | `/v1/exchanges/fees` | Fee projection — id, name, fees, updated_at (filterable) |
| `GET` | `/v1/exchanges/brazil-registered` | Brazil-registered exchanges with CNPJ, BCB, and Pix info |
| `GET` | `/v1/exchanges/:id` | Single exchange by `id` or `slug` |

### Query filters

Available on `/v1/exchanges` and `/v1/exchanges/fees`:

| Parameter | Type | Example |
|-----------|------|---------|
| `brazil_registered` | `true` / `false` | `?brazil_registered=true` |
| `bcb_licensed` | `true` / `false` | `?bcb_licensed=true` |
| `accepts_pix` | `true` / `false` | `?accepts_pix=true` |
| `tax_regime` | `domestic_exchange` / `domestic_exchange_foreign_origin` / `offshore_law_14754` | `?tax_regime=domestic_exchange` |

Filters can be combined: `?accepts_pix=true&brazil_registered=true`

---

## Response envelope

Every response follows the same structure:

```json
{
  "success": true,
  "notice": "Data is provided for informational purposes only...",
  "count": 2,
  "total": 24,
  "data": [
    {
      "id": "mercado-bitcoin",
      "slug": "mercado-bitcoin",
      "name": "Mercado Bitcoin",
      "website": "https://www.mercadobitcoin.com.br",
      "fees": { "maker": 0.003, "taker": 0.003, "note": "Standard tier." },
      "analysis_url": "https://bitsark.com/exchanges/mercado-bitcoin/",
      "updated_at": "2026-05-01T00:00:00Z"
    }
  ]
}
```

For the full field reference see [`docs/API.md`](./docs/API.md).

---

## Data

- **Source file:** [`data/exchanges.json`](./data/exchanges.json)
- **Schema:** [`schema/exchange.schema.json`](./schema/exchange.schema.json)
- **24 exchanges covered:** Binance, OKX, Bybit, Bitget, KuCoin, MEXC, Foxbit, NovaDAX, Brasil Bitcoin, Coinext, Bitso, Mercado Bitcoin, BityPreço, Coinbase, Kraken, Gate.io, HTX, Crypto.com, BingX, BitMart, Nubank, Mercado Pago, Mynt, Bipa
- **Brazilian focus:** 12+ exchanges registered or with local operations in Brazil

Every data change is validated against the JSON Schema before it reaches `main`.

---

## Rate limits

- **60 requests per minute** per IP — no API key required
- Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header (UNIX timestamp of when the window resets)
- Responses are cached at the edge for up to 5 minutes

---

## Contributing

Data corrections and additions are welcome. Fees change, exchanges get licensed, and new players enter the Brazilian market.

See **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** for data quality rules and how to submit a PR. All PRs must pass `npm run validate` against the JSON Schema.

---

## Used by

| Project | Description |
|---------|-------------|
| [DolarMap](https://bitsark.com/dolarmap/) | Real-time USD/BRL rate monitoring across exchanges |
| [bitsark.com/exchanges](https://bitsark.com/exchanges/) | Exchange comparison pages, auto-updated from this API |

---

## License

[MIT](./LICENSE) © bitsARK Labs 2026

> Data is provided for informational purposes only and may be outdated. bitsARK does not guarantee accuracy. Always verify with the official exchange. Full terms: https://bitsark.com/terms
