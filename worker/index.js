/**
 * BitsARK Exchanges API — Cloudflare Worker
 * Route: api.bitsark.com/v1/*
 *
 * Endpoints:
 *   GET  /v1/                              — API index
 *   GET  /v1/exchanges                     — All exchanges (filterable)
 *   GET  /v1/exchanges/fees                — Fee projection (filterable)
 *   GET  /v1/exchanges/brazil-registered   — Brazil-registered exchanges
 *   GET  /v1/exchanges/dolarmap            — DolarMap-monitored exchanges [internal, requires X-Internal-Token]
 *   GET  /v1/exchanges/:id                 — Single exchange by id or slug
 *   OPTIONS *                              — CORS preflight
 *
 * All other methods → 405
 */

const DATA_URL =
  "https://raw.githubusercontent.com/bitsARK-Labs/exchanges-api/main/data/exchanges.json";

const CLIENT_CACHE_TTL = 300; // 5 minutes — matches GitHub CDN cache for raw files

const DISCLAIMER =
  "Data is provided for informational purposes only and may be outdated. " +
  "BitsARK does not guarantee accuracy. Always verify with the official exchange. " +
  "Full terms: https://bitsark.com/terms";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Internal-Token",
  "Access-Control-Max-Age": "86400",
};

// ---------------------------------------------------------------------------
// Rate limiting via Cloudflare KV (optional — skipped when KV is not bound)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 60;    // requests per window

async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT_KV) return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };

  const key = `rl:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW;

  let record = null;
  try {
    const raw = await env.RATE_LIMIT_KV.get(key);
    record = raw ? JSON.parse(raw) : null;
  } catch (_) {
    // KV failure — allow through rather than blocking legit traffic
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  const withinWindow = record && record.ts > windowStart;
  const count = withinWindow ? record.count : 0;

  if (count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      reset: record.ts + RATE_LIMIT_WINDOW,
    };
  }

  // Increment — preserve original window start timestamp while within window
  try {
    await env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({
        ts: withinWindow ? record.ts : now,
        count: count + 1,
      }),
      { expirationTtl: RATE_LIMIT_WINDOW * 2 }
    );
  } catch (_) {
    // Non-fatal
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1 };
}

// ---------------------------------------------------------------------------
// ETag generation (SHA-256 of response body)
// ---------------------------------------------------------------------------
async function generateETag(content) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return `"${Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("")}"`;
}

// ---------------------------------------------------------------------------
// Data fetching — relies on GitHub's own CDN cache (~5 min TTL)
// ---------------------------------------------------------------------------
async function fetchExchanges() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Upstream fetch failed: ${response.status}`);
  }
  return response.json();
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

function successResponse(data, meta = {}, rlHeaders = {}) {
  return jsonResponse(
    {
      success: true,
      notice: DISCLAIMER,
      ...meta,
      data,
    },
    200,
    {
      "Cache-Control": `public, max-age=${CLIENT_CACHE_TTL}, stale-while-revalidate=60, stale-if-error=86400`,
      ...rlHeaders,
    }
  );
}

function errorResponse(message, status = 400, extraHeaders = {}) {
  return jsonResponse(
    { success: false, notice: DISCLAIMER, error: message },
    status,
    extraHeaders
  );
}

