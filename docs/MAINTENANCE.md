# 📅 Guia de Manutenção Mensal — BitsARK Exchanges API

> **Tempo estimado:** 10–20 minutos por mês  
> **Ferramenta usada:** ChatGPT (plano Premium com navegação web ativada)  
> **Quando fazer:** Sempre que receber um PR automático com o assunto `⚠️ Revisão Mensal de Taxas`, ou uma vez por mês de qualquer forma.

---

## 📋 Campos que o ChatGPT deve verificar

Para cada corretora, o ChatGPT deve buscar e retornar **somente estes campos**:

| Campo | O que é | Exemplo |
|---|---|---|
| `fees.maker` | Taxa maker em decimal | `0.001` = 0,1% |
| `fees.taker` | Taxa taker em decimal | `0.001` = 0,1% |
| `fees.note` | Observação sobre descontos ou condições | `"BNB discount available (25% off)."` |
| `fees.fee_url` | URL oficial da página de taxas | `"https://binance.com/en/fee/schedule"` |

> ⚠️ **Não pedir** ao ChatGPT: withdrawal, fiats, stablecoins, KYC, ranking CMC. Esses campos foram removidos do projeto.

---

## 🤖 Passo 1 — Prompt para o ChatGPT

Abra o ChatGPT (com navegação web ativada) e cole o prompt abaixo **exatamente como está**, substituindo apenas a lista de corretoras se necessário:

---

```
Você é um assistente de coleta de dados financeiros.
Preciso que você acesse a página oficial de taxas de cada corretora abaixo e me retorne os dados no formato JSON especificado.

Para cada corretora, acesse a URL indicada e extraia:
- maker: taxa maker em decimal (ex: 0.1% = 0.001)
- taker: taxa taker em decimal
- note: uma frase curta em inglês sobre descontos ou condições especiais (máx 100 caracteres)
- fee_url: a URL exata que você acessou

Retorne um array JSON com este formato exato, sem nenhum texto antes ou depois:
[
  {
    "id": "binance",
    "fees": {
      "maker": 0.001,
      "taker": 0.001,
      "note": "BNB discount available (25% off).",
      "fee_url": "https://www.binance.com/en/fee/schedule"
    }
  }
]

Corretoras para verificar:

1. id: binance | URL: https://www.binance.com/en/fee/schedule
2. id: okx | URL: https://www.okx.com/fees
3. id: bybit | URL: https://www.bybit.com/en/help-center/article/Trading-Fee-Structure
4. id: bitget | URL: https://www.bitget.com/en/rate/fee
5. id: kucoin | URL: https://www.kucoin.com/vip/privilege
6. id: mexc | URL: https://www.mexc.com/fee
7. id: foxbit | URL: https://foxbit.com.br/taxas
8. id: novadax | URL: https://www.novadax.com.br/taxas-e-limites
9. id: brasil-bitcoin | URL: https://brasilbitcoin.com.br/taxas
10. id: coinext | URL: https://coinext.com.br/taxas
11. id: bitso | URL: https://bitso.com/fees
12. id: mercado-bitcoin | URL: https://www.mercadobitcoin.com.br/taxas
13. id: bitpreco | URL: https://bitpreco.com/taxas
14. id: coinbase | URL: https://help.coinbase.com/en/coinbase/trading-and-funding/pricing-and-fees
15. id: kraken | URL: https://www.kraken.com/features/fee-schedule
16. id: gate-io | URL: https://www.gate.io/fee
17. id: htx | URL: https://www.htx.com/fee/
18. id: crypto-com | URL: https://crypto.com/exchange/fees-and-limits
19. id: bingx | URL: https://bingx.com/en-us/support/articles/fees
20. id: bitmart | URL: https://www.bitmart.com/fee/en

Importante:
- Use sempre decimal, não percentual (0.001, não 0.1 nem "0.1%")
- Se maker e taker forem iguais, repita o valor nos dois campos
- Se não conseguir acessar uma URL, inclua o id no JSON com os valores null e adicione uma nota "Could not access page."
- Retorne SOMENTE o array JSON, sem texto adicional
```

---

## ✅ Passo 2 — Validar o retorno do ChatGPT

1. O ChatGPT vai retornar um array JSON. **Verifique se:**
   - Tem exatamente 20 itens
   - Nenhum valor está `null` (se tiver, acesse a URL manualmente)
   - Os valores `maker` e `taker` são decimais (entre 0 e 0.1, tipicamente)

2. **Se algum valor parecer estranho** (ex: `maker: 1.0`), acesse a URL da corretora e confirme.

---

