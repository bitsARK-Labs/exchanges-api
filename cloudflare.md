# Cloudflare — BitsARK Exchanges API

Referência operacional para configurar, manter e depurar a infraestrutura Cloudflare deste projeto.

---

## Arquitetura resumida

```
Browser / DolarMap
       │
       ▼
Cloudflare Edge ──── cache hit? ──── responde direto (HIT)
       │                                     ▲
       │ MISS                                │
       ▼                              caches.default.put()
  Worker executa
       │
       ▼
GitHub raw CDN (DATA_URL)
https://raw.githubusercontent.com/bitsARK-Labs/exchanges-api/main/data/exchanges.json
```

O Worker **não tem origem configurada**. Todo tráfego para `api.bitsark.com` deve ser interceptado pela rota do Worker — se não for, o Cloudflare tenta encaminhar para uma origem inexistente e retorna **erro 522**.

---

## Roteamento (`wrangler.toml`)

### Padrão atual

```toml
[[routes]]
pattern = "api.bitsark.com/*"
zone_name = "bitsark.com"
```

### Por que uma única rota catch-all

O wildcard `*` no Cloudflare Workers corresponde a **zero ou mais caracteres**, então `api.bitsark.com/*` cobre:

| URL requisitada | Coberta? |
|---|---|
| `api.bitsark.com/` | Sim |
| `api.bitsark.com/v1` | Sim |
| `api.bitsark.com/v1/` | Sim |
| `api.bitsark.com/v1/exchanges` | Sim |
| `api.bitsark.com/v1/exchanges/binance` | Sim |

O roteamento interno (qual handler responde) fica inteiramente no `index.js` — não no Cloudflare. Isso é a prática recomendada: **uma rota no Cloudflare, lógica no Worker**.

### Por que não `api.bitsark.com/v1/*`

O padrão `v1/*` exige pelo menos um caractere após `/v1/`. Isso faz com que `api.bitsark.com/v1` (sem trailing slash) não case e retorne **erro 522**. Nunca use `/v1/*` como única rota se você quer que `/v1` (sem barra) também funcione.

### Domains & Routes no Dashboard

O Dashboard em **Workers → bitsark-exchanges-api → Settings → Domains & Routes** deve refletir exatamente o `wrangler.toml`. Após cada `wrangler deploy`, confirme que a rota exibida é:

```
api.bitsark.com/*
```

Se houver divergência entre o Dashboard e o `wrangler.toml`, o `wrangler deploy` sobrescreve com o que está no arquivo — o Dashboard é apenas leitura do estado atual.

---

## Versionamento de API (`/v1`)

O prefixo `/v1` é tratado **inteiramente no Worker** (`index.js`), não no Cloudflare. Isso significa:

- Adicionar `/v2` no futuro = adicionar rotas em `index.js`, sem tocar no Cloudflare
- A rota `api.bitsark.com/*` continua válida para qualquer versão futura
- O campo `base_url` no response do index (`/v1`) documenta explicitamente a versão para os consumidores

Padrão atual no `index.js`:

```
/          → redireciona para handleIndex (mesmo que /v1)
/v1        → handleIndex
/v1/       → handleIndex
/v1/exchanges         → handleExchanges
/v1/exchanges/fees    → handleFees
/v1/exchanges/brazil-registered → handleBrazilRegistered
/v1/exchanges/dolarmap           → handleDolarmap (requer X-Internal-Token)
/v1/exchanges/:id                → handleSingleExchange
qualquer outro path  → 404
```

---

## Secrets

### No Cloudflare Dashboard

Configurados em **Workers → bitsark-exchanges-api → Settings → Variables and Secrets**:

| Secret | Uso | Como alterar |
|---|---|---|
| `DOLARMAP_SECRET` | Protege `GET /v1/exchanges/dolarmap` via header `X-Internal-Token` | Dashboard → Workers → Settings → Variables and Secrets → Edit |

> Secrets do Dashboard são injetados em `env` no Worker. Nunca commit no repo.

### No GitHub Actions

Configurados em **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Uso |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Autenticação do `wrangler deploy` no CI |
| `CLOUDFLARE_ZONE_ID` | Purge de cache via API REST no `notify-web.yml` |
| `BITSARK_WEB_DEPLOY_TOKEN` | `repository_dispatch` para bitsark-web |
| `DOLARMAP_SECRET` | Mesmo valor do secret do Dashboard — usado em testes de CI se necessário |

