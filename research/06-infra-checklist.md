# ۰۶ — چک‌لیست حساب‌ها و راه‌اندازی (نسخه‌ی Option B: Lambda)

> **زیرساخت:** AWS Lambda + EventBridge Scheduler + SSM Parameter Store. هیچ سرور دائم، دیتابیس یا VPS لازم نیست. Telegram Serverless دیگر استفاده نمی‌شود.
> **راهنمای گام‌به‌گام:** `bot/README.md`.

## ۱. حساب‌ها

| # | سرویس | کاربرد | هزینه | نیاز به تأیید | وضعیت |
|---|---|---|---|---|---|
| 1 | **AWS** | Lambda، EventBridge، SSM، CloudWatch | سطح رایگان؛ کارت لازم است | منطقه‌ی `eu-west-2` (لندن) پیشنهاد؛ شرایط ثبت‌نام را بخوانید | ☐ |
| 2 | **Gmail** (اختصاصی) | ایمیل‌های Upwork-Alerts | رایگان | — | ☐ |
| 3 | **Google Cloud** (Gmail API + OAuth Desktop) | Refresh Token | رایگان | ⚠️ تأیید نشد: انقضای توکن در حالت Testing | ☐ |
| 4 | **Telegram** + BotFather | ارسال پیام | رایگان | — | ☐ |
| 5 | **Google AI Studio** (Gemini) | LLM اصلی | تأیید نشد: سهمیه‌ی free tier | تأیید: بند استفاده‌ی داده در شرایط Gemini | ☐ |
| 6 | **Groq** (اختیاری) | fallback، open-weight | تأیید نشد: سهمیه | شرایط Groq | ☐ |
| 7 | **OpenRouter** (اختیاری) | fallback، مدل‌های `:free` | تأیید نشد: سهمیه | شرایط OpenRouter | ☐ |
| 8 | **GitHub** (مخزن خصوصی) | کد | رایگان | — | ☐ |

**دسترسی منطقه‌ای:** کاربر خارج از ایران است؛ محدودیت منطقه‌ای برای این سرویس‌ها پذیرفته شده است، اما **شما شرایط منطقه‌ای هر سرویس را تأیید کنید.**

## ۲. ابزارهای محلی

- [ ] Node.js 22 (`node -v`)
- [ ] AWS CLI v2 و `aws configure` یا SSO؛ `aws sts get-caller-identity` باید کار کند
- [ ] AWS SAM CLI (`sam --version`)
- [ ] Git

## ۳. مراحل

1. **Gmail و OAuth:** برچسب و فیلتر، پروژه‌ی Google Cloud، Desktop client، `npm run token` → Refresh Token.
2. **Telegram:** `/newbot` در BotFather؛ `/start` به ربات؛ `getUpdates` برای گرفتن `chat.id`.
3. **Build:** `cd bot && npm install && npm test && npm run build`.
4. **SSM:** `npm run secret -- <NAME>` برای هر secret (ورودی پنهان).
5. **پروفایل:** `src/lib/profile.js` را کامل کنید (همه‌ی `[TODO]`).
6. **Deploy:** `sam deploy --template-file infra/template.yaml --stack-name upwork-agent --capabilities CAPABILITY_IAM --resolve-s3 --region eu-west-2`.
7. **تست:** `aws lambda invoke ...` و `aws logs tail /aws/lambda/upwork-agent --follow`.

## ۴. چک‌لیست امنیت

- [ ] هیچ کلید یا توکنی در Git نیست (`.gitignore` شامل `build/`، `node_modules/`، `.env`، `*.secret`، `*.refresh-token`)
- [ ] secrets فقط در SSM به‌صورت SecureString هستند
- [ ] Gmail اختصاصی است؛ Refresh Token با دسترسی `gmail.modify` است
- [ ] هشدار هزینه‌ی AWS در Billing فعال شده است (پیشنهاد: آستانه‌ی کم)
- [ ] کاربر تأیید کرده است که متن ایمیل به LLM ارسال می‌شود

## ۵. نگهداری

| کار | دوره |
|---|---|
| بررسی لاگ CloudWatch برای خطای تکراری | هفتگی در ماه اول |
| بررسی سهمیه‌ی LLM و تغییر مدل‌ها | ماهانه |
| بررسی شرایط Upwork و Gemini | سه‌ماهه |
| به‌روزرسانی Node.js runtime در قالب | وقتی AWS نسخه‌ی جدید را حذف کرد |

## ۶. منابع و تأیید

- مستندات رسمی AWS Lambda، EventBridge Scheduler، SSM، CloudFormation/SAM.
- قیمت‌ها و سهمیه‌ها: **تأیید نشد** در این نسخه؛ قبل از اقدام بررسی کنید.
