import { useState } from 'react';
import { useApp } from '@/store';
import { X, Users, Check, Search } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (chatId: string) => void;
}

export function NewGroupModal({ onClose, onCreated }: Props) {
  const { contacts, createGroup } = useApp();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const people = contacts.filter(c => !c.isGroup);
  const filtered = people.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selected.length === 0) return;
    setLoading(true);
    try {
      const chatId = await createGroup(name.trim(), selected);
      onCreated(chatId);
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل إنشاء المجموعة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-wa-panel dark:bg-wa-panelDark rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border dark:border-wa-borderDark">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-wa-light" />
            <h2 className="font-semibold text-wa-text dark:text-wa-textDark">مجموعة جديدة</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-wa-hover dark:hover:bg-wa-hoverDark text-wa-secondary dark:text-wa-secondaryDark">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          {/* Group Name */}
          <div className="px-5 py-3 border-b border-wa-border dark:border-wa-borderDark">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="اسم المجموعة *"
              required
              className="w-full bg-wa-sidebar dark:bg-wa-sidebarDark rounded-lg px-3 py-2.5 text-sm text-wa-text dark:text-wa-textDark outline-none focus:ring-2 focus:ring-wa-light"
            />
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-wa-border dark:border-wa-borderDark">
              {selected.map(id => {
                const ct = contacts.find(c => c.id === id);
                return ct ? (
                  <span key={id} className="flex items-center gap-1 bg-wa-light/20 text-wa-light text-xs px-2.5 py-1 rounded-full">
                    {ct.name}
                    <button type="button" onClick={() => toggle(id)}><X className="w-3 h-3" /></button>
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 bg-wa-sidebar dark:bg-wa-sidebarDark rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن مستخدم..."
                className="flex-1 bg-transparent text-sm text-wa-text dark:text-wa-textDark outline-none placeholder:text-wa-secondary dark:placeholder:text-wa-secondaryDark"
              />
            </div>
          </div>

          {/* Contacts list */}
          <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-wa-secondary dark:text-wa-secondaryDark py-8">لا يوجد مستخدمون</p>
            ) : filtered.map(ct => (
              <div
                key={ct.id}
                onClick={() => toggle(ct.id)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-wa-hover dark:hover:bg-wa-hoverDark cursor-pointer transition-colors"
              >
                <div className="relative shrink-0">
                  <img src={ct.avatar || `https://i.pravatar.cc/200?u=${ct.id}`} alt={ct.name} className="w-10 h-10 rounded-full object-cover" />
                  {ct.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-wa-light rounded-full border-2 border-wa-panel dark:border-wa-panelDark" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wa-text dark:text-wa-textDark truncate">{ct.name}</p>
                  <p className="text-xs text-wa-secondary dark:text-wa-secondaryDark">{ct.isOnline ? 'متصل الآن' : 'غير متصل'}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected.includes(ct.id) ? 'bg-wa-light border-wa-light' : 'border-wa-border dark:border-wa-borderDark'}`}>
                  {selected.includes(ct.id) && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-wa-border dark:border-wa-borderDark">
            <button
              type="submit"
              disabled={loading || !name.trim() || selected.length === 0}
              className="w-full bg-wa-light hover:bg-wa-dark text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'جاري الإنشاء...' : `إنشاء المجموعة (${selected.length} عضو)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
