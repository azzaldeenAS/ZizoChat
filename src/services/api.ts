const BASE = '/api';

function getToken() {
  return localStorage.getItem('zizo_token') ?? '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  // Auth
  googleLogin: (credential: string) =>
    request<{ token: string; user: ApiUser }>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),

  signup: (data: any) =>
    request<{ success: boolean; message: string }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  signupVerify: (data: any) =>
    request<{ token: string; user: ApiUser }>('/auth/signup-verify', { method: 'POST', body: JSON.stringify(data) }),

  signin: (data: any) =>
    request<{ token: string; user: ApiUser }>('/auth/signin', { method: 'POST', body: JSON.stringify(data) }),

  forgotPassword: (data: any) =>
    request<{ success: boolean; message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),

  forgotPasswordVerify: (data: any) =>
    request<{ success: boolean; message: string }>('/auth/forgot-password-verify', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getMe: () => request<ApiUser>('/users/me'),
  updateMe: (data: Partial<ApiUser>) =>
    request<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  searchUsers: (q: string) => request<ApiUser[]>(`/users/search?q=${encodeURIComponent(q)}`),

  // Chats
  getChats: () => request<ApiChat[]>('/chats'),
  startDirectChat: (targetUserId: string) =>
    request<ApiChat>('/chats/direct', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  createGroup: (name: string, memberIds: string[]) =>
    request<ApiChat>('/chats/group', { method: 'POST', body: JSON.stringify({ name, memberIds }) }),
  togglePin: (chatId: string) => request<{ pinned: boolean }>(`/chats/${chatId}/pin`, { method: 'PATCH' }),
  toggleMute: (chatId: string) => request<{ muted: boolean }>(`/chats/${chatId}/mute`, { method: 'PATCH' }),
  toggleArchive: (chatId: string) => request<{ archived: boolean }>(`/chats/${chatId}/archive`, { method: 'PATCH' }),

  // Messages
  getMessages: (chatId: string, before?: string) =>
    request<ApiMessage[]>(`/messages/${chatId}${before ? `?before=${before}` : ''}`),
};

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  about: string;
  phone: string;
  isOnline?: boolean;
}

export interface ApiChatMember {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
  about?: string;
  phone?: string;
  isAdmin: boolean;
}

export interface ApiChat {
  id: string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  members: ApiChatMember[];
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  lastMessage?: {
    id: string; type: string; text?: string;
    senderId: string; timestamp: string; status: string;
  } | null;
}

export interface ApiMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: string;
  text?: string;
  replyToId?: string;
  voice?: { duration: number; waveform: number[]; speed: number };
  image?: { url: string; caption?: string };
  poll?: { question: string; options: { id: string; text: string; votes: string[] }[] };
  reactions: { emoji: string; by: string }[];
  status: string;
  timestamp: string;
  time: string;
}
