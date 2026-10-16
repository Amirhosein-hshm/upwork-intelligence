// پروفایل شما: تنها منبع حقایق برای امتیازدهی و پروپوزال.
// ⚠️ همه‌ی [TODO] را با اطلاعات واقعی خودتان پر کنید؛ تا زمانی که [TODO] باقی است، /check اجرا نمی‌شود.
// فقط چیزی را بنویسید که واقعاً درست است؛ ایجنت ادعای جدید اختراع نمی‌کند.

export const PROFILE = {
  identity: {
    headline: '[TODO: مثلاً Frontend Engineer — React / Next.js]',
    years_experience: '[TODO: عدد]',
    english_level: '[TODO: مثلاً C1]',
  },
  core_skills: ['[TODO: مهارت اصلی ۱]', '[TODO: مهارت اصلی ۲]'],
  secondary_skills: [],
  // حداقل نرخ شما (USD). در Hard gate G1 استفاده می‌شود.
  rates: {
    hourly_min_usd: 30,
    fixed_min_usd: 300,
  },
  preferences: {
    blocked_client_countries: [],        // مثلاً ['Country X']
    excluded_keywords: ['data entry'],   // اگر در عنوان/خلاصه‌ی جاب بود، رد می‌شود (G3)
  },
  // فقط نتایج قابل اثبات که خودتان تأیید کرده‌اید
  proof_points: [
    { id: 'pp1', text: '[TODO: نتیجه‌ی عددی یا توصیف واقعی]', evidence_url: '[TODO: لینک عمومی یا خالی]' },
  ],
  portfolio: [],
  tone: 'direct, friendly, professional',
  // ۲ پروپوزال موفق خودتان (فقط سبک را الگو می‌گیرد؛ فکت‌ها کپی نمی‌شوند)
  examples: [],
};

export function assertProfileReady(profile = PROFILE) {
  if (JSON.stringify(profile).includes('[TODO')) {
    throw new Error('فایل lib/profile.js هنوز کامل نشده است؛ همه‌ی [TODO] را پر کنید');
  }
}
