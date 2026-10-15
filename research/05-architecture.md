# ۰۵ — معماری نهایی پیشنهادی

> **پیش‌فرض‌ها (فرض صریح):** صاحب حساب Upwork و سرویس‌های LLM **واجد شرایط قانونی** استفاده از آن‌هاست (محل اقامت او، نه محل سرور، ملاک است). سرور اجرایی: **VPS شخصی شما** (خارج از ایران). حجم ۲۰–۲۰۰ ایمیل در روز. ایجنت **فقط پیش‌نویس** می‌سازد و **هیچ‌وقت** وارد Upwork نمی‌شود، صفحه‌ی جاب را اسکرپ نمی‌کند و پروپوزال را ثبت نمی‌کند.

---

## ۱. نمودار معماری (Mermaid)

```mermaid
flowchart LR
    subgraph Source["منبع داده (فقط ایمیل شما)"]
        UA[Upwork Job Alert / Message email]
        GF[Gmail filter<br/>from:upwork.com → Label: Upwork]
        UA --> GF
    end

    subgraph Worker["Worker (Python، یک فرایند، زمان‌بند هر ۵ دقیقه)"]
        ING[1. Ingest<br/>IMAP poll (label Upwork)]
        PRS[2. Parse<br/>HTML → text، حذف footer/tracking]
        DED[3. Dedupe<br/>upwork_job_id + hash]
        EXT[4. Extract<br/>LLM → JSON Schema]
        VAL[5. Validate<br/>Pydantic]
        GATE[6. Gates + Score<br/>کد: rubric.v1]
        PRO[7. Propose<br/>LLM فقط برای APPLY/MAYBE]
        NOT[8. Notify<br/>Telegram HTML]
        Q[(SQLite<br/>jobs / evaluations / proposals / feedback / llm_calls)]
    end

    subgraph LLM["LLM Provider chain (Free tiers + fallback)"]
        P1[Gemini Flash]
        P2[Groq gpt-oss]
        P3[OpenRouter :free]
        P4[Ollama local]
    end

    GF -->|IMAP| ING --> PRS --> DED --> EXT --> VAL --> GATE --> PRO --> NOT
    DED <--> Q
    EXT --> LLM
    PRO --> LLM
    GATE <--> Q
    NOT -->|Bot API sendMessage| TG[[Telegram group]]
    TG -->|/applied /skip /won| CMD[Command handler<br/>long polling]
    CMD --> Q
    NOT --> Q

    YOU((شما)) -. بازبینی و ثبت دستی .-> UP[[Upwork UI]]
    TG -. خواندن پیام .-> YOU
```

---

## ۲. Data flow (از ایمیل تا تلگرام)

1. **Gmail** ایمیل Upwork را با فیلتر به برچسب `Upwork` منتقل می‌کند.
2. **Ingest** هر ۵ دقیقه با IMAP در آن برچسب، پیام‌های جدید (`UID > last_uid`) را می‌خواند. (Gmail API + Pub/Sub در فاز ۲.)
3. **Parse**: HTML → متن؛ لینک‌های `upwork.com/jobs/~...` استخراج؛ footer و لینک‌های tracking حذف.
4. **Dedupe**: اگر `upwork_job_id` در جدول `jobs` است، فقط به‌روزرسانی (مثلاً تغییر بودجه) ثبت و پیام تکراری ارسال نمی‌شود.
5. **Extract** (LLM + JSON Schema از `03`) → **Validate** (Pydantic). اگر `email_type != job_alert` → ذخیره و بدون امتیازدهی.
6. **Gates + Score** (کد) → `verdict`.
7. **Propose** (LLM، فقط APPLY/MAYBE) → پیش‌نویس + placeholder/claim-check.
8. **Notify** → یک پیام تلگرام در قالب زیر. حداکثر ۴۰۹۶ کاراکتر؛ اگر بیشتر شد، پیام دوم با ادامه‌ی متن.
9. **Feedback**: شما با دستورات (`/applied`، `/skip`، `/won`) وضعیت را ثبت می‌کنید.

---

## ۳. شرح مؤلفه‌ها و دلیل انتخاب

