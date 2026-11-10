# Advisor vs Aloke — Aloke Approve with advisors’ changes (7 Nov)

Aloke recorded **Approve with advisors' changes** on **D11, D12, D13, D15**. That is **not** full approval — advisor conditions/gates remain open; flags **OFF**.

| ID | Aloke | Blocking remaining | Fully? |
| --- | --- | --- | --- |
| D11 | Approve w/ advisors' changes | Legal design/test-only + before-live list; Finance hybrid pricing not final; Connect flag OFF | **No** |
| D12 | Approve w/ advisors' changes | Affiliate OFF; Legal/Finance activation | **No** |
| D13 | Approve w/ advisors' changes | Feature gates; Deskulpt Commerce India Pvt Ltd + Razorpay; IN counsel not engaged | **No** |
| D15 | Approve w/ advisors' changes | Add-on/BYO; media/PII gates | **No** |
| D07 | Approve | **Eng Reject** | **No** |
| D09 | Approve | **Eng Reject** (Finance Approve on policy) | **No** |
| D01–D06, D08, D14 | Approve | Various AwC | **No** |
| D10 | Pending | AwC | **No** |

### Entities / AI / pricing (Aloke)

- Deskulpt Inc (federal CA) — **GST/HST resolved** (CountryPack CA; tax flags OFF)  
- Deskulpt Commerce India Pvt Ltd — IN CA/lawyers not engaged  
- Cloudflare AI Gateway + Workers AI + daily neuron limits; real PII blocked  
- ON hybrid: CA$3–5/unit + 0.5–1% rent cap CA$15/unit + CA$10/mo min  

### Country paths

`/in` + `/ca` CountryPack implementation: **Country path routing** PR (`cursor/country-path-in-ca-1de0`). Pack `legalEntity` names match entities above. D11–D15 AwC; flags OFF.

Fully approved: **0**.


**GST/HST #:** resolved from Aloke PRD into billing tax identity / ON statement stubs. Flags OFF.
