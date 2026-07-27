import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Message, Chat, Theme, Contact, PollOption } from './types';
import { initialMessages, initialChats, contacts as allContacts, CURRENT_USER } from './data';
import { uid, nowTime } from './utils';

interface AppState {
  authed: boolean;
  theme: Theme;
  chats: Chat[];
  contacts: Contact[];
  messages: Message[];
  activeChatId: string | null;
  searchQuery: string;
  networkOffline: boolean;
  login: () => void;
  logout: () => void;
  toggleTheme: () => void;
  setActiveChat: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  toggleNetwork: () => void;
  sendMessage: (chatId: string, text: string, replyToId?: string) => void;
  sendVoiceMessage: (chatId: string, duration: number, waveform: number[], replyToId?: string) => void;
  sendImageMessage: (chatId: string, url: string, caption?: string, replyToId?: string) => void;
  sendPoll: (chatId: string, question: string, options: string[]) => void;
  votePoll: (messageId: string, optionId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  setVoiceSpeed: (messageId: string, speed: 1 | 1.5 | 2) => void;
  markChatRead: (chatId: string) => void;
  deleteMessage: (messageId: string) => void;
  togglePin: (chatId: string) => void;
  toggleMute: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
}

const Ctx = createContext<AppState | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => load('zizo_authed', false));
  const [theme, setTheme] = useState<Theme>(() => load<Theme>('zizo_theme', 'dark'));
  const [chats, setChats] = useState<Chat[]>(() => load('zizo_chats', initialChats));
  const [contacts] = useState<Contact[]>(allContacts);
  const [messages, setMessages] = useState<Message[]>(() => load('zizo_messages', initialMessages));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [networkOffline, setNetworkOffline] = useState(false);

  useEffect(() => { localStorage.setItem('zizo_authed', JSON.stringify(authed)); }, [authed]);
  useEffect(() => { localStorage.setItem('zizo_theme', JSON.stringify(theme)); }, [theme]);
  useEffect(() => { localStorage.setItem('zizo_chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { localStorage.setItem('zizo_messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo<AppState>(() => ({
    authed,
    theme,
    chats,
    contacts,
    messages,
    activeChatId,
    searchQuery,
    networkOffline,
    login: () => setAuthed(true),
    logout: () => { setAuthed(false); setActiveChatId(null); },
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    setActiveChat: (id) => {
      setActiveChatId(id);
      if (id) {
        setChats((cs) => cs.map((c) => c.id === id ? { ...c, unreadCount: 0 } : c));
      }
    },
    setSearchQuery,
    toggleNetwork: () => setNetworkOffline((n) => !n),
    sendMessage: (chatId, text, replyToId) => {
      const m: Message = { id: uid(), chatId, senderId: 'me', type: 'text', text, time: nowTime(), timestamp: Date.now(), status: 'sent', reactions: [], replyToId };
      setMessages((ms) => [...ms, m]);
      simulateDelivery(m.id, chatId, setMessages);
    },
    sendVoiceMessage: (chatId, duration, waveform, replyToId) => {
      const m: Message = { id: uid(), chatId, senderId: 'me', type: 'voice', time: nowTime(), timestamp: Date.now(), status: 'sent', reactions: [], replyToId, voice: { duration, waveform, speed: 1 } };
      setMessages((ms) => [...ms, m]);
      simulateDelivery(m.id, chatId, setMessages);
    },
    sendImageMessage: (chatId, url, caption, replyToId) => {
      const m: Message = { id: uid(), chatId, senderId: 'me', type: 'image', time: nowTime(), timestamp: Date.now(), status: 'sent', reactions: [], replyToId, image: { url, caption } };
      setMessages((ms) => [...ms, m]);
      simulateDelivery(m.id, chatId, setMessages);
    },
    sendPoll: (chatId, question, options) => {
      const opts: PollOption[] = options.map((t) => ({ id: uid(), text: t, votes: [] }));
      const m: Message = { id: uid(), chatId, senderId: 'me', type: 'poll', time: nowTime(), timestamp: Date.now(), status: 'read', reactions: [], poll: { question, options: opts } };
      setMessages((ms) => [...ms, m]);
    },
    votePoll: (messageId, optionId) => {
      setMessages((ms) => ms.map((m) => {
        if (m.id !== messageId || !m.poll) return m;
        const options = m.poll.options.map((o: PollOption) => {
          if (o.id === optionId) {
            const has = o.votes.includes('me');
            return { ...o, votes: has ? o.votes.filter((v) => v !== 'me') : [...o.votes, 'me'] };
          }
          return { ...o, votes: o.votes.filter((v) => v !== 'me') };
        });
        return { ...m, poll: { ...m.poll, options } };
      }));
    },
    toggleReaction: (messageId, emoji) => {
      setMessages((ms) => ms.map((m) => {
        if (m.id !== messageId) return m;
        const has = m.reactions.find((r) => r.by === 'me');
        if (has && has.emoji === emoji) {
          return { ...m, reactions: m.reactions.filter((r) => r.by !== 'me') };
        }
        return { ...m, reactions: [...m.reactions.filter((r) => r.by !== 'me'), { emoji, by: 'me' }] };
      }));
    },
    setVoiceSpeed: (messageId, speed) => {
      setMessages((ms) => ms.map((m) => m.id === messageId && m.voice ? { ...m, voice: { ...m.voice, speed } } : m));
    },
    markChatRead: (chatId) => {
      setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    },
    deleteMessage: (messageId) => {
      setMessages((ms) => ms.filter((m) => m.id !== messageId));
    },
    togglePin: (chatId) => setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, pinned: !c.pinned } : c)),
    toggleMute: (chatId) => setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, muted: !c.muted } : c)),
    archiveChat: (chatId) => setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, archived: !c.archived } : c)),
  }), [authed, theme, chats, contacts, messages, activeChatId, searchQuery, networkOffline]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function simulateDelivery(messageId: string, chatId: string, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) {
  setTimeout(() => {
    setMessages((ms) => ms.map((m) => m.id === messageId ? { ...m, status: 'delivered' as const } : m));
  }, 800);
  setTimeout(() => {
    setMessages((ms) => ms.map((m) => m.id === messageId ? { ...m, status: 'read' as const } : m));
  }, 2000);
  setTimeout(() => {
    setMessages((ms) => {
      const chat = allContacts.find((c) => c.id === chatId);
      if (!chat || chat.isGroup) return ms;
      const replies = ['تمام 👍', 'شكراً لك', 'وصلتني رسالتك', 'أوكي، فهمت', 'حسناً، سأرد عليك قريباً'];
      const reply: Message = {
        id: uid(), chatId, senderId: chatId, type: 'text',
        text: replies[Math.floor(Math.random() * replies.length)],
        time: nowTime(), timestamp: Date.now(), status: 'read', reactions: [],
      };
      return [...ms, reply];
    });
  }, 3500);
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { CURRENT_USER };
