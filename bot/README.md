# Upwork Proposal Agent — راهنمای نصب و Deploy

این ربات روی **Telegram Serverless** اجرا می‌شود. شما در تلگرام `/check` می‌زنید؛ ربات ایمیل‌های خوانده‌نشده‌ی برچسب `Upwork-Alerts` را از Gmail می‌خواند، با LLM استخراج و امتیازدهی می‌کند، برای جاب‌های مناسب پیش‌نویس پروپوزال می‌سازد و نتیجه را می‌فرستد.

> **مهم:** ربات هیچ‌وقت خودش روی Upwork اپلای نمی‌کند. ارسال پروپوزال همیشه دستی و توسط شماست.
> **حریم داده:** محتوای ایمیل‌ها و پروپوزال‌ها ذخیره نمی‌شود؛ فقط کلیدها (secrets) در جدول `secrets` نگه‌داری می‌شوند. متن ایمیل به ارائه‌دهنده‌ی LLM فرستاده می‌شود؛ شرایط Gemini/Groq/OpenRouter را بخوانید.
> **محدودیت:** این سرویس زمان‌بند ندارد، پس پردازش فقط با `/check` انجام می‌شود.

---

## ۰. پیش‌نیازها (یک‌بار)

| مورد | چیست | هزینه |
|---|---|---|
| Node.js 18+ | اجرای CLI و تست‌ها (روی Node 22 تست شده) | رایگان |
| حساب Telegram + BotFather | ربات و توکن CLI | رایگان |
| Gmail اختصاصی | دریافت Upwork Alerts | رایگان |
| پروژه‌ی Google Cloud با Gmail API | دسترسی OAuth به Gmail | رایگان (تأیید نشد: سقف‌ها) |
| کلید Gemini (Google AI Studio) | LLM اصلی | رایگان (تأیید نشد: سقف free tier) |
| کلید Groq یا OpenRouter (اختیاری) | fallback | رایگان (تأیید نشد: سقف‌ها) |

**قبل از ثبت‌نام:** مطمئن شوید هر سرویس در کشور شما مجاز است و حساب‌ها به نام واقعی‌تان هستند. Upwork کشورهای محدود دارد؛ این ربات هیچ راه دور زدنی ندارد.

---

## ۱. Gmail و فیلتر Upwork

1. یک Gmail جدید برای alerts بسازید (یا از Gmail فعلی استفاده کنید).
2. در Upwork، ایمیل‌های Job Alert را به این آدرس بفرستید.
3. در Gmail یک **برچسب** با نام دقیقاً `Upwork-Alerts` بسازید و یک فیلتر بگذارید که ایمیل‌های Upwork را برچسب بزند.
4. چند ایمیل تستی بگیرید تا مطمئن شوید برچسب و `UNREAD` درست کار می‌کنند.

> اگر نام برچسب متفاوت است، در تنظیم `GMAIL_QUERY` همان نام را بگذارید (بخش ۵).

---

## ۲. ساخت OAuth برای Gmail (یک‌بار)

