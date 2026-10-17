# Upwork Proposal Agent — راهنمای نصب و Deploy (AWS Lambda)

هر ۵ دقیقه، Lambda ایمیل‌های خوانده‌نشده‌ی برچسب `Upwork-Alerts` را از Gmail می‌خواند، با LLM استخراج و امتیازدهی می‌کند، برای جاب‌های مناسب (🟢 APPLY / 🟡 MAYBE) پیش‌نویس پروپوزال می‌سازد و مستقیم در **Telegram** برای شما می‌فرستد.

> **مهم:** ربات هیچ‌وقت خودش روی Upwork اپلای نمی‌کند. ارسال پروپوزال همیشه دستی و توسط شماست.
> **داده:** متن ایمیل و پروپوزال ذخیره نمی‌شود. وضعیت «پردازش‌شده» فقط برچسب `UNREAD` در Gmail است. کلیدها در SSM Parameter Store (رمزنگاری‌شده) هستند. متن ایمیل به ارائه‌دهنده‌ی LLM فرستاده می‌شود؛ شرایط Gemini / Groq / OpenRouter را بخوانید.

---

## ۰. پیش‌نیازها

| مورد | دلیل | هزینه |
|---|---|---|
| حساب AWS (با تأیید هویت و کارت) | Lambda، EventBridge Scheduler، SSM، CloudWatch | سطح رایگان؛ تخمین: صفر تا چند سنت در ماه (تأیید نشد: قیمت‌ها را در صفحه‌ی AWS بررسی کنید) |
| AWS CLI v2 با دسترسی (`aws configure` یا SSO) | ارسال secrets و اجرای دستورها | رایگان |
| AWS SAM CLI | deploy قالب `infra/template.yaml` | رایگان |
| Node.js 22 | تست و ساخت بسته (روی Node 22 تست شده) | رایگان |
| Gmail اختصاصی + برچسب `Upwork-Alerts` | منبع ایمیل‌های جاب | رایگان |
| Google Cloud + Gmail API + OAuth Desktop | دسترسی Gmail | رایگان (⚠️ تأیید نشد: انقضای Refresh Token در حالت Testing) |
| BotFather (ربات تلگرام) | ارسال پیام | رایگان |
| کلید Gemini (Google AI Studio) | LLM اصلی | رایگان (⚠️ تأیید نشد: سهمیه) |
| کلید Groq یا OpenRouter (اختیاری) | fallback | رایگان (⚠️ تأیید نشد) |

**منطقه‌ی AWS:** چون شما در لندن هستید، `eu-west-2` (London) پیشنهاد می‌شود. این انتخاب شماست؛ در همه‌ی دستورها `--region` را همان بگذارید.
**قبل از ثبت‌نام:** مطمئن شوید هر سرویس در کشور شما مجاز است و حساب‌ها به نام واقعی‌تان هستند.

---

## ۱. Gmail و Gmail API (یک‌بار)

1. برچسب `Upwork-Alerts` و فیلتر را در Gmail بسازید (ایمیل‌های Upwork را برچسب بزنید).
2. در Google Cloud یک پروژه بسازید، **Gmail API** را فعال کنید.
3. **OAuth consent screen**: External؛ آدرس Gmail خودتان را Test user کنید.
4. **OAuth client ID** از نوع **Desktop app** بسازید. Client ID و Client secret را نگه دارید.
5. Refresh Token را روی سیستم خودتان بگیرید:

```bash
cd bot
GMAIL_CLIENT_ID='...' GMAIL_CLIENT_SECRET='...' npm run token
```
مرورگر باز می‌شود؛ با Gmail اختصاصی وارد شوید و دسترسی `gmail.modify` بدهید. Refresh Token در ترمینال چاپ می‌شود.

---

## ۲. ربات تلگرام و شناسه‌ی چت شما

