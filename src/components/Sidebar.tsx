import { useState, useRef } from 'react';
import { useApp, CURRENT_USER } from '@/store';
import { cn, getContact, lastMessageOf, formatLastPreview } from '@/utils';
import { CopyrightFooter, Menu, MenuItem, Tooltip } from './ui';
import {
  Search, MoreVertical, MessageSquarePlus, Users, CircleDashed,
  Settings, LogOut, Moon, Sun, Pin, BellOff, Check, CheckCheck, UsersRound, X, WifiOff,
} from 'lucide-react';

export function Sidebar({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { chats, contacts, messages, activeChatId, setActiveChat, searchQuery, setSearchQuery, theme, toggleTheme, networkOffline, toggleNetwork, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const filtered = chats
    .filter((c) => !c.archived)
    .filter((c) => {
      const ct = getContact(c.contactId);
      if (!ct) return false;
      if (!searchQuery) return true;
      return ct.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const la = lastMessageOf(a.id, messages)?.timestamp ?? 0;
      const lb = lastMessageOf(b.id, messages)?.timestamp ?? 0;
      return lb - la;
    });

  const openMenu = () => {
    const r = menuBtnRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ x: r.left - 175, y: r.bottom + 6 });
    setMenuOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-wa-sidebar dark:bg-wa-sidebarDark border-l border-wa-border dark:border-wa-borderDark">
      {networkOffline && (
        <div className="bg-wa-yellow/90 text-black text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 animate-slide-up">
          <WifiOff className="w-3.5 h-3.5" />
          جاري الاتصال...
        </div>
      )}

      <div className="flex items-center justify-between px-4 h-16 bg-wa-header dark:bg-wa-headerDark shrink-0">
        <button onClick={onOpenProfile} className="transition-transform hover:scale-105">
          <img src={CURRENT_USER.avatar} alt="my avatar" className="w-9 h-9 rounded-full object-cover" />
        </button>
        <div className="flex items-center gap-1 text-white">
          <Tooltip label="حالات"><button className="p-2 rounded-full hover:bg-white/10 transition-colors"><CircleDashed className="w-5 h-5" /></button></Tooltip>
          <Tooltip label="مجتمع"><button className="p-2 rounded-full hover:bg-white/10 transition-colors"><Users className="w-5 h-5" /></button></Tooltip>
          <Tooltip label="دردشة جديدة"><button className="p-2 rounded-full hover:bg-white/10 transition-colors"><MessageSquarePlus className="w-5 h-5" /></button></Tooltip>
          <Tooltip label="القائمة"><button ref={menuBtnRef} onClick={openMenu} className="p-2 rounded-full hover:bg-white/10 transition-colors"><MoreVertical className="w-5 h-5" /></button></Tooltip>
        </div>
      </div>

      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} x={menuPos.x} y={menuPos.y}>
        <MenuItem icon={<UsersRound className="w-4 h-4" />} label="مجموعة جديدة" onClick={() => setMenuOpen(false)} />
        <MenuItem icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} onClick={() => { toggleTheme(); setMenuOpen(false); }} />
        <MenuItem icon={<Settings className="w-4 h-4" />} label="الإعدادات" onClick={() => setMenuOpen(false)} />
        <MenuItem icon={<WifiOff className="w-4 h-4" />} label="محاكاة انقطاع الشبكة" onClick={() => { toggleNetwork(); setMenuOpen(false); }} />
        <MenuItem icon={<LogOut className="w-4 h-4" />} label="تسجيل الخروج" onClick={() => { logout(); setMenuOpen(false); }} danger />
      </Menu>

      <div className="px-3 py-2 bg-wa-sidebar dark:bg-wa-sidebarDark shrink-0">
        <div className="flex items-center gap-3 bg-wa-panel dark:bg-wa-panelDark rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-wa-secondary dark:text-wa-secondaryDark py-10 px-4">
            لا توجد محادثات مطابقة لبحثك
          </div>
        )}
        {filtered.map((chat) => {
          const ct = getContact(chat.contactId);
          if (!ct) return null;
          const last = lastMessageOf(chat.id, messages);
          const active = chat.id === activeChatId;
          const preview = formatLastPreview(last);
          const senderPrefix = last && ct.isGroup && last.senderId !== 'me' ? `${getContact(last.senderId)?.name ?? ''}: ` : '';
          return (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
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
                  <img src={ct.avatar} alt={ct.name} className="w-12 h-12 rounded-full object-cover" />
                )}
                {ct.isOnline && !ct.isGroup && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-wa-light rounded-full border-2 border-wa-sidebar dark:border-wa-sidebarDark" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-wa-text dark:text-wa-textDark truncate">{ct.name}</span>
                  <span className={cn('text-[11px] shrink-0', chat.unreadCount > 0 ? 'text-wa-light font-semibold' : 'text-wa-secondary dark:text-wa-secondaryDark')}>
                    {last?.time ?? ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-1 min-w-0 text-xs text-wa-secondary dark:text-wa-secondaryDark truncate">
                    {last && last.senderId === 'me' && (
                      last.status === 'read' ? <CheckCheck className="w-4 h-4 text-wa-blue shrink-0" /> :
                      last.status === 'delivered' ? <CheckCheck className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" /> :
                      <Check className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" />
                    )}
                    <span className="truncate">{senderPrefix}{preview}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {chat.muted && <BellOff className="w-3.5 h-3.5 text-wa-secondary dark:text-wa-secondaryDark" />}
                    {chat.pinned && <Pin className="w-3.5 h-3.5 text-wa-secondary dark:text-wa-secondaryDark" />}
                    {chat.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-wa-light text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CopyrightFooter variant="sidebar" />
    </div>
  );
}
