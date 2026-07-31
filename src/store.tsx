import {
  createContext, useContext, useEffect, useRef, useState,
  useCallback, useMemo, type ReactNode,
} from 'react';
import type { Message, Chat, Theme, Contact, IncomingCallInfo, IncomingGroupCallInfo } from './types';
import { api, type ApiUser, type ApiChat, type ApiMessage } from './services/api';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import {
  uid, updateContactsCache, setCurrentUserCache,
  MEMBER_COLORS, hashStr, getCurrentUserId,
} from './utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function convertApiMessage(m: ApiMessage): Message {
  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    senderName: m.senderName,
    senderAvatar: m.senderAvatar,
    type: m.type as Message['type'],
    text: m.text,
    time: m.time,
    timestamp: new Date(m.timestamp).getTime(),
    status: m.status as Message['status'],
    reactions: m.reactions,
    replyToId: m.replyToId,
    voice: m.voice
      ? {
          duration: m.voice.duration,
          waveform: m.voice.waveform,
          speed: (m.voice.speed ?? 1) as 1 | 1.5 | 2,
          url: m.voice.url ?? '',
        }
      : undefined,
    image: m.image,
    poll: m.poll,
  };
}

function buildContactFromChat(chat: ApiChat, myId: string): Contact | null {
  if (chat.isGroup) {
    return {
      id: chat.id,
      name: chat.name || 'مجموعة',
      avatar: chat.avatar || `https://i.pravatar.cc/200?u=group-${chat.id}`,
      about: `مجموعة - ${chat.members.length} أعضاء`,
      phone: '',
      isGroup: true,
      isOnline: false,
      hasStatus: false,
      members: chat.members.map(m => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        isAdmin: m.isAdmin,
        color: MEMBER_COLORS[hashStr(m.id) % MEMBER_COLORS.length],
      })),
    };
  }
  const other = chat.members.find(m => m.id !== myId);
  if (!other) return null;
  return {
    id: other.id,
    name: other.name,
    avatar: other.avatar || `https://i.pravatar.cc/200?u=${other.id}`,
    about: other.about || '',
    phone: other.phone || '',
    isGroup: false,
    isOnline: other.isOnline,
    hasStatus: false,
    lastSeen: other.lastSeen
      ? new Date(other.lastSeen).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
      : '',
  };
}

