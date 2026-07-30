export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'voice' | 'image' | 'poll' | 'system';

export interface Reaction {
  emoji: string;
  by: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  type: MessageType;
  text?: string;
  time: string;
  timestamp: number;
  status: MessageStatus;
  reactions: Reaction[];
  replyToId?: string;
  voice?: {
    duration: number;
    waveform: number[];
    speed: 1 | 1.5 | 2;
    url?: string;
  };
  image?: { url: string; caption?: string };
  poll?: { question: string; options: PollOption[] };
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  about: string;
  phone: string;
  isGroup: boolean;
  isOnline: boolean;
  hasStatus: boolean;
  isAdmin?: boolean;
  members?: {
    id: string;
    name: string;
    avatar: string;
    isAdmin: boolean;
    color: string;
  }[];
  lastSeen?: string;
}

export interface Chat {
  id: string;
  contactId: string;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  unreadCount: number;
  draft?: string;
}

export type Theme = 'light' | 'dark';

export interface IncomingCallInfo {
  callerId: string;
  callerSocketId: string;
  callerName: string;
  callerAvatar: string;
  callType: 'voice' | 'video';
  offer: RTCSessionDescriptionInit;
}

export interface GroupCallPeer {
  peerId: string;
  socketId: string;
  name: string;
  avatar: string;
  stream: MediaStream | null;
  pc: RTCPeerConnection | null;
}

export interface IncomingGroupCallInfo {
  chatId: string;
  callType: 'voice' | 'video';
  callerId: string;
  callerSocketId: string;
  callerName: string;
  callerAvatar: string;
}
