# 08 — AWS deployability review

**Review date:** 2026-10-17
**Question:** can this agent be deployed on AWS as designed?
**Answer:** **Yes.** The template is a valid AWS SAM template, the runtime package builds, and all 31 tests pass. One packaging defect found during the review was fixed. The remaining conditions are operational (accounts, secrets and a filled profile), not architectural.

---

## 1. Checks performed

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npm test` (Node 22.22.3) | **31/31 pass** |
| Runtime package | `npm run build` | `build/agent.zip`, ~20 KB |
| Template lint | `sam validate --lint` | Valid SAM template, no findings |
| SAM build | `sam build --template-file infra/template.yaml` | **Build succeeded** after the fix below |
| Package contents | `find .aws-sam/build/AgentFunction` | `lambda.mjs`, `lib/*.js`, `package.json` (69 KB uncompressed) |
| Live deployment | `sam deploy` | **Not run**: no AWS credentials in this environment |

The review did not create any AWS resources and incurred no cost.

### Defect found and fixed

`bot/src/package.json` contained only `{"type":"module"}`. That is valid at runtime, but the standard SAM build runs `npm pack`, which requires `name` and `version`:

```
NodejsNpmBuilder:NpmPack - NPM Failed: npm error Invalid package, must have name and version
```

Fixed by adding `name`, `version` and `private` to `bot/src/package.json`. `sam build` now succeeds. `npm run build` only copies files, so it was never affected.

A second template issue was considered: the explicit CloudWatch log group could race with Lambda's automatic creation on the first invocation. The log group name references the function, so CloudFormation already creates it after the function; an extra `DependsOn` was rejected by `cfn-lint` (W3005) and removed. The residual race window is negligible (the log group is created within seconds, the schedule fires after up to 5 minutes), and no action is required.

---

## 2. What the deployment creates

| Resource | Configuration | Notes |
|---|---|---|
| `AWS::Lambda::Function` | `upwork-agent`, `nodejs22.x`, `arm64`, 256 MB, timeout 300 s, reserved concurrency 1 | Code is pure JavaScript; AWS SDK v3 is included in the runtime |
| `AWS::Scheduler::Schedule` (via `ScheduleV2`) | `rate(5 minutes)`, enabled | The schedule starts immediately after stack creation |
| IAM role | `AWSLambdaBasicExecutionRole` + inline `ssm:GetParametersByPath` on `/upwork-agent/*` + `kms:Decrypt` via SSM | Least privilege for the code path |
| `AWS::Logs::LogGroup` | `/aws/lambda/upwork-agent`, 14-day retention | Created by the stack |
| SAM artifact bucket | Created by `--resolve-s3` | Managed by SAM CLI; reusable by other SAM apps |
| SSM parameters | 6 required + optional, SecureString | Created outside the stack by `npm run secrets`; not deleted with the stack |

---

## 3. Conditions for a successful deployment

1. **AWS identity:** permission to create CloudFormation stacks, IAM roles, Lambda functions, EventBridge schedules, log groups and an S3 bucket. An administrator identity is simplest; the guide lists the needed managed policies.
2. **Region:** any region where Lambda arm64 and EventBridge Scheduler are available. Use one region consistently. The examples use `eu-west-2`.
3. **Secrets:** `TELEGRAM_BOT_TOKEN`, `OWNER_TG_ID`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, and at least one LLM key (`GEMINI_API_KEY` recommended, `GROQ_API_KEY`/`OPENROUTER_API_KEY` optional).
4. **Profile:** `src/lib/profile.js` must have no `[TODO]`, otherwise every run throws a deliberate error.
5. **Gmail label:** `Upwork-Alerts` must exist (or `GMAIL_QUERY` must be updated to the real label).
6. **OAuth publishing status:** with status "Testing" the refresh token expires after 7 days (official Google behavior). Publish the app to "In production" or refresh the token weekly.
7. **LLM model names:** free-tier model names change; the defaults may need overriding through `GEMINI_MODEL` / `GROQ_MODEL` / `OPENROUTER_MODEL`.

---

## 4. Cost estimate

At the default rate (one invocation every 5 minutes = 8,640 per month):

| Service | Estimated monthly usage | Free tier | Cost |
|---|---|---|---|
| Lambda requests | 8,640 | 1,000,000 | $0 |
| Lambda compute | 8,640 × ~10 s × 0.25 GB ≈ 21,600 GB-s | 400,000 GB-s | $0 |
| EventBridge Scheduler | 8,640 invocations | 14,000,000 | $0 |
| SSM Standard parameters | ≤ 10 | 10,000 | $0 |
| CloudWatch Logs | A few MB, 14-day retention | 5 GB ingest | ~$0 |
| S3 (SAM artifacts) | < 1 MB | 5 GB | $0 |

**Expected total: $0 per month.** The main cost risk is LLM overage if paid models are used; the code defaults to free tiers. Prices and free-tier limits were not re-verified during this review; confirm them on the AWS pricing pages.

---

## 5. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gmail refresh token expires after 7 days (Testing status) | High if the app stays in Testing | Runs fail with `invalid_grant` | Publish the OAuth app, or refresh the token weekly |
| Free-tier LLM model renamed or removed | Medium | Extraction/scoring fails until the model is changed | Override `*_MODEL`; the fallback chain tries the next provider |
| Duplicate Telegram message after a failed UNREAD removal | Low | One duplicate notification | Accepted by design (no database) |
| SSM cache in warm containers hides a rotated secret | Low | Old secret used until a cold start | Force a cold start by redeploying |
| First invocation before the log group exists | Very low | Stack creation error | Not observed; ordering is enforced by the template reference |
| Node.js 22 deprecation | Distant (2027) | Runtime update needed | Change `Runtime` in the template and redeploy |
| Owner cannot run SAM locally | Medium | Deployment blocked | Use AWS CloudShell, which needs no local installs (see `bot/DEPLOY-AWS.md`) |

---

## 6. Conclusion and next step

The agent is deployable on AWS as a standard SAM stack, with no servers, databases or containers. Follow `bot/DEPLOY-AWS.md`; the whole process takes about 20–30 minutes and should stay within the AWS Free Tier.