1. در [Google Cloud Console](https://console.cloud.google.com/) یک پروژه بسازید.
2. **APIs & Services → Library** را باز کنید و **Gmail API** را فعال کنید.
3. **OAuth consent screen**: نوع **External**؛ Test user را آدرس Gmail خودتان بگذارید.
   - ⚠️ **تأیید نشد:** در حالت Testing، Refresh Token ممکن است پس از مدتی منقضی شود. اگر `invalid_grant` دیدید، این مرحله را تکرار کنید.
4. **Credentials → Create credentials → OAuth client ID** با نوع **Desktop app** بسازید. `Client ID` و `Client secret` را نگه دارید.
5. Refresh Token بگیرید (روی سیستم خودتان، یک‌بار):

```bash
cd bot
GMAIL_CLIENT_ID='...' GMAIL_CLIENT_SECRET='...' npm run token
```

مرورگر باز می‌شود؛ با Gmail اختصاصی وارد شوید و دسترسی `gmail.modify` بدهید. Refresh Token در ترمینال چاپ می‌شود. آن را جای امن نگه دارید و در Git نگذارید.

---

## ۳. ساخت ربات و توکن CLI

1. در تلگرام با **@BotFather** گفتگو کنید و `/newbot` بزنید. توکن ربات را ذخیره کنید.
2. در BotFather، ربات خود را باز کنید: **Serverless → CLI Access → Access token**. این توکن با فرمت `app<id>:<secret>` است و برای `tgcloud login` لازم است.
   - ⚠️ توکن CLI با توکن ربات فرق دارد؛ هر دو را جای امن نگه دارید.

---

## ۴. نصب، تست محلی و deploy

```bash
cd upwork-intelligence/bot
npm install                # نصب @tgcloud/cli (فقط ابزار توسعه)
npm test                   # ۲۹ تست واحد و جریان؛ باید همه pass شوند

npx tgcloud login          # توکن CLI را وارد کنید (ورودی پنهان است)
npx tgcloud push           # ارسال ماژول‌ها به ابر
npx tgcloud migrate        # ساخت جدول secrets؛ تغییرات را بخوانید و تأیید کنید
npx tgcloud webhook        # وضعیت webhook؛ اگر "OUT OF SYNC" بود: npx tgcloud webhook sync
```

> ترتیب مهم است: **push → migrate**. قبل از migrate، جدول `secrets` وجود ندارد.
> `push` ماژول‌های ابر را با فولدر محلی یکی می‌کند؛ همیشه از همین فولدر `bot/` deploy کنید.

---

## ۵. تنظیم مالک و کلیدها (یک‌بار)

### ۵.۱ شناسه‌ی تلگرام خود را بگیرید
به ربات `/start` بفرستید. تا وقتی مالک تعیین نشده، ربات شناسه‌ی عددی شما را جواب می‌دهد.

### ۵.۲ مالک را تنظیم کنید
```bash
node scripts/set-secret.mjs --owner <TG_ID> OWNER_TG_ID
```
> ⚠️ این اولین تنظیم را همان لحظه‌ی بعد از deploy انجام دهید. تا قبل از این، هر کسی که `/start` بزند شناسه‌اش را می‌بیند؛ ولی بدون دسترسی به CLI نمی‌تواند secret تنظیم کند.

### ۵.۳ بقیه‌ی secrets را تنظیم کنید
هر secret را جداگانه با کمک اسکریپت ورودی پنهان بدهید (مقدار در تاریخچه‌ی shell نمی‌ماند):

```bash
node scripts/set-secret.mjs --owner <TG_ID> GMAIL_CLIENT_ID
node scripts/set-secret.mjs --owner <TG_ID> GMAIL_CLIENT_SECRET
node scripts/set-secret.mjs --owner <TG_ID> GMAIL_REFRESH_TOKEN
node scripts/set-secret.mjs --owner <TG_ID> GEMINI_API_KEY
# اختیاری:
node scripts/set-secret.mjs --owner <TG_ID> GROQ_API_KEY
node scripts/set-secret.mjs --owner <TG_ID> OPENROUTER_API_KEY
node scripts/set-secret.mjs --owner <TG_ID> GMAIL_QUERY        # اگر نام برچسب فرق دارد: label:"نام" is:unread
node scripts/set-secret.mjs --owner <TG_ID> GEMINI_MODEL       # اگر مدل دیگری می‌خواهید
```

همه‌ی نام‌های مجاز در `tgcloud/lib/config.js` است. وضعیت را ببینید (بدون نمایش مقادیر):
```bash
npx tgcloud run endpoints/setSecret '{"action":"status"}' --ctx '{"initData":{"user":{"id":<TG_ID>}}}'
```

> **ریسک امنیتی (تأیید نشد):** مکان ذخیره‌ی secret در Telegram Serverless مستند نشده است. مقدار در جدول `secrets` روی زیرساخت تلگرام نگه‌داری می‌شود. کلیدها را با حداقل دسترسی بسازید و در صورت شک ابطال کنید.

---

## ۶. پروفایل خودتان (ضروری)

فایل `tgcloud/lib/profile.js` را باز کنید و همه‌ی `[TODO]` را با **واقعیت‌های خودتان** پر کنید:
- مهارت‌های اصلی و فرعی،
- حداقل نرخ‌ها،
- کشورهای مسدود (اختیاری)،
- ۱ تا ۳ نتیجه‌ی قابل اثبات (`proof_points`)،
- ۲ پروپوزال موفق خودتان در `examples` (فقط سبک).

تا وقتی `[TODO]` باقی باشد، `/check` اجرا نمی‌شود. بعد از تغییر دوباره `npx tgcloud push` بزنید.

---

## ۷. اولین اجرا

1. در تلگرام `/check` بزنید.
2. ربات تعداد ایمیل‌ها را اعلام می‌کند و برای هر کدام یا پیش‌نویس (🟢 APPLY / 🟡 MAYBE) می‌فرستد، یا `SKIP` را بی‌صدا رد می‌کند.
3. هر ایمیل پس از ارسال موفق، برچسب `UNREAD` را از دست می‌دهد؛ یعنی در `/check` بعدی دوباره پردازش نمی‌شود.
4. پیش‌نویس را بازبینی کنید، `placeholder` ها را پر کنید و **خودتان** در Upwork ارسال کنید.

### اگر خطا دیدید
| پیام | معنی | کار |
|---|---|---|
| `تنظیمات ناقص است: ...` | secret نیست | بخش ۵.۳ |
| `lib/profile.js هنوز کامل نشده` | `[TODO]` باقی است | بخش ۶ |
| `Gmail ... 401/403` | توکن منقضی یا scope اشتباه | بخش ۲ را تکرار کنید |
| `همه‌ی LLMها ناموفق بودند` | سهمیه یا کلید | کلید را بررسی کنید؛ `GEMINI_MODEL` را عوض کنید |
| `⚠️ یک ایمیل پردازش نشد` | ایمیل خوانده‌نشده مانده | `/check` بعدی دوباره امتحان می‌کند |

---

## ۸. آزمون پذیرش (MVP)

- ۲۰ ایمیل تست؛ حداقل ۱۸ استخراج درست (بازبینی دستی).
- هیچ پیام تکراری در `/check` بعدی.
- هیچ ارسال خودکار به Upwork.
- در صورت نبودن مقدار در پیام، پیام نمی‌شکند (HTML escape شده).

---

## ۹. نقشه‌ی فایل‌ها

```
bot/
├─ tgcloud/                    ← فقط این پوشه روی ابر deploy می‌شود
│  ├─ schema.js                ← جدول secrets (فقط کلیدها)
│  ├─ handlers/message.js      ← فرمان‌های تلگرام (/check, /help)
│  ├─ endpoints/setSecret.js   ← تنظیم secret از ترمینال (فقط مالک)
│  └─ lib/
│     ├─ pipeline.js           ← جریان اصلی /check
│     ├─ gmail.js              ← Gmail API با fetch
│     ├─ llm.js                ← Gemini → Groq → OpenRouter
│     ├─ prompts.js            ← extract.v1 / score.v1 / proposal_writer.v1
│     ├─ validate.js           ← اعتبارسنجی JSON خروجی LLM
│     ├─ score.js              ← Hard gates G1–G7 و امتیاز وزنی (rubric.v1)
│     ├─ clean.js              ← پاک‌سازی HTML/متن ایمیل
│     ├─ format.js             ← قالب پیام تلگرام
│     ├─ profile.js            ← پروفایل شما (تنها منبع حقایق)
│     └─ config.js             ← خواندن secrets و پیش‌فرض‌ها
├─ scripts/
│  ├─ get-refresh-token.mjs    ← گرفتن Refresh Token Gmail (روی سیستم شما)
│  └─ set-secret.mjs           ← تنظیم secret با ورودی پنهان
├─ test/                       ← تست‌های Node (npm test)
└─ package.json
```

## ۱۰. یادداشت‌های فنی و محدودیت‌ها

- **Dedupe:** فقط برچسب `UNREAD` در Gmail. اگر پیام تلگرام ارسال شد ولی حذف `UNREAD` ناموفق بود، همان ایمیل در `/check` بعدی دوباره ارسال می‌شود (پذیرفته‌شده در معماری).
- **دو `/check` هم‌زمان:** قفل ندارد؛ پیشنهاد می‌شود یکی‌یکی بزنید.
- **سقف زمان اجرا:** منتشر نشده (تأیید نشد). برای همین در هر بار حداکثر `MAX_PER_RUN` (پیش‌فرض ۵) ایمیل پردازش می‌شود.
- **Telegram Serverless** زمان‌بند ندارد؛ اگر روزی پردازش خودکار لازم شد، باید به Lambda + EventBridge برویم (فایل `research/05-architecture.md`، گزینه‌ی ب).
- **Gemini / Groq / OpenRouter:** نام مدل‌ها و سهمیه‌های free tier تغییر می‌کنند. قبل از استفاده در صفحه‌ی رسمی همان سرویس بررسی کنید.
- **HTML:** همه‌ی متن‌های پویا escape می‌شوند؛ هیچ‌کدام از متن ایمیل به‌صورت HTML خام ارسال نمی‌شود.
