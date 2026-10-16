import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { secrets } from '../schema.js';
import { SETTABLE_SECRETS } from '../lib/config.js';

// تنظیم یک‌باره‌ی کلیدها. فقط مالک (OWNER_TG_ID) می‌تواند مقدار بدهد.
// اجرا از ترمینال شما (نه از تلگرام):
//   npx tgcloud run endpoints/setSecret '{"name":"GEMINI_API_KEY","value":"..."}' --ctx '{"initData":{"user":{"id":123}}}'
// نام‌ها و مقادیر در پیام‌های تلگرام قرار نمی‌گیرند.

async function read(name) {
  const row = await db.select().from(secrets).where(eq(secrets.name, name)).get();
  return row ? row.value : null;
}

export default async function (input, ctx) {
  const userId = String(ctx?.initData?.user?.id ?? '');
  if (!userId) {
    throw new EndpointError('کاربر مشخص نیست', { code: 'NO_USER' });
  }
  const action = input?.action;

  const owner = await read('OWNER_TG_ID');

  if (action === 'status') {
    if (owner && owner !== userId) throw new EndpointError('دسترسی ندارید', { code: 'FORBIDDEN' });
    const rows = await db.select().from(secrets).all();
    return { owner_set: Boolean(owner), names_set: rows.map((r) => r.name) };
  }

  if (action !== 'set') {
    throw new EndpointError('action باید status یا set باشد', { code: 'BAD_ACTION' });
  }

  const name = input?.name;
  const value = input?.value;
  if (typeof name !== 'string' || typeof value !== 'string' || !value.trim()) {
    throw new EndpointError('name و value لازم است', { code: 'BAD_INPUT' });
  }
  if (value.length > 500) {
    throw new EndpointError('مقدار خیلی طولانی است', { code: 'TOO_LONG' });
  }

  // راه‌اندازی اولیه: اولین بار فقط OWNER_TG_ID قابل تنظیم است و صاحب، کاربر فعلی می‌شود
  if (!owner) {
    if (name !== 'OWNER_TG_ID') {
      throw new EndpointError('ابتدا OWNER_TG_ID را تنظیم کنید', { code: 'BOOTSTRAP' });
    }
    await db.insert(secrets).values({ name, value: userId }).onConflictDoUpdate({
      target: secrets.name,
      set: { value: userId },
    }).run();
    return { ok: true, name, owner: 'set' };
  }

  if (owner !== userId) {
    throw new EndpointError('دسترسی ندارید', { code: 'FORBIDDEN' });
  }
  if (!SETTABLE_SECRETS.includes(name)) {
    throw new EndpointError('نام تنظیم مجاز نیست', { code: 'UNKNOWN_NAME' });
  }

  await db.insert(secrets).values({ name, value: value.trim() }).onConflictDoUpdate({
    target: secrets.name,
    set: { value: value.trim() },
  }).run();
  return { ok: true, name };
}