1. در **@BotFather** با `/newbot` ربات بسازید. **توکن** را نگه دارید (فرمت `123456:ABC...`). این توکن عادی ربات است، نه توکن CLI.
2. یک‌بار به ربات خود `/start` بفرستید.
3. در مرورگر این آدرس را باز کنید (`<TOKEN>` را با توکن خودتان بگذارید):
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
   در JSON خروجی، مقدار `"chat":{"id": ...}` را پیدا کنید. آن عدد **OWNER_TG_ID** شماست.

> اگر webhook فعال باشد `getUpdates` خالی است؛ ربات جدید معمولاً فعال نیست.

---

## ۳. نصب، تست و ساخت بسته

```bash
cd upwork-intelligence/bot
npm install
npm test          # ۳۱ تست؛ باید همه pass شوند
npm run build     # ساخت build/pkg (کد و lib؛ بدون وابستگی npm)
```

---

## ۴. ذخیره‌ی secrets در SSM (یک‌بار، با ورودی پنهان)

با AWS CLI احراز هویت شوید و منطقه را مشخص کنید:
```bash
export AWS_REGION=eu-west-2
aws sts get-caller-identity     # باید حساب شما را نشان دهد
```

هر secret را جداگانه بدهید (مقدار پنهان تایپ می‌شود و در تاریخچه‌ی shell نمی‌ماند):
```bash
npm run secret -- TELEGRAM_BOT_TOKEN
npm run secret -- OWNER_TG_ID
npm run secret -- GMAIL_CLIENT_ID
npm run secret -- GMAIL_CLIENT_SECRET
npm run secret -- GMAIL_REFRESH_TOKEN
npm run secret -- GEMINI_API_KEY
# اختیاری:
npm run secret -- GROQ_API_KEY
npm run secret -- OPENROUTER_API_KEY
npm run secret -- GMAIL_QUERY           # اگر نام برچسب فرق دارد: label:"نام" is:unread
npm run secret -- GEMINI_MODEL          # اگر مدل دیگری می‌خواهید
```
همه‌ی نام‌های مجاز در `src/lib/config.js` است.

> ریسک: این مقادیر در SSM به‌صورت SecureString هستند؛ Lambda به‌صورت پیش‌فرض آن‌ها را از SSM می‌خواند و در متغیر محیطی نمی‌گذارد.

---

## ۵. پروفایل خودتان (ضروری)

فایل `src/lib/profile.js` را باز کنید و همه‌ی `[TODO]` را با واقعیت‌های خودتان پر کنید: مهارت‌ها، حداقل نرخ‌ها، کشورهای مسدود (اختیاری)، و نتایج قابل اثبات. تا وقتی `[TODO]` باقی است، هیچ پیامی ارسال نمی‌شود و خطا در لاگ ثبت می‌شود.

---

## ۶. Deploy

```bash
npm run build
sam deploy \
  --template-file infra/template.yaml \
  --stack-name upwork-agent \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --region eu-west-2
```

بار اول می‌تواند چند دقیقه طول بکشد. بعد از تغییر کد یا پروفایل، همان دستورها را دوباره بزنید.

---

## ۷. بررسی اجرا

اجرای دستی یک‌بار (بدون انتظار ۵ دقیقه):
```bash
aws lambda invoke --function-name upwork-agent --region eu-west-2 out.json && cat out.json
aws logs tail /aws/lambda/upwork-agent --follow --region eu-west-2
```
اگر جاب مناسبی باشد، پیام در تلگرام می‌آید. پیش‌نویس را بازبینی کنید، `placeholder` ها را پر کنید و **خودتان** در Upwork ارسال کنید.

---

## ۸. توقف و حذف

- **توقف موقت:** در کنسول AWS → **EventBridge → Scheduler** برنامه‌ی زمان‌بندی تابع را Disable کنید.
- **حذف کامل:** `aws cloudformation delete-stack --stack-name upwork-agent --region eu-west-2` (و secrets را از SSM پاک کنید: `aws ssm delete-parameters --names ...`).

---

## ۹. خطایابی

