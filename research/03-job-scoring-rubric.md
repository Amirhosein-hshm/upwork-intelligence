# 03 — Job scoring rubric and filters

> Goal: decide "apply / maybe / skip" with **deterministic rules** (hard gates) and an **explainable score** (weighted score). The LLM only extracts and explains; the final decision comes from code rules so it is stable and testable.

---

## 1. Decision order

```
Email → Extract (LLM, JSON) → Validate (JSON checks)
      → Hard gates (code)        ─ fail → verdict = SKIP (with reason)
      → Weighted score (code + LLM for skills)
      → Red-flag penalties (code + LLM)
      → verdict: APPLY (≥75) | MAYBE (55–74) | SKIP (<55)
      → Proposal (APPLY/MAYBE only)
```

---

## 2. Hard gates (each one rejects the job)

| # | Rule | Default value (configurable) | Reason |
|---|---|---|---|
| G1 | Rate/budget below the minimum | Hourly min < $X (you decide; default: `hourly_min_usd: 30`) / Fixed < `fixed_min_usd: 300` | Unreasonable budget |
| G2 | Client country on the blocked list | `blocked_client_countries: []` (your setting) | Your preference |
| G3 | Unacceptable project type | `excluded_categories` (e.g. data entry, free/unlimited test work) | Your preference |
| G4 | Unverified payment with a low budget | `payment_verified == false` AND `budget < 500` | Fraud risk |
| G5 | Job's core skill outside the profile | `core_skill_match < 0.3` | Avoid irrelevant applications |
| G6 | Clear request to leave Upwork | `red_flags` includes off_platform | ToS and fraud risk |
| G7 | Request for free work/unpaid test | `unpaid_test == true` | Low value |

> If a field is missing from the email (e.g. `payment_verified = null`), **do not fail the gate**; keep the status `unknown` and lower the score (low `confidence`).

---

## 3. Weighted score (100 points)

| Dimension | Weight | Criterion (internal 0–100) | Data source |
|---|---|---|---|
| **Skill match** | 30 | Overlap of job skills with `profile.core_skills` and `profile.secondary_skills` | LLM + code (ratio) |
| **Scope clarity & fit** | 15 | Is the project clear, deliverable and within your domain? | LLM |
| **Budget / rate fit** | 20 | Above the minimum = higher score; Fixed with a reasonable timeline | Code |
| **Client quality** | 15 | Hires, historical spend, rating, verified payment, history | Code (if the field exists) |
| **Timing & competition** | 10 | Few proposals, fresh job (≤24 hours) | Code |
| **Logistics** | 5 | Duration/hours/time zone overlap with you, English | Code |
| **Question fit** | 5 | Are the specific questions answerable without extra work? | LLM |

**Formula:**
`score = Σ(weight_i × subscore_i / 100) − penalties`

**Penalties (red flags):**
| Flag | Penalty |
|---|---|
| `vague_scope` (no concrete deliverable) | −8 |
| `budget_mismatch` (budget does not match the scope) | −8 |
| `too_many_proposals` (> 50 proposals) | −5 |
| `client_no_history` (no previous hires) | −6 |
| `pay_low_effort_high_scope` (large work claimed for a small budget) | −10 |
| `ask_for_free_work` (unlimited free test or sample) | −15 (+ G7) |
| `urgent_pressure_no_detail` (urgent pressure with no detail) | −5 |
| `off_platform_contact` (WhatsApp/Telegram/email outside Upwork) | −20 (+ G6) |
| `unusual_payment_request` (payment outside Upwork or crypto) | −25 (+ G6) |

> Record each penalty's confidence in the JSON (`confidence: high|medium|low`). A low-confidence red flag is only a warning, not a full penalty.

---

## 4. Thresholds

| Verdict | Score | Action |
|---|---|---|
| **APPLY** | ≥ 75 and no gate failed | Proposal draft + Telegram message with 🟢 |
| **MAYBE** | 55–74 | Message with 🟡, no proposal or a short proposal; your decision |
| **SKIP** | < 55 or a gate failed | Log only + a one-line summary message if needed (default: not sent) |

> Calibrate the thresholds after 50 labelled jobs (you apply/skip).

---

## 5. Extraction prompt

