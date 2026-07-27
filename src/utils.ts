import type { Message, Contact } from './types';
import { contacts, CURRENT_USER } from './data';

export const cn = (...classes: (string | false | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

export function getContact(id: string): Contact | undefined {
  if (id === 'me') return { id: 'me', name: CURRENT_USER.name, avatar: CURRENT_USER.avatar, about: CURRENT_USER.about, phone: CURRENT_USER.phone, isGroup: false, isOnline: true, hasStatus: false };
  return contacts.find((c) => c.id === id);
}

export function getGroupMember(chatId: string, memberId: string) {
  const chat = contacts.find((c) => c.id === chatId);
  if (!chat?.members) return undefined;
  return chat.members.find((m) => m.id === memberId);
}

export function getSenderName(msg: Message): string {
  if (msg.senderId === 'me') return CURRENT_USER.name;
  const c = getContact(msg.senderId);
  return c?.name ?? 'غير معروف';
}

export function getSenderColor(msg: Message, isGroup: boolean): string {
  if (!isGroup || msg.senderId === 'me') return '';
  const member = getGroupMember(msg.chatId, msg.senderId);
  return member?.color ?? '#06CF9C';
}

export function lastMessageOf(chatId: string, msgs: Message[]): Message | undefined {
  return [...msgs].filter((m) => m.chatId === chatId).sort((a, b) => b.timestamp - a.timestamp)[0];
}

export function messagesOf(chatId: string, msgs: Message[]): Message[] {
  return msgs.filter((m) => m.chatId === chatId).sort((a, b) => a.timestamp - b.timestamp);
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
