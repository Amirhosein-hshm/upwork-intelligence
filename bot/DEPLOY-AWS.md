# Deploy the Upwork Proposal Agent on AWS

**A step-by-step guide for the AWS account owner.**

---

## At a glance

| | |
|---|---|
| **What it is** | A small scheduled program (AWS Lambda) that reads Upwork job-alert emails, scores the jobs, drafts English proposals and sends them to Telegram for review |
| **What it never does** | It never logs in to Upwork and never submits a proposal. The human submits manually |
| **Time needed** | 20–30 minutes |
| **Expected cost** | About **$0 per month** at the default rate (well inside the AWS Free Tier) |
| **What you need** | An AWS account, permission to create the resources listed in Step 1, and the handover package from the developer |
| **Difficulty** | Copy and paste. No AWS experience required beyond signing in |

By the end you will have:
- a Lambda function named `upwork-agent` that runs every 5 minutes,
- its secrets stored encrypted in AWS Systems Manager (SSM) Parameter Store,
- a CloudWatch log group with 14 days of retention,
- a Telegram notification on the developer's phone when a suitable job appears.

---

## Step 1 — Confirm you have access and the handover package

You need an AWS identity that can create:

- CloudFormation stacks
- IAM roles
- Lambda functions
- EventBridge Scheduler schedules
- CloudWatch log groups
- S3 buckets (used to upload the deployment package)
- SSM parameters (only if you run the secret-storage step)

**Simplest option:** sign in as the account's administrator (root or an admin IAM user/role). If your organization does not allow that, ask your AWS administrator to attach these managed policies to your identity for the deployment, then remove them afterwards:

`AWSCloudFormationFullAccess`, `AWSLambda_FullAccess`, `IAMFullAccess`, `AmazonEventBridgeSchedulerFullAccess`, `CloudWatchLogsFullAccess`, `AmazonSSMFullAccess`, `AmazonS3FullAccess`, `AWSCloudShellFullAccess`.

> These are broad policies meant for a one-time deployment; a security team can scope them down.

### Handover checklist (the developer sends you this)

- [ ] The project as a **zip file** (recommended) or repository access.
- [ ] The **AWS region** to use. This guide uses `eu-west-2` (London) in every command; replace it consistently if you prefer another region.
- [ ] The secret values, shared through a **password manager**, never chat or email:

| Secret name | What it is | Required |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token of the Telegram bot that will send the messages | Yes |
| `OWNER_TG_ID` | Numeric Telegram chat ID that receives the messages | Yes |
| `GMAIL_CLIENT_ID` | Google OAuth client ID for the dedicated Gmail inbox | Yes |
| `GMAIL_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GMAIL_REFRESH_TOKEN` | Long-lived token that lets the function read that inbox | Yes |
| `GEMINI_API_KEY` | Google AI Studio key (primary LLM) | Yes, unless Groq/OpenRouter is used |
| `GROQ_API_KEY` | Groq key (fallback LLM) | Optional |
| `OPENROUTER_API_KEY` | OpenRouter key (fallback LLM) | Optional |
| `GMAIL_QUERY` | Gmail search query if the label is not `Upwork-Alerts` | Optional |
| `GEMINI_MODEL` | Override the default Gemini model name | Optional |
| `MAX_PER_RUN` | Emails processed per run, 1–10 (default 5) | Optional |

- [ ] Confirmation that `bot/src/lib/profile.js` contains **no `[TODO]`**. If it does, the function deploys but refuses to run.

> **Security:** the Gmail refresh token can read and modify the developer's dedicated Upwork inbox, and the Telegram token controls their bot. Store them only in a password manager, never in the repository, a ticket or a chat. Delete the message that contains them once they are stored in AWS.

---

## Step 2 — Open AWS CloudShell in the right region

AWS CloudShell is a browser terminal that is already signed in to your account, so you do not need to install anything or create access keys.

