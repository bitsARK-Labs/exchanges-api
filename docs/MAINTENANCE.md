# 📅 Guia de Manutenção Mensal — BitsARK Exchanges API

> **Tempo estimado:** 10–20 minutos por mês  
> **Ferramenta usada:** ChatGPT (plano Premium com navegação web ativada)  
> **Quando fazer:** Sempre que receber um PR automático com o assunto `⚠️ Revisão Mensal de Taxas`, ou uma vez por mês de qualquer forma.

---

## 📋 Campos que o ChatGPT deve verificar

Para cada corretora, o ChatGPT deve buscar e retornar **somente estes campos**:

| Campo | O que é | Exemplo |
|---|---|---|
| `fees.maker` | Taxa maker em decimal (tier padrão iniciante) | `0.001` = 0,1% |
| `fees.taker` | Taxa taker em decimal (tier padrão iniciante) | `0.001` = 0,1% |
| `fees.note` | Observação sobre descontos ou condições | `"BNB discount available (25% off)."` |
| `fees.fee_url` | URL oficial da página de taxas | `"https://binance.com/en/fee/schedule"` |

> ⚠️ **Não pedir** ao ChatGPT: `operational_details_br`, `fiscal_details_br`, `monitored_by_dolarmap`. Estes campos são gerenciados internamente e nunca devem ser alterados via manutenção mensal.

> 🚨 **Regra de ouro das taxas:** sempre coletar o **tier padrão para iniciantes** — ou seja, a taxa que se aplica a uma conta recém-criada, sem histórico de volume, sem segurar token da plataforma e sem nenhum benefício especial. Nunca usar taxas VIP, de alto volume ou de programas de desconto que não estejam disponíveis imediatamente para qualquer pessoa que abra uma conta padrão.

---

## 🤖 Passo 1 — Prompt para o ChatGPT

Abra o ChatGPT (com navegação web ativada) e cole o prompt abaixo **exatamente como está**, substituindo apenas a lista de corretoras se necessário:

---

```markdown
### 🚨 INSTRUÇÕES DE SEGURANÇA E FONTE (LEIA ANTES DE BUSCAR):
1. FONTE PRIMÁRIA APENAS: Você deve buscar informações APENAS nos domínios oficiais das corretoras listadas (ex: binance.com, coinbase.com). 
2. PROIBIÇÃO DE BLOGS/NOTÍCIAS: Ignore completamente informações de blogs, fóruns (Reddit), sites de notícias ou agregadores (CoinMarketCap, Coingecko).
3. POLÍTICA DE "NÃO TENHO CERTEZA": Se você não encontrar a informação explicitamente na página de taxas (fee_url) ou no suporte oficial da corretora, retorne o valor atual como "KEEP_CURRENT" ou null. Não tente adivinhar ou usar dados históricos.
4. DATA DE VERIFICAÇÃO: Se a informação no site tiver uma data (ex: "Last updated: Oct 2023"), reporte isso no campo "note".
5. DETALHES OPERACIONAIS/FISCAIS: Os campos `operational_details_br` e `fiscal_details_br` são internos. **NUNCA** modifique estes objetos.

***

Você é um assistente de coleta de dados financeiros.
Preciso que você acesse a página oficial de taxas de cada corretora abaixo e me retorne os dados no formato JSON especificado.

Para cada corretora, acesse a URL indicada e extraia:
- maker: taxa maker em decimal (ex: 0.1% = 0.001)
- taker: taxa taker em decimal
- note: uma frase curta em inglês sobre descontos ou condições especiais (máx 100 caracteres)
- fee_url: a URL exata que você acessou

REGRA FUNDAMENTAL — Tier padrão iniciante:
Sempre colete a taxa do tier mais baixo da tabela, ou seja, aquele que se aplica a uma
conta recém-criada sem histórico de volume, sem segurar token da plataforma e sem
nenhum benefício especial. Se a página de taxas exibir uma tabela de tiers por volume
ou por saldo, use sempre a primeira linha (tier de entrada, sem requisitos).
Nunca retorne taxas VIP, de alto volume, com desconto de token nativo ou de programas
de fidelidade que não estejam disponíveis imediatamente para qualquer pessoa que abra
uma conta padrão.

Retorne um array JSON com este formato exato, sem nenhum texto antes ou depois:
[
  {
    "id": "binance",
    "fees": {
      "maker": 0.001,
      "taker": 0.001,
      "note": "Standard tier. Verified on official fee schedule.",
      "fee_url": "https://www.binance.com/en/fee/schedule"
    }
  }
]

Corretoras para verificar:

1.  id: binance         | URL: https://www.binance.com/pt-BR/fee/schedule
2.  id: okx             | URL: https://www.okx.com/fees
3.  id: bybit           | URL: https://www.bybit.com/en/help-center/article/Trading-Fee-Structure
4.  id: bitget          | URL: https://www.bitget.com/en/rate/fee
5.  id: kucoin          | URL: https://www.kucoin.com/announcement/en-fee
6.  id: mexc            | URL: https://www.mexc.com/fee
7.  id: foxbit          | URL: https://foxbit.com.br/taxas/
8.  id: novadax         | URL: https://www.novadax.com.br/taxas-e-limites
9.  id: brasil-bitcoin  | URL: https://brasilbitcoin.com.br/taxas
10. id: coinext         | URL: https://coinext.com.br/taxas-limites-prazos
11. id: bitso           | URL: https://bitso.com/fees
12. id: mercado-bitcoin | URL: https://www.mercadobitcoin.com.br/taxas-contas-limites
13. id: bitypreco       | URL: https://suporte.bity.com.br/pt-BR/articles/6967815-taxas
14. id: coinbase        | URL: https://help.coinbase.com/en/exchange/trading-and-funding/exchange-fees
15. id: kraken          | URL: https://www.kraken.com/features/fee-schedule
16. id: gate-io         | URL: https://www.gate.com/fee
17. id: htx             | URL: https://www.htx.com/fee/
18. id: crypto-com      | URL: https://crypto.com/exchange/document/fees-limits
19. id: bingx           | URL: https://www.bingx.com/en-us/support/articles/360027240173
20. id: bitmart         | URL: https://www.bitmart.com/fee/en
21. id: nubank-cripto   | URL: https://nubank.com.br/nu/nubank-criptomoeda
22. id: mercado-pago    | URL: https://www.mercadopago.com.br/cripto
23. id: mynt            | URL: https://www.mynt.com.br
24. id: bipa            | URL: https://suporte.bipa.app/hc/pt-br/articles/30249970786587-Quais-sao-as-taxas-de-negociacao-de-Bitcoin-e-USDT-na-Bipa

Importante:
- Use sempre decimal, não percentual (0.001, não 0.1 nem "0.1%")
- Se maker e taker forem iguais, repita o valor nos dois campos
- Para corretoras que não têm maker/taker explícito (ex: spread embutido), use null para maker/taker e descreva no note
- Se a informação não estiver clara no site oficial ou for de fonte secundária, retorne null para os valores e note: "OFFICIAL_SOURCE_NOT_FOUND"
- Retorne SOMENTE o array JSON, sem texto adicional
```

