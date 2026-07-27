import { useState, useRef, useEffect } from 'react';
import type { Message } from '@/types';
import { useApp } from '@/store';
import { cn, getContact, getSenderName, getSenderColor, getGroupMember } from '@/utils';
import { QUICK_REACTIONS } from '@/data';
import {
  Check, CheckCheck, Play, Pause, Smile, Reply, Trash2, MoreVertical, ChevronDown,
} from 'lucide-react';

export function MessageBubble({ msg, isGroup }: { msg: Message; isGroup: boolean }) {
  const { toggleReaction, deleteMessage, messages } = useApp();
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const out = msg.senderId === 'me';
  const sender = getContact(msg.senderId);
  const color = getSenderColor(msg, isGroup);

  const replyTo = msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : undefined;

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: r.left - 160, y: r.bottom + 4 });
    setShowMenu(true);
  };

  const handleQuickReaction = (emoji: string) => {
    toggleReaction(msg.id, emoji);
    setShowReactions(false);
  };

  return (
    <div className={cn('flex px-3 md:px-8 group', out ? 'justify-end' : 'justify-start')}>
      <div className={cn('relative max-w-[75%] md:max-w-[60%] my-0.5', out ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative rounded-lg px-2.5 py-1.5 shadow-sm',
            out
              ? 'bg-wa-bubbleOut dark:bg-wa-bubbleOutDark text-wa-text dark:text-wa-textDark rounded-tr-none'
              : 'bg-wa-bubbleIn dark:bg-wa-bubbleInDark text-wa-text dark:text-wa-textDark rounded-tl-none'
          )}
        >
          {isGroup && !out && (
            <div className="text-xs font-semibold mb-0.5" style={{ color }}>{getSenderName(msg)}</div>
          )}

          {isGroup && !out && getGroupMember(msg.chatId, msg.senderId)?.isAdmin && (
            <span className="inline-block ml-1 text-[9px] bg-wa-light/20 text-wa-light px-1 rounded mb-0.5 align-middle">مشرف</span>
          )}

          {replyTo && (
            <div className="border-r-2 border-wa-light bg-wa-light/10 rounded px-2 py-1 mb-1 text-xs">
              <div className="font-semibold text-wa-light">{getSenderName(replyTo)}</div>
              <div className="text-wa-secondary dark:text-wa-secondaryDark truncate max-w-[200px]">
                {replyTo.text ?? (replyTo.type === 'voice' ? '🎤 رسالة صوتية' : replyTo.type === 'image' ? '📷 صورة' : '')}
              </div>
            </div>
          )}

          {msg.type === 'text' && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</div>
          )}
          {msg.type === 'image' && msg.image && (
            <div>
              <img src={msg.image.url} alt="" className="rounded-md max-w-full max-h-72 object-cover" />
              {msg.image.caption && <div className="text-sm mt-1">{msg.image.caption}</div>}
            </div>
          )}
          {msg.type === 'voice' && msg.voice && <VoiceMessage msg={msg} />}
          {msg.type === 'poll' && msg.poll && <PollView msg={msg} />}

          <div className={cn('flex items-center gap-1 mt-0.5 text-[10px]', out ? 'justify-end text-wa-secondary dark:text-wa-secondaryDark' : 'text-wa-secondary dark:text-wa-secondaryDark')}>
            <span>{msg.time}</span>
            {out && (
              msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-wa-blue" /> :
              msg.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5" /> :
              <Check className="w-3.5 h-3.5" />
            )}
          </div>

          {msg.reactions.length > 0 && (
            <div className={cn('absolute -bottom-2.5 flex gap-0.5 bg-wa-sidebar dark:bg-wa-panelDark rounded-full px-1 py-0.5 shadow border border-wa-border dark:border-wa-borderDark text-xs', out ? 'left-1' : 'right-1')}>
              {msg.reactions.map((r, i) => (
                <span key={i}>{r.emoji}</span>
              ))}
            </div>
          )}
        </div>

        <div className={cn('absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-wa-sidebar dark:bg-wa-panelDark rounded-full shadow px-1', out ? '-left-16' : '-right-16')}>
          <button onClick={() => setShowReactions((s) => !s)} className="p-1 hover:bg-wa-hover dark:hover:bg-wa-hoverDark rounded-full text-wa-secondary dark:text-wa-secondaryDark">
            <Smile className="w-4 h-4" />
          </button>
          <button onClick={openMenu} className="p-1 hover:bg-wa-hover dark:hover:bg-wa-hoverDark rounded-full text-wa-secondary dark:text-wa-secondaryDark">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {showReactions && (
          <div className={cn('absolute z-30 -top-9 bg-wa-sidebar dark:bg-wa-panelDark rounded-full shadow-lg px-2 py-1 flex gap-1 reaction-pop', out ? 'left-0' : 'right-0')}>
            {QUICK_REACTIONS.map((e) => (
              <button key={e} onClick={() => handleQuickReaction(e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
        )}

        {showMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
            <div
              style={{ left: menuPos.x, top: menuPos.y }}
              className="fixed z-40 bg-wa-sidebar dark:bg-wa-panelDark rounded-lg shadow-xl border border-wa-border dark:border-wa-borderDark py-1 min-w-[150px] animate-scale-in origin-top-left"
            >
              <button
                onClick={() => { setShowMenu(false); window.dispatchEvent(new CustomEvent('zizo-reply', { detail: msg.id })); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-wa-hover dark:hover:bg-wa-hoverDark text-wa-text dark:text-wa-textDark"
              >
                <Reply className="w-4 h-4" /> رد
              </button>
              <button
                onClick={() => { toggleReaction(msg.id, '👍'); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-wa-hover dark:hover:bg-wa-hoverDark text-wa-text dark:text-wa-textDark"
              >
                <Smile className="w-4 h-4" /> تفاعل
              </button>
              {out && (
                <button
                  onClick={() => { deleteMessage(msg.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-wa-hover dark:hover:bg-wa-hoverDark text-red-500"
                >
                  <Trash2 className="w-4 h-4" /> حذف
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VoiceMessage({ msg }: { msg: Message }) {
  const { setVoiceSpeed } = useApp();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voice = msg.voice!;
  const speed = voice.speed;
  const out = msg.senderId === 'me';

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const toggle = () => {
    if (playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      const tick = 100 / (voice.duration * (1000 / speed) / 100);
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) { if (timerRef.current) clearInterval(timerRef.current); setPlaying(false); return 0; }
          return p + tick;
        });
      }, 100);
    }
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setVoiceSpeed(msg.id, next as 1 | 1.5 | 2);
  };

  const played = Math.floor((progress / 100) * voice.waveform.length);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 min-w-[220px] py-1">
      <button onClick={toggle} className={cn('shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white', out ? 'bg-wa-tealDark' : 'bg-wa-light')}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="flex items-end gap-[2px] h-7">
          {voice.waveform.map((h, i) => (
            <div
              key={i}
              className={cn('wave-bar h-full', i < played ? (out ? 'text-wa-dark/60' : 'text-wa-light/70') : (out ? 'text-wa-dark/30' : 'text-wa-secondary/50'))}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-wa-secondary dark:text-wa-secondaryDark">
            {playing ? fmt(Math.floor((progress / 100) * voice.duration)) : fmt(voice.duration)}
          </span>
          <button onClick={cycleSpeed} className="text-[10px] bg-wa-light/20 text-wa-light px-1.5 rounded font-semibold">
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}

function PollView({ msg }: { msg: Message }) {
  const { votePoll } = useApp();
  const poll = msg.poll!;
  const totalVotes = poll.options.reduce((acc, o) => acc + o.votes.length, 0);

  return (
    <div className="min-w-[240px]">
      <div className="text-sm font-medium mb-1">{poll.question}</div>
      <div className="text-[10px] text-wa-secondary dark:text-wa-secondaryDark mb-2">استطلاع رأي</div>
      <div className="space-y-2">
        {poll.options.map((o) => {
          const pct = totalVotes > 0 ? Math.round((o.votes.length / totalVotes) * 100) : 0;
          const voted = o.votes.includes('me');
          return (
            <button
              key={o.id}
              onClick={() => votePoll(msg.id, o.id)}
              className="w-full text-right relative overflow-hidden rounded border border-wa-border dark:border-wa-borderDark px-2 py-1.5 hover:bg-wa-hover dark:hover:bg-wa-hoverDark transition-colors"
            >
              {voted && (
                <div className="absolute inset-y-0 right-0 bg-wa-light/15" style={{ width: `${pct}%` }} />
              )}
              <div className="relative flex items-center justify-between">
                <span className="text-sm">{o.text}</span>
                <span className="text-xs text-wa-secondary dark:text-wa-secondaryDark">{voted ? `${pct}%` : `${o.votes.length}`}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-wa-secondary dark:text-wa-secondaryDark mt-2">إجمالي الأصوات: {totalVotes}</div>
    </div>
  );
}
