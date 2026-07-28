import type { Message, Contact } from './types';

export const cn = (...classes: (string | false | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// ─── Dynamic contacts cache (populated by the store after login) ─────────────
export const contactsCache = new Map<string, Contact>();
let _currentUserId = 'me';
let _currentUser: Contact = {
  id: 'me', name: 'أنا', avatar: '', about: '', phone: '',
  isGroup: false, isOnline: true, hasStatus: false,
};

export function setCurrentUserCache(user: Contact) {
  _currentUser = user;
  _currentUserId = user.id;
  contactsCache.set(user.id, user);
  contactsCache.set('me', user);
}

export function updateContactsCache(contacts: Contact[]) {
  contacts.forEach(c => contactsCache.set(c.id, c));
}

export function getCurrentUserId() { return _currentUserId; }
export function getCurrentUserContact() { return _currentUser; }

export function getContact(id: string): Contact | undefined {
  if (id === 'me' || id === _currentUserId) return _currentUser;
  return contactsCache.get(id);
}

export function getGroupMember(chatId: string, memberId: string) {
  const chat = contactsCache.get(chatId);
  if (!chat?.members) return undefined;
  return chat.members.find(m => m.id === memberId);
}

export function getSenderName(msg: Message): string {
  if (msg.senderId === 'me' || msg.senderId === _currentUserId) return _currentUser.name;
  const c = getContact(msg.senderId);
  return c?.name ?? (msg as any).senderName ?? 'غير معروف';
}

export function getSenderColor(msg: Message, isGroup: boolean): string {
  if (!isGroup || (msg.senderId === 'me' || msg.senderId === _currentUserId)) return '';
  const member = getGroupMember(msg.chatId, msg.senderId);
  return member?.color ?? '#06CF9C';
}

export function lastMessageOf(chatId: string, msgs: Message[]): Message | undefined {
  return [...msgs].filter(m => m.chatId === chatId).sort((a, b) => b.timestamp - a.timestamp)[0];
}

export function messagesOf(chatId: string, msgs: Message[]): Message[] {
  return msgs.filter(m => m.chatId === chatId).sort((a, b) => a.timestamp - b.timestamp);
}

export function formatLastPreview(msg: Message | undefined): string {
  if (!msg) return '';
  if (msg.type === 'voice') return '🎤 رسالة صوتية';
  if (msg.type === 'image') return '📷 صورة';
  if (msg.type === 'poll') return '📊 استطلاع رأي';
  if (msg.type === 'system') return msg.text ?? '';
  return msg.text ?? '';
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function nowTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ─── Color palette for group member names ────────────────────────────────────
export const MEMBER_COLORS = [
  '#06CF9C','#E542A3','#F9B342','#FF7547','#53BDEB','#7BC67E','#D69CF0','#E9747C',
];

export function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