---

## ✅ Passo 2 — Validar o retorno do ChatGPT

1. O ChatGPT vai retornar um array JSON. **Verifique se:**
   - Tem exatamente **24 itens**
   - Nenhum valor está `null` sem justificativa (se tiver, acesse a URL manualmente)
   - Os valores `maker` e `taker` são decimais (entre 0 e 0.1, tipicamente)
   - Os valores correspondem ao **tier padrão iniciante** — se parecerem muito baixos
     (ex: `maker: 0.0` ou `taker: 0.00005`), provavelmente o ChatGPT coletou uma taxa
     VIP ou com desconto; acesse a URL manualmente e confirme o tier de entrada.

2. **Se algum valor parecer estranho** (ex: `maker: 1.0` ou valores abaixo de `0.0001`
   sem justificativa clara), acesse a URL da corretora e confirme.

---

## ✏️ Passo 3 — Atualizar o `exchanges.json`

1. Abra o arquivo `data/exchanges.json` no VS Code
2. Para cada corretora que teve mudança, atualize os campos `fees.maker`, `fees.taker`, `fees.note` e `fees.fee_url`
3. **Nunca altere** `operational_details_br`, `fiscal_details_br` ou `monitored_by_dolarmap` durante a manutenção mensal
4. **Sempre atualize também o campo `updated_at`** com a data de hoje no formato ISO: "updated_at": "2026-05-01T00:00:00Z"
5. Salve o arquivo

---

## 🔍 Passo 4 — Validar o schema localmente

No terminal do VS Code, rode:

```bash
npm run validate
```

Se aparecer `✓ Validation passed` — está tudo certo.  
Se aparecer erro — o ChatGPT provavelmente retornou um formato inválido. Leia a mensagem de erro e corrija o campo indicado.

---

## 🚀 Passo 5 — Fazer o commit e abrir o PR

### Opção A: Pelo VS Code (recomendado)

1. Abra o painel **Source Control** (ícone de ramificação na barra lateral esquerda, ou `Ctrl+Shift+G`)
2. Você verá o arquivo `data/exchanges.json` listado em **Changes**
3. Clique no **+** ao lado do arquivo para adicionar ao commit (stage)
4. No campo **Message**, escreva:chore: atualiza taxas das corretoras - revisão mensal YYYY-MM
Substitua `YYYY-MM` pelo ano e mês atual (ex: `2026-05`)
5. Clique em **Commit** (✓)
6. Clique em **Publish Branch** ou **Push** para enviar ao GitHub

