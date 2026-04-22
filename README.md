# BitsARK Exchanges API

[![Validate Schema](https://github.com/bitsARK-Labs/exchanges-api/actions/workflows/validate-schema.yml/badge.svg)](https://github.com/bitsARK-Labs/exchanges-api/actions/workflows/validate-schema.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Open data API about cryptocurrency exchanges — fees, Brazil CNPJ registration,
Pix support, and BCB licensing. Served via a Cloudflare Worker at `api.bitsark.com`.

> ⚠️ **Disclaimer:** Data is provided for informational purposes only and may be outdated.
> BitsARK does not guarantee accuracy. Always verify with the official exchange.
> Full terms: https://bitsark.com/terms

---

## Quick Start

```bash
# All exchanges
curl https://api.bitsark.com/v1/exchanges

# Brazil-registered exchanges with Pix support
curl "https://api.bitsark.com/v1/exchanges?brazil_registered=true&accepts_pix=true"

# BCB-licensed exchanges
curl "https://api.bitsark.com/v1/exchanges?bcb_licensed=true"

# Fee list for exchanges that accept BRL
curl "https://api.bitsark.com/v1/exchanges/fees?fiat=BRL"

# Brazil-registered exchanges (compact projection)
curl https://api.bitsark.com/v1/exchanges/brazil-registered

# Single exchange by id or slug
curl https://api.bitsark.com/v1/exchanges/mercado-bitcoin

# API index (all endpoints documented)
curl https://api.bitsark.com/v1
```

---

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1` | API index with all endpoints and examples |
| `GET` | `/v1/exchanges` | Full list of exchanges (filterable) |
| `GET` | `/v1/exchanges/fees` | Fee projection — id, name, fees, updated_at (filterable) |
| `GET` | `/v1/exchanges/brazil-registered` | Brazil-registered exchanges with CNPJ/BCB/Pix info |
| `GET` | `/v1/exchanges/:id` | Single exchange by `id` or `slug` |

---

## Query Filters

These filters work on `/v1/exchanges` and `/v1/exchanges/fees`:

| Parameter | Type | Example |
| --- | --- | --- |
| `brazil_registered` | `true` / `false` | `?brazil_registered=true` |
| `bcb_licensed` | `true` / `false` | `?bcb_licensed=true` |
| `accepts_pix` | `true` / `false` | `?accepts_pix=true` |
| `monitored_by_dolarmap` | `true` / `false` | `?monitored_by_dolarmap=true` |
| `stablecoin` | ticker string | `?stablecoin=USDT` |
| `fiat` | ISO 4217 code | `?fiat=BRL` |

Filters can be combined: `?accepts_pix=true&fiat=BRL&brazil_registered=true`

---

## Data

- **Source file:** [`data/exchanges.json`](./data/exchanges.json)
- **Schema:** [`schema/exchange.schema.json`](./schema/exchange.schema.json)
- **Exchanges included:** 20 (Binance, OKX, Bybit, Bitget, KuCoin, MEXC, Foxbit, NovaDAX,
  Brasil Bitcoin, Coinext, Bitso, Mercado Bitcoin, BitPreço, Coinbase, Kraken, Gate.io,
  HTX, Crypto.com, BingX, BitMart)
- **Brazilian exchanges:** 7 (Foxbit, NovaDAX, Brasil Bitcoin, Coinext, Bitso, Mercado Bitcoin, BitPreço)

Every entry is validated against the JSON Schema on every pull request.
See [`docs/API.md`](./docs/API.md) for full field documentation.

---

## Cache & Rate Limits

- Responses are cached at the **Cloudflare edge for 1 hour**
- **Rate limit:** 60 requests per minute per IP (no API key required)
- Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header

---

## Contributing

We welcome pull requests to update fees, fix CNPJ data, or add new exchanges.

Please read **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** before submitting a PR.

All PRs must:
- Pass `npm run validate`
- Include a verifiable source URL
- Follow the data quality rules described in CONTRIBUTING.md

---

## Used By

| Project | Description |
| --- | --- |
| [DolarMap](https://dolarmap.bitsark.com) | Real-time USD/BRL rate monitoring across exchanges |

---

## License

[MIT](./LICENSE) © BitsARK Labs 2026
