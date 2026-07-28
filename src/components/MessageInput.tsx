import { useState, useRef } from 'react';
import { useApp } from '@/store';
import type { Message } from '@/types';
import { uid } from '@/utils';
import { Smile, Paperclip, Mic, Send, X, Image, BarChart2 } from 'lucide-react';

const EMOJIS = ['😀','😂','😍','😎','🥰','😭','😡','🤔','👍','👎','❤️','🔥','🎉','😢','🙏','💪','👏','🤣','😊','😒'];

export function MessageInput({
  chatId,
  replyTo,
  onCancelReply,
}: {
  chatId: string;
  replyTo?: Message;
  onCancelReply: () => void;
}) {
  const { sendMessage, sendVoiceMessage, sendImageMessage, sendPoll } = useApp();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage(chatId, t, replyTo?.id);
    setText('');
    onCancelReply();
    setShowEmoji(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const startRecording = () => {
    setRecording(true);
    setRecordTime(0);
    timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    const dur = recordTime || 1;
    const waveform = Array.from({ length: 32 }, () => Math.floor(Math.random() * 20) + 4);
    sendVoiceMessage(chatId, dur, waveform, replyTo?.id);
    setRecordTime(0);
    onCancelReply();
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setRecordTime(0);
  };

  const handleImageUrl = () => {
    const url = prompt('أدخل رابط الصورة:');
    if (url) {
      sendImageMessage(chatId, url, undefined, replyTo?.id);
      onCancelReply();
    }
    setShowAttach(false);
  };

  const submitPoll = () => {
    const opts = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || opts.length < 2) return;
    sendPoll(chatId, pollQuestion.trim(), opts);
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPoll(false);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="shrink-0 bg-wa-sidebar dark:bg-wa-sidebarDark border-t border-wa-border dark:border-wa-borderDark">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-wa-hover dark:bg-wa-hoverDark border-b border-wa-border dark:border-wa-borderDark">
          <div className="flex-1 border-r-2 border-wa-light pr-2">
            <div className="text-xs font-semibold text-wa-light">
              {replyTo.senderId === 'me' ? 'أنت' : replyTo.senderId}
            </div>
            <div className="text-xs text-wa-secondary dark:text-wa-secondaryDark truncate max-w-xs">
              {replyTo.text ?? (replyTo.type === 'voice' ? '🎤 رسالة صوتية' : replyTo.type === 'image' ? '📷 صورة' : '')}
            </div>
          </div>
          <button onClick={onCancelReply} className="text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 py-2 flex flex-wrap gap-1 border-b border-wa-border dark:border-wa-borderDark">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => { setText((t) => t + e); inputRef.current?.focus(); }} className="text-xl hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Attach menu */}
      {showAttach && (
        <div className="px-4 py-2 flex gap-3 border-b border-wa-border dark:border-wa-borderDark">
          <button
            onClick={handleImageUrl}
            className="flex flex-col items-center gap-1 text-xs text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-light transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-wa-hover dark:bg-wa-hoverDark flex items-center justify-center">
              <Image className="w-5 h-5" />
            </div>
            صورة
          </button>
          <button
            onClick={() => { setShowPoll(true); setShowAttach(false); }}
            className="flex flex-col items-center gap-1 text-xs text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-light transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-wa-hover dark:bg-wa-hoverDark flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            استطلاع
          </button>
        </div>
      )}

      {/* Poll creator */}
      {showPoll && (
        <div className="px-4 py-3 space-y-2 border-b border-wa-border dark:border-wa-borderDark">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-wa-text dark:text-wa-textDark">استطلاع رأي جديد</span>
            <button onClick={() => setShowPoll(false)} className="text-wa-secondary dark:text-wa-secondaryDark"><X className="w-4 h-4" /></button>
          </div>
          <input
            dir="rtl"
            placeholder="السؤال..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            className="w-full bg-wa-hover dark:bg-wa-hoverDark text-wa-text dark:text-wa-textDark text-sm rounded px-3 py-1.5 outline-none"
          />
          {pollOptions.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                dir="rtl"
                placeholder={`الخيار ${i + 1}`}
                value={o}
                onChange={(e) => setPollOptions((ops) => ops.map((v, j) => j === i ? e.target.value : v))}
                className="flex-1 bg-wa-hover dark:bg-wa-hoverDark text-wa-text dark:text-wa-textDark text-sm rounded px-3 py-1.5 outline-none"
              />
              {pollOptions.length > 2 && (
                <button onClick={() => setPollOptions((ops) => ops.filter((_, j) => j !== i))} className="text-wa-secondary dark:text-wa-secondaryDark">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 5 && (
            <button onClick={() => setPollOptions((ops) => [...ops, ''])} className="text-xs text-wa-light">+ إضافة خيار</button>
          )}
          <button onClick={submitPoll} className="w-full bg-wa-light text-white rounded py-1.5 text-sm font-medium">إرسال الاستطلاع</button>
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => { setShowEmoji((s) => !s); setShowAttach(false); }} className="text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark transition-colors shrink-0">
          <Smile className="w-6 h-6" />
        </button>
        <button onClick={() => { setShowAttach((s) => !s); setShowEmoji(false); }} className="text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark transition-colors shrink-0">
          <Paperclip className="w-6 h-6" />
        </button>

        {recording ? (
          <div className="flex-1 flex items-center gap-2 bg-wa-hover dark:bg-wa-hoverDark rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-wa-text dark:text-wa-textDark flex-1">{fmt(recordTime)}</span>
            <button onClick={cancelRecording} className="text-wa-secondary dark:text-wa-secondaryDark text-xs">إلغاء</button>
          </div>
        ) : (
          <input
            ref={inputRef}
            dir="rtl"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-wa-hover dark:bg-wa-hoverDark text-wa-text dark:text-wa-textDark placeholder-wa-secondary dark:placeholder-wa-secondaryDark text-sm rounded-full px-4 py-2 outline-none"
          />
        )}

        {text.trim() ? (
          <button onClick={submit} className="shrink-0 w-10 h-10 rounded-full bg-wa-light flex items-center justify-center text-white hover:bg-wa-tealDark transition-colors">
            <Send className="w-5 h-5" />
          </button>
        ) : recording ? (
          <button onClick={stopRecording} className="shrink-0 w-10 h-10 rounded-full bg-wa-light flex items-center justify-center text-white">
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button onMouseDown={startRecording} className="shrink-0 w-10 h-10 rounded-full bg-wa-light flex items-center justify-center text-white hover:bg-wa-tealDark transition-colors">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
