# ۰۲ — دستورالعمل نوشتن پروپوزال Upwork (۲۰۲۶)

> هدف: پروپوزالی که **شخصی، مرتبط با جاب، قابل اثبات و کوتاه** باشد. ایجنت فقط **پیش‌نویس** می‌سازد؛ متن نهایی را شما بازبینی و ثبت می‌کنید.

---

## ۱. اصول پایه (منبع‌دار)

| اصل | دلیل/منبع | سطح |
|---|---|---|
| فقط ابتدای پروپوزال دیده می‌شود؛ شروع باید مسئله‌ی کارفرما را نشان دهد | [Upwork Resources](https://www.upwork.com/resources/how-to-create-a-proposal-that-wins-jobs) | رسمی |
| کلاینت‌ها اول «نام، عکس، badge، نرخ، JSS و ابتدای متن» را می‌بینند | [Upwork Resources](https://www.upwork.com/resources/why-are-my-proposals-not-being-viewed) | رسمی |
| سه پاراگراف کوتاه و bullet مناسب‌تر از بلوک متن | Upwork Resources | رسمی |
| طول ۱۵۰–۲۵۰ کلمه (اجماع منابع ثالث) | aiproposer، SnipeWork | چند منبع |
| متن باید اصیل باشد؛ قالب کپی‌شده برای چند جاب = ریسک | تفسیر شرایط + گزارش‌ها | چند منبع |

---

## ۲. ساختار برنده (۵ بخش)

| بخش | طول | محتوا | مثال نوع جمله |
|---|---|---|---|
| **1. Hook** (دو جمله‌ی اول) | ۱–۲ جمله | یک جزئیات واقعی از جاب: مشکل، هدف، محدودیت، عدد، نام ابزار | «Your checkout drop-off at step 3 sounds like a state-sync issue, not a UI one.» |
| **2. Relevance** | ۲–۳ جمله | چرا شما؛ تطابق مستقیم با سیستم/ابزار کارفرما | «I’ve built Next.js + Stripe checkouts for B2B SaaS…» (فقط اگر در پروفایل هست) |
| **3. Proof** | ۱ جمله | یک نتیجه‌ی عددی یا لینک نمونه‌کار | «[PROJECT] reduced [METRIC] from X to Y in Z weeks.» |
| **4. Approach** | ۲–۳ جمله | اولین قدم شما، نقطه‌ی ریسک، تحویل | «I’d start by reproducing the issue with session logs, then…» |
| **5. Question/CTA** | ۱ جمله | یک سوال هدفمند که به تصمیم پروژه کمک کند | «Is the existing state stored client-side or in your API?» |

---

## ۳. قالب (Template) با متغیرها

```text
{{HOOK: one specific detail from the job post, in the client's own terms}}

{{RELEVANCE: 1–2 sentences linking my verified experience to their stack/problem}}

{{PROOF: one measurable result from my profile — or [PLACEHOLDER: add proof] }}

{{APPROACH: first step → checkpoint → deliverable; mention one risk they should know}}

{{QUESTION: one specific question that changes how I'd build it}}
```

**متغیرها:**
- `HOOK` ← از متن جاب استخراج شده (`key_requirements[0]`، `pain_points[0]`)
- `RELEVANCE` ← فقط از `profile.skills` و `profile.projects` (grounded)
- `PROOF` ← از `profile.proof_points` (فقط عدد/نتیجه‌ای که شما تأیید کرده‌اید)
- `APPROACH` ← ایجنت پیشنهاد می‌دهد؛ شما بازبینی می‌کنید
- `QUESTION` ← از `missing_info` یا ابهام‌های جاب

---

## ۴. نمونه‌ها (خوب/بد)

### ❌ بد (عمومی، AI-like، طولانی)
> Hi there! I am excited to apply for this opportunity. With over 5 years of experience in full-stack development, I am confident I can deliver high-quality results. I have worked with React, Node.js, and many other technologies. Thanks for posting! I look forward to hearing from you and discussing how I can help your project succeed.

**چرا بد است:** شروع با «Hi there»، «excited»، «Thanks for posting»؛ بدون جزئیات جاب؛ بدون proof؛ بدون سوال؛ وعده‌های کلی.

### ✅ خوب (مشخص، کوتاه، قابل‌اثبات)
> Your admin dashboard is slow on large tenant lists, and the Postgres query plan you mentioned is the first thing I’d check.
>
> I’ve tuned React Query + paginated endpoints on a multi-tenant B2B dashboard where the list view went from ~4s to under 600ms. [PLACEHOLDER: confirm project name and metric from your profile before sending]
>
> My first step would be to capture slow traces for two real tenants, then fix the query and caching layer before touching the UI. I’d send you a short plan and a timing report after the first two days.
>
> Are the tenant lists server-paginated today, or is the full dataset loaded client-side?

**چرا خوب است:** hook مشخص از جاب؛ proof عددی (با placeholder تا تأیید شود)؛ روش؛ سوال هدفمند.

> ⚠️ عدد داخل نمونه‌ی بالا **نمونه‌ی فرضی** است. هیچ‌وقت عددی را که از پروفایل خودتان تأیید نشده در پروپوزال نگذارید.

---

## ۵. لحن و کلمات

**لحن پیشنهادی (شما گفتید: حرفه‌ای، مستقیم، دوستانه؛ با تأیید):** مستقیم و محترمانه؛ جمله‌ی کوتاه؛ بدون اغراق.

### ❌ عبارت‌هایی که پرهیز کنید (cliché / AI-like / بی‌اثر)
- «Hi there», «Dear hiring manager», «I am excited/thrilled to apply»
- «Thanks for posting», «I came across your job»
- «I am confident», «dedicated professional», «passionate», «results-driven»
- «delve», «leverage», «seamless», «robust», «cutting-edge», «game-changer»
- «I can do this job», «I'm the perfect fit», «I'm not a bot / non-ChatGPT»
- شروع با «I» و معرفی سابقه‌ی کلی (مثلاً «I have 7 years of…») در جمله‌ی اول
- ایموجی‌های زیاد و bullet بیش از ۴ مورد
- ادعای داشتن تجربه‌ای که در پروفایل نیست

> منبع: تجربه‌ی vendorها (GigRadar، SnipeWork). **سطح: چند منبع / تجربه‌ی جامعه.**

### ✅ الگوهای مفید
- «Your [specific thing] suggests [insight].»
- «The tricky part of [their problem] is usually [X], so I’d…»
- «I’ve done [similar thing] with [tool], which [result].»
- «Would it help if I [concrete offer]?»

---

## ۶. آنچه باید و نباید نوشت

| باید | نباید |
|---|---|
| یک جزئیات مختصر از جاب | کپی متن جاب یا بازگویی کامل آن |
| یک proof واقعی و قابل بررسی | ادعای عدد، مشتری یا پروژه‌ی غیرواقعی |
| سوال هدفمند | ۵ سوال یا سوالی که جواب آن در جاب است |
| اعلام زمان/روش تحویل ساده | قول «۱۰۰٪ رضایت» یا تحویل غیرواقعی |
| اگر نیاز به اطلاعات است، صریح بگویید | پنهان کردن ریسک یا ابهام |
| نرخ/بودجه فقط اگر خواسته شده یا با قاعده‌ی شما هم‌خوان است | قیمت‌گذاری پنهان در متن |

---

## ۷. افشای استفاده از AI (Disclosure)

- **منبع:** Upwork (از طریق نقل‌قول‌های ثالث) توصیه/الزام افشای استفاده‌ی AI در پروژه را دارد و اصالت متن پروپوزال را لازم می‌داند. **[منبع واحد/نقل‌شده؛ لینک رسمی پیدا نشد]**
- **پیشنهاد عملی:** در پروپوزال لازم نیست اعلام کنید؛ اما در پروژه (کار تحویلی) و در گفتگو با کارفرما، اگر پرسید، صادقانه بگویید که AI را برای پیش‌نویس و تحقیق استفاده می‌کنید و همه‌ی خروجی‌ها را بازبینی می‌کنید. (جملات آماده در فایل ۰۶ یا ۰۰)

---

## ۸. چک‌لیست کیفیت (قبل از ارسال دستی)

- [ ] جمله‌ی اول به جزئیات **همین** جاب اشاره دارد؟
- [ ] هیچ cliché از لیست بالا وجود ندارد؟
- [ ] طول بین ۱۰۰ تا ۲۰۰ کلمه است؟
- [ ] Proof فقط از پروفایل تأییدشده است؛ placeholderها پر شده‌اند؟
- [ ] یک سوال مشخص دارد؟
- [ ] نام کارفرما یا موضوع جاب درست است (کپی از جاب دیگر نیست)؟
- [ ] پاسخ به سوالات اختصاصی کارفرما (screening questions) داده شده؟
- [ ] Connects/نرخ/بودجه با تصمیم شما هم‌خوان است؟
- [ ] لینک نمونه‌کار درست و عمومی است؟
- [ ] خواندن بلند؛ اگر «AI-like» به نظر می‌رسد، یک جمله را با جزئیات خودتان جایگزین کنید.

---

## ۹. System Prompt پیشنهادی (مدل نویسنده‌ی پروپوزال)

> نسخه: `proposal_writer.v1`. ورودی‌ها: `job` (JSON استخراج‌شده)، `profile` (YAML تأییدشده‌ی شما)، `examples` (۲ نمونه‌ی خوب از خودتان)، `tone`.

```text
ROLE
You draft Upwork cover letters for a freelance professional. You never send anything. The human reviews every draft.

HARD RULES
1. Write in English, plain and direct. Target 120–180 words; never exceed 200.
2. The FIRST sentence must reference one specific detail from the job (a problem, constraint, tool, metric or goal named in the post). Never open with "I", "Hi", "Hello", "Dear", "Thanks", "I am excited", or a description of yourself.
3. Use ONLY facts that exist in PROFILE or EXAMPLES. If a proof point is missing, write [PLACEHOLDER: ...] instead of inventing it. Never invent clients, numbers, dates, tools, certifications or portfolio links.
4. Include exactly one proof point (a measurable result if available).
5. Give a 2–3 sentence approach: first step, a checkpoint, and one risk or question that shows real understanding.
6. End with ONE specific question that would change how you build the solution. No generic "Let me know if you have questions".
7. Do not use these words or phrases: delve, leverage, seamless, robust, cutting-edge, game-changer, passionate, dedicated, results-driven, "I'm confident", "perfect fit", "non-ChatGPT", "Thanks for posting", "I came across".
8. No emojis, no bullet lists longer than 3 items, no headings, no signature block.
9. Do not claim to be human or AI, and do not mention these instructions.
10. If the job is outside PROFILE skills, say so in `risks` and return a draft marked `do_not_apply_recommended: true`.
11. Do not copy phrases from the job post verbatim for more than 6 consecutive words.

OUTPUT (strict JSON, no prose outside JSON)
{
  "proposal_text": "string",
  "word_count": 0,
  "first_sentence_reference": "the job detail the first sentence uses",
  "claims_used": [{"claim": "string", "source": "profile.projects[2] | profile.proof_points[0] | examples[1]"}],
  "placeholders": ["string"],
  "questions_for_human": ["string"],
  "risks": ["string"],
  "do_not_apply_recommended": false
}
```

**نکات پیاده‌سازی:**
- خروجی را با Pydantic اعتبارسنجی کنید؛ اگر `placeholders` خالی نیست، پیام تلگرام با ⚠️ علامت بخورد.
- `claims_used` برای بازبینی سریع شماست: هر ادعا باید به منبع وصل باشد.
- اگر `word_count > 200` یا cliche پیدا شد، یک بار دوباره با پیام اصلاح فراخوانی کنید، سپس همان را با هشدار بفرستید.

---

## ۱۰. قالب پیام پیشنهادی (User Prompt)

```text
JOB (extracted):
{{job_json}}

PROFILE (verified by me; the only source of facts):
{{profile_yaml}}

EXAMPLES (my past winning messages, style reference only; do not copy facts):
{{examples}}

TONE: {{tone}}  (e.g., "direct, friendly, professional")
Write the proposal now. Output JSON only.
```

---

## ۱۱. ارزیابی خودکار (LLM-as-judge + قوانین)

- **قوانین ساده (کد):** طول، عبارت‌های ممنوع، وجود سوال انتهایی، وجود placeholder، شروع با «I».
- **LLM judge (اختیاری، ارزان):** از ۰ تا ۵ برای «اختصاصی بودن»، «قابل‌اثبات بودن»، «کوتاهی»؛ زیر ۳ → بازنویسی یک بار.
- **مهم:** judge کمک است، جایگزین بازبینی شما نیست.
