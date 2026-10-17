# 04 — Comparison of free LLMs and final recommendation (status October 2026)

> **How to read this file:** free-tier numbers **conflict** between sources, and the official pages of all of them could not be read in this session. The "level" column shows where each number came from. **Before relying on them, verify with a small test (one day, 10 requests) and by checking each provider's console.**

---

## 1. Geographic restrictions and regional terms (more important than the numbers)

> **User status (statement of 2026-10-16):** the user is outside Iran. However, each provider has its own regional terms and they **must be confirmed for the user's actual country**. The column below shows the status for Iran, because the stated restrictions of Gemini, OpenAI and Upwork are at that level.

| Provider | Regional status (Iran; for comparison) | Source | Level |
|---|---|---|---|
| **Gemini API / AI Studio** | Iran is not in the "Available regions" list (updated 2026-04-28). Terms: "You may only access the Services … within an available region." | [Available regions](https://ai.google.dev/gemini-api/docs/available-regions) and [Terms](https://ai.google.dev/gemini-api/terms) | **[Official]** |
| **OpenAI (ChatGPT/API)** | Direct access from Iran is restricted; OpenAI was reported in 2026 to consider Iran out of service. | [Cryptobriefing (2026-10)](https://cryptobriefing.com/openai-disrupts-iranian-fake-articles-campaign/), [Moveo (2026-05)](https://moveo.ai/blog/countries-where-chatgpt-is-banned) | [Multiple sources] |
| **Upwork** | **Prohibited** for registration and use (official) | [Eligibility](https://support.upwork.com/hc/en-us/articles/211067778-Who-s-eligible-to-join-and-use-Upwork) | **[Official]** |
| Groq, OpenRouter, Cerebras, Mistral, Cloudflare Workers AI | **Unconfirmed.** These providers may or may not have country restrictions in their terms; check the "Supported countries/Terms" page of each. | — | [Unconfirmed] |
| Ollama / llama.cpp (local model) | No dependency on an external service **after downloading the model**; downloading a model from foreign sites may be restricted (unconfirmed). | Inference | Inference |

### Explicit message
1. **Check the country:** before registering, review each provider's allowed-region page for the country you actually live in (Gemini: "Available regions"; others: Terms/Supported countries pages).
2. **Accounts in your real name:** API keys and accounts must be created in your name with your real information. Using someone else's account or false information violates the terms of all these services.
3. **Circumvention is not recommended:** a VPN, proxy or server used to hide your location risks account termination, and this file does not recommend it.
4. **A server only runs code:** your VPS does not solve an account restriction; the restriction is based on the location and identity of the account holder.
5. The numbers below must be tested under your real conditions.

---

## 2. Comparison table (free tier)

> Columns: **Extract** = structured extraction; **Write** = English writing; **Privacy** = whether data is used for training; **Risk** = likelihood of the free tier changing/being removed.

| Provider | Suggested models | RPM | RPD | TPM / TPD | Context | JSON/Structured | Extract | Write | Privacy | Free-tier risk | Number level |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Google Gemini API (Unpaid)** | Gemini 3 Flash; 2.5 Flash; 3.1 Flash-Lite | 10 (3 Flash) / 15 (Flash-Lite) | 1500 (3 Flash) / 1000 (Flash-Lite) | 250K TPM | 1M | Supported (public docs; **needs testing**) | ★★★★ | ★★★★ | **Unpaid: Google uses data to improve its products and human reviewers may read it.** Paid: not used for training. | Medium (free tier can change) | Numbers: [multiple third-party sources]; **official not read in this session** |
| **Groq** | openai/gpt-oss-120b / 20b; Qwen (current list) | 30 | 1000 (large models) / 14,400 (small models, third-party) | **8K TPM and 200K TPD** (large model) | 128K | Supported (needs testing) | ★★★★ | ★★★ (120b) | **Unconfirmed** | Medium; the model list differs between third-party sources | Numbers from the **official** Developer plan page ([Rate limits](https://console.groq.com/docs/rate-limits)): 30 RPM / 1K RPD / 8K TPM / 200K TPD for gpt-oss-120b |
| **OpenRouter (`:free` models)** | `openrouter/free` or `:free` models (changeable) | 20 | **50** (under $10 credit) / **1000** (after a one-time ~$10 credit) | Unconfirmed | Variable | Variable | ★★★ | ★★★ | **Some free models may train on prompts**; turn off the "may train" setting | High (the model list changes often) | [Multiple third-party sources agree: aireiter (2026-08), klymentiev (2026-09)] — officially unconfirmed |
| **Cerebras** | GPT-OSS / Llama (selected models) | **Conflict:** 30 (source A) / ~5 (source B) | — | **Conflict:** 1M tokens/day (A) / 30K TPM (B) | 8K on free (source B) | Unconfirmed | ★★★ | ★★★ | Unconfirmed | Medium | **[Conflict between sources]** |
| **Mistral (La Plateforme, Experiment)** | Mistral Small / Large; Codestral | ~2 (user reports) | — | ~1B tokens/month (report) | 32K–256K | Supported (needs testing) | ★★★ | ★★★★ | Unconfirmed | Medium; limits are not published | **[Single source / user report]** |
| **Cloudflare Workers AI** | Llama 3.x 8B; other models | — | — | **10,000 Neurons/day** (a proprietary unit, not tokens) | Short/medium | Unconfirmed | ★★★ | ★★ | Claims no training on customer data (third party) | Low to medium | [Third party] |
| **Ollama (local)** | Qwen2.5 7B–14B; Llama 3.1 8B; Gemma 3 (available generations) | Unlimited (hardware) | Unlimited | — | 8K–128K depending on the model | With grammar/JSON mode (needs testing) | ★★★ (7B) / ★★★★ (14B) | ★★★ (7B) / ★★★★ (14B) | **Data stays on your machine** | None (electricity/hardware cost) | Inference; needs testing |

**Additional notes:**
- **Gemini 2.5 Pro:** third-party sources say it was removed from the free tier (1 April 2026) or has 50 RPD; **conflict**. Not needed for this project.
- **Groq:** the list of free models differs between third-party sources; check the console before pinning a model name.
- **Google Search grounding** and **Vertex AI** are not needed for this project.

---

## 3. Real volume calculation (with assumptions)

**Assumptions (explicit):**
- Per job: one email → simplified text ≈ 1,500–2,500 input tokens (including the system prompt).
- Separate scoring: ≈ 1,500 input + 300 output.
- Proposal only for APPLY/MAYBE (≈ 30% of jobs): ≈ 2,500 input + 400 output.
- Retry ≈ 10%.

| Emails/day | Calls/day (≈) | Input tokens/day (≈) | Output tokens/day (≈) | Free-tier fit |
|---|---|---|---|---|
| **20** | ~50 | ~100K | ~15K | ✅ All main options are sufficient |
| **100** | ~250 | ~500K | ~80K | ✅ Gemini (if the numbers are confirmed); ⚠️ Groq 120b: **TPD 200K** is insufficient; ⚠️ OpenRouter: only after a $10 credit |
| **200** | ~500 | ~950K | ~165K | ⚠️ Gemini: RPD is sufficient but Flash-Lite is better for extraction; ❌ Groq 120b; ⚠️ Cerebras (borderline if 1M/day is confirmed) |

**Calculation result:** for 20 to 50 jobs per day, the free tier is sufficient. For 200 jobs, **the main limit is TPD/TPM, not RPD**; solutions:
1. **Shrink the input:** convert HTML to clean text, remove footers and tracking links (target ≤ 800 input tokens for extraction).
2. **Prompt caching:** on Groq, "Cached tokens do not count towards your rate limits" (official). Cache the constant system prompt.
3. **Small model for extraction:** Gemini Flash-Lite or an 8B model; the large model only for proposals.
4. **Queue + backoff:** process emails at a controlled rate; there is no rush.

---

## 4. Final recommendation + fallback chain

### Primary choice (assuming the user is in an allowed country with a legal account)
| Task | Primary model | Fallback 1 | Fallback 2 (essential for stability) |
|---|---|---|---|
| Extraction (JSON) | Gemini Flash-Lite / 2.5 Flash | Groq gpt-oss-20b (200K TPD) | Local Ollama (Qwen2.5 7B/14B) |
| Scoring (explanation + subscores) | Gemini 3 Flash | Groq gpt-oss-20b | Ollama |
| Proposal (English writing) | Gemini 3 Flash | Groq gpt-oss-120b (low TPD; proposals only) | OpenRouter `:free` (after $10) or Ollama 14B |

### Fallback logic
```text
call(provider_chain, prompt):
  for p in chain:
    if p.circuit_open: continue
    try:
      return p.call(prompt, timeout=45s)
    except RateLimit429 as e:
        p.mark_cooldown(e.retry_after or 60s)   # respect Retry-After
    except Timeout/5xx:
        retry(2, backoff=exp+jitter); continue
    except SchemaInvalid:
        retry_once_with_fix_prompt(); continue
  enqueue_for_later(job)   # retry after the quota resets (UTC/PT)
  notify_admin("all providers failed", job_id)
```

**Rules:**
- Validate every output as JSON; a schema error = retry once.
- Log every call in an `llm_calls` table (provider, model, tokens, latency, error).
- API keys in `.env` with file permission 600; never in Git or logs.
- Sending data to a free tier: **only Upwork emails (no other personal information)**. Given the Unpaid Gemini terms, never send sensitive information (address/phone/bank details/unrelated email text).

### If the free tier is not enough
- **Gemini paid** (Flash-Lite): third-party sources report an input cost of about $0.10 per million tokens; for 200 jobs/day the monthly cost is probably **a few dollars** (approximation; check official pricing before buying). **Note:** paying with an international card depends on your country and bank; test before buying.
- **Local-first:** a server/home computer with 16–24 GB RAM and Ollama; lowest monthly cost, slower, English quality below large models (inference).

---

## 5. Hardware for local models (inference, needs testing)

| Approximate model | RAM/VRAM (Q4) | Extraction quality | English writing quality |
|---|---|---|---|
| 7–8B | ~6–8 GB | Good for simple fields | Average; needs more review |
| 14B | ~12–16 GB | Good | Good |
| 30B+ | ~20–24 GB+ | Excellent | Excellent; needs a stronger server |

CPU-only is slow for 14B, but acceptable for a non-real-time queue (20–200 jobs/day).

---

## 6. Conflicts and "unconfirmed" (summary)

| Topic | Status |
|---|---|
| Gemini free RPD/RPM per model | Conflict between third-party sources; **official not read in this session** |
| Gemini Pro on the free tier | Conflict (removed in April 2026 or 50 RPD) |
| Groq free model list | Conflict; the official Developer base limits page was read |
| Cerebras | Strong conflict (30 RPM/1M tokens vs 5 RPM/30K TPM) |
| Mistral | Limits unpublished; numbers from user reports |
| Regional terms of Groq/OpenRouter/Cerebras/Mistral/Cloudflare for the user's country | **Unconfirmed**; check before registering |
| International card payment for the user | Unconfirmed; test with your own bank/card |
