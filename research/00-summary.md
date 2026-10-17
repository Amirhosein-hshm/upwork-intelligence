# 00 — Executive Summary

**Date:** 2026-10-16 · **Status:** Option B (Lambda + EventBridge) is implemented in `bot/`. The AWS deployment path was reviewed on 2026-10-17 (`08-aws-deployability-review.md`) and is ready to deploy; see `bot/DEPLOY-AWS.md`.

---

## 1. Goal

An agent that:
1. reads **Upwork Job Alert** emails from a dedicated Gmail inbox,
2. extracts each job and scores it against your criteria,
3. writes an English **proposal draft** (2026 style) for suitable jobs,
4. shows the result in **Telegram**.

**You** open the job, review and edit the draft, and **submit it yourself** on Upwork. The agent never submits anything to Upwork.

---

## 2. Assumptions

- **Your location:** outside Iran, with no regional restrictions (your statement).
- **Accounts:** Upwork, Gmail, Telegram and the LLMs must be registered in your name with your real information; you confirm each service's regional terms yourself.
- **Volume:** 20 to 200 emails per day.
- **Target cost:** close to zero (free-tier sources).
- **No database and no server.** Processing state lives in Gmail (UNREAD).

---

## 3. Chosen architecture: Lambda + EventBridge (Option B)

> **User decision:** Option B, because "it should be automatic". The manual `/check` path and Telegram Serverless were dropped. Details: `05-architecture.md`; setup guide: `bot/README.md`.

### (Legacy section, kept for the record)

| Part | Choice | Reason |
|---|---|---|
| **Runtime** | Telegram Serverless (`npx tgcloud push`) | No server, no Lambda, no VPS |
| **Input** | `/check` command in Telegram | The only reliable trigger for that service |
| **Job source** | Gmail API (OAuth, `gmail.modify`) with the `Upwork-Alerts` label | IMAP is unavailable in that service |
| **Duplicate prevention** | Remove UNREAD after a successful send | No database needed |
| **LLM** | Gemini → Groq → OpenRouter `:free` (fetch) | Free tier and fallback |
| **Scoring** | Hard rules and weighted score in code (`03`) | Stable and testable |
| **Notification** | `api.sendMessage` with HTML and `<pre>` | Free and copy-friendly |
| **Upwork submission** | Always manual, by you | ToS and ban risk |

**The agent does:** read email, extract, score, draft, send to Telegram.
**You do:** send `/check`, review, submit manually on Upwork.

---

## 4. Important limitation of that decision

**Telegram Serverless alone cannot process automatically every 5 minutes.** Evidence:
- The published CLI (npm `@tgcloud/cli`) has no scheduling command.
- A real project (Postdesk) reports no scheduler, cron or inbound HTTP endpoint.
- The official page did not open for this session (403).

So there are two paths:

| Path | Advantage | Disadvantage |
|---|---|---|
| **A. Telegram Serverless with manual `/check`** (initial proposal) | Simplest; no server and no database | Processing happens only when you press `/check` |
| **B. Lambda + EventBridge for scheduling** | Automatic every 5 minutes | One extra service; requires AWS; Telegram Serverless is no longer needed |

---

## 5. Cost (estimate)

| Item | Monthly cost |
|---|---|
| Gmail, Telegram, Git, Telegram Serverless | $0 (unconfirmed: official Telegram Serverless pricing) |
| Google Cloud (Gmail API) | $0 (unconfirmed: quota and potential charges) |
| LLM (free tier, 20–50 jobs/day) | $0 (if the numbers are confirmed) |
| LLM (200 jobs/day) | About $0–3 (estimate) |
| **Total excluding Upwork** | **About $0–3** |
| Upwork Connects (separate) | About $20–60 (estimate; sources conflict) |

---

## 6. Main risks

1. **Manual processing:** if `/check` is forgotten, emails are processed late.
2. **Gmail token security:** a safe place to store the secret in Telegram Serverless was never published. **The most important security risk.**
3. **Data in Telegram infrastructure:** ordinary bot messages are not end-to-end encrypted and data retention is undocumented.
4. **New platform (July 2026):** runtime limits, memory and pricing were not published.
5. **Upwork and LLM terms:** the account country and the country of residence must be compatible; circumvention is not recommended.
6. **ToS and account ban (low with the current design):** provided submission is manual and no scraping is done.
7. **Unstable free tiers:** the numbers conflict between sources; verify with a test.
8. **Hallucination in proposals:** controlled with grounding, placeholders and claim review.
9. **Refresh Token expiry (Testing):** unconfirmed; must be checked. (Confirmed on 2026-10-17: a Testing-status OAuth app expires refresh tokens after 7 days; see `08`.)
10. **Conflicting Connects data:** must be collected from real job posts.

---

## 7. Important corrected findings

- **The official Upwork API** does have a `createJobProposal` mutation; a vendor source claimed it did not. API key access is hard to obtain (JSS ≥ 90%, $25K earnings, ID verification). **Recommendation:** do not submit through the API; the user submits manually.
- **The official Upwork MCP** requires human approval for every submission; this matches the proposed architecture.
- **Connects per job** is reported by third parties as 2 to 16 (or more); officially: "varies, shown in the job post".
- **Upwork AI disclosure** reports conflict; recommendation: original writing and honest disclosure.

Full details and confidence levels: `01` to `07`.

---

## 8. Decisions and remaining questions

1. ~~Manual processing with `/check`~~ — **user answer: no; Option B (Lambda) was chosen.**
2. **Upwork account:** is your account registered in your own name with your real country of residence, and is it in Upwork's allowed list? (Only you can confirm this.)
3. **Telegram or email:** do you want the result in Telegram or by email? (The current architecture uses Telegram.)
4. **Your profile:** main expertise, key skills, minimum rate/budget, and 2–3 successful proposals or references (no fabrication).

> ✅ Until questions 1 and 2 are answered, implementation does not start. With positive answers, the MVP (phases 0 to 3) takes about two weeks (per `05` and `07`).

---

## 9. File list

| File | Content |
|---|---|
| `01-upwork-2026-findings.md` | Upwork and ToS findings, with sources and confidence levels |
| `02-proposal-playbook.md` | Proposal structure, template, prohibitions and `proposal_writer.v1` |
| `03-job-scoring-rubric.md` | Hard gates, weighted score, `extract.v1`, `score.v1` |
| `04-llm-options.md` | LLMs and free tiers, with regional status |
| `05-architecture.md` | Lambda + EventBridge architecture, data flow, error handling, phases |
| `06-infra-checklist.md` | Accounts, cost, setup, security, maintenance |
| `07-telegram-serverless-guide.md` | Learning guide for the tools used by this project |
| `08-aws-deployability-review.md` | AWS deployability review, checks run and results |
| `../bot/DEPLOY-AWS.md` | Step-by-step deployment guide for the AWS account owner |
