import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/store';
import { cn, getContact, messagesOf } from '@/utils';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { CallModal } from './CallModal';
import { ContactInfoDrawer } from './ContactInfoDrawer';
import {
  Phone, Video, Search, MoreVertical, Lock, ArrowRight, Users,
} from 'lucide-react';
import type { Message } from '@/types';

export function ChatArea() {
  const { activeChatId, messages, contacts, setActiveChat, theme } = useApp();
  const [replyTo, setReplyTo] = useState<Message | undefined>(undefined);
  const [callType, setCallType] = useState<null | 'voice' | 'video'>(null);
  const [showInfo, setShowInfo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const contact = contacts.find((c) => c.id === activeChatId);
  const msgs = activeChatId ? messagesOf(activeChatId, messages) : [];

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const m = messages.find((mm) => mm.id === id);
      if (m) setReplyTo(m);
    };
    window.addEventListener('zizo-reply', handler);
    return () => window.removeEventListener('zizo-reply', handler);
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs.length, activeChatId]);

  useEffect(() => {
    setReplyTo(undefined);
  }, [activeChatId]);

  if (!contact || !activeChatId) {
    return <EmptyState />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 h-16 bg-wa-header dark:bg-wa-headerDark shrink-0">
        <button onClick={() => setActiveChat(null)} className="md:hidden text-white">
          <ArrowRight className="w-5 h-5" />
        </button>
        <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 flex-1 min-w-0 text-right">
          <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
          <div className="min-w-0">
            <div className="text-white font-medium text-sm truncate flex items-center gap-1">
              {contact.name}
              {contact.isGroup && <Users className="w-3.5 h-3.5 opacity-70" />}
            </div>
            <div className="text-white/70 text-xs truncate">
              {contact.isGroup
                ? `${contact.members?.length ?? 0} أعضاء`
                : contact.isOnline ? 'متصل الآن' : contact.lastSeen ?? ''}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 text-white">
          <button onClick={() => setCallType('video')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button onClick={() => setCallType('voice')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className={cn('flex-1 overflow-y-auto scrollbar-thin py-4', theme === 'dark' ? 'chat-bg-dark' : 'chat-bg-light')}>
        <div className="mx-auto max-w-md bg-wa-yellow/95 text-black text-xs text-center py-2 px-4 rounded-lg shadow mb-4">
          <Lock className="w-3 h-3 inline ml-1" />
          الرسائل والمكالمات مشفرة تماماً بين الطرفين
        </div>
        <div className="space-y-1">
          {msgs.map((m) => (
            <MessageBubble key={m.id} msg={m} isGroup={contact.isGroup} />
          ))}
        </div>
      </div>

      <MessageInput chatId={activeChatId} replyTo={replyTo} onCancelReply={() => setReplyTo(undefined)} />

      <CallModal open={!!callType} type={callType ?? 'voice'} contact={contact} onClose={() => setCallType(null)} />
      <ContactInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} contact={contact} />
    </div>
  );
}

function EmptyState() {
  const { theme } = useApp();
  return (
    <div className={cn('h-full flex flex-col items-center justify-center', theme === 'dark' ? 'chat-bg-dark' : 'chat-bg-light')}>
      <div className="text-center max-w-sm px-6">
        <div className="w-64 h-64 mx-auto mb-6 bg-wa-sidebar/80 dark:bg-wa-sidebarDark/80 rounded-full flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 24 24" className="w-32 h-32 text-wa-secondary dark:text-wa-secondaryDark" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.87L2 22l5.13-1.27C8.57 21.54 10.23 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.66 0-3.22-.45-4.56-1.24l-.32-.2-3.05.76.76-3.05-.2-.32C3.45 15.22 3 13.66 3 12c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z" />
          </svg>
        </div>
        <h2 className="text-xl font-light text-wa-text dark:text-wa-textDark mb-3">ZizoChat Web</h2>
        <p className="text-sm text-wa-secondary dark:text-wa-secondaryDark leading-relaxed">
          اختر محادثة من القائمة لبدء الدردشة. رسائلك ومكالماتك مشفرة تماماً بين الطرفين.
        </p>
        <div className="mt-6 text-xs text-wa-secondary dark:text-wa-secondaryDark flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          مشفّر من طرف إلى طرف
        </div>
      </div>
    </div>
  );
}
