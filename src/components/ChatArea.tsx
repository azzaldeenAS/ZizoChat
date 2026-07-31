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
    <div className="flex h-full w-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2 bg-wa-header px-2 pt-safe sm:h-16 sm:gap-3 sm:px-4 dark:bg-wa-headerDark">
        <button
          onClick={() => setActiveChat(null)}
          aria-label="رجوع"
          className="-mr-1 shrink-0 rounded-full p-2 text-white transition-colors hover:bg-white/10 active:bg-white/20 md:hidden"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowInfo(true)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-start transition-colors hover:bg-white/5 sm:gap-3"
        >
          <img
            src={contact.avatar}
            alt={contact.name}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/20 sm:h-10 sm:w-10"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm font-medium text-white">
              <span className="truncate">{contact.name}</span>
              {contact.isGroup && <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />}
            </div>
            <div className="truncate text-xs text-white/70">
              {contact.isGroup
                ? `${contact.members?.length ?? 0} أعضاء`
                : contact.isOnline ? 'متصل الآن' : contact.lastSeen ?? ''}
            </div>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 text-white sm:gap-1">
          <button
            onClick={() => setCallType('video')}
            aria-label="مكالمة فيديو"
            className="rounded-full p-2 transition-colors hover:bg-white/10 active:bg-white/20"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCallType('voice')}
            aria-label="مكالمة صوتية"
            className="rounded-full p-2 transition-colors hover:bg-white/10 active:bg-white/20"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            aria-label="بحث في المحادثة"
            className="hidden rounded-full p-2 transition-colors hover:bg-white/10 lg:block"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            aria-label="خيارات"
            className="hidden rounded-full p-2 transition-colors hover:bg-white/10 active:bg-white/20 xs:block"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scroll-touch py-3 sm:py-4',
          theme === 'dark' ? 'chat-bg-dark' : 'chat-bg-light',
        )}
      >
        <div className="mx-3 mb-4 text-balance rounded-lg bg-wa-yellow/95 px-3 py-2 text-center text-[11px] text-black shadow sm:mx-auto sm:max-w-md sm:px-4 sm:text-xs">
          <Lock className="ml-1 inline h-3 w-3" />
          الرسائل والمكالمات مشفرة تماماً بين الطرفين
        </div>
        <div className="mx-auto w-full max-w-5xl space-y-1">
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
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center overflow-y-auto',
        theme === 'dark' ? 'chat-bg-dark' : 'chat-bg-light',
      )}
    >
      <div className="max-w-sm px-6 py-8 text-center">
        <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full bg-wa-sidebar/80 shadow-lg sm:mb-6 sm:h-52 sm:w-52 lg:h-64 lg:w-64 dark:bg-wa-sidebarDark/80">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-20 w-20 text-wa-secondary sm:h-28 sm:w-28 lg:h-32 lg:w-32 dark:text-wa-secondaryDark"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.87L2 22l5.13-1.27C8.57 21.54 10.23 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.66 0-3.22-.45-4.56-1.24l-.32-.2-3.05.76.76-3.05-.2-.32C3.45 15.22 3 13.66 3 12c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z" />
          </svg>
        </div>
        <h2 className="mb-3 text-balance text-lg font-light text-wa-text sm:text-xl dark:text-wa-textDark">
          ZizoChat Web
        </h2>
        <p className="text-pretty text-sm leading-relaxed text-wa-secondary dark:text-wa-secondaryDark">
          اختر محادثة من القائمة لبدء الدردشة. رسائلك ومكالماتك مشفرة تماماً بين الطرفين.
        </p>
        <div className="mt-5 flex items-center justify-center gap-1 text-xs text-wa-secondary sm:mt-6 dark:text-wa-secondaryDark">
          <Lock className="h-3 w-3" />
          مشفّر من طرف إلى طرف
        </div>
      </div>
    </div>
  );
}