// ---------------------------------------------------------------------------
// Rate limit headers helper
// ---------------------------------------------------------------------------
function rateLimitHeaders(rl) {
  const headers = {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
  };
  if (rl.remaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(rl.remaining);
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Field projection — strips internal fields from public responses
// ---------------------------------------------------------------------------
function toPublic(exchange) {
  const { monitored_by_dolarmap, ...publicFields } = exchange;
  return {
    ...publicFields,
    analysis_url: `https://bitsark.com/exchanges/${exchange.slug}/`
  };
}

// ---------------------------------------------------------------------------
// Filtering helpers (public filters only — no monitored_by_dolarmap)
// ---------------------------------------------------------------------------
function applyFilters(exchanges, params) {
  let result = [...exchanges];

  const isTrue = (key) => params.get(key)?.toLowerCase() === "true";
  const hasParam = (key) => params.get(key) !== null;

  if (hasParam("brazil_registered")) {
    const val = isTrue("brazil_registered");
    result = result.filter((e) => (e.fiscal_details_br?.tax_regime?.startsWith("domestic_exchange") ?? false) === val);
  }

  if (hasParam("bcb_licensed")) {
    const val = isTrue("bcb_licensed");
    result = result.filter((e) => (e.operational_details_br?.bcb_authorized ?? false) === val);
  }

  if (hasParam("accepts_pix")) {
    const val = isTrue("accepts_pix");
    result = result.filter((e) => (e.operational_details_br?.accepts_pix ?? false) === val);
  }

  if (hasParam("monitored_by_dolarmap")) {
    const val = isTrue("monitored_by_dolarmap");
    result = result.filter((e) => e.monitored_by_dolarmap === val);
  }

  if (hasParam("tax_regime")) {
    const val = params.get("tax_regime");
    result = result.filter((e) => e.fiscal_details_br?.tax_regime === val);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cache wrapper — Cloudflare edge cache (caches.default) + ETag/304 support
// Only wraps public GET endpoints; authenticated/internal routes skip this.
// ---------------------------------------------------------------------------
async function withCache(request, ctx, handlerFn) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const etag = cached.headers.get("ETag");
    if (etag && request.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, ...CORS_HEADERS } });
    }
    const hit = new Response(cached.body, cached);
    hit.headers.set("X-Cache", "HIT");
    return hit;
  }

  const response = await handlerFn();

  if (response.status === 200) {
    const body = await response.text();
    const etag = await generateETag(body);
    const toStore = new Response(body, {
      status: 200,
      headers: {
        ...Object.fromEntries(response.headers),
        "ETag": etag,
        "Cache-Control": `public, max-age=${CLIENT_CACHE_TTL}, stale-while-revalidate=60, stale-if-error=86400`,
        "X-Cache": "MISS",
      },
    });
    ctx.waitUntil(cache.put(cacheKey, toStore.clone()));
    return toStore;
  }

  return response;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
async function handleIndex(env, rl) {
  const data = await fetchExchanges();
  const lastUpdated = data.reduce(
    (max, e) => (e.updated_at > max ? e.updated_at : max),
    ""
  );
  return jsonResponse(
    {
      success: true,
      notice: DISCLAIMER,
      api: "BitsARK Exchanges API",
      version: "v1",
      base_url: "https://api.bitsark.com/v1",
      documentation: "https://bitsark.com/exchanges/api",
      data_last_updated: lastUpdated || null,
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
            "tax_regime (string: domestic_exchange | domestic_exchange_foreign_origin | offshore_law_14754)",
          ],
          example: "https://api.bitsark.com/v1/exchanges?accepts_pix=true&brazil_registered=true",
        },
        {
          method: "GET",
          path: "/v1/exchanges/fees",
          description:
            "Fee projection: id, name, website, brazil_registered, fees, updated_at. Supports same filters as /exchanges.",
          example: "https://api.bitsark.com/v1/exchanges/fees?brazil_registered=true",
        },
        {
          method: "GET",
          path: "/v1/exchanges/brazil-registered",
          description:
            "All Brazil-registered exchanges. Projection: id, name, website, cnpj, bcb_authorized, accepts_pix, fiscal_details_br, updated_at.",
          example: "https://api.bitsark.com/v1/exchanges/brazil-registered",
        },
        {
          method: "GET",
          path: "/v1/exchanges/dolarmap",
          description:
            "[Internal] DolarMap-monitored exchanges. Requires X-Internal-Token header.",
          example: "https://api.bitsark.com/v1/exchanges/dolarmap",
        },
        {
          method: "GET",
          path: "/v1/exchanges/:id",
          description: "Single exchange by id or slug. Returns 404 if not found.",
          example: "https://api.bitsark.com/v1/exchanges/binance",
        },
      ],
      cache: "Responses reflect GitHub data with up to 5 minutes of propagation delay.",
      rate_limit: `${RATE_LIMIT_MAX} requests per minute per IP. No API key required.`,
    },
    200,
    rateLimitHeaders(rl)
  );
}