1. Sign in to the **AWS Management Console**.
2. In the top-right corner, select the region the developer specified (for example **Europe (London) eu-west-2**).
3. Click the **CloudShell** icon (`>_`) in the top navigation bar.
4. Wait for the terminal prompt, then confirm you are in the right account:

```bash
aws sts get-caller-identity
```

Expected: your account ID, user or role ARN. If this fails, your identity does not have CloudShell access; use the local-machine option in Appendix A.

---

## Step 3 — Install the AWS SAM CLI and check Node.js

```bash
python3 -m pip install --user aws-sam-cli
export PATH="$HOME/.local/bin:$PATH"
sam --version
```

Expected: a version line such as `SAM CLI, version 1.169.0`.

Then check the runtime tools:

```bash
node -v
npm -v
unzip -v | head -1
```

Expected: Node.js **18.13 or newer** and npm **9 or newer**. If Node is older than 18.13, stop and use Appendix A on your own computer.

> The SAM CLI is used only for this deployment. It does not stay running.

---

## Step 4 — Get the project onto the machine

### Option A — the developer sent a zip (recommended)

1. In CloudShell, choose **Actions → Upload file** and select the zip.
2. Unzip it and enter the project folder:

```bash
unzip upwork-intelligence.zip
ls
cd upwork-intelligence      # or upwork-intelligence-main, whichever folder the zip created
cd bot
pwd
```

Expected: `pwd` ends with `/upwork-intelligence/bot`.

### Option B — clone from GitHub

Only if the repository is public or you have been given access and a token:

```bash
git clone https://github.com/Amirhosein-hshm/upwork-intelligence.git
cd upwork-intelligence/bot
```

---

## Step 5 — Install dependencies, run the tests and build

```bash
npm ci
npm test
npm run build
```

Expected:

- `npm ci` finishes without errors.
- `npm test` ends with `# tests 31`, `# pass 31`, `# fail 0`.
- `npm run build` prints `✓ Created build/agent.zip`.

Then build the SAM package:

```bash
sam build --template-file infra/template.yaml
```

Expected final lines:

```
Build Succeeded
Built Artifacts  : .aws-sam/build
```

**If `npm test` fails, stop here** and send the output to the developer. Do not continue.

---

## Step 6 — Store the secrets in AWS

Set the region once so every command below uses the same one:

```bash
export AWS_REGION=eu-west-2        # replace with the agreed region
```

Store each required secret with its own command. Each one prompts `Value for NAME (hidden):`; paste the value and press Enter. The value is not echoed and is not saved in shell history.

```bash
npm run secret -- TELEGRAM_BOT_TOKEN
npm run secret -- OWNER_TG_ID
npm run secret -- GMAIL_CLIENT_ID
npm run secret -- GMAIL_CLIENT_SECRET
npm run secret -- GMAIL_REFRESH_TOKEN
npm run secret -- GEMINI_API_KEY
```

Add the optional ones only if the developer provided them:

```bash
npm run secret -- GROQ_API_KEY
npm run secret -- OPENROUTER_API_KEY
npm run secret -- GMAIL_QUERY
npm run secret -- GEMINI_MODEL
npm run secret -- MAX_PER_RUN
```

Expected after each command: `✓ Saved /upwork-agent/NAME`.

> If a value is wrong, just run the same command again; it overwrites the old value.
> The SSM client reads the `AWS_REGION` variable, so keep the same terminal session.

---

## Step 7 — Deploy the stack

```bash
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name upwork-agent \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --region "$AWS_REGION"
```

What the flags mean: `CAPABILITY_IAM` allows CloudFormation to create the function's IAM role; `--resolve-s3` creates a private S3 bucket for the deployment package; `--no-confirm-changeset` skips the interactive confirmation so the command can be pasted as one block.

Expected: a progress table, then a line such as:

```
Successfully created/updated stack - upwork-agent
```

This takes 2–5 minutes. On the first run, SAM also creates its own small stack named `aws-sam-cli-managed-default`, which holds the artifact bucket. This is normal.