| مؤلفه | مسئولیت | انتخاب | دلیل |
|---|---|---|---|
| **Gmail + فیلتر** | جمع‌آوری ایمیل‌های Upwork | Gmail filter → label | ساده، بدون کد، بدون دسترسی به کل صندوق |
| **Ingest** | خواندن ایمیل‌های جدید | IMAP (imaplib / imapclient) با App Password یا OAuth | کم‌پیچیده‌تر از Pub/Sub. Gmail watch هر ۷ روز باید تمدید شود و Pub/Sub نیاز به پروژه‌ی GCP دارد (تأیید شده). تأخیر ۵ دقیقه‌ای برای Alertهای Upwork قابل‌قبول است. |
| **Parse** | HTML → متن | `selectolax` یا BeautifulSoup + قوانین ساده | پایدار و سریع |
| **Store** | همه‌ی داده‌ها | **SQLite** (فایل محلی) | صفر هزینه، کافی برای ۲۰۰ جاب/روز؛ بک‌آپ = کپی فایل. Postgres/Supabase در فاز بعد اگر لازم شد |
| **LLM chain** | Extract/Score/Propose | Gemini → Groq → OpenRouter → Ollama | تنوع و حفظ پایداری در برابر Rate limit (فایل ۰۴) |
| **Gates/Score** | تصمیم قطعی | کد Python | تست‌پذیر، پایدار، ارزان |
| **Notify** | ارسال تلگرام | Bot API با `sendMessage` (HTML) | رایگان، ساده، پشتیبانی از inline buttons (فاز ۲) |
| **Command handler** | ثبت بازخورد | `getUpdates` (long polling) | بدون نیاز به وب‌هوک و دامنه |
| **Scheduler** | اجرای هر ۵ دقیقه | `systemd timer` روی VPS شخصی | ساده‌تر از n8n/Celery؛ لاگ با `journalctl` |
| **Hosting** | اجرای Worker، SQLite و Ollama (اختیاری) | VPS شخصی (Ubuntu LTS) | کنترل کامل، IP ثابت، دسترسی مستقیم به Telegram و IMAP؛ هزینه‌ی اضافی ندارد چون سرور موجود است |
| **Logging/Alert** | خطاها | فایل لاگ + پیام تلگرام مدیریتی در صورت شکست | بدون ابزار اضافه |

### ارکستریشن: مقایسه و توصیه صریح
| گزینه | مزایا | معایب | نتیجه |
|---|---|---|---|
| **کد ساده Python** | کنترل کامل، تست‌پذیر، بدون وابستگی به سرویس | باید خودتان لاگ/ری‌تری بنویسید | ✅ **توصیه** |
| n8n (self-host) | UI بصری، اتصال آماده به Gmail/Telegram | نگهداری یک سرویس دیگر، منطق پیچیده در JSON/JS سخت است، رفتار retry ناپایدارتر | ❌ برای این پروژه اضافه است |
| LangGraph / framework ایجنت | گراف حالت، ابزارها | پیچیدگی زیاد برای یک pipeline خطی | ❌ زودهنگام |

**توصیه:** یک پروژه‌ی Python با چند ماژول خطی. اگر بعداً شرط‌ها و شاخه‌ها زیاد شد، LangGraph را در نظر بگیرید.

---

## ۴. ساختار پوشه‌ها و Stack

