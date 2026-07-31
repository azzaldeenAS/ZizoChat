import { useState, useEffect } from 'react';
import { api, type ApiPublicRoom } from '@/services/api';
import { useApp } from '@/store';
import { X, Globe, Users, Plus, Search, LogIn } from 'lucide-react';

interface Props {
  onClose: () => void;
  onJoined: (chatId: string) => void;
}

export function PublicRoomsModal({ onClose, onJoined }: Props) {
  const { joinPublicRoom } = useApp();
  const [rooms, setRooms] = useState<ApiPublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating2, setCreating2] = useState(false);

  useEffect(() => {
    api.getPublicRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (room: ApiPublicRoom) => {
    if (room.isMember) { onJoined(room.id); onClose(); return; }
    setJoining(room.id);
    try {
      const chatId = await joinPublicRoom(room.id);
      setRooms(rs => rs.map(r => r.id === room.id ? { ...r, isMember: true, memberCount: r.memberCount + 1 } : r));
      onJoined(chatId);
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل الانضمام');
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating2(true);
    try {
      const room = await api.createPublicRoom(newName.trim(), newDesc.trim());
      const chatId = await joinPublicRoom(room.id);
      setRooms(rs => [{ ...room, isMember: true }, ...rs]);
      onJoined(chatId);
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل إنشاء الغرفة');
    } finally {
      setCreating2(false);
    }
  };

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

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
            <Globe className="w-5 h-5 text-wa-light" />
            <h2 className="font-semibold text-wa-text dark:text-wa-textDark">الغرف العامة</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-wa-hover dark:hover:bg-wa-hoverDark text-wa-secondary dark:text-wa-secondaryDark">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Toggle */}
        <div className="px-5 pt-4 pb-2">
          <button
            onClick={() => setCreating(v => !v)}
            className="flex items-center gap-2 text-sm text-wa-light font-medium hover:underline"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'إلغاء إنشاء غرفة جديدة' : 'إنشاء غرفة عامة جديدة'}
          </button>
        </div>

        {/* Create Form */}
        {creating && (
          <form onSubmit={handleCreate} className="px-5 pb-3 flex flex-col gap-2 border-b border-wa-border dark:border-wa-borderDark">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="اسم الغرفة *"
              required
              className="w-full bg-wa-sidebar dark:bg-wa-sidebarDark rounded-lg px-3 py-2 text-sm text-wa-text dark:text-wa-textDark outline-none focus:ring-2 focus:ring-wa-light"
            />
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="وصف الغرفة (اختياري)"
              className="w-full bg-wa-sidebar dark:bg-wa-sidebarDark rounded-lg px-3 py-2 text-sm text-wa-text dark:text-wa-textDark outline-none focus:ring-2 focus:ring-wa-light"
            />
            <button
              type="submit"
              disabled={creating2 || !newName.trim()}
              className="bg-wa-light hover:bg-wa-dark text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {creating2 ? 'جاري الإنشاء...' : 'إنشاء الغرفة والانضمام'}
            </button>
          </form>
        )}

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 bg-wa-sidebar dark:bg-wa-sidebarDark rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-wa-secondary dark:text-wa-secondaryDark shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن غرفة..."
              className="flex-1 bg-transparent text-sm text-wa-text dark:text-wa-textDark outline-none placeholder:text-wa-secondary dark:placeholder:text-wa-secondaryDark"
            />
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-wa-secondary dark:text-wa-secondaryDark text-sm">
              جاري التحميل...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-wa-secondary dark:text-wa-secondaryDark">
              <Globe className="w-10 h-10 opacity-30" />
              <p className="text-sm">{search ? 'لا توجد غرف مطابقة' : 'لا توجد غرف عامة بعد'}</p>
            </div>
          ) : (
            filtered.map(room => (
              <div
                key={room.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-wa-hover dark:hover:bg-wa-hoverDark transition-colors cursor-pointer mb-1"
                onClick={() => handleJoin(room)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-wa-light to-wa-dark flex items-center justify-center shrink-0">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-wa-text dark:text-wa-textDark truncate">{room.name}</span>
                    {room.isMember && (
                      <span className="text-[10px] bg-wa-light/20 text-wa-light px-2 py-0.5 rounded-full shrink-0">منضم</span>
                    )}
                  </div>
                  {room.description && (
                    <p className="text-xs text-wa-secondary dark:text-wa-secondaryDark truncate mt-0.5">{room.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-wa-secondary dark:text-wa-secondaryDark" />
                    <span className="text-[11px] text-wa-secondary dark:text-wa-secondaryDark">{room.memberCount} عضو</span>
                  </div>
                </div>
                <button
                  disabled={joining === room.id}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-wa-light text-white hover:bg-wa-dark disabled:opacity-50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {joining === room.id ? '...' : room.isMember ? 'فتح' : 'انضمام'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
