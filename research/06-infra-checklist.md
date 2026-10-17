# 06 — Accounts and setup checklist (Option B: Lambda)

> **Infrastructure:** AWS Lambda + EventBridge Scheduler + SSM Parameter Store. No permanent server, database or VPS is needed. Telegram Serverless is no longer used.
> **Step-by-step guide:** `bot/README.md` for developers; `bot/DEPLOY-AWS.md` for the AWS account owner.

## 1. Accounts

| # | Service | Purpose | Cost | Needs confirmation | Status |
|---|---|---|---|---|---|
| 1 | **AWS** | Lambda, EventBridge, SSM, CloudWatch | Free tier; a card is required | Region choice (e.g. `eu-west-2` London); read the sign-up terms | ☐ |
| 2 | **Gmail** (dedicated) | Upwork-Alerts emails | Free | — | ☐ |
| 3 | **Google Cloud** (Gmail API + OAuth Desktop) | Refresh Token | Free | ⚠️ Confirmed 2026-10-17: with publishing status "Testing", the refresh token expires after 7 days; publish the app or refresh weekly | ☐ |
| 4 | **Telegram** + BotFather | Send messages | Free | — | ☐ |
| 5 | **Google AI Studio** (Gemini) | Primary LLM | Unconfirmed: free-tier quota | Confirm: data-use clause in the Gemini terms | ☐ |
| 6 | **Groq** (optional) | Fallback, open-weight | Unconfirmed: quota | Groq terms | ☐ |
| 7 | **OpenRouter** (optional) | Fallback, `:free` models | Unconfirmed: quota | OpenRouter terms | ☐ |
| 8 | **GitHub** (private repository) | Code | Free | — | ☐ |

**Regional access:** the user is outside Iran; regional restrictions for these services are accepted, but **confirm each service's regional terms yourself.**

## 2. Local tools

- [ ] Node.js 22 (`node -v`)
- [ ] AWS CLI v2 and `aws configure` or SSO; `aws sts get-caller-identity` must work
- [ ] AWS SAM CLI (`sam --version`)
- [ ] Git

## 3. Steps

1. **Gmail and OAuth:** label and filter, Google Cloud project, Desktop client, `npm run token` → Refresh Token.
2. **Telegram:** `/newbot` in BotFather; `/start` to the bot; `getUpdates` to obtain `chat.id`.
3. **Build:** `cd bot && npm install && npm test && npm run build`.
4. **SSM:** `npm run secret -- <NAME>` for each secret (hidden input).
5. **Profile:** complete `src/lib/profile.js` (every `[TODO]`).
6. **Deploy:** `sam build --template-file infra/template.yaml` then `sam deploy ...` (see `bot/DEPLOY-AWS.md` for the exact command).
7. **Test:** `aws lambda invoke ...` and `aws logs tail /aws/lambda/upwork-agent --follow`.

## 4. Security checklist

- [ ] No key or token is in Git (`.gitignore` covers `build/`, `.aws-sam/`, `node_modules/`, `.env`, `*.secret`, `*.refresh-token`)
- [ ] Secrets exist only in SSM as SecureString
- [ ] Gmail is dedicated; the Refresh Token has the `gmail.modify` scope
- [ ] An AWS cost alert is enabled in Billing (suggested: a low threshold)
- [ ] The user has confirmed that email text is sent to the LLM

## 5. Maintenance

| Task | Frequency |
|---|---|
| Review CloudWatch logs for repeating errors | Weekly during the first month |
| Check LLM quotas and model changes | Monthly |
| Review Upwork and Gemini terms | Quarterly |
| Update the Node.js runtime in the template | When AWS deprecates the version |
| Regenerate the Gmail refresh token | Weekly while the OAuth app is in "Testing"; not needed once it is "In production" |

## 6. Sources and confirmation

- Official AWS Lambda, EventBridge Scheduler, SSM, CloudFormation/SAM documentation.
- Prices and quotas: **unconfirmed** in this version; check before acting.
- Google OAuth refresh-token expiry in Testing status: official Google documentation, [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2).