> Version: `extract.v1`. Input: the simplified email text (no HTML, no tracking links, signature and footer removed).

```text
ROLE
You extract structured data from ONE Upwork notification email. You do not judge the job.

RULES
1. Use only information present in the email. If a field is absent, output null. Never guess.
2. Money: keep the original currency and both bounds. Hourly rates are per hour; fixed prices are totals.
3. Dates: output ISO-8601 if explicitly stated; otherwise null.
4. The job URL must be copied exactly; the Upwork job id is the token after "~" in the URL when present.
5. Do not follow or invent links.
6. Summarize the description in at most 600 characters, in English, neutral wording.
7. List explicit screening questions verbatim.
8. Mark an email as NOT_A_JOB if it is an invitation, message, offer or system notice without job details (set job to null, and set email_type accordingly).
9. Output JSON only, matching the schema. No prose.

SCHEMA
(see JSON Schema below)
```

---

## 6. Scoring/Explanation prompt

> Version: `score.v1`. This prompt only produces the LLM subscores (Skill, Scope, Question fit) and an **English summary**. The final calculation is done in code.

```text
ROLE
You evaluate one extracted Upwork job for a freelancer using ONLY the profile provided.

OUTPUT JSON ONLY:
- skill_match: 0-100 (how well the job's required skills match profile.core_skills and secondary_skills; list matched and missing)
- scope_clarity: 0-100
- question_fit: 0-100 (are screening questions answerable with the profile? 100 = none needed)
- red_flags: array of {code, evidence_quote, confidence: "high"|"medium"|"low"}
  allowed codes: vague_scope, budget_mismatch, too_many_proposals, client_no_history, pay_low_effort_high_scope, ask_for_free_work, urgent_pressure_no_detail, off_platform_contact, unusual_payment_request
- summary_en: English summary in at most 3 short sentences: what the job is, why it fits or not, the main risk.
- missing_info: array of up to 3 questions the freelancer should answer before applying

RULES
- Do not award skill_match above 40 if the core skill is absent from the profile.
- Quote evidence for every red flag; no evidence = do not output that flag.
- Never infer red flags from the client's country alone.
- Be strict: most jobs should land between 30 and 70.
```

---