## ✏️ Passo 3 — Atualizar o `exchanges.json`

1. Abra o arquivo `data/exchanges.json` no VS Code
2. Para cada corretora que teve mudança, atualize os campos `fees.maker`, `fees.taker`, `fees.note` e `fees.fee_url`
3. **Sempre atualize também o campo `updated_at`** com a data de hoje no formato ISO:
   ```
   "updated_at": "2026-05-01T00:00:00Z"
   ```
4. Salve o arquivo

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
4. No campo **Message**, escreva:
   ```
   chore: atualiza taxas das corretoras - revisão mensal YYYY-MM
   ```
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

## 🗂️ Lista de todas as corretoras monitoradas

| # | ID | Nome | País | Pix | Página de Taxas |
|---|---|---|---|---|---|
| 1 | `binance` | Binance | Global | ❌ | [link](https://www.binance.com/en/fee/schedule) |
| 2 | `okx` | OKX | Global | ❌ | [link](https://www.okx.com/fees) |
| 3 | `bybit` | Bybit | Global | ❌ | [link](https://www.bybit.com/en/help-center/article/Trading-Fee-Structure) |
| 4 | `bitget` | Bitget | Global | ❌ | [link](https://www.bitget.com/en/rate/fee) |
| 5 | `kucoin` | KuCoin | Global | ❌ | [link](https://www.kucoin.com/vip/privilege) |
| 6 | `mexc` | MEXC | Global | ❌ | [link](https://www.mexc.com/fee) |
| 7 | `foxbit` | Foxbit | 🇧🇷 Brasil | ✅ | [link](https://foxbit.com.br/taxas) |
| 8 | `novadax` | NovaDAX | 🇧🇷 Brasil | ✅ | [link](https://www.novadax.com.br/taxas-e-limites) |
| 9 | `brasil-bitcoin` | Brasil Bitcoin | 🇧🇷 Brasil | ✅ | [link](https://brasilbitcoin.com.br/taxas) |
| 10 | `coinext` | Coinext | 🇧🇷 Brasil | ✅ | [link](https://coinext.com.br/taxas) |
| 11 | `bitso` | Bitso | 🇧🇷 Brasil | ✅ | [link](https://bitso.com/fees) |
| 12 | `mercado-bitcoin` | Mercado Bitcoin | 🇧🇷 Brasil | ✅ | [link](https://www.mercadobitcoin.com.br/taxas) |
| 13 | `bitpreco` | BitPreço | 🇧🇷 Brasil | ✅ | [link](https://bitpreco.com/taxas) |
| 14 | `coinbase` | Coinbase | Global | ❌ | [link](https://help.coinbase.com/en/coinbase/trading-and-funding/pricing-and-fees) |
| 15 | `kraken` | Kraken | Global | ❌ | [link](https://www.kraken.com/features/fee-schedule) |
| 16 | `gate-io` | Gate.io | Global | ❌ | [link](https://www.gate.io/fee) |
| 17 | `htx` | HTX | Global | ❌ | [link](https://www.htx.com/fee/) |
| 18 | `crypto-com` | Crypto.com | Global | ❌ | [link](https://crypto.com/exchange/fees-and-limits) |
| 19 | `bingx` | BingX | Global | ❌ | [link](https://bingx.com/en-us/support/articles/fees) |
| 20 | `bitmart` | BitMart | Global | ❌ | [link](https://www.bitmart.com/fee/en) |

---

## ❓ Dúvidas frequentes

**O ChatGPT retornou um valor diferente do que está no JSON — o que faço?**  
Se a diferença for pequena (ex: `0.001` vs `0.0010`), é o mesmo valor. Se for realmente diferente, confira a URL manualmente antes de aceitar.

**Posso pedir para a IA atualizar diretamente o arquivo no GitHub?**  
Sim! Você pode pedir para o Perplexity (ou qualquer IA com acesso ao GitHub MCP) fazer isso. Basta dizer: _"Atualize as taxas do exchanges.json com base nestes dados e abra um PR"_ e colar o JSON retornado pelo ChatGPT.

**O workflow `validate-schema` falhou no PR — o que faço?**  
Clique em **Details** ao lado do check vermelho para ver o erro. Geralmente é um campo com tipo errado (string onde deveria ser number). Corrija no `exchanges.json` e faça um novo commit no mesmo branch — o PR atualiza automaticamente.

**Preciso atualizar todas as 20 corretoras todo mês?**  
Não. Só atualize as que tiveram mudança de taxa. Mas **sempre atualize o `updated_at`** de todas as que você verificou, mesmo que os valores não tenham mudado — isso reseta o contador de staleness.
