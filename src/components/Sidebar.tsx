import { useState, useRef } from 'react';
import { useApp } from '@/store';
import { cn, getContact, lastMessageOf, formatLastPreview } from '@/utils';
import { CopyrightFooter, Menu, MenuItem, Tooltip } from './ui';
import { PublicRoomsModal } from './PublicRoomsModal';
import { NewGroupModal } from './NewGroupModal';
import {
  Search, MoreVertical, MessageSquarePlus, Users, CircleDashed,
  Settings, LogOut, Moon, Sun, Pin, BellOff, Check, CheckCheck,
  UsersRound, X, WifiOff, Globe,
} from 'lucide-react';

type Tab = 'chats' | 'groups' | 'public';

export function Sidebar({ onOpenProfile }: { onOpenProfile: () => void }) {
  const {
    chats, contacts, messages, activeChatId, setActiveChat,
    searchQuery, setSearchQuery, theme, toggleTheme,
    networkOffline, toggleNetwork, logout, currentUser, startDirectChat,
  } = useApp();

  const [tab, setTab] = useState<Tab>('chats');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showPublicRooms, setShowPublicRooms] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // ── Contacts split by type ──────────────────────────────────────────────
  const directContacts = contacts.filter(ct => !ct.isGroup);
  const groupContacts = contacts.filter(ct => ct.isGroup);

  const filterList = (list: typeof contacts) =>
    list
      .filter(ct => {
        const chat = chats.find(c => c.contactId === ct.id);
        if (chat?.archived) return false;
        if (!searchQuery) return true;
        return ct.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        const chatA = chats.find(c => c.contactId === a.id);
        const chatB = chats.find(c => c.contactId === b.id);
        if (chatA?.pinned !== chatB?.pinned) return chatA?.pinned ? -1 : 1;
        const la = chatA ? (lastMessageOf(chatA.id, messages)?.timestamp ?? 0) : 0;
        const lb = chatB ? (lastMessageOf(chatB.id, messages)?.timestamp ?? 0) : 0;
        if (la === 0 && lb === 0) return a.name.localeCompare(b.name, 'ar');
        return lb - la;
      });

  const filtered = tab === 'chats'
    ? filterList(directContacts)
    : tab === 'groups'
    ? filterList(groupContacts)
    : [];

  const openMenu = () => {
    const r = menuBtnRef.current?.getBoundingClientRect();
    // Menu clamps itself inside the viewport, so a rough anchor is enough
    if (r) setMenuPos({ x: r.right - 210, y: r.bottom + 6 });
    setMenuOpen(true);
  };

  const handleJoinedRoom = (chatId: string) => {
    setTab('groups');
    setActiveChat(chatId);
  };

  const handleCreatedGroup = (chatId: string) => {
    setTab('groups');
    setActiveChat(chatId);
  };

  const renderItem = (ct: typeof contacts[0]) => {
    const chat = chats.find(c => c.contactId === ct.id);
    const chatId = chat ? chat.id : ct.id;
    const last = chat ? lastMessageOf(chat.id, messages) : null;
    const active = chat ? chat.id === activeChatId : false;
    const preview = formatLastPreview(last ?? undefined);
    const senderPrefix = last && ct.isGroup && last.senderId !== 'me'
      ? `${getContact(last.senderId)?.name ?? ''}: ` : '';

    return (
      <button
        key={chatId}
        type="button"
        onClick={async () => {
          if (chat) {
            setActiveChat(chat.id);
          } else {
            const newChatId = await startDirectChat(ct.id);
            setActiveChat(newChatId);
          }
        }}
        className={cn(
          'flex w-full items-center gap-3 border-b border-wa-border/40 px-3 py-3 text-start transition-colors dark:border-wa-borderDark/40',
          'min-h-[68px] cursor-pointer active:bg-wa-active dark:active:bg-wa-activeDark',
          active ? 'bg-wa-active dark:bg-wa-activeDark' : 'hover:bg-wa-hover dark:hover:bg-wa-hoverDark'
        )}
      >
        <div className="relative shrink-0">
          {ct.hasStatus ? (
            <div className="p-[2px] rounded-full bg-wa-light">
              <div className="p-[2px] rounded-full bg-wa-sidebar dark:bg-wa-sidebarDark">
                <img src={ct.avatar} alt={ct.name} className="h-11 w-11 rounded-full object-cover sm:h-12 sm:w-12" />
              </div>
            </div>
          ) : (
            <img
              src={ct.avatar || `https://i.pravatar.cc/200?u=${ct.id}`}
              alt={ct.name}
              className="h-11 w-11 rounded-full object-cover sm:h-12 sm:w-12"
            />
          )}
          {ct.isOnline && !ct.isGroup && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-wa-light rounded-full border-2 border-wa-sidebar dark:border-wa-sidebarDark" />
          )}
          {ct.isGroup && (
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-wa-header dark:bg-wa-headerDark rounded-full flex items-center justify-center border border-wa-sidebar dark:border-wa-sidebarDark">
              <Users className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm text-wa-text dark:text-wa-textDark truncate">{ct.name}</span>
            <span className={cn('text-[11px] shrink-0', chat?.unreadCount ? 'text-wa-light font-semibold' : 'text-wa-secondary dark:text-wa-secondaryDark')}>
              {last?.time ?? ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="flex items-center gap-1 min-w-0 text-xs text-wa-secondary dark:text-wa-secondaryDark truncate">
              {last && last.senderId === 'me' && (
                last.status === 'read'
                  ? <CheckCheck className="w-4 h-4 text-wa-blue shrink-0" />
                  : last.status === 'delivered'
                  ? <CheckCheck className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" />
                  : <Check className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" />
              )}
              <span className="truncate">
                {senderPrefix}{preview || (ct.isGroup ? 'مجموعة جديدة' : 'ابدأ الدردشة الآن')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {chat?.muted && <BellOff className="w-3.5 h-3.5 text-wa-secondary dark:text-wa-secondaryDark" />}
              {chat?.pinned && <Pin className="w-3.5 h-3.5 text-wa-secondary dark:text-wa-secondaryDark" />}
              {chat && chat.unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-wa-light text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="flex h-full w-full min-w-0 flex-col border-l border-wa-border bg-wa-sidebar dark:border-wa-borderDark dark:bg-wa-sidebarDark">
        {/* Network banner */}
        {networkOffline && (
          <div className="flex shrink-0 items-center justify-center gap-2 bg-wa-yellow/90 py-1.5 text-center text-xs font-medium text-black animate-slide-up">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            جاري الاتصال...
          </div>
        )}

        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 bg-wa-header px-3 pt-safe sm:h-16 sm:px-4 dark:bg-wa-headerDark">
          <button
            onClick={onOpenProfile}
            aria-label="الملف الشخصي"
            className="shrink-0 transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src={currentUser?.avatar || ''}
              alt="صورتي"
              className="h-9 w-9 rounded-full bg-wa-header object-cover ring-1 ring-white/20"
            />
          </button>
          <div className="flex items-center gap-0.5 text-white sm:gap-1">
            <Tooltip label="حالات">
              <button
                aria-label="حالات"
                className="hidden rounded-full p-2 transition-colors hover:bg-white/10 active:bg-white/20 xs:block"
              >
                <CircleDashed className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip label="غرف عامة">
              <button
                onClick={() => setShowPublicRooms(true)}
                aria-label="غرف عامة"
                className="rounded-full p-2 transition-colors hover:bg-white/10 active:bg-white/20"
              >
                <Globe className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip label="مجموعة جديدة">
              <button
                onClick={() => setShowNewGroup(true)}
                aria-label="مجموعة جديدة"
                className="rounded-full p-2 transition-colors hover:bg-white/10 active:bg-white/20"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip label="القائمة">
              <button
                ref={menuBtnRef}
                onClick={openMenu}
                aria-label="القائمة"
                className="rounded-full p-2 transition-colors hover:bg-white/10 active:bg-white/20"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Menu */}
        <Menu open={menuOpen} onClose={() => setMenuOpen(false)} x={menuPos.x} y={menuPos.y}>
          <MenuItem icon={<UsersRound className="w-4 h-4" />} label="مجموعة جديدة" onClick={() => { setShowNewGroup(true); setMenuOpen(false); }} />
          <MenuItem icon={<Globe className="w-4 h-4" />} label="الغرف العامة" onClick={() => { setShowPublicRooms(true); setMenuOpen(false); }} />
          <MenuItem icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} onClick={() => { toggleTheme(); setMenuOpen(false); }} />
          <MenuItem icon={<Settings className="w-4 h-4" />} label="الإعدادات" onClick={() => setMenuOpen(false)} />
          <MenuItem icon={<WifiOff className="w-4 h-4" />} label="محاكاة انقطاع الشبكة" onClick={() => { toggleNetwork(); setMenuOpen(false); }} />
          <MenuItem icon={<LogOut className="w-4 h-4" />} label="تسجيل الخروج" onClick={() => { logout(); setMenuOpen(false); }} danger />
        </Menu>

        {/* Search */}
        <div className="shrink-0 bg-wa-sidebar px-2 py-2 sm:px-3 dark:bg-wa-sidebarDark">
          <div className="flex items-center gap-2 rounded-lg bg-wa-panel px-3 py-2 focus-within:ring-2 focus-within:ring-wa-light/60 sm:gap-3 sm:py-1.5 dark:bg-wa-panelDark">
            <Search className="h-4 w-4 shrink-0 text-wa-secondary dark:text-wa-secondaryDark" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث أو ابدأ دردشة جديدة"
              aria-label="بحث"
              className="min-w-0 flex-1 bg-transparent text-sm text-wa-text outline-none placeholder:text-wa-secondary dark:text-wa-textDark dark:placeholder:text-wa-secondaryDark"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="مسح البحث"
                className="shrink-0 text-wa-secondary hover:text-wa-text dark:text-wa-secondaryDark dark:hover:text-wa-textDark"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-wa-border dark:border-wa-borderDark">
          <TabButton
            active={tab === 'chats'}
            onClick={() => setTab('chats')}
            icon={<MessageSquarePlus className="h-4 w-4 shrink-0" />}
            label="المحادثات"
            count={directContacts.length}
          />
          <TabButton
            active={tab === 'groups'}
            onClick={() => setTab('groups')}
            icon={<Users className="h-4 w-4 shrink-0" />}
            label="المجموعات"
            count={groupContacts.length}
          />
          <TabButton
            active={tab === 'public'}
            onClick={() => setShowPublicRooms(true)}
            icon={<Globe className="h-4 w-4 shrink-0" />}
            label="غرف عامة"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scroll-touch">
          {filtered.length === 0 && tab !== 'public' && (
            <div className="text-center text-sm text-wa-secondary dark:text-wa-secondaryDark py-10 px-4">
              {searchQuery
                ? 'لا توجد نتائج مطابقة'
                : tab === 'groups'
                ? (
                  <div className="flex flex-col items-center gap-3">
                    <Users className="w-10 h-10 opacity-30" />
                    <p>لا توجد مجموعات بعد</p>
                    <button
                      onClick={() => setShowNewGroup(true)}
                      className="text-wa-light text-xs font-medium hover:underline"
                    >
                      + إنشاء مجموعة جديدة
                    </button>
                  </div>
                )
                : 'لا توجد محادثات'}
            </div>
          )}
          {filtered.map(renderItem)}
        </div>

        <CopyrightFooter variant="sidebar" />
      </div>

      {showPublicRooms && (
        <PublicRoomsModal
          onClose={() => setShowPublicRooms(false)}
          onJoined={handleJoinedRoom}
        />
      )}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreated={handleCreatedGroup}
        />
      )}
    </>
  );
}

// ─── Responsive tab ──────────────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-w-0 flex-1 items-center justify-center gap-1 border-b-2 px-1 py-3 text-[11px] font-medium transition-colors sm:gap-1.5 sm:py-2.5 sm:text-xs',
        active
          ? 'border-wa-light text-wa-light'
          : 'border-transparent text-wa-secondary hover:text-wa-text dark:text-wa-secondaryDark dark:hover:text-wa-textDark',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {!!count && (
        <span className="shrink-0 rounded-full bg-wa-panel px-1.5 py-0.5 text-[10px] dark:bg-wa-panelDark">
          {count}
        </span>
      )}
    </button>
  );
}
