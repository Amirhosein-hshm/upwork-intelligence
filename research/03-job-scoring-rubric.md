# ۰۳ — Rubric امتیازدهی و فیلتر جاب‌ها

> هدف: تصمیم «اپلای / شاید / رد» با **قواعد قطعی** (Hard gates) و **امتیاز قابل توضیح** (Weighted score). LLM فقط استخراج و توضیح می‌دهد؛ تصمیم نهایی با قواعد کد است تا پایدار و قابل آزمون باشد.

---

## ۱. ترتیب تصمیم‌گیری

```
Email → Extract (LLM, JSON) → Validate (Pydantic)
      → Hard gates (کد)        ─ fail → verdict = SKIP (با دلیل)
      → Weighted score (کد + LLM برای مهارت‌ها) 
      → Red-flag penalties (کد + LLM)
      → verdict: APPLY (≥75) | MAYBE (55–74) | SKIP (<55)
      → Proposal (فقط APPLY/MAYBE)
```

---

## ۲. Hard gates (هر کدام رد می‌کند)

| # | قاعده | مقدار پیش‌فرض (قابل تنظیم) | دلیل |
|---|---|---|---|
| G1 | نرخ/بودجه زیر حداقل | Hourly min < $X (شما تعیین می‌کنید؛ پیش‌فرض: `hourly_min_usd: 30`) / Fixed < `fixed_min_usd: 300` | بودجه‌ی غیرمنطقی |
| G2 | کشور کارفرما در لیست ممنوع | `blocked_client_countries: []` (تنظیم شما) | ترجیح شما |
| G3 | نوع پروژه غیرقابل‌قبول | `excluded_categories` (مثلاً: data entry، کارهای رایگان/تست نامحدود) | ترجیح شما |
| G4 | پرداخت تأییدنشده و بودجه‌ی پایین | `payment_verified == false` AND `budget < 500` | ریسک کلاهبرداری |
| G5 | مهارت اصلی جاب خارج از پروفایل | `core_skill_match < 0.3` | جلوگیری از اپلای بی‌ربط |
| G6 | درخواست واضح خروج از Upwork | `red_flags` شامل off_platform | ریسک ToS و کلاهبرداری |
| G7 | درخواست رایگان/آزمون بدون مبلغ | `unpaid_test == true` | ارزش کم |

> اگر فیلدی در ایمیل نیست (مثلاً `payment_verified = null`)، **gate را fail نکنید**؛ وضعیت را `unknown` بگذارید و امتیاز را کم کنید (`confidence` پایین).

---

## ۳. امتیاز وزنی (۱۰۰ امتیاز)

| بُعد | وزن | معیار (۰–۱۰۰ داخلی) | منبع داده |
|---|---|---|---|
| **Skill match** | ۳۰ | همپوشانی مهارت‌های جاب با `profile.core_skills` و `profile.secondary_skills` | LLM + کد (نسبت) |
| **Scope clarity & fit** | ۱۵ | آیا پروژه روشن، قابل تحویل و در حوزه‌ی شماست؟ | LLM |
| **Budget / rate fit** | ۲۰ | بالاتر از حداقل = امتیاز بیشتر؛ Fixed با دامنه‌ی زمانی منطقی | کد |
| **Client quality** | ۱۵ | تعداد استخدام، هزینه‌ی تاریخی، امتیاز، پرداخت تأییدشده، سابقه | کد (اگر فیلد موجود) |
| **Timing & competition** | ۱۰ | تعداد پروپوزال‌ها کم، جاب تازه (≤۲۴ ساعت) | کد |
| **Logistics** | ۵ | مدت/ساعت/زمان هم‌پوشان با شما، زبان انگلیسی | کد |
| **Question fit** | ۵ | سوال‌های اختصاصی قابل پاسخ و نیاز به کار اضافی؟ | LLM |

**فرمول:**
`score = Σ(weight_i × subscore_i / 100) − penalties`

**جریمه‌ها (Red flags):**
| پرچم | جریمه |
|---|---|
| `vague_scope` (هیچ deliverable مشخص نیست) | −۸ |
| `budget_mismatch` (بودجه با دامنه‌ی کار نمی‌خواند) | −۸ |
| `too_many_proposals` (> ۵۰ پروپوزال) | −۵ |
| `client_no_history` (بدون استخدام قبلی) | −۶ |
| `pay_low_effort_high_scope` (ادعای کار بزرگ با بودجه‌ی کوچک) | −۱۰ |
| `ask_for_free_work` (تست یا نمونه‌کار رایگان نامحدود) | −۱۵ (+ G7) |
| `urgent_pressure_no_detail` (فشار فوری بدون جزئیات) | −۵ |
| `off_platform_contact` (WhatsApp/Telegram/email خارج از Upwork) | −۲۰ (+ G6) |
| `unusual_payment_request` (پرداخت خارج از Upwork یا crypto) | −۲۵ (+ G6) |

> سطح اطمینان هر جریمه را در JSON ثبت کنید (`confidence: high|medium|low`). red flag با اطمینان پایین فقط هشدار است، جریمه‌ی کامل ندارد.

---

## ۴. آستانه‌ها