| پیام در لاگ / تلگرام | معنی | کار |
|---|---|---|
| `Could not load credentials` | AWS CLI یا دسترسی نیست | `aws configure` یا SSO |
| `تنظیمات ناقص است: …` | secret نیست | بخش ۴ |
| `lib/profile.js هنوز کامل نشده` | `[TODO]` باقی است | بخش ۵ |
| `⚠️ اجرای خودکار ناموفق` (تلگرام) | خطای کل اجرا، مثلاً توکن Gmail باطل | لاگ را ببینید؛ secret را به‌روز کنید |
| `transient failure, will retry next run` (لاگ) | LLM یا Gmail موقتاً خطا داده؛ ایمیل UNREAD مانده | معمولاً خودش حل می‌شود؛ اگر تکرار شد، سهمیه و کلید را بررسی کنید |
| `⚠️ یک ایمیل پردازش نشد` (تلگرام) | ایمیل مشکل ساختاری دارد (مثلاً لینک جاب ندارد)؛ خوانده‌شده شد | بررسی دستی در Gmail |
| `invalid_grant` در Gmail | Refresh Token منقضی یا ابطال شده | بخش ۱ را تکرار کنید و `GMAIL_REFRESH_TOKEN` را عوض کنید |

---

## ۱۰. یادداشت‌های فنی و محدودیت‌ها

- **زمان‌بندی:** هر ۵ دقیقه (`rate(5 minutes)`). `ReservedConcurrentExecutions: 1` یعنی اجراها هم‌زمان نمی‌شوند.
- **ظرفیت:** هر اجرا حداکثر `MAX_PER_RUN` (پیش‌فرض ۵) ایمیل را پردازش می‌کند. بقیه در اجرای بعدی می‌آیند.
- **تکرار:** اگر پیام تلگرام رفت ولی حذف `UNREAD` ناموفق بود، همان ایمیل ممکن است دوباره ارسال شود. این ریسک پذیرفته شده است.
- **Retry خودکار AWS غیرفعال است** (`MaximumRetryAttempts: 0`). ایمیل‌های ناموفق در اجرای بعدی خودشان دوباره بررسی می‌شوند.
- **سقف زمان اجرا:** Lambda حداکثر ۹۰۰ ثانیه مجاز دارد؛ ما ۳۰۰ ثانیه تنظیم کرده‌ایم. اگر LLM کند شد، `Timeout` را در `infra/template.yaml` بالا ببرید.
- **Telegram Serverless:** دیگر استفاده نمی‌شود (زمان‌بند ندارد). کد قدیمی آن در تاریخچه‌ی Git است.
- **مدل‌ها و سهمیه‌ها:** نام مدل‌ها و سهمیه‌های free tier تغییر می‌کنند؛ قبل از استفاده در صفحه‌ی رسمی همان سرویس بررسی کنید.

## ۱۱. نقشه‌ی فایل‌ها

```
bot/
├─ src/
│  ├─ lambda.mjs          ← نقطه‌ی ورود Lambda (SSM + Telegram)
│  ├─ package.json         ← type: module (برای runtime)
│  └─ lib/
│     ├─ pipeline.js       ← جریان اصلی هر اجرا
│     ├─ gmail.js          ← Gmail API با fetch
│     ├─ llm.js            ← Gemini → Groq → OpenRouter
│     ├─ prompts.js        ← extract.v1 / score.v1 / proposal_writer.v1
│     ├─ validate.js       ← اعتبارسنجی JSON خروجی LLM
│     ├─ score.js          ← Hard gates G1–G7 و امتیاز وزنی
│     ├─ clean.js          ← پاک‌سازی متن ایمیل
│     ├─ format.js         ← قالب پیام تلگرام
│     ├─ profile.js        ← پروفایل شما (تنها منبع حقایق)
│     └─ config.js         ← خواندن secrets و پیش‌فرض‌ها
├─ infra/template.yaml     ← SAM: Lambda + زمان‌بند ۵ دقیقه + IAM + لاگ
├─ scripts/
│  ├─ build.sh             ← ساخت build/pkg
│  ├─ put-secret.mjs       ← ذخیره‌ی secret در SSM (ورودی پنهان)
│  └─ get-refresh-token.mjs← گرفتن Refresh Token Gmail
├─ test/                   ← npm test
└─ package.json
```