---

## Step 8 — Run a first test

Invoke the function once instead of waiting for the schedule:

```bash
aws lambda invoke \
  --function-name upwork-agent \
  --region "$AWS_REGION" \
  out.json
cat out.json
```

Possible results:

| Output | Meaning | Action |
|---|---|---|
| `{"ok":true,"found":0,...}` | Everything works; there were no unread labelled emails | Wait for a real alert, or ask the developer to send a test alert |
| `{"ok":true,"found":1,"job_sent":1,...}` | A job was processed and sent to Telegram | Check the developer's Telegram |
| `{"errorMessage":"Incomplete configuration: ..."}` | A required secret is missing | Repeat Step 6 for the missing name |
| `{"errorMessage":"lib/profile.js is not complete yet..."}` | The developer did not finish the profile | Send the output to the developer |
| `{"errorMessage":"... invalid_grant ..."}` | The Gmail refresh token expired or was revoked | Ask the developer to generate a new token and repeat Step 6 |

If the invocation failed, read the logs:

```bash
aws logs tail /aws/lambda/upwork-agent --region "$AWS_REGION" --since 10m
```

### Confirm the 5-minute schedule exists

```bash
aws scheduler list-schedules \
  --region "$AWS_REGION" \
  --query "Schedules[?contains(Name, 'upwork-agent')].[Name,State]" \
  --output table
```

Expected: one schedule whose state is `ENABLED`.

### Confirm Telegram works

Ask the developer to trigger a real Upwork job alert (or to forward a genuine alert email into the dedicated inbox and apply the `Upwork-Alerts` label). Within 5 minutes a Telegram message should arrive with the score and a proposal draft.

---

## Step 9 — Protect the account (2 minutes)

Create a small budget alert so nothing can quietly cost money:

1. Open **Billing and Cost Management → Budgets → Create budget**.
2. Choose **Zero-spend budget** (or a monthly cost budget of **$5**).
3. Enter your email address and create it.

The expected spend is $0. The only realistic cost would come from switching the agent to a paid LLM or from a very large increase in usage.

---

## Step 10 — Hand back and operate

Tell the developer:

- the **region** and **stack name** (`upwork-agent`),
- that the test invocation succeeded and Telegram works,
- that the stack is running on a 5-minute schedule.

### To update the code later

```bash
cd ~/upwork-intelligence/bot      # or wherever the project lives
# replace the files with the new version
npm ci
npm test
npm run build
sam build --template-file infra/template.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name upwork-agent \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --region "$AWS_REGION"
```

### To pause the agent temporarily

In the AWS console: **EventBridge → Scheduler**, select the schedule whose name contains `upwork-agent`, and choose **Disable**. Re-enable it later.

### To remove everything permanently

```bash
# 1. Delete the stack (function, schedule, role, log group)
aws cloudformation delete-stack --stack-name upwork-agent --region "$AWS_REGION"
aws cloudformation wait stack-delete-complete --stack-name upwork-agent --region "$AWS_REGION"

# 2. Delete the secrets (add any optional names you stored)
aws ssm delete-parameters --region "$AWS_REGION" --names \
  /upwork-agent/TELEGRAM_BOT_TOKEN \
  /upwork-agent/OWNER_TG_ID \
  /upwork-agent/GMAIL_CLIENT_ID \
  /upwork-agent/GMAIL_CLIENT_SECRET \
  /upwork-agent/GMAIL_REFRESH_TOKEN \
  /upwork-agent/GEMINI_API_KEY
```

Then, outside AWS:

- The developer should revoke the app's access in the Google account (Google Account → Security → Third-party access) and delete the bot in BotFather if it is no longer needed.
- Optionally delete the SAM artifact bucket. In the S3 console, look for `aws-sam-cli-managed-default-...`; **only delete it if you do not use SAM for other projects**, because the bucket is shared by all SAM deployments in that account and region.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `sam: command not found` | `~/.local/bin` is not on `PATH` in this shell | `export PATH="$HOME/.local/bin:$PATH"` and retry |
| `npm: command not found` | Node.js is not installed in this environment | Use Appendix A on your own computer |
| `Could not load credentials` | The CloudShell session expired | Close and reopen CloudShell, then retry |
| `Incomplete configuration: ...` | A required secret is missing | Repeat Step 6 for each name listed in the message |
| `lib/profile.js is not complete yet` | A `[TODO]` remains in the developer's profile | Return it to the developer; no AWS change is needed |
| `Invalid package, must have name and version` during `sam build` | The handover is an old copy of the project | Ask the developer for the current version (the fix is in `src/package.json`) |
| `invalid_grant` in the logs | The Gmail refresh token expired (7-day limit while the OAuth app is in "Testing") or was revoked | The developer generates a new token; repeat Step 6 |
| Telegram stays silent | Wrong `OWNER_TG_ID`, the bot has no `/start`, or the chat ID belongs to another chat | Recheck the chat ID with the developer; rerun Step 8 |
| Deployment fails with an IAM error | Your identity cannot create roles | Use an administrator or attach the policies in Step 1 |
| `AccessDenied` for `ssm:PutParameter` | Missing SSM permission | Attach `AmazonSSMFullAccess` or ask your administrator |

---

## What gets created (for your records)

| Resource | Name / configuration |
|---|---|
| Lambda function | `upwork-agent`, Node.js 22, arm64, 256 MB, 300 s timeout, one concurrent run |
| EventBridge Scheduler | Invokes the function every 5 minutes (`rate(5 minutes)`) |
| IAM role | Created by CloudFormation; read-only access to the `/upwork-agent/*` SSM path plus basic logging |
| CloudWatch log group | `/aws/lambda/upwork-agent`, 14-day retention |
| SSM parameters | `/upwork-agent/*`, type SecureString (encrypted) |
| S3 bucket | Created by SAM CLI for deployment artifacts |
| CloudFormation stacks | `upwork-agent` and `aws-sam-cli-managed-default` |

---

## Appendix A — Run the same steps from your own computer

Use this if CloudShell is unavailable or your Node.js is older than 18.

**You need:** AWS CLI v2, AWS SAM CLI, Node.js 18.13+ (22 recommended), git, `zip`/`unzip`.

1. Install the [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
2. Install [Node.js 22 LTS](https://nodejs.org/).
3. Configure credentials: `aws configure` (or `aws sso login`), then `aws sts get-caller-identity`.
4. Unzip the project and open a terminal in `upwork-intelligence/bot`.
5. Continue from **Step 5**. Set `AWS_REGION` in Step 6 and pass `--region "$AWS_REGION"` in Step 7.

On Windows, use **WSL 2** (Ubuntu) so that `zip`, `npm` and `sam` behave exactly as above.

---

## Appendix B — Change the schedule later

The schedule is a stack parameter. To run every 10 minutes instead of 5, redeploy with:

```bash
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name upwork-agent \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --region "$AWS_REGION" \
  --parameter-overrides ScheduleExpression="rate(10 minutes)"
```

Valid values follow the EventBridge Scheduler `rate(...)` syntax, for example `rate(1 minute)`, `rate(5 minutes)`, `rate(1 hour)`.

---

## Appendix C — One-page summary for a ticket or email

> Deploy the `upwork-agent` SAM stack in region `<REGION>` from the `bot/` folder. Run `npm ci && npm test && npm run build && sam build`, store the six required SSM SecureString parameters under `/upwork-agent/`, then deploy with `sam deploy --stack-name upwork-agent --capabilities CAPABILITY_IAM --resolve-s3`. Verify with `aws lambda invoke` and confirm the EventBridge schedule is `ENABLED`. Expected cost: $0/month. Teardown: delete the `upwork-agent` stack and the `/upwork-agent/*` SSM parameters.
