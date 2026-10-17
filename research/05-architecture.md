# 05 — System architecture (Option B: Lambda + EventBridge)

> **Decision:** the user chose **Option B**: automatic execution every 5 minutes with AWS Lambda and EventBridge. The manual `/check` path and Telegram Serverless were set aside. Reason: "it should be automatic".
> **Implementation:** the `bot/` folder in this repository. Setup guide: `bot/README.md`; account-owner deployment guide: `bot/DEPLOY-AWS.md`.

## 1. Overall flow

```
EventBridge Scheduler (rate(5 minutes))
   │
   ▼
Lambda: upwork-agent (nodejs22.x, arm64, 256 MB, timeout 300 s, concurrency 1)
   │ 1. reads secrets from SSM Parameter Store (SecureString)
   │ 2. Gmail API: label:"Upwork-Alerts" + is:unread emails (up to MAX_PER_RUN)
   │ 3. cleans the text, LLM extracts, deterministic scoring (G1–G7 + weights)
   │ 4. only 🟢 APPLY / 🟡 MAYBE jobs: draft a proposal with the LLM
   │ 5. sends the message to the owner with the Telegram Bot API (sendMessage)
   │ 6. after a successful send, removes UNREAD
   ▼
Telegram (your phone) → you review and submit manually on Upwork
```

## 2. Components and why they were chosen

| Component | Role | Why |
|---|---|---|
| **EventBridge Scheduler** | Run every 5 minutes | Official AWS scheduler; large free tier |
| **Lambda** | Execute the logic | No permanent server; free tier: 1 million requests and 400,000 GB-seconds per month (unconfirmed: check pricing and limits on the official AWS page) |
| **SSM Parameter Store** | Store keys | SecureString encrypted with KMS; Standard is free; no database |
| **Gmail API** | Read email and remove UNREAD | The only dedupe state; no database needed |
| **Gemini → Groq → OpenRouter** | LLM with fallback | All free tier or open-weight; details in `04` |
| **Telegram Bot API** | Send messages | Free; no webhook (outbound only) |
| **CloudWatch Logs** | Logs | 14-day retention (set in the template) |

**Nothing is stored:** no email text, proposal or database. The only state is the UNREAD label in Gmail.

## 3. Error handling

| Situation | Behaviour |
|---|---|
| Transient error (network, LLM quota, Gmail 5xx) | Log; the email stays UNREAD; the next run tries again. **Nothing is sent to Telegram.** |
| Permanent error for one email (no job link, invalid LLM output) | One notification to Telegram; the email is marked read so it does not repeat |
| Whole-run error (e.g. invalid Gmail Refresh Token) | A `⚠️` message to the owner on every run until fixed; AWS does not retry |
| Successful send but UNREAD removal fails | The next run sends it again. **Accepted risk**; cause: no database |
| Concurrent executions | `ReservedConcurrentExecutions: 1` prevents it |

## 4. Security and ToS

- **There is no automatic proposal submission.** The bot only scores and drafts; you submit.
- **Keys** live only in SSM; they are not in Git or in Lambda environment variables. IAM only allows `ssm:GetParametersByPath` on `/upwork-agent/*` and `kms:Decrypt` through SSM.
- **Privacy:** email text goes to the LLM provider. The Gemini terms (version of 23 March 2026) say free-service inputs may be used to improve the product. **Your confirmation is required.**
- **Upwork:** using alert emails with an automated tool for analysis, not automatic submission, is within the scope of your commitment. The exact ToS clause about this is **unconfirmed**; review it before using the tool at scale.
- **Access from Iran:** Upwork is restricted for Iran and this project offers no way around it. The account holder has stated they live outside Iran.

## 5. Limitations

- **Scheduling:** minimum interval 5 minutes; emails arrive with at most a few minutes' delay (unconfirmed: the 15-minute delay of Upwork emails comes from secondary sources).
- **Capacity:** `MAX_PER_RUN` (default 5, maximum 10) per run; the rest wait for the next run.
- **LLM quota:** the free tier is limited; for ~200 emails per day it may not be enough (unconfirmed for each service; check before use).

## 6. Phases

| Phase | Content | Completion criterion |
|---|---|---|
| **0 — Preparation** | AWS account, AWS CLI and SAM CLI, Gmail and Google OAuth, BotFather, LLM keys | `aws sts get-caller-identity` works |
| **1 — Foundation** | `npm test` (31 tests), `npm run build`, `sam deploy`, storing secrets | `aws lambda invoke` without errors and a Telegram message for a test email |
| **2 — Quality** | Real profile, review of 20 test emails | At least 18 correct extractions out of 20 |
| **3 — Operations** | Automatic execution, one week of log monitoring | No repeating errors |

## 7. Sources

- AWS Lambda, EventBridge Scheduler, SSM Parameter Store: official AWS documentation (unconfirmed: current pricing and quota details).
- Telegram Bot API `sendMessage` and the 4,096-character and 429 limits (secondary source; verify against the official `core.telegram.org/bots/api` docs).
- Gmail API `users.messages.list`, `users.messages.get`, `users.messages.modify`.
- Tooling: AWS SAM (`infra/template.yaml`), Node.js 22.