### Opção B: Pelo terminal

```bash
git add data/exchanges.json
git commit -m "chore: atualiza taxas das corretoras - revisão mensal 2026-05"
git push
```

---

## 🔀 Passo 6 — Aceitar o PR no GitHub (Merge)

> Este passo é necessário quando você faz a atualização em um branch separado ou quando o GitHub Actions abriu um PR automático.

1. Acesse o repositório no GitHub: https://github.com/bitsARK-Labs/exchanges-api
2. Clique na aba **Pull requests** (menu superior)
3. Clique no PR com o título da sua atualização
4. Role a página até o final
5. Verifique se os checks (✓) passaram — especialmente o `validate-schema`
6. Clique no botão verde **Merge pull request**
7. Clique em **Confirm merge**
8. Pronto! O PR foi mergeado na `main`.

> 💡 **Dica:** Após o merge, você pode clicar em **Delete branch** para manter o repositório limpo.

---

## 🔑 Gerenciando o `DOLARMAP_SECRET` (token interno)

O endpoint `GET /v1/exchanges/dolarmap` é protegido por um secret armazenado como variável de ambiente no Cloudflare Worker.

### Gerar um novo token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Atualizar o secret no Cloudflare

```bash
cd worker/
wrangler secret put DOLARMAP_SECRET
# Cole o valor gerado quando solicitado e pressione Enter
```

### Quando trocar o token

- Se o token for comprometido (vazou em log, commit, etc.)
- Ao rotacionar credenciais periodicamente (recomendado a cada 6 meses)
- Após trocar, atualize também a variável de ambiente correspondente no app DolarMap

### Uso no app DolarMap

```js
// .env do projeto DolarMap
BITSARK_INTERNAL_TOKEN=seu_token_aqui

// Chamada na aplicação
fetch("https://api.bitsark.com/v1/exchanges/dolarmap", {
headers: { "X-Internal-Token": process.env.BITSARK_INTERNAL_TOKEN }
})
```

---

## 🔗 Integração com bitsark-web

