## Pull Request

### Type of Change

<!-- Check all that apply -->

- [ ] 💰 Fee update (maker/taker/withdrawal)
- [ ] 🏦 New exchange added
- [ ] 🇧🇷 CNPJ correction / Brazil registration update
- [ ] 📋 BCB license status change
- [ ] 💱 Pix support change
- [ ] 🔗 URL / website correction
- [ ] 🪙 Stablecoin / fiat list update
- [ ] 📅 `updated_at` refresh (must include source — see below)
- [ ] 🛠 Other (describe below)

---

### Exchange(s) Affected

<!-- List the exchange name(s) and id(s) this PR modifies -->

| Exchange | ID |
| --- | --- |
|  |  |

---

### Source URL(s)

<!--
Every data change MUST include a verifiable source.
Acceptable sources: official exchange fee page, official press release,
Banco Central do Brasil registry, Receita Federal CNPJ query.
PRs with no source will be closed.
-->

- **Source:** <!-- e.g. https://www.binance.com/en/fee/schedule — accessed 2026-04-01 -->

---

### Verification Checklist

- [ ] I personally visited the exchange's official website to verify this data.
- [ ] The `updated_at` field has been set to today's date in ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`).
- [ ] `fee` values are expressed as **decimals** (e.g. `0.001` for 0.1%), not percentages.
- [ ] If a CNPJ is included, it matches the format `00.000.000/0000-00` and was verified on the Receita Federal website.
- [ ] I ran `npm run validate` locally and it passed with exit code 0.
- [ ] I have not introduced any duplicate `id` fields.

---

### Notes

<!-- Optional: any context, caveats, or links that reviewers should know about -->

---

> ⚠️ **Data quality reminder:** Only submit data you have personally verified.
> PRs that only update `updated_at` without a source, or that contain unverifiable
> data, will be rejected. See [CONTRIBUTING.md](../docs/CONTRIBUTING.md) for full guidelines.