```text
upwork-intelligence/
├── research/                  # همین تحقیق (Markdown)
├── prompts/
│   ├── extract.v1.md
│   ├── score.v1.md
│   └── proposal_writer.v1.md
├── rubric/
│   └── rubric.v1.yaml         # وزن‌ها، آستانه‌ها، red flags
├── profile/
│   ├── profile.yaml           # ⚠️ خصوصی؛ در .gitignore
│   └── examples/              # ⚠️ خصوصی؛ در .gitignore
├── src/
│   ├── config.py              # env + validation
│   ├── ingest/imap_client.py
│   ├── parse/email_to_text.py
│   ├── store/db.py            # sqlite + migrations
│   ├── llm/
│   │   ├── base.py            # interface + retry
│   │   ├── providers.py       # gemini, groq, openrouter, ollama (OpenAI-compatible)
│   │   └── chain.py           # fallback + circuit breaker
│   ├── pipeline/
│   │   ├── extract.py
│   │   ├── gates.py           # hard gates
│   │   ├── score.py           # weighted score
│   │   └── propose.py
│   ├── notify/telegram.py     # send, split, format
│   ├── commands/telegram_poll.py   # /applied /skip /won
│   └── main.py                # run_once() + scheduler entry
├── tests/
│   ├── fixtures/              # ⚠️ ایمیل‌های sanitized فقط؛ بدون اطلاعات شخصی
│   ├── test_parse.py
│   ├── test_gates.py
│   ├── test_score.py
│   └── test_schema.py
├── data/                      # ⚠️ SQLite و لاگ؛ در .gitignore
├── .env.example               # بدون کلید واقعی
├── pyproject.toml
└── README.md
```

**Stack:** Python 3.12 · `uv` (مدیریت پکیج) · `httpx` · `pydantic v2` · `sqlite3` (stdlib) · `imapclient` · `selectolax` · `pytest` · `systemd timer`.

**چرا Python؟** اکوسیستم مناسب برای IMAP، HTML parsing و Pydantic؛ کدِ کم برای تنها یک pipeline.

---

## ۵. Schema دیتابیس (SQLite)

```sql
CREATE TABLE IF NOT EXISTS emails (
  id              INTEGER PRIMARY KEY,
  gmail_uid       INTEGER NOT NULL UNIQUE,          -- IMAP UID
  message_id      TEXT,                              -- Message-ID header
  received_at     TEXT NOT NULL,                     -- ISO-8601 UTC
  subject         TEXT,
  from_addr       TEXT,
  email_type      TEXT,                              -- job_alert | invitation | message | ...
  body_text       TEXT,                              -- پاک‌سازی‌شده؛ می‌توان حذف/هش کرد
  processed_at    TEXT,
  status          TEXT NOT NULL DEFAULT 'new'        -- new | extracted | skipped | error
);

CREATE TABLE IF NOT EXISTS jobs (
  id                  INTEGER PRIMARY KEY,
  upwork_job_id       TEXT UNIQUE,                   -- از URL (~...)؛ اگر نبود، hash(url)
  url                 TEXT NOT NULL,
  title               TEXT NOT NULL,
  description_summary TEXT,
  job_type            TEXT,                          -- hourly | fixed | unknown
  budget_currency    TEXT,
  budget_min          REAL,
  budget_max          REAL,
  budget_unit         TEXT,                          -- hour | project
  experience_level    TEXT,
  duration            TEXT,
  client_country      TEXT,
  client_payment_verified INTEGER,                   -- 0 | 1 | NULL
  client_rating       REAL,
  client_total_spent  REAL,
  client_hires        INTEGER,
  proposals_count     INTEGER,
  connects_required   INTEGER,
  skills_json         TEXT,
  screening_json      TEXT,
  extracted_json      TEXT NOT NULL,                 -- خروجی کامل Extract
  first_seen_at       TEXT NOT NULL,
  last_seen_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_seen ON jobs(first_seen_at);

CREATE TABLE IF NOT EXISTS evaluations (
  id              INTEGER PRIMARY KEY,
  job_id          INTEGER NOT NULL REFERENCES jobs(id),
  rubric_version  TEXT NOT NULL,
  score           REAL NOT NULL,
  verdict         TEXT NOT NULL,                     -- APPLY | MAYBE | SKIP
  gates_failed    TEXT,                              -- JSON array
  subscores_json  TEXT NOT NULL,
  red_flags_json  TEXT,
  summary_fa      TEXT,
  model           TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id              INTEGER PRIMARY KEY,
  job_id          INTEGER NOT NULL REFERENCES jobs(id),
  version         INTEGER NOT NULL DEFAULT 1,
  prompt_version  TEXT NOT NULL,
  model           TEXT NOT NULL,
  draft_text      TEXT NOT NULL,
  final_text      TEXT,                              -- نسخه‌ی ویرایش‌شده‌ی شما
  placeholders    TEXT,                              -- JSON
  claims_used     TEXT,                              -- JSON
  status          TEXT NOT NULL DEFAULT 'draft',     -- draft | sent | edited | submitted_by_user | rejected
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id              INTEGER PRIMARY KEY,
  job_id          INTEGER REFERENCES jobs(id),
  proposal_id     INTEGER REFERENCES proposals(id),
  action          TEXT NOT NULL,                     -- applied | skip | won | replied | interview | hired | not_interested
  reason          TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id              INTEGER PRIMARY KEY,
  job_id          INTEGER REFERENCES jobs(id),
  chat_id         TEXT NOT NULL,
  message_id      INTEGER NOT NULL,
  sent_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_calls (
  id              INTEGER PRIMARY KEY,
  purpose         TEXT NOT NULL,                     -- extract | score | propose
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  latency_ms      INTEGER,
  status          TEXT NOT NULL,                     -- ok | rate_limited | error | schema_invalid
  error           TEXT,
  created_at      TEXT NOT NULL
);
```

