import { Drawer } from './ui';
import type { Contact } from '@/types';
import { X, Bell, BellOff, Trash2, Users } from 'lucide-react';
import { useApp } from '@/store';

export function ContactInfoDrawer({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact: Contact;
}) {
  const { chats, toggleMute, archiveChat } = useApp();
  const chat = chats.find((c) => c.contactId === contact.id);

  return (
    <Drawer open={open} onClose={onClose} side="left" width="w-[380px]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 h-16 bg-wa-header dark:bg-wa-headerDark shrink-0">
        <button onClick={onClose} className="text-white hover:text-white/80 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <span className="text-white font-medium text-base">
          {contact.isGroup ? 'معلومات المجموعة' : 'معلومات جهة الاتصال'}
        </span>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center py-8 bg-wa-panel dark:bg-wa-panelDark shrink-0">
        <img src={contact.avatar} alt={contact.name} className="w-28 h-28 rounded-full object-cover shadow-md" />
        <h2 className="mt-3 text-wa-text dark:text-wa-textDark font-semibold text-lg">{contact.name}</h2>
        {!contact.isGroup && (
          <p className="text-wa-secondary dark:text-wa-secondaryDark text-sm mt-0.5" dir="ltr">{contact.phone}</p>
        )}
        {!contact.isGroup && (
          <span className={`mt-1 text-xs ${contact.isOnline ? 'text-wa-light' : 'text-wa-secondary dark:text-wa-secondaryDark'}`}>
            {contact.isOnline ? 'متصل الآن' : contact.lastSeen ?? ''}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-wa-panel dark:bg-wa-panelDark px-6 py-4 space-y-6">
        {/* About */}
        {contact.about && (
          <div>
            <p className="text-wa-green text-sm mb-1">نبذة</p>
            <p className="text-wa-text dark:text-wa-textDark text-sm">{contact.about}</p>
          </div>
        )}

        {/* Group members */}
        {contact.isGroup && contact.members && (
          <div>
            <p className="text-wa-green text-sm mb-2 flex items-center gap-1">
              <Users className="w-4 h-4" /> {contact.members.length} أعضاء
            </p>
            <div className="space-y-2">
              {contact.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-wa-text dark:text-wa-textDark truncate" style={{ color: m.color }}>{m.name}</div>
                  </div>
                  {m.isAdmin && (
                    <span className="text-[10px] bg-wa-light/20 text-wa-light px-1.5 py-0.5 rounded">مشرف</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {chat && (
          <div className="space-y-1">
            <button
              onClick={() => { toggleMute(chat.id); }}
              className="w-full flex items-center gap-3 py-2.5 text-sm text-wa-text dark:text-wa-textDark hover:bg-wa-hover dark:hover:bg-wa-hoverDark rounded-lg px-2 transition-colors"
            >
              {chat.muted ? <Bell className="w-5 h-5 text-wa-secondary dark:text-wa-secondaryDark" /> : <BellOff className="w-5 h-5 text-wa-secondary dark:text-wa-secondaryDark" />}
              {chat.muted ? 'إلغاء كتم الإشعارات' : 'كتم الإشعارات'}
            </button>
            <button
              onClick={() => { archiveChat(chat.id); onClose(); }}
              className="w-full flex items-center gap-3 py-2.5 text-sm text-red-500 hover:bg-wa-hover dark:hover:bg-wa-hoverDark rounded-lg px-2 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              {chat.archived ? 'إلغاء الأرشفة' : 'أرشفة المحادثة'}
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] leading-relaxed text-wa-secondary dark:text-wa-secondaryDark py-2 px-2 select-none shrink-0">
        حقوق الطبع للمهندس عزالدين الرهمي ورقم الهاتف +967777320031
      </div>
    </Drawer>
  );
}