Ao final do `scrape-fees.yml`, um evento `repository_dispatch` é enviado para o
repo [`bitsark-web`](https://github.com/bitsARK-Labs/bitsark-web) com o tipo
`exchanges-data-updated`. Isso aciona um commit vazio no `main` do `bitsark-web`,
que por sua vez acorda o **Cloudflare Pages** para um rebuild automático do site Astro.
Durante o build, o site faz `fetch` na API e gera as páginas estáticas atualizadas.

### Fluxo completo

```
scrape-fees.yml (este repo) conclui com sucesso
  └→ POST para github.com/repos/bitsARK-Labs/bitsark-web/dispatches
       └→ deploy.yml do bitsark-web é acionado
            └→ commit vazio no main do bitsark-web
                 └→ Cloudflare Pages detecta → astro build → deploy ✓
```

### Secret necessário neste repo

| Secret | Descrição |
|---|---|
| `BITSARK_WEB_DEPLOY_TOKEN` | Fine-grained PAT com `Actions: Read and write` no repo `bitsark-web`. Permite disparar o `repository_dispatch`. |

### Se o token expirar

Se o rebuild automático parar de funcionar após uma quarta-feira, verifique se o token
expirou em **github.com → Settings → Developer settings → Fine-grained tokens**.
Para recriar, siga as instruções em `bitsark-web/docs/WORKFLOWS.md`.

> O deploy manual do `bitsark-web` continua funcionando normalmente mesmo se o token
> expirar — apenas o trigger automático pára.

---

## 🗂️ Lista de todas as corretoras no dataset

| # | ID | Nome | Regime Fiscal BR | Pix | Página de Taxas |
|---|---|---|---|---|---|
| 1 | `binance` | Binance | offshore_law_14754 | ✅ | [link](https://www.binance.com/pt-BR/fee/schedule) |
| 2 | `okx` | OKX Brasil | domestic_exchange_foreign_origin | ✅ | [link](https://www.okx.com/fees) |
| 3 | `bybit` | Bybit | domestic_exchange_foreign_origin | ✅ | [link](https://www.bybit.com/en/help-center/article/Trading-Fee-Structure) |
| 4 | `bitget` | Bitget | offshore_law_14754 | ❌ | [link](https://www.bitget.com/en/rate/fee) |
| 5 | `kucoin` | KuCoin | offshore_law_14754 | ✅ | [link](https://www.kucoin.com/announcement/en-fee) |
| 6 | `mexc` | MEXC | offshore_law_14754 | ❌ | [link](https://www.mexc.com/fee) |
| 7 | `foxbit` | Foxbit | domestic_exchange | ✅ | [link](https://foxbit.com.br/taxas/) |
| 8 | `novadax` | NovaDAX | domestic_exchange | ✅ | [link](https://www.novadax.com.br/taxas-e-limites) |
| 9 | `brasil-bitcoin` | Brasil Bitcoin | domestic_exchange | ✅ | [link](https://brasilbitcoin.com.br/taxas) |
| 10 | `coinext` | Coinext | domestic_exchange | ✅ | [link](https://coinext.com.br/taxas-limites-prazos) |
| 11 | `bitso` | Bitso | domestic_exchange_foreign_origin | ✅ | [link](https://bitso.com/fees) |
| 12 | `mercado-bitcoin` | Mercado Bitcoin | domestic_exchange | ✅ | [link](https://www.mercadobitcoin.com.br/taxas-contas-limites) |
| 13 | `bitypreco` | BityPreço | domestic_exchange | ✅ | [link](https://suporte.bity.com.br/pt-BR/articles/6967815-taxas) |
| 14 | `coinbase` | Coinbase | domestic_exchange_foreign_origin | ✅ | [link](https://help.coinbase.com/en/exchange/trading-and-funding/exchange-fees) |
| 15 | `kraken` | Kraken | domestic_exchange_foreign_origin | ✅ | [link](https://www.kraken.com/features/fee-schedule) |
| 16 | `gate-io` | Gate.io | offshore_law_14754 | ❌ | [link](https://www.gate.com/fee) |
| 17 | `htx` | HTX | offshore_law_14754 | ❌ | [link](https://www.htx.com/fee/) |
| 18 | `crypto-com` | Crypto.com | domestic_exchange_foreign_origin | ✅ | [link](https://crypto.com/exchange/document/fees-limits) |
| 19 | `bingx` | BingX | offshore_law_14754 | ❌ | [link](https://www.bingx.com/en-us/support/articles/360027240173) |
| 20 | `bitmart` | BitMart | offshore_law_14754 | ❌ | [link](https://www.bitmart.com/fee/en) |
| 21 | `nubank-cripto` | Nubank Cripto | domestic_exchange | ✅ | [link](https://nubank.com.br/nu/nubank-criptomoeda) |
| 22 | `mercado-pago` | Mercado Pago | domestic_exchange | ✅ | [link](https://www.mercadopago.com.br/cripto) |
| 23 | `mynt` | Mynt (BTG Pactual) | domestic_exchange | ✅ | [link](https://www.mynt.com.br) |
| 24 | `bipa` | Bipa | domestic_exchange | ✅ | [link](https://suporte.bipa.app/hc/pt-br/articles/30249970786587-Quais-sao-as-taxas-de-negociacao-de-Bitcoin-e-USDT-na-Bipa) |

---

## ❓ Dúvidas frequentes

**O ChatGPT retornou um valor diferente do que está no JSON — o que faço?**  
Se a diferença for pequena (ex: `0.001` vs `0.0010`), é o mesmo valor. Se for realmente diferente, confirme se o valor retornado é do **tier padrão iniciante** (sem requisitos de volume ou token) antes de aceitar.

**Como saber se a taxa coletada é do tier correto?**  
Na página de taxas da corretora, procure a tabela de tiers. A taxa correta é sempre a da **primeira linha** da tabela — aquela com volume mínimo `$0` ou sem nenhum requisito de volume, saldo ou posse de token.

**Posso pedir para a IA atualizar diretamente o arquivo no GitHub?**  
Sim! Você pode pedir para o Perplexity (ou qualquer IA com acesso ao GitHub MCP) fazer isso. Basta dizer: _"Atualize as taxas do exchanges.json com base nestes dados e abra um PR"_ e colar o JSON retornado pelo ChatGPT.

**O workflow `validate-schema` falhou no PR — o que faço?**  
Clique em **Details** ao lado do check vermelho para ver o erro. Geralmente é um campo com tipo errado (string onde deveria ser number). Corrija no `exchanges.json` e faça um novo commit no mesmo branch — o PR atualiza automaticamente.

**Preciso atualizar todas as 24 corretoras todo mês?**  
Não. Só atualize as que tiveram mudança de taxa. Mas **sempre atualize o `updated_at`** de todas as que você verificou, mesmo que os valores não tenham mudado — isso reseta o contador de staleness.

**Como faço para rotacionar o `DOLARMAP_SECRET`?**  
Gere um novo token com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, rode `wrangler secret put DOLARMAP_SECRET` e atualize a variável de ambiente no app DolarMap. O token antigo deixa de funcionar imediatamente após o redeploy do worker.
