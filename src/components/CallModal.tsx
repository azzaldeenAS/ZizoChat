import { useEffect, useState } from 'react';
import { Modal } from './ui';
import type { Contact } from '@/types';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff } from 'lucide-react';

export function CallModal({
  open,
  type,
  contact,
  onClose,
}: {
  open: boolean;
  type: 'voice' | 'video';
  contact: Contact;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!open) { setSeconds(0); setConnected(false); return; }
    const connectTimer = setTimeout(() => setConnected(true), 2000);
    return () => clearTimeout(connectTimer);
  }, [open]);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-gradient-to-b from-wa-tealDark to-wa-dark rounded-2xl shadow-2xl w-72 text-center py-10 px-6 flex flex-col items-center gap-5">
        <img src={contact.avatar} alt={contact.name} className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white/20" />
        <div>
          <div className="text-white font-semibold text-lg">{contact.name}</div>
          <div className="text-white/70 text-sm mt-1">
            {connected ? (type === 'voice' ? `مكالمة صوتية • ${fmt(seconds)}` : `مكالمة فيديو • ${fmt(seconds)}`) : 'جارٍ الاتصال...'}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white/30 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {type === 'video' && (
            <button
              onClick={() => setCamOff((c) => !c)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOff ? 'bg-white/30 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {camOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          {type === 'voice' && (
            <button className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors">
              <Phone className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