**Deduplication:** کلید اصلی جاب `upwork_job_id` است. اگر نبود، `sha256(normalized_title + client_country + budget)`. پیام تلگرام فقط یک بار برای هر جاب (با `telegram_messages`) ارسال شود؛ به‌روزرسانی‌ها به‌صورت reply.

---

## ۶. قالب پیام نهایی تلگرام (دقیق)

> **parse_mode = HTML** (توصیه: ساده‌تر از MarkdownV2 که نیاز به escape زیاد دارد). کاراکترهای `<`, `>`, `&` در متن جاب باید escape شوند.
> `<pre>` در تلگرام قابل کپی با یک‌ضرب است؛ پروپوزال را داخل `<pre>` بگذارید.

```html
🟢 <b>APPLY · 82/100</b> · #job_7f3a
<b>Title:</b> Senior React/Next.js engineer for B2B dashboard
💰 <b>Budget:</b> $35–$50/hr · ⏱ 3–6 months · 🎯 Expert
🌍 <b>Client:</b> United States · ⭐ 4.9 · $48K spent · 23 hires · ✅ payment verified
👥 <b>Proposals so far:</b> 8 · 🔌 <b>Connects:</b> 16 (اعلام‌شده در آگهی)

🔗 https://www.upwork.com/jobs/~xxxxxxxxxxxxxxxx

🧠 <b>خلاصه:</b> پروژه‌ی داشبورد B2B با React و Next.js و نیاز به بهینه‌سازی لیست‌های بزرگ. تطابق مهارتی بالا. ریسک: scope مربوط به Auth هنوز مشخص نیست.

✅ <b>تطابق:</b> React, Next.js, TypeScript, Postgres
⚠️ <b>Red flags:</b> —
❓ <b>سوال قبل از اپلای:</b> SSO مورد نیاز است؟

📝 <b>پیش‌نویس پروپوزال (v1، ۱۴۷ کلمه)</b>
<pre>Your tenant lists slowing down on large accounts usually points to the query plan before the UI...

[PLACEHOLDER: confirm metric from profile before sending]

My first step would be to capture slow traces for two real tenants...

Are the tenant lists server-paginated today?</pre>

<i>دستورات: /applied 7f3a · /skip 7f3a · /won 7f3a · /note 7f3a متن</i>
```

**نکات قالب:**
- اگر `placeholders` خالی نیست → خط ⚠️ «پیش‌نویس placeholder دارد؛ قبل از ارسال پر کنید».
- اگر verdict = MAYBE → آیکن 🟡 و بدون پروپوزال یا با پروپوزال کوتاه.
- اگر verdict = SKIP → پیام ارسال نمی‌شود (پیش‌فرض)؛ فقط در لاگ.
- اگر پیام بیش از ۴۰۹۶ کاراکتر → بخش پروپوزال در پیام دوم (با `reply_to`).
- **پیام نمونه با داده‌های فرضی است.**

---

## ۷. مدیریت خطا، Rate limit، Deduplication، Retry