| Verdict | امتیاز | اقدام |
|---|---|---|
| **APPLY** | ≥ ۷۵ و هیچ gate fail نشده | پیش‌نویس پروپوزال + پیام تلگرام با 🟢 |
| **MAYBE** | ۵۵–۷۴ | پیام با 🟡، بدون پروپوزال یا با پروپوزال کوتاه؛ تصمیم با شما |
| **SKIP** | < ۵۵ یا gate fail | فقط در لاگ + پیام خلاصه‌ی یک‌خطی در صورت نیاز (پیش‌فرض: ارسال نشود) |

> آستانه‌ها را بعد از ۵۰ جاب برچسب‌خورده (شما apply/skip می‌کنید) کالیبره کنید.

---

## ۵. Prompt استخراج (Extraction)

> نسخه: `extract.v1`. ورودی: متن ساده‌شده‌ی ایمیل (بدون HTML، بدون لینک‌های tracking، با حذف امضا و footer).

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

## ۶. Prompt ارزیابی (Scoring/Explanation)

> نسخه: `score.v1`. این پرامپت فقط زیرامتیازهای LLM (Skill, Scope, Question fit) و **توضیح فارسی** تولید می‌کند. محاسبه‌ی نهایی با کد است.

```text
ROLE
You evaluate one extracted Upwork job for a freelancer using ONLY the profile provided.

OUTPUT JSON ONLY:
- skill_match: 0-100 (how well the job's required skills match profile.core_skills and secondary_skills; list matched and missing)
- scope_clarity: 0-100
- question_fit: 0-100 (are screening questions answerable with the profile? 100 = none needed)
- red_flags: array of {code, evidence_quote, confidence: "high"|"medium"|"low"}
  allowed codes: vague_scope, budget_mismatch, too_many_proposals, client_no_history, pay_low_effort_high_scope, ask_for_free_work, urgent_pressure_no_detail, off_platform_contact, unusual_payment_request
- summary_fa: Persian summary in at most 3 short sentences: what the job is, why it fits or not, the main risk.
- missing_info: array of up to 3 questions the freelancer should answer before applying

RULES
- Do not award skill_match above 40 if the core skill is absent from the profile.
- Quote evidence for every red flag; no evidence = do not output that flag.
- Never infer red flags from the client's country alone.
- Be strict: most jobs should land between 30 and 70.
```

---

## ۷. JSON Schema — استخراج جاب (Extraction)

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

## ۸. JSON Schema — ارزیابی (Evaluation)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UpworkJobEvaluation",
  "type": "object",
  "required": ["job_id", "gates", "subscores", "red_flags", "score", "verdict", "summary_fa"],
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
    "summary_fa": { "type": "string", "maxLength": 500 },
    "rubric_version": { "type": "string", "examples": ["rubric.v1"] },
    "model": { "type": "string" }
  }
}
```

---

## ۹. پروفایل شما (فرمت YAML؛ باید تکمیل شود)

```yaml
# profile.yaml — تنها منبع حقایق برای پروپوزال و امتیازدهی
identity:
  headline: "[مثلاً: Frontend Engineer — React/Next.js]"
  years_experience: "[عدد]"
  english_level: "[مثلاً: C1]"
  location_for_clients: "[فقط اگر قانونی و صادقانه قابل ذکر است]"
core_skills: ["[مثلاً React]", "[Next.js]", "[TypeScript]"]
secondary_skills: ["[...]"]
rates:
  hourly_min_usd: 30        # [تنظیم شما]
  fixed_min_usd: 300        # [تنظیم شما]
preferences:
  preferred_project_types: ["[...]"]
  excluded_project_types: ["[مثلاً: data entry، رایگان نامحدود]"]
  preferred_client_countries: ["[...]"]
  blocked_client_countries: ["[...]"]
  min_client_rating: 4.5     # اختیاری
  require_payment_verified: true
proof_points:   # فقط مواردی که شما تأیید کرده‌اید
  - id: pp1
    text: "[نتیجه‌ی عددی یا توصیف واقعی]"
    evidence_url: "[لینک نمونه‌کار عمومی]"
portfolio:
  - name: "[...]"
    url: "[...]"
    stack: ["[...]"]
    role: "[...]"
tone: "direct, friendly, professional"
writing_samples_dir: "examples/"   # ۲–۳ پروپوزال موفق شما
```

---

## ۱۰. قواعد تست (Acceptance tests برای Rubric)

| تست | انتظار |
|---|---|
| ایمیل بدون جزئیات جاب (`invitation`) | job=null، verdict ندارد، در صف ارسال نمی‌شود |
| بودجه کمتر از حداقل | G1 fail، verdict=SKIP |
| پرداخت تأییدنشده + بودجه ۲۰۰ دلار | G4 fail |
| درخواست خارج از Upwork (واتساپ) | red flag `off_platform_contact` + G6 |
| جاب کاملاً خارج از پروفایل | G5 fail یا skill_match<40 |
| فیلد نامشخص `payment_verified=null` | gate fail نمی‌شود؛ confidence کم |
| ۵۰ جاب برچسب‌خورده | precision برای APPLY ≥ ۶۰٪ (هدف اولیه) |
