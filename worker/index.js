/**
 * BitsARK Exchanges API — Cloudflare Worker
 * Route: api.bitsark.com/v1/*
 *
 * Endpoints:
 *   GET  /v1/                          — API index
 *   GET  /v1/exchanges                 — All exchanges (filterable)
 *   GET  /v1/exchanges/fees            — Fee projection (filterable)
 *   GET  /v1/exchanges/brazil-registered — Brazil-registered exchanges
 *   GET  /v1/exchanges/:id             — Single exchange by id or slug
 *   OPTIONS *                          — CORS preflight
 *
 * All other methods → 405
 */

const DATA_URL =
  "https://raw.githubusercontent.com/bitsARK-Labs/exchanges-api/main/data/exchanges.json";

const CACHE_TTL = 3600; // 1 hour in seconds

const DISCLAIMER =
  "Data is provided for informational purposes only and may be outdated. " +
  "BitsARK does not guarantee accuracy. Always verify with the official exchange. " +
  "Full terms: https://bitsark.com/terms";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// ---------------------------------------------------------------------------
// Rate limiting via Cloudflare KV (optional — skipped when KV is not bound)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 60; // requests per window

async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT_KV) return { allowed: true };

  const key = `rl:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW;

  let record = null;
  try {
    const raw = await env.RATE_LIMIT_KV.get(key);
    record = raw ? JSON.parse(raw) : null;
  } catch (_) {
    // KV failure — allow through rather than blocking legit traffic
    return { allowed: true };
  }

  const count = record && record.ts > windowStart ? record.count : 0;

  if (count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      reset: record.ts + RATE_LIMIT_WINDOW,
    };
  }

  // Increment
  try {
    await env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({ ts: record && record.ts > windowStart ? record.ts : now, count: count + 1 }),
      { expirationTtl: RATE_LIMIT_WINDOW * 2 }
    );
  } catch (_) {
    // Non-fatal
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1 };
}

// ---------------------------------------------------------------------------
// Data fetching with edge cache
// ---------------------------------------------------------------------------
async function fetchExchanges(env) {
  const cacheKey = new Request(DATA_URL);
  const cache = caches.default;

  // Try cache first
  let cached = await cache.match(cacheKey);
  if (cached) {
    return cached.json();
  }

  // Fetch from GitHub
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Upstream fetch failed: ${response.status}`);
  }

  const data = await response.json();

  // Store in edge cache
  const toCache = new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });
  await cache.put(cacheKey, toCache);

  return data;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function successResponse(data, meta = {}) {
  return jsonResponse({
    success: true,
    notice: DISCLAIMER,
    ...meta,
    data,
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, notice: DISCLAIMER, error: message }, status);
}