---

## Cache

Duas camadas de cache estão ativas:

| Camada | Mecanismo | TTL | Quem controla |
|---|---|---|---|
| Edge Cloudflare | `caches.default` no Worker | 5 min | `index.js` → `withCache()` |
| Cliente (browser/http) | `Cache-Control: public, max-age=300` | 5 min | header na response |

O cache da edge só armazena respostas `200`. Erros (`4xx`, `5xx`) nunca são cacheados.

### Purge manual de cache

O `notify-web.yml` faz purge automático via API ao push em `data/exchanges.json`. Para purge manual:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

Ou via Dashboard: **Cloudflare → bitsark.com → Caching → Purge cache → Purge Everything**.

---

## Smart Placement

**Status atual:** `Default` (desativado)

**Recomendação: manter desativado.** Smart Placement otimiza a localização do Worker em relação a backends. Como este Worker busca dados de um único backend externo (GitHub CDN), que é distribuído globalmente por conta própria, ativar Smart Placement pode **aumentar** a latência para usuários em vez de reduzir.

Só vale ativar se o Worker passar a consultar um backend de localização fixa (ex: um banco de dados em uma região específica).

---

## Observability

**Status atual:** `enabled = true` no `wrangler.toml`

Isso habilita **Workers Logs** — logs de `console.log` / `console.error` ficam visíveis em:

**Dashboard → Workers → bitsark-exchanges-api → Observability → Logs**

Útil para depurar erros de upstream (GitHub CDN indisponível, etc.). Não tem custo adicional no plano Workers Free/Paid além das invocações normais.

---

## Compatibility Date e Flags

**Configuração atual:**
```toml
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
```

- `nodejs_compat` habilita APIs Node.js no Worker (ex: `Buffer`, `crypto` nativo). Necessário para o `generateETag` com `crypto.subtle`.
- A data `2024-01-01` é conservadora. Cloudflare recomenda manter próxima da data atual para receber correções de comportamento. **Não há urgência em atualizar** para este Worker pois o código não depende de comportamentos que mudaram entre 2024 e hoje — mas é boa prática revisar a cada 6 meses.

Para verificar o que muda ao atualizar a data: https://developers.cloudflare.com/workers/configuration/compatibility-flags/

---

## KV Rate Limiting (pendente de ativação)

O código em `index.js` já implementa rate limiting via KV (60 req/min por IP), mas está **inativo** porque o namespace precisa ser criado manualmente.

### Para ativar

1. No Dashboard: **Workers → KV → Create namespace** → nome sugerido: `exchanges-api-rate-limit`
2. Copiar o ID gerado
3. No `wrangler.toml`, descomentar/confirmar:
   ```toml
   [[kv_namespaces]]
   binding = "RATE_LIMIT_KV"
   id = "ID_COPIADO_AQUI"
   ```
4. Fazer deploy: `wrangler deploy` ou push para main

**Zero mudança de código necessária** — o Worker já detecta se o binding está presente.

**Namespace atual no `wrangler.toml`:** `id = "85ac41cff4c14d5b9d2c13da2ae7f098"` — verificar se este namespace já existe no Dashboard antes de criar um novo.

---

## Troubleshooting

### Erro 522 (Connection Timed Out)

Causa mais comum: **uma URL não está coberta pela rota do Worker** e o Cloudflare tenta encaminhar para uma origem inexistente.

Checklist:
1. Confirmar que a rota no Dashboard é `api.bitsark.com/*` (catch-all)
2. Se recém-deployado: aguardar ~30s para propagação
3. Testar localmente: `wrangler dev` e acessar o path problemático

### Worker não atualiza após deploy

O cache de edge (`caches.default`) pode servir respostas antigas por até 5 minutos. Fazer purge manual (seção acima) ou aguardar o TTL expirar.

### Logs de erro do Worker

**Dashboard → Workers → bitsark-exchanges-api → Observability → Logs** — filtre por `level:error` para ver apenas erros.

---

## Deploy

```bash
cd worker
wrangler deploy
```

O CI/CD faz isso automaticamente via `.github/workflows/deploy-worker.yml` a cada push em `main`.

**Nunca edite o Worker diretamente pelo Dashboard** — o próximo deploy do CI sobrescreve qualquer alteração manual.
