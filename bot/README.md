# Upwork Proposal Agent — setup and deployment guide (AWS Lambda)

Every 5 minutes, Lambda reads unread emails with the `Upwork-Alerts` label from Gmail, extracts and scores them with an LLM, drafts proposals for suitable jobs (🟢 APPLY / 🟡 MAYBE) and sends them straight to **Telegram**.

> **Important:** the bot never applies on Upwork by itself. Submitting a proposal is always manual and done by you.
> **Data:** email text and proposals are not stored. The only "processed" state is the `UNREAD` label in Gmail. Keys live in SSM Parameter Store (encrypted). Email text is sent to the LLM provider; read the Gemini / Groq / OpenRouter terms.

> **Deploying for someone else?** Hand them [`DEPLOY-AWS.md`](DEPLOY-AWS.md), a self-contained step-by-step guide for the AWS account owner.

---

## 0. Prerequisites

| Item | Reason | Cost |
|---|---|---|
| AWS account (identity-verified, with a card) | Lambda, EventBridge Scheduler, SSM, CloudWatch | Free tier; estimate: zero to a few cents per month (unconfirmed: check prices on the AWS pages) |
| AWS CLI v2 with access (`aws configure` or SSO) | Store secrets and run commands | Free |
| AWS SAM CLI | Deploy the `infra/template.yaml` template | Free |
| Node.js 22 | Test and build the package (tested on Node 22) | Free |
| Dedicated Gmail + `Upwork-Alerts` label | Source of job emails | Free |
| Google Cloud + Gmail API + OAuth Desktop | Gmail access | Free (⚠️ refresh token expires after 7 days while the OAuth app is in "Testing"; see section 1) |
| BotFather (Telegram bot) | Send messages | Free |
| Gemini key (Google AI Studio) | Primary LLM | Free (⚠️ unconfirmed: quota) |
| Groq or OpenRouter key (optional) | Fallback | Free (⚠️ unconfirmed) |

**AWS region:** the examples use `eu-west-2` (London). Any AWS region works; pick the one closest to you and use the same region in every command.
**Before signing up:** make sure each service is allowed in your country and that all accounts are in your real name.

---

## 1. Gmail and the Gmail API (once)

1. Create the `Upwork-Alerts` label and a filter in Gmail (label Upwork emails).
2. Create a project in Google Cloud and enable the **Gmail API**.
3. **OAuth consent screen**: External; add your own Gmail address as a Test user.
4. Create an **OAuth client ID** of type **Desktop app**. Keep the Client ID and Client secret.
5. Get a Refresh Token on your own machine:

```bash
cd bot
GMAIL_CLIENT_ID='...' GMAIL_CLIENT_SECRET='...' npm run token
```

A browser opens; sign in with the dedicated Gmail account and grant `gmail.modify`. The Refresh Token is printed in the terminal.