function buildChatFromApi(ac: ApiChat, myId: string): Chat {
  const contactId = ac.isGroup
    ? ac.id
    : (ac.members.find(m => m.id !== myId)?.id ?? ac.id);
  return {
    id: ac.id,
    contactId,
    pinned: ac.pinned,
    muted: ac.muted,
    archived: ac.archived,
    unreadCount: 0,
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface AppState {
  authed: boolean;
  theme: Theme;
  chats: Chat[];
  contacts: Contact[];
  messages: Message[];
  activeChatId: string | null;
  searchQuery: string;
  networkOffline: boolean;
  currentUser: ApiUser | null;
  typingUsers: Record<string, string[]>;
  incomingCall: IncomingCallInfo | null;
  incomingGroupCall: IncomingGroupCallInfo | null;
  // Auth
  loginWithToken: (token: string, user: ApiUser) => Promise<void>;
  logout: () => void;
  // UI
  toggleTheme: () => void;
  setActiveChat: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  toggleNetwork: () => void;
  // Messaging
  sendMessage: (chatId: string, text: string, replyToId?: string) => void;
  sendVoiceMessage: (chatId: string, duration: number, waveform: number[], url: string, replyToId?: string) => void;
  sendImageMessage: (chatId: string, url: string, caption?: string, replyToId?: string) => void;
  sendPoll: (chatId: string, question: string, options: string[]) => void;
  votePoll: (messageId: string, optionId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  setVoiceSpeed: (messageId: string, speed: 1 | 1.5 | 2) => void;
  markChatRead: (chatId: string) => void;
  deleteMessage: (messageId: string) => void;
  // Chat actions
  togglePin: (chatId: string) => void;
  toggleMute: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  startDirectChat: (targetUserId: string) => Promise<string>;
  // Calls
  dismissIncomingCall: () => void;
  dismissIncomingGroupCall: () => void;
  // Groups & Public Rooms
  createGroup: (name: string, memberIds: string[]) => Promise<string>;
  joinPublicRoom: (roomId: string) => Promise<string>;
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
  const [authed, setAuthed] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => load<Theme>('zizo_theme', 'dark'));
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [networkOffline, setNetworkOffline] = useState(false);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [incomingGroupCall, setIncomingGroupCall] = useState<IncomingGroupCallInfo | null>(null);

  const loadedChatIds = useRef<Set<string>>(new Set());
  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  useEffect(() => {
    localStorage.setItem('zizo_theme', JSON.stringify(theme));
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // ─── Init: restore session from localStorage ─────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('zizo_token');
    const storedUser = localStorage.getItem('zizo_user');
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as ApiUser;
        loginWithToken(token, user).catch(() => {
          localStorage.removeItem('zizo_token');
          localStorage.removeItem('zizo_user');
        });
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────
  const loginWithToken = useCallback(async (token: string, user: ApiUser) => {
    localStorage.setItem('zizo_token', token);
    localStorage.setItem('zizo_user', JSON.stringify(user));

    setCurrentUser(user);
    setCurrentUserCache({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      about: user.about,
      phone: user.phone,
      isGroup: false,
      isOnline: true,
      hasStatus: false,
    });

    // Fetch chats and all users
    try {
      const [apiChats, apiUsers] = await Promise.all([
        api.getChats(),
        api.getUsers().catch(() => [] as ApiUser[]),
      ]);
      const newContacts: Contact[] = [];
      const newChats: Chat[] = [];

      // All users become potential contacts
      for (const u of apiUsers) {
        newContacts.push({
          id: u.id,
          name: u.name,
          avatar: u.avatar || `https://i.pravatar.cc/200?u=${u.id}`,
          about: u.about || '',
          phone: u.phone || '',
          isGroup: false,
          isOnline: !!u.isOnline,
          hasStatus: false,
        });
      }

      for (const ac of apiChats) {
        if (ac.isGroup) {
          const contact = buildContactFromChat(ac, user.id);
          if (contact) newContacts.push(contact);
        } else {
          const other = ac.members.find(m => m.id !== user.id);
          if (other) {
            const existing = newContacts.find(c => c.id === other.id);
            if (!existing) {
              const contact = buildContactFromChat(ac, user.id);
              if (contact) newContacts.push(contact);
            }
          }
        }
        newChats.push(buildChatFromApi(ac, user.id));
      }

      updateContactsCache(newContacts);
      setContacts(newContacts);
      setChats(newChats);
    } catch (err) {
      console.warn('Failed to load chats/users:', err);
    }

    setAuthed(true);
  }, []);

  // ─── Socket connection & event listeners ─────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    const token = localStorage.getItem('zizo_token');
    if (!token) return;

    const socket = connectSocket(token);

    // New message
    socket.on('message:new', (msg: ApiMessage) => {
      const converted = convertApiMessage(msg);
      setMessages(ms => ms.some(m => m.id === msg.id) ? ms : [...ms, converted]);
      setChats(cs => cs.map(c =>
        c.id === msg.chatId && activeChatIdRef.current !== msg.chatId
          ? { ...c, unreadCount: c.unreadCount + 1 }
          : c
      ));
    });

    // Message status update
    socket.on('message:status', ({ messageId, status }: { messageId: string; status: string }) => {
      setMessages(ms => ms.map(m =>
        m.id === messageId ? { ...m, status: status as Message['status'] } : m
      ));
    });

    // Reaction / edit
    socket.on('message:updated', ({ messageId, reactions }: { messageId: string; reactions: Message['reactions'] }) => {
      setMessages(ms => ms.map(m => m.id === messageId ? { ...m, reactions } : m));
    });

    // Deletion
    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages(ms => ms.filter(m => m.id !== messageId));
    });

    // Poll vote update
    socket.on('poll:updated', ({ messageId, options }: { messageId: string; options: NonNullable<Message['poll']>['options'] }) => {
      setMessages(ms => ms.map(m =>
        m.id === messageId && m.poll ? { ...m, poll: { ...m.poll, options } } : m
      ));
    });

    // Typing
    socket.on('typing:update', ({ chatId, userId, isTyping }: { chatId: string; userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => ({
        ...prev,
        [chatId]: isTyping
          ? [...(prev[chatId] ?? []).filter(id => id !== userId), userId]
          : (prev[chatId] ?? []).filter(id => id !== userId),
      }));
    });

    // Presence
    socket.on('user:status', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setContacts(cs => cs.map(c => c.id === userId ? { ...c, isOnline } : c));
    });

    // Incoming 1-to-1 call
    socket.on('call:incoming', (info: IncomingCallInfo) => {
      setIncomingCall(info);
    });

    // Incoming group call
    socket.on('group-call:incoming', (info: IncomingGroupCallInfo) => {
      setIncomingGroupCall(info);
    });

    return () => {
      disconnectSocket();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem('zizo_token');
    localStorage.removeItem('zizo_user');
    setAuthed(false);
    setCurrentUser(null);
    setChats([]);
    setContacts([]);
    setMessages([]);
    setActiveChatId(null);
    loadedChatIds.current.clear();
  }, []);

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  // ─── Set active chat (fetch messages on demand) ──────────────────────────
  const setActiveChat = useCallback(async (id: string | null) => {
    setActiveChatId(id);
    if (!id) return;
    setChats(cs => cs.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    if (loadedChatIds.current.has(id)) return;
    loadedChatIds.current.add(id);
    try {
      const msgs = await api.getMessages(id);
      const converted = msgs.map(convertApiMessage);
      setMessages(ms => {
        const existing = new Set(ms.map(m => m.id));
        return [...ms, ...converted.filter(m => !existing.has(m.id))];
      });
    } catch (err) {
      console.warn('Failed to load messages for chat', id, err);
    }
  }, []);

  function emit(event: string, data: object) {
    getSocket()?.emit(event, data);
  }

  // ─── Messaging ────────────────────────────────────────────────────────────
  const sendMessage = useCallback((chatId: string, text: string, replyToId?: string) => {
    emit('message:send', { chatId, type: 'text', text, replyToId });
  }, []);

  const sendVoiceMessage = useCallback((
    chatId: string,
    duration: number,
    waveform: number[],
    url: string,
    replyToId?: string
  ) => {
    emit('message:send', {
      chatId,
      type: 'voice',
      voice: { duration, waveform, url, speed: 1 },
      replyToId,
    });
  }, []);

  const sendImageMessage = useCallback((chatId: string, url: string, caption?: string, replyToId?: string) => {
    emit('message:send', { chatId, type: 'image', image: { url, caption }, replyToId });
  }, []);

  const sendPoll = useCallback((chatId: string, question: string, options: string[]) => {
    const pollOptions = options.map((text, i) => ({ id: uid() + i, text, votes: [] }));
    emit('message:send', { chatId, type: 'poll', poll: { question, options: pollOptions } });
  }, []);

  const votePoll = useCallback((messageId: string, optionId: string) => {
    emit('poll:vote', { messageId, optionId });
  }, []);

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    emit('message:reaction', { messageId, emoji });
  }, []);

  const setVoiceSpeed = useCallback((messageId: string, speed: 1 | 1.5 | 2) => {
    setMessages(ms => ms.map(m =>
      m.id === messageId && m.voice ? { ...m, voice: { ...m.voice, speed } } : m
    ));
  }, []);

  const markChatRead = useCallback((chatId: string) => {
    setChats(cs => cs.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    emit('message:delete', { messageId });
  }, []);

  // ─── Chat metadata ────────────────────────────────────────────────────────
  const togglePin = useCallback((chatId: string) => {
    api.togglePin(chatId).then(({ pinned }) => {
      setChats(cs => cs.map(c => c.id === chatId ? { ...c, pinned } : c));
    }).catch(console.warn);
  }, []);

  const toggleMute = useCallback((chatId: string) => {
    api.toggleMute(chatId).then(({ muted }) => {
      setChats(cs => cs.map(c => c.id === chatId ? { ...c, muted } : c));
    }).catch(console.warn);
  }, []);

  const archiveChat = useCallback((chatId: string) => {
    api.toggleArchive(chatId).then(({ archived }) => {
      setChats(cs => cs.map(c => c.id === chatId ? { ...c, archived } : c));
    }).catch(console.warn);
  }, []);

  // ─── Start a new direct chat ──────────────────────────────────────────────
  const startDirectChat = useCallback(async (targetUserId: string): Promise<string> => {
    const existing = chats.find(c =>
      !contacts.find(ct => ct.id === c.contactId)?.isGroup && c.contactId === targetUserId
    );
    if (existing) return existing.id;

    const ac = await api.startDirectChat(targetUserId);
    const contact = buildContactFromChat(ac, currentUser!.id);
    const chat = buildChatFromApi(ac, currentUser!.id);

    if (contact) {
      setContacts(cs => cs.some(c => c.id === contact.id) ? cs : [...cs, contact]);
      updateContactsCache([contact]);
    }
    setChats(cs => cs.some(c => c.id === chat.id) ? cs : [...cs, chat]);
    getSocket()?.emit('chat:join', { chatId: ac.id });
    return ac.id;
  }, [chats, contacts, currentUser]);

  // ─── Create Group ────────────────────────────────────────────────────────
  const createGroup = useCallback(async (name: string, memberIds: string[]): Promise<string> => {
    const ac = await api.createGroup(name, memberIds);
    const contact = buildContactFromChat(ac, currentUser!.id);
    const chat = buildChatFromApi(ac, currentUser!.id);
    if (contact) {
      setContacts(cs => cs.some(c => c.id === contact.id) ? cs : [...cs, contact]);
      updateContactsCache([contact]);
    }
    setChats(cs => cs.some(c => c.id === chat.id) ? cs : [...cs, chat]);
    getSocket()?.emit('chat:join', { chatId: ac.id });
    return ac.id;
  }, [currentUser]);

  // ─── Join Public Room ─────────────────────────────────────────────────────
  const joinPublicRoom = useCallback(async (roomId: string): Promise<string> => {
    const ac = await api.joinPublicRoom(roomId);
    const contact: Contact = {
      id: ac.id,
      name: ac.name || 'غرفة عامة',
      avatar: ac.avatar || `https://i.pravatar.cc/200?u=room-${ac.id}`,
      about: ac.description || `غرفة عامة - ${ac.memberCount} عضو`,
      phone: '',
      isGroup: true,
      isOnline: false,
      hasStatus: false,
      members: ac.members.map(m => ({
        id: m.id, name: m.name, avatar: m.avatar, isAdmin: m.isAdmin,
        color: MEMBER_COLORS[hashStr(m.id) % MEMBER_COLORS.length],
      })),
    };
    const chat: Chat = { id: ac.id, contactId: ac.id, pinned: false, muted: false, archived: false, unreadCount: 0 };
    setContacts(cs => cs.some(c => c.id === contact.id) ? cs.map(c => c.id === contact.id ? contact : c) : [...cs, contact]);
    updateContactsCache([contact]);
    setChats(cs => cs.some(c => c.id === chat.id) ? cs : [...cs, chat]);
    getSocket()?.emit('chat:join', { chatId: ac.id });
    return ac.id;
  }, []);

  // ─── Calls ────────────────────────────────────────────────────────────────
  const dismissIncomingCall = useCallback(() => setIncomingCall(null), []);
  const dismissIncomingGroupCall = useCallback(() => setIncomingGroupCall(null), []);

  // ─── Memoized value ───────────────────────────────────────────────────────
  const value = useMemo<AppState>(() => ({
    authed, theme, chats, contacts, messages, activeChatId,
    searchQuery, networkOffline, currentUser, typingUsers,
    incomingCall, incomingGroupCall,
    loginWithToken, logout, toggleTheme,
    setActiveChat, setSearchQuery,
    toggleNetwork: () => setNetworkOffline(v => !v),
    sendMessage, sendVoiceMessage, sendImageMessage, sendPoll,
    votePoll, toggleReaction, setVoiceSpeed,
    markChatRead, deleteMessage,
    togglePin, toggleMute, archiveChat,
    startDirectChat, createGroup, joinPublicRoom,
    dismissIncomingCall, dismissIncomingGroupCall,
  }), [
    authed, theme, chats, contacts, messages, activeChatId,
    searchQuery, networkOffline, currentUser, typingUsers,
    incomingCall, incomingGroupCall,
    loginWithToken, logout, toggleTheme, setActiveChat,
    sendMessage, sendVoiceMessage, sendImageMessage, sendPoll,
    votePoll, toggleReaction, setVoiceSpeed,
    markChatRead, deleteMessage,
    togglePin, toggleMute, archiveChat,
    startDirectChat, createGroup, joinPublicRoom,
    dismissIncomingCall, dismissIncomingGroupCall,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function CURRENT_USER() {
  const { currentUser } = useContext(Ctx)!;
  return currentUser ?? { id: 'me', name: 'أنا', avatar: '', about: '', phone: '', email: '' };
}

export { getCurrentUserId };
