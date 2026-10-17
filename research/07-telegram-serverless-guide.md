# ۰۷ — راهنمای یادگیری ابزارهای پروژه (نسخه‌ی Option B)

> **وضعیت:** این فایل به‌روز شد. راهنمای Telegram Serverless دیگر مسیر پیاده‌سازی نیست. این نسخه ابزارهای فعلی را توضیح می‌دهد. نام فایل برای سازگاری با لینک‌های قبلی حفظ شده است.
> **قاعده‌ی سطح اطمینان:** موارد «تأیید نشد» را قبل از استفاده بررسی کنید.

## ۱. مفاهیم کلیدی

| مفهوم | توضیح ساده | در این پروژه |
|---|---|---|
| **Serverless / Lambda** | کد را بدون سرور دائم اجرا می‌کنید؛ AWS فقط وقت اجرا را می‌گیرد | تابع `upwork-agent` |
| **Trigger / Scheduler** | چیزی که اجرا را شروع می‌کند | EventBridge Scheduler، هر ۵ دقیقه |
| **IAM** | تعیین اینکه تابع چه کارهایی مجاز است | فقط خواندن SSM و Decrypt |
| **SSM Parameter Store** | جای امن نگه‌داری تنظیمات و کلیدها | SecureString با پیشوند `/upwork-agent/` |
| **SAM / CloudFormation** | قالب YAML که کل زیرساخت را توصیف می‌کند | `bot/infra/template.yaml` |
| **OAuth2 Refresh Token** | اجازه‌ی بلندمدت برای خواندن Gmail | `GMAIL_REFRESH_TOKEN` |
| **Gmail label و UNREAD** | وضعیت «پردازش‌نشده» بدون دیتابیس | برچسب `Upwork-Alerts` و `is:unread` |
| **LLM و fallback** | مدل زبانی؛ اگر یکی خطا داد، بعدی | Gemini → Groq → OpenRouter |
| **Schema / JSON validation** | تضمین ساختار خروجی مدل | `src/lib/validate.js` |
| **Hard gates و امتیاز وزنی** | قوانین قطعی قبل از امتیازدهی | `src/lib/score.js` (G1–G7) |
| **Idempotency** | اجرای دوباره نتیجه‌ی تکراری ندهد | فقط با UNREAD؛ ریسک تکرار در بخش ۰۵ |

## ۲. ابزارهای عملی

```bash
# نصب و تست
cd bot && npm install && npm test

# ساخت بسته و deploy
npm run build
sam deploy --template-file infra/template.yaml --stack-name upwork-agent \
  --capabilities CAPABILITY_IAM --resolve-s3 --region eu-west-2

# مشاهده‌ی لاگ
aws logs tail /aws/lambda/upwork-agent --follow --region eu-west-2
```

## ۳. مسیر یادگیری پیشنهادی

1. **JSON و HTTP:** خواندن یک پاسخ `fetch` و ساختار JSON.
2. **Gmail API:** `messages.list` با `q=`، سپس `messages.get`، سپس `messages.modify`.
3. **OAuth:** چرا Refresh Token لازم است و Access Token کوتاه‌عمر است.
4. **Lambda:** handler، timeout، لاگ، و تفاوت تابع با سرور.
5. **EventBridge Scheduler:** `rate(5 minutes)` و تفاوت با cron.
6. **LLM:** توکن، context window، structured output، و fallback.

## ۴. منابع

- مستندات رسمی AWS Lambda، EventBridge Scheduler، SSM، SAM.
- مستندات رسمی Gmail API.
- Telegram Bot API `sendMessage` (مستندات رسمی را تأیید کنید).
