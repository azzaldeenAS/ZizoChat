import { useState } from 'react';
import { useApp, CURRENT_USER } from '@/store';
import { Drawer } from './ui';
import { X, Pencil, Check } from 'lucide-react';

export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [name, setName] = useState(CURRENT_USER.name);
  const [about, setAbout] = useState(CURRENT_USER.about);

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[380px]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 h-16 bg-wa-header dark:bg-wa-headerDark shrink-0">
        <button onClick={onClose} className="text-white hover:text-white/80 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <span className="text-white font-medium text-base">الملف الشخصي</span>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-8 bg-wa-panel dark:bg-wa-panelDark shrink-0">
        <div className="relative">
          <img
            src={CURRENT_USER.avatar}
            alt="avatar"
            className="w-28 h-28 rounded-full object-cover shadow-md"
          />
        </div>
        <p className="mt-3 text-wa-secondary dark:text-wa-secondaryDark text-xs">
          {CURRENT_USER.phone}
        </p>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto bg-wa-panel dark:bg-wa-panelDark px-6 py-2 space-y-6">
        {/* Name */}
        <div>
          <p className="text-wa-green text-sm mb-1">اسمك</p>
          {editingName ? (
            <div className="flex items-center gap-2 border-b border-wa-green pb-1">
              <input
                autoFocus
                dir="rtl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent text-wa-text dark:text-wa-textDark outline-none text-sm"
              />
              <button onClick={() => setEditingName(false)} className="text-wa-green">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <span className="text-wa-text dark:text-wa-textDark text-sm">{name}</span>
              <button
                onClick={() => setEditingName(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-wa-secondary dark:text-wa-secondaryDark"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="mt-1 text-wa-secondary dark:text-wa-secondaryDark text-xs leading-snug">
            هذا ليس اسم المستخدم أو رمز PIN. سيرى هذا الاسم جهات اتصالك على واتساب.
          </p>
        </div>

        {/* About */}
        <div>
          <p className="text-wa-green text-sm mb-1">نبذة</p>
          {editingAbout ? (
            <div className="flex items-center gap-2 border-b border-wa-green pb-1">
              <input
                autoFocus
                dir="rtl"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="flex-1 bg-transparent text-wa-text dark:text-wa-textDark outline-none text-sm"
              />
              <button onClick={() => setEditingAbout(false)} className="text-wa-green">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <span className="text-wa-text dark:text-wa-textDark text-sm">{about}</span>
              <button
                onClick={() => setEditingAbout(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-wa-secondary dark:text-wa-secondaryDark"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Phone */}
        <div>
          <p className="text-wa-green text-sm mb-1">رقم الهاتف</p>
          <span className="text-wa-text dark:text-wa-textDark text-sm" dir="ltr">
            {CURRENT_USER.phone}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] leading-relaxed text-wa-secondary dark:text-wa-secondaryDark py-2 px-2 select-none shrink-0">
        حقوق الطبع للمهندس عزالدين الرهمي ورقم الهاتف +967777320031
      </div>
    </Drawer>
  );
}
