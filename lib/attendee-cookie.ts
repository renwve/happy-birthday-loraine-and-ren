import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { ATTENDEES, type AttendeeName } from './attendees';

const COOKIE = 'birthday_attendee';

function secret() {
  const value = process.env.ATTENDEE_COOKIE_SECRET;
  if (!value) throw new Error('ATTENDEE_COOKIE_SECRET is missing.');
  return value;
}
function sign(name: string) {
  return crypto.createHmac('sha256', secret()).update(name).digest('hex');
}
export function makeAttendeeToken(name: AttendeeName) { return `${name}.${sign(name)}`; }
export function verifyAttendeeToken(token?: string | null): AttendeeName | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const name = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!ATTENDEES.includes(name as AttendeeName)) return null;
  const expected = sign(name);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return name as AttendeeName;
}
export async function currentAttendee() {
  const store = await cookies();
  return verifyAttendeeToken(store.get(COOKIE)?.value);
}
export const attendeeCookieName = COOKIE;