async function handleExchanges(params, env, rl) {
  const data = await fetchExchanges();
  const filtered = applyFilters(data, params);
  const publicData = filtered.map(toPublic);
  return successResponse(
    publicData,
    { count: publicData.length, total: data.length },
    rateLimitHeaders(rl)
  );
}

async function handleFees(params, env, rl) {
  const data = await fetchExchanges();
  const filtered = applyFilters(data, params);
  const projection = filtered.map((e) => ({
    id: e.id,
    name: e.name,
    website: e.website,
    brazil_registered: e.fiscal_details_br?.tax_regime?.startsWith("domestic_exchange") ?? false,
    fees: e.fees,
    updated_at: e.updated_at,
  }));
  return successResponse(
    projection,
    { count: projection.length, total: data.length },
    rateLimitHeaders(rl)
  );
}

async function handleBrazilRegistered(env, rl) {
  const data = await fetchExchanges();
  const filtered = data
    .filter((e) => e.fiscal_details_br?.tax_regime?.startsWith("domestic_exchange"))
    .map((e) => ({
      id: e.id,
      name: e.name,
      website: e.website,
      cnpj: e.operational_details_br?.cnpj,
      bcb_authorized: e.operational_details_br?.bcb_authorized,
      accepts_pix: e.operational_details_br?.accepts_pix,
      fiscal_details_br: e.fiscal_details_br,
      updated_at: e.updated_at,
    }));
  return successResponse(
    filtered,
    { count: filtered.length },
    rateLimitHeaders(rl)
  );
}

async function handleDolarmap(request, env, rl) {
  const token = request.headers.get("X-Internal-Token");

  if (!env.DOLARMAP_SECRET || token !== env.DOLARMAP_SECRET) {
    return errorResponse(
      "Unauthorized. This endpoint requires a valid X-Internal-Token header.",
      401,
      rateLimitHeaders(rl)
    );
  }

  // Internal endpoint — returns raw data including monitored_by_dolarmap.
  // toPublic() is intentionally NOT called here.
  const data = await fetchExchanges();
  const filtered = data.filter((e) => e.monitored_by_dolarmap === true);
  return successResponse(
    filtered,
    { count: filtered.length },
    rateLimitHeaders(rl)
  );
}

async function handleSingleExchange(idOrSlug, env, rl) {
  const data = await fetchExchanges();
  const exchange = data.find((e) => e.id === idOrSlug || e.slug === idOrSlug);

  if (!exchange) {
    return errorResponse(
      `Exchange '${idOrSlug}' not found.`,
      404,
      rateLimitHeaders(rl)
    );
  }

  return successResponse(toPublic(exchange), {}, rateLimitHeaders(rl));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
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
        {
          "Retry-After": String(rl.reset),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        }
      );
    }

    const path = url.pathname.replace(/\/+$/, ""); // strip trailing slashes
    const params = url.searchParams;

    try {
      // Route matching
      if (path === "" || path === "/" || path === "/v1" || path === "/v1/") {
        return withCache(request, ctx, () => handleIndex(env, rl));
      }

      if (path === "/v1/exchanges") {
        return withCache(request, ctx, () => handleExchanges(params, env, rl));
      }

      if (path === "/v1/exchanges/fees") {
        return withCache(request, ctx, () => handleFees(params, env, rl));
      }

      if (path === "/v1/exchanges/brazil-registered") {
        return withCache(request, ctx, () => handleBrazilRegistered(env, rl));
      }

      if (path === "/v1/exchanges/dolarmap") {
        // Internal authenticated endpoint — not cached
        return await handleDolarmap(request, env, rl);
      }

      // Dynamic route: /v1/exchanges/:id
      const singleMatch = path.match(/^\/v1\/exchanges\/([^/]+)$/);
      if (singleMatch) {
        return withCache(request, ctx, () => handleSingleExchange(singleMatch[1], env, rl));
      }

      // No route matched
      return errorResponse(
        "Not Found. See GET /v1 for available endpoints.",
        404,
        rateLimitHeaders(rl)
      );
    } catch (err) {
      console.error("Worker error:", err);
      return errorResponse(
        "An internal error occurred. Please try again later.",
        500,
        rateLimitHeaders(rl)
      );
    }
  },
};