## 7. JSON Schema — job extraction

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UpworkJobExtraction",
  "type": "object",
  "required": ["email_type", "job"],
  "additionalProperties": false,
  "properties": {
    "email_type": {
      "type": "string",
      "enum": ["job_alert", "invitation", "message", "offer", "contract", "other", "not_a_job"]
    },
    "email_received_at": { "type": ["string", "null"], "format": "date-time" },
    "job": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["url", "title", "description_summary"],
      "properties": {
        "upwork_job_id": { "type": ["string", "null"] },
        "url": { "type": "string", "pattern": "^https://www\\.upwork\\.com/" },
        "title": { "type": "string", "minLength": 3, "maxLength": 200 },
        "description_summary": { "type": "string", "maxLength": 600 },
        "job_type": { "type": ["string", "null"], "enum": ["hourly", "fixed", "unknown", null] },
        "budget": {
          "type": ["object", "null"],
          "additionalProperties": false,
          "properties": {
            "currency": { "type": "string", "default": "USD" },
            "min": { "type": ["number", "null"] },
            "max": { "type": ["number", "null"] },
            "unit": { "type": ["string", "null"], "enum": ["hour", "project", null] }
          }
        },
        "experience_level": { "type": ["string", "null"], "enum": ["entry", "intermediate", "expert", "unknown", null] },
        "duration": { "type": ["string", "null"] },
        "workload": { "type": ["string", "null"] },
        "client": {
          "type": ["object", "null"],
          "additionalProperties": false,
          "properties": {
            "country": { "type": ["string", "null"] },
            "payment_verified": { "type": ["boolean", "null"] },
            "rating": { "type": ["number", "null"], "minimum": 0, "maximum": 5 },
            "total_spent_usd": { "type": ["number", "null"] },
            "hires": { "type": ["integer", "null"] }
          }
        },
        "skills": { "type": "array", "items": { "type": "string" }, "maxItems": 20 },
        "proposals_count": { "type": ["integer", "null"] },
        "connects_required": { "type": ["integer", "null"] },
        "posted_at": { "type": ["string", "null"] },
        "screening_questions": { "type": "array", "items": { "type": "string" }, "maxItems": 10 },
        "invite_only": { "type": ["boolean", "null"] }
      }
    },
    "extraction_notes": { "type": "array", "items": { "type": "string" }, "maxItems": 5 }
  }
}
```

## 8. JSON Schema — evaluation

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UpworkJobEvaluation",
  "type": "object",
  "required": ["job_id", "gates", "subscores", "red_flags", "score", "verdict", "summary_en"],
  "additionalProperties": false,
  "properties": {
    "job_id": { "type": "string" },
    "gates": {
      "type": "object",
      "required": ["passed", "failed"],
      "properties": {
        "passed": { "type": "boolean" },
        "failed": { "type": "array", "items": { "type": "string", "enum": ["G1","G2","G3","G4","G5","G6","G7"] } }
      }
    },
    "subscores": {
      "type": "object",
      "required": ["skill_match", "scope_clarity", "budget_fit", "client_quality", "timing", "logistics", "question_fit"],
      "properties": {
        "skill_match": { "type": "number", "minimum": 0, "maximum": 100 },
        "scope_clarity": { "type": "number", "minimum": 0, "maximum": 100 },
        "budget_fit": { "type": "number", "minimum": 0, "maximum": 100 },
        "client_quality": { "type": "number", "minimum": 0, "maximum": 100 },
        "timing": { "type": "number", "minimum": 0, "maximum": 100 },
        "logistics": { "type": "number", "minimum": 0, "maximum": 100 },
        "question_fit": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    },
    "red_flags": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["code", "penalty", "confidence", "evidence"],
        "properties": {
          "code": { "type": "string" },
          "penalty": { "type": "number", "minimum": 0 },
          "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
          "evidence": { "type": "string", "maxLength": 200 }
        }
      }
    },
    "score": { "type": "number", "minimum": 0, "maximum": 100 },
    "verdict": { "type": "string", "enum": ["APPLY", "MAYBE", "SKIP"] },
    "missing_info": { "type": "array", "items": { "type": "string" }, "maxItems": 3 },
    "summary_en": { "type": "string", "maxLength": 500 },
    "rubric_version": { "type": "string", "examples": ["rubric.v1"] },
    "model": { "type": "string" }
  }
}
```

---

## 9. Your profile (YAML format; must be completed)

```yaml
# profile.yaml — the only source of facts for proposals and scoring
identity:
  headline: "[e.g. Frontend Engineer — React/Next.js]"
  years_experience: "[number]"
  english_level: "[e.g. C1]"
  location_for_clients: "[only if it is legal and honest to mention]"
core_skills: ["[e.g. React]", "[Next.js]", "[TypeScript]"]
secondary_skills: ["[...]"]
rates:
  hourly_min_usd: 30        # [your setting]
  fixed_min_usd: 300        # [your setting]
preferences:
  preferred_project_types: ["[...]"]
  excluded_project_types: ["[e.g. data entry, unlimited free work]"]
  preferred_client_countries: ["[...]"]
  blocked_client_countries: ["[...]"]
  min_client_rating: 4.5     # optional
  require_payment_verified: true
proof_points:   # only items you have confirmed
  - id: pp1
    text: "[a numeric result or a true description]"
    evidence_url: "[public portfolio link]"
portfolio:
  - name: "[...]"
    url: "[...]"
    stack: ["[...]"]
    role: "[...]"
tone: "direct, friendly, professional"
writing_samples_dir: "examples/"   # 2–3 of your successful proposals
```

---

## 10. Test rules (acceptance tests for the rubric)

| Test | Expectation |
|---|---|
| Email without job details (`invitation`) | job=null, no verdict, not queued for sending |
| Budget below the minimum | G1 fail, verdict=SKIP |
| Unverified payment + $200 budget | G4 fail |
| Request to move outside Upwork (WhatsApp) | red flag `off_platform_contact` + G6 |
| Job completely outside the profile | G5 fail or skill_match<40 |
| Unknown field `payment_verified=null` | Gate does not fail; low confidence |
| 50 labelled jobs | Precision for APPLY ≥ 60% (initial target) |