| سناریو | رفتار |
|---|---|
| 429 از LLM | `Retry-After` را احترام بگذارید؛ provider را cooldown کنید؛ به provider بعدی بروید |
| 5xx/Timeout | retry با exponential backoff + jitter (حداکثر ۲ بار) |
| JSON نامعتبر | یک بار پرامپت اصلاح؛ اگر باز خطا → job در حالت `needs_review` |
| همه providerها شکست | job در صف؛ پیام مدیریتی به تلگرام؛ دوباره در سهمیه‌ی بعدی |
| IMAP قطع | retry؛ اگر ۳ بار شکست، پیام مدیریتی؛ UID جلو نرود |
| Telegram 429 | `retry_after` را دقیقاً رعایت کنید؛ پیام‌ها را صف کنید |
| Telegram 400 (message too long) | تقسیم در مرز خط؛ HTML tag باز نماند |
| تکراری | `upwork_job_id` یکتا؛ `telegram_messages` جلوی ارسال دوباره |
| ایمیل غیرجاب | `email_type != job_alert` → ذخیره، بدون امتیاز، بدون پیام |
| خطای داخلی | لاگ با traceback، `status=error`، پیام مدیریتی اگر تکرار شد |

### عملیات روی VPS شخصی (Ops)
- **OS و کاربر:** Ubuntu LTS، کاربر `agent` بدون sudo، ورود فقط با SSH key، غیرفعال‌سازی ورود با رمز.
- **فایروال:** UFW با فقط پورت SSH باز؛ هیچ سرویس وب عمومی لازم نیست (Worker فقط outbound دارد: IMAP، Telegram API، LLM API).
- **به‌روزرسانی امنیتی:** `unattended-upgrades` فعال.
- **زمان‌بند:** `systemd timer` (بخش ۰۶) به‌جای cron، چون لاگ و وضعیت شکست واضح است.
- **بک‌آپ:** SQLite با `sqlite3 data/app.db ".backup ..."` روزانه و کپی در فضای دیگر (مثلاً یک bucket رمزگذاری‌شده)؛ `profile/` و `.env` جدا بک‌آپ شوند.
- **مانیتورینگ:** اگر ۳۰ دقیقه اجرای موفق نبود یا disk بیش از ۸۰٪ بود، پیام به Telegram مدیریتی (health check ساده).
- **منابع:** پروسه‌ی Worker حدود ۱۵۰–۳۰۰ MB RAM؛ اگر Ollama اضافه شود، به ~۸–۱۶ GB RAM نیاز دارد.
- **Secrets:** `.env` با `chmod 600`، مالک `agent`؛ بدون لاگ‌گیری از مقادیر.

**Telegram limits (منابع ثالث با اشاره به FAQ رسمی؛ صفحه‌ی رسمی `core.telegram.org` در این جلسه ۴۰۳ داد):** حداکثر ۴۰۹۶ کاراکتر متن؛ حدود ۱ پیام در ثانیه به یک چت؛ ۲۰ پیام در دقیقه به یک گروه؛ حدود ۳۰ پیام در ثانیه برای کل. (تقریباً مطمئن، اما قبل از production تأیید کنید.)

---

## ۸. ریسک‌ها و کاهش آن‌ها

| ریسک | احتمال | اثر | کاهش |
|---|---|---|---|
| **ToS / بن اکانت** (ارسال خودکار، اسکرپ) | پایین با طراحی فعلی | بسیار بالا | ایجنت فقط ایمیل می‌خواند؛ ثبت دستی؛ volume انسانی؛ بدون ورود به Upwork |
| **محدودیت جغرافیایی کاربر** (ایران) | **بالا** | بسیار بالا | قبل از هر کاری تأیید حقوقی؛ بدون دور زدن |
| Free tier تغییر یا حذف | متوسط–بالا | متوسط | Fallback chain؛ provider local |
| LLM پروپوزال «AI-like» | بالا | پاسخ کم | placeholder، claim-check، cliché filter، بازبینی شما |
| Hallucination (ادعای تجربه‌ی جعلی) | متوسط | بسیار بالا (اعتبار و قانونی) | grounding فقط از profile؛ claims_used؛ placeholder |
| نشت داده‌ی ایمیل به سرویس خارجی | متوسط | بالا | فیلتر فرستنده؛ حذف footer/شماره/آدرس؛ Free tier فقط ایمیل Upwork؛ داده‌ی حساس نفرستید |
| تلگرام برای شما در ایران مسدود است | **بالا** | بالا | VPN مسئولیت شماست؛ یا پیام به ایمیل (fallback) یا پیام‌رسان داخلی که API آن را تأیید کنید |
| فیلدهای ایمیل ناقص (client stats) | بالا | متوسط | `null` ≠ fail؛ کاهش confidence؛ تست با ۵ ایمیل واقعی |
| کاهش Connects / هزینه | متوسط | متوسط | بودجه‌ی ماهانه؛ MAYBE بدون پروپوزال |
| کلاهبرداری و ایمیل‌های تقلبی (phishing) | کم–متوسط | بالا | فقط ایمیل‌های از `upwork.com`؛ SPF/DKIM را بررسی کنید؛ هیچ لینکی را ایجنت باز نمی‌کند |

