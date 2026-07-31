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
    if (r) setMenuPos({ x: r.left - 175, y: r.bottom + 6 });
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
      <div
        key={chatId}
        onClick={async () => {
          if (chat) {
            setActiveChat(chat.id);
          } else {
            const newChatId = await startDirectChat(ct.id);
            setActiveChat(newChatId);
          }
        }}
        className={cn(
          'flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-wa-border/40 dark:border-wa-borderDark/40 transition-colors',
          active ? 'bg-wa-active dark:bg-wa-activeDark' : 'hover:bg-wa-hover dark:hover:bg-wa-hoverDark'
        )}
      >
        <div className="relative shrink-0">
          {ct.hasStatus ? (
            <div className="p-[2px] rounded-full bg-wa-light">
              <div className="p-[2px] rounded-full bg-wa-sidebar dark:bg-wa-sidebarDark">
                <img src={ct.avatar} alt={ct.name} className="w-12 h-12 rounded-full object-cover" />
              </div>
            </div>
          ) : (
            <img
              src={ct.avatar || `https://i.pravatar.cc/200?u=${ct.id}`}
              alt={ct.name}
              className="w-12 h-12 rounded-full object-cover"
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
      </div>
    );
  };

  return (
    <>
      <div className="h-full flex flex-col bg-wa-sidebar dark:bg-wa-sidebarDark border-l border-wa-border dark:border-wa-borderDark">
        {/* Network banner */}
        {networkOffline && (
          <div className="bg-wa-yellow/90 text-black text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 animate-slide-up">
            <WifiOff className="w-3.5 h-3.5" />
            جاري الاتصال...
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-16 bg-wa-header dark:bg-wa-headerDark shrink-0">
          <button onClick={onOpenProfile} className="transition-transform hover:scale-105">
            <img
              src={currentUser?.avatar || ''}
              alt="my avatar"
              className="w-9 h-9 rounded-full object-cover bg-wa-header"
            />
          </button>
          <div className="flex items-center gap-1 text-white">
            <Tooltip label="حالات">
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <CircleDashed className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip label="غرف عامة">
              <button onClick={() => setShowPublicRooms(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <Globe className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip label="مجموعة جديدة">
              <button onClick={() => setShowNewGroup(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <MessageSquarePlus className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip label="القائمة">
              <button ref={menuBtnRef} onClick={openMenu} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <MoreVertical className="w-5 h-5" />
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
        <div className="px-3 py-2 bg-wa-sidebar dark:bg-wa-sidebarDark shrink-0">
          <div className="flex items-center gap-3 bg-wa-panel dark:bg-wa-panelDark rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث أو ابدأ دردشة جديدة"
              className="flex-1 bg-transparent text-sm text-wa-text dark:text-wa-textDark outline-none placeholder:text-wa-secondary dark:placeholder:text-wa-secondaryDark"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-wa-border dark:border-wa-borderDark">
          <button
            onClick={() => setTab('chats')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
              tab === 'chats'
                ? 'border-wa-light text-wa-light'
                : 'border-transparent text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark'
            )}
          >
            <MessageSquarePlus className="w-4 h-4" />
            المحادثات
            {directContacts.length > 0 && (
              <span className="text-[10px] bg-wa-panel dark:bg-wa-panelDark px-1.5 py-0.5 rounded-full">
                {directContacts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('groups')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
              tab === 'groups'
                ? 'border-wa-light text-wa-light'
                : 'border-transparent text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark'
            )}
          >
            <Users className="w-4 h-4" />
            المجموعات
            {groupContacts.length > 0 && (
              <span className="text-[10px] bg-wa-panel dark:bg-wa-panelDark px-1.5 py-0.5 rounded-full">
                {groupContacts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowPublicRooms(true)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
              tab === 'public'
                ? 'border-wa-light text-wa-light'
                : 'border-transparent text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark'
            )}
          >
            <Globe className="w-4 h-4" />
            غرف عامة
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
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