// ---------------------------------------------------------------------------
// Filtering helpers
// ---------------------------------------------------------------------------
function applyFilters(exchanges, params) {
  let result = [...exchanges];

  if (params.get("brazil_registered") !== null) {
    const val = params.get("brazil_registered").toLowerCase() === "true";
    result = result.filter((e) => e.brazil_registered === val);
  }

  if (params.get("bcb_licensed") !== null) {
    const val = params.get("bcb_licensed").toLowerCase() === "true";
    result = result.filter((e) => e.bcb_licensed === val);
  }

  if (params.get("accepts_pix") !== null) {
    const val = params.get("accepts_pix").toLowerCase() === "true";
    result = result.filter((e) => e.accepts_pix === val);
  }

  if (params.get("monitored_by_dolarmap") !== null) {
    const val = params.get("monitored_by_dolarmap").toLowerCase() === "true";
    result = result.filter((e) => e.monitored_by_dolarmap === val);
  }

  if (params.get("stablecoin") !== null) {
    const coin = params.get("stablecoin").toUpperCase();
    result = result.filter(
      (e) => Array.isArray(e.stablecoins) && e.stablecoins.includes(coin)
    );
  }

  if (params.get("fiat") !== null) {
    const fiat = params.get("fiat").toUpperCase();
    result = result.filter(
      (e) => Array.isArray(e.supported_fiats) && e.supported_fiats.includes(fiat)
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
function handleIndex() {
  return jsonResponse({
    success: true,
    notice: DISCLAIMER,
    api: "BitsARK Exchanges API",
    version: "v1",
    base_url: "https://api.bitsark.com/v1",
    documentation: "https://github.com/bitsARK-Labs/exchanges-api/blob/main/docs/API.md",
    endpoints: [
      {
        method: "GET",
        path: "/v1/exchanges",
        description: "Full list of exchanges. Supports query filters.",
        filters: [
          "brazil_registered (boolean)",
          "bcb_licensed (boolean)",
          "accepts_pix (boolean)",
          "monitored_by_dolarmap (boolean)",
          "stablecoin (string, e.g. USDT)",
          "fiat (string ISO 4217, e.g. BRL)",
        ],
        example: "https://api.bitsark.com/v1/exchanges?accepts_pix=true&fiat=BRL",
      },
      {
        method: "GET",
        path: "/v1/exchanges/fees",
        description: "Fee projection: id, name, website, brazil_registered, fees, updated_at. Supports same filters as /exchanges.",
        example: "https://api.bitsark.com/v1/exchanges/fees?brazil_registered=true",
      },
      {
        method: "GET",
        path: "/v1/exchanges/brazil-registered",
        description:
          "All Brazil-registered exchanges. Projection: id, name, website, cnpj, bcb_licensed, accepts_pix, monitored_by_dolarmap, updated_at.",
        example: "https://api.bitsark.com/v1/exchanges/brazil-registered",
      },
      {
        method: "GET",
        path: "/v1/exchanges/:id",
        description: "Single exchange by id or slug. Returns 404 if not found.",
        example: "https://api.bitsark.com/v1/exchanges/binance",
      },
    ],
    cache: "Responses are cached at the edge for 1 hour.",
    rate_limit: "60 requests per minute per IP. No API key required.",
  });
}

async function handleExchanges(params, env) {
  const data = await fetchExchanges(env);
  const filtered = applyFilters(data, params);
  return successResponse(filtered, { count: filtered.length, total: data.length });
}

async function handleFees(params, env) {
  const data = await fetchExchanges(env);
  const filtered = applyFilters(data, params);
  const projection = filtered.map((e) => ({
    id: e.id,
    name: e.name,
    website: e.website,
    brazil_registered: e.brazil_registered,
    fees: e.fees,
    updated_at: e.updated_at,
  }));
  return successResponse(projection, { count: projection.length, total: data.length });
}

async function handleBrazilRegistered(env) {
  const data = await fetchExchanges(env);
  const filtered = data
    .filter((e) => e.brazil_registered === true)
    .map((e) => ({
      id: e.id,
      name: e.name,
      website: e.website,
      cnpj: e.cnpj,
      bcb_licensed: e.bcb_licensed,
      accepts_pix: e.accepts_pix,
      monitored_by_dolarmap: e.monitored_by_dolarmap,
      updated_at: e.updated_at,
    }));
  return successResponse(filtered, { count: filtered.length });
}

async function handleSingleExchange(idOrSlug, env) {
  const data = await fetchExchanges(env);
  const exchange = data.find(
    (e) => e.id === idOrSlug || e.slug === idOrSlug
  );
  if (!exchange) {
    return errorResponse(`Exchange '${idOrSlug}' not found.`, 404);
  }
  return successResponse(exchange);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // OPTIONS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only GET allowed beyond this point
    if (method !== "GET") {
      return errorResponse("Method Not Allowed. Only GET and OPTIONS are supported.", 405);
    }

    // Rate limiting (no-op when KV is not bound)
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "unknown";
    const rl = await checkRateLimit(ip, env);
    if (!rl.allowed) {
      return jsonResponse(
        {
          success: false,
          notice: DISCLAIMER,
          error: "Rate limit exceeded. Maximum 60 requests per minute.",
          retry_after: rl.reset,
        },
        429,
        { "Retry-After": String(rl.reset) }
      );
    }

    const path = url.pathname.replace(/\/+$/, ""); // strip trailing slashes
    const params = url.searchParams;

    try {
      // Route matching
      if (path === "/v1" || path === "/v1/") {
        return handleIndex();
      }

      if (path === "/v1/exchanges") {
        return await handleExchanges(params, env);
      }

      if (path === "/v1/exchanges/fees") {
        return await handleFees(params, env);
      }

      if (path === "/v1/exchanges/brazil-registered") {
        return await handleBrazilRegistered(env);
      }

      // Dynamic route: /v1/exchanges/:id
      const singleMatch = path.match(/^\/v1\/exchanges\/([^/]+)$/);
      if (singleMatch) {
        return await handleSingleExchange(singleMatch[1], env);
      }

      // No route matched
      return errorResponse("Not Found. See GET /v1 for available endpoints.", 404);
    } catch (err) {
      console.error("Worker error:", err);
      return errorResponse(
        "An internal error occurred. Please try again later.",
        500
      );
    }
  },
};