> ⚠️ **Refresh-token lifetime:** while the OAuth consent screen's publishing status is **Testing**, Google issues refresh tokens that **expire after 7 days**, and Gmail scopes are not exempt. Either (a) switch the publishing status to **In production** after creating the token, or (b) repeat `npm run token` every 7 days. Publishing an app with restricted Gmail scopes may require Google verification; for single-user use the unverified-app warning is usually acceptable. See [Google's OAuth documentation](https://developers.google.com/identity/protocols/oauth2).

---

## 2. Telegram bot and your chat ID

1. In **@BotFather**, create a bot with `/newbot`. Keep the **token** (format `123456:ABC...`). This is the normal bot token, not a CLI token.
2. Send `/start` to your bot once.
3. Open this URL in a browser (replace `<TOKEN>` with your token):
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
   In the JSON output, find the `"chat":{"id": ...}` value. That number is your **OWNER_TG_ID**.

> If a webhook is enabled, `getUpdates` returns nothing; a new bot normally has no webhook.

---

## 3. Install, test and build

```bash
cd upwork-intelligence/bot
npm install
npm test          # 31 tests; all must pass
npm run build     # creates build/pkg (code and lib; no npm dependencies)
```

---

## 4. Store secrets in SSM (once, with hidden input)

Authenticate the AWS CLI and choose the region:
```bash
export AWS_REGION=eu-west-2
aws sts get-caller-identity     # must show your account
```

Provide each secret separately (the value is typed hidden and does not stay in shell history):
```bash
npm run secret -- TELEGRAM_BOT_TOKEN
npm run secret -- OWNER_TG_ID
npm run secret -- GMAIL_CLIENT_ID
npm run secret -- GMAIL_CLIENT_SECRET
npm run secret -- GMAIL_REFRESH_TOKEN
npm run secret -- GEMINI_API_KEY
# Optional:
npm run secret -- GROQ_API_KEY
npm run secret -- OPENROUTER_API_KEY
npm run secret -- GMAIL_QUERY           # if the label name differs: label:"name" is:unread
npm run secret -- GEMINI_MODEL          # if you want a different model
```

All allowed names are in `src/lib/config.js`.

> Security note: these values are SecureString parameters in SSM; Lambda reads them from SSM at runtime and they are not placed in environment variables.

---

## 5. Your profile (required)

Open `src/lib/profile.js` and replace every `[TODO]` with your own facts: skills, minimum rates, blocked countries (optional) and provable results. While any `[TODO]` remains, nothing is sent and an error is logged.

---

## 6. Deploy

```bash
npm run build
sam build --template-file infra/template.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name upwork-agent \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --region eu-west-2
```

The first deployment can take a few minutes. After changing code or the profile, run the same commands again.

> `sam deploy --guided` is an interactive alternative; it asks for the stack name, region and parameter values.

---

## 7. Verify the run

Invoke once manually (without waiting 5 minutes):
```bash
aws lambda invoke --function-name upwork-agent --region eu-west-2 out.json && cat out.json
aws logs tail /aws/lambda/upwork-agent --follow --region eu-west-2
```

If there is a suitable job, a message arrives in Telegram. Review the draft, fill in the `placeholder`s and **submit it yourself** on Upwork.

---

## 8. Pause and removal

- **Pause temporarily:** in the AWS console → **EventBridge → Scheduler**, disable the schedule that targets the function.
- **Remove completely:** `aws cloudformation delete-stack --stack-name upwork-agent --region eu-west-2` (and delete the secrets from SSM: `aws ssm delete-parameters --names ...`).

---

## 9. Troubleshooting

| Log / Telegram message | Meaning | Action |
|---|---|---|
| `Could not load credentials` | No AWS CLI credentials or permission | `aws configure` or SSO |
| `Incomplete configuration: …` | A secret is missing | Section 4 |
| `lib/profile.js is not complete yet` | A `[TODO]` remains | Section 5 |
| `⚠️ Scheduled run failed` (Telegram) | A whole-run error, e.g. an invalid Gmail token | Check the logs; update the secret |
| `transient failure, will retry next run` (log) | A temporary LLM or Gmail error; the email stays UNREAD | Usually resolves itself; if it repeats, check the quota and key |
| `⚠️ One email could not be processed` (Telegram) | The email is structurally broken (e.g. no job link); it is marked read | Check it manually in Gmail |
| `invalid_grant` in Gmail | Refresh Token expired or was revoked | Repeat section 1 and update `GMAIL_REFRESH_TOKEN` |

---

## 10. Technical notes and limitations

- **Scheduling:** every 5 minutes (`rate(5 minutes)`). `ReservedConcurrentExecutions: 1` means runs never overlap.
- **Capacity:** each run processes at most `MAX_PER_RUN` emails (default 5). The rest wait for the next run.
- **Duplicates:** if the Telegram message was sent but removing `UNREAD` failed, the same email may be sent again. This risk is accepted.
- **AWS automatic retries are disabled** (`MaximumRetryAttempts: 0`). Failed emails are checked again on the next run.
- **Execution time limit:** Lambda allows at most 900 seconds; we use 300. If the LLM is slow, raise `Timeout` in `infra/template.yaml`.
- **Telegram Serverless:** no longer used (it has no scheduler). Its old code remains in the Git history.
- **Models and quotas:** free-tier model names and quotas change; check the official page of each service before relying on them.
- **Secrets cache:** a warm Lambda container caches SSM values. After changing a secret, the new value applies on the next cold start (or force one by redeploying).

## 11. File map

```
bot/
├─ src/
│  ├─ lambda.mjs          ← Lambda entry point (SSM + Telegram)
│  ├─ package.json         ← type: module (for the runtime)
│  └─ lib/
│     ├─ pipeline.js       ← main flow of each run
│     ├─ gmail.js          ← Gmail API via fetch
│     ├─ llm.js            ← Gemini → Groq → OpenRouter
│     ├─ prompts.js        ← extract.v1 / score.v1 / proposal_writer.v1
│     ├─ validate.js       ← validation of LLM JSON output
│     ├─ score.js          ← hard gates G1–G7 and weighted score
│     ├─ clean.js          ← email text cleaning
│     ├─ format.js         ← Telegram message templates
│     ├─ profile.js        ← your profile (the only source of facts)
│     └─ config.js         ← secret loading and defaults
├─ infra/template.yaml     ← SAM: Lambda + 5-minute schedule + IAM + logs
├─ scripts/
│  ├─ build.sh             ← creates build/pkg
│  ├─ put-secret.mjs       ← store a secret in SSM (hidden input)
│  └─ get-refresh-token.mjs← obtain a Gmail Refresh Token
├─ test/                   ← npm test
├─ DEPLOY-AWS.md           ← guide for the AWS account owner
└─ package.json
```
