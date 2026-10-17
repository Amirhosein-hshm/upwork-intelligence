# 07 — Learning guide for the project's tools (Option B)

> **Status:** this file has been updated. The Telegram Serverless guide is no longer the implementation path. This version explains the tools actually used. The file name is kept for compatibility with earlier links.
> **Confidence rule:** check anything marked "unconfirmed" before using it.

## 1. Key concepts

| Concept | Simple explanation | In this project |
|---|---|---|
| **Serverless / Lambda** | Run code without a permanent server; AWS charges only for execution time | The `upwork-agent` function |
| **Trigger / Scheduler** | What starts a run | EventBridge Scheduler, every 5 minutes |
| **IAM** | Defines what the function is allowed to do | Read SSM and Decrypt only |
| **SSM Parameter Store** | A safe place for settings and keys | SecureString with the `/upwork-agent/` prefix |
| **SAM / CloudFormation** | A YAML template that describes the whole infrastructure | `bot/infra/template.yaml` |
| **OAuth2 Refresh Token** | Long-lived permission to read Gmail | `GMAIL_REFRESH_TOKEN` |
| **Gmail label and UNREAD** | The "not processed" state without a database | `Upwork-Alerts` label and `is:unread` |
| **LLM and fallback** | A language model; if one fails, the next one is used | Gemini → Groq → OpenRouter |
| **Schema / JSON validation** | Guarantees the model's output structure | `src/lib/validate.js` |
| **Hard gates and weighted score** | Deterministic rules before scoring | `src/lib/score.js` (G1–G7) |
| **Idempotency** | A repeated run should not produce a duplicate result | Only via UNREAD; the duplicate risk is described in `05` |

## 2. Practical tools

```bash
# Install and test
cd bot && npm install && npm test

# Build, then build and deploy the SAM package
npm run build
sam build --template-file infra/template.yaml
sam deploy --template-file .aws-sam/build/template.yaml --stack-name upwork-agent \
  --capabilities CAPABILITY_IAM --resolve-s3 --region eu-west-2

# Watch the logs
aws logs tail /aws/lambda/upwork-agent --follow --region eu-west-2
```

## 3. Suggested learning path

1. **JSON and HTTP:** reading a `fetch` response and JSON structure.
2. **Gmail API:** `messages.list` with `q=`, then `messages.get`, then `messages.modify`.
3. **OAuth:** why a Refresh Token is needed and the Access Token is short-lived.
4. **Lambda:** handler, timeout, logs, and the difference between a function and a server.
5. **EventBridge Scheduler:** `rate(5 minutes)` and how it differs from cron.
6. **LLM:** tokens, context window, structured output and fallback.

## 4. Sources

- Official AWS Lambda, EventBridge Scheduler, SSM and SAM documentation.
- Official Gmail API documentation.
- Telegram Bot API `sendMessage` (verify against the official docs).