---

## ۹. امنیت و حریم خصوصی

- **دسترسی حداقلی:** ترجیحاً یک آدرس Gmail اختصاصی برای Alertهای Upwork (همان ایمیلی که در تنظیمات Upwork ثبت است). اتصال با App Password (IMAP، نیازمند 2-Step Verification؛ **تأیید نشد در این جلسه**) یا OAuth با scope محدود `gmail.readonly` و فقط برای برچسب `Upwork`. جزئیات در `06`.
- **Secrets:** `.env` با مجوز `600`، هرگز در Git؛ `.env.example` بدون کلید.
- **داده:** SQLite محلی؛ `body_text` ایمیل بعد از ۳۰ روز پاک یا hash شود (`retention_days: 30`).
- **لاگ:** بدون متن کامل ایمیل یا پروپوزال؛ فقط شناسه و وضعیت.
- **LLM:** فقط بخش لازم جاب ارسال شود، نه کل ایمیل/صندوق.
- **Git:** `profile/`، `data/`، `*.sqlite`، `.env` در `.gitignore`.

---

## ۱۰. نقشه‌ی راه (فازبندی)

### MVP — یک آخر هفته (~۱۲–۱۶ ساعت کار متمرکز)
**شنبه:**
1. ساخت repo ساختار + `.env.example` + SQLite migrations.
2. Gmail filter + IMAP ingest برای برچسب `Upwork` (تست با ۵ ایمیل sanitized).
3. Parse و dedupe.
4. Extract با **یک** provider (Gemini) + Pydantic.

**یکشنبه:**
5. Gates + Score (rubric.v1).
6. Proposal (یک provider) + قواعد cliché و placeholder.
7. Telegram send (HTML، تقسیم پیام) + `/applied` `/skip` (long polling).
8. systemd timer هر ۵ دقیقه + لاگ + پیام مدیریتی خطا.

**معیار پذیرش MVP:** ۲۰ ایمیل تست → حداقل ۱۸ استخراج درست؛ پیام تلگرام بدون خطای فرمت؛ هیچ پیام تکراری؛ هیچ ارسال خودکار به Upwork.

### فاز ۲ (هفته‌های ۲–۴)
- Fallback chain کامل + circuit breaker.
- Inline buttons (✅ پیش‌نویس تأیید / ✏️ ویرایش / ❌ رد) با callback.
- Few-shot از پروپوزال‌های موفق (top-k مشابه).
- داشبورد ساده (Markdown report هفتگی): نرخ APPLY، ویرایش، پاسخ‌ها.
- کالیبراسیون rubric با ۵۰ جاب برچسب‌خورده.

### فاز ۳ (در صورت نیاز)
- Gmail API + Pub/Sub watch (کمتر از ۵ دقیقه تأخیر؛ نیاز به GCP + تمدید هر ۷ روز؛ تأیید شده).
- Postgres/Supabase اگر چند کاربر یا تاریخچه‌ی بزرگ.
- ارزیابی خودکار با LLM-as-judge + دیتاست ارزیابی.
- بررسی Upwork API (`marketplaceJobPostingsSearch`) **فقط** اگر حساب شما شرایط رسمی را داشت و مصرف با ToS سازگار بود.
